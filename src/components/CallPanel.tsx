import { useEffect, useRef } from "react";
import type { CallStatus, Line } from "../hooks/useVoiceCall";

const STATUS: Record<CallStatus, string> = {
  off: "Ready",
  connecting: "Connecting…",
  listening: "Listening…",
  speaking: "Agent is speaking",
  saving: "Saving call…",
  unavailable: "Voice not set up. Run `npm run agent` in the backend",
};

interface Props {
  status: CallStatus;
  lines: Line[];
  onStart: () => void;
  onEnd: () => void;
}

export function CallPanel({ status, lines, onStart, onEnd }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [lines]);

  const inCall = status === "listening" || status === "speaking";
  const busy = status === "connecting" || status === "saving" || status === "unavailable";

  return (
    <section>
      <h2>Call</h2>
      <button className={`call ${inCall ? "end" : ""}`} disabled={busy} onClick={inCall ? onEnd : onStart}>
        {inCall ? "End call" : "Start call"}
      </button>
      <p className="status">
        <span className={`dot ${inCall ? status : ""}`} /> {STATUS[status]}
      </p>
      <div className="transcript" ref={box}>
        {lines.length === 0 ? (
          <p className="hint">Press Start call and speak as the customer.</p>
        ) : (
          lines.map((l, i) => (
            <p key={i} className={`line ${l.who}`}>
              {l.who !== "system" && <b>{l.who === "agent" ? "Agent" : "You"}</b>}
              {l.text}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
