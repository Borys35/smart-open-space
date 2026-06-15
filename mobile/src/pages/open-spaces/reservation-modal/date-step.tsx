import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDeskAvailabilityWindows, useDesksAvailabilityWindows } from "@/hooks/use-open-spaces";
import {
  clampReservationDate,
  useReservationPreferencesStore,
} from "@/stores/reservation-preferences";
import { Button } from "@ssobkowski/rnui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@ssobkowski/rnui/icons";
import { ModalHeader, ModalStepView } from "@ssobkowski/rnui/modal";
import { Skeleton } from "@ssobkowski/rnui/skeleton";
import { Text } from "@ssobkowski/rnui/text";
import { useEffect, useMemo, useState } from "react";
import { View, type ColorValue } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return nextDate;
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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

const MONTH_DTF = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarDayButtonProps {
  date: Date;
  isPast: boolean;
  isSelected: boolean;
  onPress: (date: Date) => void;
}

function CalendarDayButton({ date, isPast, isSelected, onPress }: CalendarDayButtonProps) {
  const selectionProgress = useSharedValue(isSelected ? 1 : 0);
  const textColor = useSharedValue<ColorValue>(
    isPast ? "#A7AAB0" : isSelected ? "#FFFFFF" : "#111827",
  );

  useEffect(() => {
    selectionProgress.set(withTiming(isSelected ? 1 : 0, { duration: 180 }));
    textColor.set(
      withTiming(isPast ? "#A7AAB0" : isSelected ? "#FFFFFF" : "#111827", { duration: 180 }),
    );
  }, [isPast, isSelected, selectionProgress, textColor]);

  const dayCircleStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        selectionProgress.get(),
        [0, 1],
        ["rgba(17, 24, 39, 0)", "#111827"],
      ),
      transform: [{ scale: 0.92 + selectionProgress.get() * 0.08 }],
    };
  });

  return (
    <Button
      disabled={isPast}
      style={[styles.dayCell, styles.dayButton]}
      onPress={() => onPress(date)}
    >
      <Animated.View style={[styles.dayCircle, dayCircleStyle]}>
        <Text
          willAnimate
          color={textColor}
          size="lg"
          weight={isSelected ? "medium" : "regular"}
          style={styles.dayNumber}
        >
          {date.getDate()}
        </Text>
      </Animated.View>
    </Button>
  );
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
  const [visibleMonth, setVisibleMonth] = useState(() => getStartOfMonth(selectedDate));
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
  const today = useMemo(() => getStartOfDay(new Date()), []);
  const isCurrentMonthVisible = getStartOfMonth(visibleMonth) <= getStartOfMonth(today);
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = getStartOfMonth(visibleMonth);
    const leadingEmptyDays = firstDayOfMonth.getDay();
    const daysInMonth = getDaysInMonth(visibleMonth);

    return Array.from({ length: leadingEmptyDays + daysInMonth }, (_, index) => {
      const day = index - leadingEmptyDays + 1;

      if (day < 1) {
        return null;
      }

      return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    });
  }, [visibleMonth]);

  const handleMonthChange = (months: number) => {
    setVisibleMonth((month) => {
      const nextMonth = addMonths(month, months);

      if (getStartOfMonth(nextMonth) < getStartOfMonth(today)) {
        return month;
      }

      return nextMonth;
    });
  };

  const handleDateSelect = (date: Date) => {
    if (getStartOfDay(date) < today) return;

    setSelectedDate(date);
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
          disabled={isCurrentMonthVisible}
          style={[styles.stepperButton, isCurrentMonthVisible && styles.disabledStepperButton]}
          onPress={() => handleMonthChange(-1)}
        >
          <ChevronLeftIcon
            width={24}
            height={24}
            strokeWidth={2}
            color={isCurrentMonthVisible ? "#A7AAB0" : "black"}
          />
        </Button>

        <View style={styles.dateLabel}>
          <Text
            willAnimate
            key={`month-${visibleMonth.toISOString()}`}
            entering={FadeIn}
            exiting={FadeOut}
            size="lg"
            weight="medium"
          >
            {MONTH_DTF.format(visibleMonth)}
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

        <Button style={styles.stepperButton} onPress={() => handleMonthChange(1)}>
          <ChevronRightIcon width={24} height={24} strokeWidth={2} color="black" />
        </Button>
      </View>

      <View style={styles.calendar}>
        {WEEKDAYS.map((weekday) => (
          <View key={weekday} style={styles.weekdayCell}>
            <Text size="xs" tone="text.secondary" weight="medium">
              {weekday}
            </Text>
          </View>
        ))}

        {calendarDays.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const apiDate = formatApiDate(date);
          const isSelected = apiDate === formatApiDate(selectedDate);
          const isPast = getStartOfDay(date) < today;

          return (
            <CalendarDayButton
              key={apiDate}
              date={date}
              isPast={isPast}
              isSelected={isSelected}
              onPress={handleDateSelect}
            />
          );
        })}
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
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  weekdayCell: {
    width: "14.2857%",
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButton: {
    backgroundColor: "transparent",
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  availabilityState: {
    minHeight: 34,
    justifyContent: "center",
  },
});
