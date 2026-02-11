# x402-avm Python httpx Client Examples

This guide covers using the `x402-avm` Python package with the `httpx` async HTTP client for Algorand (AVM) payments. The httpx integration provides an `AsyncBaseTransport` that intercepts HTTP 402 Payment Required responses, automatically creates payment payloads, and retries with payment headers.

> **Package note:** Install with `pip install x402-avm`, but all imports use `from x402...` (not `from x402_avm...`).

---

## Table of Contents

1. [Installation](#installation)
2. [Overview of httpx APIs](#overview-of-httpx-apis)
3. [Basic Usage with x402HttpxClient](#basic-usage-with-x402httpxclient)
4. [Using wrapHttpxWithPayment](#using-wraphttpxwithpayment)
5. [Custom Transport Setup](#custom-transport-setup)
6. [Config-Based Setup with wrapHttpxWithPaymentFromConfig](#config-based-setup-with-wraphttpxwithpaymentfromconfig)
7. [Complete Algorand AVM Example](#complete-algorand-avm-example)
8. [Error Handling](#error-handling)
9. [API Reference Summary](#api-reference-summary)
10. [See Also](#see-also)

---

## Installation

Install the package with both the `httpx` and `avm` extras:

```bash
pip install "x402-avm[httpx,avm]"
```

This installs:
- `httpx>=0.28.1` -- async HTTP client
- `py-algorand-sdk` -- Algorand SDK for transaction signing

---

## Overview of httpx APIs

The httpx integration is in `x402.http.clients.httpx`. All public names are also available via the lazy-import package `x402.http.clients`.

```python
# Direct imports (preferred -- explicit)
from x402.http.clients.httpx import (
    x402HttpxClient,                   # Convenience class extending httpx.AsyncClient
    wrapHttpxWithPayment,              # Factory: creates httpx.AsyncClient with payment transport
    wrapHttpxWithPaymentFromConfig,    # Factory: creates from x402ClientConfig
    x402_httpx_transport,              # Low-level: returns x402AsyncTransport
    x402AsyncTransport,                # The AsyncBaseTransport class itself
)

# Lazy imports (also works)
from x402.http.clients import x402HttpxClient, wrapHttpxWithPayment
```

All of these accept either an `x402Client` (async) or an `x402HTTPClient` wrapper.

---

## Basic Usage with x402HttpxClient

`x402HttpxClient` extends `httpx.AsyncClient` with a built-in payment transport. This is the recommended approach for most use cases.

```python
import asyncio
from x402 import x402Client
from x402.http.clients.httpx import x402HttpxClient

async def main():
    # 1. Create the x402 client and register payment schemes (see AVM example below)
    x402 = x402Client()
    # ... register schemes ...

    # 2. Create the httpx client with payment handling
    async with x402HttpxClient(x402) as client:
        response = await client.get("https://api.example.com/paid-resource")
        print(response.status_code)
        print(response.text)

asyncio.run(main())
```

Under the hood, `x402HttpxClient.__init__` creates an `x402AsyncTransport` and passes it as the `transport` argument to `httpx.AsyncClient`. Any additional keyword arguments are forwarded to `httpx.AsyncClient`:

```python
async with x402HttpxClient(x402, timeout=30.0, follow_redirects=True) as client:
    response = await client.get("https://api.example.com/paid-resource")
```

---

## Using wrapHttpxWithPayment

`wrapHttpxWithPayment` is a factory function that returns a new `httpx.AsyncClient` with payment transport configured. Unlike `x402HttpxClient`, it returns a standard `httpx.AsyncClient` instance.

```python
import asyncio
from x402 import x402Client
from x402.http.clients.httpx import wrapHttpxWithPayment

async def main():
    x402 = x402Client()
    # ... register schemes ...

    # Creates a new httpx.AsyncClient with x402AsyncTransport
    async with wrapHttpxWithPayment(x402, timeout=30.0) as client:
        response = await client.get("https://api.example.com/paid-resource")
        print(response.status_code)
        print(response.text)

asyncio.run(main())
```

**Signature:**

```python
def wrapHttpxWithPayment(
    x402_client: x402Client | x402HTTPClient,
    **httpx_kwargs: Any,
) -> httpx.AsyncClient:
```

---

## Custom Transport Setup

For maximum control, use `x402_httpx_transport` to create a transport and pass it to your own `httpx.AsyncClient`. This lets you layer the payment transport on top of a custom underlying transport.

```python
import asyncio
import httpx
from x402 import x402Client
from x402.http.clients.httpx import x402_httpx_transport

async def main():
    x402 = x402Client()
    # ... register schemes ...

    # Option A: Default underlying transport
    transport = x402_httpx_transport(x402)

    # Option B: Custom underlying transport (e.g., with retries or mTLS)
    custom_transport = httpx.AsyncHTTPTransport(retries=3)
    transport = x402_httpx_transport(x402, transport=custom_transport)

    async with httpx.AsyncClient(transport=transport) as client:
        response = await client.get("https://api.example.com/paid-resource")
        print(response.status_code)

asyncio.run(main())
```

**Signature:**

```python
def x402_httpx_transport(
    client: x402Client | x402HTTPClient,
    transport: AsyncBaseTransport | None = None,
) -> x402AsyncTransport:
```

---

## Config-Based Setup with wrapHttpxWithPaymentFromConfig

If you prefer a declarative configuration object, use `wrapHttpxWithPaymentFromConfig`. It creates an `x402Client` from a `x402ClientConfig` internally.

```python
import asyncio
from x402 import x402ClientConfig, SchemeRegistration
from x402.http.clients.httpx import wrapHttpxWithPaymentFromConfig
from x402.mechanisms.avm.exact import ExactAvmClientScheme

config = x402ClientConfig(
    schemes=[
        SchemeRegistration(
            network="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            client=ExactAvmClientScheme(signer=my_avm_signer),
        ),
    ],
)

async def main():
    async with wrapHttpxWithPaymentFromConfig(config) as client:
        response = await client.get("https://api.example.com/paid-resource")
        print(response.text)

asyncio.run(main())
```

**Signature:**

```python
def wrapHttpxWithPaymentFromConfig(
    config: x402ClientConfig,
    **httpx_kwargs: Any,
) -> httpx.AsyncClient:
```

---

## Complete Algorand AVM Example

This is a full, self-contained example showing how to set up an httpx client with Algorand payment handling. It implements the `ClientAvmSigner` protocol using `algosdk`.

```python
"""Complete x402-avm httpx example with Algorand payment handling."""

import asyncio
import base64
import os

import algosdk
from x402 import x402Client
from x402.http import x402HTTPClient
from x402.http.clients.httpx import x402HttpxClient
from x402.mechanisms.avm.exact.register import register_exact_avm_client


class AlgorandSigner:
    """Implements the ClientAvmSigner protocol using algosdk.

    The x402 SDK passes raw msgpack bytes between methods. The algosdk
    Python API works with base64 strings, so conversion happens at the
    boundary inside sign_transactions().
    """

    def __init__(self, secret_key: bytes, address: str):
        self._secret_key = secret_key
        self._address = address

    @property
    def address(self) -> str:
        """58-character Algorand address."""
        return self._address

    def sign_transactions(
        self,
        unsigned_txns: list[bytes],
        indexes_to_sign: list[int],
    ) -> list[bytes | None]:
        """Sign specified transactions in a group.

        Args:
            unsigned_txns: Raw msgpack-encoded unsigned transactions.
            indexes_to_sign: Which indexes this signer should sign.

        Returns:
            Parallel list: signed bytes at signed indexes, None elsewhere.
        """
        sk_b64 = base64.b64encode(self._secret_key).decode()
        result: list[bytes | None] = []
        for i, txn_bytes in enumerate(unsigned_txns):
            if i in indexes_to_sign:
                # Boundary: raw bytes -> base64 string for algosdk
                txn = algosdk.encoding.msgpack_decode(
                    base64.b64encode(txn_bytes).decode()
                )
                signed = txn.sign(sk_b64)
                # Boundary: base64 string from algosdk -> raw bytes
                result.append(
                    base64.b64decode(algosdk.encoding.msgpack_encode(signed))
                )
            else:
                result.append(None)
        return result


async def main():
    # --- 1. Load private key ---
    avm_private_key = os.environ["AVM_PRIVATE_KEY"]  # Base64-encoded 64-byte key
    secret_key = base64.b64decode(avm_private_key)
    if len(secret_key) != 64:
        raise ValueError("AVM_PRIVATE_KEY must be a Base64-encoded 64-byte key")

    # Derive address from the public key portion (last 32 bytes)
    avm_address = algosdk.encoding.encode_address(secret_key[32:])
    print(f"Algorand address: {avm_address}")

    # --- 2. Create signer and x402 client ---
    signer = AlgorandSigner(secret_key, avm_address)
    x402 = x402Client()

    # register_exact_avm_client registers:
    #   - V2: "algorand:*" wildcard (matches any Algorand CAIP-2 network)
    #   - V1: all legacy network names ("algorand-mainnet", "algorand-testnet")
    register_exact_avm_client(x402, signer)

    # --- 3. Make a paid request ---
    resource_url = os.environ.get(
        "RESOURCE_URL", "https://api.example.com/paid-resource"
    )

    async with x402HttpxClient(x402) as client:
        response = await client.get(resource_url)
        await response.aread()

        print(f"Status: {response.status_code}")
        print(f"Body: {response.text}")

        # --- 4. Extract payment settlement response ---
        if response.is_success:
            http_client = x402HTTPClient(x402)
            try:
                settle = http_client.get_payment_settle_response(
                    lambda name: response.headers.get(name)
                )
                print(f"Settlement: {settle.model_dump_json(indent=2)}")
            except ValueError:
                print("No payment response header found")


if __name__ == "__main__":
    asyncio.run(main())
```

### Environment Variables

| Variable | Description | Example |
|---|---|---|
| `AVM_PRIVATE_KEY` | Base64-encoded 64-byte key (32-byte seed + 32-byte public key) | `base64(seed \|\| pubkey)` |
| `RESOURCE_URL` | The paid endpoint URL | `https://api.example.com/paid` |
| `ALGOD_TESTNET_URL` | (Optional) Custom Algod URL; defaults to AlgoNode testnet | `https://testnet-api.algonode.cloud` |
| `ALGOD_MAINNET_URL` | (Optional) Custom Algod URL; defaults to AlgoNode mainnet | `https://mainnet-api.algonode.cloud` |

### How It Works

1. The `x402HttpxClient` sends a GET request to the resource URL.
2. If the server returns HTTP 402, the `x402AsyncTransport` intercepts the response.
3. It parses the `PaymentRequired` data from response headers (V2) or body (V1).
4. The registered `ExactAvmScheme` creates an atomic transaction group (ASA transfer) and signs it via `AlgorandSigner`.
5. Payment headers are added to a retry request.
6. The server validates payment and returns the resource.

### Registering with a Specific Network

By default, `register_exact_avm_client` registers the wildcard `"algorand:*"`. To register for a specific network only:

```python
# Testnet only
register_exact_avm_client(x402, signer, networks="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=")

# Mainnet only
register_exact_avm_client(x402, signer, networks="algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=")

# Both explicitly
register_exact_avm_client(x402, signer, networks=[
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
])
```

### Using a Custom Algod Endpoint

```python
register_exact_avm_client(
    x402,
    signer,
    algod_url="https://my-private-algod.example.com",
)
```

---

## Error Handling

The transport raises specific exceptions you can catch:

```python
from x402.http.clients.httpx import (
    PaymentError,                   # Base class for all payment errors
    PaymentAlreadyAttemptedError,   # Payment retry already attempted
    MissingRequestConfigError,      # Missing request configuration
)

async with x402HttpxClient(x402) as client:
    try:
        response = await client.get("https://api.example.com/paid")
    except PaymentAlreadyAttemptedError:
        print("Payment was already attempted but failed")
    except PaymentError as e:
        print(f"Payment handling failed: {e}")
    except httpx.HTTPError as e:
        print(f"HTTP error: {e}")
```

The transport will **not** retry more than once. If the first payment-bearing retry still returns 402, the 402 response is returned as-is.

---

## API Reference Summary

| API | Type | Returns | Description |
|---|---|---|---|
| `x402HttpxClient(x402_client, **kwargs)` | Class | `httpx.AsyncClient` subclass | Recommended. Extends AsyncClient with built-in payment transport. |
| `wrapHttpxWithPayment(x402_client, **kwargs)` | Function | `httpx.AsyncClient` | Creates new AsyncClient with payment transport. |
| `wrapHttpxWithPaymentFromConfig(config, **kwargs)` | Function | `httpx.AsyncClient` | Creates from x402ClientConfig. Builds x402Client internally. |
| `x402_httpx_transport(client, transport?)` | Function | `x402AsyncTransport` | Low-level. Returns transport for manual AsyncClient construction. |
| `x402AsyncTransport(client, transport?)` | Class | `AsyncBaseTransport` | The transport implementation. Intercepts 402, creates payment, retries. |

All APIs use `x402Client` (async). For synchronous HTTP, use the `requests` integration with `x402ClientSync`.

---

## See Also

- [x402-avm Python requests Examples](./x402-avm-requests-examples-python.md) -- synchronous HTTP client with `requests`
- [x402-avm Python AVM Mechanism Examples](./x402-avm-avm-examples-python.md) -- AVM signer and scheme details
- [x402-avm TypeScript Examples](../typescript/) -- TypeScript equivalents using `fetch` and `axios`
