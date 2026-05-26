import { useAuthActions } from "@/components/auth/auth-actions-context";
import { Text } from "@ssobkowski/rnui";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

const BACKGROUND_IMAGE = require("@assets/images/background.webp");

export default function OnboardingScreen() {
  const [isLoaded, setIsLoaded] = useState(false);
  const { setWelcomeReady } = useAuthActions();

  const handleLoad = () => {
    setIsLoaded(true);
    setWelcomeReady(true);
  };

  useEffect(
    () => () => {
      setWelcomeReady(false);
    },
    [setWelcomeReady],
  );

  return (
    <View style={styles.container}>
      <Image
        onLoad={handleLoad}
        source={BACKGROUND_IMAGE}
        style={styles.background}
        transition={300}
      />
      <SafeAreaView style={styles.content}>
        <EaseView
          animate={{ opacity: isLoaded ? 1 : 0, translateY: isLoaded ? 0 : -20 }}
          transition={{ type: "timing", easing: [0.165, 0.84, 0.44, 1] }}
          style={[styles.container, styles.header]}
        >
          <Text size="4xl" weight="medium">
            Smart Open Space
          </Text>
        </EaseView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginTop: 48,
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
});
