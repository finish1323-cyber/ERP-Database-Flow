import { useEffect, useState } from "react";
import { getAuthToken, subscribeAuth, clearAuth } from "@/lib/auth";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; token: string }
  | { status: "unauthenticated" };

const BASE = import.meta.env.BASE_URL;

async function validateToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}api/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      clearAuth();
      return false;
    }
    return res.ok;
  } catch {
    return false;
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
      validateToken(token).then((valid) => {
        if (cancelled) return;
        if (valid) {
          setState({ status: "authenticated", token });
        } else {
          setState({ status: "unauthenticated" });
        }
      });
    }

    // Validate whatever token exists (or not) at mount time.
    applyToken(getAuthToken());

    // Always subscribe so future login/logout changes propagate.
    const unsubscribe = subscribeAuth(applyToken);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
