import { zustandStorage } from "@/lib/storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface ReservationPreferencesState {
  selectedDate: string | null;
  startMinuteOfDay: number | null;
  endMinuteOfDay: number | null;
  setSelectedDate: (date: string) => void;
  setSelectedTimeWindow: (startMinuteOfDay: number, endMinuteOfDay: number) => void;
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayApiDate() {
  return formatApiDate(new Date());
}

export function clampReservationDate(date: string | null) {
  const today = getTodayApiDate();

  if (date === null || date < today) return today;

  return date;
}

export const useReservationPreferencesStore = create<ReservationPreferencesState>()(
  persist(
    immer((set) => ({
      selectedDate: null,
      startMinuteOfDay: null,
      endMinuteOfDay: null,
      setSelectedDate: (date) =>
        set((state) => {
          state.selectedDate = clampReservationDate(date);
        }),
      setSelectedTimeWindow: (startMinuteOfDay, endMinuteOfDay) =>
        set((state) => {
          state.startMinuteOfDay = startMinuteOfDay;
          state.endMinuteOfDay = endMinuteOfDay;
        }),
    })),
    {
      name: "reservation-preferences-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
