import threading

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.dependencies import get_db, is_super_admin, require_dashboard_access
from app.models import User, Invitation, OpenSpace, OpenSpaceManager, PushToken
from app.schemas import CreateInviteRequest
from app.services.push_service import send_push_notification

router = APIRouter(prefix="/api/dashboard/invites", tags=["dashboard-invites"])

@router.post("", status_code=201)
def create_invite(
    data: CreateInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access)
):
    open_space = db.query(OpenSpace).filter(OpenSpace.id == data.space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if not open_space.is_active:
        raise HTTPException(status_code=400, detail="Open space is inactive")
    
    if not is_super_admin(current_user):
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == data.space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True
        ).first()

        if not manager_assignment:
            raise HTTPException(
                status_code=403,
                detail="You can invite users only to your assigned open space"
            )
        
    invited_email = str(data.email).lower().strip()
    
    invited_user = db.query(User).filter(User.email == invited_email).first()

    if invited_user and invited_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot invite yourself")
    
    new_invitation = Invitation(
        open_space_id=data.space_id,
        invited_email=invited_email,
        invited_user_id=invited_user.id if invited_user else None,
        invited_by=current_user.id
    )

    db.add(new_invitation)

    try:
        db.commit()
        db.refresh(new_invitation)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Invitation for this email already exists"
        )
    
    if invited_user:
        push_tokens = db.query(PushToken).filter(
            PushToken.user_id == invited_user.id
        ).all()

        if push_tokens:
            def notify():
                for pt in push_tokens:
                    send_push_notification(
                        push_token=pt.token,
                        title="Invitation",
                        body=f"You've been invited to {open_space.name}!",
                        data={"invite_id": new_invitation.id},
                    )

            threading.Thread(target=notify, daemon=True).start()

    return

@router.delete("/{invite_id}", status_code=204)
def delete_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dashboard_access)
):
    invite = db.query(Invitation).filter(Invitation.id == invite_id).first()

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if not is_super_admin(current_user):
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == invite.open_space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True
        ).first()

        if not manager_assignment:
            raise HTTPException(
                status_code=403,
                detail="You can delete invitations only for your assigned open space"
            )
    
    db.delete(invite)
    db.commit()
