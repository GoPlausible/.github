# httpx client — guide sample

The Python httpx (async) client sample from
https://facilitator.goplausible.xyz/guide: pays the server's 402
automatically — one call, paid, verified, settled. Includes the
`PrivateKeySigner` implementation of the `ClientAvmSigner` protocol
(the part the guide shows as `signer=...`).

## You need

A **TestNet buyer account** with:

- USDC (ASA `10458941`) — from the [Circle faucet](https://faucet.circle.com)
  (select Algorand TestNet); the opt-in plus Algorand's minimum balance needs
  ~0.2 ALGO from the [TestNet bank](https://bank.testnet.algorand.network).
- Its private key **base64-encoded (64 bytes: 32-byte seed + 32-byte public key)**
  in `AVM_PRIVATE_KEY`. Payments are gasless — the facilitator pays the network
  fees; the buyer spends USDC only.

## Run

Start a server example first (e.g. [`../fastapi-server`](../fastapi-server/)).
Copy `.env.example` to `.env` and set `AVM_PRIVATE_KEY`, then:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
# → {"ok": true, "premium": "data"}   (paid, verified, settled)
```
