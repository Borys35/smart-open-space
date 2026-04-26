from pydantic import BaseModel
from enum import Enum

# Role użytkowników w systemie
class RoleEnum(str, Enum):
    USER = "USER"
    MANAGER = "MANAGER"
    SUPER_ADMIN = "SUPER_ADMIN"

# Request do rejestracji
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

# Response użytkownika (bez hasła)
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: RoleEnum

# Request do logowania
class LoginRequest(BaseModel):
    email: str
    password: str

# Response logowania (mobile)
class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse

# Response użytkownika dla dashboardu (bez id)
class DashboardUserResponse(BaseModel):
    username: str
    email: str
    role: RoleEnum

# Response logowania do dashboardu
class DashboardLoginResponse(BaseModel):
    access_token: str
    user: DashboardUserResponse