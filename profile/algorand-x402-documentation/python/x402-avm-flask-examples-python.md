# x402-avm Python Flask Middleware Examples

This guide covers the `x402-avm[flask]` extra for protecting Flask endpoints with x402 payment requirements on the Algorand Virtual Machine (AVM). All examples focus on Algorand (AVM) use cases.

> **Package naming**: Install with `pip install "x402-avm[flask,avm,httpx]"` but import as `from x402...` (the Python import name is `x402`, not `x402_avm`).

> **Critical**: Flask uses **synchronous** variants of the x402 core classes. Use `x402ResourceServerSync` and `HTTPFacilitatorClientSync` -- not their async counterparts.

---

## Table of Contents

1. [Installation](#installation)
2. [Key Imports](#key-imports)
3. [Basic Middleware Setup](#basic-middleware-setup)
4. [Route Configuration Patterns](#route-configuration-patterns)
5. [Factory Function Usage](#factory-function-usage)
6. [Middleware from Config](#middleware-from-config)
7. [Complete Algorand Example](#complete-algorand-example---resource-server-accepting-usdc-on-algorand-testnet)
8. [Accessing Payment Info in Route Handlers](#accessing-payment-info-in-route-handlers)
9. [Multiple Routes with Different Payment Requirements](#multiple-routes-with-different-payment-requirements)
10. [Multi-Network Support (AVM + EVM + SVM)](#multi-network-support-avm--evm--svm)
11. [Sync vs Async -- Flask vs FastAPI](#sync-vs-async----flask-vs-fastapi)
12. [Error Handling](#error-handling)
13. [API Reference Summary](#api-reference-summary)
14. [Cross-References](#cross-references)

---

## Installation

```bash
# Flask middleware + Algorand mechanism + httpx (used by the facilitator client)
pip install "x402-avm[flask,avm,httpx]"

# Also install dotenv for environment variable management (optional)
pip install python-dotenv
```

The `flask` extra installs:
- `flask>=3.0.0`

The `avm` extra installs:
- `py-algorand-sdk>=2.0.0`

The `httpx` extra installs:
- `httpx>=0.28.1` -- `HTTPFacilitatorClientSync` uses `httpx.Client` to call the facilitator; the `flask` extra does not pull it in

---

## Key Imports

```python
# Direct imports (recommended - avoids requiring all frameworks)
from x402.http.middleware.flask import (
    PaymentMiddleware,               # WSGI middleware class (recommended)
    payment_middleware,              # Factory function (returns PaymentMiddleware)
    payment_middleware_from_config,  # Middleware from config (raises TypeError in 2.0.2, see below)
    FlaskAdapter,                   # HTTPAdapter implementation for Flask requests
)

# Or via lazy import from the middleware package
from x402.http.middleware import FlaskPaymentMiddleware         # -> PaymentMiddleware
from x402.http.middleware import flask_payment_middleware        # -> payment_middleware
from x402.http.middleware import flask_payment_middleware_from_config  # -> payment_middleware_from_config
from x402.http.middleware import FlaskAdapter                   # -> FlaskAdapter

# Core x402 components (SYNC variants for Flask!)
from x402.server import x402ResourceServerSync       # Sync resource server
from x402.http import HTTPFacilitatorClientSync       # Sync facilitator client
from x402.http import FacilitatorConfig               # Facilitator configuration
from x402.http import PaymentOption                   # Payment option dataclass
from x402.http.types import RouteConfig               # Route configuration dataclass
from x402.schemas import AssetAmount, Network          # Type helpers

# AVM-specific imports
from x402.mechanisms.avm import (
    ALGORAND_TESTNET_CAIP2,         # "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
    ALGORAND_MAINNET_CAIP2,         # "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k"
    USDC_TESTNET_ASA_ID,            # 10458941
    USDC_MAINNET_ASA_ID,            # 31566704
)
from x402.mechanisms.avm.exact import (
    ExactAvmServerScheme,           # Server-side scheme for AVM
    register_exact_avm_server,      # Registration helper
)
```

> **Network ids**: Always use the `ALGORAND_TESTNET_CAIP2` / `ALGORAND_MAINNET_CAIP2` constants in code. The values shown are the canonical CAIP-2 ids (x402-avm >= 2.0.3); 2.0.2 and earlier use the legacy full-hash form, which facilitator.goplausible.xyz still accepts during the transition. Its `/supported` endpoint lists the canonical ids first and, for now, the legacy ids as well; the legacy ids will be switched off with notice.

---

## Basic Middleware Setup

There are two ways to add x402 payment middleware to a Flask application. Both are equivalent.

### Option A: PaymentMiddleware class (recommended)

```python
from flask import Flask
from x402.server import x402ResourceServerSync
from x402.http import HTTPFacilitatorClientSync, FacilitatorConfig, PaymentOption
from x402.http.types import RouteConfig
from x402.http.middleware.flask import PaymentMiddleware
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.exact import ExactAvmServerScheme

app = Flask(__name__)

# 1. Configure facilitator client and resource server (SYNC variants!)
facilitator = HTTPFacilitatorClientSync(FacilitatorConfig(url="https://facilitator.goplausible.xyz"))
server = x402ResourceServerSync(facilitator)

# 2. Register AVM scheme on the server
server.register(
    ALGORAND_TESTNET_CAIP2,
    ExactAvmServerScheme(),
)

# 3. Define protected routes
routes = {
    "GET /api/data/*": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            network=ALGORAND_TESTNET_CAIP2,
            pay_to="YOUR_ALGORAND_ADDRESS",
            price="$0.01",
        ),
    ),
}

# 4. Apply middleware (this replaces app.wsgi_app automatically)
PaymentMiddleware(app, routes, server)

# 5. Define route handlers
@app.route("/api/data/weather")
def get_weather():
    return {"temperature": 72, "unit": "F", "condition": "sunny"}
```

### Option B: Factory function

```python
from x402.http.middleware.flask import payment_middleware

payment_middleware(app, routes=routes, server=server)
```

This is equivalent to `PaymentMiddleware(app, routes, server)` -- it returns the `PaymentMiddleware` instance after applying it to the app.

---

## Route Configuration Patterns

Routes define which endpoints require payment. The key format is `"METHOD /path/pattern"`.

### Simple string price (auto-converts to USDC)

```python
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

routes = {
    "GET /api/weather": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            network=ALGORAND_TESTNET_CAIP2,
            pay_to="RECEIVER_ALGORAND_ADDRESS",
            price="$0.01",  # Automatically converted to 10000 microUSDC
        ),
    ),
}
```

### Explicit AssetAmount (full control)

```python
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.schemas import AssetAmount

routes = {
    "GET /api/premium/*": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            network=ALGORAND_TESTNET_CAIP2,
            pay_to="RECEIVER_ALGORAND_ADDRESS",
            price=AssetAmount(
                amount="10000",         # 10000 microUSDC = $0.01
                asset="10458941",       # USDC ASA ID on testnet
                extra={"name": "USDC", "decimals": 6},
            ),
        ),
    ),
}
```

### Wildcard paths

```python
routes = {
    "GET /api/premium/*": RouteConfig(...),   # Matches /api/premium/anything
    "POST /api/generate/*": RouteConfig(...), # Matches /api/generate/anything
    "GET /api/exact-path": RouteConfig(...),  # Matches only /api/exact-path
}
```

### RouteConfig options

```python
RouteConfig(
    accepts=PaymentOption(...),          # Required: payment option(s)
    # or: accepts=[PaymentOption(...), PaymentOption(...)],  # Multiple options
    resource="https://api.example.com/api/weather",  # Optional: resource URL
    description="Weather data API",      # Optional: description
    mime_type="application/json",        # Optional: response MIME type
    custom_paywall_html=None,            # Optional: custom HTML for browser 402 responses
    unpaid_response_body=None,           # Optional: callable(context) -> UnpaidResponseResult (custom 402 body)
    extensions=None,                     # Optional: x402 extensions (e.g. {"bazaar": {...}})
)
```

### Dict-based route config (alternative to RouteConfig)

```python
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

routes = {
    "GET /api/weather/*": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": "RECEIVER_ALGORAND_ADDRESS",
            "price": {
                "amount": "10000",      # 10000 microUSDC = $0.01
                "asset": "10458941",    # USDC ASA ID on testnet
                "extra": {"name": "USDC", "decimals": 6},
            },
        },
        "resource": "https://api.example.com/api/weather",
    }
}
```

Each `accepts` entry is converted to a `PaymentOption` and reads `scheme`, `network`, `payTo` (or `pay_to`), `price` (a money string such as `"$0.01"` or an `{"amount", "asset", "extra"}` dict) and `maxTimeoutSeconds` (or `max_timeout_seconds`). `resource`, `description` and `mimeType` (or `mime_type`) sit at the route level, next to `accepts`. V1 field names such as `maxAmountRequired` are not read.

---

## Factory Function Usage

The `payment_middleware` function is a thin wrapper around `PaymentMiddleware`. It accepts the same parameters and returns the `PaymentMiddleware` instance.

```python
from flask import Flask
from x402.server import x402ResourceServerSync
from x402.http import HTTPFacilitatorClientSync, FacilitatorConfig, PaymentOption
from x402.http.types import RouteConfig
from x402.http.middleware.flask import payment_middleware
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.exact import ExactAvmServerScheme

app = Flask(__name__)

facilitator = HTTPFacilitatorClientSync(FacilitatorConfig(url="https://facilitator.goplausible.xyz"))
server = x402ResourceServerSync(facilitator)
server.register(
    ALGORAND_TESTNET_CAIP2,
    ExactAvmServerScheme(),
)

routes = {
    "GET /weather": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            pay_to="YOUR_ALGORAND_ADDRESS",
            price="$0.01",
            network=ALGORAND_TESTNET_CAIP2,
        ),
        mime_type="application/json",
        description="Weather report",
    ),
}

# Apply middleware (returns PaymentMiddleware instance)
middleware_instance = payment_middleware(app, routes=routes, server=server)

@app.route("/weather")
def get_weather():
    return {"report": {"weather": "sunny", "temperature": 70}}
```

---

## Middleware from Config

The `payment_middleware_from_config` function is meant to create the resource server internally, from a facilitator client and a list of `{"network": ..., "server": ...}` scheme registrations.

> **Known issue in x402-avm 2.0.2**: `payment_middleware_from_config` builds the **async** `x402ResourceServer` internally, and the Flask middleware requires the sync variant, so the call always raises `TypeError: x402HTTPResourceServerSync requires a sync server, but got x402ResourceServer which has async methods. ...` -- whichever facilitator client you pass. Until this is fixed, build an `x402ResourceServerSync` yourself and use `payment_middleware` (or `PaymentMiddleware`). The setup below is the working equivalent and keeps the same config shapes:

```python
from flask import Flask
from x402.http import HTTPFacilitatorClientSync, FacilitatorConfig
from x402.http.middleware.flask import payment_middleware
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.server import x402ResourceServerSync

app = Flask(__name__)

facilitator = HTTPFacilitatorClientSync(FacilitatorConfig(url="https://facilitator.goplausible.xyz"))

routes = {
    "GET /api/data/*": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": "YOUR_ALGORAND_ADDRESS",
            "price": {"amount": "10000", "asset": "10458941"},  # $0.01 USDC on testnet
        }
    }
}

schemes = [
    {
        "network": ALGORAND_TESTNET_CAIP2,
        "server": ExactAvmServerScheme(),
    },
]

# What payment_middleware_from_config would do, with the sync server Flask needs
server = x402ResourceServerSync(facilitator)
for registration in schemes:
    server.register(registration["network"], registration["server"])

payment_middleware(app, routes=routes, server=server)

@app.route("/api/data/weather")
def get_weather():
    return {"temperature": 72}
```

---

## Complete Algorand Example - Resource Server Accepting USDC on Algorand Testnet

This is a full, runnable example of a Flask resource server that gates endpoints behind Algorand USDC payments.

It uses the GoPlausible facilitator (`https://facilitator.goplausible.xyz`), which supports Algorand MainNet and TestNet and returns its fee payer address in `/supported` (`extra.feePayer`), so clients do not pay Algorand network fees. The facilitator must list the exact network id your x402-avm version uses: with x402-avm 2.0.2 (legacy full-hash ids), a facilitator that lists only the canonical Algorand ids makes the first protected request fail route validation with `RouteConfigurationError: ... Facilitator doesn't support "exact" on "algorand:..."`.

### `.env` file

```env
AVM_ADDRESS=YOUR_ALGORAND_RECEIVER_ADDRESS
FACILITATOR_URL=https://facilitator.goplausible.xyz
```

### `main.py`

```python
"""Flask resource server accepting USDC payments on Algorand Testnet via x402."""

import os

from dotenv import load_dotenv
from flask import Flask, g, jsonify

from x402.http import FacilitatorConfig, HTTPFacilitatorClientSync, PaymentOption
from x402.http.middleware.flask import payment_middleware
from x402.http.types import RouteConfig
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.schemas import AssetAmount, Network
from x402.server import x402ResourceServerSync

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

AVM_ADDRESS = os.getenv("AVM_ADDRESS")
if not AVM_ADDRESS:
    raise ValueError("AVM_ADDRESS environment variable is required")

AVM_NETWORK: Network = ALGORAND_TESTNET_CAIP2
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://facilitator.goplausible.xyz")

# ---------------------------------------------------------------------------
# App & Middleware
# ---------------------------------------------------------------------------

app = Flask(__name__)

# Create SYNC facilitator client and resource server
facilitator = HTTPFacilitatorClientSync(FacilitatorConfig(url=FACILITATOR_URL))
server = x402ResourceServerSync(facilitator)

# Register AVM server scheme for Algorand Testnet
server.register(AVM_NETWORK, ExactAvmServerScheme())

# Define payment-protected routes
routes = {
    # Simple price: "$0.01" auto-converts to 10000 microUSDC
    "GET /weather": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            pay_to=AVM_ADDRESS,
            price="$0.01",
            network=AVM_NETWORK,
        ),
        mime_type="application/json",
        description="Weather report",
    ),
    # Explicit AssetAmount for full control over pricing
    "GET /premium/*": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            pay_to=AVM_ADDRESS,
            price=AssetAmount(
                amount="50000",  # 50000 microUSDC = $0.05
                asset=str(USDC_TESTNET_ASA_ID),
                extra={"name": "USDC", "decimals": 6},
            ),
            network=AVM_NETWORK,
        ),
        mime_type="application/json",
        description="Premium content",
    ),
}

# Apply middleware (replaces app.wsgi_app automatically)
payment_middleware(app, routes=routes, server=server)

# ---------------------------------------------------------------------------
# Route Handlers
# ---------------------------------------------------------------------------


@app.route("/health")
def health_check():
    """Health check endpoint (no payment required)."""
    return jsonify({"status": "ok"})


@app.route("/weather")
def get_weather():
    """Weather report endpoint (requires $0.01 USDC payment)."""
    return jsonify({"report": {"weather": "sunny", "temperature": 72, "unit": "F"}})


@app.route("/premium/content")
def get_premium_content():
    """Premium content endpoint (requires $0.05 USDC payment)."""
    # Access payment info via Flask g object
    payment = getattr(g, "payment_payload", None)
    if payment:
        return jsonify({
            "content": "This is premium Algorand analytics data.",
            "tier": "gold",
            "paid": True,
        })
    return jsonify({
        "content": "This is premium Algorand analytics data.",
        "tier": "gold",
    })


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4021, debug=False)
```

### Run the server

```bash
python main.py
# Or with Flask CLI:
flask --app main run --host 0.0.0.0 --port 4021
```

---

## Accessing Payment Info in Route Handlers

After the middleware verifies a payment, it stores the payment payload and requirements on Flask's `g` object. You can access this information inside your route handlers.

```python
from flask import g, jsonify

@app.route("/api/paid-resource")
def paid_resource():
    # Payment payload (the verified payment from the client)
    payment_payload = getattr(g, "payment_payload", None)

    # Payment requirements (the route's payment config that was matched)
    payment_requirements = getattr(g, "payment_requirements", None)

    if payment_payload:
        # Access payment details
        return jsonify({
            "data": "premium content",
            "paid": True,
        })

    return jsonify({"data": "premium content"})
```

### How the middleware flow works

1. Client sends the request; a paying client sends the base64-encoded V2 `PaymentPayload` in the `PAYMENT-SIGNATURE` header (the V1 `X-PAYMENT` header is not read as a payment)
2. The WSGI middleware intercepts the request within a Flask request context
3. Middleware checks if the route requires payment via `requires_payment(context)`
4. On first protected request, facilitator support is fetched (`GET /supported`) and the routes are validated (lazy init); a route whose scheme/network is not registered on the server or not listed by the facilitator raises `RouteConfigurationError`
5. `process_http_request(context)` verifies the payment **synchronously**:
   - `"no-payment-required"` -- route not protected, passes through to `original_wsgi`
   - `"payment-error"` -- returns 402 response (JSON with a `PAYMENT-REQUIRED` header, or HTML paywall)
   - `"payment-verified"` -- stores on `flask.g`, calls original WSGI app
6. If the WSGI app returns a successful (2xx) response, settlement is processed **synchronously** (the facilitator's `/settle` call returns once the transaction is confirmed on-chain)
7. The `PAYMENT-RESPONSE` header (base64-encoded settlement response) is added to the buffered response via `ResponseWrapper`
8. The buffered response (with the settlement header) is sent to the client

### Key difference from FastAPI

In Flask, the middleware operates at the WSGI level. It replaces `app.wsgi_app` and wraps the original WSGI callable. The `ResponseWrapper` class captures and buffers the WSGI response so settlement can be processed before the response is released to the client.

---

## Multiple Routes with Different Payment Requirements

```python
from x402.http import PaymentOption
from x402.http.types import RouteConfig
from x402.schemas import AssetAmount

# Different prices for different resources
routes = {
    # Cheap endpoint: $0.001
    "GET /api/status": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            pay_to=AVM_ADDRESS,
            price="$0.001",
            network=AVM_NETWORK,
        ),
    ),
    # Standard endpoint: $0.01
    "GET /api/weather/*": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            pay_to=AVM_ADDRESS,
            price="$0.01",
            network=AVM_NETWORK,
        ),
        description="Weather data",
    ),
    # Premium endpoint: $0.10
    "GET /api/analytics/*": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            pay_to=AVM_ADDRESS,
            price=AssetAmount(
                amount="100000",  # $0.10 in microUSDC
                asset=str(USDC_TESTNET_ASA_ID),
                extra={"name": "USDC", "decimals": 6},
            ),
            network=AVM_NETWORK,
        ),
        description="Premium analytics",
    ),
    # POST endpoint with payment
    "POST /api/generate": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            pay_to=AVM_ADDRESS,
            price="$0.05",
            network=AVM_NETWORK,
        ),
        description="AI generation",
    ),
}
```

### Multiple payment options per route (multi-network)

```python
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

routes = {
    "GET /api/data/*": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                pay_to=AVM_ADDRESS,
                price="$0.01",
                network=ALGORAND_TESTNET_CAIP2,
            ),
            PaymentOption(
                scheme="exact",
                pay_to=EVM_ADDRESS,
                price="$0.01",
                network="eip155:84532",
            ),
        ],
    ),
}
```

---

## Multi-Network Support (AVM + EVM + SVM)

This example shows how to register all three blockchain networks on a single Flask server, matching the pattern used in the official examples. It also needs the EVM and SVM extras: `pip install "x402-avm[flask,avm,evm,svm,httpx]"`.

```python
import os

from dotenv import load_dotenv
from flask import Flask, jsonify

from x402.http import FacilitatorConfig, HTTPFacilitatorClientSync, PaymentOption
from x402.http.middleware.flask import payment_middleware
from x402.http.types import RouteConfig
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.mechanisms.svm.exact import ExactSvmServerScheme
from x402.schemas import Network
from x402.server import x402ResourceServerSync

load_dotenv()

# Addresses for each network
EVM_ADDRESS = os.getenv("EVM_ADDRESS")
SVM_ADDRESS = os.getenv("SVM_ADDRESS")
AVM_ADDRESS = os.getenv("AVM_ADDRESS")
AVM_NETWORK: Network = ALGORAND_TESTNET_CAIP2                      # Algorand TestNet
EVM_NETWORK: Network = "eip155:84532"                              # Base Sepolia
SVM_NETWORK: Network = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"   # Solana Devnet
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://facilitator.goplausible.xyz")

app = Flask(__name__)

# Register all three network schemes (SYNC variants)
facilitator = HTTPFacilitatorClientSync(FacilitatorConfig(url=FACILITATOR_URL))
server = x402ResourceServerSync(facilitator)
server.register(AVM_NETWORK, ExactAvmServerScheme())
server.register(EVM_NETWORK, ExactEvmServerScheme())
server.register(SVM_NETWORK, ExactSvmServerScheme())

# Routes accepting all three networks
routes = {
    "GET /weather": RouteConfig(
        accepts=[
            PaymentOption(scheme="exact", pay_to=AVM_ADDRESS, price="$0.01", network=AVM_NETWORK),
            PaymentOption(scheme="exact", pay_to=EVM_ADDRESS, price="$0.01", network=EVM_NETWORK),
            PaymentOption(scheme="exact", pay_to=SVM_ADDRESS, price="$0.01", network=SVM_NETWORK),
        ],
        mime_type="application/json",
        description="Weather report",
    ),
}

payment_middleware(app, routes=routes, server=server)


@app.route("/weather")
def get_weather():
    return jsonify({"report": {"weather": "sunny", "temperature": 70}})
```

---

## Sync vs Async -- Flask vs FastAPI

Flask and FastAPI use different execution models. The x402 SDK provides matching sync and async variants for each core class. Using the wrong variant will cause runtime errors.

| Component | Flask (Sync) | FastAPI (Async) |
|-----------|-------------|-----------------|
| Resource server | `x402ResourceServerSync` | `x402ResourceServer` |
| Facilitator client | `HTTPFacilitatorClientSync` | `HTTPFacilitatorClient` |
| Middleware class | `PaymentMiddleware` (WSGI) | `PaymentMiddlewareASGI` (ASGI) |
| Payment info storage | `flask.g.payment_payload` | `request.state.payment_payload` |
| HTTP server wrapper | `x402HTTPResourceServerSync` | `x402HTTPResourceServer` |
| Middleware invocation | `PaymentMiddleware(app, ...)` | `app.add_middleware(PaymentMiddlewareASGI, ...)` |
| Settlement | Synchronous (blocking) | `await` async settlement |

### Side-by-side example

**Flask (sync)**:
```python
from flask import Flask, g, jsonify
from x402.server import x402ResourceServerSync
from x402.http import HTTPFacilitatorClientSync, FacilitatorConfig
from x402.http.middleware.flask import payment_middleware
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.exact import ExactAvmServerScheme

app = Flask(__name__)
facilitator = HTTPFacilitatorClientSync(FacilitatorConfig(url="https://facilitator.goplausible.xyz"))
server = x402ResourceServerSync(facilitator)
server.register(ALGORAND_TESTNET_CAIP2, ExactAvmServerScheme())
payment_middleware(app, routes=routes, server=server)

@app.route("/weather")
def get_weather():
    payment = getattr(g, "payment_payload", None)
    return jsonify({"weather": "sunny"})
```

**FastAPI (async)**:
```python
from fastapi import FastAPI, Request
from x402.server import x402ResourceServer
from x402.http import HTTPFacilitatorClient, FacilitatorConfig
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.exact import ExactAvmServerScheme

app = FastAPI()
facilitator = HTTPFacilitatorClient(FacilitatorConfig(url="https://facilitator.goplausible.xyz"))
server = x402ResourceServer(facilitator)
server.register(ALGORAND_TESTNET_CAIP2, ExactAvmServerScheme())
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)

@app.get("/weather")
async def get_weather(request: Request):
    payment = getattr(request.state, "payment_payload", None)
    return {"weather": "sunny"}
```

---

## Error Handling

### Payment errors (402 responses)

When a client sends a request without a valid payment, the middleware returns a 402 response automatically. For API (non-browser) clients the JSON body is empty (`{}`, unless the route sets `unpaid_response_body`) and the payment requirements travel in the `PAYMENT-REQUIRED` response header as base64-encoded JSON. Decoded, it looks like this:

```json
{
    "x402Version": 2,
    "error": "Payment required",
    "resource": {"url": "http://localhost:4021/weather", "description": "Weather report", "mimeType": "application/json"},
    "accepts": [
        {
            "scheme": "exact",
            "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe",
            "asset": "10458941",
            "amount": "10000",
            "payTo": "YOUR_ALGORAND_ADDRESS",
            "maxTimeoutSeconds": 300,
            "extra": {
                "decimals": 6,
                "feePayer": "<facilitator fee payer address, from /supported>",
                "genesisHash": "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
                "genesisId": "testnet-v1.0"
            }
        }
    ]
}
```

(`network` is the value of `ALGORAND_TESTNET_CAIP2`: the canonical id shown here is x402-avm >= 2.0.3; 2.0.2 and earlier emit the legacy full-hash form, which facilitator.goplausible.xyz still accepts during the transition. `extra.genesisHash` is the full genesis hash, not a CAIP-2 reference.) When a payment was sent but is invalid or does not match the route, the 402 carries the same header with `error` set to the reason.

For browser requests (an `Accept` header containing `text/html` and a `User-Agent` containing `Mozilla`), the middleware returns an HTML paywall page instead.

### Settlement failures

If the route handler succeeds but settlement fails, the middleware returns a 402 with error details:

```json
{
    "error": "Settlement failed",
    "details": "reason for failure"
}
```

### Unprotected routes pass through

Routes not listed in the `routes` configuration are served normally. The middleware calls `requires_payment(context)` first and delegates directly to the original `wsgi_app` if the route is not protected.

### Exception handling in middleware

The middleware wraps settlement in a try/except block. If settlement raises an unexpected exception:

```json
{
    "error": "Settlement failed",
    "details": "exception message"
}
```

### Response buffering

The Flask middleware uses a `ResponseWrapper` class to buffer the WSGI response. This is necessary because settlement must complete before the response is sent to the client. The response is captured (status, headers, body chunks), settlement is processed, and then the response (with additional settlement headers) is released.

### Custom error responses

For custom 402 pages, use the `paywall_config` and `paywall_provider` parameters:

```python
from x402.http import PaywallConfig

PaymentMiddleware(
    app,
    routes,
    server,
    paywall_config=PaywallConfig(...),  # Custom paywall UI configuration
)
```

`PaywallConfig` fields: `app_name`, `app_logo`, `session_token_endpoint`, `current_url`, `testnet`. Per route, `RouteConfig.custom_paywall_html` replaces the browser paywall HTML and `RouteConfig.unpaid_response_body` replaces the JSON 402 body.

---

## API Reference Summary

### `PaymentMiddleware(app, routes, server, ...)`

The main WSGI middleware class. Replaces `app.wsgi_app` on initialization.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `app` | `Flask` | required | Flask application instance |
| `routes` | `RoutesConfig` | required | Route configuration for protected endpoints |
| `server` | `x402ResourceServerSync` | required | Pre-configured **sync** resource server |
| `paywall_config` | `PaywallConfig \| None` | `None` | Optional paywall UI configuration |
| `paywall_provider` | `PaywallProvider \| None` | `None` | Optional custom paywall provider |
| `sync_facilitator_on_start` | `bool` | `True` | Fetch facilitator support on first request |

**Side effect**: Replaces `app.wsgi_app` with the payment-checking WSGI middleware.

### `payment_middleware(app, routes, server, ...)`

Factory function. Accepts the same parameters as `PaymentMiddleware` and returns a `PaymentMiddleware` instance.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `app` | `Flask` | required | Flask application instance |
| `routes` | `RoutesConfig` | required | Route configuration |
| `server` | `x402ResourceServerSync` | required | Pre-configured **sync** resource server |
| `paywall_config` | `PaywallConfig \| None` | `None` | Optional paywall config |
| `paywall_provider` | `PaywallProvider \| None` | `None` | Optional custom paywall |
| `sync_facilitator_on_start` | `bool` | `True` | Lazy initialization flag |

**Returns**: `PaymentMiddleware` instance.

### `payment_middleware_from_config(app, routes, ...)`

Convenience function that creates the `x402ResourceServer` internally. In x402-avm 2.0.2 it creates the **async** `x402ResourceServer`, so it raises `TypeError` with Flask (see [Middleware from Config](#middleware-from-config)); use `payment_middleware` with an `x402ResourceServerSync` instead.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `app` | `Flask` | required | Flask application instance |
| `routes` | `RoutesConfig` | required | Route configuration |
| `facilitator_client` | `Any` | `None` | Facilitator client for payment processing |
| `schemes` | `list[dict] \| None` | `None` | Scheme registrations (`{"network": ..., "server": ...}`) |
| `paywall_config` | `PaywallConfig \| None` | `None` | Optional paywall config |
| `paywall_provider` | `PaywallProvider \| None` | `None` | Optional custom paywall |
| `sync_facilitator_on_start` | `bool` | `True` | Lazy initialization flag |

**Returns**: `PaymentMiddleware` instance.

### `FlaskAdapter`

Implements the `HTTPAdapter` protocol for Flask requests. Used internally by the middleware. Methods:

| Method | Returns | Description |
|--------|---------|-------------|
| `get_header(name)` | `str \| None` | Case-insensitive header lookup |
| `get_method()` | `str` | HTTP method (GET, POST, etc.) |
| `get_path()` | `str` | Request path |
| `get_url()` | `str` | Full request URL |
| `get_accept_header()` | `str` | Accept header value |
| `get_user_agent()` | `str` | User-Agent header value |
| `get_query_params()` | `dict` | All query parameters |
| `get_query_param(name)` | `str \| None` | Single query parameter |
| `get_body()` | `Any \| None` | Parsed JSON body (via `request.get_json(silent=True)`) |

### `ResponseWrapper`

Internal class that captures and buffers the WSGI response for settlement processing.

| Method/Property | Description |
|-----------------|-------------|
| `status` | Captured HTTP status string |
| `status_code` | Parsed integer status code |
| `headers` | List of (name, value) header tuples |
| `add_header(name, value)` | Add a header to the response |
| `send_response(body_chunks)` | Send the buffered response to the client |

### Key Types

| Type | Import | Description |
|------|--------|-------------|
| `RouteConfig` | `x402.http.types` | Dataclass for route configuration |
| `PaymentOption` | `x402.http` | Dataclass for payment options |
| `RoutesConfig` | `x402.http.types` | `dict[str, RouteConfig] \| RouteConfig` |
| `PaywallConfig` | `x402.http` | Paywall UI configuration |
| `AssetAmount` | `x402.schemas` | Explicit asset amount specification |
| `Network` | `x402.schemas` | Network identifier type alias |

### Algorand-Specific Constants

| Constant | Value | Import |
|----------|-------|--------|
| `ALGORAND_TESTNET_CAIP2` | `"algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"` | `x402.mechanisms.avm` |
| `ALGORAND_MAINNET_CAIP2` | `"algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k"` | `x402.mechanisms.avm` |
| `USDC_TESTNET_ASA_ID` | `10458941` | `x402.mechanisms.avm` |
| `USDC_MAINNET_ASA_ID` | `31566704` | `x402.mechanisms.avm` |

The CAIP-2 values are x402-avm >= 2.0.3; 2.0.2 and earlier use the legacy full-hash form, which facilitator.goplausible.xyz still accepts during the transition. Use the constants rather than string literals.

---

## Cross-References

- **FastAPI middleware (Python)**: See `x402-avm-fastapi-examples-python.md` in this directory for the async FastAPI equivalent.
- **AVM mechanism details (Python)**: See `x402-avm-avm-examples-python.md` in this directory for client-side signer implementation, facilitator setup, and low-level AVM mechanism usage.
- **TypeScript examples**: See `../typescript/` directory for Express/Next.js middleware examples with Algorand.
- **Source code**: Flask middleware implementation is at `python/x402/http/middleware/flask.py` in the [GoPlausible/x402-avm](https://github.com/GoPlausible/x402-avm) repository (branch `branch-v2-algorand-publish`, the source of the `x402-avm` PyPI package).
- **Official example server**: `examples/python/servers/flask/main.py` (same repository and branch) shows a multi-network Flask server.
