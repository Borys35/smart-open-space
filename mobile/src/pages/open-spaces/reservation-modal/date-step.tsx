import { useDeskAvailabilityWindows } from "@/hooks/use-open-spaces";
import { Button, ModalHeader, ModalStepView, Skeleton, Text } from "@ssobkowski/rnui";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import type { DeskAvailabilityWindow } from "@/hooks/use-open-spaces";

interface ReservationDateStepProps {
  deskId: number | null;
  deskLabel?: string | null;
  onNext: (selection: ReservationDateSelection) => void;
}

export interface ReservationDateSelection {
  date: string;
  windows: DeskAvailabilityWindow[];
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

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const INTL_DTF = new Intl.DateTimeFormat("en", {
  weekday: "long",
});

function formatDisplayDate(date: Date) {
  return INTL_DTF.format(date);
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);

    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

export function ReservationDateStep({ deskId, deskLabel, onNext }: ReservationDateStepProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const debouncedDate = useDebouncedValue(selectedDate, 350);
  const selectedApiDate = useMemo(() => formatApiDate(debouncedDate), [debouncedDate]);
  const availability = useDeskAvailabilityWindows(deskId, selectedApiDate, 10);
  const windows = availability.data?.windows ?? [];
  const hasAvailableWindow = windows.length > 0;
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

  return (
    <ModalStepView index={0} style={styles.modal}>
      <ModalHeader text={deskLabel ? `Reserve ${deskLabel}` : "Reserve desk"} />

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
        {deskId === null ? (
          <Text tone="text.secondary">Select a desk to check availability.</Text>
        ) : availability.isPending ? (
          <Skeleton width={220} height={22} color="#E6E8EC" style={{ borderRadius: 999 }} />
        ) : availability.isError ? (
          <Text color="#EC6A5B">{availability.error.message}</Text>
        ) : hasAvailableWindow ? (
          <Text color="#37C25C" weight="medium">
            Available windows found for this date.
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
        onPress={() => onNext({ date: selectedApiDate, windows })}
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
