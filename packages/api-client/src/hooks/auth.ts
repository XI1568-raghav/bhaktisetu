// ──────────────────────────────────────────────
// @poojly/api-client — Auth Hooks
// ──────────────────────────────────────────────

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { api } from "../client.js";

// ─── Types (mirror of apps/api/src/routes/auth.ts response shapes) ───────────

export type UserRole =
  | "devotee"
  | "priest"
  | "store_owner"
  | "astrologer"
  | "wellness_instructor"
  | "gaushala_manager"
  | "temple_manager"
  | "admin";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  subscriptionTier: string;
  isNewUser?: boolean;
  role: UserRole;
}

export interface SendOtpRequest {
  phone: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  token: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  session: AuthSession;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  session: AuthSession;
  user: AuthUser;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  city?: string;
}

export interface SignupResponse {
  session: AuthSession;
  user: AuthUser;
  message?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  success: boolean;
  session: AuthSession;
}

export interface MeResponse {
  success: boolean;
  user: AuthUser;
}

// ─── Endpoint paths (api-client prepends baseUrl) ────────────────────────────

const AUTH_PATHS = {
  SEND_OTP: "/api/v1/auth/send-otp",
  VERIFY_OTP: "/api/v1/auth/verify-otp",
  REFRESH: "/api/v1/auth/refresh",
  LOGOUT: "/api/v1/auth/logout",
  ME: "/api/v1/auth/me",
  LOGIN: "/api/v1/auth/login",
  SIGNUP: "/api/v1/auth/signup",
} as const;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useSignInWithOtp(
  options?: UseMutationOptions<SendOtpResponse, Error, SendOtpRequest>
) {
  return useMutation({
    mutationFn: (data: SendOtpRequest) =>
      api.post<SendOtpResponse>(AUTH_PATHS.SEND_OTP, data, { noAuth: true }),
    ...options,
  });
}

export function useVerifyOtp(
  options?: UseMutationOptions<VerifyOtpResponse, Error, VerifyOtpRequest>
) {
  return useMutation({
    mutationFn: (data: VerifyOtpRequest) =>
      api.post<VerifyOtpResponse>(AUTH_PATHS.VERIFY_OTP, data, { noAuth: true }),
    ...options,
  });
}

export function useSignInWithCredentials(
  options?: UseMutationOptions<LoginResponse, Error, LoginRequest>
) {
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api.post<LoginResponse>(AUTH_PATHS.LOGIN, data, { noAuth: true }),
    ...options,
  });
}

export function useSignUp(
  options?: UseMutationOptions<SignupResponse, Error, SignupRequest>
) {
  return useMutation({
    mutationFn: (data: SignupRequest) =>
      api.post<SignupResponse>(AUTH_PATHS.SIGNUP, data, { noAuth: true }),
    ...options,
  });
}

export function useLogout(
  options?: UseMutationOptions<{ success: boolean; message: string }, Error, { accessToken: string }>
) {
  return useMutation({
    mutationFn: (data: { accessToken: string }) =>
      api.post<{ success: boolean; message: string }>(AUTH_PATHS.LOGOUT, data),
    ...options,
  });
}

export function useRefreshToken(
  options?: UseMutationOptions<RefreshResponse, Error, RefreshRequest>
) {
  return useMutation({
    mutationFn: (data: RefreshRequest) =>
      api.post<RefreshResponse>(AUTH_PATHS.REFRESH, data, { noAuth: true }),
    ...options,
  });
}

export function useMe(
  enabled = true,
  options?: Omit<UseQueryOptions<MeResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<MeResponse>(AUTH_PATHS.ME),
    enabled,
    ...options,
  });
}
