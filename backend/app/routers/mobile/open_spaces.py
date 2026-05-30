from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.dependencies import get_db, get_current_user
from app.models import User, OpenSpace, Membership, Invitation
from app.schemas import MobileOpenSpaceSummary

router = APIRouter(prefix="/api/open-spaces", tags=["mobile-open-spaces"])

@router.get("/{open_space_id}", response_model=MobileOpenSpaceSummary)
def get_open_space_details(
    open_space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if not open_space.is_active:
        raise HTTPException(status_code=400, detail="Open space is inactive")
    
    membership = db.query(Membership).filter(
        Membership.open_space_id == open_space_id,
        Membership.user_id == current_user.id,
        Membership.status == "ACTIVE"
    ).first()
    
    user_email = current_user.email.lower().strip()

    invite = db.query(Invitation).filter(
        Invitation.open_space_id == open_space_id,
        Invitation.status == "PENDING",
        or_(
            Invitation.invited_user_id == current_user.id, 
            Invitation.invited_email == user_email
        )
    ).first()

    if not membership and not invite:
        raise HTTPException(status_code=403, detail="You do not have access to this open space")
    
    return {
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
