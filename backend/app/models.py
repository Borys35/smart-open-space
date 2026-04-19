from pydantic import BaseModel
from enum import Enum

# Role użytkowników w systemie
class Role(str, Enum):
    USER = "USER"
    MANAGER = "MANAGER"
    SUPER_ADMIN = "SUPER_ADMIN"

# Request do rejestracji
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

# Response użytkownika (bez hasła)
class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: Role

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
    name: str
    email: str
    role: Role

# Response logowania do dashboardu
class DashboardLoginResponse(BaseModel):
    access_token: str
    user: DashboardUserResponse