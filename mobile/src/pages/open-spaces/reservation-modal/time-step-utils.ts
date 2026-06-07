import { Skia } from "@shopify/react-native-skia";

import type { DeskAvailabilityWindow } from "@/hooks/use-open-spaces";

export type Marker = "start" | "end";

export interface AvailabilityMinuteRange {
  startOffset: number;
  endOffset: number;
}

export const MIN_DURATION_MINUTES = 10;
export const MINUTE_RESOLUTION = 5;
export const ARC_HEIGHT = 210;
export const MARKER_SIZE = 28;

const INTL_DTF = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "numeric",
});

export function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

export function snapMinuteOffset(offsetMinutes: number, windowDurationMinutes: number) {
  "worklet";
  if (windowDurationMinutes <= 0) return 0;
  if (offsetMinutes >= windowDurationMinutes - MINUTE_RESOLUTION / 2) {
    return windowDurationMinutes;
  }

  return clamp(
    Math.round(offsetMinutes / MINUTE_RESOLUTION) * MINUTE_RESOLUTION,
    0,
    windowDurationMinutes,
  );
}

export function snapProgress(progress: number, windowDurationMinutes: number) {
  "worklet";
  if (windowDurationMinutes <= 0) return 0;

  return (
    snapMinuteOffset(progress * windowDurationMinutes, windowDurationMinutes) /
    windowDurationMinutes
  );
}

export function formatTime(value: string) {
  return INTL_DTF.format(new Date(value));
}

