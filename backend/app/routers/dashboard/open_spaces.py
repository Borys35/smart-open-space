from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.dependencies import get_db, require_roles
from app.models import Invitation, User, OpenSpace, Desk, OpenSpaceManager, Reservation, Membership
from app.schemas import (
    DashboardInviteResponse,
    DashboardOpenSpaceCreate, 
    DashboardOpenSpaceResponse,
    DeskLayoutItem,
    MessageResponse,
    OpenSpaceSettingsUpdate,
    DashboardDeskAvailabilityResponse,
    DashboardOpenSpaceUserResponse
)

router = APIRouter(prefix="/api/dashboard/open-spaces", tags=["dashboard-open-spaces"])

@router.get("", response_model=list[DashboardOpenSpaceResponse])
def get_open_spaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"]))
):
    if current_user.role.name == "SUPER_ADMIN":
        open_spaces = db.query(OpenSpace).all()
    else:
        open_spaces = (
            db.query(OpenSpace)
            .join(OpenSpaceManager, OpenSpaceManager.open_space_id == OpenSpace.id)
            .filter(
                OpenSpaceManager.user_id == current_user.id,
                OpenSpaceManager.is_active == True
            )
            .all()
        )
    
    return [
        {
            "id": os.id,
            "name": os.name,
            "building": os.building,
            "floor": os.floor,
            "address": os.address,
            "place_name": os.place_name,
            "latitude": os.latitude,
            "longitude": os.longitude,
            "image_url": os.image_url,
            "opened_at": os.opened_at,
            "closed_at": os.closed_at,
            "credits_per_hour": os.credits_per_hour,
            "max_daily_hours": os.max_daily_hours,
            "late_checkout_penalty_hours": os.late_checkout_penalty_hours,
            "no_show_penalty_hours": os.no_show_penalty_hours,
            "period_credits": os.period_credits,
            "credit_reset_period": os.credit_reset_period
        } for os in open_spaces
    ]


@router.post("", response_model=DashboardOpenSpaceResponse, status_code=201)
def create_open_space(
    data: DashboardOpenSpaceCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    
    new_open_space = OpenSpace(
        name = data.name,
        building = data.building,
        floor = data.floor,
        address = data.address,
        place_name = data.place_name,
        latitude = data.latitude,
        longitude = data.longitude,
        image_url = data.image_url,
        opened_at = data.opened_at,
        closed_at = data.closed_at,
        late_checkout_penalty_hours = data.late_checkout_penalty_hours,
        no_show_penalty_hours = data.no_show_penalty_hours
    )
    db.add(new_open_space)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="A space with this name already exists in this building")
    
    db.refresh(new_open_space)

    return {
        "id": new_open_space.id,
        "name": new_open_space.name,
        "building": new_open_space.building,
        "floor": new_open_space.floor,
        "address": new_open_space.address,
        "place_name": new_open_space.place_name,
        "latitude": new_open_space.latitude,
        "longitude": new_open_space.longitude,
        "image_url": new_open_space.image_url,
        "opened_at": new_open_space.opened_at,
        "closed_at": new_open_space.closed_at,
        "credits_per_hour": new_open_space.credits_per_hour,
        "max_daily_hours": new_open_space.max_daily_hours,
        "late_checkout_penalty_hours": new_open_space.late_checkout_penalty_hours,
        "no_show_penalty_hours": new_open_space.no_show_penalty_hours,
        "period_credits": new_open_space.period_credits,
        "credit_reset_period": new_open_space.credit_reset_period
    }

@router.get("/{open_space_id}/desks", response_model=list[DeskLayoutItem])
def get_desks_layout(
    open_space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"]))
):
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if current_user.role.name == "MANAGER":
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == open_space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True        
        ).first()

        if not manager_assignment:
            raise HTTPException(status_code=403, detail="You can view desks only in your assigned open space")

    desks = db.query(Desk).filter(Desk.open_space_id == open_space_id).all()

    return [
        {
            "id": desk.id,
            "x": desk.x,
            "y": desk.y,
            "width": desk.width,
            "height": desk.height,
            "data": desk.label
        } for desk in desks
    ]

@router.post("/{open_space_id}/desks", response_model=MessageResponse)
def save_desks_layout(
    open_space_id: int,
    desks: list[DeskLayoutItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"]))
):
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if not open_space.is_active:
        raise HTTPException(status_code=400, detail="Open space is inactive")
    
    if current_user.role.name == "MANAGER":
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == open_space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True        
        ).first()

        if not manager_assignment:
            raise HTTPException(status_code=403, detail="You can manage desks only in your assigned open space")
        

    db.query(Desk).filter(Desk.open_space_id == open_space_id).delete()

    for desk_data in desks:
        new_desk = Desk(
            #print(desk_data)
            open_space_id = open_space_id,
            x = desk_data.x,
            y = desk_data.y,
            width = desk_data.width,
            height = desk_data.height,
            label = desk_data.data
        )

        db.add(new_desk)
    
    db.commit()

    return {
        "message": "Configuration saved successfully!"
    }

