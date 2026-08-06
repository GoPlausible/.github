# x402-avm V2: Axios Client Examples

> **Python examples**: See [x402-avm-requests-examples-python](../python/x402-avm-requests-examples-python.md) for the Python equivalent using `requests` and `httpx`.

Comprehensive guide for using `@x402-avm/axios` to make automatic payments over HTTP using Axios with Algorand (AVM) support.

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
npm install @x402-avm/axios @x402-avm/avm algosdk axios
```

Or with other package managers:

```bash
pnpm add @x402-avm/axios @x402-avm/avm algosdk axios
yarn add @x402-avm/axios @x402-avm/avm algosdk axios
```

---

## Quick Start

```typescript
import axios from "axios";
import { wrapAxiosWithPayment, x402Client } from "@x402-avm/axios";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import algosdk from "algosdk";

// 1. Create signer
const secretKey = Buffer.from(process.env.AVM_PRIVATE_KEY!, "base64");
const address = algosdk.encodeAddress(secretKey.slice(32));
const signer = {
  address,
  signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
    return txns.map((txn, i) => {
      if (indexesToSign && !indexesToSign.includes(i)) return null;
      const decoded = algosdk.decodeUnsignedTransaction(txn);
      const signed = algosdk.signTransaction(decoded, secretKey);
      return signed.blob;
    });
  },
};

// 2. Create and configure the x402 client
const client = new x402Client();
registerExactAvmScheme(client, { signer });

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
import { wrapAxiosWithPayment, x402Client } from "@x402-avm/axios";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

// Create a signer (see below for full implementation)
const client = new x402Client();
registerExactAvmScheme(client, { signer });

