import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from x402 import AssetAmount
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.server import x402ResourceServer

ALGORAND_TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

facilitator = HTTPFacilitatorClient(FacilitatorConfig(
    url=os.getenv("FACILITATOR_URL", "https://facilitator.goplausible.xyz")))

server = (
    x402ResourceServer(facilitator)
    .on_after_verify(lambda ctx: print(f"✅ payment verified: {ctx.result}"))
    .on_after_settle(lambda ctx: print(
        f"💰 payment settled — txn id: {ctx.result.transaction}\n"
        f"   full settle response: {ctx.result}"))
    .on_settle_failure(lambda ctx: print(f"❌ settle failed: {ctx.error}"))
)
server.register(ALGORAND_TESTNET, ExactAvmServerScheme())

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
    ),
}

app = FastAPI()
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)


@app.get("/my-api")
def my_api():
    print("← serving paid response for /my-api")
    return {"ok": True, "premium": "data"}
