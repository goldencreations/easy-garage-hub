import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type AuthPayload, type AuthUser, loginRequest, logoutRequest } from "@/lib/api";

const STORAGE_KEY = "azizi-automotive-garage-auth";
type StoredAuth = AuthPayload;

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAuth;
        if (parsed?.token && parsed?.user) {
          setToken(parsed.token);
          setUser(parsed.user);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const e = email.trim().toLowerCase();
    if (!e) return { ok: false, error: "Enter your email." };
    if (!password.trim()) return { ok: false, error: "Enter your password." };

    try {
      const response = await loginRequest(e, password);
      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not sign in.",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutRequest(token);
      } catch {
        // Continue client-side logout even if server token invalid/expired.
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
