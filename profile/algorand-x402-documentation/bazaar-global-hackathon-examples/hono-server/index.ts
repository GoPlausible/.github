import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";

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

const app = new Hono();
app.use(async (c, next) => {
  console.log(`→ ${c.req.method} ${c.req.path}`);
  await next();
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
    // REQUIRED for Bazaar discovery: this block is what gets you listed —
    // your first settled payment auto-catalogs the resource AND your
    // merchant identity. Without it you get paid but stay unlisted.
    extensions: {
      ...declareDiscoveryExtension({
        output: { example: { ok: true, premium: "data" } },
      }),
      "x402-merchant": {
        info: {
          name: "My API Co",                        // ← your public identity
          website: "https://my-api.example.com",
          logo: "https://my-api.example.com/logo.png",
          categories: ["api", "algorand", "x402"],
        },
        // x402 v2 spec: extensions carry BOTH info and a JSON Schema for it.
        schema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            website: { type: "string" },
            logo: { type: "string" },
            categories: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
}, server));

app.get("/my-api", (c) => {
  console.log("← serving paid response for /my-api");
  return c.json({ ok: true, premium: "data" });
});
serve({ fetch: app.fetch, port: 4021 });
console.log("x402-paid API on :4021 — serving continuously, Ctrl+C to stop");
