// Shapes returned by the mongodb-hackathon backend (only the fields this UI uses).

export type Decision = "APPROVE" | "ESCALATE" | "DECLINE";

export interface Signal {
  code: string;
  detail: string;
  similarity?: number;
  /** Present on "same_story_linked_account": the earlier story vector search matched. */
  match?: { name: string; orderId: string; text: string; sharedOn: string[] };
}

export interface Order {
  _id: string;
  item: { name: string };
  amount: number;
}

export interface Claim {
  _id: string;
  orderId: string;
  customerId: string;
  amount: number;
  text: string;
  decision: Decision;
  status: string;
  signals: Signal[];
  createdAt: string;
}

export interface Call {
  conversationId: string;
  customerId: string | null;
  summary: string | null;
  createdAt: string;
}

export interface DashboardState {
  orders: Order[];
  customers: { _id: string; name: string }[];
  claims: Claim[];
  calls: Call[];
}

export interface CheckClaimResult {
  claimId: string;
  decision: Decision;
  order: { item: string; amount: number };
  previousContacts: { summary: string | null }[];
  agentGuidance: string;
}
