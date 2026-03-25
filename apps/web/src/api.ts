const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function api<T>(path: string, opts?: RequestInit & { userId?: string; staffRole?: string }): Promise<T> {
  const headers = new Headers(opts?.headers);
  headers.set("Content-Type", "application/json");
  if (opts?.userId) {
    headers.set("x-user-id", opts.userId);
  }
  if (opts?.staffRole) {
    headers.set("x-staff-role", opts.staffRole);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

