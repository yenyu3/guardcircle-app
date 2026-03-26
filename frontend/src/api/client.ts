// 後端 API Gateway base URL
// 部署後從 terraform output api_base_url 取得，填入此處
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://36qs88vfva.execute-api.us-east-1.amazonaws.com";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (path === "/analysis" && options?.body) {
    const payload = JSON.parse(options.body as string);
    console.log("[API] → /analysis payload:", JSON.stringify(payload, null, 2));
  }
  if (path === "/uploads/presign" && options?.body) {
    console.log("[API] → /uploads/presign payload:", options.body);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (path === "/analysis") console.log("[API] ← /analysis", res.status, json);
  if (path === "/uploads/presign") console.log("[API] ← /uploads/presign", res.status, json);
  // 503/202 on /analysis are handled by retry logic in store, not treated as errors
  if (!res.ok && !(path === "/analysis" && (res.status === 503 || res.status === 202))) {
    throw new ApiError(res.status, json.error ?? "Unknown error");
  }
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  putRaw: (url: string, body: Blob | ArrayBuffer, headers?: Record<string, string>) =>
    fetch(url, { method: "PUT", body, headers }),
};
