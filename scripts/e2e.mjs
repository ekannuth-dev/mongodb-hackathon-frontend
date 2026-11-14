// End-to-end check of the demo: frontend dev server (proxy) <-> backend <-> MongoDB Atlas.
// Run with both servers up:  npm run e2e
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";
const H = { "content-type": "application/json", "x-merchant-id": "shopco" };

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "✔" : "✖"} ${name}${extra ? ` (${extra})` : ""}`);
  if (!ok) failed++;
};
const get = (path) => fetch(FRONTEND + path, { headers: H }).then((r) => r.json());
const post = (path, body) =>
  fetch(FRONTEND + path, { method: "POST", headers: H, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, data: await r.json() }));

// Wiring
check("frontend serves the app", (await fetch(FRONTEND).then((r) => r.text()).catch(() => "")).includes('id="root"'));
check("frontend reaches backend", (await get("/health").catch(() => ({}))).ok === true);
check("voice is configured", (await get("/voice/config")).configured === true);
check("voice signed URL", (await get("/voice/signed-url")).signedUrl?.startsWith("wss://"));

// The demo
await post("/admin/reset", {});
const call1 = await post("/tools/check-claim", { orderId: "2058", claimText: "Hi, I ordered a pair of noise-cancelling headphones, order 2058, and the box was empty" });
check("Call 1: Alex, order 2058 → refund approved", call1.data.decision === "APPROVE", call1.data.decision);
const refund = await post("/tools/issue-refund", { claimId: call1.data.claimId });
check("Call 1: refund issued", refund.status === 201, `$${refund.data.amount}`);

const call2 = await post("/tools/check-claim", { orderId: "3046", claimText: "Hi there, I was really excited for these headphones, but when I opened the box it was completely empty, just the packing paper" });
const story = call2.data.signals?.find((s) => s.code === "same_story_linked_account");
check("Call 2: Chris (new name, same address + card), order 3046 → flagged, sent to specialist", call2.data.decision === "ESCALATE", call2.data.decision);
check("Call 2: vector search matched Alex's story", Boolean(story), story ? `similarity ${story.similarity}` : "no match");

const state = await get("/admin/state");
const cases = state.claims.filter((c) => ["cus_alex", "cus_chris"].includes(c.customerId));
check("Dashboard shows both cases", cases.length === 2, cases.map((c) => c.status).join(", "));

await post("/admin/reset", {});
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
