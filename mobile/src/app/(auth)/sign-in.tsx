import { useAuth } from "@/hooks/use-auth";
import { validateSignIn } from "@/lib/auth-validation";
import { AuthFormScreen, AuthTextInput } from "@/pages/auth/auth-form";
import { Button, Text } from "@ssobkowski/rnui";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { TextInput } from "react-native";

export default function SignIn() {
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const signInValidation = useMemo(() => validateSignIn(email, password), [email, password]);

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

  return (
    <AuthFormScreen
      error={error}
      footer={
        <View style={styles.actions}>
          {signInValidation.hint && (
            <Text accessibilityLiveRegion="polite" color="#8E8E93" size="sm" style={styles.hint}>
              {signInValidation.hint}
            </Text>
          )}

          <Button
            variant="primary"
            disabled={!signInValidation.valid || loading}
            disabledStyle={styles.primaryButtonDisabled}
            onPress={handleSignIn}
            style={styles.primaryButton}
          >
            {loading ? (
              <ActivityIndicator color="#733e0a" />
            ) : (
              <Text tone="text.primary" size="xl" weight="medium">
                Continue
              </Text>
            )}
          </Button>
        </View>
      }
      onBack={handleGoBack}
      title="Sign In"
    >
      <AuthTextInput
        ref={emailInputRef}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        autoFocus
        keyboardType="email-address"
        placeholder="Email address"
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={() => passwordInputRef.current?.focus()}
      />

      <AuthTextInput
        ref={passwordInputRef}
        autoCapitalize="none"
        autoComplete="current-password"
        autoCorrect={false}
        placeholder="Password"
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSignIn}
      />
    </AuthFormScreen>
  );
}

const styles = StyleSheet.create((t) => ({
  actions: {
    gap: 10,
  },
  hint: {
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: t.colors.button.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
}));
