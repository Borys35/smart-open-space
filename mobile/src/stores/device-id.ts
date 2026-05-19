import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { zustandStorage } from "@/lib/storage";

interface DeviceIdStore {
  deviceIds: Record<number, string>;
  setDeviceId: (userId: number, deviceId: string) => void;
}

export const useDeviceIdStore = create<DeviceIdStore>()(
  persist(
    immer((set) => ({
      deviceIds: {},

      setDeviceId: (userId, deviceId) =>
        set((s) => {
          s.deviceIds[userId] = deviceId;
        }),
    })),
    {
      name: "device-id-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
