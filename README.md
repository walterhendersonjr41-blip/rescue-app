# Last Chance Rescue

A marketplace to rescue property before it's lost: storage units about to go to auction, pawn tickets about to expire, and repo / impound items. The owner posts the item with proof (past-due notice, pawn ticket or impound notice), a buyer pays the bill at the counter, and both sides walk through a step-by-step checklist (hold, pay cashier, inspect, bill of sale with signatures, deal complete). Includes FINAL SALE confirmations, fake-listing reports, strikes and bans, and an admin view.

## Demo (GitHub Pages)
`index.html` runs fully in the browser. On GitHub Pages the shared backend is switched off, so everything you enter stays in your own browser (localStorage). No payments are processed; the payment link is a placeholder. Open `index.html#demo-earned` to see a completed example deal.

## Files
- `index.html`, `app.js`, `sync.js`, `TERMS.md` (draft terms) – the front end
- `api/` – optional Vercel serverless backend (Upstash Redis / Vercel KV via env vars)
- `netlify/functions/lcr.mjs`, `netlify.toml`, `package.json` – optional Netlify Functions + Blobs backend
- `server/` – optional standalone Node server and a Postgres schema

No keys or data are included. Backends read their credentials from environment variables. Buyer phone numbers are never stored on the server.

Not legal advice; check your state's storage, pawn and towing laws.

Created by Walter Henderson Jr.
