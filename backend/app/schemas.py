from pydantic import BaseModel, EmailStr, field_validator 
from enum import Enum

# Role użytkowników w systemie
class RoleEnum(str, Enum):
    USER = "USER"
    MANAGER = "MANAGER"
    SUPER_ADMIN = "SUPER_ADMIN"

# Request do rejestracji
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, value) -> str:
        value = value.strip()

        if len(value) < 3:
            raise ValueError("Username must be at least 3 characters long")
        
        if len(value) > 50:
            raise ValueError("Username must be at most 50 characters long")
        
        return value
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, value) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one digit")
        
        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least one uppercase letter")

        if not any(char in "!@#$%^&*()-_=+[]{};:,.<>?/" for char in value):
            raise ValueError("Password must contain at least one special character")
        
        return value

# Response użytkownika (bez hasła)
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: RoleEnum

# Request do logowania
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Response logowania (mobile)
class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Response użytkownika dla dashboardu
class DashboardUserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: RoleEnum

# Response logowania do dashboardu
class DashboardLoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: DashboardUserResponse

# 
class UpdateUserRoleRequest(BaseModel):
    role: RoleEnum

