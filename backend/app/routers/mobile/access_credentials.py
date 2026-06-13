from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.datetime_utils import utc_now
from app.dependencies import get_db, get_current_user
from app.models import AccessCredential, User
from app.schemas import AccessCredentialCreate, AccessCredentialResponse, MessageResponse

router = APIRouter(prefix="/api/access/credentials", tags=["mobile-access-credentials"])

def mask_uid(uid: str):
    if len(uid) <= 4:
        return "*" * len(uid)

    return f"{uid[:2]}***{uid[-2:]}"

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

@router.get("/my", response_model=list[AccessCredentialResponse])
def get_my_access_credentials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    credentials = db.query(AccessCredential).filter(
        AccessCredential.user_id == current_user.id
    ).order_by(AccessCredential.assigned_at.desc()).all()

    return [serialize_access_credential(credential) for credential in credentials]

@router.post("/my", response_model=AccessCredentialResponse, status_code=201)
def create_my_access_credential(
    data: AccessCredentialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.type != "NFC_CARD":
        raise HTTPException(status_code=400, detail="Only NFC card credentials can be added from mobile")

    active_card = db.query(AccessCredential).filter(
        AccessCredential.user_id == current_user.id,
        AccessCredential.type == "NFC_CARD",
        AccessCredential.is_active == True
    ).first()

    if active_card:
        raise HTTPException(status_code=400, detail="User already has active NFC card")

    new_credential = AccessCredential(
        user_id=current_user.id,
        type=data.type,
        uid=data.uid,
        is_active=True
    )

    db.add(new_credential)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        active_card = db.query(AccessCredential).filter(
            AccessCredential.user_id == current_user.id,
            AccessCredential.type == "NFC_CARD",
            AccessCredential.is_active == True
        ).first()

        if active_card:
            raise HTTPException(status_code=400, detail="User already has active NFC card")

        raise HTTPException(status_code=400, detail="Access credential UID already exists")

    db.refresh(new_credential)

    return serialize_access_credential(new_credential)

@router.delete("/{credential_id}", response_model=MessageResponse)
def deactivate_my_access_credential(
    credential_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    credential = db.query(AccessCredential).filter(
        AccessCredential.id == credential_id,
        AccessCredential.user_id == current_user.id
    ).first()

    if not credential:
        raise HTTPException(status_code=404, detail="Access credential not found")

    if not credential.is_active:
        raise HTTPException(status_code=400, detail="Access credential is already inactive")

    credential.is_active = False
    credential.deactivated_at = utc_now()

    db.commit()

    return {"message": "Access credential deactivated successfully"}
