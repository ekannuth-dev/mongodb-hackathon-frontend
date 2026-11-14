// Live voice call with the ElevenLabs agent. The agent's tools run here and call our backend;
// the agent only receives the decision and what to say, never the reasons behind it.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation } from "@elevenlabs/client";
import { api } from "../api/client";

export type Line = { who: "agent" | "caller" | "system"; text: string };
export type CallStatus = "off" | "connecting" | "listening" | "speaking" | "saving" | "unavailable";

export function useVoiceCall(onError: (msg: string) => void) {
  const [status, setStatus] = useState<CallStatus>("off");
  const [lines, setLines] = useState<Line[]>([]);
  const convo = useRef<Conversation | null>(null);
  const claimIds = useRef<string[]>([]);
  const add = (line: Line) => setLines((l) => [...l, line]);

  useEffect(() => {
    api.voiceConfig().then((c) => !c.configured && setStatus("unavailable")).catch(() => {});
  }, []);

  const finish = useCallback(async () => {
    const c = convo.current;
    if (!c) return;
    convo.current = null;
    setStatus("saving");
    await api.saveCall(c.getId(), claimIds.current).catch((e) => onError(e.message));
    setStatus("off");
  }, [onError]);

  const tools = {
    check_claim: async (p: { order_number: string; claim_text: string; caller_questions?: string }) => {
      add({ who: "system", text: `Checking order ${p.order_number}…` });
      try {
        const callerQuestions = (p.caller_questions ?? "").split("|").map((q) => q.trim()).filter(Boolean);
        const r = await api.checkClaim({ orderId: String(p.order_number), claimText: p.claim_text, callerQuestions });
        claimIds.current.push(r.claimId);
        return JSON.stringify({ claimId: r.claimId, decision: r.decision, item: r.order.item, amount: r.order.amount, previousContacts: r.previousContacts, agentGuidance: r.agentGuidance });
      } catch (e) {
        return JSON.stringify({ error: (e as Error).message });
      }
    },
    issue_refund: async (p: { claim_id: string }) => {
      try {
        const r = await api.issueRefund(p.claim_id);
        add({ who: "system", text: `Refunded $${r.amount}` });
        return JSON.stringify({ ok: true, amount: r.amount });
      } catch (e) {
        return JSON.stringify({ ok: false, error: (e as Error).message });
      }
    },
  };

  const start = useCallback(async () => {
    setStatus("connecting");
    setLines([]);
    claimIds.current = [];
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const [{ signedUrl }, { Conversation, stripAudioTags }] = await Promise.all([api.signedUrl(), import("@elevenlabs/client")]);
      convo.current = await Conversation.startSession({
        signedUrl,
        clientTools: tools,
        onConnect: () => setStatus("listening"),
        onDisconnect: () => void finish(),
        onModeChange: ({ mode }) => setStatus(mode === "speaking" ? "speaking" : "listening"),
        // stripAudioTags removes voice-style hints like "[warm]" from the agent's text.
        onMessage: ({ source, message }) => message && add({ who: source === "ai" ? "agent" : "caller", text: stripAudioTags(message) }),
        onError: (msg) => onError(msg),
      });
    } catch (e) {
      onError((e as Error).message);
      setStatus("off");
    }
  }, [finish, onError]);

  const end = useCallback(async () => {
    await convo.current?.endSession();
    await finish();
  }, [finish]);

  useEffect(() => {
    return () => {
      void convo.current?.endSession();
    };
  }, []);

  return { status, lines, start, end };
}
