import "dotenv/config";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const ALGORAND_TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

// Keep serving no matter what a single request/settle does — log and carry on.
process.on("uncaughtException", (err) => console.error("❌ uncaught exception:", err));
process.on("unhandledRejection", (err) => console.error("❌ unhandled rejection:", err));

const facilitator = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://facilitator.goplausible.xyz",
});

const server = new x402ResourceServer(facilitator)
  .register(ALGORAND_TESTNET, new ExactAvmScheme())
  .onAfterVerify(async (ctx) => {
    console.log("✅ payment verified:", JSON.stringify(ctx.result));
  })
  .onAfterSettle(async (ctx) => {
    console.log("💰 payment settled — txn id:", ctx.result.transaction);
    console.log("   full settle response:", JSON.stringify(ctx.result, null, 2));
  })
  .onSettleFailure(async (ctx) => {
    console.error("❌ settle failed:", ctx.error);
  });

const app = express();
app.use((req, _res, next) => {
  console.log(`→ ${req.method} ${req.url}`);
  next();
});
app.use(paymentMiddleware({
  "GET /my-api": {
    accepts: [{
      scheme: "exact",
      network: ALGORAND_TESTNET,
      price: "$0.01",                  // USDC — resolved per network
      payTo: process.env.AVM_ADDRESS!, // your merchant account (.env)
      extra: { tag: "x402-global-challenge" }, // ← the Challenge tag
    }],
    description:
      "Example x402-paid API from the GoPlausible guide — premium JSON for $0.01 USDC on Algorand TestNet, settled by facilitator.goplausible.xyz",
    mimeType: "application/json",
  },
}, server));

app.get("/my-api", (_req, res) => {
  console.log("← serving paid response for /my-api");
  res.json({ ok: true, premium: "data" });
});
app.listen(4021, () =>
  console.log("x402-paid API on :4021 — serving continuously, Ctrl+C to stop"),
);
