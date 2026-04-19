from fastapi import FastAPI, HTTPException
from models import (
    RegisterRequest,
    LoginRequest,
    UserResponse,
    LoginResponse,
    Role,
    DashboardLoginResponse,
)

# Inicjalizacja aplikacji FastAPI
app = FastAPI()

# Tymczasowa baza danych
users = []
user_id_counter = 1


@app.get("/")
def root():
    # Endpoint testowy
    return {"message": "Backend działa"}


@app.post("/register", response_model=UserResponse)
def register(data: RegisterRequest):
    
    # Rejestracja zwykłego użytkownika (USER)
    
    global user_id_counter

    # Sprawdzenie czy email już istnieje
    for user in users:
        if user["email"] == data.email:
            raise HTTPException(status_code=400, detail="User already exists")

    # Tworzenie nowego użytkownika
    new_user = {
        "id": user_id_counter,
        "name": data.name,
        "email": data.email,
        "password": data.password,
        "role": Role.USER
    }

    users.append(new_user)
    user_id_counter += 1

    # Zwracamy dane bez hasła
    return {
        "id": new_user["id"],
        "name": new_user["name"],
        "email": new_user["email"],
        "role": new_user["role"]
    }


@app.post("/login", response_model=LoginResponse)
def login(data: LoginRequest):
    
    # Logowanie użytkownika (mobile)
    
    for user in users:
        if user["email"] == data.email and user["password"] == data.password:
            return {
                "access_token": f"fake-token-{user['id']}",
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"]
                }
            }

    raise HTTPException(status_code=401, detail="Invalid email or password")


@app.post("/api/dashboard/login", response_model=DashboardLoginResponse)
def dashboard_login(data: LoginRequest):
    
    # Logowanie do dashboardu (tylko MANAGER i SUPER_ADMIN)
    
    for user in users:
        if user["email"] == data.email and user["password"] == data.password:
            # Sprawdzenie uprawnień
            if user["role"] not in [Role.MANAGER, Role.SUPER_ADMIN]:
                raise HTTPException(status_code=403, detail="Access denied to dashboard")

            return {
                "access_token": f"ey-{user['id']}",
                "user": {
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"]
                }
            }

    raise HTTPException(status_code=401, detail="Invalid email or password")


@app.post("/setup/super-admin", response_model=UserResponse)
def create_super_admin():
    
    # Tworzenie konta SUPER_ADMIN 
    
    global user_id_counter

    for user in users:
        if user["role"] == Role.SUPER_ADMIN:
            raise HTTPException(status_code=400, detail="Super admin already exists")

    super_admin = {
        "id": user_id_counter,
        "name": "Super Admin",
        "email": "superadmin@test.com",
        "password": "admin123",
        "role": Role.SUPER_ADMIN
    }

    users.append(super_admin)
    user_id_counter += 1

    return {
        "id": super_admin["id"],
        "name": super_admin["name"],
        "email": super_admin["email"],
        "role": super_admin["role"]
    }


@app.post("/setup/manager", response_model=UserResponse)
def create_manager():
    
    # Tworzenie konta MANAGER 
    
    global user_id_counter

    for user in users:
        if user["email"] == "manager@test.com":
            raise HTTPException(status_code=400, detail="Manager already exists")

    manager = {
        "id": user_id_counter,
        "name": "Manager",
        "email": "manager@test.com",
        "password": "manager123",
        "role": Role.MANAGER
    }

    users.append(manager)
    user_id_counter += 1

    return {
        "id": manager["id"],
        "name": manager["name"],
        "email": manager["email"],
        "role": manager["role"]
    }