from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, BigInteger, UniqueConstraint, Enum as SQLEnum, text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)

    role = relationship("Role", back_populates="users")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)

    users = relationship("User", back_populates="role")

class OpenSpace(Base):
    __tablename__ = "open_spaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    floor = Column(Integer, nullable=False)
    building = Column(String(50), nullable=True)
    credits_per_hour = Column(Integer, default=1, nullable=False)
    max_daily_hours = Column(Integer, default=8, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True, nullable=False)

    manager_assignments = relationship("OpenSpaceManager", back_populates="open_space")
    desks = relationship("Desk", back_populates="open_space")
    invitations = relationship("Invitation", back_populates="open_space")

class OpenSpaceManager(Base):
    __tablename__ = "open_space_managers"

    id = Column(Integer, primary_key=True, index=True)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    unassigned_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    open_space = relationship("OpenSpace", back_populates="manager_assignments")
    manager = relationship("User", foreign_keys=[user_id])
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])

class Desk(Base):
    __tablename__ = "desks"

    id = Column(Integer, primary_key=True, index=True)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    label = Column(String(32), nullable=True)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    status = Column(
        SQLEnum("AVAILABLE", "MAINTENANCE", "INACTIVE", name="desk_status", create_type=False), 
        default="AVAILABLE", 
        nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    open_space = relationship("OpenSpace", back_populates="desks")

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    invited_email = Column(String(255), nullable=False)
    invited_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(
        SQLEnum("PENDING", "ACCEPTED", "REJECTED", "EXPIRED", name="invitation_status", create_type=False),
        server_default=text("'PENDING'"),
        nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    expires_at = Column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP + INTERVAL '7 days'"),
        nullable=False
    )

    open_space = relationship("OpenSpace", back_populates="invitations")
    invited_user = relationship("User", foreign_keys=[invited_user_id])
    invited_by_user = relationship("User", foreign_keys=[invited_by]) 

class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    credits_balance = Column(Integer, default=0, nullable=False)
    status = Column(
        SQLEnum("ACTIVE", "BLOCKED", "LEFT", name="membership_status", create_type=False),
        default="ACTIVE",
        nullable=False
    )
    joined_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default= datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    open_space = relationship("OpenSpace")

class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(64), nullable=False)
    device_id = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "device_id", name="uq_push_tokens_user_device"),
    )