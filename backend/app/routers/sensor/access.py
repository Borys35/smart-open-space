from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import (
    AccessCredential,
    AccessDevice,
    AccessLog,
    Desk,
    Membership,
    OpenSpace,
    Reservation,
)
from app.schemas import SensorAccessCheckRequest, SensorAccessCheckResponse
from app.services.penalty_service import apply_late_checkout_penalty

router = APIRouter(prefix="/api/sensor/access", tags=["sensor-access"])

def create_access_log(
    db: Session,
    credential: AccessCredential,
    device: AccessDevice,
    action: str,
    result: str,
    reservation_id: int | None = None
):
    access_log = AccessLog(
        access_credential_id=credential.id,
        access_device_id=device.id,
        user_id=credential.user_id,
        open_space_id=device.open_space_id,
        reservation_id=reservation_id,
        action=action,
        result=result
    )

    db.add(access_log)

def deny_response(
    reason: str,
    device: AccessDevice | None = None,
    credential: AccessCredential | None = None,
    reservation: Reservation | None = None
):
    return {
        "allowed": False,
        "action": None,
        "reason": reason,
        "user_id": credential.user_id if credential else None,
        "open_space_id": device.open_space_id if device else None,
        "reservation_id": reservation.id if reservation else None,
        "checked_in_at": reservation.checked_in_at if reservation else None,
        "checked_out_at": reservation.checked_out_at if reservation else None
    }

@router.post("/check", response_model=SensorAccessCheckResponse)
def check_access(
    data: SensorAccessCheckRequest,
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()

    device = db.query(AccessDevice).filter(
        AccessDevice.device_key == data.device_key,
        AccessDevice.is_active == True
    ).first()

    if not device:
        return deny_response("Access device not found or inactive")

    open_space = db.query(OpenSpace).filter(OpenSpace.id == device.open_space_id).first()

    if not open_space or not open_space.is_active:
        return deny_response("Open space not found or inactive", device=device)

    credential = db.query(AccessCredential).filter(
        AccessCredential.uid == data.credential_uid,
        AccessCredential.is_active == True
    ).first()

    if not credential:
        return deny_response("Access credential not found or inactive", device=device)

    membership = db.query(Membership).filter(
        Membership.user_id == credential.user_id,
        Membership.open_space_id == device.open_space_id,
        Membership.status == "ACTIVE"
    ).first()

    if not membership:
        create_access_log(db, credential, device, "IDENTITY_VERIFICATION", "DENIED")
        db.commit()
        return deny_response("User is not an active member of this open space", device, credential)

    active_reservations = (
        db.query(Reservation)
        .join(Desk, Reservation.desk_id == Desk.id)
        .filter(
            Reservation.user_id == credential.user_id,
            Desk.open_space_id == device.open_space_id,
            Reservation.status == "CONFIRMED",
            or_(
                (
                    (Reservation.start_time <= now)
                    & (Reservation.end_time >= now)
                ),
                (
                    (Reservation.checked_in_at != None)
                    & (Reservation.checked_out_at == None)
                )
            )
        )
        .all()
    )

    if not active_reservations:
        create_access_log(db, credential, device, "IDENTITY_VERIFICATION", "DENIED")
        db.commit()
        return deny_response("User does not have an active reservation now", device, credential)

    if len(active_reservations) > 1:
        create_access_log(db, credential, device, "IDENTITY_VERIFICATION", "DENIED")
        db.commit()
        return deny_response("User has more than one active reservation now", device, credential)

    reservation = active_reservations[0]

    if reservation.checked_out_at is not None:
        create_access_log(db, credential, device, "IDENTITY_VERIFICATION", "DENIED", reservation.id)
        db.commit()
        return deny_response("Reservation is already checked out", device, credential, reservation)

    if reservation.checked_in_at is None:
        if now >= reservation.end_time:
            create_access_log(db, credential, device, "CHECK_IN", "DENIED", reservation.id)
            db.commit()
            return deny_response("Reservation already ended", device, credential, reservation)

        action = "CHECK_IN"
        reservation.checked_in_at = now
    else:
        action = "CHECK_OUT"
        reservation.checked_out_at = now
        apply_late_checkout_penalty(db, reservation, membership, open_space, now)
        reservation.status = "DONE"

    reservation.updated_at = now
    create_access_log(db, credential, device, action, "SUCCESS", reservation.id)
    db.commit()
    db.refresh(reservation)

    return {
        "allowed": True,
        "action": action,
        "reason": "Access granted",
        "user_id": credential.user_id,
        "open_space_id": device.open_space_id,
        "reservation_id": reservation.id,
        "checked_in_at": reservation.checked_in_at,
        "checked_out_at": reservation.checked_out_at
    }
