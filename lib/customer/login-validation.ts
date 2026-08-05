/** Client-side member login field validation (mock auth). */

export type LoginFieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidLoginEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function validateLoginFields(input: {
  email: string;
  password: string;
}): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const email = input.email.trim();
  const password = input.password;

  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidLoginEmail(email)) {
    errors.email = "Email format is invalid.";
  }

  if (!password || !password.trim()) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function isLoginValid(input: {
  email: string;
  password: string;
}): boolean {
  return Object.keys(validateLoginFields(input)).length === 0;
}
