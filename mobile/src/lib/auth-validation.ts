export interface AuthValidation {
  hint: string | null;
  valid: boolean;
}

// https://colinhacks.com/essays/reasonable-email-regex
const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/i;
const MIN_PASSWORD_LENGTH = 8;

function validateEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

function validateEmailAndPassword(
  email: string,
  password: string,
  emptyPasswordHint: string,
): AuthValidation {
  if (!email) {
    return { hint: "Enter your email address to continue.", valid: false };
  }

  if (!validateEmail(email)) {
    return { hint: "Enter a valid email address.", valid: false };
  }

  if (!password) {
    return { hint: emptyPasswordHint, valid: false };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      hint: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      valid: false,
    };
  }

  return { hint: null, valid: true };
}

export function validateSignIn(email: string, password: string): AuthValidation {
  return validateEmailAndPassword(email, password, "Enter your password to continue.");
}

export function validateSignUp(name: string, email: string, password: string): AuthValidation {
  if (!name.trim()) {
    return { hint: "Enter your name to continue.", valid: false };
  }

  return validateEmailAndPassword(email, password, "Create a password to continue.");
}
