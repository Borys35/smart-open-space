import { BackButton } from "@/components/nav/back-button";
import { useAuth } from "@/hooks/use-auth";
import { cardKeys } from "@/hooks/use-cards";
import { api } from "@/lib/api";
import { getCardColor, getCardHash } from "@/lib/nfc";
import { Card } from "@/pages/card-link/card";
import { Button } from "@ssobkowski/rnui/button";
import { CrossIcon, NfcIcon, UserIconFilled } from "@ssobkowski/rnui/icons";
import { Text } from "@ssobkowski/rnui/text";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import type { TagEvent } from "react-native-nfc-manager";
import type { EntryExitAnimationFunction } from "react-native-reanimated";

interface LinkCardResponse {
  card: {
    uid: string;
    active: boolean;
  } | null;
}

const NFC_TECHS =
  process.env.EXPO_OS === "ios"
    ? [NfcTech.Ndef, NfcTech.MifareIOS, NfcTech.Iso15693IOS]
    : [
        NfcTech.Ndef,
        NfcTech.NfcA,
        NfcTech.NfcB,
        NfcTech.IsoDep,
        NfcTech.MifareClassic,
        NfcTech.MifareUltralight,
      ];

const LAYOUT_TRANSITION = LinearTransition.springify().damping(120).mass(4).stiffness(900);
const ERROR_EXITING = FadeOut.duration(150);

const CONTINUE_ENTER: EntryExitAnimationFunction = () => {
  "worklet";

  const config = {
    duration: 200,
    easing: Easing.bezier(0.215, 0.61, 0.355, 1),
  };

  const animations = {
    opacity: withTiming(1, config),
    transform: [{ translateY: withTiming(0, config) }, { scale: withTiming(1, config) }],
  };

  return {
    animations,
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 30 }, { scale: 0.8 }],
    },
  };
};

const ERROR_ENTERING: EntryExitAnimationFunction = () => {
  "worklet";

  const config = {
    duration: 140,
    easing: Easing.bezier(0.215, 0.61, 0.355, 1),
  };

  const animations = {
    opacity: withTiming(1, config),
    transform: [
      { translateY: withTiming(0, config) },
      {
        translateX: withSequence(
          withTiming(-8, { duration: 55 }),
          withTiming(8, { duration: 55 }),
          withTiming(-6, { duration: 55 }),
          withTiming(6, { duration: 55 }),
          withTiming(-3, { duration: 55 }),
          withTiming(0, { duration: 55 }),
        ),
      },
    ],
  };

  return {
    animations,
    initialValues: {
      opacity: 0,
      transform: [{ translateY: 24 }, { translateX: 0 }],
    },
  };
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default function NfcCardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"scanning" | "linking" | "ready" | "error">("scanning");
  const [tag, setTag] = useState<TagEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanCard = useCallback(async () => {
    setStatus("scanning");
    setTag(null);
    setError(null);

    try {
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        return;
      }

      await NfcManager.start();

      const isEnabled = await NfcManager.isEnabled();
      if (!isEnabled) {
        return;
      }

      await NfcManager.requestTechnology(NFC_TECHS, {
        alertMessage: "Hold your card near the phone.",
      });

      const scannedTag = await NfcManager.getTag();

      if (!scannedTag?.id) {
        throw new Error("Scanned card does not contain a readable UID");
      }

      setTag(scannedTag);
      setStatus("linking");
      const credentials = await api.post<LinkCardResponse>("/api/credentials/cards", {
        card: {
          uid: scannedTag.id,
        },
      });
      queryClient.setQueryData(cardKeys.linked(), credentials.card);
      await queryClient.invalidateQueries({ queryKey: cardKeys.linked() });
      setStatus("ready");
    } catch (scanError) {
      setError(formatError(scanError));
      setStatus("error");
    } finally {
      await NfcManager.cancelTechnologyRequest({ throwOnError: false });
    }
  }, [queryClient]);

  const handleContinue = () => {
    router.replace("/(protected)");
  };

  const isReady = status === "ready";
  const cardHash = getCardHash(tag?.id);
  const buttonStyle = { backgroundColor: getCardColor(tag?.id) };

  useEffect(() => {
    scanCard();

    return () => {
      NfcManager.cancelTechnologyRequest({ throwOnError: false });
    };
  }, [scanCard]);

  if (!user) return;

  return (
    <SafeAreaView style={styles.container}>
      <BackButton style={styles.backButton}>
        <CrossIcon size={32} color="#94969A" strokeWidth={2} />
      </BackButton>

      <View style={styles.content}>
        {status !== "ready" && status !== "error" && (
          <Text
            willAnimate
            tone="text.secondary"
            size="lg"
            style={styles.objectiveText}
            exiting={FadeOut}
          >
            Hold your card flat against the back of your phone, near the middle.
          </Text>
        )}
        <Animated.View layout={LAYOUT_TRANSITION} style={styles.cardWrapper}>
          <Card state={status === "ready" ? "ready" : "scanning"} serial={tag?.id} />
          {tag && (
            <Animated.View entering={FadeIn} pointerEvents="none" style={styles.cardInfo}>
              <View style={styles.cardName}>
                <UserIconFilled size={24} color="white" />
                <Text size="xl" color="white" weight="medium">
                  {user.username}
                </Text>
              </View>
              <Text color="white" style={styles.cardHash}>
                #{cardHash}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
        {error && (
          <Text
            willAnimate
            entering={ERROR_ENTERING}
            exiting={ERROR_EXITING}
            layout={LAYOUT_TRANSITION}
            accessibilityLiveRegion="polite"
            color="#D92D20"
            size="sm"
            style={styles.error}
          >
            {error}
          </Text>
        )}
        {isReady && (
          <Text
            willAnimate
            tone="text.secondary"
            size="lg"
            style={styles.objectiveText}
            entering={FadeIn}
          >
            Your card is ready.
          </Text>
        )}
      </View>

      <Animated.View layout={LAYOUT_TRANSITION} style={styles.footer}>
        <NfcIcon size={32} color="#94969A" />
        {status === "error" && (
          <Button
            variant="secondary"
            style={styles.button}
            entering={CONTINUE_ENTER}
            onPress={scanCard}
          >
            <Text size="lg" weight="medium" color="black">
              Try Again
            </Text>
          </Button>
        )}
        {isReady && (
          <Button
            variant="primary"
            style={[styles.button, buttonStyle]}
            onPress={handleContinue}
            entering={CONTINUE_ENTER}
          >
            <Text size="lg" weight="medium" color="white">
              Continue
            </Text>
          </Button>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  backButton: {
    marginTop: 24,
    marginLeft: 24,
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  objectiveText: {
    textAlign: "center",
    marginBottom: 24,
  },
  error: {
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 10,
  },
  cardWrapper: {
    position: "relative",
  },
  cardInfo: {
    position: "absolute",
    top: 40,
    right: 40,
    bottom: 40,
    left: 40,
  },
  cardName: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    left: 24,
    bottom: 16,
  },
  cardHash: {
    position: "absolute",
    top: 16,
    right: 24,
    opacity: 0.5,
  },
  footer: {
    alignItems: "center",
    gap: 16,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  button: {
    width: "100%",
    minHeight: 52,
  },
});
