from math import ceil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session 

from app.dependencies import get_db, get_current_user
from app.models import User, Desk, OpenSpace, Membership, Reservation, CreditTransaction
from app.schemas import ReservationCreate, ReservationTimeUpdate, ReservationResponse, DeskAvailabilityResponse

router = APIRouter(prefix="/api/reservations", tags=["mobile-reservations"])

def serialize_reservation(reservation: Reservation):
    return {
        "id": reservation.id,
        "desk_id": reservation.desk_id,
        "start_time": reservation.start_time,
        "end_time": reservation.end_time,
        "credit_cost": reservation.credit_cost,
        "status": reservation.status
    }

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
        Reservation.status.notin_(["CANCELLED", "DONE"]),
        data.end_time > Reservation.start_time,
        data.start_time < Reservation.end_time
    ).first()

    if conflict_reservation:
        raise HTTPException(status_code=400, detail="Desk is already reserved in this range")

    user_conflict_reservation = db.query(Reservation).filter(
        Reservation.user_id == current_user.id,
        Reservation.status.notin_(["CANCELLED", "DONE"]),
        data.end_time > Reservation.start_time,
        data.start_time < Reservation.end_time
    ).first()

    if user_conflict_reservation:
        raise HTTPException(status_code=400, detail="You already have a reservation in this range")
    
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

    return serialize_reservation(new_reservation)
    
@router.get("/my", response_model=list[ReservationResponse])
def get_my_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    reservations = db.query(Reservation
                    ).filter(Reservation.user_id == current_user.id
                    ).order_by(Reservation.start_time.desc()
                    ).all()
    
    return [serialize_reservation(reservation) for reservation in reservations]

@router.delete("/{reservation_id}", status_code=200)
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

@router.patch("/{reservation_id}", response_model=ReservationResponse)
def update_reservation_time(
    reservation_id: int,
    data: ReservationTimeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This is not your reservation")

    if reservation.status in ["CANCELLED", "DONE"]:
        raise HTTPException(status_code=400, detail="Reservation time cannot be changed")

    if data.end_time <= data.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    desk = db.query(Desk).filter(Desk.id == reservation.desk_id).first()

    if not desk:
        raise HTTPException(status_code=404, detail="Desk not found")

    if desk.status != "AVAILABLE":
        raise HTTPException(status_code=400, detail="Desk is not available")

    membership = db.query(Membership).filter(
        Membership.id == reservation.membership_id,
        Membership.user_id == current_user.id,
        Membership.status == "ACTIVE"
    ).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    conflict_reservation = db.query(Reservation).filter(
        Reservation.id != reservation_id,
        Reservation.desk_id == reservation.desk_id,
        Reservation.status.notin_(["CANCELLED", "DONE"]),
        data.end_time > Reservation.start_time,
        data.start_time < Reservation.end_time
    ).first()

    if conflict_reservation:
        raise HTTPException(status_code=400, detail="Desk is already reserved in this range")

    user_conflict_reservation = db.query(Reservation).filter(
        Reservation.id != reservation_id,
        Reservation.user_id == current_user.id,
        Reservation.status.notin_(["CANCELLED", "DONE"]),
        data.end_time > Reservation.start_time,
        data.start_time < Reservation.end_time
    ).first()

    if user_conflict_reservation:
        raise HTTPException(status_code=400, detail="You already have a reservation in this range")

    open_space = db.query(OpenSpace).filter(OpenSpace.id == desk.open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")

    duration = data.end_time - data.start_time
    duration_hours = duration.total_seconds() / 3600

    if duration_hours > open_space.max_daily_hours:
        raise HTTPException(status_code=400, detail="Reservation exceeds max daily hours")

    new_credit_cost = ceil(duration_hours * open_space.credits_per_hour)
    credit_difference = new_credit_cost - reservation.credit_cost

    if credit_difference > 0 and membership.credits_balance < credit_difference:
        raise HTTPException(status_code=400, detail="Not enough credits")

    if credit_difference != 0:
        membership.credits_balance -= credit_difference

        transaction_type = "RESERVATION_CHARGE"
        description = "Reservation time change charge"

        if credit_difference < 0:
            transaction_type = "REFUND"
            description = "Reservation time change refund"

        credit_transaction = CreditTransaction(
            membership_id=membership.id,
            amount=-credit_difference,
            type=transaction_type,
            description=description,
            created_by=current_user.id
        )

        db.add(credit_transaction)

    reservation.start_time = data.start_time
    reservation.end_time = data.end_time
    reservation.credit_cost = new_credit_cost
    reservation.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(reservation)

    return serialize_reservation(reservation)

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
        Reservation.status.notin_(["CANCELLED", "DONE"]),
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

@router.get("/{reservation_id}", response_model=ReservationResponse)
def get_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This is not your reservation")

    return serialize_reservation(reservation)
