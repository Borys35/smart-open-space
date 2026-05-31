from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.dependencies import require_roles, get_db
from app.models import User, Desk, OpenSpace, OpenSpaceManager, Reservation, Membership, CreditTransaction
from app.schemas import DashboardReservationsPageResponse, DashboardReservationDetailsResponse

router = APIRouter(prefix="/api/dashboard/open-spaces", tags=["dashboard-reservations"])

@router.get("/{open_space_id}/reservations", response_model=DashboardReservationsPageResponse)
def get_open_space_reservations(
    open_space_id: int,
    page: int = 1,
    limit: int = 20,
    sort: str = "start_time_desc",
    status: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    user_id: int | None = None,
    desk_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"]))
):
    
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be greater than 0")
    
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
    
    allowed_sort_values = ["start_time_desc", "start_time_asc", "end_time_desc", "end_time_asc"]

    if sort not in allowed_sort_values :
        raise HTTPException(status_code=400, detail="Invalid sort value")
    
    allowed_status_values = ["PENDING", "CONFIRMED", "CANCELLED", "DONE"]
    if status is not None and status not in allowed_status_values:
        raise HTTPException(status_code=400, detail="Invalid reservation status")
    
    if date_from is not None and date_to is not None:
        if date_to < date_from:
            raise  HTTPException(status_code=400, detail="date_to must be after date_from")
        
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
            raise HTTPException(
                status_code=403,
                detail="You can view reservations only in your assigned open space"
            )
        
    query = db.query(Reservation, Desk, User).join(
        Desk, Reservation.desk_id == Desk.id
    ).join(
        User, Reservation.user_id == User.id
    ).filter(
        Desk.open_space_id == open_space_id
    )

    if status is not None:
        query = query.filter(Reservation.status == status)

    if date_from is not None:
        query = query.filter(Reservation.start_time >= date_from)

    if date_to is not None:
        query = query.filter(Reservation.start_time <= date_to)

    if user_id is not None:
        query = query.filter(Reservation.user_id == user_id)

    if desk_id is not None:
        query = query.filter(Reservation.desk_id == desk_id)

    total = query.count()

    if sort == "start_time_asc":
        query = query.order_by(Reservation.start_time.asc())
    elif sort == "end_time_asc":
        query = query.order_by(Reservation.end_time.asc())
    elif sort == "end_time_desc":
        query = query.order_by(Reservation.end_time.desc())
    else:
        query = query.order_by(Reservation.start_time.desc())

    offset = (page - 1) * limit 

    rows = query.offset(offset).limit(limit).all()

    items = []

    for reservation, desk, user in rows:
        items.append({
            "id": reservation.id,
            "desk_id": desk.id,
            "desk_label": desk.label,
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "start_time": reservation.start_time,
            "end_time": reservation.end_time,
            "credit_cost": reservation.credit_cost,
            "status": reservation.status
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/{open_space_id}/reservations/{reservation_id}", response_model=DashboardReservationDetailsResponse)
def get_reservation_details(
    open_space_id: int,
    reservation_id: int,
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
            raise HTTPException(status_code=403, detail="You can view reservations only in your assigned open space")
    
    row = db.query(Reservation, Desk, User).join(
        Desk, Reservation.desk_id == Desk.id,
    ).join(
        User, Reservation.user_id == User.id
    ).filter(
        Reservation.id == reservation_id,
        Desk.open_space_id == open_space_id
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Reservation not found")

    reservation, desk, user = row

    return {
        "id": reservation.id,
        "desk_id": desk.id,
        "desk_label": desk.label,
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "start_time": reservation.start_time,
        "end_time": reservation.end_time,
        "credit_cost": reservation.credit_cost,
        "status": reservation.status,
        "checked_in_at": reservation.checked_in_at,
        "checked_out_at": reservation.checked_out_at,
        "created_at": reservation.created_at
    }
        
@router.delete("/{open_space_id}/reservations/{reservation_id}", status_code=204)
def cancel_reservation_by_manager(
    open_space_id: int,
    reservation_id: int,
    reason: str | None = None,
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
            raise HTTPException(status_code=403, detail="You can cancel reservation only in your assigned open space")
        
    row = db.query(Reservation, Desk).join(
        Desk, Reservation.desk_id == Desk.id
    ).filter(
        Reservation.id == reservation_id,
        Desk.open_space_id == open_space_id
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    reservation, desk = row

    not_cancellable_statuses = ["CANCELLED", "DONE"]

    if reservation.status in not_cancellable_statuses:
        raise HTTPException(status_code=400, detail="Reservation cannot be cancelled")
    
    membership = db.query(Membership).filter(Membership.id == reservation.membership_id).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    membership.credits_balance += reservation.credit_cost
    reservation.status = "CANCELLED"

    description = "Reservation cancelled by manager"

    if reason:
        description += f". Reason: {reason}"

    refund_transaction = CreditTransaction(
        membership_id=membership.id,
        amount=reservation.credit_cost,
        type="REFUND",
        description=description,
        created_by=current_user.id
    )

    db.add(refund_transaction)
    db.commit()

    return
