# mongodb-hackathon-frontend: Refund Guard UI

React + Vite frontend for **Refund Guard**, a voice AI refund agent with governed memory on MongoDB Atlas.
The backend lives in a separate repo: [`mongodb-hackathon`](../mongodb-hackathon) (clone both side by side).

```
Desktop/Coding/
  mongodb-hackathon/            ← backend API on http://localhost:3000
  mongodb-hackathon-frontend/   ← this repo: UI on http://localhost:5173
```

## Run

1. Start the backend first (in `mongodb-hackathon/backend`): `npm run seed` once, `npm run agent` once, then `npm run dev`.
2. Then here:

```bash
cp .env.example .env   # optional: only if the backend isn't on http://localhost:3000
npm install
npm run dev            # http://localhost:5173
```

Open http://localhost:5173 in **Chrome**. The header shows **● Live** when the frontend is connected to the backend and its live update stream.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on :5173, proxying API calls to the backend |
| `npm run build` | Typecheck (`tsc`) + production build into `dist/` |
| `npm run preview` | Serve the build on :4173 (same proxy) |
| `npm run e2e` | End-to-end check against running frontend + backend (18 checks: proxy, voice config, live events, the full demo story, merchant isolation, forget-me, CORS) |

## How it connects to the backend

- **Dev (default):** the app calls its own origin (`/tools`, `/admin`, `/voice`, `/health`) and Vite proxies those paths to `BACKEND_URL` (default `http://localhost:3000`). No CORS needed.
- **Direct:** set `VITE_API_URL=http://localhost:3000`; the backend must list this frontend's origin in its `CORS_ORIGINS`.
- Every merchant-scoped request sends the `x-merchant-id` header (merchant picker in the header).
- **Live updates:** `EventSource('/admin/events')`. The backend streams MongoDB change events, and the UI refetches `/admin/state`.
- **Voice:** "Start call" asks the backend for a short-lived ElevenLabs signed URL (the API key never reaches the browser), then runs the agent's client tools (`check_claim`, `issue_refund`) here in the browser against the backend. The agent only receives the decision and guidance, never fraud signals. When the call ends, the conversation id is sent to `POST /voice/calls` so the transcript is stored (30-day TTL).

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://localhost:3000` | Where the dev/preview proxy sends API calls |
| `VITE_API_URL` | *(empty = use proxy)* | Call the backend directly instead |

## Project layout

```
src/
  api/client.ts        all backend calls (one place)
  api/types.ts         response types (keep in sync with the backend)
  hooks/useLiveState.ts   state + SSE live updates
  hooks/useVoiceCall.ts   ElevenLabs session + client tools (SDK lazy-loaded)
  components/          Header, CallPanel, SimulatePanel, ClaimsPanel, MemoryPanel
  App.tsx              wiring + analyst actions
scripts/e2e.mjs        end-to-end check
```

## Demo script

1. **Jake:** "order ten forty-two" / "the headphones never turned up, can you refund without me sending it back?" → escalated. Click **Analyst: confirm scam**.
2. **Maria:** "order two thousand and one" / "the box was empty" → escalated (same address + card as Jake).
3. **Priya:** "order three thousand and one" / "my headphones never arrived" → approved and refunded on the call.
4. Click **Bank opens chargeback** on ord_1042, call as Jake again → declined (no paying twice).

Use **Reset demo** between runs. No microphone? Use **Simulate a call (typed)**, which hits the same backend tools.

## Troubleshooting

- **"Backend unreachable" banner:** the backend isn't running on `BACKEND_URL`.
- **"Voice not configured":** run `npm run agent` in the backend.
- **Microphone blocked:** use Chrome on `http://localhost` (a secure context) and allow the mic.
