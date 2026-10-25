# x402-avm V2: Axios Client Examples

> **Python examples**: See [x402-avm-requests-examples-python](../python/x402-avm-requests-examples-python.md) for the Python equivalent using `requests` and `httpx`.

Comprehensive guide for using `@x402/axios` to make automatic payments over HTTP using Axios with Algorand (AVM) support.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Basic Usage with wrapAxiosWithPayment](#basic-usage-with-wrapaxioswithpayment)
4. [Config-Based Usage with wrapAxiosWithPaymentFromConfig](#config-based-usage-with-wrapaxioswithpaymentfromconfig)
5. [ClientAvmSigner Implementation](#clientavmsigner-implementation)
6. [Interceptor Behavior Explained](#interceptor-behavior-explained)
7. [Advanced Configuration](#advanced-configuration)
8. [Error Handling](#error-handling)
9. [Complete Examples](#complete-examples)
10. [API Reference Summary](#api-reference-summary)

---

## Installation

```bash
npm install @x402/axios @x402/avm axios
```

> **Note on `algosdk`:** `@x402/avm` does not depend on `algosdk`; it is built on `@algorandfoundation/algokit-utils` v10 (`@x402/avm` 2.28.0 pins `10.0.0-alpha.46`). A signer only has to implement `ClientAvmSigner` (see below). If you are migrating from GoPlausible's earlier `@x402-avm/*` packages or from an algosdk-based signer, switch to the upstream `@x402/*` packages and the signer code shown below. Browser wallet libraries such as `@txnlab/use-wallet` still declare `algosdk` v3 as their own peer dependency. `@x402/axios` 2.28.0 declares `axios` (`^1.7.9`) as a peer dependency.

Or with other package managers:

```bash
pnpm add @x402/axios @x402/avm axios
yarn add @x402/axios @x402/avm axios
```

---

## Quick Start

```typescript
import axios from "axios";
import { wrapAxiosWithPayment, x402Client } from "@x402/axios";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner } from "@x402/avm";

// 1. Create signer
const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);

// 2. Create and configure the x402 client ("algorand:*" matches MainNet and TestNet)
const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));

// 3. Wrap an axios instance
const api = wrapAxiosWithPayment(axios.create(), client);

// 4. Make requests -- 402 responses are handled automatically
const response = await api.get("https://api.example.com/premium-data");
console.log(response.data);
```

---

## Basic Usage with wrapAxiosWithPayment

`wrapAxiosWithPayment` adds a response interceptor to an Axios instance that automatically handles `402 Payment Required` responses by signing and submitting payment transactions.

### Signature

```typescript
function wrapAxiosWithPayment(
  axiosInstance: AxiosInstance,
  client: x402Client | x402HTTPClient,
): AxiosInstance;
```

The function returns the same Axios instance (mutated with the interceptor), so you can chain calls.

### Example

```typescript
import axios from "axios";
import { wrapAxiosWithPayment, x402Client } from "@x402/axios";
import { ExactAvmScheme } from "@x402/avm/exact/client";

// Assume `signer` is a ClientAvmSigner (see below for full implementation)
const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));

// Wrap an existing Axios instance
const api = wrapAxiosWithPayment(axios.create({
  baseURL: "https://api.example.com",
  timeout: 30000, // the paid retry waits for on-chain settlement (typically a few seconds)
  headers: { Accept: "application/json" },
}), client);

// GET request
const getResult = await api.get("/paid-content");
console.log(getResult.data);

// POST request
const postResult = await api.post("/paid-action", {
  query: "premium search",
});
console.log(postResult.data);

// PUT request with custom headers
const putResult = await api.put("/paid-resource/123", {
  name: "Updated Name",
}, {
  headers: { "X-Custom-Header": "value" },
});
console.log(putResult.data);
```

### Wrapping the Default Axios Instance

You can wrap the global axios instance directly:

```typescript
import axios from "axios";
import { wrapAxiosWithPayment, x402Client } from "@x402/axios";
import { ExactAvmScheme } from "@x402/avm/exact/client";

const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));

// Wrap the default axios instance
wrapAxiosWithPayment(axios, client);

// Now all axios calls through the default instance are payment-aware
const response = await axios.get("https://api.example.com/paid");
```

---

## Config-Based Usage with wrapAxiosWithPaymentFromConfig

For a declarative configuration approach:

### Signature

```typescript
function wrapAxiosWithPaymentFromConfig(
  axiosInstance: AxiosInstance,
  config: x402ClientConfig,
): AxiosInstance;
```

### Example

```typescript
import axios from "axios";
import {
  wrapAxiosWithPaymentFromConfig,
  type x402ClientConfig,
} from "@x402/axios";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const config: x402ClientConfig = {
  schemes: [
    {
      network: ALGORAND_TESTNET_CAIP2, // "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
      client: new ExactAvmScheme(signer),
    },
  ],
  // Spend controls run before policies and cap each payment at $1 by default;
  // raise the cap so the policy below is the effective limit
  spendControls: { maxAmountPerPayment: "$5" },
  policies: [
    // Only allow payments under 5 USDC
    (version, reqs) => reqs.filter((r) => BigInt(r.amount ?? "0") < BigInt("5000000")),
  ],
};

const api = wrapAxiosWithPaymentFromConfig(axios.create(), config);

const response = await api.get("https://api.example.com/paid-endpoint");
console.log(response.data);
```

### Wildcard Network Registration

```typescript
const config: x402ClientConfig = {
  schemes: [
    {
      network: "algorand:*",  // Matches any Algorand network
      client: new ExactAvmScheme(signer),
    },
  ],
};
```

> The wildcard also matches servers that still advertise the legacy full-genesis-hash ids during the CAIP-2 transition; an exact registration such as `ALGORAND_TESTNET_CAIP2` matches only the canonical id `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe`.

---

## ClientAvmSigner Implementation

### Interface

```typescript
interface ClientAvmSigner {
  address: string;
  signTransactions(
    txns: Uint8Array[],
    indexesToSign?: number[],
  ): Promise<(Uint8Array | null)[]>;
}
```

### Node.js Implementation

```typescript
import { toClientAvmSigner } from "@x402/avm";

const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);
```

### Browser Implementation (@txnlab/use-wallet)

```typescript
import { useWallet } from "@txnlab/use-wallet-react";
import type { ClientAvmSigner } from "@x402/avm";

function useAvmSigner(): ClientAvmSigner | null {
  const { activeAccount, signTransactions } = useWallet();

  if (!activeAccount) return null;

  return {
    address: activeAccount.address,
    signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
      return signTransactions(txns, indexesToSign);
    },
  };
}
```

---

## Interceptor Behavior Explained

Understanding how the Axios interceptor works under the hood helps with debugging and advanced usage.

### Flow Diagram

```
Client Request
     |
     v
[Axios sends request]
     |
     v
Server Response
     |
     +-- Status != 402 --> Return response normally
     |
     +-- Status == 402 -->
           |
           +-- Already retried? (__is402Retry) --> Reject with error
           |
           +-- Parse PaymentRequired from response
           |     (PAYMENT-REQUIRED header for V2, body for V1)
           |
           +-- Run onPaymentRequired hooks (optional; a hook may supply
           |     headers for a retry without payment)
           |
           +-- Create payment payload via x402Client
           |     (builds atomic transaction group, signs with wallet)
           |
           +-- Encode PAYMENT-SIGNATURE header
           |
           +-- Copy the request config, mark it __is402Retry = true,
           |     and treat 402 as a non-error status for this retry
           |
           +-- Retry original request with payment header
           |
           +-- Run onPaymentResponse hooks
           |     (a hook returning { recovered: true } triggers one
           |      more retry with a fresh payload)
           |
           v
        Return retried response (may itself have status 402)
```

### Key Details

1. **Single paid retry**: The interceptor pays once. The retry config treats 402 as a non-error status, so if the paid retry still returns 402 (verification or settlement failed) the call **resolves** with that 402 response instead of throwing; check `response.status`. The only exception is an `onPaymentResponse` hook that returns `{ recovered: true }`, which triggers exactly one more retry with a fresh payload.

2. **Request copy**: The interceptor copies the original request config (headers are cloned) and retries using `axiosInstance.request()`. This means all other interceptors (request interceptors, other response interceptors) also apply to the retry.

3. **Error propagation**: Non-402 errors pass through untouched. Payment-specific errors are wrapped with descriptive messages.

4. **Concurrent requests**: Each 402 response is handled independently. Multiple requests can trigger payments in parallel.

### Interceptor Order

If you have other interceptors, register them first and call `wrapAxiosWithPayment` last (it adds its response interceptor at the moment it is called):

```typescript
const api = axios.create();

// Add your interceptors first
api.interceptors.request.use((config) => {
  config.headers.set("Authorization", `Bearer ${getToken()}`);
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Custom logging
    console.log(`${response.config.method} ${response.config.url}: ${response.status}`);
    return response;
  },
);

// Add payment interceptor last
wrapAxiosWithPayment(api, client);
```

---

## Advanced Configuration

### Custom Algod Endpoint

```typescript
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { ALGORAND_MAINNET_CAIP2 } from "@x402/avm";

// A custom algodUrl is used for every transaction the scheme builds (no per-network
// auto-detection), so register it only for the network that node serves
const client = new x402Client();
client.register(
  ALGORAND_MAINNET_CAIP2,
  new ExactAvmScheme(signer, {
    algodUrl: "https://your-private-node.example.com",
    algodToken: "your-api-token",
  }),
);
```

### Pre-Configured AlgorandClient

`ExactAvmScheme` also accepts a pre-configured `AlgorandClient` from `@algorandfoundation/algokit-utils` (install the same version `@x402/avm` uses, `10.0.0-alpha.46` for 2.28.0); it takes precedence over `algodUrl`/`algodToken`:

```typescript
import { AlgorandClient } from "@algorandfoundation/algokit-utils/algorand-client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const client = new x402Client();
client.register(
  ALGORAND_TESTNET_CAIP2,
  new ExactAvmScheme(signer, { algorandClient: AlgorandClient.testNet() }),
);
```

### Specific Network Registration

Instead of the wildcard `algorand:*`, register for specific networks:

```typescript
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";
import { ExactAvmScheme } from "@x402/avm/exact/client";

const client = new x402Client();
client.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer)); // Only testnet
```

### Payment Policies

Spend controls run before policies: by default only default assets (on Algorand: USDC, ASA `31566704` on MainNet and `10458941` on TestNet) are accepted, capped at `$1` per payment. Use `client.setSpendControls(...)` to change the cap or allow other assets.

```typescript
import { wrapAxiosWithPayment, x402Client, type PaymentPolicy } from "@x402/axios";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { isTestnetNetwork } from "@x402/avm";

// Prefer Algorand when multiple networks are available
const preferAlgorand: PaymentPolicy = (version, reqs) => {
  const algoReqs = reqs.filter((r) => r.network.startsWith("algorand:"));
  return algoReqs.length > 0 ? algoReqs : reqs;
};

// Cap payment amounts
const maxPayment: PaymentPolicy = (version, reqs) => {
  return reqs.filter((r) => BigInt(r.amount ?? "0") <= BigInt("2000000")); // 2 USDC max
};

// Prefer testnet (isTestnetNetwork accepts the canonical and the legacy full-hash id)
const preferTestnet: PaymentPolicy = (version, reqs) => {
  const testnet = reqs.filter((r) => isTestnetNetwork(r.network));
  return testnet.length > 0 ? testnet : reqs;
};

const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));
client.setSpendControls({ maxAmountPerPayment: "$2" }); // default cap is $1
client
  .registerPolicy(preferAlgorand)
  .registerPolicy(preferTestnet)
  .registerPolicy(maxPayment);

const api = wrapAxiosWithPayment(axios.create(), client);
```

### Custom Payment Requirements Selector

```typescript
import { x402Client, type SelectPaymentRequirements } from "@x402/axios";
import { ExactAvmScheme } from "@x402/avm/exact/client";

// Custom selector: pick the cheapest option
const cheapestFirst: SelectPaymentRequirements = (version, reqs) => {
  return [...reqs].sort((a, b) => {
    const amountA = BigInt(a.amount);
    const amountB = BigInt(b.amount);
    return amountA < amountB ? -1 : amountA > amountB ? 1 : 0;
  })[0];
};

const client = new x402Client(cheapestFirst);
client.register("algorand:*", new ExactAvmScheme(signer));
```

### Lifecycle Hooks

```typescript
const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));

// Before payment: log and optionally abort
client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
  const amountUSDC = Number(selectedRequirements.amount) / 1_000_000;
  console.log(`[x402] Paying $${amountUSDC.toFixed(6)} USDC`);
  console.log(`[x402] Network: ${selectedRequirements.network}`);
  console.log(`[x402] Pay to: ${selectedRequirements.payTo}`);

  // Abort if too expensive
  if (amountUSDC > 10) {
    return { abort: true, reason: "Payment exceeds $10 limit" };
  }
});

// After payment: confirm success
client.onAfterPaymentCreation(async ({ paymentPayload }) => {
  console.log("[x402] Payment signed successfully");
});

// On failure: log the error
client.onPaymentCreationFailure(async ({ error }) => {
  console.error("[x402] Payment failed:", error.message);
  // Could optionally recover:
  // return { recovered: true, payload: fallbackPayload };
});
```

---

## Error Handling

### Axios Error Handling Pattern

Axios throws errors for non-2xx responses. The payment interceptor catches the initial 402 internally; other HTTP errors and payment-creation failures still throw. A paid retry that is answered with 402 does not throw: it resolves with `status === 402`.

```typescript
import axios, { AxiosError } from "axios";
import { wrapAxiosWithPayment, x402Client } from "@x402/axios";
import { ExactAvmScheme } from "@x402/avm/exact/client";

const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));
const api = wrapAxiosWithPayment(axios.create(), client);

try {
  const response = await api.get("https://api.example.com/paid-content");
  if (response.status === 402) {
    // The paid retry was refused (verification or settlement failed)
    console.error("Payment was rejected by the server");
  } else {
    console.log("Success:", response.data);
  }
} catch (error) {
  if (error instanceof AxiosError) {
    // Axios HTTP error (non-payment related)
    if (error.response) {
      console.error(`Server returned ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.message);
    } else {
      console.error("Request setup error:", error.message);
    }
  } else if (error instanceof Error) {
    // Payment-specific errors. Errors raised while building the payment are wrapped as
    // "Failed to create payment payload: <reason>", so test the specific reasons first.
    if (error.message.includes("Failed to parse payment requirements")) {
      console.error("Server sent invalid 402 response");
    } else if (error.message.includes("No network/scheme registered")) {
      console.error("Server requires a payment network we don't support");
    } else if (error.message.includes("rejected by spendControls")) {
      console.error("Payment blocked by spend controls ($1 cap / default assets by default)");
    } else if (error.message.includes("All payment requirements were filtered out")) {
      console.error("All payment options were rejected by our policies");
    } else if (error.message.includes("Failed to create payment payload")) {
      console.error("Could not sign payment:", error.message);
    } else {
      console.error("Unexpected error:", error.message);
    }
  }
}
```

### Retry Behavior

If the server returns 402 after the payment was sent, the interceptor does NOT pay again (preventing infinite loops). Because the retry treats 402 as a non-error status, the call resolves with the 402 response; the decoded `PAYMENT-REQUIRED` header carries the server's `error` reason:

```typescript
// @x402/core is a dependency of @x402/axios; add it to your own dependencies to import it directly
import { decodePaymentRequiredHeader } from "@x402/core/http";

const response = await api.get("https://api.example.com/always-402");

// The payment was sent but the server still refused
if (response.status === 402) {
  const header = response.headers["payment-required"];
  const reason = typeof header === "string" ? decodePaymentRequiredHeader(header).error : undefined;
  console.error("Payment was rejected after submission:", reason);
}
```

### Handling Missing Configuration

```typescript
try {
  // This will fail on the first 402 if no schemes are registered
  const emptyClient = new x402Client();
  const api = wrapAxiosWithPayment(axios.create(), emptyClient);
  await api.get("https://api.example.com/paid");
} catch (error) {
  // "Failed to create payment payload: No client registered for x402 version: 2"
  console.error(error);
}
```

---

## Complete Examples

### Complete Node.js API Client

```typescript
// paid-api-client.ts
import axios, { AxiosError } from "axios";
import { wrapAxiosWithPayment, x402Client, type PaymentPolicy } from "@x402/axios";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

// ---- Signer Setup ----

const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);

// ---- Client Configuration ----

// TestNet only, because a TestNet Algod URL is pinned
const client = new x402Client();
client.register(
  ALGORAND_TESTNET_CAIP2,
  new ExactAvmScheme(signer, {
    algodUrl: process.env.ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud",
  }),
);

// Safety limits: spend controls cap each payment ($1 by default), then policies filter
client.setSpendControls({ maxAmountPerPayment: "$5" });

const maxPaymentPolicy: PaymentPolicy = (version, reqs) => {
  return reqs.filter((r) => BigInt(r.amount ?? "0") <= BigInt("5000000")); // Max 5 USDC
};

client.registerPolicy(maxPaymentPolicy);

// Add monitoring hooks
client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
  const usdcAmount = Number(selectedRequirements.amount) / 1_000_000;
  console.log(`[x402] Paying $${usdcAmount.toFixed(6)} to ${selectedRequirements.payTo}`);
});

client.onAfterPaymentCreation(async () => {
  // The facilitator submits the group to the network when the server settles
  console.log("[x402] Payment transaction group signed");
});

// ---- API Client ----

const api = wrapAxiosWithPayment(
  axios.create({
    baseURL: "https://api.example.com",
    timeout: 30000, // the paid retry waits for on-chain settlement
    headers: {
      Accept: "application/json",
      "User-Agent": "x402-avm-client/1.0",
    },
  }),
  client,
);

// ---- Usage ----

async function fetchPremiumContent(contentId: string) {
  try {
    const response = await api.get(`/premium/content/${contentId}`);

    // A refused paid retry resolves with status 402 (it is not thrown)
    if (response.status === 402) {
      console.error("Payment failed -- server rejected our payment");
      return null;
    }
    console.log("Content:", response.data);

    // Check payment response header
    const paymentReceipt = response.headers["payment-response"];
    if (paymentReceipt) {
      console.log("Payment receipt:", paymentReceipt);
    }

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        console.error("Content not found");
      } else {
        console.error(`API error: ${error.response?.status}`, error.response?.data);
      }
    } else {
      console.error("Unexpected error:", error);
    }
    throw error;
  }
}

