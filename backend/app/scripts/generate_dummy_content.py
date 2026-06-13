import argparse
import math
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

from passlib.context import CryptContext
from sqlalchemy import and_

# Allow direct execution: `python app/scripts/generate_dummy_content.py`.
if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.database import SessionLocal
from app.datetime_utils import utc_now
from app.models import Desk, Invitation, Membership, OpenSpace, Reservation, Role, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def get_or_create_role(session, role_name: str) -> Role:
    role = session.query(Role).filter(Role.name == role_name).first()
    if role:
        return role

    role = Role(name=role_name)
    session.add(role)
    session.flush()
    return role


def get_or_create_inviter(session, manager_role_id: int, token: str, password_hash: str) -> User:
    existing = (
        session.query(User)
        .join(Role, Role.id == User.role_id)
        .filter(and_(Role.name.in_(["SUPER_ADMIN", "MANAGER"]), User.is_active.is_(True)))
        .order_by(User.id.asc())
        .first()
    )
    if existing:
        return existing

    inviter = User(
        username=f"manager_{token}",
        email=f"manager_{token}@dummy.local",
        password_hash=password_hash,
        role_id=manager_role_id,
        is_active=True,
    )
    session.add(inviter)
    session.flush()
    return inviter


def get_or_create_open_space(
    session,
    token: str,
    open_space_name: str | None,
    building: str | None,
) -> OpenSpace:
    resolved_name = open_space_name or f"Dummy Open Space {token}"
    resolved_building = building or f"Dummy Building {token}"

    open_space = (
        session.query(OpenSpace)
        .filter(OpenSpace.name == resolved_name, OpenSpace.building == resolved_building)
        .first()
    )
    if open_space:
        return open_space

    open_space = OpenSpace(
        name=resolved_name,
        floor=1,
        building=resolved_building,
        address="123 Dummy St",
        place_name="Smart Open Space HQ",
        latitude=52.2297,
        longitude=21.0122,
        image_url="https://picsum.photos/1200/800",
        opened_at=utc_now().replace(hour=8, minute=0, second=0, microsecond=0),
        closed_at=utc_now().replace(hour=20, minute=0, second=0, microsecond=0),
        credits_per_hour=2,
        max_daily_hours=8,
        period_credits=80,
        credit_reset_period="WEEKLY",
        is_active=True,
    )
    session.add(open_space)
    session.flush()
    return open_space


