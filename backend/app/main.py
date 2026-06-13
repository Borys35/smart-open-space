import threading
import time
import logging

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.constants import ROLE_SUPER_ADMIN, ROLE_USER
from app.database import SessionLocal, engine, Base
from app.models import User, Role
from app.services.credit_reset_service import reset_expired_open_space_credits
from app.services.penalty_service import apply_no_show_penalties

from app.routers import auth
from app.routers.dashboard import open_spaces as dashboard_open_spaces
from app.routers.dashboard import users as dashboard_users
from app.routers.dashboard import invites as dashboard_invites
from app.routers.dashboard import reservations as dashboard_reservations
from app.routers.dashboard import access as dashboard_access
from app.routers.dashboard import stats as dashboard_stats
from app.routers.mobile import invites as mobile_invites
from app.routers.mobile import reservations as mobile_reservations
from app.routers.mobile import push_tokens as mobile_push_tokens
from app.routers.mobile import open_spaces as mobile_open_spaces
from app.routers.mobile import access_credentials as mobile_access_credentials
from app.routers.sensor import access as sensor_access

app = FastAPI()
logger = logging.getLogger(__name__)

app.include_router(auth.router)
app.include_router(dashboard_open_spaces.router)
app.include_router(dashboard_users.router)
app.include_router(dashboard_invites.router)
app.include_router(dashboard_reservations.router)
app.include_router(dashboard_access.router)
app.include_router(dashboard_stats.router)
app.include_router(mobile_invites.router)
app.include_router(mobile_reservations.router)
app.include_router(mobile_reservations.desks_router)
app.include_router(mobile_push_tokens.router)
app.include_router(mobile_open_spaces.router)
app.include_router(mobile_access_credentials.router)
app.include_router(mobile_access_credentials.mobile_credentials_router)
app.include_router(sensor_access.router)

def scheduled_jobs_loop():
    while True:
        db = SessionLocal()

        try:
            apply_no_show_penalties(db)
            reset_expired_open_space_credits(db)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Scheduled jobs loop failed")
        finally: 
            db.close()

        time.sleep(3600)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind = engine)

    db = SessionLocal()
    
    try:
        default_roles = [ROLE_USER, ROLE_SUPER_ADMIN]

        for x in default_roles:
            existing_role = db.query(Role).filter(Role.name == x).first()

            if not existing_role:
                new_role = Role(name = x)
                db.add(new_role)

        db.commit()

    finally:
        db.close()

    threading.Thread(target=scheduled_jobs_loop, daemon=True).start()

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

