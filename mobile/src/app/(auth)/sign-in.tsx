import { useAuthActions } from "@/components/auth/auth-actions-context";
import { useAuth } from "@/hooks/use-auth";
import { validateSignIn } from "@/lib/auth-validation";
import { AuthFormScreen, AuthTextInput } from "@/pages/auth/auth-form";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TextInput } from "react-native";

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
    <AuthFormScreen error={error} onBack={handleGoBack} title="Sign In">
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
