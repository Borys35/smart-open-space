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

class UpdateUserRoleRequest(BaseModel):
    role: RoleEnum

class DashboardOpenSpaceCreate(BaseModel):
    name: str
    building: str
    floor: int

    @field_validator("name")
    @classmethod
    def validate_not_empty(cls, value) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Field cannot be empty")
        
        if len(value) > 100:
            raise ValueError("Name must be at most 100 characters long")
        
        return value
    
    @field_validator("building")
    @classmethod
    def validate_building(cls, value) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Building cannot be empty")
        
        if len(value) > 50:
            raise ValueError("Building must be at most 50 characters long")
        
        return value
    
    @field_validator("floor")
    @classmethod
    def validate_floor(cls, value) -> int:
        if value < 0:
            raise ValueError("Floor cannot be negative")
        
        return value
    
class DashboardOpenSpaceResponse(BaseModel):
    id: int 
    name: str
    building: str
    floor: int

class DeskLayoutItem(BaseModel):
    id: int | None = None
    data: str | None = None
    x: float
    y: float
    width: float
    height: float

    @field_validator("width", "height")
    @classmethod
    def validate_size(cls, value) -> float:
        if value <= 0:
            raise ValueError("Width and height must be greater than 0")
        
        return value
    
class InviteUserRequest(BaseModel):
    email: EmailStr

class MessageResponse(BaseModel):
    message: str

class InviteResponse(BaseModel):
    id: int 
    user_id: int | None = None
    space_id: int
    invited_email: str
    status: str

class CreateInviteRequest(BaseModel):
    user_id: int 
    space_id: int

class RegisterPushTokenRequest(BaseModel):
    token: str
    device_id: str

    @field_validator("token")
    @classmethod
    def validate_token(cls, value) -> str:
        value = value.strip()

        if len(value) < 1:
            raise ValueError("Token must not be empty")

        if len(value) >= 64:
            raise ValueError("Token must be less than 64 characters")

        if not value.startswith("ExponentPushToken["):
            raise ValueError("Token must start with 'ExponentPushToken['")

        bracket_content = value.removeprefix("ExponentPushToken[")

        if not bracket_content.endswith("]"):
            raise ValueError("Token must end with ']'")

        if len(bracket_content) < 2:
            raise ValueError("Token must contain push token ID inside brackets")

        return value

    @field_validator("device_id")
    @classmethod
    def validate_device_id(cls, value) -> str:
        value = value.strip()

        stripped = value.replace("-", "")

        if len(stripped) != 32:
            raise ValueError("Device ID must be a UUID containing exactly 32 hex characters")

        return stripped
