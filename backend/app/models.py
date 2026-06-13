from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, BigInteger, Index, UniqueConstraint, Enum as SQLEnum, text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

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
    address = Column(String(255), nullable=True)
    place_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    credits_per_hour = Column(Integer, default=1, nullable=False)
    max_daily_hours = Column(Integer, default=8, nullable=False)
    late_checkout_penalty_hours = Column(Integer, nullable=True)
    no_show_penalty_hours = Column(Integer, nullable=True)
    period_credits = Column(Integer, default=80, nullable=False)
    credit_reset_period = Column(
        SQLEnum("WEEKLY", "MONTHLY", name="credit_reset_period_enum", create_type=False),
        default="WEEKLY",
        nullable=False
    )
    last_credit_reset_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now)
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
    assigned_at = Column(DateTime(timezone=True), default=utc_now)
    unassigned_at = Column(DateTime(timezone=True), nullable=True)
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
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now)

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
    created_at = Column(DateTime(timezone=True), default=utc_now)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(
        DateTime(timezone=True),
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
    pending_penalty_credits = Column(Integer, default=0, nullable=False)
    status = Column(
        SQLEnum("ACTIVE", "BLOCKED", "LEFT", name="membership_status", create_type=False),
        default="ACTIVE",
        nullable=False
    )
    joined_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", foreign_keys=[user_id])
    open_space = relationship("OpenSpace")

class AccessDevice(Base):
    __tablename__ = "access_devices"

    id = Column(Integer, primary_key=True, index=True)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    name = Column(String(100), nullable=False)
    device_key = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now)

    open_space = relationship("OpenSpace")

class AccessCredential(Base):
    __tablename__ = "access_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(
        SQLEnum("NFC_CARD", "PHONE", name="access_credential_type", create_type=False),
        nullable=False
    )
    uid = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=utc_now)
    deactivated_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index(
            "unique_active_nfc_card_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("type = 'NFC_CARD' AND is_active = TRUE")
        ),
    )

class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(64), nullable=False)
    device_id = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        UniqueConstraint("user_id", "device_id", name="uq_push_tokens_user_device"),
    )

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    desk_id = Column(Integer, ForeignKey("desks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    credit_cost = Column(Integer, nullable=False)
    late_checkout_penalty_cost = Column(Integer, default=0, nullable=False)
    no_show_penalty_cost = Column(Integer, default=0, nullable=False)
    status = Column(
        SQLEnum("PENDING", "CONFIRMED", "CANCELLED", "DONE", "NO_SHOW", name="reservation_status", create_type=False),
        default="CONFIRMED",
        nullable=False
    )
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    checked_out_at = Column(DateTime(timezone=True), nullable=True)
    late_checkout_penalty_applied_at = Column(DateTime(timezone=True), nullable=True)
    no_show_penalty_applied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    desk = relationship("Desk", foreign_keys=[desk_id])
    user = relationship("User", foreign_keys=[user_id])
    membership = relationship("Membership", foreign_keys=[membership_id])

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(
        SQLEnum("TOP_UP", "RESERVATION_CHARGE", "REFUND", "MANUAL_ADJUSTMENT", "LATE_CHECKOUT_PENALTY", "NO_SHOW_PENALTY", name="credit_transaction_type", create_type=False),
        nullable=False
    )
    description = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    membership = relationship("Membership", foreign_keys=[membership_id])
    created_by_user = relationship("User", foreign_keys=[created_by])

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    access_credential_id = Column(Integer, ForeignKey("access_credentials.id"), nullable=False)
    access_device_id = Column(Integer, ForeignKey("access_devices.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=True)
    scanned_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    action = Column(
        SQLEnum("CHECK_IN", "CHECK_OUT", "ENTRY", "IDENTITY_VERIFICATION", name="access_action", create_type=False),
        nullable=False
    )
    result = Column(
        SQLEnum("SUCCESS", "DENIED", name="access_result", create_type=False),
        nullable=False
    )

    access_credential = relationship("AccessCredential", foreign_keys=[access_credential_id])
    access_device = relationship("AccessDevice", foreign_keys=[access_device_id])
    user = relationship("User", foreign_keys=[user_id])
    open_space = relationship("OpenSpace", foreign_keys=[open_space_id])
    reservation = relationship("Reservation", foreign_keys=[reservation_id])
