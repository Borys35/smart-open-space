import { createMMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";

const mmkv = createMMKV();
const storage = {
  getItem: (name: string): string | null => {
    const value = mmkv.getString(name);
    return value ?? null;
  },
  removeItem: (name: string): void => {
    mmkv.remove(name);
  },
  setItem: (name: string, value: string): void => {
    mmkv.set(name, value);
  },
};

export const zustandStorage = storage as StateStorage;
