import { apiClient } from "../../shared/api-client";

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

type TokenListener = (tokens: StoredTokens | null) => void;

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

let currentTokens: StoredTokens | null = null;
const listeners = new Set<TokenListener>();

function emit() {
  for (const listener of listeners) listener(currentTokens);
}

export const tokenStore = {
  get(): StoredTokens | null {
    return currentTokens;
  },
  set(tokens: StoredTokens | null) {
    currentTokens = tokens;
    emit();
  },
  subscribe(listener: TokenListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

async function refreshViaRawFetch(refreshToken: string): Promise<StoredTokens | null> {
  try {
    const res = await fetch(`${baseUrl}/account/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at
    };
  } catch {
    return null;
  }
}

let middlewareInstalled = false;
const pendingRequests = new Map<string, Request>();

export function installAuthMiddleware() {
  if (middlewareInstalled) return;
  middlewareInstalled = true;

  apiClient.use({
    async onRequest({ request, schemaPath }) {
      const tokens = tokenStore.get();
      if (tokens && !request.headers.has("Authorization")) {
        request.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
      }

      // Don't attempt refresh loops on the refresh endpoint itself.
      if (schemaPath !== "/account/token/refresh") {
        pendingRequests.set(request.url + request.method, request.clone());
      }

      return request;
    },
    async onResponse({ request, response }) {
      const key = request.url + request.method;
      const original = pendingRequests.get(key);
      pendingRequests.delete(key);

      if (response.status !== 401 || !original) return response;

      const tokens = tokenStore.get();
      if (!tokens?.refreshToken) {
        tokenStore.set(null);
        return response;
      }

      const refreshed = await refreshViaRawFetch(tokens.refreshToken);
      if (!refreshed) {
        tokenStore.set(null);
        return response;
      }

      tokenStore.set(refreshed);
      original.headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
      return fetch(original);
    }
  });
}

const THEME_ATTR = "data-theme";

export function applyTheme(theme: string | null | undefined) {
  const normalized = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute(THEME_ATTR, normalized);
}
