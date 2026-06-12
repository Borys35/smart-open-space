import { Button } from "@ssobkowski/rnui/button";
import { PostcardIconFilled } from "@ssobkowski/rnui/icons";
import { StyleSheet } from "react-native-unistyles";

import type { StyleProp, ViewStyle } from "react-native";

interface CardButtonProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function CardButton({ style, onPress }: CardButtonProps) {
  return (
    <Button variant="icon" style={[styles.cardButton, style]} onPress={onPress}>
      <PostcardIconFilled color="white" size={32} />
    </Button>
  );
}

const styles = StyleSheet.create({
  cardButton: {
    backgroundColor: "black",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
