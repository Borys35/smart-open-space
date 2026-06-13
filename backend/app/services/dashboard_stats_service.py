from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from math import ceil

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.datetime_utils import to_utc, utc_now
from app.models import AccessLog, Invitation, Membership, OpenSpace, Reservation


@dataclass(frozen=True)
class StatsRange:
    date_from: datetime
    date_to: datetime
    group_by: str


def _utc_start_of_day(value: datetime) -> datetime:
    value = to_utc(value)
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def _week_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = _utc_start_of_day(now) - timedelta(days=now.weekday())
    end = start + timedelta(days=7)
    return start, end


def _advance_period(start: datetime, group_by: str) -> datetime:
    if group_by == "hour":
        return start + timedelta(hours=1)
    if group_by == "month":
        month = start.month + 1
        year = start.year
        if month == 13:
            month = 1
            year += 1
        return start.replace(year=year, month=month, day=1)
    return start + timedelta(days=1)


def _align_start(date_from: datetime, group_by: str) -> datetime:
    if group_by == "hour":
        return date_from.replace(minute=0, second=0, microsecond=0)

    start = _utc_start_of_day(date_from)

    if group_by == "week":
        return start - timedelta(days=start.weekday())

    if group_by == "month":
        return start.replace(day=1)

    return start


def _default_range() -> StatsRange:
    now = utc_now()
    week_start, week_end = _week_bounds(now)
    return StatsRange(date_from=week_start, date_to=week_end, group_by="day")


def resolve_stats_range(date_from: datetime | None, date_to: datetime | None, group_by: str | None) -> StatsRange:
    default = _default_range()
    resolved_from = to_utc(date_from) if date_from is not None else default.date_from
    resolved_to = to_utc(date_to) if date_to is not None else default.date_to
    resolved_group_by = (group_by or default.group_by).strip().lower()

    if resolved_to <= resolved_from:
        raise ValueError("date_to must be after date_from")

    if resolved_group_by not in {"hour", "day", "week", "month"}:
        raise ValueError("group_by must be hour, day, week, or month")

    return StatsRange(date_from=resolved_from, date_to=resolved_to, group_by=resolved_group_by)


def get_open_space(db: Session, open_space_id: int) -> OpenSpace | None:
    return db.query(OpenSpace).filter(OpenSpace.id == open_space_id).first()


def _periods(stats_range: StatsRange) -> list[tuple[datetime, datetime]]:
    periods: list[tuple[datetime, datetime]] = []
    current = _align_start(stats_range.date_from, stats_range.group_by)

    while current < stats_range.date_to:
        next_period = _advance_period(current, stats_range.group_by)
        periods.append((current, min(next_period, stats_range.date_to)))
        current = next_period

    return periods


def _series_dict(periods: list[tuple[datetime, datetime]], key: str) -> dict[datetime, dict]:
    return {
        period_start: {
            "period_start": period_start,
            "period_end": period_end,
            "reservations": 0,
            "access_logs": 0,
            "check_ins": 0,
            "check_outs": 0,
            "successful_access_logs": 0,
            "denied_access_logs": 0,
            "invitations": 0,
            key: 0,
        }
        for period_start, period_end in periods
    }


def _bucket_key(value: datetime, stats_range: StatsRange) -> datetime:
    value = to_utc(value)
    aligned = _align_start(value, stats_range.group_by)
    if stats_range.group_by == "hour":
        return aligned.replace(minute=0, second=0, microsecond=0)
    if stats_range.group_by == "day":
        return aligned
    if stats_range.group_by == "week":
        return aligned - timedelta(days=aligned.weekday())
    return aligned.replace(day=1)


def _status_counts(rows: list[tuple[str, int]]) -> list[dict]:
    return [{"status": status, "count": count} for status, count in rows]


def _average_credit_balance(db: Session, open_space_id: int) -> tuple[float, int | None, int | None, int]:
    memberships = db.query(Membership).filter(Membership.open_space_id == open_space_id).all()
    if not memberships:
        return 0.0, None, None, 0

    balances = [membership.credits_balance for membership in memberships]
    return sum(balances) / len(balances), min(balances), max(balances), len([m for m in memberships if m.status == "ACTIVE"])


