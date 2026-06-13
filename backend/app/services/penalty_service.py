from datetime import datetime

from sqlalchemy.orm import Session

from app.constants import (
    CREDIT_TRANSACTION_LATE_CHECKOUT_PENALTY,
    CREDIT_TRANSACTION_NO_SHOW_PENALTY,
    RESERVATION_STATUS_CONFIRMED,
    RESERVATION_STATUS_NO_SHOW
)
from app.datetime_utils import utc_now
from app.models import CreditTransaction, Membership, OpenSpace, Reservation

def charge_penalty_credits(membership: Membership, penalty_cost: int):
    if penalty_cost <= 0:
        return

    if membership.credits_balance >= penalty_cost:
        membership.credits_balance -= penalty_cost
        return

    remaining_penalty = penalty_cost - membership.credits_balance
    membership.credits_balance = 0
    membership.pending_penalty_credits += remaining_penalty

def apply_late_checkout_penalty(
    db: Session,
    reservation: Reservation,
    membership: Membership,
    open_space: OpenSpace,
    checked_out_at: datetime
):
    if open_space.late_checkout_penalty_hours is None:
        return

    if reservation.late_checkout_penalty_applied_at is not None:
        return

    if checked_out_at <= reservation.end_time:
        return

    penalty_cost = open_space.credits_per_hour * open_space.late_checkout_penalty_hours

    charge_penalty_credits(membership, penalty_cost)

    reservation.late_checkout_penalty_cost = penalty_cost
    reservation.late_checkout_penalty_applied_at = checked_out_at

    penalty_transaction = CreditTransaction(
        membership_id=membership.id,
        amount=-penalty_cost,
        type=CREDIT_TRANSACTION_LATE_CHECKOUT_PENALTY,
        description=f"Late checkout penalty for reservation {reservation.id}",
        created_by=None
    )

    db.add(penalty_transaction)

def apply_no_show_penalties(db: Session):
    now = utc_now()

    rows = (
        db.query(Reservation, Membership, OpenSpace)
        .join(Membership, Reservation.membership_id == Membership.id)
        .join(OpenSpace, Membership.open_space_id == OpenSpace.id)
        .filter(
            Reservation.status == RESERVATION_STATUS_CONFIRMED,
            Reservation.checked_in_at == None,
            Reservation.end_time < now
        )
        .all()
    )

    for reservation, membership, open_space in rows:
        if (
            open_space.no_show_penalty_hours is not None
            and reservation.no_show_penalty_applied_at is None
        ):
            penalty_cost = open_space.credits_per_hour * open_space.no_show_penalty_hours

            charge_penalty_credits(membership, penalty_cost)

            reservation.no_show_penalty_cost = penalty_cost
            reservation.no_show_penalty_applied_at = now

            penalty_transaction = CreditTransaction(
                membership_id=membership.id,
                amount=-penalty_cost,
                type=CREDIT_TRANSACTION_NO_SHOW_PENALTY,
                description=f"No-show penalty for reservation {reservation.id}",
                created_by=None
            )

            db.add(penalty_transaction)

        reservation.status = RESERVATION_STATUS_NO_SHOW
        reservation.updated_at = now
