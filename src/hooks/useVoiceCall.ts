// Live voice call with the ElevenLabs agent. Client tools run here and call our backend;
// the agent only ever receives the decision and what to say, never fraud signals.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation } from "@elevenlabs/client";
import { api } from "../api/client";
import type { MerchantId } from "../api/types";

export type CallLine = { role: "agent" | "caller" | "tool"; text: string };
export type CallStatus = "unconfigured" | "idle" | "connecting" | "listening" | "speaking" | "saving";

export function useVoiceCall(merchantId: MerchantId, notify: (msg: string) => void) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [lines, setLines] = useState<CallLine[]>([]);
  const convo = useRef<Conversation | null>(null);
  const claimIds = useRef<string[]>([]);
  const ending = useRef(false);

  const add = (line: CallLine) => setLines((l) => [...l, line]);

  useEffect(() => {
    api.voiceConfig().then((c) => !c.configured && setStatus("unconfigured")).catch(() => {});
  }, []);

  const finish = useCallback(async () => {
    const c = convo.current;
    if (!c || ending.current) return;
    ending.current = true;
    convo.current = null;
    setStatus("saving");
    try {
      await api.saveCall(merchantId, c.getId(), claimIds.current);
    } catch (e) {
      notify(`Couldn't save call: ${(e as Error).message}`);
    }
    setStatus("idle");
    ending.current = false;
  }, [merchantId, notify]);

  const start = useCallback(async () => {
    setStatus("connecting");
    setLines([]);
    claimIds.current = [];
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const [{ signedUrl }, { Conversation }] = await Promise.all([api.signedUrl(), import("@elevenlabs/client")]);
      convo.current = await Conversation.startSession({
        signedUrl,
        clientTools: {
          check_claim: async (p: { order_number: string; claim_text: string; caller_questions?: string }) => {
            add({ role: "tool", text: `checking claim on order ${p.order_number}…` });
            try {
              const callerQuestions = (p.caller_questions ?? "").split("|").map((q) => q.trim()).filter(Boolean).slice(0, 5);
              const r = await api.checkClaim(merchantId, { orderId: String(p.order_number), claimText: p.claim_text, callerQuestions });
              claimIds.current.push(r.claimId);
              add({ role: "tool", text: `${r.decision} (risk ${r.riskScore}/${r.escalateAt})` });
              return JSON.stringify({ claimId: r.claimId, decision: r.decision, item: r.order.item, amount: r.order.amount, previousContacts: r.previousContacts, agentGuidance: r.agentGuidance });
            } catch (e) {
              add({ role: "tool", text: `error: ${(e as Error).message}` });
              return JSON.stringify({ error: (e as Error).message });
            }
          },
          issue_refund: async (p: { claim_id: string }) => {
            add({ role: "tool", text: "issuing refund…" });
            try {
              const r = await api.issueRefund(merchantId, p.claim_id);
              add({ role: "tool", text: `refunded $${r.amount}` });
              return JSON.stringify({ ok: true, amount: r.amount });
            } catch (e) {
              add({ role: "tool", text: `refused: ${(e as Error).message}` });
              return JSON.stringify({ ok: false, error: (e as Error).message });
            }
          },
        },
        onConnect: () => setStatus("listening"),
        onDisconnect: () => void finish(),
        onModeChange: ({ mode }) => setStatus(mode === "speaking" ? "speaking" : "listening"),
        onMessage: ({ source, message }) => message && add({ role: source === "ai" ? "agent" : "caller", text: message }),
        onError: (msg) => notify(`Voice error: ${msg}`),
      });
    } catch (e) {
      notify((e as Error).message);
      convo.current = null;
      setStatus("idle");
    }
  }, [merchantId, notify, finish]);

  const end = useCallback(async () => {
    await convo.current?.endSession();
    await finish();
  }, [finish]);

  useEffect(() => () => void convo.current?.endSession(), []);

  return { status, lines, start, end, active: Boolean(convo.current) || status === "connecting" };
}