export function addMinutes(value: string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function getMinutesBetween(startTime: string, endTime: string) {
  return Math.max(
    0,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
  );
}

export function formatDuration(minutes: number) {
  "worklet";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} h`;

  return `${hours} h ${remainingMinutes} min`;
}

export function getMarkerPosition(progress: number, width: number) {
  "worklet";
  const radius = Math.max(1, (width - MARKER_SIZE * 2) / 2);
  const centerX = width / 2;
  const centerY = radius + MARKER_SIZE / 2;
  const angle = Math.PI - progress * Math.PI;

  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY - radius * Math.sin(angle),
  };
}

export function getProgressFromPoint(x: number, y: number, width: number) {
  "worklet";
  const radius = Math.max(1, (width - MARKER_SIZE * 2) / 2);
  const centerX = width / 2;
  const centerY = radius + MARKER_SIZE / 2;
  const angle = clamp(Math.atan2(centerY - y, x - centerX), 0, Math.PI);

  return (Math.PI - angle) / Math.PI;
}

export function getArcPath(width: number, fromProgress: number, toProgress: number) {
  "worklet";
  const radius = Math.max(1, (width - MARKER_SIZE * 2) / 2);
  const start = getMarkerPosition(fromProgress, width);
  const path = Skia.PathBuilder.Make();

  path.moveTo(start.x, start.y);
  path.arcToOval(
    {
      x: width / 2 - radius,
      y: MARKER_SIZE / 2,
      width: radius * 2,
      height: radius * 2,
    },
    180 + fromProgress * 180,
    (toProgress - fromProgress) * 180,
    false,
  );

  return path.detach();
}

export function getTimeLabel(windowStartMinutes: number, offsetMinutes: number) {
  "worklet";
  const totalMinutes = windowStartMinutes + offsetMinutes;
  const dayMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(dayMinutes / 60);
  const minutes = dayMinutes % 60;
  const hourLabel = hours < 10 ? `0${hours}` : `${hours}`;
  const minuteLabel = minutes < 10 ? `0${minutes}` : `${minutes}`;

  return `${hourLabel}:${minuteLabel}`;
}

export function getWindowStartMinutes(window: DeskAvailabilityWindow | null) {
  if (window === null) return 0;

  const date = new Date(window.start_time);
  return date.getHours() * 60 + date.getMinutes();
}

export function getMinuteOfDay(value: string) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

export function windowContainsRange(
  window: DeskAvailabilityWindow,
  startTime: string,
  endTime: string,
) {
  const windowStartMs = new Date(window.start_time).getTime();
  const windowEndMs = new Date(window.end_time).getTime();
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();

  return windowStartMs <= startMs && windowEndMs >= endMs;
}

export function getTimelineStart(windows: DeskAvailabilityWindow[]) {
  return windows.reduce<DeskAvailabilityWindow | null>((earliest, window) => {
    if (earliest === null || new Date(window.start_time) < new Date(earliest.start_time)) {
      return window;
    }

    return earliest;
  }, null);
}

export function getTimelineEnd(windows: DeskAvailabilityWindow[]) {
  return windows.reduce<DeskAvailabilityWindow | null>((latest, window) => {
    if (latest === null || new Date(window.end_time) > new Date(latest.end_time)) {
      return window;
    }

    return latest;
  }, null);
}

export function getAvailabilityMinuteRanges(
  windows: DeskAvailabilityWindow[],
  timelineStartTime: string,
) {
  return windows
    .map((window) => ({
      startOffset: getMinutesBetween(timelineStartTime, window.start_time),
      endOffset: getMinutesBetween(timelineStartTime, window.end_time),
    }))
    .filter((range) => range.endOffset - range.startOffset >= MIN_DURATION_MINUTES)
    .sort((a, b) => a.startOffset - b.startOffset);
}

export function getUnavailableMinuteRanges(
  availabilityRanges: AvailabilityMinuteRange[],
  timelineDurationMinutes: number,
) {
  const unavailableRanges: AvailabilityMinuteRange[] = [];
  let cursor = 0;

  for (const range of availabilityRanges) {
    if (range.startOffset > cursor) {
      unavailableRanges.push({ startOffset: cursor, endOffset: range.startOffset });
    }

    cursor = Math.max(cursor, range.endOffset);
  }

  if (cursor < timelineDurationMinutes) {
    unavailableRanges.push({ startOffset: cursor, endOffset: timelineDurationMinutes });
  }

  return unavailableRanges;
}

export function snapOffsetToResolution(offsetMinutes: number, timelineDurationMinutes: number) {
  "worklet";
  return snapMinuteOffset(offsetMinutes, timelineDurationMinutes);
}

export function getStartOffsetForEndOffset(
  targetOffset: number,
  endOffset: number,
  availabilityRanges: AvailabilityMinuteRange[],
) {
  "worklet";
  let bestOffset = Number.NaN;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const range of availabilityRanges) {
    const maxStartOffset = Math.min(
      range.endOffset - MIN_DURATION_MINUTES,
      endOffset - MIN_DURATION_MINUTES,
    );

    if (range.startOffset > maxStartOffset || endOffset > range.endOffset) continue;

    const candidateOffset = clamp(targetOffset, range.startOffset, maxStartOffset);
    const distance = Math.abs(candidateOffset - targetOffset);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestOffset = candidateOffset;
    }
  }

  return Number.isNaN(bestOffset) ? null : bestOffset;
}

export function getStartSelectionForTargetOffset(
  targetOffset: number,
  currentEndOffset: number,
  availabilityRanges: AvailabilityMinuteRange[],
) {
  "worklet";
  let bestStartOffset = Number.NaN;
  let bestEndOffset = Number.NaN;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const range of availabilityRanges) {
    const endOffset =
      currentEndOffset >= range.startOffset + MIN_DURATION_MINUTES &&
      currentEndOffset <= range.endOffset
        ? currentEndOffset
        : range.endOffset;
    const maxStartOffset = endOffset - MIN_DURATION_MINUTES;

    if (range.startOffset > maxStartOffset) continue;

    const startOffset = clamp(targetOffset, range.startOffset, maxStartOffset);
    const distance = Math.abs(startOffset - targetOffset);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestStartOffset = startOffset;
      bestEndOffset = endOffset;
    }
  }

  if (Number.isNaN(bestStartOffset) || Number.isNaN(bestEndOffset)) return null;

  return {
    startOffset: bestStartOffset,
    endOffset: bestEndOffset,
  };
}

export function getEndOffsetForStartOffset(
  targetOffset: number,
  startOffset: number,
  availabilityRanges: AvailabilityMinuteRange[],
) {
  "worklet";
  let bestOffset = Number.NaN;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const range of availabilityRanges) {
    const minEndOffset = Math.max(
      range.startOffset + MIN_DURATION_MINUTES,
      startOffset + MIN_DURATION_MINUTES,
    );

    if (minEndOffset > range.endOffset || startOffset < range.startOffset) continue;

    const candidateOffset = clamp(targetOffset, minEndOffset, range.endOffset);
    const distance = Math.abs(candidateOffset - targetOffset);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestOffset = candidateOffset;
    }
  }

  return Number.isNaN(bestOffset) ? null : bestOffset;
}

export function getEndSelectionForTargetOffset(
  targetOffset: number,
  currentStartOffset: number,
  availabilityRanges: AvailabilityMinuteRange[],
) {
  "worklet";
  let bestStartOffset = Number.NaN;
  let bestEndOffset = Number.NaN;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const range of availabilityRanges) {
    const startOffset =
      currentStartOffset >= range.startOffset &&
      currentStartOffset <= range.endOffset - MIN_DURATION_MINUTES
        ? currentStartOffset
        : range.startOffset;
    const minEndOffset = startOffset + MIN_DURATION_MINUTES;

    if (minEndOffset > range.endOffset) continue;

    const endOffset = clamp(targetOffset, minEndOffset, range.endOffset);
    const distance = Math.abs(endOffset - targetOffset);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestStartOffset = startOffset;
      bestEndOffset = endOffset;
    }
  }

  if (Number.isNaN(bestStartOffset) || Number.isNaN(bestEndOffset)) return null;

  return {
    startOffset: bestStartOffset,
    endOffset: bestEndOffset,
  };
}

export function getPreferredRange(
  availabilityRanges: AvailabilityMinuteRange[],
  startMinuteOfDay: number | null,
  endMinuteOfDay: number | null,
  timelineStartMinutes: number,
) {
  const fallbackRange = availabilityRanges.reduce<AvailabilityMinuteRange | null>(
    (longest, range) => {
      if (
        longest === null ||
        range.endOffset - range.startOffset > longest.endOffset - longest.startOffset
      ) {
        return range;
      }

      return longest;
    },
    null,
  );

  if (fallbackRange === null || startMinuteOfDay === null || endMinuteOfDay === null) {
    return fallbackRange;
  }

  const startOffset = startMinuteOfDay - timelineStartMinutes;
  const endOffset = endMinuteOfDay - timelineStartMinutes;
  const storedRangeFits = availabilityRanges.some(
    (range) =>
      startOffset >= range.startOffset &&
      endOffset <= range.endOffset &&
      endOffset - startOffset >= MIN_DURATION_MINUTES,
  );

  if (!storedRangeFits) return fallbackRange;

  return { startOffset, endOffset };
}

export function getLongestWindow(windows: DeskAvailabilityWindow[]) {
  return windows.reduce<DeskAvailabilityWindow | null>((longest, window) => {
    if (longest === null || window.duration_minutes > longest.duration_minutes) return window;
    return longest;
  }, null);
}
