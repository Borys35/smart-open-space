from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo


APP_TIMEZONE = ZoneInfo("Europe/Warsaw")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=APP_TIMEZONE).astimezone(timezone.utc)

    return value.astimezone(timezone.utc)


def local_date_time_to_utc(selected_date: date, selected_time: time) -> datetime:
    local_datetime = datetime.combine(selected_date, selected_time, tzinfo=APP_TIMEZONE)
    return local_datetime.astimezone(timezone.utc)


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)
