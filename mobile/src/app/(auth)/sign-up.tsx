import { useAuthActions } from "@/components/auth/auth-actions-context";
import { useAuth } from "@/hooks/use-auth";
import { validateSignUp } from "@/lib/auth-validation";
import { AuthFormScreen, AuthTextInput } from "@/pages/auth/auth-form";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const { setSignUpAction, setSignUpLoading, setSignUpValidation } = useAuthActions();
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

  useEffect(() => {
    setSignUpAction(handleSignUp);

    return () => {
      setSignUpAction(null);
    };
  }, [handleSignUp, setSignUpAction]);

  useEffect(() => {
    setSignUpLoading(loading);

    return () => {
      setSignUpLoading(false);
    };
  }, [loading, setSignUpLoading]);

  useEffect(() => {
    setSignUpValidation(signUpValidation);
  }, [setSignUpValidation, signUpValidation]);

  useEffect(
    () => () => {
      setSignUpValidation({ hint: null, valid: false });
    },
    [setSignUpValidation],
  );

  return (
    <AuthFormScreen error={error} onBack={handleGoBack} title="Sign Up">
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
