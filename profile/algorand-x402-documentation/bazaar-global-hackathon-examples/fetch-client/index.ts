import "dotenv/config";
import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { toClientAvmSigner } from "@x402/avm";
import { ExactAvmScheme } from "@x402/avm/exact/client";

const ALGORAND_TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);
console.log("buyer account:", signer.address);

const client = new x402Client().register(ALGORAND_TESTNET, new ExactAvmScheme(signer));

const url = process.env.RESOURCE_URL || "http://localhost:4021/my-api";
console.log("→ requesting", url);

const paidFetch = wrapFetchWithPayment(fetch, client);
const res = await paidFetch(url);
console.log("←", res.status, res.statusText);
console.log("body:", await res.json()); // paid, verified, settled — one call

// The settle result comes back in the PAYMENT-RESPONSE header:
const settle = new x402HTTPClient(client).getPaymentSettleResponse(
  (name) => res.headers.get(name),
);
console.log("💰 payment response:", JSON.stringify(settle, null, 2));
console.log("   txn id:", settle.transaction);
