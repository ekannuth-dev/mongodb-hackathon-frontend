import type { Memory } from "../api/types";
import { label, until } from "../format";

interface Props {
  memories: Memory[];
  names: Record<string, string>;
  onCorrect: (id: string) => void;
  onExpire: (id: string) => void;
}

export function MemoryPanel({ memories, names, onCorrect, onExpire }: Props) {
  return (
    <>
      <h2>Memory</h2>
      {memories.length === 0 && <div className="empty">No memories.</div>}
      {memories.map((m) => (
        <div className="card" key={m._id} data-testid="memory">
          <div className="row">
            <strong>{label(m.type)}</strong>
            <span>
              <span className={`pill ${m.scope.level}`}>{m.scope.level === "network" ? "shared" : `private · ${m.scope.merchantId}`}</span>{" "}
              <span className={`pill ${m.status}`}>{m.status}</span>
            </span>
          </div>
          <div className="quote">“{m.text}”</div>
          <div className="muted">
            v{m.version ?? 1} · seen {m.seenCount ?? 1}× · confidence {(m.confidence ?? 0).toFixed(1)} · used in{" "}
            {m.usedInDecisions?.length ?? 0} decision(s) · expires in {until(m.expiresAt)}
            {m.scope.customerId ? ` · ${names[m.scope.customerId] ?? m.scope.customerId}` : ""}
          </div>
          {m.status === "active" && (
            <div className="actions">
              <button onClick={() => onCorrect(m._id)}>Correct</button>
              <button onClick={() => onExpire(m._id)}>Expire now</button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
