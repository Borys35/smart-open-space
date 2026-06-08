from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.dependencies import get_db, get_current_user
from app.models import User, OpenSpace, Membership, Invitation, Desk
from app.routers.mobile.reservations import get_desk_available_windows, get_open_space_day_range, validate_min_duration
from app.schemas import (
    MobileOpenSpaceSummary,
    MobileOpenSpaceCreditsResponse,
    OpenSpaceDeskAvailabilitySummaryResponse
)

router = APIRouter(prefix="/api/open-spaces", tags=["mobile-open-spaces"])

def serialize_open_space(open_space: OpenSpace):
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

@router.get("", response_model=list[MobileOpenSpaceSummary])
def get_my_open_spaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    open_spaces = (
        db.query(OpenSpace)
        .join(Membership, Membership.open_space_id == OpenSpace.id)
        .filter(
            Membership.user_id == current_user.id,
            Membership.status == "ACTIVE",
            OpenSpace.is_active == True
        )
        .order_by(OpenSpace.name.asc())
        .all()
    )

    return [serialize_open_space(open_space) for open_space in open_spaces]

@router.get("/{open_space_id}/credits", response_model=MobileOpenSpaceCreditsResponse)
def get_my_open_space_credits(
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

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this open space")

    return {
        "open_space_id": open_space_id,
        "credits_balance": membership.credits_balance,
        "pending_penalty_credits": membership.pending_penalty_credits
    }

@router.get("/{open_space_id}/desks/availability-summary", response_model=OpenSpaceDeskAvailabilitySummaryResponse)
def get_open_space_desks_availability_summary(
    open_space_id: int,
    date: date,
    min_duration_minutes: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    validate_min_duration(min_duration_minutes)

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

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this open space")

    desks = db.query(Desk).filter(Desk.open_space_id == open_space_id).all()
    day_start, day_end = get_open_space_day_range(open_space, date)
    result = []

    for desk in desks:
        windows = []

        if desk.status == "AVAILABLE":
            windows = get_desk_available_windows(db, desk.id, day_start, day_end, min_duration_minutes)

        result.append({
            "id": desk.id,
            "label": desk.label,
            "x": desk.x,
            "y": desk.y,
            "width": desk.width,
            "height": desk.height,
            "status": desk.status,
            "has_available_window": len(windows) > 0,
            "next_available_window": windows[0] if windows else None
        })

    return {
        "open_space_id": open_space_id,
        "date": date.isoformat(),
        "min_duration_minutes": min_duration_minutes,
        "desks": result
    }

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
    
    return serialize_open_space(open_space)
