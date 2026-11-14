import { useCallback, useState } from "react";
import { api } from "./api/client";
import { useLiveState } from "./hooks/useLiveState";
import { useVoiceCall } from "./hooks/useVoiceCall";
import { CallPanel } from "./components/CallPanel";
import { Cases } from "./components/Cases";

export default function App() {
  const [message, setMessage] = useState<string | null>(null);
  const showError = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const { state, error, live, reload } = useLiveState();
  const call = useVoiceCall(showError);

  const reset = async () => {
    await api.reset().catch((e) => showError(e.message));
    await reload();
  };

  return (
    <>
      <header className="top">
        <h1>Refund Guard</h1>
        <span className="live">
          <span className={`dot ${live ? "listening" : ""}`} /> {live ? "Connected" : "Offline"}
        </span>
        <button className="reset" onClick={reset}>Reset demo</button>
      </header>
      {(error || message) && <p className="banner">{error ?? message}</p>}
      <main>
        <CallPanel status={call.status} lines={call.lines} onStart={call.start} onEnd={call.end} />
        <Cases state={state} />
      </main>
    </>
  );
}
