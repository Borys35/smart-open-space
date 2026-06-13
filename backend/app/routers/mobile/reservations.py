from math import ceil
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session 

from app.constants import (
    CREDIT_TRANSACTION_REFUND,
    CREDIT_TRANSACTION_RESERVATION_CHARGE,
    FINISHED_RESERVATION_STATUSES,
    RESERVATION_STATUS_CANCELLED,
    RESERVATION_STATUS_CONFIRMED
)
from app.datetime_utils import as_utc, local_date_time_to_utc, to_utc, utc_now
from app.dependencies import get_db, get_current_user
from app.models import User, Desk, OpenSpace, Membership, Reservation, CreditTransaction
from app.schemas import (
    ReservationCreate,
    ReservationQuoteRequest,
    ReservationQuoteResponse,
    ReservationTimeUpdate,
    ReservationResponse,
    DeskAvailabilityResponse,
    DeskAvailabilityWindowsResponse
)

router = APIRouter(prefix="/api/reservations", tags=["mobile-reservations"])
desks_router = APIRouter(prefix="/api/desks", tags=["mobile-desks"])

def serialize_reservation(reservation: Reservation):
    return {
        "id": reservation.id,
        "desk_id": reservation.desk_id,
        "start_time": as_utc(reservation.start_time),
        "end_time": as_utc(reservation.end_time),
        "credit_cost": reservation.credit_cost,
        "late_checkout_penalty_cost": reservation.late_checkout_penalty_cost,
        "no_show_penalty_cost": reservation.no_show_penalty_cost,
        "status": reservation.status
    }

def get_open_space_day_range(open_space: OpenSpace, selected_date: date):
    day_start = local_date_time_to_utc(selected_date, time.min)
    day_end = day_start + timedelta(days=1)

    if open_space.opened_at is not None:
        day_start = local_date_time_to_utc(selected_date, open_space.opened_at.time())

    if open_space.closed_at is not None:
        day_end = local_date_time_to_utc(selected_date, open_space.closed_at.time())

        if day_end <= day_start:
            day_end += timedelta(days=1)

    return day_start, day_end

def serialize_window(start_time: datetime, end_time: datetime):
    duration_minutes = int((end_time - start_time).total_seconds() / 60)

    return {
        "start_time": as_utc(start_time),
        "end_time": as_utc(end_time),
        "duration_minutes": duration_minutes
    }

def get_desk_available_windows(
    db: Session,
    desk_id: int,
    day_start: datetime,
    day_end: datetime,
    min_duration_minutes: int
):
    reservations = db.query(Reservation).filter(
        Reservation.desk_id == desk_id,
        Reservation.status.notin_(FINISHED_RESERVATION_STATUSES),
        Reservation.end_time > day_start,
        Reservation.start_time < day_end
    ).order_by(Reservation.start_time.asc()).all()

    windows = []
    cursor = day_start

    for reservation in reservations:
        window_start = cursor
        window_end = min(reservation.start_time, day_end)

        if window_end > window_start:
            duration_minutes = int((window_end - window_start).total_seconds() / 60)

            if duration_minutes >= min_duration_minutes:
                windows.append(serialize_window(window_start, window_end))

        if reservation.end_time > cursor:
            cursor = max(reservation.end_time, day_start)

        if cursor >= day_end:
            break

    if cursor < day_end:
        duration_minutes = int((day_end - cursor).total_seconds() / 60)

        if duration_minutes >= min_duration_minutes:
            windows.append(serialize_window(cursor, day_end))

    return windows

def validate_min_duration(min_duration_minutes: int):
    if min_duration_minutes < 1:
        raise HTTPException(status_code=400, detail="min_duration_minutes must be greater than 0")

    return min_duration_minutes

def get_active_membership(db: Session, user_id: int, open_space_id: int):
    return db.query(Membership).filter(
        Membership.user_id == user_id,
        Membership.open_space_id == open_space_id,
        Membership.status == "ACTIVE"
    ).first()

