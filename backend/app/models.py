from app.database import Base
from app.datetime_utils import utc_now
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(100), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    is_active = Column(Boolean, default=True, nullable=False)

    role = relationship("Role", back_populates="users")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(
        SQLEnum("SUPER_ADMIN", "USER", name="role_enum", create_type=False),
        nullable=False,
        unique=True,
    )

    users = relationship("User", back_populates="role")


class OpenSpace(Base):
    __tablename__ = "open_spaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    floor = Column(Integer, nullable=False)
    building = Column(String(50), nullable=False)
    address = Column(Text, nullable=True)
    place_name = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    image_url = Column(Text, nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    credits_per_hour = Column(Integer, default=2, nullable=False)
    max_daily_hours = Column(Integer, default=8, nullable=False)
    late_checkout_penalty_hours = Column(Integer, nullable=True)
    no_show_penalty_hours = Column(Integer, nullable=True)
    period_credits = Column(Integer, default=80, nullable=False)
    credit_reset_period = Column(
        SQLEnum(
            "WEEKLY", "MONTHLY", name="credit_reset_period_enum", create_type=False
        ),
        default="WEEKLY",
        nullable=False,
    )
    last_credit_reset_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    is_active = Column(Boolean, default=True, nullable=False)

    manager_assignments = relationship("OpenSpaceManager", back_populates="open_space")
    desks = relationship("Desk", back_populates="open_space")
    invitations = relationship("Invitation", back_populates="open_space")

    __table_args__ = (
        UniqueConstraint("building", "name", name="uq_open_spaces_building_name"),
        CheckConstraint("credits_per_hour > 0", name="ck_open_spaces_credits_per_hour_positive"),
        CheckConstraint("max_daily_hours > 0", name="ck_open_spaces_max_daily_hours_positive"),
        CheckConstraint(
            "late_checkout_penalty_hours IS NULL OR late_checkout_penalty_hours > 0",
            name="ck_open_spaces_late_checkout_penalty_hours_positive",
        ),
        CheckConstraint(
            "no_show_penalty_hours IS NULL OR no_show_penalty_hours > 0",
            name="ck_open_spaces_no_show_penalty_hours_positive",
        ),
        CheckConstraint("period_credits >= 0", name="ck_open_spaces_period_credits_non_negative"),
    )


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

    __table_args__ = (
        Index(
            "idx_open_space_managers_user_active",
            "user_id",
            postgresql_where=text("is_active = TRUE"),
        ),
    )


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
        SQLEnum(
            "AVAILABLE",
            "MAINTENANCE",
            "INACTIVE",
            name="desk_status",
            create_type=False,
        ),
        default="AVAILABLE",
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    open_space = relationship("OpenSpace", back_populates="desks")

    __table_args__ = (
        CheckConstraint("width > 0", name="ck_desks_width_positive"),
        CheckConstraint("height > 0", name="ck_desks_height_positive"),
        Index("idx_desks_open_space_status", "open_space_id", "status"),
    )


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    invited_email = Column(String(255), nullable=False)
    invited_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(
        SQLEnum(
            "PENDING",
            "ACCEPTED",
            "REJECTED",
            "EXPIRED",
            name="invitation_status",
            create_type=False,
        ),
        server_default=text("'PENDING'"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=utc_now)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP + INTERVAL '7 days'"),
        nullable=False,
    )

    open_space = relationship("OpenSpace", back_populates="invitations")
    invited_user = relationship("User", foreign_keys=[invited_user_id])
    invited_by_user = relationship("User", foreign_keys=[invited_by])

    __table_args__ = (
        CheckConstraint(
            "invited_user_id IS NULL OR invited_user_id <> invited_by",
            name="ck_invitations_not_self",
        ),
        Index(
            "unique_pending_invitation_per_email",
            "open_space_id",
            "invited_email",
            unique=True,
            postgresql_where=text("status = 'PENDING'"),
        ),
        Index("idx_invitations_open_space_status_created_at", "open_space_id", "status", "created_at"),
    )


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    credits_balance = Column(Integer, default=0, nullable=False)
    pending_penalty_credits = Column(Integer, default=0, nullable=False)
    status = Column(
        SQLEnum(
            "ACTIVE", "BLOCKED", "LEFT", name="membership_status", create_type=False
        ),
        default="ACTIVE",
        nullable=False,
    )
    joined_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", foreign_keys=[user_id])
    open_space = relationship("OpenSpace")

    __table_args__ = (
        UniqueConstraint("user_id", "open_space_id", name="uq_memberships_user_open_space"),
        CheckConstraint("credits_balance >= 0", name="ck_memberships_credits_balance_non_negative"),
        CheckConstraint(
            "pending_penalty_credits >= 0",
            name="ck_memberships_pending_penalty_credits_non_negative",
        ),
        Index("idx_memberships_open_space_status", "open_space_id", "status"),
        Index("idx_memberships_user_status", "user_id", "status"),
    )


class AccessDevice(Base):
    __tablename__ = "access_devices"

    id = Column(Integer, primary_key=True, index=True)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    device_key = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    open_space = relationship("OpenSpace")


class AccessCredential(Base):
    __tablename__ = "access_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cred_type = Column(
        SQLEnum("CARD", "PHONE", name="access_credential_type", create_type=False),
        nullable=False,
    )
    uid = Column(Text, nullable=True)
    mobile_credential_id = Column(Text, unique=True, nullable=True)
    public_key = Column(Text, nullable=True)
    shared_secret_hash = Column(Text, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        CheckConstraint(
            "(cred_type = 'CARD' AND uid IS NOT NULL AND mobile_credential_id IS NULL AND public_key IS NULL AND shared_secret_hash IS NULL) "
            "OR (cred_type = 'PHONE' AND uid IS NULL AND mobile_credential_id IS NOT NULL AND public_key IS NOT NULL AND shared_secret_hash IS NOT NULL)",
            name="ck_access_credentials_type_fields",
        ),
        Index(
            "unique_active_card_per_user",
            "user_id",
            unique=True,
            postgresql_where=text("cred_type = 'CARD' AND active = TRUE"),
        ),
        Index(
            "unique_active_card_uid",
            "uid",
            unique=True,
            postgresql_where=text(
                "cred_type = 'CARD' AND active = TRUE AND uid IS NOT NULL"
            ),
        ),
        Index("idx_access_credentials_user_created_at", "user_id", "created_at"),
    )


