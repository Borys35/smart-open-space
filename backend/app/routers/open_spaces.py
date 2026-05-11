from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.dependencies import get_db, require_roles
from app.models import User, OpenSpace, Desk, OpenSpaceManager, Invitation
from app.schemas import (
    DashboardOpenSpaceCreate, 
    DashboardOpenSpaceResponse,
    DeskLayoutItem,
    MessageResponse,
    InviteUserRequest
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
            "floor": os.floor
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
        floor = data.floor
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
        "floor": new_open_space.floor
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
        print(desk_data)
        new_desk = Desk(
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

@router.post("/{open_space_id}/invite", response_model=MessageResponse)
def invite_user_to_open_space(
    open_space_id: int,
    data: InviteUserRequest,
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
            raise HTTPException(status_code=403, detail="You can invite users only to your assigned open space")
        
    invited_email = str(data.email).lower().strip()
    
    invited_user = db.query(User).filter(User.email == invited_email).first()

    if invited_user and invited_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot invite yourself")
    
    new_invitation = Invitation(
        open_space_id = open_space_id,
        invited_email = invited_email,
        invited_user_id = invited_user.id if invited_user else None,
        invited_by = current_user.id
    )

    db.add(new_invitation)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Inviation for this email already exsts")
    
    return {
        "message": "Invitation sent successfully"
    }
