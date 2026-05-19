import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useDeviceIdStore } from "@/stores/device-id";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import uuid from "react-native-uuid";
import { Platform } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export function NotificationsHandler() {
  const { user, token } = useAuth();

  const deviceId = useDeviceIdStore((s) => (user ? s.deviceIds[user.id] : undefined));
  const setDeviceId = useDeviceIdStore((s) => s.setDeviceId);

  useEffect(() => {
    if (!user || deviceId) return;

    setDeviceId(user.id, uuid.v4());
  }, [user, deviceId, setDeviceId]);

  useEffect(() => {
    if (!user || !deviceId) return;

    const register = async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          });
        }

        if (!Device.isDevice) {
          console.log("[push] push registration skipped: not a physical device");
          return;
        }

        const { status: permissionStatus } = await Notifications.getPermissionsAsync();
        if (permissionStatus !== "granted") {
          console.warn("[push] push permission not granted: notifications will not be registered");
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          console.warn("[push] Expo projectId not found");
          return;
        }

        const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        const result = await fetch(`${API_URL}/api/tokens/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ device_id: deviceId, token: pushToken }),
        });
        if (!result.ok) {
          console.warn(`[push] failed to register: ${result.status} ${result.statusText}`);
          return;
        }
        console.log("[push] registered");
      } catch (err) {
        console.warn(`[push] failed to register: ${err}`);
      }
    };

    register();
  }, [user, token, deviceId]);

  return null;
}
