import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  getMe,
  login as loginApi,
  logout as logoutApi
} from "../api/account-api";
import type { TokenResponse, User } from "../api/account-api";
import { applyTheme, installAuthMiddleware, tokenStore } from "../auth-runtime";

const STORAGE_KEY = "wanderpall.account.tokens";

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

function persist(tokens: StoredTokens | null) {
  if (tokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function fromTokenResponse(res: TokenResponse): StoredTokens {
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: res.expires_at
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialTokensRef = useRef<StoredTokens | null>(loadTokens());

  const [tokens, setTokensState] = useState<StoredTokens | null>(initialTokensRef.current);
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(initialTokensRef.current));

  // Install middleware and seed the shared token store once.
  useEffect(() => {
    installAuthMiddleware();
    tokenStore.set(initialTokensRef.current);

    const unsubscribe = tokenStore.subscribe((next) => {
      setTokensState(next);
      persist(next);
      if (!next) {
        setUserState(null);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await loginApi({ email, password });
    const next = fromTokenResponse(res);
    tokenStore.set(next);
    setUserState(res.user);
    applyTheme(res.user.theme);
  }, []);

  const signOut = useCallback(async () => {
    const current = tokenStore.get();
    if (current?.refreshToken) {
      try {
        await logoutApi(current.refreshToken);
      } catch {
        // ignore network errors on logout
      }
    }
    tokenStore.set(null);
    setUserState(null);
    applyTheme("light");
  }, []);

  const refresh = useCallback(async () => {
    const current = tokenStore.get();
    if (!current?.accessToken) return;
    const me = await getMe(current.accessToken);
    setUserState(me);
    applyTheme(me.theme);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const current = tokenStore.get();
      if (!current?.accessToken) {
        setLoading(false);
        return;
      }

      try {
        const me = await getMe(current.accessToken);
        if (!cancelled) {
          setUserState(me);
          applyTheme(me.theme);
        }
      } catch {
        if (!cancelled) {
          tokenStore.set(null);
          setUserState(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken: tokens?.accessToken ?? null,
      loading,
      signIn,
      signOut,
      setUser: (next) => {
        setUserState(next);
        if (next) applyTheme(next.theme);
      },
      refresh
    }),
    [user, tokens?.accessToken, loading, signIn, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- useAuth is tied to AuthProvider in this module
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
