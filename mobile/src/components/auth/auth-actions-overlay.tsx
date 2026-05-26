import { Button, Text } from "@ssobkowski/rnui";
import { router } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import { useAuthActions } from "./auth-actions-context";

import type { OverlayProps } from "@ssobkowski/stack";
import type { KeyboardAvoidingViewProps } from "react-native";

interface AuthOverlayMeta {
  actions?: "welcome" | "sign-in" | "sign-up" | "hidden";
}

const KEYBOARD_BEHAVIOR = Platform.select({
  ios: "padding",
  android: undefined,
}) as KeyboardAvoidingViewProps["behavior"];

const ACTION_LABELS = {
  welcome: { key: "welcome", label: "Get Started" },
  "sign-in": { key: "sign-in", label: "Continue" },
  "sign-up": { key: "sign-up", label: "Create account" },
} as const;

const ACTIONS_LAYOUT_TRANSITION = LinearTransition.springify().damping(120).stiffness(900);
const ACTION_LABEL_ENTERING = FadeIn.duration(180);
const ACTION_LABEL_EXITING = FadeOut.duration(140);
const VALIDATION_HINT_ENTERING = FadeIn.duration(150);
const VALIDATION_HINT_EXITING = FadeOut.duration(120);
const LOGIN_PROMPT_ENTERING = FadeIn.duration(180);
const LOGIN_PROMPT_EXITING = FadeOut.duration(140);
const WELCOME_ACTIONS_ENTERING = FadeInDown.duration(300)
  .delay(200)
  .easing(Easing.bezier(0.165, 0.84, 0.44, 1));

export function AuthActionsOverlay({ meta }: OverlayProps) {
  const insets = useSafeAreaInsets();
  const {
    signInLoading,
    signInValidation,
    signUpLoading,
    signUpValidation,
    submitSignIn,
    submitSignUp,
    welcomeReady,
  } = useAuthActions();
  const actions = (meta as AuthOverlayMeta | undefined)?.actions ?? "hidden";
  const { height } = useReanimatedKeyboardAnimation();

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: height.get() }],
  }));

  if (actions === "hidden" || (actions === "welcome" && !welcomeReady)) {
    return null;
  }

  const { key, label } = ACTION_LABELS[actions];
  const isOnboarding = key === "welcome";
  const loading = key === "sign-up" ? signUpLoading : signInLoading;
  const validation = key === "sign-up" ? signUpValidation : signInValidation;
  const disabled = !isOnboarding && (!validation.valid || loading);
  const handlePress =
    key === "welcome"
      ? () => router.push("/sign-up")
      : key === "sign-in"
        ? submitSignIn
        : submitSignUp;

  return (
    <KeyboardAvoidingView
      behavior={KEYBOARD_BEHAVIOR}
      pointerEvents="box-none"
      style={styles.overlay}
    >
      <Animated.View
        entering={!isOnboarding ? undefined : WELCOME_ACTIONS_ENTERING}
        layout={ACTIONS_LAYOUT_TRANSITION}
        pointerEvents="box-none"
        style={[styles.bottomGradient, { paddingBottom: insets.bottom + 16 }]}
      >
        <Animated.View layout={ACTIONS_LAYOUT_TRANSITION} style={[buttonStyle, styles.action]}>
          {!isOnboarding && validation.hint && (
            <Text
              willAnimate
              accessibilityLiveRegion="polite"
              color="#8E8E93"
              entering={VALIDATION_HINT_ENTERING}
              exiting={VALIDATION_HINT_EXITING}
              size="sm"
              style={styles.validationHint}
            >
              {validation.hint}
            </Text>
          )}

          <Button
            variant="primary"
            disabled={disabled}
            disabledStyle={styles.primaryButtonDisabled}
            layout={ACTIONS_LAYOUT_TRANSITION}
            onPress={handlePress}
            style={styles.primaryButton}
          >
            {!isOnboarding && loading ? (
              <ActivityIndicator color="#733e0a" />
            ) : (
              <Text
                willAnimate
                key={key}
                tone="text.primary"
                size="xl"
                weight="medium"
                entering={ACTION_LABEL_ENTERING}
                exiting={ACTION_LABEL_EXITING}
              >
                {label}
              </Text>
            )}
          </Button>
        </Animated.View>

        {isOnboarding && (
          <Button
            onPress={() => router.push("/sign-in")}
            entering={LOGIN_PROMPT_ENTERING}
            exiting={LOGIN_PROMPT_EXITING}
            layout={ACTIONS_LAYOUT_TRANSITION}
            style={styles.secondaryAction}
          >
            <Text color="black">
              Already have an account?{" "}
              <Text tone="text.primary" weight="medium">
                Log in
              </Text>
            </Text>
          </Button>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create((t) => ({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
  },
  bottomGradient: {
    padding: 24,
    paddingTop: 44,
    gap: 8,
    experimental_backgroundImage:
      "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 1) 36%)",
  },
  action: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: t.colors.button.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  secondaryAction: {
    alignSelf: "center",
  },
  validationHint: {
    textAlign: "center",
    justifyContent: "center",
  },
}));
