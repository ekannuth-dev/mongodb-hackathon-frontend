# mongodb-hackathon-frontend: Refund Guard UI

A simple dashboard for **Refund Guard**: talk to the voice refund agent, and see each case with what a specialist needs to know.
The backend is a separate repo: [`mongodb-hackathon`](../mongodb-hackathon) (clone both side by side).

```
Desktop/Coding/
  mongodb-hackathon/            ← backend API on http://localhost:3000
  mongodb-hackathon-frontend/   ← this repo: UI on http://localhost:5173
```

## Run

1. Start the backend first (in `mongodb-hackathon/backend`): `npm run seed` once, `npm run agent` once, then `npm run dev`.
2. Then here:

```bash
npm install
npm run dev      # http://localhost:5173
```

Open http://localhost:5173 in Chrome. The header shows **● Connected** when the backend is reachable.

## The demo

You call in as **Alex**:

1. **Order 1111:** "My earbuds never arrived." → refunded on the call.
2. **Order 2222:** "My headphones never arrived either." → sent to a specialist, with notes: delivery records disagree, earlier claim, previous call summary.

Full step-by-step script: `script.md` in the backend repo.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on :5173, proxying API calls to the backend |
| `npm run build` | Typecheck + production build |
| `npm run e2e` | Checks the frontend ↔ backend wiring and both demo calls (servers must be running) |

## How it connects

- The app calls its own origin (`/tools`, `/admin`, `/voice`) and Vite proxies those to `BACKEND_URL` (default `http://localhost:3000`).
- To call the backend directly instead, set `VITE_API_URL=http://localhost:3000` (the backend must allow this origin in `CORS_ORIGINS`).
- The dashboard updates live: the backend streams MongoDB changes over `/admin/events`.
- **Start call** gets a short-lived ElevenLabs signed URL from the backend (the API key never reaches the browser). The agent's tools run in the browser and call the backend. When the call ends, it's saved so the next case can show its summary.

## Code

```
src/
  api/client.ts           every backend call
  api/types.ts            response types
  hooks/useLiveState.ts   dashboard data + live updates
  hooks/useVoiceCall.ts   the voice call and the agent's tools
  components/CallPanel.tsx   Start/End call + transcript
  components/Cases.tsx       today's cases + specialist notes
  App.tsx · main.tsx · styles.css
```
