# Web client — wallet as the signer (use-wallet + Lute)

The browser-dApp pattern from https://facilitator.goplausible.xyz/guide:
**no private keys in the app** — the connected wallet plays the
`ClientAvmSigner` role via [`@txnlab/use-wallet`](https://github.com/TxnLab/use-wallet)
(`{ address, signTransactions }` drops straight into `ExactAvmScheme`).
Wired to [Lute wallet](https://lute.app).

## You need

- A TestNet account in your Lute wallet holding USDC (ASA `10458941`) — from the
  [Circle faucet](https://faucet.circle.com); the opt-in plus Algorand's minimum
  balance needs ~0.2 ALGO from the [TestNet bank](https://bank.testnet.algorand.network).
  Payments are gasless — the facilitator pays the network fees.

## Run

Start a server example first (e.g. [`../express-server`](../express-server/) on
port `4021`). Copy `.env.example` to `.env` (defaults are fine), then:

```bash
npm install
npm run dev
# open http://localhost:5173 — connect Lute, hit Pay
```

The dev server proxies `/my-api` to `http://localhost:4021` (see
`vite.config.ts`), so the browser stays same-origin and the server examples
need no CORS configuration.

`npm run typecheck` / `npm run build` verify the project without a wallet.
