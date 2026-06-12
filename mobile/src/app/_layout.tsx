import "@/setup/notifications";
import { NotificationsHandler } from "@/components/notifications";
import { useAuth } from "@/hooks/use-auth";
import { ModalProvider } from "@ssobkowski/rnui/modal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router/stack";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

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
    <ModalProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(protected)" />
          <Stack.Screen name="spaces/[id]" />
          <Stack.Screen name="nfc-card" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ModalProvider>
  );
}