// Wrap an existing Axios instance
const api = wrapAxiosWithPayment(axios.create({
  baseURL: "https://api.example.com",
  timeout: 30000,
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
import { wrapAxiosWithPayment, x402Client } from "@x402-avm/axios";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

const client = new x402Client();
registerExactAvmScheme(client, { signer });

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
} from "@x402-avm/axios";
import { ExactAvmScheme } from "@x402-avm/avm";

const config: x402ClientConfig = {
  schemes: [
    {
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      client: new ExactAvmScheme(signer),
    },
  ],
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

### Node.js Implementation (algosdk)

```typescript
import algosdk from "algosdk";
import type { ClientAvmSigner } from "@x402-avm/avm";

function createSigner(privateKeyBase64: string): ClientAvmSigner {
  const secretKey = Buffer.from(privateKeyBase64, "base64");
  const address = algosdk.encodeAddress(secretKey.slice(32));

  return {
    address,
    signTransactions: async (
      txns: Uint8Array[],
      indexesToSign?: number[],
    ): Promise<(Uint8Array | null)[]> => {
      return txns.map((txnBytes, i) => {
        if (indexesToSign && !indexesToSign.includes(i)) return null;
        const decoded = algosdk.decodeUnsignedTransaction(txnBytes);
        const signed = algosdk.signTransaction(decoded, secretKey);
        return signed.blob;
      });
    },
  };
}
```

### Browser Implementation (@txnlab/use-wallet)

```typescript
import { useWallet } from "@txnlab/use-wallet-react";
import type { ClientAvmSigner } from "@x402-avm/avm";

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
           |     (headers for V2, body for V1)
           |
           +-- Run payment hooks (optional)
           |
           +-- Create payment payload via x402Client
           |     (builds atomic transaction group, signs with wallet)
           |
           +-- Encode PAYMENT-SIGNATURE header
           |
           +-- Mark request as __is402Retry = true
           |
           +-- Retry original request with payment header
           |
           v
        Return retried response
```

### Key Details

1. **Single retry**: The interceptor only retries once. If the retry also returns 402, the error is propagated to the caller.

2. **Request mutation**: The interceptor modifies the original request config and retries using `axiosInstance.request()`. This means all other interceptors (request interceptors, other response interceptors) also apply to the retry.

3. **Error propagation**: Non-402 errors pass through untouched. Payment-specific errors are wrapped with descriptive messages.

4. **Concurrent requests**: Each 402 response is handled independently. Multiple requests can trigger payments in parallel.

### Interceptor Order

If you have other interceptors, the payment interceptor should generally be added last (which `wrapAxiosWithPayment` ensures):

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
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

const client = new x402Client();
registerExactAvmScheme(client, {
  signer,
  algodConfig: {
    algodUrl: "https://your-private-node.example.com",
    algodToken: "your-api-token",
  },
});
```

### Pre-Configured Algod Client

```typescript
import algosdk from "algosdk";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

const algodClient = new algosdk.Algodv2(
  "your-token",
  "https://your-node.example.com",
  443,
);

const client = new x402Client();
registerExactAvmScheme(client, {
  signer,
  algodConfig: {
    algodClient, // Pass pre-configured algosdk.Algodv2 directly
  },
});
```

### Specific Network Registration

Instead of the wildcard `algorand:*`, register for specific networks:

```typescript
import { ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2 } from "@x402-avm/avm";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

const client = new x402Client();
registerExactAvmScheme(client, {
  signer,
  networks: [ALGORAND_TESTNET_CAIP2],  // Only testnet
});
```

### Payment Policies

```typescript
import type { PaymentPolicy } from "@x402-avm/axios";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

// Prefer Algorand when multiple networks are available
const preferAlgorand: PaymentPolicy = (version, reqs) => {
  const algoReqs = reqs.filter((r) => r.network.startsWith("algorand:"));
  return algoReqs.length > 0 ? algoReqs : reqs;
};

// Cap payment amounts
const maxPayment: PaymentPolicy = (version, reqs) => {
  return reqs.filter((r) => BigInt(r.amount ?? "0") <= BigInt("2000000")); // 2 USDC max
};

// Prefer testnet
const preferTestnet: PaymentPolicy = (version, reqs) => {
  const testnet = reqs.filter((r) => r.network === ALGORAND_TESTNET_CAIP2);
  return testnet.length > 0 ? testnet : reqs;
};

const client = new x402Client();
registerExactAvmScheme(client, { signer });
client
  .registerPolicy(preferAlgorand)
  .registerPolicy(preferTestnet)
  .registerPolicy(maxPayment);

const api = wrapAxiosWithPayment(axios.create(), client);
```

### Custom Payment Requirements Selector

```typescript
// Custom selector: pick the cheapest option
const cheapestFirst = (version: number, reqs: PaymentRequirements[]) => {
  return reqs.sort((a, b) => {
    const amountA = BigInt(a.amount ?? a.maxAmountRequired ?? "0");
    const amountB = BigInt(b.amount ?? b.maxAmountRequired ?? "0");
    return amountA < amountB ? -1 : amountA > amountB ? 1 : 0;
  })[0];
};

const client = new x402Client(cheapestFirst);
registerExactAvmScheme(client, { signer });
```

### Lifecycle Hooks

```typescript
const client = new x402Client();
registerExactAvmScheme(client, { signer });

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

Axios throws errors for non-2xx responses. The payment interceptor catches 402 errors internally, but other errors and failed payment retries will still throw.

```typescript
import axios, { AxiosError } from "axios";
import { wrapAxiosWithPayment, x402Client } from "@x402-avm/axios";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

const client = new x402Client();
registerExactAvmScheme(client, { signer });
const api = wrapAxiosWithPayment(axios.create(), client);

try {
  const response = await api.get("https://api.example.com/paid-content");
  console.log("Success:", response.data);
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
    // Payment-specific errors
    if (error.message.includes("Failed to parse payment requirements")) {
      console.error("Server sent invalid 402 response");
    } else if (error.message.includes("Failed to create payment payload")) {
      console.error("Could not sign payment:", error.message);
    } else if (error.message.includes("No network/scheme registered")) {
      console.error("Server requires a payment network we don't support");
    } else if (error.message.includes("All payment requirements were filtered out")) {
      console.error("All payment options were rejected by our policies");
    } else {
      console.error("Unexpected error:", error.message);
    }
  }
}
```

### Retry Behavior

If the server returns 402 after payment was submitted, the interceptor does NOT retry again (preventing infinite loops). The original AxiosError is rejected:

```typescript
try {
  await api.get("https://api.example.com/always-402");
} catch (error) {
  // This will be an AxiosError with status 402
  // The payment was sent but the server still refused
  if (error instanceof AxiosError && error.response?.status === 402) {
    console.error("Payment was rejected after submission");
  }
}
```

### Handling Missing Configuration

```typescript
try {
  // This will fail if no schemes are registered
  const emptyClient = new x402Client();
  const api = wrapAxiosWithPayment(axios.create(), emptyClient);
  await api.get("https://api.example.com/paid");
} catch (error) {
  // "No client registered for x402 version: 2"
  console.error(error);
}
```

---

## Complete Examples

### Complete Node.js API Client

```typescript
// paid-api-client.ts
import axios, { AxiosError } from "axios";
import { wrapAxiosWithPayment, x402Client, type PaymentPolicy } from "@x402-avm/axios";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";
import algosdk from "algosdk";

// ---- Signer Setup ----

const secretKey = Buffer.from(process.env.AVM_PRIVATE_KEY!, "base64");
const address = algosdk.encodeAddress(secretKey.slice(32));

const signer = {
  address,
  signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
    return txns.map((txn, i) => {
      if (indexesToSign && !indexesToSign.includes(i)) return null;
      const decoded = algosdk.decodeUnsignedTransaction(txn);
      const signed = algosdk.signTransaction(decoded, secretKey);
      return signed.blob;
    });
  },
};

// ---- Client Configuration ----

const client = new x402Client();
registerExactAvmScheme(client, {
  signer,
  algodConfig: {
    algodUrl: process.env.ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud",
  },
});

// Add safety policies
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
  console.log("[x402] Transaction signed and submitted");
});

// ---- API Client ----

const api = wrapAxiosWithPayment(
  axios.create({
    baseURL: "https://api.example.com",
    timeout: 30000,
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
    console.log("Content:", response.data);

    // Check payment response header
    const paymentReceipt = response.headers["payment-response"];
    if (paymentReceipt) {
      console.log("Payment receipt:", paymentReceipt);
    }

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 402) {
        console.error("Payment failed -- server rejected our payment");
      } else if (error.response?.status === 404) {
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
  console.log(`Wallet address: ${address}`);
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

### Exports from `@x402-avm/axios`

| Export | Type | Description |
|--------|------|-------------|
| `wrapAxiosWithPayment` | Function | Wraps Axios instance with 402 payment interceptor |
| `wrapAxiosWithPaymentFromConfig` | Function | Config-based variant of the above |
| `x402Client` | Class | Core client for managing payment schemes |
| `x402HTTPClient` | Class | HTTP-level payment client |
| `decodePaymentResponseHeader` | Function | Decodes the PAYMENT-RESPONSE header |
| `PaymentPolicy` | Type | Policy function type for filtering requirements |
| `SchemeRegistration` | Type | Scheme registration configuration |
| `x402ClientConfig` | Type | Configuration object type |
| `PaymentRequired` | Type | 402 response structure |
| `PaymentRequirements` | Type | Individual payment requirement |
| `PaymentPayload` | Type | Signed payment payload |
| `Network` | Type | Network identifier string type |
| `SchemeNetworkClient` | Type | Client-side scheme interface |