@router.post("", response_model=ReservationResponse, status_code=201)
def create_reservation(
    data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_time = to_utc(data.start_time)
    end_time = to_utc(data.end_time)
    
    desk = db.query(Desk).filter(Desk.id == data.desk_id).first()

    if not desk:
        raise HTTPException(status_code=404, detail="Desk not found")
    
    if desk.status != "AVAILABLE":
        raise HTTPException(status_code=400, detail="Desk is not available")
    
    if end_time <= start_time:
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
        Reservation.status.notin_(FINISHED_RESERVATION_STATUSES),
        end_time > Reservation.start_time,
        start_time < Reservation.end_time
    ).first()

    if conflict_reservation:
        raise HTTPException(status_code=400, detail="Desk is already reserved in this range")

    user_conflict_reservation = db.query(Reservation).filter(
        Reservation.user_id == current_user.id,
        Reservation.status.notin_(FINISHED_RESERVATION_STATUSES),
        end_time > Reservation.start_time,
        start_time < Reservation.end_time
    ).first()

    if user_conflict_reservation:
        raise HTTPException(status_code=400, detail="You already have a reservation in this range")
    
    open_space = db.query(OpenSpace).filter(OpenSpace.id == desk.open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")
    
    duration = end_time - start_time
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
        start_time=start_time,
        end_time=end_time,
        credit_cost=credit_cost,
        status=RESERVATION_STATUS_CONFIRMED
    )

    new_transaction = CreditTransaction(
        membership_id=membership.id,
        amount=-credit_cost,
        type=CREDIT_TRANSACTION_RESERVATION_CHARGE,
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

@router.post("/quote", response_model=ReservationQuoteResponse)
def quote_reservation(
    data: ReservationQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_time = to_utc(data.start_time)
    end_time = to_utc(data.end_time)

    desk = db.query(Desk).filter(Desk.id == data.desk_id).first()

    if not desk:
        raise HTTPException(status_code=404, detail="Desk not found")

    open_space = db.query(OpenSpace).filter(OpenSpace.id == desk.open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")

    if not open_space.is_active:
        raise HTTPException(status_code=400, detail="Open space is inactive")

    membership = get_active_membership(db, current_user.id, desk.open_space_id)

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this open space")

    duration = end_time - start_time
    duration_minutes = max(0, int(duration.total_seconds() / 60))
    credit_cost = 0
    can_reserve = True
    reason = None

    if end_time <= start_time:
        can_reserve = False
        reason = "End time must be after start time"
    else:
        duration_hours = duration.total_seconds() / 3600
        credit_cost = ceil(duration_hours * open_space.credits_per_hour)

        if desk.status != "AVAILABLE":
            can_reserve = False
            reason = "Desk is not available"
        elif duration_hours > open_space.max_daily_hours:
            can_reserve = False
            reason = "Reservation exceeds max daily hours"
        elif membership.credits_balance < credit_cost:
            can_reserve = False
            reason = "Not enough credits"
        else:
            conflict_reservation = db.query(Reservation).filter(
                Reservation.desk_id == data.desk_id,
                Reservation.status.notin_(FINISHED_RESERVATION_STATUSES),
                end_time > Reservation.start_time,
                start_time < Reservation.end_time
            ).first()

            if conflict_reservation:
                can_reserve = False
                reason = "Desk is already reserved in this range"

            user_conflict_reservation = db.query(Reservation).filter(
                Reservation.user_id == current_user.id,
                Reservation.status.notin_(FINISHED_RESERVATION_STATUSES),
                end_time > Reservation.start_time,
                start_time < Reservation.end_time
            ).first()

            if user_conflict_reservation:
                can_reserve = False
                reason = "You already have a reservation in this range"

    return {
        "desk_id": data.desk_id,
        "start_time": as_utc(start_time),
        "end_time": as_utc(end_time),
        "duration_minutes": duration_minutes,
        "credit_cost": credit_cost,
        "credits_balance": membership.credits_balance,
        "can_reserve": can_reserve,
        "reason": reason
    }

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
    
    if reservation.status in FINISHED_RESERVATION_STATUSES:
        raise HTTPException(status_code=400, detail="Reservation cannot be cancelled")
    
    membership = db.query(Membership).filter(Membership.id == reservation.membership_id).first()

    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    membership.credits_balance += reservation.credit_cost
    reservation.status = RESERVATION_STATUS_CANCELLED

    refund_transaction = CreditTransaction(
        membership_id=membership.id,
        amount=reservation.credit_cost,
        type=CREDIT_TRANSACTION_REFUND,
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
    start_time = to_utc(data.start_time)
    end_time = to_utc(data.end_time)

    reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()

    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This is not your reservation")

    if reservation.status in FINISHED_RESERVATION_STATUSES:
        raise HTTPException(status_code=400, detail="Reservation time cannot be changed")

    if end_time <= start_time:
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
        Reservation.status.notin_(FINISHED_RESERVATION_STATUSES),
        end_time > Reservation.start_time,
        start_time < Reservation.end_time
    ).first()

    if conflict_reservation:
        raise HTTPException(status_code=400, detail="Desk is already reserved in this range")

    user_conflict_reservation = db.query(Reservation).filter(
        Reservation.id != reservation_id,
        Reservation.user_id == current_user.id,
        Reservation.status.notin_(FINISHED_RESERVATION_STATUSES),
        end_time > Reservation.start_time,
        start_time < Reservation.end_time
    ).first()

    if user_conflict_reservation:
        raise HTTPException(status_code=400, detail="You already have a reservation in this range")

    open_space = db.query(OpenSpace).filter(OpenSpace.id == desk.open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")

    duration = end_time - start_time
    duration_hours = duration.total_seconds() / 3600

    if duration_hours > open_space.max_daily_hours:
        raise HTTPException(status_code=400, detail="Reservation exceeds max daily hours")

    new_credit_cost = ceil(duration_hours * open_space.credits_per_hour)
    credit_difference = new_credit_cost - reservation.credit_cost

    if credit_difference > 0 and membership.credits_balance < credit_difference:
        raise HTTPException(status_code=400, detail="Not enough credits")

    if credit_difference != 0:
        membership.credits_balance -= credit_difference

        transaction_type = CREDIT_TRANSACTION_RESERVATION_CHARGE
        description = "Reservation time change charge"

        if credit_difference < 0:
            transaction_type = CREDIT_TRANSACTION_REFUND
            description = "Reservation time change refund"

        credit_transaction = CreditTransaction(
            membership_id=membership.id,
            amount=-credit_difference,
            type=transaction_type,
            description=description,
            created_by=current_user.id
        )

        db.add(credit_transaction)

    reservation.start_time = start_time
    reservation.end_time = end_time
    reservation.credit_cost = new_credit_cost
    reservation.updated_at = utc_now()

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
    start_time = to_utc(start_time)
    end_time = to_utc(end_time)
    
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
        Reservation.status.notin_(FINISHED_RESERVATION_STATUSES),
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

@desks_router.get("/{desk_id}/availability-windows", response_model=DeskAvailabilityWindowsResponse)
def get_desk_availability_windows(
    desk_id: int,
    date: date,
    min_duration_minutes: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    validate_min_duration(min_duration_minutes)

    desk = db.query(Desk).filter(Desk.id == desk_id).first()

    if not desk:
        raise HTTPException(status_code=404, detail="Desk not found")

    open_space = db.query(OpenSpace).filter(OpenSpace.id == desk.open_space_id).first()

    if not open_space:
        raise HTTPException(status_code=404, detail="Open space not found")

    if not open_space.is_active:
        raise HTTPException(status_code=400, detail="Open space is inactive")

    membership = get_active_membership(db, current_user.id, desk.open_space_id)

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this open space")

    day_start, day_end = get_open_space_day_range(open_space, date)
    windows = []

    if desk.status == "AVAILABLE":
        windows = get_desk_available_windows(db, desk_id, day_start, day_end, min_duration_minutes)

    return {
        "desk_id": desk_id,
        "date": date.isoformat(),
        "windows": windows
    }