async function submitPaidQuery(query: string) {
  try {
    const response = await api.post("/premium/search", { query });
    return response.data;
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
}

// ---- Main ----

async function main() {
  console.log(`Wallet address: ${signer.address}`);
  console.log(`Network: ${ALGORAND_TESTNET_CAIP2}\n`);

  // Fetch premium content (auto-pays if 402)
  const content = await fetchPremiumContent("article-123");
  console.log("\n---\n");

  // Submit a paid search query
  const results = await submitPaidQuery("algorand smart contracts");
  console.log("Search results:", results);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
```

---

## API Reference Summary

### Exports from `@x402/axios`

| Export | Type | Description |
|--------|------|-------------|
| `wrapAxiosWithPayment` | Function | Wraps Axios instance with 402 payment interceptor |
| `wrapAxiosWithPaymentFromConfig` | Function | Config-based variant of the above |
| `x402Client` | Class | Core client for managing payment schemes |
| `x402HTTPClient` | Class | HTTP-level payment client |
| `decodePaymentResponseHeader` | Function | Decodes the PAYMENT-RESPONSE header |
| `PaymentPolicy` | Type | Policy function type for filtering requirements |
| `SelectPaymentRequirements` | Type | Selector function type (`new x402Client(selector)`) |
| `SchemeRegistration` | Type | Scheme registration configuration |
| `x402ClientConfig` | Type | Configuration object type (`schemes`, `policies?`, `spendControls?`, `paymentRequirementsSelector?`) |
| `HTTPResourceResponse` | Type | Parsed result type of `x402HTTPClient` response helpers |
| `PaymentRequired` | Type | 402 response structure |
| `PaymentRequirements` | Type | Individual payment requirement |
| `PaymentPayload` | Type | Signed payment payload |
| `Network` | Type | Network identifier string type |
| `SchemeNetworkClient` | Type | Client-side scheme interface |
