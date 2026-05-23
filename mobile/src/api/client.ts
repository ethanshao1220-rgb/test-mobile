import Constants from "expo-constants";

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

const API_PORT = "8000";
const DEFAULT_API_BASE_URL = "http://localhost:8000";

const explicitApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_BASE_URL = explicitApiBaseUrl
  ? trimTrailingSlash(explicitApiBaseUrl)
  : resolveDevApiBaseUrl();

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || "请求失败，请稍后重试");
  }
  return payload.data;
}

function resolveDevApiBaseUrl(): string {
  const expoHost = getExpoHost();
  if (!expoHost) return DEFAULT_API_BASE_URL;

  return `http://${expoHost}:${API_PORT}`;
}

function getExpoHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(":")[0];
  return host.length > 0 ? host : null;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