@router.patch("/{open_space_id}/settings", response_model=MessageResponse)
def update_open_space_settings(
    open_space_id: int,
    data: OpenSpaceSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"]))
):
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if current_user.role.name == "MANAGER":
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == open_space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True
        ).first()

        if not manager_assignment:
            raise HTTPException(status_code=403, detail="You can update settings only in your assigned open space")

    if data.name is not None:
        open_space.name = data.name

    if data.building is not None:
        open_space.building = data.building

    if data.floor is not None:
        open_space.floor = data.floor

    if data.address is not None:
        open_space.address = data.address

    if data.place_name is not None:
        open_space.place_name = data.place_name

    if data.latitude is not None:
        open_space.latitude = data.latitude

    if data.longitude is not None:
        open_space.longitude = data.longitude

    if data.image_url is not None:
        open_space.image_url = data.image_url

    if data.opened_at is not None:
        open_space.opened_at = data.opened_at

    if data.closed_at is not None:
        open_space.closed_at = data.closed_at

    open_space.credits_per_hour = data.credits_per_hour
    open_space.max_daily_hours = data.max_daily_hours
    open_space.late_checkout_penalty_hours = data.late_checkout_penalty_hours
    open_space.no_show_penalty_hours = data.no_show_penalty_hours
    open_space.period_credits = data.period_credits
    open_space.credit_reset_period = data.credit_reset_period

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="A space with this name already exists in this building")

    return {"message": "Open space settings updated successfully"}

@router.get("/{open_space_id}/invites", response_model=list[DashboardInviteResponse])
def get_open_space_invites(
    open_space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"])),
    pending_only: bool = False
):
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if current_user.role.name == "MANAGER":
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == open_space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True
        ).first()

        if not manager_assignment:
            raise HTTPException(status_code=403, detail="You can view invites only in your assigned open space")
    
    if pending_only:
        invites = db.query(Invitation).filter(
            Invitation.open_space_id == open_space_id,
            Invitation.status == "PENDING"
        ).all()
    else:
        invites = db.query(Invitation).filter(Invitation.open_space_id == open_space_id).all()

    return [
        {
            "id": invite.id,
            "email": invite.invited_email,
            "status": invite.status,
            "invited_user": {
                "id": invite.invited_user.id,
                "username": invite.invited_user.username,
                "email": invite.invited_user.email,
                "role": invite.invited_user.role.name
            } if invite.invited_user else None,
            "created_at": invite.created_at
        } for invite in invites
    ]

@router.get("/{open_space_id}/desks/availability", response_model=list[DashboardDeskAvailabilityResponse])
def get_open_space_desk_availability(
    open_space_id: int,
    time: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"]))
):
    
    if time is None:
        time = datetime.utcnow()
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()
    
    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if current_user.role.name == "MANAGER":
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == open_space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True
        ).first()

        if not manager_assignment:
            raise HTTPException(status_code=403, detail="You can view desk availability only in your assigned open space")
    
    desks = db.query(Desk).filter(Desk.open_space_id == open_space_id).all()
    
    result = []

    for desk in desks:
        current_reservation = db.query(Reservation).filter(
            Reservation.desk_id == desk.id,
            Reservation.status == "CONFIRMED",
            Reservation.start_time <= time,
            Reservation.end_time > time
        ).first()

        next_reservation = db.query(Reservation).filter(
            Reservation.desk_id == desk.id,
            Reservation.status == "CONFIRMED",
            Reservation.start_time > time
        ).order_by(Reservation.start_time.asc()).first()

        result.append({
            "id": desk.id,
            "data": desk.label,
            "x": desk.x,
            "y": desk.y,
            "width": desk.width,
            "height": desk.height,
            "status": desk.status,
            "is_occupied": current_reservation is not None,
            "next_reservation": {
                "id": next_reservation.id,
                "start_time": next_reservation.start_time,
                "end_time": next_reservation.end_time,
                "user_id": next_reservation.user_id
            } if next_reservation else None
        })

    return result 

@router.get("/{open_space_id}/users", response_model=list[DashboardOpenSpaceUserResponse])
def get_open_space_users(
    open_space_id: int,
    role: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"]))
):
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    if current_user.role.name == "MANAGER":
        manager_assignment = db.query(OpenSpaceManager).filter(
            OpenSpaceManager.open_space_id == open_space_id,
            OpenSpaceManager.user_id == current_user.id,
            OpenSpaceManager.is_active == True
        ).first()

        if not manager_assignment:
            raise HTTPException(status_code=403, detail="You can view users only in your assigned open space")

    allowed_roles = ["USER", "MANAGER"]

    if role is not None:
        role = role.strip().upper()

        if role not in allowed_roles:
            raise HTTPException(status_code=400, detail="Role must be USER or MANAGER")
    
    result = []

    if role is None or role == "MANAGER":
        manager_assignments = db.query(OpenSpaceManager, User).join(
            User, OpenSpaceManager.user_id == User.id
        ).filter(
            OpenSpaceManager.open_space_id == open_space_id,
            OpenSpaceManager.is_active == True
        ).all()

        for manager_assignment, user in manager_assignments:
            result.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": "MANAGER",
                "membership_status": None,
                "credits_balance": None,
                "pending_penalty_credits": None
            }) 

    if role is None or role == "USER":
        memberships = db.query(Membership, User).join(
            User, Membership.user_id == User.id
        ).filter(
            Membership.open_space_id == open_space_id
        ).all()

        for membership, user in memberships:
            result.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": "USER",
                "membership_status": membership.status,
                "credits_balance": membership.credits_balance,
                "pending_penalty_credits": membership.pending_penalty_credits
            })

    return result

@router.post("/{open_space_id}/users/{user_id}/promote", response_model=MessageResponse)
def promote_user(
    open_space_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN"]))
):
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_manager = db.query(OpenSpaceManager).filter(
        OpenSpaceManager.open_space_id == open_space_id,
        OpenSpaceManager.user_id == user_id,
        OpenSpaceManager.is_active == True
    ).first()

    if existing_manager:
        raise HTTPException(status_code=400, detail="User is already manager of this open space")
    
    new_manager = OpenSpaceManager(
        open_space_id=open_space_id,
        user_id=user_id,
        assigned_by=current_user.id,
        is_active=True
    )

    db.add(new_manager)
    db.commit()

    return {"message": "User promoted to open space manager successfully"}
