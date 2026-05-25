import { Text, Button } from "@ssobkowski/rnui";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { EaseView } from "react-native-ease";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import type { LayoutChangeEvent } from "react-native";

const BACKGROUND_IMAGE = require("@assets/images/background.webp");

export default function OnboardingScreen() {
  const router = useRouter();

  const [isLoaded, setIsLoaded] = useState(false);
  const [buttonsHeight, setButtonsHeight] = useState<number | undefined>(undefined);
  const { bottom: bottomInset } = useSafeAreaInsets();

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleSignUp = () => {
    router.push("/sign-up");
  };

  const handleLogIn = () => {
    router.push("/sign-in");
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    setButtonsHeight(e.nativeEvent.layout.height);
  };

  const gradientStyle = {
    height: buttonsHeight,
  };

  return (
    <View style={styles.container}>
      <Image
        onLoad={handleLoad}
        source={BACKGROUND_IMAGE}
        style={styles.background}
        transition={300}
      />
      <View style={[styles.gradient, gradientStyle]} />
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
        <EaseView
          animate={{ opacity: isLoaded ? 1 : 0, translateY: isLoaded ? 0 : 20 }}
          transition={{ type: "timing", easing: [0.165, 0.84, 0.44, 1], delay: 200 }}
          style={styles.container}
        >
          <View style={styles.buttons} onLayout={handleLayout}>
            <Button variant="primary" onPress={handleSignUp} style={styles.button}>
              <Text tone="text.primary" size="xl" weight="medium">
                Get started
              </Text>
            </Button>
            <Button onPress={handleLogIn} style={styles.loginButton}>
              <Text color="black">
                Already have an account?{" "}
                <Text tone="text.primary" weight="medium">
                  Log in
                </Text>
              </Text>
            </Button>
          </View>
        </EaseView>
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
    justifyContent: "space-between",
  },
  background: {
    ...StyleSheet.absoluteFill,
  },
  buttons: {
    flex: 1,
    justifyContent: "flex-end",
    margin: 24,
    gap: 8,
  },
  loginButton: {
    alignSelf: "center",
  },
  button: {
    backgroundColor: t.colors.button.primary,
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    experimental_backgroundImage: "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 1))",
  },
}));
