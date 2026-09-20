// ─── Types matching backend StrategyResponse ─────────────────────────────────

export interface StrategyResponse {
  id: number;
  name: string;
  code: string;
  description: string | null;
  strategy_type: string;
  timeframe: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StrategyCreate {
  name: string;
  code: string;
  description?: string;
  strategy_type: string;
  timeframe: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

export interface StrategyUpdate {
  name?: string;
  description?: string;
  strategy_type?: string;
  timeframe?: string;
  enabled?: boolean;
  parameters?: Record<string, unknown>;
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE = "http://localhost:8000/api/v1/strategies";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      body?.detail ??
      body?.message ??
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function fetchStrategies(enabledOnly = false): Promise<StrategyResponse[]> {
  const url = enabledOnly ? `${BASE}?enabled_only=true` : BASE;
  const res = await fetch(url);
  return handleResponse<StrategyResponse[]>(res);
}

export async function fetchStrategy(id: number): Promise<StrategyResponse> {
  const res = await fetch(`${BASE}/${id}`);
  return handleResponse<StrategyResponse>(res);
}

export async function createStrategy(data: StrategyCreate): Promise<StrategyResponse> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<StrategyResponse>(res);
}

export async function updateStrategy(
  id: number,
  data: StrategyUpdate,
): Promise<StrategyResponse> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<StrategyResponse>(res);
}

export async function deleteStrategy(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  return handleResponse<void>(res);
}
