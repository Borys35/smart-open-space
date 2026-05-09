from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_roles
from app.models import User, Role
from app.schemas import UserResponse, UpdateUserRoleRequest

router = APIRouter(prefix="/api/users", tags=["user"])

@router.get("", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["SUPER_ADMIN"]))):
    users = db.query(User).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.name
        }
        
        for user in users
    ]

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(user_id: int, data: UpdateUserRoleRequest, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["SUPER_ADMIN"]))):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    
    new_role = db.query(Role).filter(Role.name == data.role.value).first()

    if not new_role:
        raise HTTPException(status_code=400, detail="Role does not exist")
    
    user.role_id = new_role.id

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.name
    }