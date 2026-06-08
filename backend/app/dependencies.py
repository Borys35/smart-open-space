from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.constants import ROLE_SUPER_ADMIN
from app.database import SessionLocal
from app.models import OpenSpaceManager, User
from app.services.auth_service import decode_access_token


bearer_scheme = HTTPBearer()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    return user

def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        user_role = current_user.role.name

        if user_role not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action")
        
        return current_user
    
    return role_checker

def is_super_admin(user: User):
    return user.role.name == ROLE_SUPER_ADMIN

def has_active_manager_assignment(db: Session, user_id: int):
    return db.query(OpenSpaceManager).filter(
        OpenSpaceManager.user_id == user_id,
        OpenSpaceManager.is_active == True
    ).first() is not None

def has_open_space_manager_assignment(db: Session, user_id: int, open_space_id: int):
    return db.query(OpenSpaceManager).filter(
        OpenSpaceManager.open_space_id == open_space_id,
        OpenSpaceManager.user_id == user_id,
        OpenSpaceManager.is_active == True
    ).first() is not None

def require_dashboard_access(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if is_super_admin(current_user):
        return current_user

    if has_active_manager_assignment(db, current_user.id):
        return current_user

    raise HTTPException(status_code=403, detail="User does not have dashboard permission")
