# FastAPI server — guide sample

The FastAPI sample from https://facilitator.goplausible.xyz/guide:
one paid `GET /my-api` route charging **$0.01 in USDC on Algorand TestNet**, verified
and settled by the GoPlausible facilitator. Gasless for buyers — no `feePayer`
config anywhere; the middleware learns it from the facilitator's `/supported`.

## Run

1. Copy `.env.example` to `.env` and set `AVM_ADDRESS` to your TestNet merchant
   address (it must be opted in to TestNet USDC, ASA `10458941`).
2. Install and start:

   ```bash
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --port 4021
   ```

3. See the paywall:

   ```bash
   curl -i http://localhost:4021/my-api
   # → HTTP 402 with the payment options JSON
   ```

4. Pay it end-to-end with [`../httpx-client`](../httpx-client/) or
   [`../requests-client`](../requests-client/).

Uses port `4021` — same as the other server examples, so run one at a time.
