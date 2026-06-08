import { Button } from "@ssobkowski/rnui/button";
import { ChevronLeftIcon } from "@ssobkowski/rnui/icons";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native-unistyles";

import type { StyleProp, ViewStyle } from "react-native";

interface BackButtonProps {
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function BackButton({ onPress, children, style }: BackButtonProps) {
  const router = useRouter();

  const handlePress = onPress ?? router.back;

  return (
    <Button variant="icon" hitSlop={16} onPress={handlePress} style={[styles.button, style]}>
      {children ?? <ChevronLeftIcon color="#909096" width={36} height={36} strokeWidth={2} />}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
