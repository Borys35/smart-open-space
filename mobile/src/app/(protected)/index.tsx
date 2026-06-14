import { useAuth } from "@/hooks/use-auth";
import { useLinkedCard, useUnlinkCard } from "@/hooks/use-cards";
import { useInvites, useRespondToInvite } from "@/hooks/use-invites";
import { useActiveReservations } from "@/hooks/use-open-spaces";
import { AccountModal } from "@/pages/home/account-modal";
import { CardButton } from "@/pages/home/card-button";
import { ReservationCard, ReservationCardSkeleton } from "@/pages/reservations/card";
import { Button } from "@ssobkowski/rnui/button";
import { DotGridVerticalIcon } from "@ssobkowski/rnui/icons";
import { Skeleton } from "@ssobkowski/rnui/skeleton";
import { Text } from "@ssobkowski/rnui/text";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import type { Invitation } from "@/hooks/use-invites";
import type { MobileOpenSpaceSummary } from "@/hooks/use-open-spaces";
import type { ModalRef } from "@ssobkowski/rnui/modal";

function getOpenSpaceLocation(openSpace: MobileOpenSpaceSummary | null) {
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
    .join(" ∙ ");
}

function InviteCard({
  invitation,
  isResponding,
  onAccept,
  onReject,
  acceptError,
  rejectError,
  acceptingId,
  rejectingId,
}: {
  invitation: Invitation;
  isResponding: boolean;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  acceptError: Error | null;
  rejectError: Error | null;
  acceptingId?: number;
  rejectingId?: number;
}) {
  const openSpace = invitation.open_space;
  const spaceTitle = openSpace?.name ?? `Open space #${invitation.space_id}`;
  const spaceLocation = getOpenSpaceLocation(openSpace);
  const isAccepting = acceptingId === invitation.id;
  const isRejecting = rejectingId === invitation.id;
  const actionError =
    acceptError && isAccepting ? acceptError : rejectError && isRejecting ? rejectError : null;

  return (
    <View style={styles.inviteCard}>
      <View style={styles.inviteCopy}>
        <Text size="xl" weight="medium" numberOfLines={2}>
          {spaceTitle}
        </Text>
        {spaceLocation ? (
          <Text tone="text.secondary" numberOfLines={2}>
            {spaceLocation}
          </Text>
        ) : null}
        <Text tone="text.secondary" size="sm" numberOfLines={1}>
          Invited as {invitation.invited_email}
        </Text>
      </View>

      {actionError ? (
        <Text color="#D92D20" size="sm">
          {actionError.message}
        </Text>
      ) : null}

      <View style={styles.inviteActions}>
        <Button
          variant="secondary"
          disabled={isResponding}
          style={styles.inviteButton}
          onPress={() => onReject(invitation.id)}
        >
          {isRejecting ? (
            <ActivityIndicator color="black" />
          ) : (
            <Text size="lg" weight="medium" color="black">
              Decline
            </Text>
          )}
        </Button>

        <Button
          variant="primary"
          disabled={isResponding}
          style={[styles.inviteButton, styles.acceptButton]}
          onPress={() => onAccept(invitation.id)}
        >
          {isAccepting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text size="lg" weight="medium" color="white">
              Accept
            </Text>
          )}
        </Button>
      </View>
    </View>
  );
}

