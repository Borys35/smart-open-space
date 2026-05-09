from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, Role
from app.routers import auth, users, open_spaces

app = FastAPI()

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(open_spaces.router)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind = engine)

    db = SessionLocal()
    
    try:
        default_roles = ["USER", "MANAGER", "SUPER_ADMIN"]

        for x in default_roles:
            existing_role = db.query(Role).filter(Role.name == x).first()

            if not existing_role:
                new_role = Role(name = x)
                db.add(new_role)

        db.commit()

    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "Backend work"}

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@app.get("/roles")
def get_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()


