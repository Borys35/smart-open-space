import { useDeskAvailability } from "@/hooks/use-open-spaces";
import { formatOrdinal, formatSchedule } from "@/lib/fmt";
import { DEFAULT_OPEN_SPACE_IMAGE_URL } from "@/lib/open-space-images";
import { Button } from "@ssobkowski/rnui/button";
import { ClockIconStroke, MapPinStroke } from "@ssobkowski/rnui/icons";
import { Skeleton } from "@ssobkowski/rnui/skeleton";
import { Text } from "@ssobkowski/rnui/text";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import type { MobileOpenSpaceSummary } from "@/hooks/use-open-spaces";

const BADGE_COLORS = {
  green: {
    background: "#E1FAE8",
    text: "#37C25C",
  },
  yellow: {
    background: "#FCF4DB",
    text: "#E6961F",
  },
  red: {
    background: "#FDEFEE",
    text: "#EC6A5B",
  },
} as const;

function parseTimeParts(time: string | null | undefined, fallbackHour: number, fallbackMinute = 0) {
  const [hour, minute] = (time ?? "").split(":").map(Number);

  return {
    hour: Number.isFinite(hour) ? hour : fallbackHour,
    minute: Number.isFinite(minute) ? minute : fallbackMinute,
  };
}

function getTodayAvailabilityWindow(openSpace: MobileOpenSpaceSummary) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  const opens = parseTimeParts(openSpace.opened_at, 9);
  const closes = parseTimeParts(openSpace.closed_at, 17);

  start.setHours(opens.hour, opens.minute, 0, 0);
  end.setHours(closes.hour, closes.minute, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

function isOpenNow(openSpace: MobileOpenSpaceSummary) {
  const now = new Date();
  const opens = parseTimeParts(openSpace.opened_at, 9);
  const closes = parseTimeParts(openSpace.closed_at, 17);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = opens.hour * 60 + opens.minute;
  const closeMinutes = closes.hour * 60 + closes.minute;

  if (openMinutes === closeMinutes) {
    return true;
  }

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function getDeskAvailabilityBadge(availableDesks: number, totalDesks: number, hasError: boolean) {
  if (hasError || totalDesks === 0 || availableDesks === 0) {
    return {
      label: totalDesks === 0 && !hasError ? "No desks" : "No desks available",
      colors: BADGE_COLORS.red,
    };
  }

  if (availableDesks < totalDesks * 0.5) {
    return {
      label: `${availableDesks}/${totalDesks} desks available`,
      colors: BADGE_COLORS.yellow,
    };
  }

  return {
    label: `${availableDesks}/${totalDesks} desks available`,
    colors: BADGE_COLORS.green,
  };
}

export function OpenSpaceCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={[styles.cardImage, { overflow: "hidden", borderRadius: 24 }]}>
        <Skeleton width={500} height={300} color="#E6E8EC" />
      </View>

      <View style={styles.cardContent}>
        <Skeleton width={250} height={28} color="#E6E8EC" style={{ borderRadius: 999 }} />

        <View style={styles.badges}>
          <Skeleton width={70} height={30} color="#E6E8EC" style={{ borderRadius: 999 }} />
          <Skeleton width={148} height={30} color="#E6E8EC" style={{ borderRadius: 999 }} />
        </View>

        <Skeleton width={160} height={20} color="#E6E8EC" style={{ borderRadius: 999 }} />

        <View style={styles.rows}>
          <Skeleton width={18} height={18} color="#E6E8EC" style={{ borderRadius: 999 }} />
          <Skeleton width={220} height={20} color="#E6E8EC" style={{ borderRadius: 999 }} />
        </View>
      </View>
    </View>
  );
}

export function OpenSpaceCard({ openSpace }: { openSpace: MobileOpenSpaceSummary }) {
  const { theme } = useUnistyles();
  const router = useRouter();
  const availabilityWindow = useMemo(() => getTodayAvailabilityWindow(openSpace), [openSpace]);
  const availability = useDeskAvailability(
    openSpace.id,
    availabilityWindow.startTime,
    availabilityWindow.endTime,
  );

  const imageUrl = openSpace.image_url ?? DEFAULT_OPEN_SPACE_IMAGE_URL;
  const hasDetails = openSpace.building !== null;
  const hasAddress = openSpace.address !== null && openSpace.place_name !== null;

  const openNow = isOpenNow(openSpace);
  const openBadgeColors = openNow ? BADGE_COLORS.green : BADGE_COLORS.red;

  const desks = availability.data ?? [];
  const availableDesks = desks.filter((desk) => desk.available).length;
  const deskBadge = getDeskAvailabilityBadge(availableDesks, desks.length, availability.isError);

  const handlePress = async () => {
    try {
      await Image.prefetch(imageUrl, "memory-disk");
    } catch {
      // Navigation should still work if the cache warm-up fails.
    }

    router.push({
      pathname: "/spaces/[id]",
      params: { id: openSpace.id.toString(), imageUrl },
    });
  };

  return (
    <Button onPress={handlePress} config={{ scaleTo: 0.96 }} style={styles.card}>
      <View style={styles.cardImage}>
        <Image source={imageUrl} style={styles.image} contentFit="cover" />

        {openSpace.opened_at !== null && openSpace.closed_at !== null && (
          <View style={styles.schedulePill}>
            <ClockIconStroke width={16} height={16} strokeWidth={2} color="black" />
            <Text color="black">{formatSchedule(openSpace.opened_at, openSpace.closed_at)}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.rows}>
          <Text size="2xl" weight="medium">
            {openSpace.name}
          </Text>
        </View>

        <View style={styles.badges}>
          <View style={[styles.statusBadge, { backgroundColor: openBadgeColors.background }]}>
            <Text size="sm" weight="medium" color={openBadgeColors.text}>
              {openNow ? "Open" : "Closed"}
            </Text>
          </View>

          {availability.isPending ? (
            <Skeleton height={30} width={148} color="#E6E8EC" style={styles.statusBadge} />
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: deskBadge.colors.background }]}>
              <Text size="sm" weight="medium" color={deskBadge.colors.text}>
                {deskBadge.label}
              </Text>
            </View>
          )}
        </View>

        {hasDetails && (
          <Text size="lg" tone="text.secondary">
            {formatOrdinal(openSpace.floor)} Floor ∙ {openSpace.building}
          </Text>
        )}

        {hasAddress && (
          <View style={styles.rows}>
            <MapPinStroke
              width={16}
              height={16}
              strokeWidth={2}
              color={theme.colors.text.secondary}
            />
            <Text numberOfLines={2} tone="text.secondary">
              {openSpace.address}
            </Text>
          </View>
        )}
      </View>
    </Button>
  );
}

const styles = StyleSheet.create(() => ({
  card: {
    backgroundColor: "#fafafc",
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#f6f6f6",
  },
  cardImage: {
    position: "relative",
    height: 264,
  },
  schedulePill: {
    position: "absolute",
    top: 14,
    right: 14,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "white",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.16)",
  },
  image: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cardContent: {
    margin: 12,
    gap: 8,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rows: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    gap: 4,
  },
}));
