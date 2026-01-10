// HTTP client utilities for external API calls

export interface HttpResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

export async function fetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<HttpResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/json",
      "User-Agent": "Healthcare-MCP-Server/1.0.0",
      ...options?.headers,
    },
  });

  const data = await response.json() as T;

  return {
    data,
    status: response.status,
    ok: response.ok,
  };
}

export function buildQueryString(params: Record<string, string | number | undefined>): string {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  
  return filtered.length > 0 ? `?${filtered.join("&")}` : "";
}
