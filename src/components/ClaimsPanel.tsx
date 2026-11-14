import type { Claim } from "../api/types";
import { ago, label, money } from "../format";

interface Props {
  claims: Claim[];
  names: Record<string, string>;
  onRefund: (claimId: string) => void;
  onOutcome: (claimId: string, outcome: "confirmed_scam" | "cleared") => void;
  onForget: (customerId: string) => void;
}

export function ClaimsPanel({ claims, names, onRefund, onOutcome, onForget }: Props) {
  return (
    <>
      <h2>Claims &amp; decisions</h2>
      {claims.length === 0 && <div className="empty">No claims yet. Start a call or simulate one.</div>}
      {claims.map((c) => {
        const who = names[c.customerId] ?? c.customerId;
        return (
          <div className="card" key={c._id} data-testid="claim">
            <div className="row">
              <strong>{who} · {c.orderId} · {money(c.amount)}</strong>
              <span>
                <span className={`pill ${c.decision}`}>{c.decision}</span> <span className={`pill ${c.status}`}>{label(c.status)}</span>
              </span>
            </div>
            <div className="quote">“{c.text}”</div>
            <div className="muted">{c.claimType} · risk {c.riskScore} · {ago(c.createdAt)}</div>
            {c.signals.length ? (
              <ul className="signals">
                {c.signals.map((s, i) => (
                  <li key={i}>
                    <b>{label(s.code)}</b>
                    {s.similarity ? ` (${s.similarity})` : ""}: {s.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted">No risk signals</div>
            )}
            <div className="actions">
              {c.status === "approved" && <button onClick={() => onRefund(c._id)}>Issue refund</button>}
              {["escalated", "approved", "refunded", "declined"].includes(c.status) && (
                <button onClick={() => onOutcome(c._id, "confirmed_scam")}>Analyst: confirm scam</button>
              )}
              {["escalated", "declined", "confirmed_scam"].includes(c.status) && (
                <button onClick={() => onOutcome(c._id, "cleared")}>Analyst: clear customer</button>
              )}
              <button onClick={() => onForget(c.customerId)}>Forget {who}</button>
            </div>
          </div>
        );
      })}
    </>
  );
}
