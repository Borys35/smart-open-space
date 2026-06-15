import { BackButton } from "@/components/nav/back-button";
import {
  type DeskAvailability,
  type MobileOpenSpaceSummary,
  useCreateReservation,
  useDeskAvailability,
  useOpenSpaceCredits,
  useOpenSpaceDetails,
} from "@/hooks/use-open-spaces";
import { formatSchedule, getTodayScheduleWindow } from "@/lib/fmt";
import { hasFiniteCoordinates, openMapsUrl } from "@/lib/maps";
import { DEFAULT_OPEN_SPACE_IMAGE_URL } from "@/lib/open-space-images";
import { ReservationModal } from "@/pages/open-spaces/reservation-modal";
import { Button } from "@ssobkowski/rnui/button";
import {
  ArrowUpRightIcon,
  ClockIconStroke,
  CoinIconStroke,
  MapPinStroke,
} from "@ssobkowski/rnui/icons";
import { Skeleton } from "@ssobkowski/rnui/skeleton";
import { Text } from "@ssobkowski/rnui/text";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import type { ReservationTimeSelection } from "@/pages/open-spaces/reservation-modal/time-step";
import type { ModalRef } from "@ssobkowski/rnui/modal";

function parseOpenSpaceId(id: string | string[] | undefined) {
  const rawId = Array.isArray(id) ? id[0] : id;
  const numericId = Number(rawId);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

function getTodayAvailabilityWindow(openSpace?: MobileOpenSpaceSummary) {
  return getTodayScheduleWindow(openSpace?.opened_at, openSpace?.closed_at);
}

function getLocation(openSpace: MobileOpenSpaceSummary) {
  return [
    openSpace.place_name,
    openSpace.building ? `Building ${openSpace.building}` : null,
    `Floor ${openSpace.floor}`,
  ]
    .filter(Boolean)
    .join(" ∙ ");
}

function getMapLabel(openSpace: MobileOpenSpaceSummary) {
  return [openSpace.place_name, openSpace.address].filter(Boolean).join(", ") || openSpace.name;
}

function formatCreditsPerHour(creditsPerHour: number) {
  return `${creditsPerHour} ${creditsPerHour === 1 ? "credit" : "credits"} / hour`;
}

function getCreditCost(durationMinutes: number, creditsPerHour: number) {
  return Math.ceil((durationMinutes / 60) * creditsPerHour);
}

function DeskCardSkeleton() {
  return (
    <View style={styles.deskRow}>
      <Skeleton width={52} height={26} color="#E6E8EC" style={{ borderRadius: 999 }} />
      <Skeleton width={96} height={18} color="#E6E8EC" style={{ borderRadius: 999 }} />
      <Skeleton width={68} height={16} color="#E6E8EC" style={{ borderRadius: 999 }} />
    </View>
  );
}

interface DeskCardProps {
  desk: DeskAvailability;
  onPress: () => void;
}

function DeskCard({ desk, onPress }: DeskCardProps) {
  const label = desk.data ?? `Desk #${desk.id}`;

  return (
    <Button style={styles.deskRow} onPress={onPress}>
      <Text color="white" weight="medium" numberOfLines={2}>
        {label}
      </Text>
    </Button>
  );
}

export default function OpenSpaceDetails() {
  const { theme } = useUnistyles();

  const modalRef = useRef<ModalRef>(null);
  const [selectedDesk, setSelectedDesk] = useState<DeskAvailability | null>(null);
  const createReservation = useCreateReservation();

  const params = useLocalSearchParams<{ id?: string | string[]; imageUrl?: string | string[] }>();
  const openSpaceId = parseOpenSpaceId(params.id);
  const routeImageUrl = Array.isArray(params.imageUrl) ? params.imageUrl[0] : params.imageUrl;
  const openSpace = useOpenSpaceDetails(openSpaceId);
  const credits = useOpenSpaceCredits(openSpaceId);
  const availabilityWindow = useMemo(
    () => getTodayAvailabilityWindow(openSpace.data),
    [openSpace.data],
  );
  const availability = useDeskAvailability(
    openSpaceId,
    availabilityWindow.startTime,
    availabilityWindow.endTime,
  );
  const heroImageUrl = openSpace.data?.image_url ?? routeImageUrl ?? DEFAULT_OPEN_SPACE_IMAGE_URL;
  const hasCoordinates = hasFiniteCoordinates(openSpace.data?.latitude, openSpace.data?.longitude);

  const handleOpenLocation = async () => {
    if (!openSpace.data || !hasCoordinates) return;

    const { latitude, longitude } = openSpace.data;
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    await openMapsUrl(latitude, longitude, getMapLabel(openSpace.data));
  };

  const handleReservationConfirm = async (selection: ReservationTimeSelection) => {
    const deskId = selection.deskId ?? selectedDesk?.id ?? null;

    if (deskId === null) {
      Alert.alert("No desk available", "Try a different time window.");
      return;
    }

    const creditCost = getCreditCost(
      selection.durationMinutes,
      openSpace.data?.credits_per_hour ?? 0,
    );
    const creditsBalance = credits.data?.credits_balance ?? null;

    if (creditsBalance !== null && creditCost > creditsBalance) {
      Alert.alert(
        "Not enough credits",
        `This reservation costs ${creditCost} credits, but you have ${creditsBalance} available.`,
      );
      return;
    }

    try {
      const result = await createReservation.mutateAsync({
        desk_id: deskId,
        start_time: selection.startTime,
        end_time: selection.endTime,
      });

      Alert.alert(
        "Reservation confirmed",
        selection.deskLabel ? `Desk: ${selection.deskLabel}` : "Your desk is reserved.",
      );
      modalRef.current?.dismiss();
      router.push({
        pathname: "/reservations",
        params: {
          reservationId: result.id,
        },
      });
    } catch (error) {
      Alert.alert(
        "Could not reserve desk",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  if (openSpaceId === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Text tone="text.secondary">Invalid open space id.</Text>
          <Button style={styles.secondaryButton} onPress={() => router.back()}>
            <Text weight="medium" color="#007AFF">
              Go Back
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!openSpace.data) return null;

  return (
    <>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Image source={heroImageUrl} style={styles.hero} contentFit="cover" />

          <View style={styles.content}>
            <View style={styles.header}>
              <Text size="2xl" weight="medium">
                {openSpace.data.name}
              </Text>
              <Text size="lg" tone="text.secondary">
                {getLocation(openSpace.data)}
              </Text>
            </View>

            <View style={styles.details}>
              {openSpace.data.opened_at && openSpace.data.closed_at && (
                <View style={styles.detailRow}>
                  <ClockIconStroke
                    width={18}
                    height={18}
                    strokeWidth={2}
                    color={theme.colors.text.secondary}
                  />
                  <Text tone="text.secondary">
                    {formatSchedule(openSpace.data.opened_at, openSpace.data.closed_at)}
                  </Text>
                </View>
              )}
              {openSpace.data.address && (
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
                    {openSpace.data.address}
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
                <CoinIconStroke
                  width={18}
                  height={18}
                  strokeWidth={2}
                  color={theme.colors.text.secondary}
                />
                <Text tone="text.secondary">
                  {formatCreditsPerHour(openSpace.data.credits_per_hour)}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text size="xl" weight="medium">
                Desks
              </Text>

              <View style={styles.deskList}>
                {availability.isPending ? (
                  <>
                    <DeskCardSkeleton />
                    <DeskCardSkeleton />
                    <DeskCardSkeleton />
                    <DeskCardSkeleton />
                  </>
                ) : availability.isError ? (
                  <Text color="#EC6A5B">{availability.error.message}</Text>
                ) : availability.data.length === 0 ? (
                  <Text tone="text.secondary">No desks found for this open space.</Text>
                ) : (
                  availability.data.map((desk) => (
                    <DeskCard
                      key={desk.id}
                      desk={desk}
                      onPress={() => {
                        setSelectedDesk(desk);
                        modalRef.current?.present();
                      }}
                    />
                  ))
                )}
              </View>
            </View>
          </View>
        </ScrollView>
        <BackButton style={styles.backButton} />
        <View style={styles.creditsPill}>
          <CoinIconStroke width={16} height={16} strokeWidth={2} color="black" />
          <Text color="black" weight="medium">
            {credits.data ? `${credits.data.credits_balance} credits` : "..."}
          </Text>
        </View>
        <View style={styles.finderFooter}>
          <Button
            variant="primary"
            disabled={!availability.data || availability.data.length === 0}
            style={styles.finderButton}
            onPress={() => {
              setSelectedDesk(null);
              modalRef.current?.present();
            }}
          >
            <Text color="white" size="lg" weight="medium">
              Find a desk for me
            </Text>
          </Button>
        </View>
      </View>
      <ReservationModal
        ref={modalRef}
        deskId={selectedDesk?.id ?? null}
        deskLabel={selectedDesk?.data}
        desks={selectedDesk === null ? availability.data : undefined}
        creditsPerHour={openSpace.data.credits_per_hour}
        creditsBalance={credits.data?.credits_balance ?? null}
        maxDailyHours={openSpace.data.max_daily_hours}
        isConfirming={createReservation.isPending}
        onConfirm={handleReservationConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "white",
  },
  hero: {
    height: 290,
    overflow: "hidden",
  },
  backButton: {
    position: "absolute",
    backgroundColor: "#EDEDEF",
    top: 64,
    left: 24,
  },
  creditsPill: {
    position: "absolute",
    top: 64,
    right: 24,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "white",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.16)",
  },
  content: {
    padding: 24,
    paddingBottom: 104,
    gap: 24,
  },
  header: {
    gap: 6,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationRow: {
    minHeight: 32,
  },
  detailText: {
    flexShrink: 1,
  },
  section: {
    gap: 12,
  },
  deskList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  deskRow: {
    width: "48%",
    minHeight: 118,
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "#00B2FF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statusPill: {
    flexShrink: 0,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  centerState: {
    minHeight: 220,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: "#E7F0FF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  finderFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
  },
  finderButton: {
    minHeight: 54,
    marginBottom: 12,
  },
});
