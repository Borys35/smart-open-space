import { BackButton } from "@/components/nav/back-button";
import { Text } from "@ssobkowski/rnui/text";
import { ScrollView, TextInput, View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import type { PropsWithChildren } from "react";
import type { TextInputProps } from "react-native";
import type { EntryExitAnimationFunction } from "react-native-reanimated";

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
      transform: [{ translateY: 48 }, { translateX: 0 }],
    },
  };
};

const ERROR_EXITING = FadeOut.duration(150);

interface AuthFormScreenProps extends PropsWithChildren {
  error: string;
  footer: React.ReactNode;
  onBack: () => void;
  title: string;
}

export function AuthFormScreen({ children, error, footer, onBack, title }: AuthFormScreenProps) {
  const { height } = useReanimatedKeyboardAnimation();

  const footerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: height.get() }] }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={onBack} />
        <Text color="#202124" header size="3xl" weight="medium">
          {title}
        </Text>
        <View style={styles.headerBalance} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fields}>{children}</View>
        {error ? <AuthFormError>{error}</AuthFormError> : null}
      </ScrollView>

      <Animated.View style={[styles.footer, footerStyle]}>{footer}</Animated.View>
    </SafeAreaView>
  );
}

interface AuthTextInputProps extends TextInputProps {
  ref?: React.Ref<TextInput>;
}

export function AuthTextInput({ ref, style, ...props }: AuthTextInputProps) {
  return (
    <TextInput {...props} ref={ref} placeholderTextColor="#C2C2C7" style={[styles.input, style]} />
  );
}

function AuthFormError({ children }: PropsWithChildren) {
  return (
    <Text
      willAnimate
      entering={ERROR_ENTERING}
      exiting={ERROR_EXITING}
      accessibilityLiveRegion="polite"
      color="#D92D20"
      selectable
      size="sm"
      style={styles.error}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create((t) => ({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 68,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBalance: {
    height: 44,
    width: 44,
    marginRight: -12,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 36,
    paddingTop: 39,
    paddingBottom: 24,
  },
  fields: {
    gap: 34,
  },
  input: {
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomColor: "#E4E4E7",
    borderBottomWidth: 1,
    color: "#202124",
    fontFamily: t.typography.text.medium,
    fontSize: 20,
    lineHeight: 26,
  },
  error: {
    marginTop: 28,
    paddingHorizontal: 10,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    gap: 10,
    experimental_backgroundImage:
      "linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 1) 36%)",
  },
}));
