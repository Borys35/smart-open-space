import {
  type DeskAvailability,
  type MobileOpenSpaceSummary,
  useDeskAvailability,
  useOpenSpaceDetails,
} from "@/hooks/use-open-spaces";
import { DEFAULT_OPEN_SPACE_IMAGE_URL } from "@/lib/open-space-images";
import { OPEN_SPACE_HERO_GROUP } from "@/lib/transition-ids";
import { SharedExpoImage } from "@ssobkowski/stack/expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function parseOpenSpaceId(id: string | string[] | undefined) {
  const rawId = Array.isArray(id) ? id[0] : id;
  const numericId = Number(rawId);

  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

function getTodayAvailabilityWindow(openSpace?: MobileOpenSpaceSummary) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  const [startHour, startMinute] = (openSpace?.opened_at ?? "09:00").split(":").map(Number);
  const [endHour, endMinute] = (openSpace?.closed_at ?? "17:00").split(":").map(Number);

  start.setHours(
    Number.isFinite(startHour) ? startHour : 9,
    Number.isFinite(startMinute) ? startMinute : 0,
    0,
    0,
  );
  end.setHours(
    Number.isFinite(endHour) ? endHour : 17,
    Number.isFinite(endMinute) ? endMinute : 0,
    0,
    0,
  );

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return {
    label: `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" },
    )}`,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

function getLocation(openSpace: MobileOpenSpaceSummary) {
  return [
    openSpace.place_name,
    openSpace.address,
    openSpace.building ? `Building ${openSpace.building}` : null,
    `Floor ${openSpace.floor}`,
  ]
    .filter(Boolean)
    .join(" • ");
}

function MetadataRow({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === "") {
    return null;
  }

  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function AvailabilitySummary({ desks }: { desks: DeskAvailability[] }) {
  const availableCount = desks.filter((desk) => desk.available).length;

  return (
    <View style={styles.summaryGrid}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{desks.length}</Text>
        <Text style={styles.summaryLabel}>Desks</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryValue, styles.availableText]}>{availableCount}</Text>
        <Text style={styles.summaryLabel}>Available</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{desks.length - availableCount}</Text>
        <Text style={styles.summaryLabel}>Unavailable</Text>
      </View>
    </View>
  );
}

export default function OpenSpaceDetails() {
  const params = useLocalSearchParams<{ id?: string | string[]; imageUrl?: string | string[] }>();
  const openSpaceId = parseOpenSpaceId(params.id);
  const routeImageUrl = Array.isArray(params.imageUrl) ? params.imageUrl[0] : params.imageUrl;
  const openSpace = useOpenSpaceDetails(openSpaceId);
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

  if (openSpaceId === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <Text style={styles.error}>Invalid open space id.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <SharedExpoImage
          group={OPEN_SPACE_HERO_GROUP}
          id={String(openSpaceId)}
          source={heroImageUrl}
          style={styles.hero}
        />

        {openSpace.isPending ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#007AFF" />
            <Text style={styles.stateText}>Loading open space...</Text>
          </View>
        ) : openSpace.isError ? (
          <View style={styles.centerState}>
            <Text style={styles.error}>{openSpace.error.message}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => openSpace.refetch()}>
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Open space #{openSpace.data.id}</Text>
              <Text style={styles.title}>{openSpace.data.name}</Text>
              <Text style={styles.location}>{getLocation(openSpace.data)}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Metadata</Text>
              <MetadataRow label="Place" value={openSpace.data.place_name} />
              <MetadataRow label="Address" value={openSpace.data.address} />
              <MetadataRow label="Building" value={openSpace.data.building} />
              <MetadataRow label="Floor" value={openSpace.data.floor} />
              <MetadataRow label="Latitude" value={openSpace.data.latitude} />
              <MetadataRow label="Longitude" value={openSpace.data.longitude} />
              <MetadataRow label="Image URL" value={openSpace.data.image_url} />
              <MetadataRow label="Opens" value={openSpace.data.opened_at} />
              <MetadataRow label="Closes" value={openSpace.data.closed_at} />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Desk Availability</Text>
                  <Text style={styles.sectionSubtitle}>Today, {availabilityWindow.label}</Text>
                </View>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => availability.refetch()}
                >
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {availability.isPending ? (
                <View style={styles.inlineState}>
                  <ActivityIndicator color="#007AFF" />
                  <Text style={styles.stateText}>Loading availability...</Text>
                </View>
              ) : availability.isError ? (
                <View style={styles.inlineState}>
                  <Text style={styles.error}>{availability.error.message}</Text>
                </View>
              ) : availability.data.length === 0 ? (
                <Text style={styles.stateText}>No desks found for this open space.</Text>
              ) : (
                <>
                  <AvailabilitySummary desks={availability.data} />
                  <View style={styles.deskList}>
                    {availability.data.map((desk) => (
                      <View key={desk.id} style={styles.deskRow}>
                        <View>
                          <Text style={styles.deskTitle}>{desk.data ?? `Desk #${desk.id}`}</Text>
                          <Text style={styles.deskMeta}>
                            x {desk.x}, y {desk.y}, {desk.width} x {desk.height}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.statusPill,
                            desk.available ? styles.availablePill : styles.unavailablePill,
                          ]}
                        >
                          {desk.available ? "Available" : "Unavailable"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 24,
    gap: 16,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "600",
  },
  hero: {
    height: 264,
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#E5E5EA",
  },
  heroImage: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    color: "#111",
    fontSize: 30,
    fontWeight: "700",
  },
  location: {
    color: "#3A3A3C",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: "#111",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  metaLabel: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metaValue: {
    color: "#111",
    fontSize: 15,
    lineHeight: 21,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    minHeight: 70,
    borderRadius: 10,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  summaryValue: {
    color: "#111",
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  availableText: {
    color: "#248A3D",
  },
  summaryLabel: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  deskList: {
    gap: 10,
  },
  deskRow: {
    minHeight: 64,
    borderRadius: 10,
    backgroundColor: "#F8F8FA",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  deskTitle: {
    color: "#111",
    fontSize: 15,
    fontWeight: "600",
  },
  deskMeta: {
    color: "#666",
    fontSize: 12,
    marginTop: 3,
  },
  statusPill: {
    flexShrink: 0,
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 5,
    paddingHorizontal: 9,
    fontSize: 12,
    fontWeight: "700",
  },
  availablePill: {
    backgroundColor: "#E4F7E9",
    color: "#248A3D",
  },
  unavailablePill: {
    backgroundColor: "#FEECEC",
    color: "#C92A2A",
  },
  centerState: {
    minHeight: 220,
    borderRadius: 12,
    padding: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  inlineState: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    color: "#666",
    fontSize: 15,
    textAlign: "center",
  },
  error: {
    color: "#FF3B30",
    fontSize: 15,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#E7F0FF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  refreshButton: {
    flexShrink: 0,
    backgroundColor: "#E7F0FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
