# Fetch client — guide sample

The client sample from https://facilitator.goplausible.xyz/guide, verbatim:
wraps `fetch` so the 402 from the server is paid, verified and settled in one
call.

## You need

A **TestNet buyer account** with:

- USDC (ASA `10458941`) — from the [Circle faucet](https://faucet.circle.com)
  (select Algorand TestNet); the opt-in plus Algorand's minimum balance needs
  ~0.2 ALGO from the [TestNet bank](https://bank.testnet.algorand.network).
- Its private key **base64-encoded (64 bytes: 32-byte seed + 32-byte public key)**
  in `AVM_PRIVATE_KEY`. Payments are gasless — the facilitator pays the network
  fees; the buyer spends USDC only.

## Run

Start [`../express-server`](../express-server/) first. Copy `.env.example` to
`.env` and set `AVM_PRIVATE_KEY` (`RESOURCE_URL` is the paid endpoint,
`http://localhost:4021/my-api` by default), then:

```bash
npm install
npm start
# → { ok: true, premium: 'data' }   (paid, verified, settled)
```

`npm run typecheck` runs `tsc --noEmit` over the sample.
