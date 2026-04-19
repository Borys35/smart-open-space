import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { zustandStorage } from "@/lib/storage";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;

  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      token: null,
      user: null,
      setAuth: (token: string, user: User) =>
        set((state) => {
          state.token = token;
          state.user = user;
        }),
      logout: () =>
        set((state) => {
          state.token = null;
          state.user = null;
        }),
    })),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
