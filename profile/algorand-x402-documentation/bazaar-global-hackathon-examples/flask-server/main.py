import os

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify
from x402 import AssetAmount
from x402.http import FacilitatorConfig, HTTPFacilitatorClientSync, PaymentOption
from x402.http.middleware.flask import payment_middleware
from x402.http.types import RouteConfig
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.server import x402ResourceServerSync

ALGORAND_TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

facilitator = HTTPFacilitatorClientSync(FacilitatorConfig(
    url=os.getenv("FACILITATOR_URL", "https://facilitator.goplausible.xyz")))

server = (
    x402ResourceServerSync(facilitator)
    .on_after_verify(lambda ctx: print(f"✅ payment verified: {ctx.result}"))
    .on_after_settle(lambda ctx: print(
        f"💰 payment settled — txn id: {ctx.result.transaction}\n"
        f"   full settle response: {ctx.result}"))
    .on_settle_failure(lambda ctx: print(f"❌ settle failed: {ctx.error}"))
)
server.register(ALGORAND_TESTNET, ExactAvmServerScheme())

# BAZAAR_EXT is REQUIRED for discovery: it's what gets you listed (the first
# settled payment auto-catalogs the resource). Without it you get paid but
# stay unlisted.
# MERCHANT_EXT is OPTIONAL: declare it to CONTROL your name/website/logo/
# categories. Omit it and they're read from your endpoint's domain metadata
# (OpenGraph tags, llms.txt, agent-card.json) instead.
BAZAAR_EXT = {
    "info": {"input": {"type": "http", "queryParams": {}},
             "output": {"type": "json", "example": {"ok": True, "premium": "data"}}},
    "schema": {"$schema": "https://json-schema.org/draft/2020-12/schema",
               "type": "object", "required": ["input"],
               "properties": {
                   "input": {"type": "object", "additionalProperties": False,
                             "required": ["type", "method"],
                             "properties": {"type": {"type": "string", "const": "http"},
                                            "method": {"type": "string", "enum": ["GET", "HEAD", "DELETE"]},
                                            "queryParams": {"type": "object", "properties": {}}}},
                   "output": {"type": "object", "required": ["type"],
                              "properties": {"type": {"type": "string"}, "example": {"type": "object"}}}}},
}
MERCHANT_EXT = {
    "info": {"name": "My API Co",  # ← your public identity
             "website": "https://my-api.example.com",
             "logo": "https://my-api.example.com/logo.png",
             "categories": ["api", "algorand", "x402"]},
    # x402 v2 spec: extensions carry BOTH info and a JSON Schema for it.
    "schema": {"$schema": "https://json-schema.org/draft/2020-12/schema",
               "type": "object", "required": ["name"],
               "properties": {"name": {"type": "string"}, "website": {"type": "string"},
                              "logo": {"type": "string"},
                              "categories": {"type": "array", "items": {"type": "string"}}}},
}

routes = {
    "GET /my-api": RouteConfig(
        accepts=[PaymentOption(
            scheme="exact",
            network=ALGORAND_TESTNET,
            # $0.01 USDC, spec form. The Challenge tag travels in the price
            # extra — the Python SDK does not yet propagate PaymentOption.extra.
            price=AssetAmount(asset="10458941", amount="10000",
                              extra={"name": "USDC", "decimals": 6,
                                     "tag": "x402-global-challenge"}),
            pay_to=os.environ["AVM_ADDRESS"],  # your merchant account (.env)
        )],
        description=(
            "Example x402-paid API from the GoPlausible guide — premium JSON for "
            "$0.01 USDC on Algorand TestNet, settled by facilitator.goplausible.xyz"
        ),
        mime_type="application/json",
        extensions={"bazaar": BAZAAR_EXT, "x402-merchant": MERCHANT_EXT},
    ),
}

app = Flask(__name__)
payment_middleware(app, routes=routes, server=server)


@app.route("/my-api")
def my_api():
    print("← serving paid response for /my-api")
    return jsonify({"ok": True, "premium": "data"})


if __name__ == "__main__":
    print("x402-paid API on :4021 — serving continuously, Ctrl+C to stop")
    app.run(port=4021)
