from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models import User, Role
from app.schemas import RegisterRequest, UserResponse, LoginRequest, LoginResponse, DashboardLoginResponse 
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.dependencies import get_db, get_current_user

router = APIRouter()

@router.post("/register", response_model = UserResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
     
    email = str(data.email).lower().strip()
    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        raise HTTPException(status_code = 400, detail = "Email already exists")
    
    user_role = db.query(Role).filter(Role.name == "USER").first()

    if not user_role:
        raise HTTPException(status_code = 400, detail = "Role USER does not exist")
    
    password_hash = hash_password(data.password)

    new_user = User(
        username = data.username,
        email = email,
        password_hash = password_hash,
        role_id = user_role.id
    )

    db.add(new_user)

    try:
        db.commit()
    
    except:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "role": user_role.name
    }   

@router.post("/login", response_model = LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):

    email = str(data.email).lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code = 401, detail = "Invalid email or password")
    
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code = 401, detail = "Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code = 403, detail = "User is inactive")
    
    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.name
        }
    }

@router.post("/api/dashboard/login", response_model = DashboardLoginResponse)
def dashboard_login(data: LoginRequest, db: Session = Depends(get_db)):

    email = str(data.email).lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code = 401, detail = "Invalid email or password")
    
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code = 401, detail = "Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code = 403, detail = "User is inactive")
    
    if user.role.name not in ["MANAGER", "SUPER_ADMIN"]:
        raise HTTPException(status_code = 403, detail = "User does not have dashboard permission")

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.name
        }
    }

@router.get("/api/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return { 
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role.name
    }