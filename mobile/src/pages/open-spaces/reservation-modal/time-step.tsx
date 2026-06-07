import { SelectedTimeSummary } from "@/pages/open-spaces/reservation-modal/selected-time-summary";
import { TimeRangeArc } from "@/pages/open-spaces/reservation-modal/time-range-arc";
import {
  addMinutes,
  formatDuration,
  getArcPath,
  getAvailabilityMinuteRanges,
  getEndSelectionForTargetOffset,
  getMarkerPosition,
  getMinuteOfDay,
  getMinutesBetween,
  getPreferredRange,
  getProgressFromPoint,
  getStartSelectionForTargetOffset,
  getTimelineEnd,
  getTimelineStart,
  getTimeLabel,
  getUnavailableMinuteRanges,
  snapOffsetToResolution,
  snapProgress,
  windowContainsRange,
  type Marker,
} from "@/pages/open-spaces/reservation-modal/time-step-utils";
import { useReservationPreferencesStore } from "@/stores/reservation-preferences";
import { Button, ModalHeader, ModalStepView, Text } from "@ssobkowski/rnui";
import { useEffect, useMemo, useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import type {
  DeskAvailabilityWindow,
  DeskAvailabilityWindowsResult,
} from "@/hooks/use-open-spaces";
import type { LayoutChangeEvent } from "react-native";

interface ReservationTimeStepProps {
  windows: DeskAvailabilityWindow[];
  deskWindows: DeskAvailabilityWindowsResult[];
  isConfirming?: boolean;
  onConfirm: (selection: ReservationTimeSelection) => void;
}

export interface ReservationTimeSelection {
  deskId: number | null;
  deskLabel?: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export function ReservationTimeStep({
  windows,
  deskWindows,
  isConfirming = false,
  onConfirm,
}: ReservationTimeStepProps) {
  const [arcWidth, setArcWidth] = useState(0);
  const startProgress = useSharedValue(0);
  const endProgress = useSharedValue(1);
  const activeMarker = useSharedValue<Marker>("end");
  const storedStartMinuteOfDay = useReservationPreferencesStore((state) => state.startMinuteOfDay);
  const storedEndMinuteOfDay = useReservationPreferencesStore((state) => state.endMinuteOfDay);
  const setStoredTimeWindow = useReservationPreferencesStore(
    (state) => state.setSelectedTimeWindow,
  );

  const timelineStartWindow = useMemo(() => getTimelineStart(windows), [windows]);
  const timelineEndWindow = useMemo(() => getTimelineEnd(windows), [windows]);
  const timelineStartTime = timelineStartWindow?.start_time ?? null;
  const timelineEndTime = timelineEndWindow?.end_time ?? null;
  const timelineDuration =
    timelineStartTime && timelineEndTime
      ? getMinutesBetween(timelineStartTime, timelineEndTime)
      : 0;
  const timelineStartMinutes = timelineStartTime ? getMinuteOfDay(timelineStartTime) : 0;
  const availabilityRanges = useMemo(
    () => (timelineStartTime ? getAvailabilityMinuteRanges(windows, timelineStartTime) : []),
    [timelineStartTime, windows],
  );
  const unavailableRanges = useMemo(
    () => getUnavailableMinuteRanges(availabilityRanges, timelineDuration),
    [availabilityRanges, timelineDuration],
  );
  const unavailablePaths = useMemo(
    () =>
      unavailableRanges.map((range) =>
        getArcPath(
          arcWidth,
          timelineDuration > 0 ? range.startOffset / timelineDuration : 0,
          timelineDuration > 0 ? range.endOffset / timelineDuration : 0,
        ),
      ),
    [arcWidth, timelineDuration, unavailableRanges],
  );

  const startOffset = useDerivedValue(() =>
    snapOffsetToResolution(startProgress.value * timelineDuration, timelineDuration),
  );
  const endOffset = useDerivedValue(() =>
    snapOffsetToResolution(endProgress.value * timelineDuration, timelineDuration),
  );
  const durationMinutes = useDerivedValue(() => Math.max(0, endOffset.value - startOffset.value));
  const selectedRangeLabel = useDerivedValue(
    () =>
      `${getTimeLabel(timelineStartMinutes, startOffset.value)} - ${getTimeLabel(
        timelineStartMinutes,
        endOffset.value,
      )}`,
  );
  const durationLabel = useDerivedValue(() => formatDuration(durationMinutes.value));

  const trackPath = useDerivedValue(() => getArcPath(arcWidth, 0, 1));
  const selectedPath = useDerivedValue(() =>
    getArcPath(arcWidth, startProgress.value, endProgress.value),
  );
  const startMarkerX = useDerivedValue(() => getMarkerPosition(startProgress.value, arcWidth).x);
  const startMarkerY = useDerivedValue(() => getMarkerPosition(startProgress.value, arcWidth).y);
  const endMarkerX = useDerivedValue(() => getMarkerPosition(endProgress.value, arcWidth).x);
  const endMarkerY = useDerivedValue(() => getMarkerPosition(endProgress.value, arcWidth).y);

  useEffect(() => {
    const preferredRange = getPreferredRange(
      availabilityRanges,
      storedStartMinuteOfDay,
      storedEndMinuteOfDay,
      timelineStartMinutes,
    );

    if (preferredRange === null || timelineDuration <= 0) {
      startProgress.value = 0;
      endProgress.value = 1;
      return;
    }

    startProgress.value = preferredRange.startOffset / timelineDuration;
    endProgress.value = preferredRange.endOffset / timelineDuration;
  }, [
    availabilityRanges,
    endProgress,
    startProgress,
    storedEndMinuteOfDay,
    storedStartMinuteOfDay,
    timelineDuration,
    timelineStartMinutes,
  ]);

  const handleArcLayout = (event: LayoutChangeEvent) => {
    setArcWidth(event.nativeEvent.layout.width);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-4, 4])
    .activeOffsetY([-4, 4])
    .onBegin((event) => {
      "worklet";
      const currentStartMarker = getMarkerPosition(startProgress.value, arcWidth);
      const currentEndMarker = getMarkerPosition(endProgress.value, arcWidth);
      const startDistance = Math.hypot(
        event.x - currentStartMarker.x,
        event.y - currentStartMarker.y,
      );
      const endDistance = Math.hypot(event.x - currentEndMarker.x, event.y - currentEndMarker.y);

      activeMarker.value = startDistance < endDistance ? "start" : "end";
    })
    .onUpdate((event) => {
      "worklet";
      if (arcWidth <= 0 || timelineDuration <= 0) return;

      const targetOffset =
        snapProgress(getProgressFromPoint(event.x, event.y, arcWidth), timelineDuration) *
        timelineDuration;

      if (activeMarker.value === "start") {
        const snappedSelection = getStartSelectionForTargetOffset(
          targetOffset,
          endOffset.value,
          availabilityRanges,
        );

        if (snappedSelection !== null) {
          startProgress.value = snappedSelection.startOffset / timelineDuration;
          endProgress.value = snappedSelection.endOffset / timelineDuration;
        }
        return;
      }

      const snappedSelection = getEndSelectionForTargetOffset(
        targetOffset,
        startOffset.value,
        availabilityRanges,
      );

      if (snappedSelection !== null) {
        startProgress.value = snappedSelection.startOffset / timelineDuration;
        endProgress.value = snappedSelection.endOffset / timelineDuration;
      }
    });

  const handleConfirm = () => {
    if (timelineStartTime === null) return;

    const selectedStartOffset = snapOffsetToResolution(
      startProgress.value * timelineDuration,
      timelineDuration,
    );
    const selectedEndOffset = snapOffsetToResolution(
      endProgress.value * timelineDuration,
      timelineDuration,
    );
    const selectedStartTime = addMinutes(timelineStartTime, selectedStartOffset);
    const selectedEndTime = addMinutes(timelineStartTime, selectedEndOffset);
    const matchingDesk = deskWindows.find((deskWindow) =>
      deskWindow.windows.some((window) =>
        windowContainsRange(window, selectedStartTime, selectedEndTime),
      ),
    );

    setStoredTimeWindow(getMinuteOfDay(selectedStartTime), getMinuteOfDay(selectedEndTime));

    onConfirm({
      deskId: matchingDesk?.desk_id ?? null,
      deskLabel: matchingDesk?.deskLabel,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
      durationMinutes: Math.max(0, selectedEndOffset - selectedStartOffset),
    });
  };

  return (
    <ModalStepView index={1} style={styles.modal}>
      <ModalHeader text="Choose time" />

      {timelineStartTime === null || timelineEndTime === null ? (
        <Text color="#EC6A5B" weight="medium">
          No available windows for this date.
        </Text>
      ) : (
        <>
          <SelectedTimeSummary
            selectedRangeLabel={selectedRangeLabel}
            durationLabel={durationLabel}
          />

          <TimeRangeArc
            timelineStartTime={timelineStartTime}
            timelineEndTime={timelineEndTime}
            arcWidth={arcWidth}
            gesture={panGesture}
            trackPath={trackPath}
            selectedPath={selectedPath}
            unavailablePaths={unavailablePaths}
            startMarkerX={startMarkerX}
            startMarkerY={startMarkerY}
            endMarkerX={endMarkerX}
            endMarkerY={endMarkerY}
            onLayout={handleArcLayout}
          />

          <Button variant="primary" disabled={isConfirming} onPress={handleConfirm}>
            <Text color="white" size="lg" weight="medium">
              {isConfirming ? "Reserving..." : "Confirm"}
            </Text>
          </Button>
        </>
      )}
    </ModalStepView>
  );
}

const styles = StyleSheet.create({
  modal: {
    gap: 14,
  },
});