def _credit_renewal(open_space: OpenSpace) -> dict:
    last_reset = open_space.last_credit_reset_at
    if last_reset is None:
        return {
            "credit_reset_period": open_space.credit_reset_period,
            "period_credits": open_space.period_credits,
            "last_credit_reset_at": None,
            "next_credit_reset_at": None,
            "time_until_reset_seconds": None,
        }

    if open_space.credit_reset_period == "MONTHLY":
        next_reset = last_reset + timedelta(days=30)
    else:
        next_reset = last_reset + timedelta(days=7)

    remaining = max(0, ceil((next_reset - utc_now()).total_seconds()))

    return {
        "credit_reset_period": open_space.credit_reset_period,
        "period_credits": open_space.period_credits,
        "last_credit_reset_at": last_reset,
        "next_credit_reset_at": next_reset,
        "time_until_reset_seconds": remaining,
    }


def build_home_stats(db: Session, open_space_id: int) -> dict:
    now = utc_now()
    week_start, week_end = _week_bounds(now)
    week_range = StatsRange(date_from=week_start, date_to=week_end, group_by="day")
    open_space = get_open_space(db, open_space_id)

    if not open_space:
        raise ValueError("Open space not found")

    periods = _periods(week_range)
    reservation_series = _series_dict(periods, "reservations")

    reservations = db.query(Reservation).join(
        Membership, Membership.id == Reservation.membership_id
    ).filter(
        Membership.open_space_id == open_space_id,
        Reservation.start_time >= week_start,
        Reservation.start_time < week_end,
    ).all()

    for reservation in reservations:
        bucket = _bucket_key(reservation.start_time, week_range)
        if bucket in reservation_series:
            reservation_series[bucket]["reservations"] += 1

    access_logs = db.query(AccessLog).filter(
        AccessLog.open_space_id == open_space_id,
        AccessLog.scanned_at >= week_start,
        AccessLog.scanned_at < week_end,
    ).all()

    invitations = db.query(Invitation).filter(
        Invitation.open_space_id == open_space_id,
    ).all()

    membership_rows = db.query(Membership).filter(Membership.open_space_id == open_space_id).all()
    avg_balance, min_balance, max_balance, active_memberships = _average_credit_balance(db, open_space_id)
    active_users = len({membership.user_id for membership in membership_rows if membership.status == "ACTIVE"})

    reservation_status_rows = db.query(Reservation.status, func.count(Reservation.id)).join(
        Membership, Membership.id == Reservation.membership_id
    ).filter(
        Membership.open_space_id == open_space_id,
    ).group_by(Reservation.status).all()

    membership_status_rows = db.query(Membership.status, func.count(Membership.id)).filter(
        Membership.open_space_id == open_space_id,
    ).group_by(Membership.status).all()

    invitation_status_rows = db.query(Invitation.status, func.count(Invitation.id)).filter(
        Invitation.open_space_id == open_space_id,
    ).group_by(Invitation.status).all()

    return {
        "open_space_id": open_space_id,
        "reservations_this_week": len(reservations),
        "reservations_by_day": list(reservation_series.values()),
        "active_memberships": active_memberships,
        "active_users": active_users,
        "pending_invitations": len([invite for invite in invitations if invite.status == "PENDING"]),
        "avg_credits_balance": avg_balance,
        "min_credits_balance": min_balance,
        "max_credits_balance": max_balance,
        "credit_renewal": _credit_renewal(open_space),
        "reservation_status_breakdown": _status_counts(reservation_status_rows),
        "membership_status_breakdown": _status_counts(membership_status_rows),
        "invitation_status_breakdown": _status_counts(invitation_status_rows),
        "access_logs_this_week": len(access_logs),
        "check_ins_this_week": len([log for log in access_logs if log.action == "CHECK_IN"]),
        "check_outs_this_week": len([log for log in access_logs if log.action == "CHECK_OUT"]),
    }


