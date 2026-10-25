# x402-avm V2 Core Package Examples

> **Python examples**: See the dedicated Python example docs in the [python/](../python/) folder for equivalent Python SDK examples.

Comprehensive examples for `@x402/core` and `@x402/avm` packages covering types, client, server, facilitator, and end-to-end usage.

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
  - [Payment Policies](#payment-policies)
- [Resource Server Implementation](#resource-server-implementation)
  - [TypeScript Resource Server](#typescript-resource-server)
  - [TypeScript HTTP Resource Server](#typescript-http-resource-server)
- [Facilitator Implementation](#facilitator-implementation)
  - [TypeScript Facilitator](#typescript-facilitator)
- [HTTPFacilitatorClient](#httpfacilitatorclient)
- [Complete End-to-End Examples](#complete-end-to-end-examples)
  - [TypeScript Full Stack](#typescript-full-stack)

---

## Installation

```bash
npm install @x402/core @x402/avm
```

Some examples below also use the fetch wrapper and the Express middleware:

```bash
npm install @x402/fetch @x402/express express
```

> **No `algosdk`:** `@x402/avm` (on npm since 2.10.0) is built on `@algorandfoundation/algokit-utils` v10 (2.28.0 pins `10.0.0-alpha.46`) and has no `algosdk` dependency. If you are migrating from GoPlausible's earlier `@x402-avm/*` packages or from algosdk-based signer code, remove `algosdk` from your x402 dependencies and create signers with `toClientAvmSigner` / `toFacilitatorAvmSigner` as shown below.

---

## Types and Schemas

### Network Identifiers

x402 V2 uses CAIP-2 network identifiers. For Algorand, the [CAIP-2 Algorand namespace profile](https://namespaces.chainagnostic.org/algorand/caip2) uses the URL-safe base64 genesis hash, truncated to its first 32 characters. Full genesis hashes appear only in the transaction `gh` field.

| Network | CAIP-2 id |
|---------|-----------|
| Algorand MainNet | `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k` |
| Algorand TestNet | `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe` |

```typescript
import type { Network } from "@x402/core/types";
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_TESTNET_GENESIS_HASH,
  normalizeAlgorandNetwork,
} from "@x402/avm";

// V2 CAIP-2 format
const testnet: Network = ALGORAND_TESTNET_CAIP2;
// => "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"

const mainnet: Network = ALGORAND_MAINNET_CAIP2;
// => "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k"

// Wildcard pattern for scheme registration (matches every Algorand network)
const anyAlgorand: Network = "algorand:*";

// Legacy full-genesis-hash ids (not valid CAIP-2) are still accepted on input
// and normalized to the canonical id
const normalized = normalizeAlgorandNetwork(`algorand:${ALGORAND_TESTNET_GENESIS_HASH}`);
// => "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
```

`@x402/avm` exports the canonical ids from 2.20.0 on. Until upstream PR #3894 ships it also accepts the legacy full-hash form (`algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`) on input; after that, upstream SDKs reject it. Use the constants rather than string literals. `@x402/avm` does not accept V1 name-based ids (for example `algorand-testnet`).

---

### PaymentRequirements (V2)

The V2 `PaymentRequirements` structure defines one payment option the resource server accepts. In V2 the resource metadata (URL, description, MIME type) is no longer part of the requirement; it lives in `PaymentRequired.resource`.

```typescript
import type { PaymentRequirements } from "@x402/core/types";
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
  USDC_TESTNET_ASA_ID,
  USDC_MAINNET_ASA_ID,
} from "@x402/avm";

// USDC payment on Algorand TestNet
const requirements: PaymentRequirements = {
  scheme: "exact",
  network: ALGORAND_TESTNET_CAIP2,
  amount: "1000000",              // 1.00 USDC (6 decimals, atomic units)
  asset: USDC_TESTNET_ASA_ID,     // "10458941" (ASA id as a string)
  payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
  maxTimeoutSeconds: 60,
  extra: {
    // Added by the resource server from the facilitator's /supported response
    // when the facilitator sponsors transaction fees
    feePayer: "FACILITATOR_FEE_PAYER_ADDRESS",
  },
};

// USDC payment on Algorand MainNet
const mainnetRequirements: PaymentRequirements = {
  scheme: "exact",
  network: ALGORAND_MAINNET_CAIP2,
  amount: "1000000",              // 1.00 USDC
  asset: USDC_MAINNET_ASA_ID,     // "31566704"
  payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
  maxTimeoutSeconds: 60,
  extra: {},
};
```

> The `exact` scheme in `@x402/avm` 2.28.0 pays with ASA transfers (`axfer`) only. Native ALGO payments are not supported: the facilitator rejects a payment transaction that is not an asset transfer with `invalid_exact_avm_not_asset_transfer`. The `payTo` account must be opted in to the ASA.

---

### PaymentRequirements (V1 Legacy)

V1 used name-based network identifiers and kept the resource metadata inside each requirement. `@x402/core/types` still exports the V1 type for interoperability, but `@x402/avm` implements V2 only: its facilitator rejects any `x402Version` other than 2, and V1 network names are not recognized.

```typescript
import type { Network, PaymentRequirementsV1 } from "@x402/core/types";

const requirementsV1: PaymentRequirementsV1 = {
  scheme: "exact",
  network: "algorand-testnet" as Network, // V1-style name, not accepted by @x402/avm
  maxAmountRequired: "1000000",
  resource: "https://api.example.com/premium/data",
  description: "Premium data access",
  mimeType: "application/json",
  payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
  maxTimeoutSeconds: 60,
  asset: "10458941",
  outputSchema: {},
  extra: {},
};
```

---

### PaymentPayload

The payment payload is what the client sends after signing, base64-encoded in the `PAYMENT-SIGNATURE` HTTP header. In V2 the chosen requirement is echoed in `accepted`; there is no top-level `scheme` or `network`.

```typescript
import type { PaymentPayload } from "@x402/core/types";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

// V2 PaymentPayload with AVM exact scheme (sponsored fees)
const payload: PaymentPayload = {
  x402Version: 2,
  resource: {
    url: "https://api.example.com/premium/data",
    description: "Access to premium API endpoint",
    mimeType: "application/json",
  },
  accepted: {
    scheme: "exact",
    network: ALGORAND_TESTNET_CAIP2,
    amount: "1000000",
    asset: USDC_TESTNET_ASA_ID,
    payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
    maxTimeoutSeconds: 60,
    extra: { feePayer: "FACILITATOR_FEE_PAYER_ADDRESS" },
  },
  payload: {
    // AVM-specific (ExactAvmPayloadV2): base64-encoded msgpack transactions
    paymentGroup: [
      "<base64 msgpack: unsigned fee payer txn>",      // [0] signed by the facilitator
      "<base64 msgpack: client-signed USDC transfer>", // [1] signed by the client
    ],
    paymentIndex: 1,  // index of the payment (asset transfer) transaction in the group
  },
};
```

Without `extra.feePayer` the group holds only the client-signed asset transfer and `paymentIndex` is `0`. `@x402/avm` exports the `ExactAvmPayloadV2` type and the `isExactAvmPayload` type guard for this payload.

---

### PaymentRequired Response

The `PaymentRequired` object the resource server returns with HTTP 402. Over the V2 HTTP transport it travels base64-encoded in the `PAYMENT-REQUIRED` response header.

```typescript
import type { PaymentRequired } from "@x402/core/types";
import { encodePaymentRequiredHeader } from "@x402/core/http";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

// V2 PaymentRequired response
const paymentRequired: PaymentRequired = {
  x402Version: 2,
  error: "Payment required to access this resource",
  resource: {
    url: "https://api.example.com/premium/data",
    description: "Premium data endpoint",
    mimeType: "application/json",
  },
  accepts: [
    {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2, // "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
      amount: "1000000",
      asset: USDC_TESTNET_ASA_ID,
      payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
      maxTimeoutSeconds: 60,
      extra: { feePayer: "FACILITATOR_FEE_PAYER_ADDRESS" },
    },
  ],
};

// HTTP transport: base64-encoded JSON in the PAYMENT-REQUIRED header
const paymentRequiredHeader = encodePaymentRequiredHeader(paymentRequired);
```

---

## Client Implementation

### TypeScript Client

```typescript
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner } from "@x402/avm";

// 1. Create a signer (Base64-encoded 64-byte private key, for server-side usage)
const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);

// 2. Create the client and register the AVM exact scheme for every Algorand network.
//    Without a config the scheme uses AlgorandClient.testNet() / .mainNet() per network.
//    new ExactAvmScheme(signer, { algodUrl, algodToken }) or { algorandClient } overrides
//    the endpoint for every network this instance handles.
const client = new x402Client().register("algorand:*", new ExactAvmScheme(signer));

// 3a. Automatic 402 handling with @x402/fetch
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

async function accessPaidResource() {
  const response = await fetchWithPayment("https://api.example.com/premium/data");

  if (response.ok) {
    const data = await response.json();
    console.log("Received:", data);
  }
}

// 3b. Or drive the V2 HTTP flow yourself with x402HTTPClient (@x402/core only)
const httpClient = new x402HTTPClient(client);

async function accessPaidResourceManually(url: string) {
  const first = await fetch(url);
  if (first.status !== 402) return first;

  // PaymentRequired arrives base64-encoded in the PAYMENT-REQUIRED header
  const paymentRequired = httpClient.getPaymentRequiredResponse(name => first.headers.get(name));
  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);

  // The signed PaymentPayload goes back in the PAYMENT-SIGNATURE header
  const paid = await fetch(url, {
    headers: httpClient.encodePaymentSignatureHeader(paymentPayload),
  });

  // The settlement result comes back in the PAYMENT-RESPONSE header
  if (paid.ok) {
    const settlement = httpClient.getPaymentSettleResponse(name => paid.headers.get(name));
    console.log("Settled in transaction:", settlement.transaction);
  }
  return paid;
}
```

> **Spend controls:** by default `x402Client` only pays assets the scheme recognizes as defaults (USDC on Algorand MainNet and TestNet) and caps each payment at `$1` (`DEFAULT_MAX_AMOUNT_PER_PAYMENT`). Use `client.setSpendControls({ maxAmountPerPayment: "$5" })` to raise the cap, `allowedAssets` to allow other ASAs, or `setSpendControls(false)` to disable the checks.

### Payment Policies

Policies filter payment requirements after spend controls are applied and before the client selects one.

```typescript
import { x402Client } from "@x402/core/client";
import type { PaymentPolicy } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2, toClientAvmSigner } from "@x402/avm";

const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);

// Policy: only pay on Algorand TestNet
const preferTestnet: PaymentPolicy = (version, requirements) => {
  return requirements.filter(r => r.network === ALGORAND_TESTNET_CAIP2);
};

// Policy: reject if amount exceeds threshold (V2 uses `amount`, in atomic units)
const maxAmount: PaymentPolicy = (version, requirements) => {
  const MAX_USDC = 5_000_000n; // 5 USDC
  return requirements.filter(r => BigInt(r.amount) <= MAX_USDC);
};

// Policy: prefer specific networks (Algorand over others)
const preferAlgorand: PaymentPolicy = (version, requirements) => {
  const algorandOptions = requirements.filter(r =>
    r.network.startsWith("algorand:")
  );
  return algorandOptions.length > 0 ? algorandOptions : requirements;
};

// Apply policies when building the client
const client = x402Client.fromConfig({
  schemes: [{ network: "algorand:*", client: new ExactAvmScheme(signer) }],
  policies: [preferTestnet, maxAmount],
  // The default spend control caps each payment at $1; raise it to match maxAmount
  spendControls: { maxAmountPerPayment: "$5" },
});

// Or register policies individually
client.registerPolicy(preferAlgorand);
```

If the policies filter out every option, `createPaymentPayload` throws instead of paying.

---

## Resource Server Implementation

### TypeScript Resource Server

The `x402ResourceServer` is transport-agnostic. Use it with any framework: it builds requirements from a `ResourceConfig` and asks the facilitator to verify and settle; your code moves the V2 headers.

```typescript
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import type { ResourceConfig } from "@x402/core/server";
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from "@x402/core/http";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

// 1. Create facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.goplausible.xyz",
});

// 2. Create resource server and register AVM scheme support
const server = new x402ResourceServer(facilitatorClient)
  .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme());

// 3. Fetch supported kinds (including the fee payer address) from the facilitator
await server.initialize();

// 4. Define resource configuration
const resourceConfig: ResourceConfig = {
  scheme: "exact",
  payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
  price: {
    asset: USDC_TESTNET_ASA_ID,
    amount: "100000",  // 0.10 USDC (a Money price such as "$0.10" resolves to USDC too)
  },
  network: ALGORAND_TESTNET_CAIP2,
  maxTimeoutSeconds: 60,
};

// 5. Process an incoming request (framework-agnostic)
async function handleRequest(url: string, paymentSignatureHeader?: string) {
  const requirements = await server.buildPaymentRequirements(resourceConfig);
  const resource = { url, description: "Premium API", mimeType: "application/json" };

  if (!paymentSignatureHeader) {
    // No PAYMENT-SIGNATURE header -- return 402 with the PAYMENT-REQUIRED header
    const paymentRequired = await server.createPaymentRequiredResponse(
      requirements,
      resource,
      "PAYMENT-SIGNATURE header is required",
    );
    return {
      status: 402,
      headers: { "PAYMENT-REQUIRED": encodePaymentRequiredHeader(paymentRequired) },
    };
  }

  // Verify and settle payment (both can throw on facilitator errors; catch in production)
  const paymentPayload = decodePaymentSignatureHeader(paymentSignatureHeader);
  const matched = server.findMatchingRequirements(requirements, paymentPayload);
  if (!matched) {
    return { status: 402, body: { error: "Payment does not match the requirements" } };
  }

  const verifyResult = await server.verifyPayment(paymentPayload, matched);
  if (!verifyResult.isValid) {
    return { status: 402, body: { error: verifyResult.invalidReason } };
  }

  // ... produce the resource, then settle
  const settleResult = await server.settlePayment(paymentPayload, matched);
  if (!settleResult.success) {
    return { status: 402, body: { error: settleResult.errorReason } };
  }

  return {
    status: 200,
    headers: { "PAYMENT-RESPONSE": encodePaymentResponseHeader(settleResult) },
    body: { data: "premium content" },
  };
}
```

### TypeScript HTTP Resource Server

The `x402HTTPResourceServer` adds HTTP route configuration on top of the base server. Routes are keyed by `"METHOD /path"` patterns, and each route lists its payment options in `accepts`.

```typescript
import {
  x402ResourceServer,
  x402HTTPResourceServer,
  HTTPFacilitatorClient,
} from "@x402/core/server";
import type { RoutesConfig } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

// Create facilitator client and resource server
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.goplausible.xyz",
});
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme());

// Route configuration
const routes: RoutesConfig = {
  "GET /api/premium/*": {
    accepts: {
      scheme: "exact",
      payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
      price: { asset: USDC_TESTNET_ASA_ID, amount: "100000" },  // 0.10 USDC
      network: ALGORAND_TESTNET_CAIP2,
      maxTimeoutSeconds: 60,
    },
    description: "Premium API endpoints",
    mimeType: "application/json",
  },
  "POST /api/expensive-analysis": {
    accepts: {
      scheme: "exact",
      payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
      price: { asset: USDC_TESTNET_ASA_ID, amount: "5000000" },  // 5.00 USDC
      network: ALGORAND_TESTNET_CAIP2,
      maxTimeoutSeconds: 120,
    },
    description: "Expensive analysis endpoint",
    mimeType: "application/json",
  },
};

const httpServer = new x402HTTPResourceServer(resourceServer, routes);

// Fetches /supported from the facilitator and validates every route
await httpServer.initialize();
```

The framework packages (`@x402/express`, `@x402/hono`, `@x402/next`) wrap `x402HTTPResourceServer`: they call `processHTTPRequest()` with a framework `HTTPAdapter`, answer unpaid requests with 402 and the `PAYMENT-REQUIRED` header, and call `processSettlement()` after your handler to add `PAYMENT-RESPONSE`. See the framework docs in this folder.

---

## Facilitator Implementation

### TypeScript Facilitator

```typescript
import { x402Facilitator } from "@x402/core/facilitator";
import type { PaymentPayload, PaymentRequirements, SettleResponse } from "@x402/core/types";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { toFacilitatorAvmSigner, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

// 1. Create the facilitator signer (fee payer account, must hold ALGO)
const facilitatorSigner = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!);

// 2. Create the facilitator and register the AVM exact scheme
const facilitator = new x402Facilitator()
  .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(facilitatorSigner));

// 3. Use the facilitator to verify and settle payments
async function handlePaymentVerification(
  paymentPayload: PaymentPayload,
  requirements: PaymentRequirements,
): Promise<SettleResponse> {
  const verifyResult = await facilitator.verify(paymentPayload, requirements);

  if (!verifyResult.isValid) {
    return {
      success: false,
      errorReason: verifyResult.invalidReason,
      transaction: "",
      network: requirements.network,
    };
  }

  // settle() verifies again, signs the fee payer transaction, submits the group
  // and resolves after on-chain confirmation (waits up to 10 rounds)
  return facilitator.settle(paymentPayload, requirements);
}
```

---

## HTTPFacilitatorClient

The `HTTPFacilitatorClient` handles communication between the resource server and a remote facilitator.

```typescript
import { HTTPFacilitatorClient } from "@x402/core/server";

// Basic configuration (GoPlausible facilitator: Algorand MainNet/TestNet and more)
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.goplausible.xyz",
});

// With authentication and a custom timeout (default 90_000 ms per request).
// createAuthHeaders must return headers keyed by facilitator path.
const authenticatedClient = new HTTPFacilitatorClient({
  url: "https://facilitator.example.com",
  timeoutMs: 30_000,
  createAuthHeaders: async () => {
    const headers = { Authorization: `Bearer ${process.env.FACILITATOR_API_KEY}` };
    return { verify: headers, settle: headers, supported: headers };
  },
});

// Check supported payment kinds
const supported = await facilitatorClient.getSupported();
console.log("Supported kinds:", supported.kinds);   // [{ x402Version, scheme, network, extra? }]
console.log("Extensions:", supported.extensions);
console.log("Signers:", supported.signers);         // { "algorand:*": [addresses], ... }

// The Algorand fee payer address is in extra.feePayer
const algorandFeePayers = supported.kinds
  .filter(kind => kind.network.startsWith("algorand:"))
  .map(kind => kind.extra?.feePayer);

// Verify a payment directly
const verifyResult = await facilitatorClient.verify(paymentPayload, paymentRequirements);

// Settle a payment directly (resolves after on-chain confirmation, ~3-6 s end to end)
const settleResult = await facilitatorClient.settle(paymentPayload, paymentRequirements);
```

During the CAIP-2 transition, `https://facilitator.goplausible.xyz/supported` lists the canonical Algorand ids first and the legacy full-hash ids after them; both forms are accepted on `/verify` and `/settle`. The legacy ids will be switched off with notice.

---

## Complete End-to-End Examples

### TypeScript Full Stack

A complete example showing client, resource server, and facilitator working together.

```typescript
// ============================================================
// shared/config.ts - Shared configuration
// ============================================================
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

export const NETWORK = ALGORAND_TESTNET_CAIP2;
export const USDC_ASA = USDC_TESTNET_ASA_ID;
export const RESOURCE_WALLET = "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA";
export const FACILITATOR_URL = "http://localhost:4000";
export const RESOURCE_SERVER_URL = "http://localhost:3000";

// ============================================================
// facilitator/index.ts - Facilitator Service
// ============================================================
import express from "express";
import { x402Facilitator } from "@x402/core/facilitator";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { toFacilitatorAvmSigner } from "@x402/avm";
import { NETWORK } from "../shared/config";

const signer = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!);

const facilitator = new x402Facilitator().register(NETWORK, new ExactAvmScheme(signer));

const app = express();
app.use(express.json());

app.get("/supported", (_req, res) => {
  // kinds[].extra.feePayer carries this facilitator's fee payer address
  res.json(facilitator.getSupported());
});

app.post("/verify", async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body as {
    paymentPayload: PaymentPayload;
    paymentRequirements: PaymentRequirements;
  };
  const result = await facilitator.verify(paymentPayload, paymentRequirements);
  res.json(result);
});

app.post("/settle", async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body as {
    paymentPayload: PaymentPayload;
    paymentRequirements: PaymentRequirements;
  };
  // Resolves after the transaction group is confirmed on-chain
  const result = await facilitator.settle(paymentPayload, paymentRequirements);
  res.json(result);
});

app.listen(4000, () => console.log("Facilitator running on :4000"));

// ============================================================
// server/index.ts - Resource Server
// ============================================================
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import {
  NETWORK,
  USDC_ASA,
  RESOURCE_WALLET,
  FACILITATOR_URL,
} from "../shared/config";

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(NETWORK, new ExactAvmScheme());

const app = express();

app.use(
  paymentMiddleware(
    {
      "GET /api/weather": {
        accepts: {
          scheme: "exact",
          payTo: RESOURCE_WALLET,
          price: { asset: USDC_ASA, amount: "10000" },  // 0.01 USDC
          network: NETWORK,
          maxTimeoutSeconds: 60,
        },
        description: "Weather data API",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// Reached only after the payment is verified; the middleware settles it after
// the handler and adds the PAYMENT-RESPONSE header
app.get("/api/weather", (_req, res) => {
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
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner } from "@x402/avm";
import { RESOURCE_SERVER_URL } from "../shared/config";

const clientSigner = toClientAvmSigner(process.env.CLIENT_AVM_PRIVATE_KEY!);

const client = new x402Client().register("algorand:*", new ExactAvmScheme(clientSigner));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

async function getWeather() {
  // wrapFetchWithPayment handles 402 responses automatically:
  // 1. Receives 402 with the PAYMENT-REQUIRED header
  // 2. Builds and signs the Algorand transaction group
  // 3. Retries with the PAYMENT-SIGNATURE header
  const response = await fetchWithPayment(`${RESOURCE_SERVER_URL}/api/weather`);

  if (response.ok) {
    const weather = await response.json();
    console.log("Weather:", weather);
  } else {
    console.error("Failed:", response.status, response.statusText);
  }
}

getWeather();
```

---

## Summary

| Component | TypeScript Import |
|-----------|-------------------|
| Client | `x402Client` from `@x402/core/client` |
| HTTP Client helpers | `x402HTTPClient` from `@x402/core/client`, `wrapFetchWithPayment` from `@x402/fetch` |
| Resource Server | `x402ResourceServer` from `@x402/core/server` |
| HTTP Resource Server | `x402HTTPResourceServer` from `@x402/core/server` |
| Facilitator | `x402Facilitator` from `@x402/core/facilitator` |
| Facilitator Client | `HTTPFacilitatorClient` from `@x402/core/server` |
| V2 header codecs | `encodePaymentRequiredHeader`, `decodePaymentSignatureHeader`, `encodePaymentResponseHeader` from `@x402/core/http` |
| AVM Scheme (Client) | `ExactAvmScheme` from `@x402/avm/exact/client`, `client.register("algorand:*", new ExactAvmScheme(signer))` |
| AVM Scheme (Server) | `ExactAvmScheme` from `@x402/avm/exact/server`, `server.register(network, new ExactAvmScheme())` |
| AVM Scheme (Facilitator) | `ExactAvmScheme` from `@x402/avm/exact/facilitator`, `facilitator.register(network, new ExactAvmScheme(signer))` |
| Types | `@x402/core/types` |
| Constants | `@x402/avm` |