def create_desks(session, open_space: OpenSpace, desk_count: int) -> list[Desk]:
    existing = session.query(Desk).filter(Desk.open_space_id == open_space.id).order_by(Desk.id.asc()).all()
    if len(existing) >= desk_count:
        return existing

    desks = list(existing)
    start_idx = len(existing) + 1
    for i in range(start_idx, desk_count + 1):
        x = ((i - 1) % 5) * 100
        y = ((i - 1) // 5) * 60
        desk = Desk(
            open_space_id=open_space.id,
            label=f"D-{i:02d}",
            x=x,
            y=y,
            width=100,
            height=60,
            status="AVAILABLE",
        )
        session.add(desk)
        desks.append(desk)

    session.flush()
    return desks


def create_users(session, user_role_id: int, token: str, password_hash: str, users_count: int) -> list[User]:
    users: list[User] = []
    for i in range(1, users_count + 1):
        email = f"user_{token}_{i:03d}@dummy.local"
        existing = session.query(User).filter(User.email == email).first()
        if existing:
            users.append(existing)
            continue

        user = User(
            username=f"user_{token}_{i:03d}",
            email=email,
            password_hash=password_hash,
            role_id=user_role_id,
            is_active=True,
        )
        session.add(user)
        users.append(user)

    session.flush()
    return users


def create_memberships(
    session,
    users: list[User],
    open_space_id: int,
    memberships_count: int,
) -> list[Membership]:
    memberships: list[Membership] = []
    eligible_users = users[: min(memberships_count, len(users))]

    for user in eligible_users:
        membership = (
            session.query(Membership)
            .filter(Membership.user_id == user.id, Membership.open_space_id == open_space_id)
            .first()
        )
        if membership:
            memberships.append(membership)
            continue

        membership = Membership(
            user_id=user.id,
            open_space_id=open_space_id,
            credits_balance=random.randint(20, 100),
            status="ACTIVE",
        )
        session.add(membership)
        memberships.append(membership)

    session.flush()
    return memberships


def create_invitations(
    session,
    open_space_id: int,
    inviter_id: int,
    token: str,
    invitations_count: int,
) -> list[Invitation]:
    invitations: list[Invitation] = []
    for i in range(1, invitations_count + 1):
        email = f"invite_{token}_{i:03d}@dummy.local"
        existing = (
            session.query(Invitation)
            .filter(
                Invitation.open_space_id == open_space_id,
                Invitation.invited_email == email,
                Invitation.status == "PENDING",
            )
            .first()
        )
        if existing:
            invitations.append(existing)
            continue

        invitation = Invitation(
            open_space_id=open_space_id,
            invited_email=email,
            invited_by=inviter_id,
            status="PENDING",
            expires_at=utc_now() + timedelta(days=7),
        )
        session.add(invitation)
        invitations.append(invitation)

    session.flush()
    return invitations


def create_reservations(
    session,
    open_space: OpenSpace,
    desks: list[Desk],
    memberships: list[Membership],
    reservations_count: int,
) -> list[Reservation]:
    reservations: list[Reservation] = []
    if not desks or not memberships or reservations_count <= 0:
        return reservations

    now = utc_now()
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_tomorrow = start_of_today + timedelta(days=1)

    scenarios = [
        ("before_today", "DONE"),
        ("before_today", "CANCELLED"),
        ("during_today", "CONFIRMED"),
        ("during_today", "CANCELLED"),
        ("after_today", "PENDING"),
        ("after_today", "CONFIRMED"),
    ]

    def build_time_window(window_name: str, cycle: int, duration_hours: int) -> tuple[datetime, datetime]:
        if window_name == "before_today":
            start_time = start_of_today - timedelta(days=cycle + 2, hours=duration_hours)
            end_time = start_time + timedelta(hours=duration_hours)
            return start_time, end_time

        if window_name == "during_today":
            start_time = start_of_today + timedelta(hours=8 + (cycle % 4) * 2)
            end_time = start_time + timedelta(hours=duration_hours)
            if end_time >= start_of_tomorrow:
                end_time = start_of_tomorrow - timedelta(minutes=30)
                start_time = end_time - timedelta(hours=duration_hours)
            return start_time, end_time

        start_time = start_of_tomorrow + timedelta(days=cycle, hours=8 + (cycle % 4) * 2)
        end_time = start_time + timedelta(hours=duration_hours)
        return start_time, end_time

    for i in range(reservations_count):
        desk = desks[i % len(desks)]
        membership = memberships[i % len(memberships)]
        window_name, status = scenarios[i % len(scenarios)]
        cycle = i // len(scenarios)

        duration_hours = random.choice([1, 2, 3, 4])
        start_time, end_time = build_time_window(window_name, cycle, duration_hours)

        checked_in_at = None
        checked_out_at = None

        if status == "DONE":
            checked_in_at = start_time + timedelta(minutes=5)
            checked_out_at = end_time
        elif status == "CONFIRMED" and start_time <= now <= end_time:
            checked_in_at = start_time + timedelta(minutes=5)

        credit_cost = max(1, math.ceil(duration_hours * open_space.credits_per_hour))

        reservation = Reservation(
            desk_id=desk.id,
            user_id=membership.user_id,
            membership_id=membership.id,
            start_time=start_time,
            end_time=end_time,
            credit_cost=credit_cost,
            status=status,
            checked_in_at=checked_in_at,
            checked_out_at=checked_out_at,
        )
        session.add(reservation)
        reservations.append(reservation)

    session.flush()
    return reservations


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate dummy content for Smart Open Space (users, invitations, open space, memberships, reservations)."
    )
    parser.add_argument("--users", type=int, default=12, help="How many USER accounts to create")
    parser.add_argument("--invitations", type=int, default=8, help="How many invitations to create")
    parser.add_argument("--memberships", type=int, default=6, help="How many memberships (already added users) to create")
    parser.add_argument("--reservations", type=int, default=18, help="How many reservations to create")
    parser.add_argument("--desks", type=int, default=10, help="How many desks should exist in open space")
    parser.add_argument("--password", type=str, default="Password1!", help="Password for generated users")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible data")
    parser.add_argument("--open-space-name", type=str, default=None, help="Optional open space name")
    parser.add_argument("--building", type=str, default=None, help="Optional building name")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if min(args.users, args.invitations, args.memberships, args.reservations, args.desks) < 0:
        raise ValueError("All numeric arguments must be >= 0")

    random.seed(args.seed)

    token = utc_now().strftime("%Y%m%d%H%M%S")
    password_hash = hash_password(args.password)

    session = SessionLocal()
    try:
        user_role = get_or_create_role(session, "USER")
        manager_role = get_or_create_role(session, "MANAGER")
        get_or_create_role(session, "SUPER_ADMIN")

        inviter = get_or_create_inviter(session, manager_role.id, token, password_hash)
        open_space = get_or_create_open_space(session, token, args.open_space_name, args.building)

        desks = create_desks(session, open_space, args.desks)
        users = create_users(session, user_role.id, token, password_hash, args.users)
        memberships = create_memberships(session, users, open_space.id, args.memberships)
        invitations = create_invitations(session, open_space.id, inviter.id, token, args.invitations)
        reservations = create_reservations(session, open_space, desks, memberships, args.reservations)

        session.commit()

        print("Dummy content generated successfully")
        print(f"- Open space: {open_space.name} (id={open_space.id})")
        print(f"- USER role users: {len(users)}")
        print(f"- Memberships (already added users): {len(memberships)}")
        print(f"- Invitations: {len(invitations)}")
        print(f"- Desks in open space: {len(desks)}")
        print(f"- Reservations: {len(reservations)}")
        print(f"- Default password for generated users: {args.password}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
