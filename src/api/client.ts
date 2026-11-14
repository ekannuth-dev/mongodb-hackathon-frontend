// Single place that talks to the backend. Every merchant-scoped call sends x-merchant-id.
import type { CheckClaimResult, DashboardState, Health, MerchantId } from "./types";

/** "" = same origin (Vite proxies to the backend). Otherwise e.g. "http://localhost:3000". */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, opts: { merchantId?: MerchantId; method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opts.merchantId) headers["x-merchant-id"] = opts.merchantId;
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, "Backend unreachable. Is it running on port 3000?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export const api = {
  health: () => request<Health>("/health"),
  state: (m: MerchantId) => request<DashboardState>("/admin/state", { merchantId: m }),
  eventsUrl: () => `${API_BASE}/admin/events`,
  reset: () => request<{ ok: boolean }>("/admin/reset", { method: "POST", body: {} }),

  checkClaim: (m: MerchantId, body: { orderId: string; claimText: string; callerQuestions?: string[] }) =>
    request<CheckClaimResult>("/tools/check-claim", { merchantId: m, body }),
  issueRefund: (m: MerchantId, claimId: string) =>
    request<{ refundId: string; amount: number; status: string }>("/tools/issue-refund", { merchantId: m, body: { claimId } }),
  recordOutcome: (m: MerchantId, claimId: string, outcome: "confirmed_scam" | "cleared") =>
    request<{ outcome: string }>("/tools/record-outcome", { merchantId: m, body: { claimId, outcome } }),
  forgetMe: (m: MerchantId, customerId: string) =>
    request<{ deleted: { memories: number; footprints: number; calls: number } }>("/tools/forget-me", { merchantId: m, body: { customerId } }),

  openDispute: (m: MerchantId, orderId: string) => request("/admin/disputes", { merchantId: m, body: { orderId } }),
  expireMemory: (m: MerchantId, id: string) => request<{ note: string }>(`/admin/memories/${id}/expire`, { merchantId: m, method: "POST", body: {} }),
  correctMemory: (m: MerchantId, id: string, text: string) =>
    request<{ version: number }>(`/admin/memories/${id}/correct`, { merchantId: m, body: { text } }),

  voiceConfig: () => request<{ configured: boolean }>("/voice/config"),
  signedUrl: () => request<{ signedUrl: string }>("/voice/signed-url"),
  saveCall: (m: MerchantId, conversationId: string, claimIds: string[]) =>
    request("/voice/calls", { merchantId: m, body: { conversationId, claimIds } }),
};
