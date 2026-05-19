from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app.dependencies import get_db, get_current_user, require_roles
from app.models import User, Invitation, Membership, OpenSpace, OpenSpaceManager
from app.schemas import InviteResponse, CreateInviteRequest

router = APIRouter(prefix="/api/invites", tags=["invites"])

@router.get("", response_model=list[InviteResponse])
def get_my_invites(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
    ):

    user_email = current_user.email.lower().strip()

    invites = db.query(Invitation).filter(
        Invitation.status == "PENDING",
        or_(
            Invitation.invited_user_id == current_user.id,
            Invitation.invited_email == user_email
        )
    ).all()

    result = []

    for invite in invites:
        result.append({
            "id": invite.id,
            "user_id": invite.invited_user_id,
            "space_id": invite.open_space_id,
            "invited_email": invite.invited_email,
            "status": invite.status
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
    invite.responded_at = datetime.utcnow()

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
    
    existing_membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.open_space_id == invite.open_space_id
    ).first()

    if not existing_membership:
        new_membership = Membership(
            user_id=current_user.id,
            open_space_id=invite.open_space_id,
            credits_balance=0,
            status="ACTIVE"
        )

        db.add(new_membership)

    invite.status = "ACCEPTED"
    invite.responded_at = datetime.utcnow()

    if invite.invited_user_id is None:
        invite.invited_user_id = current_user.id
    
    db.commit()

    return

@router.post("", status_code=201)
def create_invite(
    data: CreateInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"]))
):
    
    invited_user = db.query(User).filter(User.id == data.user_id).first()

    if not invited_user:
        raise HTTPException(status_code=404, detail="Invited user not found")
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == data.space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if not open_space.is_active:
        raise HTTPException(status_code=400, detail="Open space is inactive")
    
    if invited_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot invite yourself")
    
    if current_user.role.name == "MANAGER":
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == data.space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True
        ).first()

        if not manager_assignment:
            raise HTTPException(status_code=403, detail="You can invite users only to your assigned open space")
        
    new_invitation = Invitation(
        open_space_id=data.space_id,
        invited_email=invited_user.email.lower().strip(),
        invited_user_id=invited_user.id,
        invited_by=current_user.id
    )

    db.add(new_invitation)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invitation for this user already exists")
    
    return