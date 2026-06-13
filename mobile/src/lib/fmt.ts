const INTL_DTF_DAY = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const INTL_DTF_TIME = new Intl.DateTimeFormat("pl", {
  hour: "numeric",
  minute: "numeric",
});

export function formatOrdinal(floor: number) {
  const n = floor % 100;
  const s = floor % 10;
  if (n >= 11 && n <= 13) return `${floor}th`;
  if (s === 1) return `${floor}st`;
  if (s === 2) return `${floor}nd`;
  if (s === 3) return `${floor}rd`;
  return `${floor}th`;
}

export function formatReservationTime(startTime: string, endTime: string) {
  return `${INTL_DTF_DAY.format(new Date(startTime))} ${INTL_DTF_TIME.format(new Date(startTime))} - ${INTL_DTF_TIME.format(new Date(endTime))}`;
}

export function formatSchedule(open: string, close: string) {
  return `${INTL_DTF_TIME.format(new Date(open))} - ${INTL_DTF_TIME.format(new Date(close))}`;
}

export function parseScheduleTimeParts(
  value: string | null | undefined,
  fallbackHour: number,
  fallbackMinute = 0,
) {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return {
        hour: date.getHours(),
        minute: date.getMinutes(),
      };
    }

    const match = value.match(/^(\d{1,2}):(\d{1,2})/);
    if (match) {
      const hour = Number(match[1]);
      const minute = Number(match[2]);

      if (Number.isFinite(hour) && Number.isFinite(minute)) {
        return { hour, minute };
      }
    }
  }

  return {
    hour: fallbackHour,
    minute: fallbackMinute,
  };
}

export function getTodayScheduleWindow(
  openedAt: string | null | undefined,
  closedAt: string | null | undefined,
  fallbackOpenHour = 9,
  fallbackCloseHour = 17,
) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  const opens = parseScheduleTimeParts(openedAt, fallbackOpenHour);
  const closes = parseScheduleTimeParts(closedAt, fallbackCloseHour);

  start.setHours(opens.hour, opens.minute, 0, 0);
  end.setHours(closes.hour, closes.minute, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const closeMinutes = closes.hour * 60 + closes.minute;
    if (currentMinutes < closeMinutes) {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    }
  }

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

export function isWithinSchedule(
  openedAt: string | null | undefined,
  closedAt: string | null | undefined,
  now = new Date(),
) {
  const opens = parseScheduleTimeParts(openedAt, 9);
  const closes = parseScheduleTimeParts(closedAt, 17);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = opens.hour * 60 + opens.minute;
  const closeMinutes = closes.hour * 60 + closes.minute;

  if (openMinutes === closeMinutes) {
    return true;
  }

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}
