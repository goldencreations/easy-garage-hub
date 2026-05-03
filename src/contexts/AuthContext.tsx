import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { users, type User } from "@/lib/mock-data";

const STORAGE_KEY = "easy-garage-auth";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { userId?: string };
        const u = users.find((x) => x.id === parsed.userId && x.active);
        if (u) setUser(u);
        else localStorage.removeItem(STORAGE_KEY);
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
    const u = users.find((x) => x.email.toLowerCase() === e && x.active);
    if (!u) return { ok: false, error: "No active account found for that email." };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: u.id }));
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
