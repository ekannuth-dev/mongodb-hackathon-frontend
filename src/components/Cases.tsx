import type { Claim, DashboardState, Signal } from "../api/types";

const OUTCOME: Record<string, { label: string; tone: string }> = {
  refunded: { label: "Refunded", tone: "good" },
  approved: { label: "Approved", tone: "good" },
  escalated: { label: "Flagged · sent to specialist", tone: "warn" },
  declined: { label: "Declined", tone: "bad" },
};

// Plain-English titles for the reasons the backend returns.
const REASON: Record<string, string> = {
  same_story_linked_account: "Same story as another caller",
  delivery_contradiction: "Delivery records disagree",
  repeat_claims: "Has claimed before",
  script_match: "Matches a known scam story",
  policy_probing: "Asked about refund loopholes",
  linked_to_escalated: "Linked to a flagged account",
  linked_to_confirmed_scam: "Linked to a confirmed scam",
  already_refunded: "This order was already refunded",
  open_chargeback: "Bank dispute already open",
};

const DAY = 24 * 60 * 60 * 1000;
const time = (d: string) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function Cases({ state }: { state: DashboardState | null }) {
  if (!state) return <section><h2>Cases</h2><p className="hint">Loading…</p></section>;

  const name = (id: string) => state.customers.find((c) => c._id === id)?.name ?? id;
  const item = (orderId: string) => state.orders.find((o) => o._id === orderId)?.item.name ?? orderId;
  const today = state.claims.filter((c) => Date.now() - new Date(c.createdAt).getTime() < DAY);

  return (
    <section>
      <h2>Cases</h2>
      {today.length === 0 && <p className="hint">No calls yet. Start a call as the first customer (order 2058).</p>}
      {today.map((c) => {
        const outcome = OUTCOME[c.status] ?? { label: c.status, tone: "" };
        return (
          <article key={c._id} className="case">
            <header>
              <div>
                <strong>{name(c.customerId)}</strong>
                <span className="meta"> · order {c.orderId.replace("ord_", "")} · {item(c.orderId)} · ${c.amount} · {time(c.createdAt)}</span>
              </div>
              <span className={`badge ${outcome.tone}`}>{outcome.label}</span>
            </header>
            <p className="quote">“{c.text}”</p>
            {c.decision !== "APPROVE" && <SpecialistNotes claim={c} state={state} />}
          </article>
        );
      })}
    </section>
  );
}

/** What the specialist needs: the story match (vector search), other reasons, and the previous call. */
function SpecialistNotes({ claim, state }: { claim: Claim; state: DashboardState }) {
  const storyMatch = claim.signals.find((s) => s.match);
  const others = claim.signals.filter((s) => s !== storyMatch);
  const previousCall = state.calls.find((c) => c.customerId === claim.customerId && c.summary && c.createdAt < claim.createdAt);

  return (
    <div className="notes">
      <h3>Why this was flagged</h3>
      {storyMatch && <StoryMatch claim={claim} signal={storyMatch} />}
      <ul>
        {others.map((s) => (
          <li key={s.code}>
            <b>{REASON[s.code] ?? s.code}.</b> {s.detail}
          </li>
        ))}
        {previousCall?.summary && (
          <li>
            <b>Previous call:</b> {previousCall.summary}
          </li>
        )}
      </ul>
    </div>
  );
}

/** Side-by-side: this caller's words vs. the earlier caller's story that vector search matched. */
function StoryMatch({ claim, signal }: { claim: Claim; signal: Signal }) {
  const m = signal.match!;
  const pct = Math.round((signal.similarity ?? 0) * 100);
  return (
    <div className="match">
      <p className="match-title">
        <b>{REASON[signal.code]}</b>: matched by meaning with MongoDB Atlas Vector Search
      </p>
      <div className="compare">
        <div>
          <span className="who">This caller</span>
          <p>“{claim.text}”</p>
        </div>
        <div>
          <span className="who">{m.name} · order {m.orderId.replace("ord_", "")} · refunded earlier</span>
          <p>“{m.text}”</p>
        </div>
      </div>
      <div className="meter" aria-label={`${pct}% similar in meaning`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="match-foot">
        {pct}% similar in meaning · different name · shares {m.sharedOn.join(" + ")}
      </p>
    </div>
  );
}
