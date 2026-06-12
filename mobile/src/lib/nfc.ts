const SERIAL_REGEX = /[^a-fA-F0-9]/g;
export function normalizeSerial(raw: string): string | null {
  const cleaned = raw.replace(SERIAL_REGEX, "").toUpperCase();
  if (cleaned.length % 2 !== 0) {
    return null;
  }

  return cleaned.match(/.{2}/g)!.join("");
}

const CARD_COLORS = ["#EE33F9", "#A050FF", "#00B2FF", "#6BCE00", "#F5B001", "#FF9A02", "#FF2A39"];
export function getCardColor(serial?: string) {
  if (!serial) return "black";

  const sum = serial
    .split("")
    .filter((char) => char !== ":")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CARD_COLORS[sum % CARD_COLORS.length];
}

export function getCardHash(serial?: string): string | null {
  if (!serial) return null;

  return serial
    .split("")
    .filter((char) => char !== ":")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    .toString();
}
