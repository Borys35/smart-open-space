import { useAuthActions } from "@/components/auth/auth-actions-context";
import { BackButton } from "@/components/nav/back-button";
import { useAuth } from "@/hooks/use-auth";
import { Text } from "@ssobkowski/rnui";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { Easing, FadeOut, withSequence, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

import type { EntryExitAnimationFunction } from "react-native-reanimated";

// https://colinhacks.com/essays/reasonable-email-regex
const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i;
const validateEmail = (email: string) => EMAIL_REGEX.test(email);
const MIN_PASSWORD_LENGTH = 8;

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

  const initialValues = {
    opacity: 0,
    transform: [{ translateY: 48 }, { translateX: 0 }],
  };

  return {
    animations,
    initialValues,
  };
};

const ERROR_EXITING = FadeOut.duration(150);

export default function SignIn() {
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { setSignInAction, setSignInLoading, setSignInValidation } = useAuthActions();
  const router = useRouter();

  const signInValidation = useMemo(() => {
    if (!email) {
      return { hint: "Enter your email address to continue.", valid: false };
    }

    if (!validateEmail(email)) {
      return { hint: "Enter a valid email address.", valid: false };
    }

    if (!password) {
      return { hint: "Enter your password to continue.", valid: false };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        hint: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        valid: false,
      };
    }

    return { hint: null, valid: true };
  }, [email, password]);

  const handleSignIn = useCallback(async () => {
    if (!signInValidation.valid) return;

    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }, [email, login, password, signInValidation.valid]);

  const handleGoBack = () => {
    emailInputRef.current?.blur();
    passwordInputRef.current?.blur();
    router.back();
  };

  useEffect(() => {
    setSignInAction(handleSignIn);

    return () => {
      setSignInAction(null);
    };
  }, [setSignInAction, handleSignIn]);

  useEffect(() => {
    setSignInLoading(loading);

    return () => {
      setSignInLoading(false);
    };
  }, [loading, setSignInLoading]);

  useEffect(() => {
    setSignInValidation(signInValidation);
  }, [setSignInValidation, signInValidation]);

  useEffect(
    () => () => {
      setSignInValidation({ hint: null, valid: false });
    },
    [setSignInValidation],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={handleGoBack} />
        <Text color="#202124" header size="3xl" weight="medium">
          Sign In
        </Text>
        <View style={styles.headerBalance} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fields}>
          <TextInput
            ref={emailInputRef}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            autoFocus
            keyboardType="email-address"
            placeholder="Email address"
            placeholderTextColor="#C2C2C7"
            returnKeyType="next"
            style={styles.input}
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />

          <TextInput
            ref={passwordInputRef}
            autoCapitalize="none"
            autoComplete="current-password"
            placeholder="Password"
            placeholderTextColor="#C2C2C7"
            returnKeyType="done"
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSignIn}
          />
        </View>

        {error && (
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
            {error}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 128,
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
}));
