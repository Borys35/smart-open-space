import {
  Button,
  ClockIconStroke,
  MapPinStroke,
  Modal,
  ModalHeader,
  ModalView,
  Text,
} from "@ssobkowski/rnui";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import type { ReservationResponse } from "@/hooks/use-open-spaces";
import type { ModalRef } from "@ssobkowski/rnui";
import type { Ref } from "react";

const INTL_DTF_DAY = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const INTL_DTF_TIME = new Intl.DateTimeFormat("pl", {
  hour: "numeric",
  minute: "numeric",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return `${INTL_DTF_DAY.format(date)} ${INTL_DTF_TIME.format(date)}`;
}

function formatLocation(reservation: ReservationResponse) {
  return [reservation.open_space.place_name, reservation.open_space.address]
    .filter(Boolean)
    .join(", ");
}

interface ReservationDetailsModalProps {
  ref?: Ref<ModalRef>;
  reservation: ReservationResponse | null;
}

export function ReservationDetailsModal({ ref, reservation }: ReservationDetailsModalProps) {
  const { theme } = useUnistyles();

  if (!reservation) return null;

  return (
    // @ts-ignore rnui modal ref typing
    <Modal id="reservation-details-modal" ref={ref}>
      <ModalView>
        <ModalHeader text="Reservation details" />
        <View style={styles.section}>
          <Text size="xl" weight="medium">
            {reservation.open_space.name}
          </Text>

          <View style={styles.detailRow}>
            <MapPinStroke
              width={18}
              height={18}
              strokeWidth={2}
              color={theme.colors.text.secondary}
            />
            <Text tone="text.secondary" style={styles.detailText}>
              {formatLocation(reservation)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <ClockIconStroke
              width={16}
              height={16}
              strokeWidth={2}
              color={theme.colors.text.secondary}
            />
            <View style={styles.timeBlock}>
              <Text tone="text.secondary">Start: {formatDateTime(reservation.start_time)}</Text>
              <Text tone="text.secondary">End: {formatDateTime(reservation.end_time)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button variant="secondary" style={styles.actionButton} onPress={() => {}}>
            <Text size="lg" weight="medium" color="black">
              Navigate
            </Text>
          </Button>

          <Button variant="secondary" style={styles.actionButton} onPress={() => {}}>
            <Text size="lg" weight="medium" color="black">
              Add to Google Calendar
            </Text>
          </Button>

          <Button variant="secondary" style={styles.actionButton} onPress={() => {}}>
            <Text size="lg" weight="medium" color="black">
              Cancel reservation
            </Text>
          </Button>
        </View>
      </ModalView>
    </Modal>
  );
}

const styles = StyleSheet.create(() => ({
  section: {
    gap: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  detailText: {
    flex: 1,
  },
  timeBlock: {
    flex: 1,
    gap: 4,
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    minHeight: 52,
  },
}));
