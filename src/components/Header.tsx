import type { DashboardState, Health, MerchantId } from "../api/types";
import { money } from "../format";

interface Props {
  state: DashboardState | null;
  health: Health | null;
  live: boolean;
  merchantId: MerchantId;
  onMerchant: (m: MerchantId) => void;
  onReset: () => void;
}

export function Header({ state, health, live, merchantId, onMerchant, onReset }: Props) {
  const activeMemories = state?.memories.filter((m) => m.status === "active").length ?? 0;
  return (
    <header>
      <div>
        <h1>Refund Guard</h1>
        <div className="muted">
          <span className={`dot ${live ? "listening" : ""}`} /> {live ? "Live" : "Offline"} · backend{" "}
          {health ? `${health.db} · ${health.embeddings} embeddings` : "not connected"}
        </div>
      </div>
      <div className="stats">
        <Stat value={money(state?.stats.refunded ?? 0)} label="refunded" />
        <Stat value={money(state?.stats.stopped ?? 0)} label="scam $ stopped" />
        <Stat value={String(activeMemories)} label="active memories" />
      </div>
      <div className="controls">
        <select aria-label="Merchant" value={merchantId} onChange={(e) => onMerchant(e.target.value as MerchantId)}>
          <option value="shopco">ShopCo</option>
          <option value="gadgetbarn">GadgetBarn</option>
        </select>
        <button onClick={onReset}>Reset demo</button>
      </div>
    </header>
  );
}

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="stat">
    <b>{value}</b>
    <span>{label}</span>
  </div>
);
