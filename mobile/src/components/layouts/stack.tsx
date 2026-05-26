import "react-native-reanimated";
import {
  createBlankStackNavigator,
  type BlankStackNavigationEventMap,
  type BlankStackNavigationOptions,
} from "@ssobkowski/stack";
import { withLayoutContext } from "expo-router";
import { Platform } from "react-native";

import type { ParamListBase, StackNavigationState } from "@react-navigation/native";
import type { ComponentProps } from "react";

const { Navigator } = createBlankStackNavigator();

function BlankStackNavigator(props: ComponentProps<typeof Navigator>) {
  const enableNativeScreens = props.enableNativeScreens ?? Platform.OS === "ios";
  return <Navigator {...props} enableNativeScreens={enableNativeScreens} />;
}

export const BlankStack = withLayoutContext<
  BlankStackNavigationOptions,
  typeof BlankStackNavigator,
  StackNavigationState<ParamListBase>,
  BlankStackNavigationEventMap
>(BlankStackNavigator);
