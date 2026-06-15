import { useCancelReservation, type ReservationResponse } from "@/hooks/use-open-spaces";
import { formatReservationTime } from "@/lib/fmt";
import { hasFiniteCoordinates, openMapsUrl } from "@/lib/maps";
import { Button } from "@ssobkowski/rnui/button";
import {
  ArrowUpRightIcon,
  CalendarIconFilled,
  ClockIconStroke,
  CoinIconStroke,
  MapPinStroke,
  TrashIconFilled,
  WarningIconFilled,
} from "@ssobkowski/rnui/icons";
import { Modal, ModalHeader, ModalStepView, useModal } from "@ssobkowski/rnui/modal";
import { Text, TextMorph } from "@ssobkowski/rnui/text";
import { getCalendars, EntityTypes, requestCalendarPermissions } from "expo-calendar";
import { useRouter } from "expo-router";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import type { ModalRef } from "@ssobkowski/rnui/modal";
import type { Ref } from "react";

const LAYOUT_TRANSITION = LinearTransition.springify().damping(120).mass(4).stiffness(900);

interface ReservationDetailsModalProps {
  ref?: Ref<ModalRef>;
  reservation: ReservationResponse | null;
}

export function ReservationDetailsModal({ ref, reservation }: ReservationDetailsModalProps) {
  const router = useRouter();
  const { theme } = useUnistyles();
  const m = useModal();
  const cancelReservation = useCancelReservation();

  const location =
    reservation !== null &&
    reservation.open_space.place_name !== null &&
    reservation.open_space.address !== null &&
    `${reservation!.open_space.place_name}, ${reservation!.open_space.address}`;
  const hasCoordinates = hasFiniteCoordinates(
    reservation?.open_space.latitude,
    reservation?.open_space.longitude,
  );

  const handleAddToCalendar = async () => {
    if (!reservation) return;

    const { status } = await requestCalendarPermissions();
    if (status !== "granted") {
      return;
    }

    try {
      const calendars = await getCalendars(EntityTypes.EVENT);
      const defaultCalendar = calendars.find((cal) => cal.isPrimary) || calendars[0];
      if (!defaultCalendar) {
        return;
      }

      await defaultCalendar.addEventWithForm({
        title: `${reservation.open_space.name} - ${reservation.desk_label}`,
        startDate: new Date(reservation.start_time),
        endDate: new Date(reservation.end_time),
        location: location || "",
      });
    } catch (error) {
      console.error("Failed to open calendar form:", error);
    }
  };

  const handleOpenSpaceLink = () => {
    if (!reservation) return;

    m.dismiss();
    router.push({
      pathname: "/spaces/[id]",
      params: { id: reservation.open_space.id },
    });
  };

  const handleOpenLocation = async () => {
    if (!reservation || !hasCoordinates) return;

    const { latitude, longitude } = reservation.open_space;
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    await openMapsUrl(
      latitude,
      longitude,
      location || reservation.open_space.name,
    );
  };

  const handleOpenCancelStep = () => {
    m.goToStep(1);
  };

  const handleCancel = async () => {
    if (!reservation || cancelReservation.isPending) return;

    try {
      await cancelReservation.mutateAsync(reservation.id);
      m.dismiss();
    } catch (error) {
      console.error("Failed to cancel reservation:", error);
    }
  };

  if (!reservation) return null;

  return (
    // @ts-ignore rnui modal ref typing
    <Modal id="reservation-details-modal" ref={ref}>
      <View style={styles.header}>
        <ModalHeader>
          <TextMorph header granularity="word" color="black" size="2xl" weight="medium">
            {m.currentStep === 0 ? "Reservation Details" : "Cancel Reservation"}
          </TextMorph>
        </ModalHeader>
      </View>

      <ModalStepView index={0} style={styles.loose}>
        <Button onPress={handleOpenSpaceLink} style={styles.spaceButton}>
          <Text size="xl" weight="medium" style={styles.spaceName}>
            {reservation.open_space.name}
          </Text>
          <ArrowUpRightIcon size={20} strokeWidth={2} />
        </Button>

        <View style={styles.details}>
          {location && (
            <Button
              disabled={!hasCoordinates}
              onPress={handleOpenLocation}
              style={[styles.detailRow, hasCoordinates && styles.locationRow]}
            >
              <MapPinStroke
                width={18}
                height={18}
                strokeWidth={2}
                color={theme.colors.text.secondary}
              />
              <Text tone="text.secondary" style={styles.detailText}>
                {location}
              </Text>
              {hasCoordinates && (
                <ArrowUpRightIcon
                  size={16}
                  strokeWidth={2}
                  color={theme.colors.text.secondary}
                />
              )}
            </Button>
          )}

          <View style={styles.detailRow}>
            <ClockIconStroke
              width={16}
              height={16}
              strokeWidth={2}
              color={theme.colors.text.secondary}
            />
            <Text tone="text.secondary">
              {formatReservationTime(reservation.start_time, reservation.end_time)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <CoinIconStroke
              width={16}
              height={16}
              strokeWidth={2}
              color={theme.colors.text.secondary}
            />
            <Text tone="text.secondary">{reservation.credit_cost} Credits</Text>
          </View>
        </View>

        <Button variant="secondary" style={styles.actionButton} onPress={handleAddToCalendar}>
          <CalendarIconFilled size={20} color="black" />
          <Text size="lg" weight="medium" color="black">
            Add to Calendar
          </Text>
        </Button>
      </ModalStepView>

      <ModalStepView index={1} style={styles.loose}>
        <WarningIconFilled size={80} color="#FF9A02" style={styles.warningIcon} />

        <Text size="lg" tone="text.secondary" style={styles.cancelDetails}>
          This will cancel your{" "}
          <Text size="lg" color="black" weight="medium">
            {reservation.desk_label}
          </Text>{" "}
          booking and refund{" "}
          <Text size="lg" color="black" weight="medium">
            {reservation.credit_cost}
          </Text>{" "}
          credits.
        </Text>
      </ModalStepView>

      <Animated.View layout={LAYOUT_TRANSITION} style={styles.bottomButtons}>
        {m.currentStep === 1 && (
          <Button
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            variant="secondary"
            style={styles.actionButton}
            onPress={m.goBack}
          >
            <Text size="lg" weight="medium" color="black">
              Cancel
            </Text>
          </Button>
        )}

        <Button
          layout={LAYOUT_TRANSITION}
          variant="secondary"
          style={[styles.actionButton, styles.cancelButton]}
          onPress={m.currentStep === 0 ? handleOpenCancelStep : handleCancel}
        >
          <TrashIconFilled size={20} color="white" />
          <Text size="lg" weight="medium" color="white">
            {m.currentStep === 0 ? "Cancel Reservation" : "Confirm"}
          </Text>
        </Button>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    marginTop: 24,
    marginHorizontal: 24,
  },
  loose: {
    padding: 0,
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 14,
  },
  spaceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  spaceName: {
    textDecorationLine: "underline",
  },
  details: { gap: 4 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationRow: {
    minHeight: 32,
  },
  warningIcon: {
    alignSelf: "center",
  },
  detailText: {
    flexShrink: 1,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: theme.colors.button.destructive,
  },
  cancelDetails: {
    marginBottom: 12,
  },
  bottomButtons: {
    flexDirection: "row",
    marginBottom: 24,
    marginHorizontal: 24,
    gap: 8,
  },
}));
