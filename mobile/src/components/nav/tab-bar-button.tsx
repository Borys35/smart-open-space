import {
  Button,
  Text,
  HomeIconFilled,
  HomeIconStroke,
  CalendarIconFilled,
  CalendarIconStroke,
  FlatMapPinFilled,
  FlatMapPinStroke,
} from "@ssobkowski/rnui";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import type { TabTriggerSlotProps } from "expo-router/ui";

const ICONS = {
  Home: {
    filled: HomeIconFilled,
    stroke: HomeIconStroke,
  },
  Reservations: {
    filled: CalendarIconFilled,
    stroke: CalendarIconStroke,
  },
  Spaces: {
    filled: FlatMapPinFilled,
    stroke: FlatMapPinStroke,
  },
} as const;

type TabBarButtonProps = TabTriggerSlotProps & {
  name: keyof typeof ICONS;
  badge?: number;
};

export const TabBarButton = ({ isFocused, name, badge, ...props }: TabBarButtonProps) => {
  const { theme } = useUnistyles();
  const showBadge = badge !== undefined && badge > 0;

  const IconComponent = isFocused ? ICONS[name].filled : ICONS[name].stroke;
  return (
    // @ts-expect-error Fuck you
    <Button {...props} variant="icon" hitSlop={14} config={{ scaleTo: 0.96 }}>
      <IconComponent width={30} height={30} color={isFocused ? "black" : theme.colors.text.muted} />

      {showBadge && (
        <View
          pointerEvents="none"
          style={[styles.badge, badge >= 10 ? styles.badgeWide : undefined]}
        >
          <Text color="white" size="sm" weight="medium">
            {badge >= 100 ? "99+" : badge}
          </Text>
        </View>
      )}
    </Button>
  );
};

const styles = StyleSheet.create((t) => ({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    // backgroundColor: t.colors.red,
    backgroundColor: "red",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "white",
  },
  badgeWide: {
    minWidth: 26,
    borderRadius: 13,
  },
}));
