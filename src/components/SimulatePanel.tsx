import { useEffect, useState } from "react";
import type { MerchantId, Order } from "../api/types";
import { money } from "../format";

const PRESETS: Record<MerchantId, { label: string; order: string; claim: string; q: string }[]> = {
  shopco: [
    { label: "Jake: never arrived", order: "ord_1042", claim: "Yeah the headphones just never turned up at my place", q: "Can you just refund it without me sending anything back?" },
    { label: "Maria: empty box", order: "ord_2001", claim: "The box showed up but there was nothing in it", q: "" },
    { label: "Priya: never arrived", order: "ord_3001", claim: "My headphones never arrived", q: "" },
  ],
  gadgetbarn: [{ label: "Tom: empty box", order: "ord_9001", claim: "The graphics card box was empty", q: "" }],
};

interface Props {
  merchantId: MerchantId;
  orders: Order[];
  names: Record<string, string>;
  onCheck: (orderId: string, claimText: string, question: string) => Promise<void>;
  onDispute: (orderId: string) => Promise<void>;
}

export function SimulatePanel({ merchantId, orders, names, onCheck, onDispute }: Props) {
  const [orderId, setOrderId] = useState("");
  const [claim, setClaim] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orders.some((o) => o._id === orderId)) setOrderId(orders[0]?._id ?? "");
  }, [orders, orderId]);

  const submit = async () => {
    setBusy(true);
    try {
      await onCheck(orderId, claim, question);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2>Simulate a call (typed)</h2>
      <div className="presets">
        {PRESETS[merchantId].map((p) => (
          <button key={p.label} onClick={() => { setOrderId(p.order); setClaim(p.claim); setQuestion(p.q); }}>
            {p.label}
          </button>
        ))}
      </div>
      <label htmlFor="order">Order</label>
      <select id="order" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
        {orders.map((o) => (
          <option key={o._id} value={o._id}>
            {o._id} · {names[o.customerId] ?? o.customerId} · {o.item.name} · {money(o.amount)} · {o.delivery.status}
            {o.delivery.photo ? " (photo)" : ""}
          </option>
        ))}
      </select>
      <label htmlFor="claim">Caller says</label>
      <textarea id="claim" value={claim} placeholder="My package never arrived" onChange={(e) => setClaim(e.target.value)} />
      <label htmlFor="question">Caller asks (optional)</label>
      <input id="question" value={question} placeholder="Can you refund without me sending it back?" onChange={(e) => setQuestion(e.target.value)} />
      <button className="primary" disabled={busy || !orderId || !claim.trim()} onClick={submit}>
        {busy ? "Checking…" : "Check claim"}
      </button>
      <div className="actions">
        <button disabled={!orderId} onClick={() => onDispute(orderId)}>Bank opens chargeback on this order</button>
      </div>
    </>
  );
}
