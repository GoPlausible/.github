# x402-avm V2 Core Package Examples

Comprehensive examples for `@x402-avm/core` and `@x402-avm/avm` packages covering types, client, server, facilitator, and end-to-end usage.

## Table of Contents

- [Installation](#installation)
- [Types and Schemas](#types-and-schemas)
  - [Network Identifiers](#network-identifiers)
  - [PaymentRequirements (V2)](#paymentrequirements-v2)
  - [PaymentRequirements (V1 Legacy)](#paymentrequirements-v1-legacy)
  - [PaymentPayload](#paymentpayload)
  - [PaymentRequired Response](#paymentrequired-response)
- [Client Implementation](#client-implementation)
  - [TypeScript Client](#typescript-client)
  - [Python Client (Async)](#python-client-async)
  - [Python Client (Sync)](#python-client-sync)
  - [Payment Policies](#payment-policies)
- [Resource Server Implementation](#resource-server-implementation)
  - [TypeScript Resource Server](#typescript-resource-server)
  - [TypeScript HTTP Resource Server](#typescript-http-resource-server)
  - [Python Resource Server (Async)](#python-resource-server-async)
  - [Python Resource Server (Sync)](#python-resource-server-sync)
- [Facilitator Implementation](#facilitator-implementation)
  - [TypeScript Facilitator](#typescript-facilitator)
  - [Python Facilitator (Async)](#python-facilitator-async)
  - [Python Facilitator (Sync)](#python-facilitator-sync)
- [HTTPFacilitatorClient](#httpfacilitatorclient)
- [Complete End-to-End Examples](#complete-end-to-end-examples)
  - [TypeScript Full Stack](#typescript-full-stack)
  - [Python Full Stack](#python-full-stack)

---

## Installation

### TypeScript

```bash
npm install @x402-avm/core @x402-avm/avm
```

### Python

```bash
pip install "x402-avm[avm]"
```

For server frameworks:

```bash
# FastAPI
pip install "x402-avm[fastapi,avm]"

# Flask
pip install "x402-avm[flask,avm]"
```

---

## Types and Schemas

### Network Identifiers

x402-avm V2 uses CAIP-2 format for network identifiers. V1 name-based identifiers are supported for backward compatibility.

#### TypeScript

```typescript
import type { Network } from "@x402-avm/core/types";
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
  V1_ALGORAND_TESTNET,
  V1_ALGORAND_MAINNET,
  V1_TO_CAIP2,
  CAIP2_TO_V1,
} from "@x402-avm/avm";

// V2 CAIP-2 format (preferred)
const testnet: Network = ALGORAND_TESTNET_CAIP2;
// => "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

const mainnet: Network = ALGORAND_MAINNET_CAIP2;
// => "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="

// V1 name-based format (legacy, still supported)
const testnetV1 = V1_ALGORAND_TESTNET;  // => "algorand-testnet"
const mainnetV1 = V1_ALGORAND_MAINNET;  // => "algorand-mainnet"

// Convert between formats
const caip2 = V1_TO_CAIP2["algorand-testnet"];
// => "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

const v1Name = CAIP2_TO_V1[ALGORAND_TESTNET_CAIP2];
// => "algorand-testnet"
```

#### Python

```python
from x402.mechanisms.avm import (
    ALGORAND_TESTNET_CAIP2,
    ALGORAND_MAINNET_CAIP2,
)
from x402.mechanisms.avm.constants import (
    V1_TO_V2_NETWORK_MAP,
    V2_TO_V1_NETWORK_MAP,
)

# V2 CAIP-2 format (preferred)
testnet = ALGORAND_TESTNET_CAIP2
# => "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

mainnet = ALGORAND_MAINNET_CAIP2
# => "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="

# Convert between formats
caip2 = V1_TO_V2_NETWORK_MAP["algorand-testnet"]
v1_name = V2_TO_V1_NETWORK_MAP[ALGORAND_TESTNET_CAIP2]
```

---

### PaymentRequirements (V2)

The V2 `PaymentRequirements` structure defines what payment a resource server accepts.

#### TypeScript

```typescript
import type { PaymentRequirements } from "@x402-avm/core/types";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

// USDC payment on Algorand Testnet
const requirements: PaymentRequirements = {
  scheme: "exact",
  network: ALGORAND_TESTNET_CAIP2,
  maxAmountRequired: "1000000",  // 1.00 USDC (6 decimals)
  resource: "https://api.example.com/premium/data",
  description: "Access to premium API endpoint",
  mimeType: "application/json",
  payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
  maxTimeoutSeconds: 60,
  asset: USDC_TESTNET_ASA_ID,    // "10458941"
  outputSchema: undefined,
  extra: {
    name: "USDC",
    decimals: 6,
  },
};

// ALGO native payment on Algorand Testnet
const algoRequirements: PaymentRequirements = {
  scheme: "exact",
  network: ALGORAND_TESTNET_CAIP2,
  maxAmountRequired: "1000000",  // 1.00 ALGO (6 decimals)
  resource: "https://api.example.com/premium/data",
  description: "Access to premium data",
  mimeType: "application/json",
  payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
  maxTimeoutSeconds: 60,
  asset: "0",  // Native ALGO
  outputSchema: undefined,
  extra: {
    name: "ALGO",
    decimals: 6,
  },
};
```

#### Python

```python
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.constants import USDC_TESTNET_ASA_ID

# PaymentRequirements is a TypedDict or dict
requirements = {
    "scheme": "exact",
    "network": ALGORAND_TESTNET_CAIP2,
    "maxAmountRequired": "1000000",  # 1.00 USDC (6 decimals)
    "resource": "https://api.example.com/premium/data",
    "description": "Access to premium API endpoint",
    "mimeType": "application/json",
    "payTo": "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
    "maxTimeoutSeconds": 60,
    "asset": str(USDC_TESTNET_ASA_ID),  # "10458941"
    "outputSchema": None,
    "extra": {
        "name": "USDC",
        "decimals": 6,
    },
}
```

---

### PaymentRequirements (V1 Legacy)

V1 uses name-based network identifiers. The SDK handles conversion automatically.

#### TypeScript

```typescript
import type { PaymentRequirementsV1 } from "@x402-avm/core/types";

const requirementsV1: PaymentRequirementsV1 = {
  scheme: "exact",
  network: "algorand-testnet",          // V1 name-based
  maxAmountRequired: "1000000",
  resource: "https://api.example.com/premium/data",
  description: "Premium data access",
  payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
  maxTimeoutSeconds: 60,
  asset: "10458941",
  outputSchema: null,
  extra: {
    name: "USDC",
    decimals: 6,
  },
};
```

---

### PaymentPayload

The payment payload is what the client sends in the `X-PAYMENT` header after signing.

#### TypeScript

```typescript
import type { PaymentPayload } from "@x402-avm/core/types";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

// V2 PaymentPayload with AVM exact scheme
const payload: PaymentPayload = {
  x402Version: 2,
  scheme: "exact",
  network: ALGORAND_TESTNET_CAIP2,
  payload: {
    // AVM-specific: array of base64-encoded msgpack transaction bytes
    paymentGroup: [
      "iaNhbXTOAAGGoKNmZWXNA...",  // client's signed payment txn
      "iaNhbXTOAAGGoKNmZWXNA...",  // unsigned fee payer txn (for facilitator)
    ],
    paymentIndex: 0,  // index of the payment transaction in the group
  },
};
```

#### Python

```python
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

payload = {
    "x402Version": 2,
    "scheme": "exact",
    "network": ALGORAND_TESTNET_CAIP2,
    "payload": {
        "paymentGroup": [
            "iaNhbXTOAAGGoKNmZWXNA...",  # client's signed payment txn
            "iaNhbXTOAAGGoKNmZWXNA...",  # unsigned fee payer txn
        ],
        "paymentIndex": 0,
    },
}
```

---

### PaymentRequired Response

The 402 response body sent by the resource server when payment is needed.

#### TypeScript

```typescript
import type { PaymentRequired } from "@x402-avm/core/types";

// V2 PaymentRequired response
const paymentRequired: PaymentRequired = {
  x402Version: 2,
  resource: {
    url: "https://api.example.com/premium/data",
    description: "Premium data endpoint",
    mimeType: "application/json",
  },
  accepts: [
    {
      scheme: "exact",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      maxAmountRequired: "1000000",
      resource: "https://api.example.com/premium/data",
      description: "Premium data endpoint",
      mimeType: "application/json",
      payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
      maxTimeoutSeconds: 60,
      asset: "10458941",
      outputSchema: undefined,
      extra: { name: "USDC", decimals: 6 },
    },
  ],
  error: "Payment required to access this resource",
};
```

---

## Client Implementation

### TypeScript Client

```typescript
import { x402Client } from "@x402-avm/core/client";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";
import algosdk from "algosdk";

// 1. Create a signer (using private key for server-side usage)
const secretKey = Buffer.from(process.env.AVM_PRIVATE_KEY!, "base64");
const address = algosdk.encodeAddress(secretKey.slice(32));

const signer: ClientAvmSigner = {
  address,
  signTransactions: async (txns, indexesToSign) => {
    return txns.map((txn, i) => {
      if (indexesToSign && !indexesToSign.includes(i)) return null;
      const decoded = algosdk.decodeUnsignedTransaction(txn);
      const signed = algosdk.signTransaction(decoded, secretKey);
      return signed.blob;
    });
  },
};

// 2. Create and configure the client
const client = new x402Client({
  schemes: [],  // Will be populated by registerExactAvmScheme
});

registerExactAvmScheme(client, {
  signer,
  algodConfig: {
    algodUrl: "https://testnet-api.algonode.cloud",
  },
});

// 3. Use the client to access a paid resource
async function accessPaidResource() {
  const response = await client.fetch(
    "https://api.example.com/premium/data"
  );

  if (response.ok) {
    const data = await response.json();
    console.log("Received:", data);
  }
}
```

### Python Client (Async)

```python
import os
import base64
from x402 import x402Client
from x402.mechanisms.avm.exact import register_exact_avm_client
from x402.mechanisms.avm.signer import ClientAvmSigner
from algosdk import encoding


class MyAvmSigner:
    """Client signer using a private key."""

    def __init__(self, private_key_b64: str):
        self._secret_key = base64.b64decode(private_key_b64)
        self._address = encoding.encode_address(self._secret_key[32:])

    @property
    def address(self) -> str:
        return self._address

    def sign_transactions(
        self,
        unsigned_txns: list[bytes],
        indexes_to_sign: list[int],
    ) -> list[bytes | None]:
        from algosdk import encoding as enc, transaction

        result: list[bytes | None] = []
        for i, txn_bytes in enumerate(unsigned_txns):
            if i not in indexes_to_sign:
                result.append(None)
                continue
            # Decode the unsigned transaction
            b64_str = base64.b64encode(txn_bytes).decode()
            txn = enc.msgpack_decode(b64_str)
            # Sign it
            private_key_b64 = base64.b64encode(self._secret_key).decode()
            signed = txn.sign(private_key_b64)
            # Return raw bytes
            signed_bytes = base64.b64decode(enc.msgpack_encode(signed))
            result.append(signed_bytes)
        return result


async def main():
    # 1. Create signer
    signer = MyAvmSigner(os.environ["AVM_PRIVATE_KEY"])

    # 2. Create and configure client
    client = x402Client()
    register_exact_avm_client(client, signer)

    # 3. Fetch a paid resource
    response = await client.fetch("https://api.example.com/premium/data")
    print(response)
```

### Python Client (Sync)

```python
import os
import base64
from x402 import x402ClientSync
from x402.mechanisms.avm.exact import register_exact_avm_client
from algosdk import encoding


class MyAvmSigner:
    """Synchronous client signer."""

    def __init__(self, private_key_b64: str):
        self._secret_key = base64.b64decode(private_key_b64)
        self._address = encoding.encode_address(self._secret_key[32:])

    @property
    def address(self) -> str:
        return self._address

    def sign_transactions(
        self,
        unsigned_txns: list[bytes],
        indexes_to_sign: list[int],
    ) -> list[bytes | None]:
        from algosdk import encoding as enc

        result: list[bytes | None] = []
        for i, txn_bytes in enumerate(unsigned_txns):
            if i not in indexes_to_sign:
                result.append(None)
                continue
            b64_str = base64.b64encode(txn_bytes).decode()
            txn = enc.msgpack_decode(b64_str)
            private_key_b64 = base64.b64encode(self._secret_key).decode()
            signed = txn.sign(private_key_b64)
            signed_bytes = base64.b64decode(enc.msgpack_encode(signed))
            result.append(signed_bytes)
        return result


def main():
    signer = MyAvmSigner(os.environ["AVM_PRIVATE_KEY"])

    client = x402ClientSync()
    register_exact_avm_client(client, signer)

    response = client.fetch("https://api.example.com/premium/data")
    print(response)
```

### Payment Policies

Policies filter payment requirements before the client selects one.

#### TypeScript

```typescript
import { x402Client, PaymentPolicy } from "@x402-avm/core/client";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

// Policy: only pay on Algorand Testnet
const preferTestnet: PaymentPolicy = (version, requirements) => {
  return requirements.filter(r => r.network === ALGORAND_TESTNET_CAIP2);
};

// Policy: reject if amount exceeds threshold
const maxAmount: PaymentPolicy = (version, requirements) => {
  const MAX_USDC = 5_000_000; // 5 USDC
  return requirements.filter(r => {
    const amount = parseInt(r.maxAmountRequired, 10);
    return amount <= MAX_USDC;
  });
};

// Policy: prefer specific networks (Algorand over others)
const preferAlgorand: PaymentPolicy = (version, requirements) => {
  const algorandOptions = requirements.filter(r =>
    r.network.startsWith("algorand:")
  );
  return algorandOptions.length > 0 ? algorandOptions : requirements;
};

// Apply policies during registration
const client = new x402Client({ schemes: [] });
registerExactAvmScheme(client, {
  signer,
  policies: [preferTestnet, maxAmount],
});

// Or register policies individually
client.registerPolicy(preferAlgorand);
```

#### Python

```python
from x402 import x402Client
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

client = x402Client()

# Register a policy function
def prefer_testnet(version: int, requirements: list[dict]) -> list[dict]:
    """Only accept Algorand testnet payments."""
    return [r for r in requirements if r["network"] == ALGORAND_TESTNET_CAIP2]

def max_amount_policy(version: int, requirements: list[dict]) -> list[dict]:
    """Reject payments over 5 USDC."""
    return [r for r in requirements if int(r["maxAmountRequired"]) <= 5_000_000]

client.register_policy(prefer_testnet)
client.register_policy(max_amount_policy)
```

---

## Resource Server Implementation

### TypeScript Resource Server

The `x402ResourceServer` is transport-agnostic. Use it with any framework.

```typescript
import { x402ResourceServer, ResourceConfig } from "@x402-avm/core/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

// 1. Create facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.example.com",
});

// 2. Create resource server
const server = new x402ResourceServer(facilitatorClient);

// 3. Register AVM scheme support
registerExactAvmScheme(server);

// 4. Define resource configuration
const resourceConfig: ResourceConfig = {
  scheme: "exact",
  payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
  price: {
    asset: USDC_TESTNET_ASA_ID,
    amount: "100000",  // 0.10 USDC
    extra: { name: "USDC", decimals: 6 },
  },
  network: ALGORAND_TESTNET_CAIP2,
  maxTimeoutSeconds: 60,
};

// 5. Process an incoming request (framework-agnostic)
async function handleRequest(url: string, xPaymentHeader?: string) {
  if (!xPaymentHeader) {
    // No payment header -- return 402
    const paymentRequired = server.createPaymentRequired(
      { url, description: "Premium API", mimeType: "application/json" },
      [resourceConfig]
    );
    return { status: 402, body: paymentRequired };
  }

  // Verify and settle payment
  const result = await server.processPayment(xPaymentHeader, resourceConfig);
  if (result.verified) {
    return { status: 200, body: { data: "premium content" } };
  }
  return { status: 402, body: result.error };
}
```

### TypeScript HTTP Resource Server

The `x402HTTPResourceServer` adds HTTP route configuration on top of the base server.

```typescript
import {
  x402HTTPResourceServer,
  HTTPFacilitatorClient,
  RouteConfig,
} from "@x402-avm/core/server";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

// Create facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.example.com",
});

// Create HTTP resource server with route configuration
const routes: RouteConfig[] = [
  {
    path: "/api/premium/*",
    config: {
      scheme: "exact",
      payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
      price: {
        asset: USDC_TESTNET_ASA_ID,
        amount: "100000",  // 0.10 USDC
        extra: { name: "USDC", decimals: 6 },
      },
      network: ALGORAND_TESTNET_CAIP2,
      maxTimeoutSeconds: 60,
    },
    description: "Premium API endpoints",
    mimeType: "application/json",
  },
  {
    path: "/api/expensive-analysis",
    config: {
      scheme: "exact",
      payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
      price: {
        asset: USDC_TESTNET_ASA_ID,
        amount: "5000000",  // 5.00 USDC
        extra: { name: "USDC", decimals: 6 },
      },
      network: ALGORAND_TESTNET_CAIP2,
      maxTimeoutSeconds: 120,
    },
    description: "Expensive analysis endpoint",
    mimeType: "application/json",
  },
];

const httpServer = new x402HTTPResourceServer(facilitatorClient, { routes });
registerExactAvmScheme(httpServer.resourceServer);
```

### Python Resource Server (Async)

```python
import os
from x402 import x402ResourceServer
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.constants import USDC_TESTNET_ASA_ID


async def setup_server():
    # Create resource server with facilitator URL
    server = x402ResourceServer(
        facilitator_url="https://facilitator.example.com"
    )

    # Register AVM scheme
    register_exact_avm_server(server)

    # Define resource config
    resource_config = {
        "scheme": "exact",
        "payTo": "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
        "price": {
            "asset": str(USDC_TESTNET_ASA_ID),
            "amount": "100000",  # 0.10 USDC
            "extra": {"name": "USDC", "decimals": 6},
        },
        "network": ALGORAND_TESTNET_CAIP2,
        "maxTimeoutSeconds": 60,
    }

    return server, resource_config


# Example with FastAPI
from fastapi import FastAPI, Request, Response

app = FastAPI()

@app.on_event("startup")
async def startup():
    global server, resource_config
    server, resource_config = await setup_server()

@app.get("/api/premium/data")
async def premium_data(request: Request):
    x_payment = request.headers.get("X-PAYMENT")

    if not x_payment:
        payment_required = server.create_payment_required(
            url=str(request.url),
            description="Premium data endpoint",
            mime_type="application/json",
            configs=[resource_config],
        )
        return Response(
            content=payment_required,
            status_code=402,
            media_type="application/json",
        )

    result = await server.process_payment(x_payment, resource_config)
    if result.verified:
        return {"data": "premium content"}
    return Response(content=result.error, status_code=402)
```

### Python Resource Server (Sync)

```python
from x402 import x402ResourceServerSync
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.constants import USDC_TESTNET_ASA_ID

# Create synchronous resource server
server = x402ResourceServerSync(
    facilitator_url="https://facilitator.example.com"
)
register_exact_avm_server(server)

resource_config = {
    "scheme": "exact",
    "payTo": "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
    "price": {
        "asset": str(USDC_TESTNET_ASA_ID),
        "amount": "100000",
        "extra": {"name": "USDC", "decimals": 6},
    },
    "network": ALGORAND_TESTNET_CAIP2,
    "maxTimeoutSeconds": 60,
}

# Example with Flask
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/api/premium/data")
def premium_data():
    x_payment = request.headers.get("X-PAYMENT")

    if not x_payment:
        payment_required = server.create_payment_required(
            url=request.url,
            description="Premium data endpoint",
            mime_type="application/json",
            configs=[resource_config],
        )
        return jsonify(payment_required), 402

    result = server.process_payment(x_payment, resource_config)
    if result.verified:
        return jsonify({"data": "premium content"})
    return jsonify({"error": result.error}), 402
```

---

## Facilitator Implementation

### TypeScript Facilitator

```typescript
import { x402Facilitator } from "@x402-avm/core/facilitator";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/facilitator";
import type { FacilitatorAvmSigner } from "@x402-avm/avm";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";
import algosdk from "algosdk";

// 1. Create the facilitator signer (see avm-examples.md for full implementation)
const secretKey = Buffer.from(process.env.AVM_PRIVATE_KEY!, "base64");
const address = algosdk.encodeAddress(secretKey.slice(32));
const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

const facilitatorSigner: FacilitatorAvmSigner = {
  getAddresses: () => [address],
  signTransaction: async (txn, senderAddress) => {
    const decoded = algosdk.decodeUnsignedTransaction(txn);
    const signed = algosdk.signTransaction(decoded, secretKey);
    return signed.blob;
  },
  getAlgodClient: (network) => algodClient,
  simulateTransactions: async (txns, network) => {
    // Wrap unsigned txns for simulation
    const stxns = txns.map((txnBytes) => {
      try {
        return algosdk.decodeSignedTransaction(txnBytes);
      } catch {
        const txn = algosdk.decodeUnsignedTransaction(txnBytes);
        return new algosdk.SignedTransaction({ txn });
      }
    });
    const request = new algosdk.modelsv2.SimulateRequest({
      txnGroups: [new algosdk.modelsv2.SimulateRequestTransactionGroup({ txns: stxns })],
      allowEmptySignatures: true,
    });
    return algodClient.simulateTransactions(request).do();
  },
  sendTransactions: async (signedTxns, network) => {
    const combined = Buffer.concat(signedTxns.map(t => Buffer.from(t)));
    const { txId } = await algodClient.sendRawTransaction(combined).do();
    return txId;
  },
  waitForConfirmation: async (txId, network, waitRounds = 4) => {
    return algosdk.waitForConfirmation(algodClient, txId, waitRounds);
  },
};

// 2. Create and configure facilitator
const facilitator = new x402Facilitator();

registerExactAvmScheme(facilitator, {
  signer: facilitatorSigner,
  networks: ALGORAND_TESTNET_CAIP2,
});

// 3. Use the facilitator to verify and settle payments
async function handlePaymentVerification(paymentPayload: any, requirements: any) {
  const verifyResult = await facilitator.verify(paymentPayload, requirements);

  if (verifyResult.isValid) {
    const settleResult = await facilitator.settle(paymentPayload, requirements);
    return settleResult;
  }

  return { success: false, error: verifyResult.error };
}
```

### Python Facilitator (Async)

```python
import os
import base64
from x402 import x402Facilitator
from x402.mechanisms.avm.exact import register_exact_avm_facilitator
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.signer import FacilitatorAvmSigner
from algosdk import encoding, transaction
from algosdk.v2client import algod


class MyFacilitatorSigner:
    """Facilitator signer implementation using algosdk."""

    def __init__(self, private_key_b64: str, algod_url: str):
        self._secret_key = base64.b64decode(private_key_b64)
        self._address = encoding.encode_address(self._secret_key[32:])
        self._private_key_b64 = base64.b64encode(self._secret_key).decode()
        self._algod = algod.AlgodClient("", algod_url)

    def get_addresses(self) -> list[str]:
        return [self._address]

    def sign_transaction(self, txn_bytes: bytes, fee_payer: str, network: str) -> bytes:
        b64_str = base64.b64encode(txn_bytes).decode()
        txn_obj = encoding.msgpack_decode(b64_str)
        signed = txn_obj.sign(self._private_key_b64)
        return base64.b64decode(encoding.msgpack_encode(signed))

    def sign_group(
        self,
        group_bytes: list[bytes],
        fee_payer: str,
        indexes_to_sign: list[int],
        network: str,
    ) -> list[bytes]:
        result = list(group_bytes)
        for i in indexes_to_sign:
            result[i] = self.sign_transaction(group_bytes[i], fee_payer, network)
        return result

    def simulate_group(self, group_bytes: list[bytes], network: str) -> None:
        # Wrap for simulation
        stxns = []
        for txn_bytes in group_bytes:
            b64_str = base64.b64encode(txn_bytes).decode()
            obj = encoding.msgpack_decode(b64_str)
            if isinstance(obj, transaction.SignedTransaction):
                stxns.append(obj)
            else:
                stxns.append(transaction.SignedTransaction(obj, None))

        request = transaction.SimulateRequest(
            txn_groups=[transaction.SimulateRequestTransactionGroup(txns=stxns)],
            allow_empty_signatures=True,
        )
        result = self._algod.simulate_raw_transactions(request)
        # Check for errors in simulation
        for group in result.get("txn-groups", []):
            if group.get("failure-message"):
                raise Exception(f"Simulation failed: {group['failure-message']}")

    def send_group(self, group_bytes: list[bytes], network: str) -> str:
        raw = base64.b64encode(b"".join(group_bytes))
        return self._algod.send_raw_transaction(raw)

    def confirm_transaction(self, txid: str, network: str, rounds: int = 4) -> None:
        from algosdk import transaction as txn_mod
        txn_mod.wait_for_confirmation(self._algod, txid, rounds)


async def main():
    signer = MyFacilitatorSigner(
        os.environ["AVM_PRIVATE_KEY"],
        "https://testnet-api.algonode.cloud",
    )

    facilitator = x402Facilitator()
    register_exact_avm_facilitator(
        facilitator,
        signer,
        networks=[ALGORAND_TESTNET_CAIP2],
    )

    # Verify and settle a payment
    verify_result = await facilitator.verify(payment_payload, requirements)
    if verify_result.is_valid:
        settle_result = await facilitator.settle(payment_payload, requirements)
```

### Python Facilitator (Sync)

```python
from x402 import x402FacilitatorSync
from x402.mechanisms.avm.exact import register_exact_avm_facilitator
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

# Same signer class as above (MyFacilitatorSigner)

signer = MyFacilitatorSigner(
    os.environ["AVM_PRIVATE_KEY"],
    "https://testnet-api.algonode.cloud",
)

facilitator = x402FacilitatorSync()
register_exact_avm_facilitator(
    facilitator,
    signer,
    networks=[ALGORAND_TESTNET_CAIP2],
)

# Synchronous verify and settle
verify_result = facilitator.verify(payment_payload, requirements)
if verify_result.is_valid:
    settle_result = facilitator.settle(payment_payload, requirements)
```

---

## HTTPFacilitatorClient

The `HTTPFacilitatorClient` handles communication between the resource server and a remote facilitator.

### TypeScript

```typescript
import { HTTPFacilitatorClient } from "@x402-avm/core/server";

// Basic configuration
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.example.com",
});

// With authentication
const authenticatedClient = new HTTPFacilitatorClient({
  url: "https://facilitator.example.com",
  headers: {
    Authorization: `Bearer ${process.env.FACILITATOR_API_KEY}`,
  },
});

// Check supported networks
const supported = await facilitatorClient.supported();
console.log("Supported networks:", supported.networks);

// Verify a payment directly
const verifyResult = await facilitatorClient.verify({
  paymentPayload,
  paymentRequirements,
});

// Settle a payment directly
const settleResult = await facilitatorClient.settle({
  paymentPayload,
  paymentRequirements,
});
```

### Python

```python
from x402 import HTTPFacilitatorClient

# Basic usage
facilitator_client = HTTPFacilitatorClient(
    url="https://facilitator.example.com"
)

# With authentication
facilitator_client = HTTPFacilitatorClient(
    url="https://facilitator.example.com",
    headers={"Authorization": f"Bearer {os.environ['FACILITATOR_API_KEY']}"},
)

# Check supported networks
supported = await facilitator_client.supported()
print("Supported:", supported)

# Direct verify/settle
verify_result = await facilitator_client.verify(
    payment_payload=payload,
    payment_requirements=requirements,
)
```

---

## Complete End-to-End Examples

### TypeScript Full Stack

A complete example showing client, resource server, and facilitator working together.

```typescript
// ============================================================
// shared/config.ts - Shared configuration
// ============================================================
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

export const NETWORK = ALGORAND_TESTNET_CAIP2;
export const USDC_ASA = USDC_TESTNET_ASA_ID;
export const RESOURCE_WALLET = "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA";
export const FACILITATOR_URL = "http://localhost:4000";
export const RESOURCE_SERVER_URL = "http://localhost:3000";

// ============================================================
// facilitator/index.ts - Facilitator Service
// ============================================================
import express from "express";
import { x402Facilitator } from "@x402-avm/core/facilitator";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/facilitator";
import type { FacilitatorAvmSigner } from "@x402-avm/avm";
import algosdk from "algosdk";
import { NETWORK } from "../shared/config";

const secretKey = Buffer.from(process.env.AVM_PRIVATE_KEY!, "base64");
const address = algosdk.encodeAddress(secretKey.slice(32));
const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");

const signer: FacilitatorAvmSigner = {
  getAddresses: () => [address],
  signTransaction: async (txn, _addr) => {
    const decoded = algosdk.decodeUnsignedTransaction(txn);
    return algosdk.signTransaction(decoded, secretKey).blob;
  },
  getAlgodClient: () => algodClient,
  simulateTransactions: async (txns) => {
    const stxns = txns.map((t) => {
      try { return algosdk.decodeSignedTransaction(t); }
      catch { return new algosdk.SignedTransaction({ txn: algosdk.decodeUnsignedTransaction(t) }); }
    });
    const req = new algosdk.modelsv2.SimulateRequest({
      txnGroups: [new algosdk.modelsv2.SimulateRequestTransactionGroup({ txns: stxns })],
      allowEmptySignatures: true,
    });
    return algodClient.simulateTransactions(req).do();
  },
  sendTransactions: async (signedTxns) => {
    const combined = Buffer.concat(signedTxns.map((t) => Buffer.from(t)));
    const { txId } = await algodClient.sendRawTransaction(combined).do();
    return txId;
  },
  waitForConfirmation: async (txId, _net, rounds = 4) => {
    return algosdk.waitForConfirmation(algodClient, txId, rounds);
  },
};

const facilitator = new x402Facilitator();
registerExactAvmScheme(facilitator, { signer, networks: NETWORK });

const app = express();
app.use(express.json());

app.get("/supported", async (_req, res) => {
  const supported = facilitator.getSupportedNetworks();
  res.json(supported);
});

app.post("/verify", async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body;
  const result = await facilitator.verify(paymentPayload, paymentRequirements);
  res.json(result);
});

app.post("/settle", async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body;
  const result = await facilitator.settle(paymentPayload, paymentRequirements);
  res.json(result);
});

app.listen(4000, () => console.log("Facilitator running on :4000"));

// ============================================================
// server/index.ts - Resource Server
// ============================================================
import express from "express";
import {
  x402HTTPResourceServer,
  HTTPFacilitatorClient,
} from "@x402-avm/core/server";
import { registerExactAvmScheme as registerServerScheme } from "@x402-avm/avm/exact/server";
import {
  NETWORK,
  USDC_ASA,
  RESOURCE_WALLET,
  FACILITATOR_URL,
} from "../shared/config";

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

const httpServer = new x402HTTPResourceServer(facilitatorClient, {
  routes: [
    {
      path: "/api/weather",
      config: {
        scheme: "exact",
        payTo: RESOURCE_WALLET,
        price: { asset: USDC_ASA, amount: "10000", extra: { name: "USDC", decimals: 6 } },
        network: NETWORK,
        maxTimeoutSeconds: 60,
      },
      description: "Weather data API",
      mimeType: "application/json",
    },
  ],
});
registerServerScheme(httpServer.resourceServer);

const app = express();

app.get("/api/weather", async (req, res) => {
  const result = await httpServer.processRequest({
    url: req.url,
    method: req.method,
    headers: req.headers,
    adapter: {
      getHeader: (name: string) => req.headers[name.toLowerCase()] as string,
    },
  });

  if (result.status === 402) {
    return res.status(402).json(result.body);
  }

  // Payment verified -- return the weather data
  res.json({
    temperature: 72,
    condition: "Sunny",
    location: "San Francisco",
  });
});

app.listen(3000, () => console.log("Resource server running on :3000"));

// ============================================================
// client/index.ts - Client Application
// ============================================================
import { x402Client } from "@x402-avm/core/client";
import { registerExactAvmScheme as registerClientScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";
import algosdk from "algosdk";
import { RESOURCE_SERVER_URL } from "../shared/config";

const clientSecretKey = Buffer.from(process.env.CLIENT_AVM_PRIVATE_KEY!, "base64");
const clientAddress = algosdk.encodeAddress(clientSecretKey.slice(32));

const clientSigner: ClientAvmSigner = {
  address: clientAddress,
  signTransactions: async (txns, indexesToSign) => {
    return txns.map((txn, i) => {
      if (indexesToSign && !indexesToSign.includes(i)) return null;
      const decoded = algosdk.decodeUnsignedTransaction(txn);
      return algosdk.signTransaction(decoded, clientSecretKey).blob;
    });
  },
};

const client = new x402Client({ schemes: [] });
registerClientScheme(client, { signer: clientSigner });

async function getWeather() {
  // The client automatically handles 402 responses:
  // 1. Receives 402 with PaymentRequired
  // 2. Creates and signs payment payload
  // 3. Retries with X-PAYMENT header
  const response = await client.fetch(`${RESOURCE_SERVER_URL}/api/weather`);

  if (response.ok) {
    const weather = await response.json();
    console.log("Weather:", weather);
  } else {
    console.error("Failed:", response.status, response.statusText);
  }
}

getWeather();
```

### Python Full Stack

```python
# ============================================================
# facilitator_service.py - Facilitator
# ============================================================
import os
import base64
from fastapi import FastAPI, Request
from x402 import x402Facilitator
from x402.mechanisms.avm.exact import register_exact_avm_facilitator
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from algosdk import encoding, transaction
from algosdk.v2client import algod

app = FastAPI()

# Create signer
secret_key = base64.b64decode(os.environ["AVM_PRIVATE_KEY"])
address = encoding.encode_address(secret_key[32:])
private_key_b64 = base64.b64encode(secret_key).decode()
algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")


class FacSigner:
    def get_addresses(self) -> list[str]:
        return [address]

    def sign_transaction(self, txn_bytes: bytes, fee_payer: str, network: str) -> bytes:
        b64 = base64.b64encode(txn_bytes).decode()
        txn_obj = encoding.msgpack_decode(b64)
        signed = txn_obj.sign(private_key_b64)
        return base64.b64decode(encoding.msgpack_encode(signed))

    def sign_group(self, group_bytes, fee_payer, indexes, network):
        result = list(group_bytes)
        for i in indexes:
            result[i] = self.sign_transaction(group_bytes[i], fee_payer, network)
        return result

    def simulate_group(self, group_bytes, network):
        stxns = []
        for txn_bytes in group_bytes:
            b64 = base64.b64encode(txn_bytes).decode()
            obj = encoding.msgpack_decode(b64)
            if isinstance(obj, transaction.SignedTransaction):
                stxns.append(obj)
            else:
                stxns.append(transaction.SignedTransaction(obj, None))
        req = transaction.SimulateRequest(
            txn_groups=[transaction.SimulateRequestTransactionGroup(txns=stxns)],
            allow_empty_signatures=True,
        )
        result = algod_client.simulate_raw_transactions(req)
        for group in result.get("txn-groups", []):
            if group.get("failure-message"):
                raise Exception(f"Simulation failed: {group['failure-message']}")

    def send_group(self, group_bytes, network):
        raw = base64.b64encode(b"".join(group_bytes))
        return algod_client.send_raw_transaction(raw)

    def confirm_transaction(self, txid, network, rounds=4):
        transaction.wait_for_confirmation(algod_client, txid, rounds)


facilitator = x402Facilitator()
register_exact_avm_facilitator(
    facilitator, FacSigner(), networks=[ALGORAND_TESTNET_CAIP2]
)


@app.get("/supported")
async def supported():
    return facilitator.get_supported_networks()


@app.post("/verify")
async def verify(request: Request):
    body = await request.json()
    result = await facilitator.verify(
        body["paymentPayload"], body["paymentRequirements"]
    )
    return result


@app.post("/settle")
async def settle(request: Request):
    body = await request.json()
    result = await facilitator.settle(
        body["paymentPayload"], body["paymentRequirements"]
    )
    return result


# ============================================================
# resource_server.py - Resource Server
# ============================================================
import os
from fastapi import FastAPI, Request, Response
from x402 import x402ResourceServer
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.constants import USDC_TESTNET_ASA_ID

app = FastAPI()

server = x402ResourceServer(facilitator_url="http://localhost:4000")
register_exact_avm_server(server)

resource_config = {
    "scheme": "exact",
    "payTo": "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
    "price": {
        "asset": str(USDC_TESTNET_ASA_ID),
        "amount": "10000",
        "extra": {"name": "USDC", "decimals": 6},
    },
    "network": ALGORAND_TESTNET_CAIP2,
    "maxTimeoutSeconds": 60,
}


@app.get("/api/weather")
async def weather(request: Request):
    x_payment = request.headers.get("X-PAYMENT")

    if not x_payment:
        payment_required = server.create_payment_required(
            url=str(request.url),
            description="Weather data API",
            mime_type="application/json",
            configs=[resource_config],
        )
        return Response(content=payment_required, status_code=402)

    result = await server.process_payment(x_payment, resource_config)
    if result.verified:
        return {
            "temperature": 72,
            "condition": "Sunny",
            "location": "San Francisco",
        }
    return Response(content=result.error, status_code=402)


# ============================================================
# client_app.py - Client Application
# ============================================================
import os
import base64
import asyncio
from x402 import x402Client
from x402.mechanisms.avm.exact import register_exact_avm_client
from algosdk import encoding


class ClientSigner:
    def __init__(self, private_key_b64: str):
        self._secret_key = base64.b64decode(private_key_b64)
        self._address = encoding.encode_address(self._secret_key[32:])
        self._pk_b64 = base64.b64encode(self._secret_key).decode()

    @property
    def address(self) -> str:
        return self._address

    def sign_transactions(self, unsigned_txns, indexes_to_sign):
        result = []
        for i, txn_bytes in enumerate(unsigned_txns):
            if i not in indexes_to_sign:
                result.append(None)
                continue
            b64 = base64.b64encode(txn_bytes).decode()
            txn = encoding.msgpack_decode(b64)
            signed = txn.sign(self._pk_b64)
            result.append(base64.b64decode(encoding.msgpack_encode(signed)))
        return result


async def main():
    signer = ClientSigner(os.environ["CLIENT_AVM_PRIVATE_KEY"])
    client = x402Client()
    register_exact_avm_client(client, signer)

    # Automatic 402 handling
    response = await client.fetch("http://localhost:3000/api/weather")
    print("Weather data:", response)


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Summary

| Component | TypeScript Import | Python Import |
|-----------|-------------------|---------------|
| Client | `x402Client` from `@x402-avm/core/client` | `x402Client` from `x402` |
| Resource Server | `x402ResourceServer` from `@x402-avm/core/server` | `x402ResourceServer` from `x402` |
| HTTP Resource Server | `x402HTTPResourceServer` from `@x402-avm/core/server` | N/A (use framework adapters) |
| Facilitator | `x402Facilitator` from `@x402-avm/core/facilitator` | `x402Facilitator` from `x402` |
| Facilitator Client | `HTTPFacilitatorClient` from `@x402-avm/core/server` | `HTTPFacilitatorClient` from `x402` |
| AVM Registration (Client) | `registerExactAvmScheme` from `@x402-avm/avm/exact/client` | `register_exact_avm_client` from `x402.mechanisms.avm.exact` |
| AVM Registration (Server) | `registerExactAvmScheme` from `@x402-avm/avm/exact/server` | `register_exact_avm_server` from `x402.mechanisms.avm.exact` |
| AVM Registration (Facilitator) | `registerExactAvmScheme` from `@x402-avm/avm/exact/facilitator` | `register_exact_avm_facilitator` from `x402.mechanisms.avm.exact` |
| Types | `@x402-avm/core/types` | `x402.types` |
| Constants | `@x402-avm/avm` | `x402.mechanisms.avm` |
