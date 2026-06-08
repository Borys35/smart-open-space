import { useAuth } from "@/hooks/use-auth";
import { validateSignUp } from "@/lib/auth-validation";
import { AuthFormScreen, AuthTextInput } from "@/pages/auth/auth-form";
import { Button } from "@ssobkowski/rnui/button";
import { Text } from "@ssobkowski/rnui/text";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { TextInput } from "react-native";

export default function SignUp() {
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const signUpValidation = useMemo(
    () => validateSignUp(name, email, password),
    [email, name, password],
  );

  const handleSignUp = useCallback(async () => {
    if (!signUpValidation.valid) return;

    setError("");
    setLoading(true);
    try {
      await register(name.trim(), email, password);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }, [email, name, password, register, signUpValidation.valid]);

  const handleGoBack = () => {
    nameInputRef.current?.blur();
    emailInputRef.current?.blur();
    passwordInputRef.current?.blur();
    router.back();
  };

  return (
    <AuthFormScreen
      error={error}
      footer={
        <View style={styles.actions}>
          {signUpValidation.hint && (
            <Text accessibilityLiveRegion="polite" color="#8E8E93" size="sm" style={styles.hint}>
              {signUpValidation.hint}
            </Text>
          )}

          <Button
            variant="primary"
            disabled={!signUpValidation.valid || loading}
            disabledStyle={styles.primaryButtonDisabled}
            onPress={handleSignUp}
            style={styles.primaryButton}
          >
            {loading ? (
              <ActivityIndicator color="#733e0a" />
            ) : (
              <Text tone="text.primary" size="xl" weight="medium">
                Create account
              </Text>
            )}
          </Button>
        </View>
      }
      onBack={handleGoBack}
      title="Sign Up"
    >
      <AuthTextInput
        ref={nameInputRef}
        autoCapitalize="words"
        autoComplete="name"
        autoFocus
        placeholder="Name"
        returnKeyType="next"
        textContentType="name"
        value={name}
        onChangeText={setName}
        onSubmitEditing={() => emailInputRef.current?.focus()}
      />

      <AuthTextInput
        ref={emailInputRef}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
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
        autoComplete="new-password"
        autoCorrect={false}
        placeholder="Password"
        returnKeyType="done"
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSignUp}
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
