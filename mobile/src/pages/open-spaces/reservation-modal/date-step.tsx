import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDeskAvailabilityWindows, useDesksAvailabilityWindows } from "@/hooks/use-open-spaces";
import {
  clampReservationDate,
  useReservationPreferencesStore,
} from "@/stores/reservation-preferences";
import { Button } from "@ssobkowski/rnui/button";
import { ModalHeader, ModalStepView } from "@ssobkowski/rnui/modal";
import { Skeleton } from "@ssobkowski/rnui/skeleton";
import { Text } from "@ssobkowski/rnui/text";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import type {
  DeskAvailability,
  DeskAvailabilityWindow,
  DeskAvailabilityWindowsResult,
} from "@/hooks/use-open-spaces";

interface ReservationDateStepProps {
  deskId: number | null;
  deskLabel?: string | null;
  desks?: Pick<DeskAvailability, "id" | "data">[];
  onNext: (selection: ReservationDateSelection) => void;
}

export interface ReservationDateSelection {
  date: string;
  windows: DeskAvailabilityWindow[];
  deskWindows: DeskAvailabilityWindowsResult[];
}

function getStartOfDay(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseApiDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const INTL_DTF = new Intl.DateTimeFormat("en", {
  weekday: "long",
});

function formatDisplayDate(date: Date) {
  return INTL_DTF.format(date);
}

export function ReservationDateStep({
  deskId,
  deskLabel,
  desks = [],
  onNext,
}: ReservationDateStepProps) {
  const storedDate = useReservationPreferencesStore((state) => state.selectedDate);
  const setStoredDate = useReservationPreferencesStore((state) => state.setSelectedDate);
  const [selectedDate, setSelectedDate] = useState(() =>
    parseApiDate(clampReservationDate(storedDate)),
  );
  const debouncedDate = useDebouncedValue(selectedDate, 350);
  const selectedApiDate = useMemo(() => formatApiDate(debouncedDate), [debouncedDate]);
  const isAutoFinder = deskId === null && desks.length > 0;
  const availability = useDeskAvailabilityWindows(deskId, selectedApiDate, 10);
  const desksAvailability = useDesksAvailabilityWindows(
    isAutoFinder ? desks : [],
    selectedApiDate,
    10,
  );
  const deskWindows = useMemo<DeskAvailabilityWindowsResult[]>(() => {
    if (isAutoFinder) {
      return desksAvailability.reduce<DeskAvailabilityWindowsResult[]>((results, query) => {
        if (query.data) results.push(query.data);

        return results;
      }, []);
    }

    return availability.data ? [{ ...availability.data, deskLabel: deskLabel ?? null }] : [];
  }, [availability.data, deskLabel, desksAvailability, isAutoFinder]);
  const windows = useMemo(() => {
    const seenWindows = new Set<string>();

    return deskWindows.flatMap((result) =>
      result.windows.filter((window) => {
        const key = `${window.start_time}-${window.end_time}`;

        if (seenWindows.has(key)) return false;

        seenWindows.add(key);
        return true;
      }),
    );
  }, [deskWindows]);
  const hasAvailableWindow = windows.length > 0;
  const isPending = isAutoFinder
    ? desksAvailability.some((query) => query.isPending)
    : availability.isPending;
  const error = isAutoFinder
    ? desksAvailability.find((query) => query.isError)?.error
    : availability.error;
  const isTodayOrEarlier = getStartOfDay(selectedDate) <= getStartOfDay(new Date());

  const handleDateChange = (days: number) => {
    setSelectedDate((date) => {
      const nextDate = addDays(date, days);

      if (getStartOfDay(nextDate) < getStartOfDay(new Date())) {
        return date;
      }

      return nextDate;
    });
  };

  useEffect(() => {
    setStoredDate(formatApiDate(selectedDate));
  }, [selectedDate, setStoredDate]);

  return (
    <ModalStepView index={0} style={styles.modal}>
      <ModalHeader>
        {deskLabel ? `Reserve ${deskLabel}` : isAutoFinder ? "Find a desk" : "Reserve desk"}
      </ModalHeader>

      <View style={styles.dateStepper}>
        <Button
          disabled={isTodayOrEarlier}
          style={[styles.stepperButton, isTodayOrEarlier && styles.disabledStepperButton]}
          onPress={() => handleDateChange(-1)}
        >
          <Text color={isTodayOrEarlier ? "#A7AAB0" : "black"} size="2xl" weight="medium">
            {"<"}
          </Text>
        </Button>

        <View style={styles.dateLabel}>
          <Text
            willAnimate
            key={`disp-${selectedDate.toISOString()}`}
            entering={FadeIn}
            exiting={FadeOut}
            size="lg"
            weight="medium"
          >
            {formatDisplayDate(selectedDate)}
          </Text>
          <Text
            willAnimate
            key={`api-${selectedDate.toISOString()}`}
            entering={FadeIn}
            exiting={FadeOut}
            size="sm"
            tone="text.secondary"
          >
            {formatApiDate(selectedDate)}
          </Text>
        </View>

        <Button style={styles.stepperButton} onPress={() => handleDateChange(1)}>
          <Text size="2xl" weight="medium">
            {">"}
          </Text>
        </Button>
      </View>

      <View style={styles.availabilityState}>
        {deskId === null && !isAutoFinder ? (
          <Text tone="text.secondary">Select a desk to check availability.</Text>
        ) : isPending ? (
          <Skeleton width={220} height={22} color="#E6E8EC" style={{ borderRadius: 999 }} />
        ) : error ? (
          <Text color="#EC6A5B">{error.message}</Text>
        ) : hasAvailableWindow ? (
          <Text color="#37C25C" weight="medium">
            {isAutoFinder
              ? `${deskWindows.filter((result) => result.windows.length > 0).length} desks have available windows.`
              : "Available windows found for this date."}
          </Text>
        ) : (
          <Text color="#EC6A5B" weight="medium">
            No available windows for this date.
          </Text>
        )}
      </View>

      <Button
        variant="primary"
        disabled={!hasAvailableWindow}
        onPress={() => onNext({ date: selectedApiDate, windows, deskWindows })}
      >
        <Text color="white" size="lg" weight="medium">
          Next
        </Text>
      </Button>
    </ModalStepView>
  );
}

const styles = StyleSheet.create({
  modal: {
    gap: 12,
  },
  dateStepper: {
    minHeight: 72,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  stepperButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#F2F3F5",
  },
  disabledStepperButton: {
    backgroundColor: "#F7F7F8",
  },
  dateLabel: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  availabilityState: {
    minHeight: 34,
    justifyContent: "center",
  },
});
