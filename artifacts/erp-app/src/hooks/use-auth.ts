import { useEffect, useState } from "react";
import { getAuthToken, subscribeAuth, clearAuth } from "@/lib/auth";

export type UserRole = "admin" | "purchasing" | "sales" | "warehouse";

export interface AuthInfo {
  sub: string;
  role: UserRole;
  name: string;
  employeeId: number | null;
  exp: number;
}

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; token: string; info: AuthInfo }
  | { status: "unauthenticated" };

const BASE = import.meta.env.BASE_URL;

async function validateToken(token: string): Promise<AuthInfo | null> {
  try {
    const res = await fetch(`${BASE}api/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      clearAuth();
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json() as { authenticated: boolean; sub: string; role: string; name: string; employeeId: number | null; exp: number };
    if (!data.authenticated) return null;
    return {
      sub: data.sub,
      role: (data.role as UserRole) || "sales",
      name: data.name || "",
      employeeId: data.employeeId ?? null,
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(() => {
    const token = getAuthToken();
    return token ? { status: "loading" } : { status: "unauthenticated" };
  });

  useEffect(() => {
    let cancelled = false;

    function applyToken(token: string | null) {
      if (cancelled) return;
      if (!token) {
        setState({ status: "unauthenticated" });
        return;
      }
      setState({ status: "loading" });
      validateToken(token).then((info) => {
        if (cancelled) return;
        if (info) {
          setState({ status: "authenticated", token, info });
        } else {
          setState({ status: "unauthenticated" });
        }
      });
    }

    applyToken(getAuthToken());
    const unsubscribe = subscribeAuth(applyToken);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
