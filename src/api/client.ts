// Every backend call lives here. The demo runs as one store: ShopCo.
import type { CheckClaimResult, DashboardState } from "./types";

/** "" = same origin (Vite proxies to the backend). Otherwise e.g. "http://localhost:3000". */
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const MERCHANT = "shopco";

async function request<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", "x-merchant-id": MERCHANT },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Backend unreachable. Is it running on port 3000?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export const api = {
  state: () => request<DashboardState>("/admin/state"),
  eventsUrl: `${API_BASE}/admin/events`,
  reset: () => request("/admin/reset", {}),

  checkClaim: (body: { orderId: string; claimText: string; callerQuestions: string[] }) =>
    request<CheckClaimResult>("/tools/check-claim", body),
  issueRefund: (claimId: string) => request<{ amount: number }>("/tools/issue-refund", { claimId }),

  voiceConfig: () => request<{ configured: boolean }>("/voice/config"),
  signedUrl: () => request<{ signedUrl: string }>("/voice/signed-url"),
  saveCall: (conversationId: string, claimIds: string[]) => request("/voice/calls", { conversationId, claimIds }),
};
