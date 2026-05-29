from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.dependencies import get_current_user, get_db
from app.models import User, PushToken
from app.schemas import RegisterPushTokenRequest

router = APIRouter(prefix="/api/tokens", tags=["tokens"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_push_token(
    body: RegisterPushTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(PushToken).filter(
        PushToken.user_id == current_user.id,
        PushToken.device_id == body.device_id,
    ).first()

    if existing:
        existing.token = body.token
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"message": "Push token updated"}

    push_token = PushToken(
        user_id=current_user.id,
        token=body.token,
        device_id=body.device_id,
    )
    db.add(push_token)
    db.commit()
    return {"message": "Push token registered"}