export default function Home() {
  const { theme } = useUnistyles();
  const { user, logout } = useAuth();
  const invitations = useInvites(user?.id ?? null);
  const reservations = useActiveReservations();
  const linkedCard = useLinkedCard();
  const unlinkCard = useUnlinkCard();
  const acceptInvite = useRespondToInvite(user?.id ?? null, "accept");
  const rejectInvite = useRespondToInvite(user?.id ?? null, "reject");
  const accountModalRef = useRef<ModalRef>(null);
  const isResponding = acceptInvite.isPending || rejectInvite.isPending;
  const nextReservation = useMemo(() => reservations.data[0] ?? null, [reservations.data]);
  const hasLinkedCard = Boolean(linkedCard.data);
  const shouldShowInvites =
    invitations.isPending || invitations.isError || (invitations.data?.length ?? 0) > 0;
  const refreshInvites = useCallback(() => {
    // oxlint-disable-next-line no-unused-vars
    const _ = invitations.refetch();
  }, [invitations]);

  const openCardScanner = () => {
    router.push("/nfc-card");
  };

  const handleUnlinkCard = () => {
    accountModalRef.current?.dismiss();
    unlinkCard.mutate();
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
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl=<RefreshControl
            refreshing={invitations.isRefetching}
            onRefresh={refreshInvites}
            tintColor={theme.colors.text.secondary}
            colors={[theme.colors.text.secondary]}
          />
      >
        <View style={styles.header}>
          <Text header size="3xl" weight="medium" numberOfLines={1} style={styles.username}>
            {user.username}
          </Text>
          <Button
            accessibilityLabel="Open account menu"
            variant="icon"
            hitSlop={16}
            onPress={() => accountModalRef.current?.present()}
          >
            <DotGridVerticalIcon color={theme.colors.text.secondary} size={24} />
          </Button>
        </View>

        {shouldShowInvites ? (
          <>
            <View style={styles.sectionHeader}>
              <Text header size="2xl" weight="medium">
                Invites
              </Text>
              {invitations.data ? (
                <Text tone="text.secondary" style={styles.counter}>
                  {invitations.data.length}
                </Text>
              ) : null}
            </View>

            {invitations.isPending ? (
              <View style={styles.list}>
                <InviteSkeleton />
                <InviteSkeleton />
              </View>
            ) : invitations.isError ? (
              <StateBlock
                title="We couldn't load your invites right now"
                detail="Please try again in a moment."
                actionLabel="Try Again"
                onAction={() => invitations.refetch()}
              />
            ) : (
              <Animated.View layout={LinearTransition} style={styles.list}>
                {invitations.data.map((invitation) => (
                  <InviteCard
                    key={invitation.id}
                    invitation={invitation}
                    isResponding={isResponding}
                    onAccept={acceptInvite.mutate}
                    onReject={rejectInvite.mutate}
                    acceptError={acceptInvite.error}
                    rejectError={rejectInvite.error}
                    acceptingId={acceptInvite.variables}
                    rejectingId={rejectInvite.variables}
                  />
                ))}
              </Animated.View>
            )}
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text header size="2xl" weight="medium">
            Next reservation
          </Text>
        </View>

        {reservations.isPending ? (
          <ReservationCardSkeleton />
        ) : reservations.isError ? (
          <StateBlock
            title="We couldn't load your reservations right now"
            detail="Please try again in a moment."
            actionLabel="Try Again"
            onAction={() => reservations.refetch()}
          />
        ) : nextReservation ? (
          <ReservationCard reservation={nextReservation} />
        ) : (
          <StateBlock
            title="No upcoming reservations"
            detail="Your next booked desk will show up here."
          />
        )}
      </ScrollView>

      {!hasLinkedCard && !linkedCard.isPending ? (
        <CardButton style={styles.cardButton} onPress={openCardScanner} />
      ) : null}

      <AccountModal
        ref={accountModalRef}
        hasLinkedCard={hasLinkedCard}
        isUnlinking={unlinkCard.isPending}
        onLinkCard={openCardScanner}
        onUnlinkCard={handleUnlinkCard}
        onLogout={logout}
      />
    </SafeAreaView>
  );
}

function InviteSkeleton() {
  return (
    <View style={styles.inviteCard}>
      <Skeleton width={190} height={24} color="#E6E8EC" style={{ borderRadius: 999 }} />
      <Skeleton width={240} height={18} color="#E6E8EC" style={{ borderRadius: 999 }} />
      <View style={styles.inviteActions}>
        <Skeleton width="48%" height={44} color="#E6E8EC" style={{ borderRadius: 999 }} />
        <Skeleton width="48%" height={44} color="#E6E8EC" style={{ borderRadius: 999 }} />
      </View>
    </View>
  );
}

function StateBlock({
  actionLabel,
  detail,
  onAction,
  title,
}: {
  actionLabel?: string;
  detail: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text size="lg" weight="medium" style={styles.centerText}>
        {title}
      </Text>
      <Text tone="text.secondary" style={styles.centerText}>
        {detail}
      </Text>
      {actionLabel && onAction ? (
        <Button variant="secondary" style={styles.retryButton} onPress={onAction}>
          <Text size="lg" weight="medium" color="black">
            {actionLabel}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "white",
  },
  content: {
    flexGrow: 1,
    paddingBottom: 112,
    gap: 18,
  },
  header: {
    marginTop: 28,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  username: {
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F3F4",
  },
  menuDots: {
    marginTop: -8,
    letterSpacing: 0,
  },
  sectionHeader: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    fontVariant: ["tabular-nums"],
  },
  list: {
    gap: 14,
  },
  inviteCard: {
    gap: 14,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#F7F8FA",
  },
  inviteCopy: {
    gap: 4,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8,
  },
  inviteButton: {
    flex: 1,
    flexBasis: 0,
    minHeight: 48,
  },
  acceptButton: {
    backgroundColor: "#00B2FF",
  },
  state: {
    minHeight: 136,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#F7F8FA",
  },
  centerText: {
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
  },
  cardButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
});
