# x402-avm Python requests Client Examples

This guide covers using the `x402-avm` Python package with the `requests` synchronous HTTP library for Algorand (AVM) payments. The requests integration provides an `HTTPAdapter` that intercepts HTTP 402 Payment Required responses, automatically creates payment payloads, and retries with payment headers -- all synchronously.

> **Package note:** Install with `pip install x402-avm`, but all imports use `from x402...` (not `from x402_avm...`).

---

## Table of Contents

1. [Installation](#installation)
2. [Sync vs Async: Which Client to Use](#sync-vs-async-which-client-to-use)
3. [Overview of requests APIs](#overview-of-requests-apis)
4. [Basic Usage with x402_requests](#basic-usage-with-x402_requests)
5. [Using wrapRequestsWithPayment](#using-wraprequestswithpayment)
6. [Manual Adapter Mounting](#manual-adapter-mounting)
7. [Config-Based Setup with wrapRequestsWithPaymentFromConfig](#config-based-setup-with-wraprequestswithpaymentfromconfig)
8. [Complete Algorand AVM Example](#complete-algorand-avm-example)
9. [Error Handling](#error-handling)
10. [API Reference Summary](#api-reference-summary)
11. [See Also](#see-also)

---

## Installation

Install the package with both the `requests` and `avm` extras:

```bash
pip install "x402-avm[requests,avm]"
```

This installs:
- `requests>=2.31.0` -- synchronous HTTP client
- `py-algorand-sdk` -- Algorand SDK for transaction signing

---

## Sync vs Async: Which Client to Use

The `requests` library is synchronous. It requires **`x402ClientSync`**, not `x402Client`.

| HTTP Library | x402 Client | Payment Creation | Import |
|---|---|---|---|
| `requests` (sync) | `x402ClientSync` | `client.create_payment_payload(...)` (sync) | `from x402 import x402ClientSync` |
| `httpx` (async) | `x402Client` | `await client.create_payment_payload(...)` (async) | `from x402 import x402Client` |

The `x402HTTPAdapter` performs a runtime check and raises `TypeError` if you accidentally pass an async `x402Client`:

```
TypeError: x402HTTPAdapter (requests) requires a sync client,
but got x402Client which has async methods.
Use x402ClientSync instead of x402Client,
or use x402AsyncTransport (httpx) with x402Client.
```

---

## Overview of requests APIs

The requests integration is in `x402.http.clients.requests`. All public names are also available via the lazy-import package `x402.http.clients`.

```python
# Direct imports (preferred -- explicit)
from x402.http.clients.requests import (
    x402_requests,                      # Convenience: creates new Session with payment handling
    wrapRequestsWithPayment,            # Wraps existing Session with payment adapter
    wrapRequestsWithPaymentFromConfig,  # Wraps from x402ClientConfig
    x402_http_adapter,                  # Low-level: returns x402HTTPAdapter
    x402HTTPAdapter,                    # The HTTPAdapter class itself
)

# Lazy imports (also works)
from x402.http.clients import x402_requests, wrapRequestsWithPayment
```

All of these accept either an `x402ClientSync` or an `x402HTTPClientSync` wrapper.

---

## Basic Usage with x402_requests

`x402_requests` creates a new `requests.Session` with payment handling pre-configured. This is the recommended approach.

```python
from x402 import x402ClientSync
from x402.http.clients.requests import x402_requests

# 1. Create the sync x402 client and register payment schemes
x402 = x402ClientSync()
# ... register schemes ...

# 2. Create a session with payment handling
session = x402_requests(x402)

# 3. Make requests -- 402 responses are handled automatically
response = session.get("https://api.example.com/paid-resource")
print(response.status_code)
print(response.text)
```

The session can also be used as a context manager for proper cleanup:

```python
with x402_requests(x402) as session:
    response = session.get("https://api.example.com/paid-resource")
    print(response.text)
```

**Signature:**

```python
def x402_requests(
    client: x402ClientSync | x402HTTPClientSync,
    **adapter_kwargs: Any,
) -> requests.Session:
```

---

## Using wrapRequestsWithPayment

`wrapRequestsWithPayment` takes an existing `requests.Session` and mounts the payment adapter onto it. This is useful when you already have a session configured with custom headers, authentication, or other adapters.

```python
import requests
from x402 import x402ClientSync
from x402.http.clients.requests import wrapRequestsWithPayment

x402 = x402ClientSync()
# ... register schemes ...

# Create your own session with custom configuration
session = requests.Session()
session.headers.update({"Authorization": "Bearer my-token"})

# Wrap it with payment handling
wrapRequestsWithPayment(session, x402)

# The same session object is returned (mutated in place)
response = session.get("https://api.example.com/paid-resource")
print(response.text)
```

The function mounts the payment adapter for both `https://` and `http://` prefixes and returns the same session object.

**Signature:**

```python
def wrapRequestsWithPayment(
    session: requests.Session,
    client: x402ClientSync | x402HTTPClientSync,
    **adapter_kwargs: Any,
) -> requests.Session:
```

---

## Manual Adapter Mounting

For full control, create an `x402HTTPAdapter` (or use the `x402_http_adapter` factory) and mount it on specific URL prefixes.

```python
import requests
from x402 import x402ClientSync
from x402.http.clients.requests import x402_http_adapter

x402 = x402ClientSync()
# ... register schemes ...

session = requests.Session()

# Mount only for specific prefixes
adapter = x402_http_adapter(x402)
session.mount("https://api.example.com/", adapter)
# Other URLs will NOT get payment handling

response = session.get("https://api.example.com/paid-resource")
```

Or use the class directly:

```python
from x402.http.clients.requests import x402HTTPAdapter

adapter = x402HTTPAdapter(x402, max_retries=3, pool_connections=10)
session.mount("https://", adapter)
session.mount("http://", adapter)
```

**Signatures:**

```python
def x402_http_adapter(
    client: x402ClientSync | x402HTTPClientSync,
    **kwargs: Any,
) -> x402HTTPAdapter:

class x402HTTPAdapter(HTTPAdapter):
    def __init__(
        self,
        client: x402ClientSync | x402HTTPClientSync,
        **kwargs: Any,
    ) -> None:
```

---

## Config-Based Setup with wrapRequestsWithPaymentFromConfig

If you prefer a declarative configuration object, use `wrapRequestsWithPaymentFromConfig`. It creates an `x402ClientSync` from a `x402ClientConfig` internally.

```python
import requests
from x402 import x402ClientConfig, SchemeRegistration
from x402.http.clients.requests import wrapRequestsWithPaymentFromConfig
from x402.mechanisms.avm.exact import ExactAvmClientScheme

config = x402ClientConfig(
    schemes=[
        SchemeRegistration(
            network="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            client=ExactAvmClientScheme(signer=my_avm_signer),
        ),
    ],
)

session = wrapRequestsWithPaymentFromConfig(requests.Session(), config)
response = session.get("https://api.example.com/paid-resource")
```

**Signature:**

```python
def wrapRequestsWithPaymentFromConfig(
    session: requests.Session,
    config: x402ClientConfig,
    **adapter_kwargs: Any,
) -> requests.Session:
```

---

## Complete Algorand AVM Example

This is a full, self-contained example showing how to set up a `requests` session with Algorand payment handling. It implements the `ClientAvmSigner` protocol using `algosdk`.

```python
"""Complete x402-avm requests example with Algorand payment handling."""

import base64
import os

import algosdk
from x402 import x402ClientSync
from x402.http import x402HTTPClientSync
from x402.http.clients.requests import x402_requests
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


def main():
    # --- 1. Load private key ---
    avm_private_key = os.environ["AVM_PRIVATE_KEY"]  # Base64-encoded 64-byte key
    secret_key = base64.b64decode(avm_private_key)
    if len(secret_key) != 64:
        raise ValueError("AVM_PRIVATE_KEY must be a Base64-encoded 64-byte key")

    # Derive address from the public key portion (last 32 bytes)
    avm_address = algosdk.encoding.encode_address(secret_key[32:])
    print(f"Algorand address: {avm_address}")

    # --- 2. Create signer and x402 sync client ---
    signer = AlgorandSigner(secret_key, avm_address)
    x402 = x402ClientSync()

    # register_exact_avm_client registers:
    #   - V2: "algorand:*" wildcard (matches any Algorand CAIP-2 network)
    #   - V1: all legacy network names ("algorand-mainnet", "algorand-testnet")
    register_exact_avm_client(x402, signer)

    # --- 3. Make a paid request ---
    resource_url = os.environ.get(
        "RESOURCE_URL", "https://api.example.com/paid-resource"
    )

    with x402_requests(x402) as session:
        response = session.get(resource_url)

        print(f"Status: {response.status_code}")
        print(f"Body: {response.text}")

        # --- 4. Extract payment settlement response ---
        if response.ok:
            http_client = x402HTTPClientSync(x402)
            try:
                settle = http_client.get_payment_settle_response(
                    lambda name: response.headers.get(name)
                )
                print(f"Settlement: {settle.model_dump_json(indent=2)}")
            except ValueError:
                print("No payment response header found")


if __name__ == "__main__":
    main()
```

### Environment Variables

| Variable | Description | Example |
|---|---|---|
| `AVM_PRIVATE_KEY` | Base64-encoded 64-byte key (32-byte seed + 32-byte public key) | `base64(seed \|\| pubkey)` |
| `RESOURCE_URL` | The paid endpoint URL | `https://api.example.com/paid` |
| `ALGOD_TESTNET_URL` | (Optional) Custom Algod URL; defaults to AlgoNode testnet | `https://testnet-api.algonode.cloud` |
| `ALGOD_MAINNET_URL` | (Optional) Custom Algod URL; defaults to AlgoNode mainnet | `https://mainnet-api.algonode.cloud` |

### How It Works

1. The `x402_requests` session sends a GET request to the resource URL.
2. If the server returns HTTP 402, the `x402HTTPAdapter.send()` method intercepts the response.
3. It parses the `PaymentRequired` data from response headers (V2) or body (V1).
4. The registered `ExactAvmScheme` creates an atomic transaction group (ASA transfer) and signs it synchronously via `AlgorandSigner`.
5. Payment headers are added to a cloned retry request (marked with `Payment-Retry: 1` to prevent infinite loops).
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

The adapter raises a `PaymentError` when payment handling fails:

```python
from x402.http.clients.requests import PaymentError

with x402_requests(x402) as session:
    try:
        response = session.get("https://api.example.com/paid")
    except PaymentError as e:
        print(f"Payment handling failed: {e}")
    except requests.RequestException as e:
        print(f"HTTP error: {e}")
```

The adapter will **not** retry more than once. If the first payment-bearing retry still returns 402, the 402 response is returned as-is (the `Payment-Retry: 1` header prevents further attempts).

### Common Error Scenarios

| Error | Cause | Resolution |
|---|---|---|
| `TypeError` on adapter init | Passed async `x402Client` instead of `x402ClientSync` | Use `x402ClientSync()` |
| `PaymentError("Failed to handle payment: ...")` | Payment creation or encoding failed | Check signer setup, private key, and network registration |
| `ValueError("AVM_PRIVATE_KEY must be...")` | Key is wrong length | Ensure key is Base64-encoded 64-byte key (seed + pubkey) |
| `ImportError("AVM mechanism requires...")` | `py-algorand-sdk` not installed | `pip install "x402-avm[avm]"` |
| `ImportError("requests client requires...")` | `requests` not installed | `pip install "x402-avm[requests]"` |

---

## API Reference Summary

| API | Type | Returns | Description |
|---|---|---|---|
| `x402_requests(client, **adapter_kwargs)` | Function | `requests.Session` | Recommended. Creates new Session with payment adapter mounted. |
| `wrapRequestsWithPayment(session, client, **adapter_kwargs)` | Function | `requests.Session` | Wraps existing Session. Mounts adapter for `https://` and `http://`. Returns same session. |
| `wrapRequestsWithPaymentFromConfig(session, config, **adapter_kwargs)` | Function | `requests.Session` | Wraps from x402ClientConfig. Builds x402ClientSync internally. |
| `x402_http_adapter(client, **kwargs)` | Function | `x402HTTPAdapter` | Low-level. Returns adapter for manual `session.mount()`. |
| `x402HTTPAdapter(client, **kwargs)` | Class | `HTTPAdapter` subclass | The adapter implementation. Intercepts 402, creates payment, retries. |

All APIs use `x402ClientSync` (sync). For async HTTP, use the `httpx` integration with `x402Client`.

---

## See Also

- [x402-avm Python httpx Examples](./x402-avm-httpx-examples-python.md) -- async HTTP client with `httpx`
- [x402-avm Python AVM Mechanism Examples](./x402-avm-avm-examples-python.md) -- AVM signer and scheme details
- [x402-avm TypeScript Examples](../typescript/) -- TypeScript equivalents using `fetch` and `axios`
