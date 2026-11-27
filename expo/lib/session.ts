// In-memory holder for the current session token, readable synchronously by
// the tRPC link and the upload helper. AuthContext owns persistence.

let token: string | null = null;
const listeners = new Set<() => void>();

export function getSessionToken(): string | null {
  return token;
}

export function setSessionToken(next: string | null): void {
  token = next;
}

/** Subscribe to "the server rejected our session" events. */
export function onUnauthorized(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitUnauthorized(): void {
  if (!token) return; // nothing to expire
  listeners.forEach((l) => l());
}

/** True for tRPC errors caused by a missing/expired session. */
export function isUnauthorizedError(error: unknown): boolean {
  const e = error as { data?: { code?: string; httpStatus?: number } } | null;
  return e?.data?.code === "UNAUTHORIZED" && e?.data?.httpStatus === 401;
}
