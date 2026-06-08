export function formatOrdinal(floor: number) {
  const n = floor % 100;
  const s = floor % 10;
  if (n >= 11 && n <= 13) return `${floor}th`;
  if (s === 1) return `${floor}st`;
  if (s === 2) return `${floor}nd`;
  if (s === 3) return `${floor}rd`;
  return `${floor}th`;
}
