const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function staffApi<T>(path: string, userId: string, staffRole: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-staff-role": staffRole
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

