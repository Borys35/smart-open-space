import hmac
from datetime import timedelta

from app.constants import RESERVATION_STATUS_CONFIRMED, RESERVATION_STATUS_DONE
from app.datetime_utils import as_utc, utc_now
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
from app.schemas import SensorPhoneAccessCheckRequest
from app.services.penalty_service import apply_late_checkout_penalty
from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/sensor/access", tags=["sensor-access"])
MIN_ACCESS_ACTION_INTERVAL = timedelta(seconds=5)


def create_access_log(
    db: Session,
    credential: AccessCredential,
    device: AccessDevice,
    action: str,
    result: str,
    reservation_id: int | None = None,
):
    access_log = AccessLog(
        access_credential_id=credential.id,
        access_device_id=device.id,
        user_id=credential.user_id,
        open_space_id=device.open_space_id,
        reservation_id=reservation_id,
        action=action,
        result=result,
    )

    db.add(access_log)


def commit_or_rollback(db: Session):
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


def deny_response(
    reason: str,
    device: AccessDevice | None = None,
    credential: AccessCredential | None = None,
    reservation: Reservation | None = None,
):
    return {
        "allowed": False,
        "action": None,
        "reason": reason,
        "user_id": credential.user_id if credential else None,
        "open_space_id": device.open_space_id if device else None,
        "reservation_id": reservation.id if reservation else None,
        "checked_in_at": as_utc(reservation.checked_in_at) if reservation else None,
        "checked_out_at": as_utc(reservation.checked_out_at) if reservation else None,
    }


@router.post("/check", response_model=SensorAccessCheckResponse)
def check_access(data: SensorAccessCheckRequest, db: Session = Depends(get_db)):
    device = (
        db.query(AccessDevice)
        .filter(AccessDevice.device_key == data.device_key, AccessDevice.is_active)
        .first()
    )

    if not device:
        return deny_response("Access device not found or inactive")

    open_space = (
        db.query(OpenSpace).filter(OpenSpace.id == device.open_space_id).first()
    )

    if not open_space or not open_space.is_active:
        return deny_response("Open space not found or inactive", device=device)

    credential = (
        db.query(AccessCredential)
        .filter(
            AccessCredential.uid == data.credential_uid,
            AccessCredential.cred_type == "CARD",
            AccessCredential.active,
        )
        .first()
    )

    if not credential:
        return deny_response("Access credential not found or inactive", device=device)

    return check_credential_access(db, device, credential)


@router.post("/phone/check", response_model=SensorAccessCheckResponse)
def check_phone_access(
    data: SensorPhoneAccessCheckRequest, db: Session = Depends(get_db)
):
    device = (
        db.query(AccessDevice)
        .filter(AccessDevice.device_key == data.device_key, AccessDevice.is_active)
        .first()
    )

    if not device:
        return deny_response("Access device not found or inactive")

    credential_id = (
        f"{data.credential_id[0:8]}-{data.credential_id[8:12]}-"
        f"{data.credential_id[12:16]}-{data.credential_id[16:20]}-"
        f"{data.credential_id[20:32]}"
    )

    credential = (
        db.query(AccessCredential)
        .filter(
            AccessCredential.mobile_credential_id == credential_id,
            AccessCredential.cred_type == "PHONE",
            AccessCredential.active,
        )
        .first()
    )

    if not credential or not credential.shared_secret_hash:
        return deny_response("Phone credential not found or inactive", device=device)

    expected_signature = hmac.digest(
        bytes.fromhex(credential.shared_secret_hash),
        bytes.fromhex(data.nonce),
        "sha256",
    ).hex()

    if not hmac.compare_digest(expected_signature, data.signature):
        create_access_log(db, credential, device, "IDENTITY_VERIFICATION", "DENIED")
        commit_or_rollback(db)
        return deny_response("Phone credential signature is invalid", device, credential)

    return check_credential_access(db, device, credential)


def check_credential_access(
    db: Session,
    device: AccessDevice,
    credential: AccessCredential,
):
    now = utc_now()

    open_space = (
        db.query(OpenSpace).filter(OpenSpace.id == device.open_space_id).first()
    )

    if not open_space or not open_space.is_active:
        return deny_response("Open space not found or inactive", device=device)

    membership = (
        db.query(Membership)
        .filter(
            Membership.user_id == credential.user_id,
            Membership.open_space_id == device.open_space_id,
            Membership.status == "ACTIVE",
        )
        .with_for_update()
        .first()
    )

    if not membership:
        create_access_log(db, credential, device, "IDENTITY_VERIFICATION", "DENIED")
        commit_or_rollback(db)
        return deny_response(
            "User is not an active member of this open space", device, credential
        )

    active_reservations = (
        db.query(Reservation)
        .join(Desk, Reservation.desk_id == Desk.id)
        .filter(
            Reservation.user_id == credential.user_id,
            Desk.open_space_id == device.open_space_id,
            Reservation.status == RESERVATION_STATUS_CONFIRMED,
            or_(
                ((Reservation.start_time <= now) & (Reservation.end_time >= now)),
                (
                    (Reservation.checked_in_at != None)
                    & (Reservation.checked_out_at == None)
                ),
            ),
        )
        .with_for_update()
        .all()
    )

    if not active_reservations:
        create_access_log(db, credential, device, "IDENTITY_VERIFICATION", "DENIED")
        commit_or_rollback(db)
        return deny_response(
            "User does not have an active reservation now", device, credential
        )

    if len(active_reservations) > 1:
        create_access_log(db, credential, device, "IDENTITY_VERIFICATION", "DENIED")
        commit_or_rollback(db)
        return deny_response(
            "User has more than one active reservation now", device, credential
        )

    reservation = active_reservations[0]

    if reservation.checked_out_at is not None:
        create_access_log(
            db, credential, device, "IDENTITY_VERIFICATION", "DENIED", reservation.id
        )
        commit_or_rollback(db)
        return deny_response(
            "Reservation is already checked out", device, credential, reservation
        )

    if reservation.checked_in_at is None:
        if now >= as_utc(reservation.end_time):
            create_access_log(
                db, credential, device, "CHECK_IN", "DENIED", reservation.id
            )
            commit_or_rollback(db)
            return deny_response(
                "Reservation already ended", device, credential, reservation
            )

        action = "CHECK_IN"
        reservation.checked_in_at = now
    else:
        if as_utc(now) - as_utc(reservation.checked_in_at) < MIN_ACCESS_ACTION_INTERVAL:
            create_access_log(
                db, credential, device, "CHECK_OUT", "DENIED", reservation.id
            )
            commit_or_rollback(db)
            return deny_response(
                "Reservation was just checked in", device, credential, reservation
            )

        action = "CHECK_OUT"
        reservation.checked_out_at = now
        apply_late_checkout_penalty(db, reservation, membership, open_space, now)
        reservation.status = RESERVATION_STATUS_DONE

    reservation.updated_at = now
    create_access_log(db, credential, device, action, "SUCCESS", reservation.id)
    commit_or_rollback(db)
    db.refresh(reservation)

    return {
        "allowed": True,
        "action": action,
        "reason": "Access granted",
        "user_id": credential.user_id,
        "open_space_id": device.open_space_id,
        "reservation_id": reservation.id,
        "checked_in_at": as_utc(reservation.checked_in_at),
        "checked_out_at": as_utc(reservation.checked_out_at),
    }
