import { useCallback, useMemo, useState } from "react";
import { api } from "./api/client";
import type { MerchantId } from "./api/types";
import { useLiveState } from "./hooks/useLiveState";
import { useVoiceCall } from "./hooks/useVoiceCall";
import { Header } from "./components/Header";
import { CallPanel } from "./components/CallPanel";
import { SimulatePanel } from "./components/SimulatePanel";
import { ClaimsPanel } from "./components/ClaimsPanel";
import { MemoryPanel } from "./components/MemoryPanel";
import { money } from "./format";

export default function App() {
  const [merchantId, setMerchantId] = useState<MerchantId>("shopco");
  const [toast, setToast] = useState<string | null>(null);
  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 4000);
  }, []);

  const { state, health, error, live, reload } = useLiveState(merchantId);
  const call = useVoiceCall(merchantId, notify);
  const names = useMemo(() => Object.fromEntries((state?.customers ?? []).map((c) => [c._id, c.name])), [state]);

  /** Run an action, show its message (or error), then refresh. */
  const act = (fn: () => Promise<string | void>) => async () => {
    try {
      const msg = await fn();
      if (msg) notify(msg);
    } catch (e) {
      notify((e as Error).message);
    }
    await reload();
  };

  return (
    <>
      <Header state={state} health={health} live={live} merchantId={merchantId} onMerchant={setMerchantId}
        onReset={act(async () => { await api.reset(); return "Demo data reset"; })} />
      {error && <div className="banner">⚠ {error}</div>}
      <main>
        <section>
          <CallPanel status={call.status} lines={call.lines} active={call.active} onStart={call.start} onEnd={call.end}
            calls={state?.calls ?? []} names={names} />
          <hr />
          <SimulatePanel merchantId={merchantId} orders={state?.orders ?? []} names={names}
            onCheck={(orderId, claimText, q) => act(async () => {
              const r = await api.checkClaim(merchantId, { orderId, claimText, callerQuestions: q.trim() ? [q.trim()] : [] });
              return `${r.decision}: ${r.agentGuidance}`;
            })()}
            onDispute={(orderId) => act(async () => { await api.openDispute(merchantId, orderId); return `Chargeback opened on ${orderId}`; })()} />
        </section>
        <section>
          <ClaimsPanel claims={state?.claims ?? []} names={names}
            onRefund={(id) => act(async () => `Refunded ${money((await api.issueRefund(merchantId, id)).amount)}`)()}
            onOutcome={(id, o) => act(async () => {
              await api.recordOutcome(merchantId, id, o);
              return o === "cleared" ? "Customer cleared, memory updated" : "Scam confirmed, memory written";
            })()}
            onForget={(cust) => act(async () => {
              const r = await api.forgetMe(merchantId, cust);
              return `Forgot customer: ${r.deleted.memories} memories, ${r.deleted.footprints} footprints, ${r.deleted.calls} calls deleted; records kept`;
            })()} />
        </section>
        <section>
          <MemoryPanel memories={state?.memories ?? []} names={names}
            onExpire={(id) => act(async () => (await api.expireMemory(merchantId, id)).note)()}
            onCorrect={(id) => act(async () => {
              const text = window.prompt("Corrected memory text:");
              if (!text) return;
              return `Saved as v${(await api.correctMemory(merchantId, id, text)).version}; old version superseded`;
            })()} />
        </section>
      </main>
      <div className={`toast ${toast ? "show" : ""}`} role="status">{toast}</div>
    </>
  );
}
