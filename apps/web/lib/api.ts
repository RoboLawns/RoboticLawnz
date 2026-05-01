import { env } from "./env";

/**
 * Thin fetch wrapper for the Robotic Lawnz API.
 *
 * - Sends `credentials: "include"` so the anonymous session cookie rides
 *   along on every request (anonymous-user fallback).
 * - When a Clerk `getToken` resolver is provided (authenticated contexts) the
 *   resulting JWT is sent as `Authorization: Bearer <token>`.  The backend
 *   prefers the Bearer token and falls back to the cookie session.
 * - Throws `ApiError` on non-2xx responses with the parsed body when present.
 */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /**
   * Optional Clerk `getToken` resolver.  Pass the value returned by
   * `useAuth().getToken` when calling from a Client Component.  When present,
   * a Bearer token is attached; when absent the request is anonymous.
   */
  getToken?: () => Promise<string | null>;
};

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { getToken, ...fetchOpts } = opts;

  const url = path.startsWith("http") ? path : `${env.NEXT_PUBLIC_API_BASE_URL}${path}`;
  const headers = new Headers(fetchOpts.headers);

  if (fetchOpts.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  // Attach Bearer token when an authenticated context is available.
  if (getToken) {
    const token = await getToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(url, {
    ...fetchOpts,
    credentials: "include",
    headers,
    body: fetchOpts.body === undefined ? undefined : JSON.stringify(fetchOpts.body),
  });

  const contentType = res.headers.get("content-type") ?? "";
  const parsed = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      typeof parsed === "object" && parsed !== null && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, parsed);
  }
  return parsed as T;
}
