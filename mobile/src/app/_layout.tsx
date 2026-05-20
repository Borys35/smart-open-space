import "@/setup/notifications";
import { NotificationsHandler } from "@/components/notifications";
import { useAuth } from "@/hooks/use-auth";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <>
      <NotificationsHandler />
      <ScreenStack />
    </>
  );
}

function ScreenStack() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
