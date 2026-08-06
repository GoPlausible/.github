# Guide examples (standalone)

Runnable copies of the code samples on the facilitator's **Get started** page
(https://facilitator.goplausible.xyz/guide), exactly as they appear there —
two servers and two clients:

| | Project | Sample |
|---|---|---|
| Server | [`express-server/`](express-server/) | Express: one paid `GET /my-api` route, USDC on Algorand TestNet |
| Server | [`hono-server/`](hono-server/) | Hono (+ @hono/node-server): same paid route |
| Client | [`fetch-client/`](fetch-client/) | fetch wrapper: pays the 402 automatically |
| Client | [`axios-client/`](axios-client/) | Axios wrapper: pays the 402 automatically |

All four install the **published upstream `@x402/*` packages from npm** (not the
`typescript/` workspace in this repo) and use plain `npm` — they are intentionally
independent of the monorepo so the guide can be tested as a real external
developer would experience it.

Test flow: start one server (both use port `4021` — run one at a time) with your
TestNet address as `AVM_ADDRESS`, then run either client with a funded TestNet
account's key. Every project reads its config from `.env` (copy `.env.example`).
See each project's README.
