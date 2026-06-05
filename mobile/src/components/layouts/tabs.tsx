import { TabBarButton } from "@/components/nav/tab-bar-button";
import {
  TabList,
  TabSlot,
  Tabs,
  type TabsDescriptor,
  type TabsSlotRenderOptions,
  TabTrigger,
} from "expo-router/ui";
import { useCallback, useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import type { WithTimingConfig, SharedValue } from "react-native-reanimated";

const SLIDE_DISTANCE = 30;

const TAB_ORDER = {
  "open-spaces": 100,
  home: 200,
  reservations: 300,
} as const;

type TabName = keyof typeof TAB_ORDER;

const TRANSITION_OPTIONS: WithTimingConfig = {
  duration: 275,
  easing: Easing.bezier(0.77, 0, 0.175, 1),
};

function getTabOrder(name: string): number {
  return name in TAB_ORDER ? TAB_ORDER[name as TabName] : TAB_ORDER.home;
}

function getInitialTranslateX(name: string): number {
  const order = getTabOrder(name);

  if (order < TAB_ORDER.home) return -SLIDE_DISTANCE;
  if (order > TAB_ORDER.home) return SLIDE_DISTANCE;

  return 0;
}

interface TabTransitionState {
  initialized: SharedValue<boolean>;
  fromOrder: SharedValue<number>;
  toOrder: SharedValue<number>;
  token: SharedValue<number>;
}

interface AnimatedScreenWrapperProps extends TabsSlotRenderOptions {
  descriptor: TabsDescriptor;
  transition: TabTransitionState;
}

function AnimatedScreenWrapper({
  descriptor,
  isFocused,
  loaded,
  transition,
}: AnimatedScreenWrapperProps) {
  const routeName = descriptor.route.name;
  const routeOrder = getTabOrder(routeName);

  const translateX = useSharedValue(isFocused ? 0 : getInitialTranslateX(routeName));
  const opacity = useSharedValue(isFocused ? 1 : 0);
  const zIndex = useSharedValue(isFocused ? 2 : 0);

  useEffect(() => {
    if (!isFocused) return;

    const nextOrder = getTabOrder(routeName);

    if (!transition.initialized.get()) {
      transition.initialized.set(true);
      transition.fromOrder.set(nextOrder);
      transition.toOrder.set(nextOrder);
      return;
    }

    const currentOrder = transition.toOrder.get();

    if (currentOrder === nextOrder) return;

    transition.fromOrder.set(currentOrder);
    transition.toOrder.set(nextOrder);
    transition.token.set(transition.token.get() + 1);
  }, [isFocused, routeName, transition]);

  useAnimatedReaction(
    () => transition.token.get(),
    (token) => {
      if (token === 0) return;

      const fromOrder = transition.fromOrder.get();
      const toOrder = transition.toOrder.get();

      if (fromOrder === toOrder) return;

      const direction = fromOrder < toOrder ? 1 : -1;
      const isEntering = routeOrder === toOrder;
      const isLeaving = routeOrder === fromOrder;

      cancelAnimation(translateX);
      cancelAnimation(opacity);

      if (isEntering) {
        zIndex.set(2);

        // If this screen is fully hidden, place it on the correct side.
        // If it is mid-transition, do not snap it; reverse smoothly.
        if (opacity.get() <= 0.01) {
          translateX.set(direction * SLIDE_DISTANCE);
        }

        translateX.set(withTiming(0, TRANSITION_OPTIONS));
        opacity.set(withTiming(1, TRANSITION_OPTIONS));
        return;
      }

      if (isLeaving) {
        zIndex.set(1);

        translateX.set(withTiming(-direction * SLIDE_DISTANCE, TRANSITION_OPTIONS));
        opacity.set(
          withTiming(0, TRANSITION_OPTIONS, (finished) => {
            if (finished && transition.token.get() === token) {
              zIndex.set(0);
            }
          }),
        );
        return;
      }

      // Non-participating tab. Keep it hidden and out of the stacking context.
      opacity.set(0);
      zIndex.set(0);
      translateX.set(routeOrder < toOrder ? -SLIDE_DISTANCE : SLIDE_DISTANCE);
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: translateX.get() }],
    zIndex: zIndex.get(),
  }));

  if (!loaded && !isFocused) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={isFocused ? "auto" : "none"}
      style={[styles.screen, animatedStyle]}
    >
      {descriptor.render()}
    </Animated.View>
  );
}

const AnimatedTabBar = () => {
  const insets = useSafeAreaInsets();

  const paddingStyle = {
    paddingBottom: insets.bottom + 24,
    paddingTop: 24,
  };

  return (
    <View style={[styles.tabList, paddingStyle]}>
      <TabTrigger asChild name="open-spaces">
        <TabBarButton name="Spaces" />
      </TabTrigger>

      <TabTrigger asChild name="home">
        <TabBarButton name="Home" />
      </TabTrigger>

      <TabTrigger asChild name="reservations">
        <TabBarButton name="Reservations" />
      </TabTrigger>
    </View>
  );
};

export function ProtectedTabs() {
  const initialized = useSharedValue(false);
  const fromOrder = useSharedValue<number>(TAB_ORDER.home);
  const toOrder = useSharedValue<number>(TAB_ORDER.home);
  const token = useSharedValue(0);

  const transition = useMemo<TabTransitionState>(
    () => ({
      initialized,
      fromOrder,
      toOrder,
      token,
    }),
    [initialized, fromOrder, toOrder, token],
  );

  const tabSlotRenderer = useCallback(
    (descriptor: TabsDescriptor, renderOptions: TabsSlotRenderOptions) => (
      <AnimatedScreenWrapper descriptor={descriptor} {...renderOptions} transition={transition} />
    ),
    [transition],
  );

  return (
    <Tabs>
      <View style={styles.content}>
        <TabSlot detachInactiveScreens={false} renderFn={tabSlotRenderer} />
      </View>

      <TabList style={styles.hiddenExpoTabList}>
        <TabTrigger href="/open-spaces" name="open-spaces" />
        <TabTrigger href="/" name="home" />
        <TabTrigger href="/reservations" name="reservations" />
      </TabList>

      <AnimatedTabBar />
    </Tabs>
  );
}

const styles = StyleSheet.create((t) => ({
  content: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "white",
  },

  hiddenExpoTabList: {
    display: "none",
  },

  screen: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },

  tabList: {
    alignItems: "center",
    backgroundColor: "white",
    borderTopColor: t.colors.border,
    borderTopWidth: 1,
    display: "flex",
    flexDirection: "row",
    gap: 60,
    justifyContent: "center",
    minHeight: 82,
    width: "100%",
  },
}));
