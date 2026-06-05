import "@/setup/notifications";
import { BlankStack } from "@/components/layouts/stack";
import { NotificationsHandler } from "@/components/notifications";
import { useAuth } from "@/hooks/use-auth";
import Transition from "@ssobkowski/stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

const openSpaceDetailsTransition = Transition.Presets.SlideFromTop({
  gestureDrivesProgress: false,
});

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <NotificationsHandler />
        <KeyboardProvider>
          <ScreenStack />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

function ScreenStack() {
  const { isAuthenticated } = useAuth();

  return (
    <BlankStack>
      <BlankStack.Protected guard={isAuthenticated}>
        <BlankStack.Screen name="(protected)" />
        <BlankStack.Screen
          name="spaces/[id]"
          options={{ ...openSpaceDetailsTransition, gestureEnabled: false }}
        />
      </BlankStack.Protected>
      <BlankStack.Protected guard={!isAuthenticated}>
        <BlankStack.Screen name="(auth)" />
      </BlankStack.Protected>
    </BlankStack>
  );
}