def build_analytics_stats(
    db: Session,
    open_space_id: int,
    stats_range: StatsRange,
) -> dict:
    open_space = get_open_space(db, open_space_id)

    if not open_space:
        raise ValueError("Open space not found")

    periods = _periods(stats_range)
    reservation_series = _series_dict(periods, "reservations")
    access_series = _series_dict(periods, "access_logs")
    invitation_series = _series_dict(periods, "invitations")

    reservations = db.query(Reservation).join(
        Membership, Membership.id == Reservation.membership_id
    ).filter(
        Membership.open_space_id == open_space_id,
        Reservation.start_time >= stats_range.date_from,
        Reservation.start_time < stats_range.date_to,
    ).all()

    access_logs = db.query(AccessLog).filter(
        AccessLog.open_space_id == open_space_id,
        AccessLog.scanned_at >= stats_range.date_from,
        AccessLog.scanned_at < stats_range.date_to,
    ).all()

    invitations = db.query(Invitation).filter(
        Invitation.open_space_id == open_space_id,
        Invitation.created_at >= stats_range.date_from,
        Invitation.created_at < stats_range.date_to,
    ).all()

    for reservation in reservations:
        bucket = _bucket_key(reservation.start_time, stats_range)
        if bucket in reservation_series:
            reservation_series[bucket]["reservations"] += 1

    for access_log in access_logs:
        bucket = _bucket_key(access_log.scanned_at, stats_range)
        if bucket in access_series:
            access_series[bucket]["access_logs"] += 1
            access_series[bucket]["successful_access_logs"] += 1 if access_log.result == "SUCCESS" else 0
            access_series[bucket]["denied_access_logs"] += 1 if access_log.result == "DENIED" else 0
            access_series[bucket]["check_ins"] += 1 if access_log.action == "CHECK_IN" else 0
            access_series[bucket]["check_outs"] += 1 if access_log.action == "CHECK_OUT" else 0

    for invitation in invitations:
        bucket = _bucket_key(invitation.created_at, stats_range)
        if bucket in invitation_series:
            invitation_series[bucket]["invitations"] += 1

    avg_balance, _, _, active_memberships = _average_credit_balance(db, open_space_id)
    membership_rows = db.query(Membership).filter(Membership.open_space_id == open_space_id).all()
    active_users = len({membership.user_id for membership in membership_rows if membership.status == "ACTIVE"})

    reservation_status_rows = db.query(Reservation.status, func.count(Reservation.id)).join(
        Membership, Membership.id == Reservation.membership_id
    ).filter(
        Membership.open_space_id == open_space_id,
    ).group_by(Reservation.status).all()

    membership_status_rows = db.query(Membership.status, func.count(Membership.id)).filter(
        Membership.open_space_id == open_space_id,
    ).group_by(Membership.status).all()

    invitation_status_rows = db.query(Invitation.status, func.count(Invitation.id)).filter(
        Invitation.open_space_id == open_space_id,
    ).group_by(Invitation.status).all()

    access_result_rows = db.query(AccessLog.result, func.count(AccessLog.id)).filter(
        AccessLog.open_space_id == open_space_id,
    ).group_by(AccessLog.result).all()

    access_action_rows = db.query(AccessLog.action, func.count(AccessLog.id)).filter(
        AccessLog.open_space_id == open_space_id,
    ).group_by(AccessLog.action).all()

    return {
        "open_space_id": open_space_id,
        "date_from": stats_range.date_from,
        "date_to": stats_range.date_to,
        "group_by": stats_range.group_by,
        "reservations_over_time": list(reservation_series.values()),
        "access_over_time": list(access_series.values()),
        "invitation_over_time": list(invitation_series.values()),
        "reservation_status_breakdown": _status_counts(reservation_status_rows),
        "membership_status_breakdown": _status_counts(membership_status_rows),
        "invitation_status_breakdown": _status_counts(invitation_status_rows),
        "access_result_breakdown": _status_counts(access_result_rows),
        "access_action_breakdown": _status_counts(access_action_rows),
        "total_reservations": len(reservations),
        "total_access_logs": len(access_logs),
        "total_invitations": len(invitations),
        "active_memberships": active_memberships,
        "active_users": active_users,
        "avg_credits_balance": avg_balance,
        "credit_renewal": _credit_renewal(open_space),
    }
