import { useEffect, useRef } from "react";
import type { Call } from "../api/types";
import type { CallLine, CallStatus } from "../hooks/useVoiceCall";
import { ago } from "../format";

const STATUS_TEXT: Record<CallStatus, string> = {
  unconfigured: "Voice not configured. Run `npm run agent` in the backend",
  idle: "Not connected",
  connecting: "Connecting…",
  listening: "Listening",
  speaking: "Agent speaking",
  saving: "Call ended, saving transcript…",
};

interface Props {
  status: CallStatus;
  lines: CallLine[];
  active: boolean;
  onStart: () => void;
  onEnd: () => void;
  calls: Call[];
  names: Record<string, string>;
}

export function CallPanel({ status, lines, active, onStart, onEnd, calls, names }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);
  const live = active && status !== "connecting";

  return (
    <>
      <h2>Live call</h2>
      <button
        className={`call-btn ${live ? "live" : ""}`}
        disabled={status === "unconfigured" || status === "connecting" || status === "saving"}
        onClick={live ? onEnd : onStart}
      >
        {live ? "⏹ End call" : "📞 Start call"}
      </button>
      <div className="callstate">
        <span className={`dot ${status === "speaking" ? "speaking" : status === "listening" ? "listening" : ""}`} />
        <span>{STATUS_TEXT[status]}</span>
      </div>
      <div className="transcript" ref={box}>
        {lines.length === 0 ? (
          <div className="empty">Press start, allow the microphone, then speak as the caller.</div>
        ) : (
          lines.map((l, i) => (
            <div key={i} className={`msg ${l.role}`}>
              {l.role !== "tool" && <b>{l.role === "agent" ? "Agent" : "Caller"}</b>}
              {l.role === "tool" ? `⚙ ${l.text}` : l.text}
            </div>
          ))
        )}
      </div>

      <h2 className="spaced">Previous calls</h2>
      {calls.length === 0 ? (
        <div className="empty">No calls stored yet.</div>
      ) : (
        calls.map((c) => (
          <div className="card" key={c.conversationId}>
            <div className="row">
              <strong>{(c.customerId && names[c.customerId]) || "Unknown caller"}</strong>
              <span className="muted">
                {ago(c.createdAt)}
                {c.durationSecs ? ` · ${c.durationSecs}s` : ""}
              </span>
            </div>
            <div className="muted">{c.summary ?? (c.status === "done" ? "No summary" : "Processing transcript…")}</div>
            <div className="muted">
              {c.transcript.length} turns · {c.claimIds.length} claim(s) · kept 30 days
            </div>
          </div>
        ))
      )}
    </>
  );
}
