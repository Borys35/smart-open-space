import { formatTime } from "@/pages/open-spaces/reservation-modal/time-step-utils";
import { Button } from "@ssobkowski/rnui/button";
import { Text } from "@ssobkowski/rnui/text";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { DeskAvailabilityWindow } from "@/hooks/use-open-spaces";

interface WindowChipsProps {
  windows: DeskAvailabilityWindow[];
  selectedWindowIndex: number;
  onSelectWindow: (index: number) => void;
}

export function WindowChips({ windows, selectedWindowIndex, onSelectWindow }: WindowChipsProps) {
  if (windows.length <= 1) return null;

  return (
    <View style={styles.windowChips}>
      {windows.map((window, index) => {
        const selected = index === selectedWindowIndex;

        return (
          <Button
            key={`${window.start_time}-${window.end_time}`}
            style={[styles.windowChip, selected && styles.selectedWindowChip]}
            onPress={() => onSelectWindow(index)}
          >
            <Text color={selected ? "white" : "black"} size="sm" weight="medium">
              {formatTime(window.start_time)} - {formatTime(window.end_time)}
            </Text>
          </Button>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  windowChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  windowChip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: "#F2F3F5",
  },
  selectedWindowChip: {
    backgroundColor: "#00B2FF",
  },
});
