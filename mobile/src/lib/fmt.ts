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
