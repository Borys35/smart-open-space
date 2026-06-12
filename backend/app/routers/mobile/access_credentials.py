import base64
import hashlib
import secrets
from uuid import uuid4

from app.datetime_utils import utc_now
from app.dependencies import get_current_user, get_db
from app.models import AccessCredential, User
from app.schemas import (
    CardCredentialRequest,
    CredentialsResponse,
    MessageResponse,
    MobileCredentialCreateRequest,
    MobileCredentialCreateResponse,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

credentials_router = APIRouter(prefix="/api/credentials", tags=["mobile-credentials"])
mobile_credentials_router = APIRouter(
    prefix="/api/mobile-credentials", tags=["mobile-credentials"]
)


def generate_shared_secret() -> str:
    return base64.b64encode(secrets.token_bytes(32)).decode("ascii")


def hash_shared_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def serialize_card_credential(credential: AccessCredential | None):
    if credential is None:
        return None

    return {
        "uid": credential.uid,
        "active": credential.active,
    }


def get_active_card(db: Session, user_id: int):
    return (
        db.query(AccessCredential)
        .filter(
            AccessCredential.user_id == user_id,
            AccessCredential.cred_type == "CARD",
            AccessCredential.active,
        )
        .first()
    )


def get_active_card_by_uid(db: Session, uid: str):
    return (
        db.query(AccessCredential)
        .filter(
            AccessCredential.uid == uid,
            AccessCredential.cred_type == "CARD",
            AccessCredential.active,
        )
        .first()
    )


@credentials_router.get("", response_model=CredentialsResponse)
def get_credentials(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "card": serialize_card_credential(get_active_card(db, current_user.id)),
    }


@credentials_router.post("/cards", response_model=CredentialsResponse, status_code=201)
def link_card(
    data: CardCredentialRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if get_active_card(db, current_user.id):
        raise HTTPException(status_code=400, detail="User already has an active card")

    if get_active_card_by_uid(db, data.card.uid):
        raise HTTPException(status_code=400, detail="Card UID already exists")

    credential = AccessCredential(
        user_id=current_user.id,
        cred_type="CARD",
        uid=data.card.uid,
        active=True,
    )
    db.add(credential)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        legacy_credential = (
            db.query(AccessCredential)
            .filter(
                AccessCredential.uid == data.card.uid,
                AccessCredential.cred_type == "CARD",
                AccessCredential.active.is_(False),
            )
            .first()
        )

        if not legacy_credential:
            raise HTTPException(status_code=400, detail="Card UID already exists")

        legacy_credential.user_id = current_user.id
        legacy_credential.active = True
        legacy_credential.updated_at = utc_now()
        db.commit()
        db.refresh(legacy_credential)
        return {"card": serialize_card_credential(legacy_credential)}

    db.refresh(credential)
    return {"card": serialize_card_credential(credential)}


@credentials_router.delete("/cards", response_model=MessageResponse)
def unlink_card(
    data: CardCredentialRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AccessCredential).filter(
        AccessCredential.user_id == current_user.id,
        AccessCredential.cred_type == "CARD",
        AccessCredential.active,
    )

    if data is not None:
        query = query.filter(AccessCredential.uid == data.card.uid)

    credential = query.first()

    if not credential:
        raise HTTPException(status_code=404, detail="Active card credential not found")

    credential.active = False
    credential.updated_at = utc_now()
    db.commit()

    return {"message": "Card credential deleted"}


@credentials_router.post(
    "/phone", response_model=MobileCredentialCreateResponse, status_code=201
)
def create_phone_credential(
    data: MobileCredentialCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mobile_credential_id = str(uuid4())
    secret = generate_shared_secret()

    credential = AccessCredential(
        user_id=current_user.id,
        cred_type="PHONE",
        mobile_credential_id=mobile_credential_id,
        public_key=data.deviceName,
        shared_secret_hash=hash_shared_secret(secret),
        active=True,
    )
    db.add(credential)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not create phone credential")

    return {
        "credentialId": mobile_credential_id,
        "secret": secret,
    }


@mobile_credentials_router.post(
    "/{mobileCredentialId}/rotate", response_model=MobileCredentialCreateResponse
)
def rotate_phone_credential(
    mobileCredentialId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    credential = (
        db.query(AccessCredential)
        .filter(
            AccessCredential.user_id == current_user.id,
            AccessCredential.cred_type == "PHONE",
            AccessCredential.mobile_credential_id == mobileCredentialId,
            AccessCredential.active,
        )
        .first()
    )

    if not credential:
        raise HTTPException(status_code=404, detail="Active phone credential not found")

    new_mobile_credential_id = str(uuid4())
    secret = generate_shared_secret()

    credential.mobile_credential_id = new_mobile_credential_id
    credential.shared_secret_hash = hash_shared_secret(secret)
    credential.updated_at = utc_now()
    db.commit()

    return {
        "credentialId": new_mobile_credential_id,
        "secret": secret,
    }


router = credentials_router
