const TOKEN_KEY = "smachs_token";
const USER_KEY  = "smachs_user";

export type AuthUser = {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── API calls ────────────────────────────────────────────────────────────────

const API = "/api/auth";

export async function login(username: string, password: string) {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Login failed");
  }
  saveSession(data.token, data.user);
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await fetch(`${API}/me`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Not authenticated");
  return data.user;
}

export async function logout() {
  try {
    await fetch(`${API}/logout`, { method: "POST", headers: authHeaders() });
  } finally {
    clearSession();
  }
}

// ─── Admin: user management ───────────────────────────────────────────────────

export async function listUsers(): Promise<AuthUser[]> {
  const res = await fetch(`${API}/users`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to list users");
  return data.users;
}

export async function createUser(payload: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  role?: "admin" | "user";
}) {
  const res = await fetch(`${API}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create user");
  return data.user;
}

export async function updateUser(
  id: string,
  payload: Partial<{ displayName: string; email: string; password: string; isActive: boolean; role: string }>
) {
  const res = await fetch(`${API}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update user");
  return data.user;
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API}/users/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete user");
}
