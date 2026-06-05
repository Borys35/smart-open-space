from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models import AccessCredential, User
from app.schemas import AccessCredentialResponse

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
