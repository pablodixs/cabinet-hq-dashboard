const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

type ApiErrorBody = { code?: string; message?: string; fieldErrors?: Record<string, string> };
type CsrfToken = { token: string; headerName: string };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function readError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};
  try { body = await response.json() as ApiErrorBody; } catch { /* infrastructure response may not be JSON */ }
  return new ApiError(body.message || "Não foi possível concluir a solicitação.", response.status, body.code);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError(`Não foi possível conectar à API (${API_URL}).`, 0, "NETWORK_ERROR");
  }
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function apiMutation<T>(path: string, init: RequestInit): Promise<T> {
  const csrf = await apiRequest<CsrfToken>("/v1/auth/csrf");
  const headers = new Headers(init.headers);
  headers.set(csrf.headerName, csrf.token);
  return apiRequest<T>(path, { ...init, headers });
}

export function apiMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Não foi possível concluir a operação.";
}
