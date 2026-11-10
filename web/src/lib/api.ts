"use client";

// Typed client for api/ROUTES.md. The whole web app is client-rendered and
// talks to the API straight from the browser: the API's bearer check is the
// only authorization boundary.

import type {
  AuthResponse,
  ImportResult,
  Link,
  LinkInput,
  Member,
  Task,
  TaskInput,
  TaskPatch,
  Today,
  TokenPair,
  User,
  Workstream,
  WorkstreamDetail,
  WorkstreamFilter,
  WorkstreamInput,
  WorkstreamPatch,
  WorkstreamSummary,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Error body per ROUTES.md: `{ error: "<snake_case_code>", message: "<human text>" }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const COPY: Record<string, string> = {
  invalid_credentials: "That email and password don't match.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
  session_expired: "Your session has ended. Please sign in again.",
};

/** Human message for any thrown value. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (Object.prototype.hasOwnProperty.call(COPY, e.code)) return COPY[e.code];
    if (e.status === 429) return COPY.rate_limited;
    if (e.status === 404) return "Not found. It may have been deleted.";
    if (e.message && e.message !== e.code) return e.message;
    return "Something went wrong. Try again.";
  }
  if (e instanceof TypeError) return "Couldn't reach the server. Check your connection and try again.";
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong. Try again.";
}

// ---- tokens ----

const ACCESS_KEY = "lo_access_token";
const REFRESH_KEY = "lo_refresh_token";
const TOKEN_EVENT = "lo-tokens";

export function getTokens() {
  if (typeof window === "undefined") return { access: null, refresh: null };
  try {
    return {
      access: window.localStorage.getItem(ACCESS_KEY),
      refresh: window.localStorage.getItem(REFRESH_KEY),
    };
  } catch {
    return { access: null, refresh: null };
  }
}

export function setTokens(access: string, refresh: string) {
  try {
    window.localStorage.setItem(ACCESS_KEY, access);
    window.localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage blocked: the session just won't survive a reload */
  }
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function clearTokens() {
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

/** Subscribe to token changes in this tab and others (for useSyncExternalStore). */
export function subscribeTokens(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(TOKEN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TOKEN_EVENT, onChange);
  };
}

// One refresh in flight at a time: refresh tokens rotate, so two parallel 401s
// each spending the same refresh token would log the user out.
let refreshing: Promise<string | null> | null = null;

function refreshTokens(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const { refresh } = getTokens();
    if (!refresh) {
      clearTokens();
      return null;
    }
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = (await res.json()) as TokenPair;
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function toError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
  const code = body?.error ?? "request_failed";
  return new ApiError(res.status, code, body?.message ?? code);
}

type Opts = { method?: string; body?: unknown; auth?: boolean };

async function call<T>(path: string, { method = "GET", body, auth = true }: Opts = {}): Promise<T> {
  const send = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        // Only when there IS a body: Fastify rejects a declared-JSON empty body.
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(auth && token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send(auth ? getTokens().access : null);
  if (auth && res.status === 401) {
    // Refresh once, then retry once. If the refresh fails the tokens are
    // cleared, which makes the AppShell redirect to /login.
    const fresh = await refreshTokens();
    if (!fresh) throw new ApiError(401, "session_expired", COPY.session_expired);
    res = await send(fresh);
  }
  if (!res.ok) throw await toError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const enc = encodeURIComponent;

// ---- auth ----

export async function login(b: { email: string; password: string }) {
  const r = await call<AuthResponse>("/auth/login", { method: "POST", body: b, auth: false });
  setTokens(r.accessToken, r.refreshToken);
  return r;
}
export async function logout() {
  const { refresh } = getTokens();
  try {
    if (refresh) await call<void>("/auth/logout", { method: "POST", body: { refreshToken: refresh }, auth: false });
  } finally {
    clearTokens();
  }
}
/** → 204 always (no account enumeration). The email links to /reset-password?token=… */
export const requestPasswordReset = (email: string) =>
  call<void>("/auth/password-reset/request", { method: "POST", body: { email }, auth: false });
export const confirmPasswordReset = (token: string, password: string) =>
  call<void>("/auth/password-reset/confirm", { method: "POST", body: { token, password }, auth: false });

// ---- me / household ----

export const getMe = () => call<User>("/me");
export const updateMe = (b: { name?: string; timezone?: string; digestEnabled?: boolean }) =>
  call<User>("/me", { method: "PATCH", body: b });
export const changePassword = (currentPassword: string, newPassword: string) =>
  call<void>("/me/password", { method: "POST", body: { currentPassword, newPassword } });
export const getMembers = () => call<Member[]>("/members");

// ---- workstreams ----

export const listWorkstreams = (status?: WorkstreamFilter) =>
  call<WorkstreamSummary[]>(`/workstreams${status ? `?status=${enc(status)}` : ""}`);
export const createWorkstream = (b: WorkstreamInput) => call<Workstream>("/workstreams", { method: "POST", body: b });
export const getWorkstream = (id: string) => call<WorkstreamDetail>(`/workstreams/${enc(id)}`);
export const updateWorkstream = (id: string, b: WorkstreamPatch) =>
  call<Workstream>(`/workstreams/${enc(id)}`, { method: "PATCH", body: b });
export const deleteWorkstream = (id: string) => call<void>(`/workstreams/${enc(id)}`, { method: "DELETE" });

// ---- tasks ----

export const createTask = (workstreamId: string, b: TaskInput) =>
  call<Task>(`/workstreams/${enc(workstreamId)}/tasks`, { method: "POST", body: b });
export const updateTask = (id: string, b: TaskPatch) => call<Task>(`/tasks/${enc(id)}`, { method: "PATCH", body: b });
export const deleteTask = (id: string) => call<void>(`/tasks/${enc(id)}`, { method: "DELETE" });

// ---- links ----

export const createLink = (workstreamId: string, b: LinkInput) =>
  call<Link>(`/workstreams/${enc(workstreamId)}/links`, { method: "POST", body: b });
export const deleteLink = (id: string) => call<void>(`/links/${enc(id)}`, { method: "DELETE" });

// ---- today / import ----

export const getToday = () => call<Today>("/today");
export const importCsv = (csv: string, dryRun: boolean) =>
  call<ImportResult>("/import/csv", { method: "POST", body: { csv, dryRun } });
