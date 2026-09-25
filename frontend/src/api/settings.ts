export interface BreezeSessionStatus {
  configured: boolean;
  last_four: string | null;
}

const BASE = "http://localhost:8000/api/v1/settings";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBreezeSessionStatus(): Promise<BreezeSessionStatus> {
  const response = await fetch(`${BASE}/breeze-session`);
  return handleResponse<BreezeSessionStatus>(response);
}

export async function updateBreezeSession(breeze_session: string): Promise<BreezeSessionStatus> {
  const response = await fetch(`${BASE}/breeze-session`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ breeze_session }),
  });
  return handleResponse<BreezeSessionStatus>(response);
}