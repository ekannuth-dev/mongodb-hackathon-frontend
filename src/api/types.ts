// Shapes returned by the mongodb-hackathon backend. Keep in sync with backend/src/routes/*.

export type MerchantId = "shopco" | "gadgetbarn";
export type Decision = "APPROVE" | "ESCALATE" | "DECLINE";
export type ClaimStatus = "approved" | "escalated" | "declined" | "refunded" | "confirmed_scam" | "cleared";
export type MemoryType = "scam_script" | "probe_phrase" | "suspect_account" | "cleared_customer";

export interface Signal {
  code: string;
  detail: string;
  weight?: number;
  hardStop?: boolean;
  similarity?: number;
  memoryId?: string;
}

export interface Order {
  _id: string;
  customerId: string;
  item: { sku: string; name: string; weightKg: number };
  amount: number;
  delivery: { status: string; photo: boolean };
}

export interface Claim {
  _id: string;
  orderId: string;
  customerId: string;
  amount: number;
  claimType: string;
  text: string;
  decision: Decision;
  riskScore: number;
  signals: Signal[];
  status: ClaimStatus;
  createdAt: string;
}

export interface Memory {
  _id: string;
  type: MemoryType;
  scope: { level: "network" | "merchant"; merchantId?: string; customerId?: string };
  text: string;
  status: "active" | "superseded" | "revoked";
  version?: number;
  seenCount?: number;
  confidence?: number;
  usedInDecisions?: string[];
  expiresAt: string;
  createdAt: string;
}

export interface Call {
  conversationId: string;
  customerId: string | null;
  claimIds: string[];
  status: string;
  durationSecs: number | null;
  summary: string | null;
  transcript: { role: string; text: string }[];
  createdAt: string;
}

export interface DashboardState {
  merchantId: MerchantId;
  orders: Order[];
  customers: { _id: string; name: string }[];
  claims: Claim[];
  refunds: { orderId: string; amount: number }[];
  disputes: { orderId: string; status: string }[];
  memories: Memory[];
  calls: Call[];
  stats: { refunded: number; stopped: number; claims: number };
}

export interface CheckClaimResult {
  claimId: string;
  decision: Decision;
  riskScore: number;
  escalateAt: number;
  claimType: string;
  order: { id: string; item: string; amount: number };
  signals: Signal[];
  previousContacts: { createdAt: string; summary: string | null }[];
  agentGuidance: string;
}

export interface Health {
  ok: boolean;
  db: string;
  embeddings: string;
}
