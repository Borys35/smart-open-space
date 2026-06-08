import { formatOrdinal } from "@/lib/fmt";
import { DEFAULT_OPEN_SPACE_IMAGE_URL } from "@/lib/open-space-images";
import { ReservationDetailsModal } from "@/pages/reservations/modal";
import { Button } from "@ssobkowski/rnui/button";
import { ClockIconStroke } from "@ssobkowski/rnui/icons";
import { Skeleton } from "@ssobkowski/rnui/skeleton";
import { Text } from "@ssobkowski/rnui/text";
import { Image } from "expo-image";
import { useRef } from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import type { ReservationResponse } from "@/hooks/use-open-spaces";
import type { ModalRef } from "@ssobkowski/rnui/modal";

const INTL_DTF_DAY = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const INTL_DTF_TIME = new Intl.DateTimeFormat("pl", {
  hour: "numeric",
  minute: "numeric",
});

function formatReservationTime(startTime: string, endTime: string) {
  return `${INTL_DTF_DAY.format(new Date(startTime))} ${INTL_DTF_TIME.format(new Date(startTime))} - ${INTL_DTF_TIME.format(new Date(endTime))}`;
}

function formatOpenSpaceDetails(building: string | null, floor: number) {
  return building ? `${formatOrdinal(floor)} Floor ∙ ${building}` : `${formatOrdinal(floor)} Floor`;
}

export function ReservationCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardImage}>
        <Skeleton width={112} height={88} color="#E6E8EC" />
      </View>

      <View style={styles.cardContent}>
        <Skeleton width={180} height={24} color="#E6E8EC" style={{ borderRadius: 999 }} />
        <Skeleton width={220} height={18} color="#E6E8EC" style={{ borderRadius: 999 }} />
      </View>
    </View>
  );
}

export function ReservationCard({ reservation }: { reservation: ReservationResponse }) {
  const { theme } = useUnistyles();
  const modalRef = useRef<ModalRef>(null);
  const imageUrl = reservation.open_space.image_url ?? DEFAULT_OPEN_SPACE_IMAGE_URL;

  return (
    <>
      <Button
        style={styles.card}
        onPress={() => modalRef.current?.present()}
        config={{ scaleTo: 0.96 }}
      >
        <View style={styles.cardImage}>
          <Image source={imageUrl} style={styles.image} contentFit="cover" />
        </View>

        <View style={styles.cardContent}>
          <Text size="xl" weight="medium" numberOfLines={2}>
            {reservation.open_space.name}
          </Text>

          <Text tone="text.secondary" numberOfLines={1}>
            {formatOpenSpaceDetails(reservation.open_space.building, reservation.open_space.floor)}
          </Text>

          <View style={styles.timeRow}>
            <ClockIconStroke
              width={16}
              height={16}
              strokeWidth={2}
              color={theme.colors.text.secondary}
            />
            <Text tone="text.secondary" numberOfLines={2} style={styles.timeText}>
              {formatReservationTime(reservation.start_time, reservation.end_time)}
            </Text>
          </View>
        </View>
      </Button>
      <ReservationDetailsModal ref={modalRef} reservation={reservation} />
    </>
  );
}

const styles = StyleSheet.create(() => ({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardImage: {
    width: 92,
    height: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    backgroundColor: "#E6E8EC",
    overflow: "hidden",
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  cardContent: {
    flex: 1,
    gap: 4,
    paddingVertical: 2,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    flex: 1,
  },
}));
