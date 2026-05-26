import { createContext, use, useCallback, useMemo, useRef, useState } from "react";

import type { PropsWithChildren } from "react";

type SignInAction = () => void;

interface SignInValidation {
  hint: string | null;
  valid: boolean;
}

interface AuthActionsContextValue {
  setSignInAction: (action: SignInAction | null) => void;
  setSignInLoading: (loading: boolean) => void;
  setSignInValidation: (validation: SignInValidation) => void;
  setWelcomeReady: (ready: boolean) => void;
  signInLoading: boolean;
  signInValidation: SignInValidation;
  submitSignIn: () => void;
  welcomeReady: boolean;
}

const AuthActionsContext = createContext<AuthActionsContextValue | null>(null);

export function AuthActionsProvider({ children }: PropsWithChildren) {
  const signInAction = useRef<SignInAction | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInValidation, setSignInValidation] = useState<SignInValidation>({
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

  const value = useMemo(
    () => ({
      setSignInAction,
      setSignInLoading,
      setSignInValidation,
      setWelcomeReady,
      signInLoading,
      signInValidation,
      submitSignIn,
      welcomeReady,
    }),
    [setSignInAction, signInLoading, signInValidation, submitSignIn, welcomeReady],
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
