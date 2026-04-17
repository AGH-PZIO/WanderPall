import { apiClient } from "../../../shared/api-client";
import type { components } from "../../../shared/api-types";

export type User = components["schemas"]["UserResponse"];
export type TokenResponse = components["schemas"]["TokenResponse"];
export type RegistrationStartRequest = components["schemas"]["RegistrationStartRequest"];
export type RegistrationStartResponse = components["schemas"]["RegistrationStartResponse"];
export type RegistrationCompleteRequest = components["schemas"]["RegistrationCompleteRequest"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type UpdateUserRequest = components["schemas"]["UpdateUserRequest"];
export type PasswordResetConfirmRequest = components["schemas"]["PasswordResetConfirmRequest"];
export type ThemeResponse = components["schemas"]["ThemeResponse"];

function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function describeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail?: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
  }

  return fallback;
}

export async function startRegistration(
  body: RegistrationStartRequest
): Promise<RegistrationStartResponse> {
  const { data, error } = await apiClient.POST("/account/register/start", { body });

  if (error || !data) {
    throw new Error(describeError(error, "Could not start registration"));
  }

  return data;
}

export async function verifyRegistrationEmail(registrationId: string, code: string): Promise<void> {
  const { error } = await apiClient.POST("/account/register/verify-email", {
    body: { registration_id: registrationId, code }
  });

  if (error) {
    throw new Error(describeError(error, "Email verification failed"));
  }
}

export async function verifyRegistrationPhone(registrationId: string, code: string): Promise<void> {
  const { error } = await apiClient.POST("/account/register/verify-phone", {
    body: { registration_id: registrationId, code }
  });

  if (error) {
    throw new Error(describeError(error, "Phone verification failed"));
  }
}

export async function completeRegistration(body: RegistrationCompleteRequest): Promise<User> {
  const { data, error } = await apiClient.POST("/account/register/complete", { body });

  if (error || !data) {
    throw new Error(describeError(error, "Could not complete registration"));
  }

  return data;
}

export async function login(body: LoginRequest): Promise<TokenResponse> {
  const { data, error } = await apiClient.POST("/account/login", { body });

  if (error || !data) {
    throw new Error(describeError(error, "Login failed"));
  }

  return data;
}

export async function refreshToken(refresh: string): Promise<TokenResponse> {
  const { data, error } = await apiClient.POST("/account/token/refresh", {
    body: { refresh_token: refresh }
  });

  if (error || !data) {
    throw new Error(describeError(error, "Token refresh failed"));
  }

  return data;
}

export async function logout(refresh: string): Promise<void> {
  await apiClient.POST("/account/logout", {
    body: { refresh_token: refresh }
  });
}

export async function getMe(accessToken: string): Promise<User> {
  const { data, error } = await apiClient.GET("/account/me", {
    headers: authHeaders(accessToken)
  });

  if (error || !data) {
    throw new Error(describeError(error, "Could not fetch profile"));
  }

  return data;
}

export async function updateMe(accessToken: string, body: UpdateUserRequest): Promise<User> {
  const { data, error } = await apiClient.PATCH("/account/me", {
    body,
    headers: authHeaders(accessToken)
  });

  if (error || !data) {
    throw new Error(describeError(error, "Could not update profile"));
  }

  return data;
}

export async function deleteMe(accessToken: string, confirm: boolean): Promise<void> {
  const { error } = await apiClient.DELETE("/account/me", {
    body: { confirm },
    headers: authHeaders(accessToken)
  });

  if (error) {
    throw new Error(describeError(error, "Could not delete account"));
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await apiClient.POST("/account/password-reset/request", {
    body: { email }
  });

  if (error) {
    throw new Error(describeError(error, "Could not request password reset"));
  }
}

export async function confirmPasswordReset(body: PasswordResetConfirmRequest): Promise<void> {
  const { error } = await apiClient.POST("/account/password-reset/confirm", { body });

  if (error) {
    throw new Error(describeError(error, "Could not reset password"));
  }
}

export async function getTheme(accessToken: string): Promise<ThemeResponse> {
  const { data, error } = await apiClient.GET("/account/theme", {
    headers: authHeaders(accessToken)
  });

  if (error || !data) {
    throw new Error(describeError(error, "Could not load theme"));
  }

  return data;
}

export async function updateTheme(accessToken: string, theme: string): Promise<ThemeResponse> {
  const { data, error } = await apiClient.PUT("/account/theme", {
    body: { theme },
    headers: authHeaders(accessToken)
  });

  if (error || !data) {
    throw new Error(describeError(error, "Could not update theme"));
  }

  return data;
}
