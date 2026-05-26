import { AuthActionsProvider } from "@/components/auth/auth-actions-context";
import { AuthActionsOverlay } from "@/components/auth/auth-actions-overlay";
import { BlankStack } from "@/components/layouts/stack";
import Transition from "@ssobkowski/stack";
import { interpolate } from "react-native-reanimated";

import type { ScreenStyleInterpolator } from "@ssobkowski/stack";

const screenStyleInterpolator: ScreenStyleInterpolator = ({ progress, current }) => {
  "worklet";

  return {
    content: {
      style: {
        opacity: interpolate(progress, [0, 1, 2], [0, 1, 0]),
        transform: [{ scale: interpolate(progress, [0, 1, 2], [0.9, 1, 1.1]) }],
      },
    },
  };
};

export default function AuthLayout() {
  return (
    <AuthActionsProvider>
      <BlankStack screenOptions={{ gestureEnabled: false }}>
        <BlankStack.Screen
          name="index"
          options={{
            overlay: AuthActionsOverlay,
            overlayShown: true,
            meta: { actions: "welcome" },
          }}
        />
        <BlankStack.Screen
          name="sign-in"
          options={{
            gestureEnabled: false,
            meta: { actions: "sign-in" },
            transitionSpec: {
              open: Transition.Specs.DefaultSpec,
              close: Transition.Specs.DefaultSpec,
            },
            screenStyleInterpolator,
          }}
        />
        <BlankStack.Screen
          name="sign-up"
          options={{
            gestureEnabled: false,
            meta: { actions: "sign-up" },
            transitionSpec: {
              open: Transition.Specs.DefaultSpec,
              close: Transition.Specs.DefaultSpec,
            },
            screenStyleInterpolator,
          }}
        />
      </BlankStack>
    </AuthActionsProvider>
  );
}
