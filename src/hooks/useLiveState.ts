// Dashboard data, kept live: the backend streams MongoDB changes over SSE and we refetch.
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { DashboardState } from "../api/types";

export function useLiveState() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const reload = useCallback(async () => {
    try {
      setState(await api.state());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    reload();
    let timer: ReturnType<typeof setTimeout>;
    const events = new EventSource(api.eventsUrl);
    events.onopen = () => setLive(true);
    events.onerror = () => setLive(false); // reconnects on its own
    events.onmessage = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 250);
    };
    return () => {
      events.close();
      clearTimeout(timer);
    };
  }, [reload]);

  return { state, error, live, reload };
}
