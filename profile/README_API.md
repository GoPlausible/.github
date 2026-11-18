# GoPlausible API

The API behind [goplausible.xyz](https://goplausible.xyz): W3C verifiable credentials and presentations, their verification, the `did:algo` DID method, one sign-in for Algorand, Base and Solana wallets, the signed-in account and its media.

- [Back to GoPlausible](./README.md)
- [PLAUSIBLE Protocol Architecture and technical design](./README_ARCHITECTURE.md)

---

## Reference

- **Base URL**: [https://goplausible.xyz/api](https://goplausible.xyz/api)
- **API reference**: [https://goplausible.xyz/api/docs](https://goplausible.xyz/api/docs). Every route with its parameters, request bodies, responses and errors.
- **OpenAPI 3.1 document**: [https://goplausible.xyz/api/openapi.json](https://goplausible.xyz/api/openapi.json). Use it with API tools and client generators.

The OpenAPI document is the full reference. This page is an overview.

## Conventions

- **Pages and JSON.** The routes that have a page (`/api`, `/api/credentials`, `/api/verify`, `/api/docs`) answer HTML to a browser and JSON to everything else. `?format=html` or `?format=json` decides first.
- **Errors.** A refused or failed request answers `{ "error": "…", "code": "…", "requestId": "…" }`. `code` is stable and machine-readable. Quote `requestId` to support.
- **Authentication.** Most routes are public. Account routes need a session from `POST /api/auth/signin`, sent as `Authorization: Bearer <token>`. Sessions are EdDSA JWTs; the verification key is published at [`/api/auth/jwks.json`](https://goplausible.xyz/api/auth/jwks.json).
- **CORS.** Every route allows any origin.

## Routes

### Credentials

Verifiable credentials and presentations, addressed by their `did:algo:…:uuid:…` DID or the CID of their pinned document.

| Route | What it does |
|---|---|
| `GET /api/credentials` | Open a credential or presentation |
| `GET /api/credentials/{id}` | A credential or presentation |

### Verification

Checks the proof, the validity window, the issuer, the holder and their sign-in, the registration on the PLAUSIBLE contract, the pinned copy and the status. It covers current W3C documents and legacy PLAUS credentials.

| Route | What it does |
|---|---|
| `GET /api/verify` | The verifier |
| `POST /api/verify` | Verify a posted credential or presentation |
| `GET /api/verify/{id}` | Verify a stored credential or presentation |
| `GET /api/verification/{id}` | Verify a stored credential (historical path) |

### Identifiers

The `did:algo` DID method (accounts, transactions, applications, assets, uuids) and NFD names. DIDs of other methods resolve through the same route.

| Route | What it does |
|---|---|
| `GET /api/1.0/identifiers/{did}` | Resolve a DID |
| `GET /api/did/{uid}` | Construct the `did:algo` DID of an identifier |

### Authentication

One sign-in for every chain: a challenge, the wallet's signature (ARC-60 on Algorand, SIWE on Base, SIWS on Solana), then a session. An account's first sign-in creates its PLAUSIBLE profile.

| Route | What it does |
|---|---|
| `POST /api/auth/challenge` | Ask for a sign-in challenge |
| `POST /api/auth/signin` | Sign in |
| `POST /api/auth/lookup` | Does an account exist? |
| `POST /api/auth/logout` | End the session *(session)* |
| `GET /api/auth/jwks.json` | The session key |

### Account and media

| Route | What it does |
|---|---|
| `GET /api/me` | The signed-in account *(session)* |
| `POST /api/media` | Upload an image, badge, certificate or attachment, up to 5 MB *(session)* |
| `GET /api/media/{id}` | A media object |
| `DELETE /api/media/{id}` | Delete a media object *(session)* |

### IPFS, top-ups and receipts

| Route | What it does |
|---|---|
| `GET /api/ipfs/{cid}` | Pinned content, embeddable cross-site |
| `GET /api/arc90/{id}` | An ARC-90 top-up page (Algorand remote MCP servers) |
| `GET /api/receipt/{id}` | A payment receipt (the remote MCP servers and the x402 facilitator) |

### Legacy PLAUS

The previous protocol version's routes, kept for existing profiles and credentials. No new legacy profiles are created. See the API reference.

---

[Back to GoPlausible](./README.md)
