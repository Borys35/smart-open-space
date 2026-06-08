import { useActiveReservations } from "@/hooks/use-open-spaces";
import { ReservationCard, ReservationCardSkeleton } from "@/pages/reservations/card";
import { Button } from "@ssobkowski/rnui/button";
import { Text } from "@ssobkowski/rnui/text";
import { ScrollView, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

export default function Reservations() {
  const reservations = useActiveReservations();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text header size="3xl" weight="medium" style={styles.title}>
          Reservations
        </Text>

        {reservations.isPending ? (
          <View style={styles.list}>
            <ReservationCardSkeleton />
            <ReservationCardSkeleton />
            <ReservationCardSkeleton />
          </View>
        ) : reservations.isError ? (
          <View style={styles.state}>
            <Text size="lg" weight="medium" style={styles.text}>
              We couldn't load your reservations right now
            </Text>
            <Text tone="text.secondary" style={styles.text}>
              Please try again in a moment.
            </Text>
            <Button
              variant="secondary"
              onPress={() => reservations.refetch()}
              style={{ marginTop: 8 }}
            >
              <Text size="lg" weight="medium" color="black">
                Try Again
              </Text>
            </Button>
          </View>
        ) : reservations.data.length === 0 ? (
          <View style={styles.state}>
            <Text size="lg" weight="medium" style={styles.text}>
              No reservations yet
            </Text>
            <Text tone="text.secondary" style={styles.text}>
              Your booked desks will show up here.
            </Text>
          </View>
        ) : (
          <Animated.View layout={LinearTransition} style={styles.list}>
            {reservations.data.map((reservation) => (
              <ReservationCard key={`res-${reservation.id}`} reservation={reservation} />
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create(() => ({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "white",
  },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  title: {
    marginVertical: 28,
  },
  list: {
    gap: 14,
  },
  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 16,
  },
  text: {
    textAlign: "center",
  },
}));
