// Dashboard state, kept live: the backend streams MongoDB change events over SSE and we refetch.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { DashboardState, Health, MerchantId } from "../api/types";

export function useLiveState(merchantId: MerchantId) {
  const [state, setState] = useState<DashboardState | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const reload = useCallback(async () => {
    try {
      setState(await api.state(merchantId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [merchantId]);

  useEffect(() => {
    api.health().then(setHealth).catch((e) => setError((e as Error).message));
    reload();
    const events = new EventSource(api.eventsUrl());
    events.onopen = () => setLive(true);
    events.onerror = () => setLive(false); // EventSource reconnects on its own
    events.onmessage = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(reload, 250); // batch bursts of changes
    };
    return () => {
      events.close();
      clearTimeout(timer.current);
    };
  }, [reload]);

  return { state, health, error, live, reload };
}
