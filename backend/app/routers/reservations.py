from math import ceil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session 

from app.dependencies import get_db, get_current_user
from app.models import User, Desk, OpenSpace, Membership, Reservation, CreditTransaction
from app.schemas import ReservationCreate, ReservationResponse, DeskAvailabilityResponse

router = APIRouter(prefix="/api/reservations", tags=["reservations"])

@router.post("", response_model=ReservationResponse, status_code=201)
def create_reservation(
    data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    desk = db.query(Desk).filter(Desk.id == data.desk_id).first()

    if not desk:
        raise HTTPException(status_code=404, detail="Desk not found")
    
    if desk.status != "AVAILABLE":
        raise HTTPException(status_code=400, detail="Desk is not available")
    
    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.open_space_id == desk.open_space_id,
        Membership.status == "ACTIVE" 
        ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this open space")
    
    conflict_reservation = db.query(Reservation).filter(
        Reservation.desk_id == data.desk_id,
        Reservation.status != "CANCELLED",
        data.end_time > Reservation.start_time,
        data.start_time < Reservation.end_time
    ).first()

    if conflict_reservation:
        raise HTTPException(status_code=400, detail="Desk is already reserved in this range")
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == desk.open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    duration = data.end_time - data.start_time
    duration_hours = duration.total_seconds() / 3600
    
    if duration_hours > open_space.max_daily_hours:
        raise HTTPException(status_code=400, detail="Reservation exceeds max daily hours")
    
    credit_cost = ceil(duration_hours * open_space.credits_per_hour)

    if membership.credits_balance < credit_cost:
        raise HTTPException(status_code=400, detail="Not enough credits")
    
    membership.credits_balance -= credit_cost

    new_reservation = Reservation(
        desk_id=data.desk_id,
        user_id=current_user.id,
        membership_id=membership.id,
        start_time=data.start_time,
        end_time=data.end_time,
        credit_cost=credit_cost,
        status="CONFIRMED"
    )

    new_transaction = CreditTransaction(
        membership_id=membership.id,
        amount=-credit_cost,
        type="RESERVATION_CHARGE",
        description="Reservation charge",
        created_by=current_user.id 
    )

    db.add(new_reservation)
    db.add(new_transaction)
    db.commit()
    db.refresh(new_reservation)

    return {        
        "id": new_reservation.id,
        "desk_id": new_reservation.desk_id,
        "start_time": new_reservation.start_time,
        "end_time": new_reservation.end_time,
        "credit_cost": new_reservation.credit_cost,
        "status": new_reservation.status
    }    
    
@router.get("/my", response_model=list[ReservationResponse])
def get_my_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    reservations = db.query(Reservation
                    ).filter(Reservation.user_id == current_user.id
                    ).order_by(Reservation.start_time.desc()
                    ).all()
    
    return [
        {
            "id": reservation.id,
            "desk_id": reservation.desk_id,
            "start_time": reservation.start_time,
            "end_time": reservation.end_time,
            "credit_cost": reservation.credit_cost,
            "status": reservation.status 
        } for reservation in reservations 
    ]

@router.post("/{reservation_id}/cancel", status_code=200)
def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
): 
    
    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This is not your reservation")
    
    if reservation.status in ["CANCELLED", "DONE"]:
        raise HTTPException(status_code=400, detail="Reservation cannot be cancelled")
    
    membership = db.query(Membership).filter(Membership.id == reservation.membership_id).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    membership.credits_balance += reservation.credit_cost
    reservation.status = "CANCELLED"

    refund_transaction = CreditTransaction(
        membership_id=membership.id,
        amount=reservation.credit_cost,
        type="REFUND",
        description="Reservation refund",
        created_by=current_user.id
    )

    db.add(refund_transaction)
    db.commit()

    return

@router.get("/availability", response_model=list[DeskAvailabilityResponse])
def get_desk_availability(
    open_space_id: int,
    start_time: datetime,
    end_time: datetime,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.open_space_id == open_space_id,
        Membership.status == "ACTIVE"
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this open space")
    
    desks = db.query(Desk).filter(
        Desk.open_space_id == open_space_id
    ).all()

    desk_ids = []

    for desk in desks:
        desk_ids.append(desk.id)

    conflicting_reservations = db.query(Reservation).filter(
        Reservation.desk_id.in_(desk_ids),
        Reservation.status != "CANCELLED",
        start_time < Reservation.end_time,
        end_time > Reservation.start_time
    ).all()

    reserved_desk_ids = set()

    for reservation in conflicting_reservations:
        reserved_desk_ids.add(reservation.desk_id)

    
    return [
        {
            "id": desk.id,
            "data": desk.label,
            "x": desk.x,
            "y": desk.y,
            "width": desk.width,
            "height": desk.height,
            "available": desk.status == "AVAILABLE" and desk.id not in reserved_desk_ids
        }

        for desk in desks
    ]
