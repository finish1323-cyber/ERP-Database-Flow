const TOKEN_STORAGE_KEY = "erp.auth.token";

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return readToken();
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
  for (const listener of listeners) {
    listener(token);
  }
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function clearAuth(): void {
  setAuthToken(null);
}

export interface LoginResponse {
  token: string;
  role: string;
  name: string;
}

export async function loginWithCredentials(email: string, password: string): Promise<LoginResponse> {
  const base = import.meta.env.BASE_URL;
  const url = `${base}api/auth/login`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    let message = "تعذر تسجيل الدخول. حاول مرة أخرى.";
    try {
      const data = await response.json();
      if (typeof data?.message === "string") message = data.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  const data = (await response.json()) as LoginResponse;
  if (!data?.token) throw new Error("استجابة الخادم غير صالحة.");
  setAuthToken(data.token);
  return data;
}

/** @deprecated use loginWithCredentials */
export async function loginWithPassword(password: string): Promise<void> {
  await loginWithCredentials("", password);
}
