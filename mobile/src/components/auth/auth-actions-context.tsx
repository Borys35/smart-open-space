import { createContext, use, useCallback, useMemo, useRef, useState } from "react";

import type { AuthValidation } from "@/lib/auth-validation";
import type { PropsWithChildren } from "react";

type SignInAction = () => void;

interface AuthActionsContextValue {
  setSignInAction: (action: SignInAction | null) => void;
  setSignInLoading: (loading: boolean) => void;
  setSignInValidation: (validation: AuthValidation) => void;
  setSignUpAction: (action: SignInAction | null) => void;
  setSignUpLoading: (loading: boolean) => void;
  setSignUpValidation: (validation: AuthValidation) => void;
  setWelcomeReady: (ready: boolean) => void;
  signInLoading: boolean;
  signInValidation: AuthValidation;
  signUpLoading: boolean;
  signUpValidation: AuthValidation;
  submitSignIn: () => void;
  submitSignUp: () => void;
  welcomeReady: boolean;
}

const AuthActionsContext = createContext<AuthActionsContextValue | null>(null);

export function AuthActionsProvider({ children }: PropsWithChildren) {
  const signInAction = useRef<SignInAction | null>(null);
  const signUpAction = useRef<SignInAction | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInValidation, setSignInValidation] = useState<AuthValidation>({
    hint: null,
    valid: false,
  });
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpValidation, setSignUpValidation] = useState<AuthValidation>({
    hint: null,
    valid: false,
  });
  const [welcomeReady, setWelcomeReady] = useState(false);

  const setSignInAction = useCallback((action: SignInAction | null) => {
    signInAction.current = action;
  }, []);

  const submitSignIn = useCallback(() => {
    signInAction.current?.();
  }, []);

  const setSignUpAction = useCallback((action: SignInAction | null) => {
    signUpAction.current = action;
  }, []);

  const submitSignUp = useCallback(() => {
    signUpAction.current?.();
  }, []);

  const value = useMemo(
    () => ({
      setSignInAction,
      setSignInLoading,
      setSignInValidation,
      setSignUpAction,
      setSignUpLoading,
      setSignUpValidation,
      setWelcomeReady,
      signInLoading,
      signInValidation,
      signUpLoading,
      signUpValidation,
      submitSignIn,
      submitSignUp,
      welcomeReady,
    }),
    [
      setSignInAction,
      setSignUpAction,
      signInLoading,
      signInValidation,
      signUpLoading,
      signUpValidation,
      submitSignIn,
      submitSignUp,
      welcomeReady,
    ],
  );

  return <AuthActionsContext value={value}>{children}</AuthActionsContext>;
}

export function useAuthActions() {
  const context = use(AuthActionsContext);

  if (!context) {
    throw new Error("useAuthActions must be used within AuthActionsProvider");
  }

  return context;
}
