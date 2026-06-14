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
import { Button } from "@ssobkowski/rnui/button";
import { CoinIconStroke } from "@ssobkowski/rnui/icons";
import { ModalHeader, ModalStepView } from "@ssobkowski/rnui/modal";
import { Text } from "@ssobkowski/rnui/text";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { useAnimatedReaction, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";
import { scheduleOnRN } from "react-native-worklets";

import type {
  DeskAvailabilityWindow,
  DeskAvailabilityWindowsResult,
} from "@/hooks/use-open-spaces";
import type { LayoutChangeEvent } from "react-native";

interface ReservationTimeStepProps {
  windows: DeskAvailabilityWindow[];
  deskWindows: DeskAvailabilityWindowsResult[];
  creditsPerHour: number;
  creditsBalance: number | null;
  maxDailyHours: number;
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
  creditsPerHour,
  creditsBalance,
  maxDailyHours,
  isConfirming = false,
  onConfirm,
}: ReservationTimeStepProps) {
  const [arcWidth, setArcWidth] = useState(0);
  const [selectedCreditCost, setSelectedCreditCost] = useState(0);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(0);
  const startProgress = useSharedValue(0);
  const endProgress = useSharedValue(1);
  const activeMarker = useSharedValue<Marker>("end");
  const storedStartMinuteOfDay = useReservationPreferencesStore((s) => s.startMinuteOfDay);
  const storedEndMinuteOfDay = useReservationPreferencesStore((s) => s.endMinuteOfDay);
  const setStoredTimeWindow = useReservationPreferencesStore((s) => s.setSelectedTimeWindow);
  const maxDurationMinutes = maxDailyHours > 0 ? maxDailyHours * 60 : null;

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
  const creditCost = useDerivedValue(() =>
    Math.ceil((durationMinutes.value / 60) * creditsPerHour),
  );
  const isOverBudget = creditsBalance !== null && selectedCreditCost > creditsBalance;
  const isOverDailyLimit =
    maxDurationMinutes !== null && selectedDurationMinutes > maxDurationMinutes;
  const maxDurationLabel = maxDurationMinutes !== null ? formatDuration(maxDurationMinutes) : null;

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
      maxDurationMinutes,
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
    maxDurationMinutes,
  ]);

  useAnimatedReaction(
    () => creditCost.value,
    (currentCost, previousCost) => {
      if (currentCost !== previousCost) {
        scheduleOnRN(setSelectedCreditCost, currentCost);
      }
    },
    [creditCost],
  );

  useAnimatedReaction(
    () => durationMinutes.value,
    (currentDuration, previousDuration) => {
      if (currentDuration !== previousDuration) {
        scheduleOnRN(setSelectedDurationMinutes, currentDuration);
      }
    },
    [durationMinutes],
  );

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
          maxDurationMinutes,
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
        maxDurationMinutes,
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
    const selectedDurationMinutes = Math.max(0, selectedEndOffset - selectedStartOffset);

    if (maxDurationMinutes !== null && selectedDurationMinutes > maxDurationMinutes) return;

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
      durationMinutes: selectedDurationMinutes,
    });
  };

  return (
    <ModalStepView index={1} style={styles.modal}>
      <ModalHeader>Choose time</ModalHeader>

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

          <View style={styles.creditRow}>
            <CoinIconStroke
              width={18}
              height={18}
              strokeWidth={2}
              color={isOverBudget ? "#EC6A5B" : "#7A7D85"}
            />
            {isOverBudget ? (
              <Text color="#EC6A5B">
                {selectedCreditCost} {selectedCreditCost === 1 ? "credit" : "credits"}
                {creditsBalance !== null ? ` · ${creditsBalance} available` : ""}
              </Text>
            ) : (
              <Text tone="text.secondary">
                {selectedCreditCost} {selectedCreditCost === 1 ? "credit" : "credits"}
                {creditsBalance !== null ? ` · ${creditsBalance} available` : ""}
              </Text>
            )}
          </View>

          {isOverDailyLimit && maxDurationLabel !== null && (
            <Text color="#EC6A5B">Maximum reservation time is {maxDurationLabel} per day.</Text>
          )}

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

          <Button
            variant="primary"
            disabled={isConfirming || isOverBudget || isOverDailyLimit}
            onPress={handleConfirm}
          >
            <Text color="white" size="lg" weight="medium">
              {isConfirming
                ? "Reserving..."
                : isOverDailyLimit
                  ? "Time limit exceeded"
                  : isOverBudget
                    ? "Not enough credits"
                    : "Confirm"}
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
  creditRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
});
