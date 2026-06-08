import { Button } from "@ssobkowski/rnui/button";
import { Text } from "@ssobkowski/rnui/text";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

const BACKGROUND_IMAGE = require("@assets/images/background.webp");

export default function OnboardingScreen() {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
  };

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

        {isLoaded && (
          <EaseView
            animate={{ opacity: 1, translateY: 24 }}
            initialAnimate={{ opacity: 0, translateY: 24 }}
            transition={{ type: "timing", delay: 200, easing: [0.165, 0.84, 0.44, 1] }}
            style={styles.actions}
          >
            <Button
              variant="primary"
              onPress={() => router.push("/sign-up")}
              style={styles.primaryButton}
            >
              <Text tone="text.primary" size="xl" weight="medium">
                Get Started
              </Text>
            </Button>

            <Button onPress={() => router.push("/sign-in")} style={styles.secondaryAction}>
              <Text color="black">
                Already have an account?{" "}
                <Text tone="text.primary" weight="medium">
                  Log in
                </Text>
              </Text>
            </Button>
          </EaseView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create((t) => ({
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
  actions: {
    padding: 24,
    paddingTop: 44,
    paddingBottom: 44,
    gap: 8,
    experimental_backgroundImage:
      "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 1) 36%)",
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: t.colors.button.primary,
  },
  secondaryAction: {
    alignSelf: "center",
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
}));