class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(Text, nullable=False)
    device_id = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    __table_args__ = (
        UniqueConstraint("user_id", "device_id", name="uq_push_tokens_user_device"),
        CheckConstraint("length(token) > 0 AND length(token) < 64", name="ck_push_tokens_token_length"),
        CheckConstraint("length(device_id) = 32", name="ck_push_tokens_device_id_length"),
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
        SQLEnum(
            "PENDING",
            "CONFIRMED",
            "CANCELLED",
            "DONE",
            "NO_SHOW",
            name="reservation_status",
            create_type=False,
        ),
        default="CONFIRMED",
        nullable=False,
    )
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    checked_out_at = Column(DateTime(timezone=True), nullable=True)
    late_checkout_penalty_applied_at = Column(DateTime(timezone=True), nullable=True)
    no_show_penalty_applied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    desk = relationship("Desk", foreign_keys=[desk_id])
    user = relationship("User", foreign_keys=[user_id])
    membership = relationship("Membership", foreign_keys=[membership_id])

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_reservations_end_time_after_start_time"),
        CheckConstraint("credit_cost >= 0", name="ck_reservations_credit_cost_non_negative"),
        CheckConstraint(
            "late_checkout_penalty_cost >= 0",
            name="ck_reservations_late_checkout_penalty_cost_non_negative",
        ),
        CheckConstraint(
            "no_show_penalty_cost >= 0",
            name="ck_reservations_no_show_penalty_cost_non_negative",
        ),
        Index("idx_reservations_user_start_time", "user_id", "start_time"),
        Index("idx_reservations_status_start_time", "status", "start_time"),
    )


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(
        SQLEnum(
            "TOP_UP",
            "RESERVATION_CHARGE",
            "REFUND",
            "MANUAL_ADJUSTMENT",
            "LATE_CHECKOUT_PENALTY",
            "NO_SHOW_PENALTY",
            name="credit_transaction_type",
            create_type=False,
        ),
        nullable=False,
    )
    description = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    membership = relationship("Membership", foreign_keys=[membership_id])
    created_by_user = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        CheckConstraint("amount <> 0", name="ck_credit_transactions_amount_non_zero"),
    )


class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    access_credential_id = Column(
        Integer, ForeignKey("access_credentials.id"), nullable=False
    )
    access_device_id = Column(Integer, ForeignKey("access_devices.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    open_space_id = Column(Integer, ForeignKey("open_spaces.id"), nullable=False)
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=True)
    scanned_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    action = Column(
        SQLEnum(
            "CHECK_IN",
            "CHECK_OUT",
            "ENTRY",
            "IDENTITY_VERIFICATION",
            name="access_action",
            create_type=False,
        ),
        nullable=False,
    )
    result = Column(
        SQLEnum("SUCCESS", "DENIED", name="access_result", create_type=False),
        nullable=False,
    )

    access_credential = relationship(
        "AccessCredential", foreign_keys=[access_credential_id]
    )
    access_device = relationship("AccessDevice", foreign_keys=[access_device_id])
    user = relationship("User", foreign_keys=[user_id])
    open_space = relationship("OpenSpace", foreign_keys=[open_space_id])
    reservation = relationship("Reservation", foreign_keys=[reservation_id])

    __table_args__ = (
        Index("idx_access_logs_open_space_scanned_at", "open_space_id", "scanned_at"),
        Index("idx_access_logs_user_scanned_at", "user_id", "scanned_at"),
    )
