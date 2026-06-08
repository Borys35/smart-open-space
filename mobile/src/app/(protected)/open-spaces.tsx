import { useAuth } from "@/hooks/use-auth";
import { useOpenSpaces } from "@/hooks/use-open-spaces";
import { OpenSpaceCard, OpenSpaceCardSkeleton } from "@/pages/open-spaces/card";
import { Button } from "@ssobkowski/rnui/button";
import { Text } from "@ssobkowski/rnui/text";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

export default function OpenSpaces() {
  const { user } = useAuth();
  const openSpaces = useOpenSpaces(user?.id ?? null);

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text header size="3xl" weight="medium" style={styles.title}>
          Open Spaces
        </Text>

        {openSpaces.isPending ? (
          <View style={styles.list}>
            <OpenSpaceCardSkeleton />
            <OpenSpaceCardSkeleton />
          </View>
        ) : openSpaces.isError ? (
          <View style={styles.state}>
            <Text size="lg" weight="medium" style={styles.text}>
              We couldn't load your spaces right now
            </Text>
            <Text tone="text.secondary" style={styles.text}>
              Please try again in a moment.
            </Text>
            <Button
              variant="secondary"
              onPress={() => openSpaces.refetch()}
              style={{ marginTop: 8 }}
            >
              <Text size="lg" weight="medium" color="black">
                Try Again
              </Text>
            </Button>
          </View>
        ) : openSpaces.data.length === 0 ? (
          <View style={styles.state}>
            <Text size="lg" weight="medium" style={styles.text}>
              No spaces yet
            </Text>
            <Text tone="text.secondary" style={styles.text}>
              Accepted invitations will show up here once you are added to a workspace.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {openSpaces.data.map((openSpace) => (
              <OpenSpaceCard key={openSpace.id} openSpace={openSpace} />
            ))}
          </View>
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
    gap: 16,
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
