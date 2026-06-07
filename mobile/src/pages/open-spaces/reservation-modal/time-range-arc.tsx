import { ARC_HEIGHT, formatTime } from "@/pages/open-spaces/reservation-modal/time-step-utils";
import { Canvas, Circle, Path } from "@shopify/react-native-skia";
import { Text } from "@ssobkowski/rnui";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { StyleSheet } from "react-native-unistyles";

import type { DeskAvailabilityWindow } from "@/hooks/use-open-spaces";
import type { SkPath } from "@shopify/react-native-skia";
import type { LayoutChangeEvent } from "react-native";
import type { GestureType } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";

interface TimeRangeArcProps {
  selectedWindow: DeskAvailabilityWindow;
  arcWidth: number;
  gesture: GestureType;
  trackPath: SharedValue<SkPath>;
  selectedPath: SharedValue<SkPath>;
  startMarkerX: SharedValue<number>;
  startMarkerY: SharedValue<number>;
  endMarkerX: SharedValue<number>;
  endMarkerY: SharedValue<number>;
  onLayout: (event: LayoutChangeEvent) => void;
}

export function TimeRangeArc({
  selectedWindow,
  arcWidth,
  gesture,
  trackPath,
  selectedPath,
  startMarkerX,
  startMarkerY,
  endMarkerX,
  endMarkerY,
  onLayout,
}: TimeRangeArcProps) {
  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.arcPanel} onLayout={onLayout}>
        {arcWidth > 0 && (
          <Canvas style={styles.canvas}>
            <Path
              path={trackPath}
              color="#D9DDE3"
              style="stroke"
              strokeCap="round"
              strokeWidth={12}
            />
            <Path
              path={selectedPath}
              color="#00B2FF"
              style="stroke"
              strokeCap="round"
              strokeWidth={14}
            />
            <Circle cx={startMarkerX} cy={startMarkerY} r={13} color="#00B2FF" />
            <Circle cx={endMarkerX} cy={endMarkerY} r={13} color="#00B2FF" />
            <Circle cx={startMarkerX} cy={startMarkerY} r={6} color="white" />
            <Circle cx={endMarkerX} cy={endMarkerY} r={6} color="white" />
          </Canvas>
        )}

        <View style={styles.arcLabels}>
          <Text size="sm" tone="text.secondary">
            {formatTime(selectedWindow.start_time)}
          </Text>
          <Text size="sm" tone="text.secondary">
            {formatTime(selectedWindow.end_time)}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  arcPanel: {
    minHeight: ARC_HEIGHT,
    borderRadius: 24,
    backgroundColor: "#F7F8FA",
    overflow: "hidden",
  },
  canvas: {
    height: ARC_HEIGHT - 28,
    width: "100%",
  },
  arcLabels: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
