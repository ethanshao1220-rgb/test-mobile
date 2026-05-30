import Constants from "expo-constants";

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

const API_PORT = "8000";
const REQUEST_TIMEOUT_MS = 8_000;

const explicitApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
let workingApiBaseUrl: string | null = null;

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const candidates = resolveApiBaseUrls();
  const errors: string[] = [];

  for (const baseUrl of candidates) {
    try {
      const payload = await requestOnce<T>(baseUrl, path, init);
      workingApiBaseUrl = baseUrl;
      return payload;
    } catch (error) {
      if (!isRetryableNetworkError(error)) {
        throw error;
      }
      errors.push(formatError(baseUrl, error));
    }
  }

  throw new Error(errors[0] ?? "无法连接到本地服务，请确认后端已启动");
}

async function requestOnce<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
      signal: controller.signal,
    });
    const payload = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || payload.code !== 0) {
      throw new Error(payload.message || "请求失败，请稍后重试");
    }
    return payload.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveApiBaseUrls(): string[] {
  const urls = new Set<string>();
  const localUrls = [`http://127.0.0.1:${API_PORT}`, `http://localhost:${API_PORT}`];

  if (workingApiBaseUrl) {
    urls.add(workingApiBaseUrl);
  }

  for (const url of localUrls) {
    urls.add(url);
  }

  const expoHost = getExpoHost();
  if (expoHost) {
    urls.add(`http://${expoHost}:${API_PORT}`);
  }

  urls.add(`http://10.0.2.2:${API_PORT}`);

  if (explicitApiBaseUrl) {
    urls.add(trimTrailingSlash(explicitApiBaseUrl));
  }

  return [...urls];
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

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.message === "Network request failed";
}

function formatError(baseUrl: string, error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return `${baseUrl} 请求超时`;
  }

  return `${baseUrl} 无法连接`;
}
