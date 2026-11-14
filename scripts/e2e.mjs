// End-to-end check: frontend dev server (proxy) <-> backend <-> MongoDB Atlas.
// Run with both servers up:  npm run e2e
// FRONTEND_URL defaults to http://localhost:5173; BACKEND_URL to http://localhost:3000.
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND = process.env.BACKEND_URL || "http://localhost:3000";
const M = { "content-type": "application/json", "x-merchant-id": "shopco" };

let failed = 0;
const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "✔" : "✖"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failed++;
};
async function req(path, { body, headers = M, base = FRONTEND } = {}) {
  const res = await fetch(base + path, { method: body ? "POST" : "GET", headers, body: body && JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

// 1. Wiring
const page = await fetch(FRONTEND).then((r) => r.text()).catch(() => "");
ok("frontend serves the app", page.includes('id="root"'));
const health = await req("/health");
ok("frontend → backend proxy (/health)", health.status === 200 && health.data?.ok, health.data?.db);
ok("voice configured", (await req("/voice/config")).data?.configured === true);
ok("voice signed URL", (await req("/voice/signed-url")).data?.signedUrl?.startsWith("wss://"));

// 2. Live updates: subscribe to SSE, then make a change and expect an event.
const sse = await fetch(FRONTEND + "/admin/events");
const reader = sse.body.getReader();
const gotEvent = (async () => {
  const dec = new TextDecoder();
  for (let buf = ""; ; ) {
    const { value, done } = await reader.read();
    if (done) return false;
    buf += dec.decode(value);
    if (buf.includes("data:")) return true;
  }
})();

// 3. Demo story
await req("/admin/reset", { body: {} });
const jake = await req("/tools/check-claim", { body: { orderId: "1042", claimText: "Yeah the headphones just never turned up at my place", callerQuestions: ["Can you just refund it without me sending anything back?"] } });
ok("Jake (spoken order '1042') → ESCALATE", jake.data?.decision === "ESCALATE", jake.data?.signals?.map((s) => s.code).join(", "));
ok("SSE change event received", await Promise.race([gotEvent, new Promise((r) => setTimeout(() => r(false), 5000))]));
reader.cancel();

ok("analyst confirms scam", (await req("/tools/record-outcome", { body: { claimId: jake.data.claimId, outcome: "confirmed_scam" } })).status === 200);
const maria = await req("/tools/check-claim", { body: { orderId: "ord_2001", claimText: "The box showed up but there was nothing in it" } });
ok("Maria (new account, same footprint) → ESCALATE", maria.data?.signals?.some((s) => s.code === "linked_to_confirmed_scam"));
const priya = await req("/tools/check-claim", { body: { orderId: "ord_3001", claimText: "My headphones never arrived" } });
ok("Priya (honest) → APPROVE", priya.data?.decision === "APPROVE");
ok("Priya refund issued", (await req("/tools/issue-refund", { body: { claimId: priya.data.claimId } })).status === 201);
ok("second refund refused (409)", (await req("/tools/issue-refund", { body: { claimId: priya.data.claimId } })).status === 409);
await req("/admin/disputes", { body: { orderId: "ord_1042" } });
const jake2 = await req("/tools/check-claim", { body: { orderId: "ord_1042", claimText: "I still have not got my refund" } });
ok("Jake with open chargeback → DECLINE", jake2.data?.decision === "DECLINE");

// 4. Governance
const state = (await req("/admin/state")).data;
ok("dashboard state loads", Array.isArray(state?.claims) && state.claims.length >= 4, `${state?.claims?.length} claims, ${state?.memories?.length} memories`);
const other = (await req("/admin/state", { headers: { ...M, "x-merchant-id": "gadgetbarn" } })).data;
ok("merchant isolation (GadgetBarn can't see ShopCo private memories)", !other.memories.some((m) => m.scope.merchantId === "shopco"));
ok("unknown merchant rejected", (await req("/admin/state", { headers: { ...M, "x-merchant-id": "nope" } })).status === 403);
const forget = await req("/tools/forget-me", { body: { customerId: "cus_jake" } });
ok("forget-me", forget.status === 200, JSON.stringify(forget.data?.deleted));

// 5. CORS for direct (non-proxy) calls
const pre = await fetch(BACKEND + "/tools/check-claim", { method: "OPTIONS", headers: { origin: "http://localhost:5173", "access-control-request-method": "POST" } });
ok("CORS allows the frontend origin", pre.status === 204 && pre.headers.get("access-control-allow-origin") === "http://localhost:5173");
const bad = await fetch(BACKEND + "/tools/check-claim", { method: "OPTIONS", headers: { origin: "http://evil.example", "access-control-request-method": "POST" } });
ok("CORS blocks other origins", bad.status === 403);

await req("/admin/reset", { body: {} });
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
