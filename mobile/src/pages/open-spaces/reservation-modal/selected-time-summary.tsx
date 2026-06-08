import { Text } from "@ssobkowski/rnui/text";
import { TextInput, View } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import type { SharedValue } from "react-native-reanimated";

interface SelectedTimeSummaryProps {
  selectedRangeLabel: SharedValue<string>;
  durationLabel: SharedValue<string>;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function SelectedTimeSummary({
  selectedRangeLabel,
  durationLabel,
}: SelectedTimeSummaryProps) {
  const selectedRangeAnimatedProps = useAnimatedProps(() => ({
    defaultValue: selectedRangeLabel.value,
    text: selectedRangeLabel.value,
  }));
  const durationAnimatedProps = useAnimatedProps(() => ({
    defaultValue: durationLabel.value,
    text: durationLabel.value,
  }));

  return (
    <View style={styles.summary}>
      <Text tone="text.secondary">Selected range</Text>
      <AnimatedTextInput
        animatedProps={selectedRangeAnimatedProps}
        editable={false}
        style={styles.rangeText}
      />
      <AnimatedTextInput
        animatedProps={durationAnimatedProps}
        editable={false}
        style={styles.durationText}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  summary: {
    alignItems: "center",
    gap: 3,
  },
  rangeText: {
    minHeight: 34,
    color: "black",
    fontSize: 30,
    fontFamily: theme.typography.text.medium,
    fontWeight: "500",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  durationText: {
    minHeight: 22,
    color: "#6F737A",
    fontSize: 20,
    fontFamily: theme.typography.text.medium,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
}));
