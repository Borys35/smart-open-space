import { useAuth } from "@/hooks/use-auth";
import { useInvites, useRespondToInvite } from "@/hooks/use-invites";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Invitation } from "@/hooks/use-invites";

function getSpaceLocation(invitation: Invitation) {
  const openSpace = invitation.open_space;

  if (!openSpace) {
    return null;
  }

  return [
    openSpace.place_name,
    openSpace.address,
    openSpace.building ? `Building ${openSpace.building}` : null,
    `Floor ${openSpace.floor}`,
  ]
    .filter(Boolean)
    .join(" • ");
}

export default function Home() {
  const { user, logout } = useAuth();
  const invitations = useInvites(user?.id ?? null);
  const acceptInvite = useRespondToInvite(user?.id ?? null, "accept");
  const rejectInvite = useRespondToInvite(user?.id ?? null, "reject");
  const isResponding = acceptInvite.isPending || rejectInvite.isPending;

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    const requestNotificationPerms = async () => {
      const settings = await Notifications.getPermissionsAsync();
      const granted =
        settings.granted ||
        settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!granted) {
        await Notifications.requestPermissionsAsync();
      }
    };

    requestNotificationPerms();
  }, []);

  if (!user) {
    return;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Text style={styles.title}>Home</Text>

        <View style={styles.card}>
          <Text style={styles.greeting} selectable>
            Authenticated as {user.username}
          </Text>
          <Text style={styles.email} selectable>
            {user.email}
          </Text>
          <Text style={styles.role} selectable>
            Role: {user.role}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending invitations</Text>
          {invitations.data ? <Text style={styles.counter}>{invitations.data.length}</Text> : null}
        </View>

        {invitations.isPending ? (
          <View style={styles.inviteState}>
            <ActivityIndicator color="#007AFF" />
            <Text style={styles.stateText}>Loading invitations...</Text>
          </View>
        ) : invitations.isError ? (
          <View style={styles.inviteState}>
            <Text style={styles.error} selectable>
              {invitations.error.message}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => invitations.refetch()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : invitations.data.length === 0 ? (
          <View style={styles.inviteState}>
            <Text style={styles.stateText}>You do not have any pending invitations.</Text>
          </View>
        ) : (
          invitations.data.map((invitation) => {
            const openSpace = invitation.open_space;
            const spaceTitle = openSpace?.name ?? `Open space #${invitation.space_id}`;
            const spaceLocation = getSpaceLocation(invitation);
            const isAccepting = acceptInvite.isPending && acceptInvite.variables === invitation.id;
            const isRejecting = rejectInvite.isPending && rejectInvite.variables === invitation.id;
            const actionError =
              acceptInvite.error && acceptInvite.variables === invitation.id
                ? acceptInvite.error
                : rejectInvite.error && rejectInvite.variables === invitation.id
                  ? rejectInvite.error
                  : null;

            return (
              <View key={invitation.id} style={styles.inviteCard}>
                <Text style={styles.inviteTitle} selectable>
                  {spaceTitle}
                </Text>
                {spaceLocation ? (
                  <Text style={styles.inviteLocation} selectable>
                    {spaceLocation}
                  </Text>
                ) : null}
                <View style={styles.inviteMeta}>
                  <Text style={styles.inviteDetail} selectable>
                    Invite #{invitation.id}
                  </Text>
                  <Text style={styles.inviteDetail} selectable>
                    {invitation.invited_email}
                  </Text>
                </View>

                {actionError ? (
                  <Text style={styles.actionError} selectable>
                    {actionError.message}
                  </Text>
                ) : null}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => rejectInvite.mutate(invitation.id)}
                    disabled={isResponding}
                  >
                    {isRejecting ? (
                      <ActivityIndicator color="#3A3A3C" />
                    ) : (
                      <Text style={styles.rejectButtonText}>Decline</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => acceptInvite.mutate(invitation.id)}
                    disabled={isResponding}
                  >
                    {isAccepting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    gap: 6,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
  },
  email: {
    fontSize: 16,
    color: "#666",
  },
  role: {
    fontSize: 14,
    color: "#999",
    textTransform: "capitalize",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  counter: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E7F0FF",
    color: "#007AFF",
    textAlign: "center",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  inviteState: {
    minHeight: 88,
    borderRadius: 12,
    padding: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  error: {
    color: "#FF3B30",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#E7F0FF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  inviteCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  inviteTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  inviteLocation: {
    fontSize: 14,
    color: "#3A3A3C",
    lineHeight: 20,
  },
  inviteMeta: {
    gap: 3,
  },
  inviteDetail: {
    fontSize: 13,
    color: "#666",
  },
  actionError: {
    fontSize: 14,
    color: "#FF3B30",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    backgroundColor: "#F2F2F7",
  },
  rejectButtonText: {
    color: "#3A3A3C",
    fontSize: 15,
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: "#007AFF",
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#FF3B30",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
