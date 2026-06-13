from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.datetime_utils import utc_now
from app.dependencies import get_db, get_current_user
from app.models import User, Invitation, Membership, OpenSpace
from app.schemas import InviteResponse

router = APIRouter(prefix="/api/invites", tags=["mobile-invites"])

@router.get("", response_model=list[InviteResponse])
def get_my_invites(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
    ):
    """Get pending invitations for the current user"""

    user_email = current_user.email.lower().strip()

    invites = db.query(Invitation, OpenSpace).join(
        OpenSpace, Invitation.open_space_id == OpenSpace.id
    ).filter(
        Invitation.status == "PENDING",
        or_(
            Invitation.invited_user_id == current_user.id,
            Invitation.invited_email == user_email
        )
    ).all()

    result = []

    for invite, open_space in invites:
        result.append({
            "id": invite.id,
            "user_id": invite.invited_user_id,
            "space_id": invite.open_space_id,
            "invited_email": invite.invited_email,
            "status": invite.status,
            "open_space": {
                "id": open_space.id,
                "name": open_space.name,
                "building": open_space.building,
                "floor": open_space.floor,
                "address": open_space.address,
                "place_name": open_space.place_name,
                "latitude": open_space.latitude,
                "longitude": open_space.longitude,
                "image_url": open_space.image_url,
                "opened_at": open_space.opened_at,
                "closed_at": open_space.closed_at
            }
        })

    return result

@router.post("/{invite_id}/reject", status_code=200)
def reject_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    user_email = current_user.email.lower().strip()

    invite = db.query(Invitation).filter(Invitation.id == invite_id).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    is_invited_user = (
        invite.invited_user_id == current_user.id
        or invite.invited_email == user_email
    )

    if not is_invited_user:
        raise HTTPException(status_code=403, detail="You cannot reject this invitation")
    
    if invite.status != "PENDING":
        raise HTTPException(status_code=400, detail="Invitation is not pending")
    
    invite.status = "REJECTED"
    invite.responded_at = utc_now()

    db.commit()

    return

@router.post("/{invite_id}/accept", status_code=200)
def accept_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    user_email = current_user.email.lower().strip()

    invite = db.query(Invitation).filter(Invitation.id == invite_id).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    is_invited_user = (
        invite.invited_user_id == current_user.id
        or invite.invited_email == user_email
    )

    if not is_invited_user:
        raise HTTPException(status_code=403, detail="You cannot accept this invitation")
    
    if invite.status != "PENDING":
        raise HTTPException(status_code=400, detail="Invitation is not pending")
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == invite.open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    existing_membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.open_space_id == invite.open_space_id
    ).first()

    if not existing_membership:
        new_membership = Membership(
            user_id=current_user.id,
            open_space_id=invite.open_space_id,
            credits_balance=open_space.period_credits,
            status="ACTIVE"
        )

        db.add(new_membership)

    invite.status = "ACCEPTED"
    invite.responded_at = utc_now()

    if invite.invited_user_id is None:
        invite.invited_user_id = current_user.id
    
    db.commit()

    return
