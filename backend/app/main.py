import threading
import time
import logging

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models import User, Role
from app.routers import auth, users, open_spaces, invites, push_tokens, reservations
from app.services.credit_reset_service import reset_expired_open_space_credits

app = FastAPI()
logger = logging.getLogger(__name__)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(open_spaces.router)
app.include_router(invites.router)
app.include_router(push_tokens.router)
app.include_router(reservations.router)

def credit_reset_loop():
    while True:
        db = SessionLocal()

        try:
            reset_expired_open_space_credits(db)
        except Exception:
            db.rollback()
            logger.exception("Credit reset loop failed")
        finally: 
            db.close()

        time.sleep(3600)

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

    threading.Thread(target=credit_reset_loop, daemon=True).start()

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


