from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.datetime_utils import utc_now
from app.dependencies import get_db, is_super_admin, require_dashboard_access
from app.models import AccessCredential, AccessDevice, AccessLog, Membership, OpenSpace, OpenSpaceManager, User
from app.schemas import (
    AccessCredentialResponse,
    AccessDeviceCreate,
    AccessDeviceResponse,
    AccessDeviceUpdate,
    AccessLogResponse,
    AccessStatsResponse,
    MessageResponse
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard-access"])

def mask_uid(uid: str):
    if len(uid) <= 4:
        return "*" * len(uid)

    return f"{uid[:2]}***{uid[-2:]}"

def serialize_access_device(device: AccessDevice):
    return {
        "id": device.id,
        "open_space_id": device.open_space_id,
        "name": device.name,
        "device_key": device.device_key,
        "is_active": device.is_active,
        "created_at": device.created_at,
        "updated_at": device.updated_at
    }

def serialize_access_credential(credential: AccessCredential):
    return {
        "id": credential.id,
        "user_id": credential.user_id,
        "type": credential.type,
        "masked_uid": mask_uid(credential.uid),
        "is_active": credential.is_active,
        "assigned_at": credential.assigned_at,
        "deactivated_at": credential.deactivated_at
    }

def serialize_access_log(access_log: AccessLog):
    return {
        "id": access_log.id,
        "access_credential_id": access_log.access_credential_id,
        "access_device_id": access_log.access_device_id,
        "user_id": access_log.user_id,
        "open_space_id": access_log.open_space_id,
        "reservation_id": access_log.reservation_id,
        "scanned_at": access_log.scanned_at,
        "action": access_log.action,
        "result": access_log.result
    }

def ensure_can_manage_open_space(db: Session, open_space_id: int, current_user: User):
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")

    if is_super_admin(current_user):
        return open_space

    manager_assignment = db.query(OpenSpaceManager).filter(
        OpenSpaceManager.open_space_id == open_space_id,
        OpenSpaceManager.user_id == current_user.id,
        OpenSpaceManager.is_active == True
    ).first()

    if not manager_assignment:
        raise HTTPException(status_code=403, detail="You can manage access only in your assigned open space")

    return open_space

def ensure_can_manage_user(db: Session, user_id: int, current_user: User):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if is_super_admin(current_user):
        return user

    managed_membership = (
        db.query(Membership)
        .join(OpenSpaceManager, OpenSpaceManager.open_space_id == Membership.open_space_id)
        .filter(
            Membership.user_id == user_id,
            Membership.status == "ACTIVE",
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True
        )
        .first()
    )

    if not managed_membership:
        raise HTTPException(status_code=403, detail="You can manage access only for users in your assigned open space")

    return user

@router.post("/access-devices", response_model=AccessDeviceResponse, status_code=201)
def create_access_device(
    data: AccessDeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access)
):
    ensure_can_manage_open_space(db, data.open_space_id, current_user)

    new_device = AccessDevice(
        open_space_id=data.open_space_id,
        name=data.name,
        device_key=data.device_key,
        is_active=True
    )

    db.add(new_device)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Access device key already exists")

    db.refresh(new_device)

    return serialize_access_device(new_device)

@router.get("/open-spaces/{open_space_id}/access-devices", response_model=list[AccessDeviceResponse])
def get_open_space_access_devices(
    open_space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access)
):
    ensure_can_manage_open_space(db, open_space_id, current_user)

    devices = db.query(AccessDevice).filter(
        AccessDevice.open_space_id == open_space_id
    ).order_by(AccessDevice.name.asc()).all()

    return [serialize_access_device(device) for device in devices]

@router.patch("/access-devices/{device_id}", response_model=AccessDeviceResponse)
def update_access_device(
    device_id: int,
    data: AccessDeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access)
):
    device = db.query(AccessDevice).filter(AccessDevice.id == device_id).first()

    if not device:
        raise HTTPException(status_code=404, detail="Access device not found")

    ensure_can_manage_open_space(db, device.open_space_id, current_user)

    if data.name is not None:
        device.name = data.name

    if data.device_key is not None:
        device.device_key = data.device_key

    if data.is_active is not None:
        device.is_active = data.is_active

    device.updated_at = utc_now()

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Access device key already exists")

    db.refresh(device)

    return serialize_access_device(device)

@router.get("/users/{user_id}/access-credentials", response_model=list[AccessCredentialResponse])
def get_user_access_credentials(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access)
):
    ensure_can_manage_user(db, user_id, current_user)

    credentials = db.query(AccessCredential).filter(
        AccessCredential.user_id == user_id
    ).order_by(AccessCredential.assigned_at.desc()).all()

    return [serialize_access_credential(credential) for credential in credentials]

@router.delete("/access-credentials/{credential_id}", response_model=MessageResponse)
def deactivate_access_credential(
    credential_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access)
):
    credential = db.query(AccessCredential).filter(AccessCredential.id == credential_id).first()

    if not credential:
        raise HTTPException(status_code=404, detail="Access credential not found")

    ensure_can_manage_user(db, credential.user_id, current_user)

    if not credential.is_active:
        raise HTTPException(status_code=400, detail="Access credential is already inactive")

    credential.is_active = False
    credential.deactivated_at = utc_now()

    db.commit()

    return {"message": "Access credential deactivated successfully"}

@router.get("/open-spaces/{open_space_id}/access-logs", response_model=list[AccessLogResponse])
def get_open_space_access_logs(
    open_space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access),
    user_id: int | None = None,
    result: str | None = None,
    limit: int = 100
):
    ensure_can_manage_open_space(db, open_space_id, current_user)

    if limit < 1 or limit > 500:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 500")

    query = db.query(AccessLog).filter(AccessLog.open_space_id == open_space_id)

    if user_id is not None:
        query = query.filter(AccessLog.user_id == user_id)

    if result is not None:
        result = result.strip().upper()

        if result not in ["SUCCESS", "DENIED"]:
            raise HTTPException(status_code=400, detail="Result must be SUCCESS or DENIED")

        query = query.filter(AccessLog.result == result)

    logs = query.order_by(AccessLog.scanned_at.desc()).limit(limit).all()

    return [serialize_access_log(access_log) for access_log in logs]

@router.get("/users/{user_id}/access-stats", response_model=AccessStatsResponse)
def get_user_access_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access)
):
    ensure_can_manage_user(db, user_id, current_user)

    query = db.query(AccessLog).filter(AccessLog.user_id == user_id)

    if not is_super_admin(current_user):
        managed_open_space_ids = [
            assignment.open_space_id for assignment in db.query(OpenSpaceManager).filter(
                OpenSpaceManager.user_id == current_user.id,
                OpenSpaceManager.is_active == True
            ).all()
        ]

        query = query.filter(AccessLog.open_space_id.in_(managed_open_space_ids))

    logs = query.all()

    return {
        "user_id": user_id,
        "total_logs": len(logs),
        "successful_logs": len([access_log for access_log in logs if access_log.result == "SUCCESS"]),
        "denied_logs": len([access_log for access_log in logs if access_log.result == "DENIED"]),
        "check_ins": len([access_log for access_log in logs if access_log.action == "CHECK_IN"]),
        "check_outs": len([access_log for access_log in logs if access_log.action == "CHECK_OUT"])
    }
