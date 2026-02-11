# x402-avm Python FastAPI Middleware Examples

This guide covers the `x402-avm[fastapi]` extra for protecting FastAPI endpoints with x402 payment requirements on the Algorand Virtual Machine (AVM). All examples focus on Algorand (AVM) use cases.

> **Package naming**: Install with `pip install "x402-avm[fastapi,avm]"` but import as `from x402...` (the Python import name is `x402`, not `x402_avm`).

---

## Table of Contents

1. [Installation](#installation)
2. [Key Imports](#key-imports)
3. [Basic Middleware Setup](#basic-middleware-setup)
4. [Route Configuration Patterns](#route-configuration-patterns)
5. [ASGI Middleware Class](#asgi-middleware-class)
6. [Middleware from Config](#middleware-from-config)
7. [Complete Algorand Example](#complete-algorand-example---resource-server-accepting-usdc-on-algorand-testnet)
8. [Accessing Payment Info in Route Handlers](#accessing-payment-info-in-route-handlers)
9. [Multiple Routes with Different Payment Requirements](#multiple-routes-with-different-payment-requirements)
10. [Multi-Network Support (AVM + EVM + SVM)](#multi-network-support-avm--evm--svm)
11. [Error Handling](#error-handling)
12. [API Reference Summary](#api-reference-summary)
13. [Cross-References](#cross-references)

---

## Installation

```bash
# FastAPI middleware + Algorand mechanism
pip install "x402-avm[fastapi,avm]"

# Also install dotenv for environment variable management (optional)
pip install python-dotenv
```

The `fastapi` extra installs:
- `fastapi[standard]>=0.115.0`
- `starlette>=0.27.0`

The `avm` extra installs:
- `py-algorand-sdk>=2.0.0`

---

## Key Imports

```python
# Direct imports (recommended - avoids requiring all frameworks)
from x402.http.middleware.fastapi import (
    payment_middleware,              # Function-based middleware factory
    payment_middleware_from_config,  # Middleware from config (creates server internally)
    PaymentMiddlewareASGI,          # Starlette ASGI middleware class
    FastAPIAdapter,                 # HTTPAdapter implementation for FastAPI requests
)

# Or via lazy import from the middleware package
from x402.http.middleware import fastapi_payment_middleware         # -> payment_middleware
from x402.http.middleware import fastapi_payment_middleware_from_config  # -> payment_middleware_from_config
from x402.http.middleware import PaymentMiddlewareASGI              # -> PaymentMiddlewareASGI
from x402.http.middleware import FastAPIAdapter                     # -> FastAPIAdapter

# Core x402 components (async variants for FastAPI)
from x402.server import x402ResourceServer          # Async resource server
from x402.http import HTTPFacilitatorClient          # Async facilitator client
from x402.http import FacilitatorConfig              # Facilitator configuration
from x402.http import PaymentOption                  # Payment option dataclass
from x402.http.types import RouteConfig              # Route configuration dataclass
from x402.schemas import AssetAmount, Network        # Type helpers

# AVM-specific imports
from x402.mechanisms.avm import (
    ALGORAND_TESTNET_CAIP2,         # "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
    ALGORAND_MAINNET_CAIP2,         # "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
    USDC_TESTNET_ASA_ID,            # 10458941
    USDC_MAINNET_ASA_ID,            # 31566704
)
from x402.mechanisms.avm.exact import (
    ExactAvmServerScheme,           # Server-side scheme for AVM
    register_exact_avm_server,      # Registration helper
)
```

---

## Basic Middleware Setup

There are three ways to add x402 payment middleware to a FastAPI application. All three are equivalent in behavior.

### Option A: Function-based middleware (recommended)

```python
from fastapi import FastAPI, Request
from x402.server import x402ResourceServer
from x402.http import HTTPFacilitatorClient, FacilitatorConfig, PaymentOption
from x402.http.types import RouteConfig
from x402.http.middleware.fastapi import payment_middleware
from x402.mechanisms.avm.exact import ExactAvmServerScheme

app = FastAPI()

# 1. Configure facilitator client and resource server (async variants)
facilitator = HTTPFacilitatorClient(FacilitatorConfig(url="https://x402.org/facilitator"))
server = x402ResourceServer(facilitator)

# 2. Register AVM scheme on the server
server.register(
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    ExactAvmServerScheme(),
)

# 3. Define protected routes
routes = {
    "GET /api/data/*": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            network="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            pay_to="YOUR_ALGORAND_ADDRESS",
            price="$0.01",
        ),
    ),
}

# 4. Create and register middleware
x402_mw = payment_middleware(routes=routes, server=server)

@app.middleware("http")
async def x402_middleware(request: Request, call_next):
    return await x402_mw(request, call_next)

# 5. Define route handlers
@app.get("/api/data/weather")
async def get_weather():
    return {"temperature": 72, "unit": "F", "condition": "sunny"}
```

### Option B: ASGI middleware class

```python
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)
```

### Option C: Inline middleware decorator

```python
# Alternative single-line registration
app.middleware("http")(payment_middleware(routes=routes, server=server))
```

---

## Route Configuration Patterns

Routes define which endpoints require payment and how much. The key format is `"METHOD /path/pattern"`.

### Simple string price (auto-converts to USDC)

```python
routes = {
    "GET /api/weather": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            network="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            pay_to="RECEIVER_ALGORAND_ADDRESS",
            price="$0.01",  # Automatically converted to 10000 microUSDC
        ),
    ),
}
```

### Explicit AssetAmount (full control)

```python
from x402.schemas import AssetAmount

routes = {
    "GET /api/premium/*": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            network="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
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
)
```

### Dict-based route config (alternative to RouteConfig)

The routes dictionary can also use raw dicts instead of `RouteConfig` and `PaymentOption` dataclasses:

```python
routes = {
    "GET /api/weather/*": {
        "accepts": {
            "scheme": "exact",
            "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            "maxAmountRequired": "10000",
            "asset": "10458941",
            "payTo": "RECEIVER_ALGORAND_ADDRESS",
            "resource": "https://api.example.com/api/weather",
        }
    }
}
```

---

## ASGI Middleware Class

The `PaymentMiddlewareASGI` class extends Starlette's `BaseHTTPMiddleware` and is the recommended approach when using `app.add_middleware()`.

```python
from fastapi import FastAPI
from x402.server import x402ResourceServer
from x402.http import HTTPFacilitatorClient, FacilitatorConfig, PaymentOption
from x402.http.types import RouteConfig
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.mechanisms.avm.exact import ExactAvmServerScheme

app = FastAPI()

# Setup server
facilitator = HTTPFacilitatorClient(FacilitatorConfig(url="https://x402.org/facilitator"))
server = x402ResourceServer(facilitator)
server.register(
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    ExactAvmServerScheme(),
)

# Routes
routes = {
    "GET /weather": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            pay_to="YOUR_ALGORAND_ADDRESS",
            price="$0.01",
            network="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
        ),
        mime_type="application/json",
        description="Weather report",
    ),
}

# Register middleware (this internally creates the function-based middleware)
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)

@app.get("/weather")
async def get_weather():
    return {"report": {"weather": "sunny", "temperature": 70}}
```

The `PaymentMiddlewareASGI` constructor accepts:

| Parameter | Type | Description |
|-----------|------|-------------|
| `app` | `ASGIApp` | Passed automatically by Starlette |
| `routes` | `RoutesConfig` | Route configuration |
| `server` | `x402ResourceServer` | Pre-configured server instance |
| `paywall_config` | `PaywallConfig \| None` | Optional paywall UI config |
| `paywall_provider` | `PaywallProvider \| None` | Optional custom paywall |

---

## Middleware from Config

The `payment_middleware_from_config` function is a convenience wrapper that creates the `x402ResourceServer` internally.

```python
from x402.http import HTTPFacilitatorClient, FacilitatorConfig
from x402.http.middleware.fastapi import payment_middleware_from_config
from x402.mechanisms.avm.exact import ExactAvmServerScheme

facilitator = HTTPFacilitatorClient(FacilitatorConfig(url="https://x402.org/facilitator"))

routes = {
    "GET /api/data/*": {
        "accepts": {
            "scheme": "exact",
            "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            "payTo": "YOUR_ALGORAND_ADDRESS",
            "maxAmountRequired": "10000",
            "asset": "10458941",
        }
    }
}

mw = payment_middleware_from_config(
    routes=routes,
    facilitator_client=facilitator,
    schemes=[
        {
            "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            "server": ExactAvmServerScheme(),
        },
    ],
)

@app.middleware("http")
async def x402_middleware(request, call_next):
    return await mw(request, call_next)
```

---

## Complete Algorand Example - Resource Server Accepting USDC on Algorand Testnet

This is a full, runnable example of a FastAPI resource server that gates endpoints behind Algorand USDC payments.

### `.env` file

```env
AVM_ADDRESS=YOUR_ALGORAND_RECEIVER_ADDRESS
FACILITATOR_URL=https://x402.org/facilitator
```

### `main.py`

```python
"""FastAPI resource server accepting USDC payments on Algorand Testnet via x402."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from pydantic import BaseModel

from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.avm import USDC_TESTNET_ASA_ID
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.schemas import AssetAmount, Network

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

AVM_ADDRESS = os.getenv("AVM_ADDRESS")
if not AVM_ADDRESS:
    raise ValueError("AVM_ADDRESS environment variable is required")

AVM_NETWORK: Network = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402.org/facilitator")

# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------


class WeatherReport(BaseModel):
    weather: str
    temperature: int
    unit: str


class WeatherResponse(BaseModel):
    report: WeatherReport


class PremiumContentResponse(BaseModel):
    content: str
    tier: str


# ---------------------------------------------------------------------------
# App & Middleware
# ---------------------------------------------------------------------------

app = FastAPI(title="x402 AVM Resource Server")

# Create async facilitator client and resource server
facilitator = HTTPFacilitatorClient(FacilitatorConfig(url=FACILITATOR_URL))
server = x402ResourceServer(facilitator)

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

# Register ASGI middleware
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)

# ---------------------------------------------------------------------------
# Route Handlers
# ---------------------------------------------------------------------------


# Fix: import must be at top
from x402.server import x402ResourceServer


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint (no payment required)."""
    return {"status": "ok"}


@app.get("/weather")
async def get_weather(request: Request) -> WeatherResponse:
    """Weather report endpoint (requires $0.01 USDC payment)."""
    return WeatherResponse(
        report=WeatherReport(weather="sunny", temperature=72, unit="F")
    )


@app.get("/premium/content")
async def get_premium_content(request: Request) -> PremiumContentResponse:
    """Premium content endpoint (requires $0.05 USDC payment)."""
    return PremiumContentResponse(
        content="This is premium Algorand analytics data.",
        tier="gold",
    )


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=4021)
```

### Run the server

```bash
uvicorn main:app --host 0.0.0.0 --port 4021
```

---

## Accessing Payment Info in Route Handlers

After the middleware verifies a payment, it stores the payment payload and requirements on `request.state`. You can access this information inside your route handlers.

```python
from fastapi import FastAPI, Request

@app.get("/api/paid-resource")
async def paid_resource(request: Request):
    # Payment payload (the verified payment from the client)
    payment_payload = getattr(request.state, "payment_payload", None)

    # Payment requirements (the route's payment config that was matched)
    payment_requirements = getattr(request.state, "payment_requirements", None)

    if payment_payload:
        # Access payment details
        payer_address = payment_payload.payload.get("from", "unknown")
        return {
            "data": "premium content",
            "paid_by": payer_address,
        }

    return {"data": "premium content"}
```

### How the middleware flow works

1. Client sends request with `X-Payment` or `Payment-Signature` header
2. Middleware checks if the route requires payment via `requires_payment(context)`
3. On first protected request, facilitator support is synchronized (lazy init)
4. `process_http_request(context)` verifies the payment:
   - `"no-payment-required"` -- route not protected, passes through
   - `"payment-error"` -- returns 402 response (JSON or HTML paywall)
   - `"payment-verified"` -- stores on `request.state`, calls route handler
5. If route handler returns a successful (2xx) response, settlement is processed
6. Settlement headers are added to the response

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

A single route can accept payments from multiple networks. The client chooses which network to pay on.

```python
routes = {
    "GET /api/data/*": RouteConfig(
        accepts=[
            # Algorand option
            PaymentOption(
                scheme="exact",
                pay_to=AVM_ADDRESS,
                price="$0.01",
                network="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            ),
            # EVM option (Base Sepolia)
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

This example shows how to register all three blockchain networks on a single FastAPI server, matching the pattern used in the official examples.

```python
import os

from dotenv import load_dotenv
from fastapi import FastAPI

from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.avm import USDC_TESTNET_ASA_ID
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.mechanisms.svm.exact import ExactSvmServerScheme
from x402.schemas import AssetAmount, Network
from x402.server import x402ResourceServer

load_dotenv()

# Addresses for each network
EVM_ADDRESS = os.getenv("EVM_ADDRESS")
SVM_ADDRESS = os.getenv("SVM_ADDRESS")
AVM_ADDRESS = os.getenv("AVM_ADDRESS")
AVM_NETWORK: Network = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
EVM_NETWORK: Network = "eip155:84532"
SVM_NETWORK: Network = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402.org/facilitator")

app = FastAPI()

# Register all three network schemes
facilitator = HTTPFacilitatorClient(FacilitatorConfig(url=FACILITATOR_URL))
server = x402ResourceServer(facilitator)
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

app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)


@app.get("/weather")
async def get_weather():
    return {"report": {"weather": "sunny", "temperature": 70}}
```

---

## Error Handling

### Payment errors (402 responses)

When a client sends a request without a valid payment, the middleware returns a 402 response automatically. The response body contains payment requirements the client needs to fulfill.

### Settlement failures

If the route handler succeeds but settlement fails, the middleware returns a 402 with error details:

```json
{
    "error": "Settlement failed",
    "details": "reason for failure"
}
```

### Unprotected routes pass through

Routes not listed in the `routes` configuration are served normally without any payment check. The middleware calls `requires_payment(context)` first and passes through immediately if the route is not protected.

### Exception handling in middleware

The middleware wraps settlement in a try/except block. If settlement raises an unexpected exception, it returns:

```json
{
    "error": "Settlement failed",
    "details": "exception message"
}
```

### Custom error responses

For custom 402 pages, use the `paywall_config` and `paywall_provider` parameters:

```python
from x402.http import PaywallConfig

app.add_middleware(
    PaymentMiddlewareASGI,
    routes=routes,
    server=server,
    paywall_config=PaywallConfig(...),  # Custom paywall UI configuration
)
```

---

## API Reference Summary

### `payment_middleware(routes, server, ...)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `routes` | `RoutesConfig` | required | Route configuration for protected endpoints |
| `server` | `x402ResourceServer` | required | Pre-configured async resource server |
| `paywall_config` | `PaywallConfig \| None` | `None` | Optional paywall UI configuration |
| `paywall_provider` | `PaywallProvider \| None` | `None` | Optional custom paywall provider |
| `sync_facilitator_on_start` | `bool` | `True` | Fetch facilitator support on first request |

**Returns**: Async middleware callable `(Request, call_next) -> Response`

### `payment_middleware_from_config(routes, facilitator_client, ...)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `routes` | `RoutesConfig` | required | Route configuration |
| `facilitator_client` | `Any` | `None` | Facilitator client for payment processing |
| `schemes` | `list[dict] \| None` | `None` | Scheme registrations (`{"network": ..., "server": ...}`) |
| `paywall_config` | `PaywallConfig \| None` | `None` | Optional paywall config |
| `paywall_provider` | `PaywallProvider \| None` | `None` | Optional custom paywall |
| `sync_facilitator_on_start` | `bool` | `True` | Lazy initialization flag |

**Returns**: Async middleware callable `(Request, call_next) -> Response`

### `PaymentMiddlewareASGI`

Starlette `BaseHTTPMiddleware` subclass. Accepts the same parameters as `payment_middleware` via `app.add_middleware()`.

### `FastAPIAdapter`

Implements the `HTTPAdapter` protocol for FastAPI/Starlette requests. Used internally by the middleware. Methods:

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
| `get_body()` | `None` | Returns None (body requires async access) |

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
| `ALGORAND_TESTNET_CAIP2` | `"algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="` | `x402.mechanisms.avm` |
| `ALGORAND_MAINNET_CAIP2` | `"algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="` | `x402.mechanisms.avm` |
| `USDC_TESTNET_ASA_ID` | `10458941` | `x402.mechanisms.avm` |
| `USDC_MAINNET_ASA_ID` | `31566704` | `x402.mechanisms.avm` |

---

## Cross-References

- **Flask middleware (Python)**: See `x402-avm-flask-examples-python.md` in this directory for the synchronous Flask equivalent.
- **AVM mechanism details (Python)**: See `x402-avm-avm-examples-python.md` in this directory for client-side signer implementation, facilitator setup, and low-level AVM mechanism usage.
- **TypeScript examples**: See `../typescript/` directory for Express/Next.js middleware examples with Algorand.
- **Source code**: FastAPI middleware implementation is at `python/x402/http/middleware/fastapi.py`.
- **Official example server**: `examples/python/servers/fastapi/main.py` shows a multi-network FastAPI server.
