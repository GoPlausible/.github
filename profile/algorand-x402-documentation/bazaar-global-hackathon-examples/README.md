# Guide examples (standalone)

Runnable copies of the code samples on the facilitator's **Get started** page
(https://facilitator.goplausible.xyz/guide), exactly as they appear there —
two servers and two clients per platform.

## TypeScript

| | Project | Sample |
|---|---|---|
| Server | [`express-server/`](express-server/) | Express: one paid `GET /my-api` route, USDC on Algorand TestNet |
| Server | [`hono-server/`](hono-server/) | Hono (+ @hono/node-server): same paid route |
| Client | [`fetch-client/`](fetch-client/) | fetch wrapper: pays the 402 automatically |
| Client | [`axios-client/`](axios-client/) | Axios wrapper: pays the 402 automatically |

TypeScript projects install the **published upstream `@x402/*` packages from
npm** (not the `typescript/` workspace in this repo) and use plain `npm`.

## Python

| | Project | Sample |
|---|---|---|
| Server | [`fastapi-server/`](fastapi-server/) | FastAPI (async): one paid `GET /my-api` route |
| Server | [`flask-server/`](flask-server/) | Flask (sync): same paid route |
| Client | [`httpx-client/`](httpx-client/) | httpx (async): pays the 402 automatically |
| Client | [`requests-client/`](requests-client/) | requests (sync): pays the 402 automatically |

Python projects install the **published `x402-avm` package from PyPI** with the
right extras per project (`pip install -r requirements.txt` in a venv). The
clients include the `PrivateKeySigner` implementation of the `ClientAvmSigner`
protocol — the part the guide shows as `signer=...`.

## Test flow

Start one server (all use port `4021` — run one at a time) with your TestNet
merchant address as `AVM_ADDRESS`, then run any client with a funded TestNet
buyer key as `AVM_PRIVATE_KEY` — clients and servers mix freely across
platforms. Every project reads its config from `.env` (copy `.env.example`).
See each project's README.
