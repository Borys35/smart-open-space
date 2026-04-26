from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User, Role
from schemas import RegisterRequest, UserResponse, LoginRequest, LoginResponse, DashboardLoginResponse 
from services.auth_service import hash_password, verify_password, create_fake_token

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/register", response_model = UserResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
     
    existing_user = db.query(User).filter(User.email == data.email).first()

    if existing_user:
        raise HTTPException(status_code = 400, detail = "User exist")
    
    user_role = db.query(Role).filter(Role.name == "USER").first()

    if not user_role:
        raise HTTPException(status_code = 400, detail = "Role USER does not exist")
    
    password_hash = hash_password(data.password)

    new_user = User(
        username = data.username,
        email = data.email,
        password_hash = password_hash,
        role_id = user_role.id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "role": user_role.name
    }   

@router.post("/login", response_model = LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code = 401, detail = "Invalid email or password")
    
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code = 401, detail = "Invalid email or password")
    
    token = create_fake_token(user.id)

    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.name
        }
    }

@router.post("/api/dashboard/login", response_model = DashboardLoginResponse)
def dashboard_login(data: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code = 401, detail = "Invalid email or password")
    
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code = 401, detail = "Invalid email or password")
    
    if user.role.name not in ["MANAGER", "SUPER_ADMIN"]:
        raise HTTPException(status_code = 403, detail = "Role USER does not have permissions")

    token = create_fake_token(user.id)

    return {
        "access_token": token,
        "user": {
            "username": user.username,
            "email": user.email,
            "role": user.role.name
        }
    }