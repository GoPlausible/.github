# Express server — guide sample

The Express sample from https://facilitator.goplausible.xyz/guide:
one paid `GET /my-api` route charging **$0.01 in USDC on Algorand TestNet**, verified
and settled by the GoPlausible facilitator. Gasless for buyers — no `feePayer`
config anywhere; the middleware learns it from the facilitator's `/supported`.

## Run

1. Copy `.env.example` to `.env` and set `AVM_ADDRESS` to your TestNet merchant
   address (it must be opted in to TestNet USDC, ASA `10458941`).
2. Install and start:

   ```bash
   npm install
   npm start
   ```

3. See the paywall:

   ```bash
   curl -i http://localhost:4021/my-api
   # → HTTP 402 with the payment options JSON
   ```

4. Pay it end-to-end with the sibling [`../fetch-client`](../fetch-client/) project.

`npm run typecheck` runs `tsc --noEmit` over the sample.
