import { SelectedTimeSummary } from "@/pages/open-spaces/reservation-modal/selected-time-summary";
import { TimeRangeArc } from "@/pages/open-spaces/reservation-modal/time-range-arc";
import {
  MIN_DURATION_MINUTES,
  addMinutes,
  clamp,
  formatDuration,
  getArcPath,
  getLongestWindow,
  getMarkerPosition,
  getMinutesBetween,
  getProgressFromPoint,
  getTimeLabel,
  getWindowStartMinutes,
  snapMinuteOffset,
  snapProgress,
  type Marker,
} from "@/pages/open-spaces/reservation-modal/time-step-utils";
import { WindowChips } from "@/pages/open-spaces/reservation-modal/window-chips";
import { Button, ModalHeader, ModalStepView, Text } from "@ssobkowski/rnui";
import { useEffect, useState } from "react";
import { Gesture } from "react-native-gesture-handler";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import type { DeskAvailabilityWindow } from "@/hooks/use-open-spaces";
import type { LayoutChangeEvent } from "react-native";

interface ReservationTimeStepProps {
  windows: DeskAvailabilityWindow[];
  onConfirm: (selection: ReservationTimeSelection) => void;
}

export interface ReservationTimeSelection {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export function ReservationTimeStep({ windows, onConfirm }: ReservationTimeStepProps) {
  const [selectedWindowIndex, setSelectedWindowIndex] = useState(0);
  const selectedWindow = windows[selectedWindowIndex] ?? getLongestWindow(windows);
  const [arcWidth, setArcWidth] = useState(0);
  const startProgress = useSharedValue(0);
  const endProgress = useSharedValue(1);
  const activeMarker = useSharedValue<Marker>("end");

  const selectedWindowDuration = selectedWindow
    ? getMinutesBetween(selectedWindow.start_time, selectedWindow.end_time)
    : 0;
  const windowStartMinutes = getWindowStartMinutes(selectedWindow);
  const minProgressGap =
    selectedWindowDuration > 0 ? Math.min(1, MIN_DURATION_MINUTES / selectedWindowDuration) : 1;

  const startOffset = useDerivedValue(() =>
    snapMinuteOffset(startProgress.value * selectedWindowDuration, selectedWindowDuration),
  );
  const endOffset = useDerivedValue(() =>
    snapMinuteOffset(endProgress.value * selectedWindowDuration, selectedWindowDuration),
  );
  const durationMinutes = useDerivedValue(() => Math.max(0, endOffset.value - startOffset.value));
  const selectedRangeLabel = useDerivedValue(
    () =>
      `${getTimeLabel(windowStartMinutes, startOffset.value)} - ${getTimeLabel(
        windowStartMinutes,
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
    startProgress.value = 0;
    endProgress.value = 1;
  }, [endProgress, selectedWindowIndex, startProgress]);

  useEffect(() => {
    setSelectedWindowIndex(0);
  }, [windows]);

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
      if (arcWidth <= 0) return;

      const nextProgress = snapProgress(
        getProgressFromPoint(event.x, event.y, arcWidth),
        selectedWindowDuration,
      );

      if (activeMarker.value === "start") {
        startProgress.value = clamp(nextProgress, 0, endProgress.value - minProgressGap);
        return;
      }

      endProgress.value = clamp(nextProgress, startProgress.value + minProgressGap, 1);
    });

  const handleConfirm = () => {
    if (selectedWindow === null) return;

    const selectedStartOffset = snapMinuteOffset(
      startProgress.value * selectedWindowDuration,
      selectedWindowDuration,
    );
    const selectedEndOffset = snapMinuteOffset(
      endProgress.value * selectedWindowDuration,
      selectedWindowDuration,
    );
    const selectedStartTime = addMinutes(selectedWindow.start_time, selectedStartOffset);
    const selectedEndTime = addMinutes(selectedWindow.start_time, selectedEndOffset);

    onConfirm({
      startTime: selectedStartTime,
      endTime: selectedEndTime,
      durationMinutes: Math.max(0, selectedEndOffset - selectedStartOffset),
    });
  };

  return (
    <ModalStepView index={1} style={styles.modal}>
      <ModalHeader text="Choose time" />

      {selectedWindow === null ? (
        <Text color="#EC6A5B" weight="medium">
          No available windows for this date.
        </Text>
      ) : (
        <>
          <WindowChips
            windows={windows}
            selectedWindowIndex={selectedWindowIndex}
            onSelectWindow={setSelectedWindowIndex}
          />

          <SelectedTimeSummary
            selectedRangeLabel={selectedRangeLabel}
            durationLabel={durationLabel}
          />

          <TimeRangeArc
            selectedWindow={selectedWindow}
            arcWidth={arcWidth}
            gesture={panGesture}
            trackPath={trackPath}
            selectedPath={selectedPath}
            startMarkerX={startMarkerX}
            startMarkerY={startMarkerY}
            endMarkerX={endMarkerX}
            endMarkerY={endMarkerY}
            onLayout={handleArcLayout}
          />

          <Button variant="primary" onPress={handleConfirm}>
            <Text color="white" size="lg" weight="medium">
              Confirm
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
