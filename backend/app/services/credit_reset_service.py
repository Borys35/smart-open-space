from datetime import datetime, timedelta

from app.constants import CREDIT_TRANSACTION_MANUAL_ADJUSTMENT
from app.models import OpenSpace, Membership, CreditTransaction

def should_reset_credits(open_space)->bool:
    now = datetime.utcnow()

    if open_space.last_credit_reset_at is None:
        return True

    if open_space.credit_reset_period == "WEEKLY":
        return now >= open_space.last_credit_reset_at + timedelta(days=7)
    
    if open_space.credit_reset_period == "MONTHLY":
        return now >= open_space.last_credit_reset_at + timedelta(days=30)
    
    return False

def reset_expired_open_space_credits(db):

    open_spaces = db.query(OpenSpace).filter(OpenSpace.is_active == True).all()

    for open_space in open_spaces:
        if not should_reset_credits(open_space):
            continue

        memberships = db.query(Membership).filter(
            Membership.open_space_id == open_space.id,
            Membership.status == "ACTIVE"
        ).all()
        
        for membership in memberships:
            old_balance = membership.credits_balance
            old_pending_penalty = membership.pending_penalty_credits
            new_balance = open_space.period_credits - old_pending_penalty

            if new_balance >= 0:
                membership.credits_balance = new_balance
                membership.pending_penalty_credits = 0
            else:
                membership.credits_balance = 0
                membership.pending_penalty_credits = abs(new_balance)

            amount = membership.credits_balance - old_balance
        
            if amount != 0:
                new_transaction = CreditTransaction(
                    membership_id=membership.id,
                    amount=amount,
                    type=CREDIT_TRANSACTION_MANUAL_ADJUSTMENT,
                    description="Periodic credit reset",
                    created_by=None
                )

                db.add(new_transaction)
    
        open_space.last_credit_reset_at = datetime.utcnow()

    db.commit()

