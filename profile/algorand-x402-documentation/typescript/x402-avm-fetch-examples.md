# x402-avm V2: Fetch Client Examples

> **Python examples**: See [x402-avm-httpx-examples-python](../python/x402-avm-httpx-examples-python.md) for the Python equivalent using `httpx` and `requests`.

Comprehensive guide for using `@x402/fetch` to make automatic payments over HTTP using the native `fetch` API with Algorand (AVM) support.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Basic Usage with wrapFetchWithPayment](#basic-usage-with-wrapfetchwithpayment)
4. [Config-Based Usage with wrapFetchWithPaymentFromConfig](#config-based-usage-with-wrapfetchwithpaymentfromconfig)
5. [Implementing ClientAvmSigner for Browser](#implementing-clientavmsigner-for-browser)
6. [Implementing ClientAvmSigner for Node.js](#implementing-clientavmsigner-for-nodejs)
7. [Payment Policies](#payment-policies)
8. [Error Handling](#error-handling)
9. [Complete Examples](#complete-examples)
10. [API Reference Summary](#api-reference-summary)

---

## Installation

```bash
npm install @x402/fetch @x402/avm
```

> **Note on `algosdk`:** `@x402/avm` does not depend on `algosdk`; it is built on `@algorandfoundation/algokit-utils` v10 (`@x402/avm` 2.28.0 pins `10.0.0-alpha.46`). A signer only has to implement `ClientAvmSigner` (see below). If you are migrating from GoPlausible's earlier `@x402-avm/*` packages or from an algosdk-based signer, switch to the upstream `@x402/*` packages and the signer code shown below. Browser wallet libraries such as `@txnlab/use-wallet` and `@perawallet/connect` still declare `algosdk` v3 as their own peer dependency, so browser apps that use them keep `algosdk` installed.

Or with other package managers:

```bash
pnpm add @x402/fetch @x402/avm
yarn add @x402/fetch @x402/avm
```

---

## Quick Start

The simplest way to get started with x402-avm fetch is a 10-line setup:

```typescript
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner } from "@x402/avm";

// 1. Create a signer (see detailed examples below)
const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);

// 2. Create and configure the client ("algorand:*" matches MainNet and TestNet)
const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));

// 3. Wrap fetch
const fetchWithPay = wrapFetchWithPayment(fetch, client);

// 4. Make requests -- 402 responses are handled automatically
const response = await fetchWithPay("https://api.example.com/premium-data");
const data = await response.json();
console.log(data);
```

---

## Basic Usage with wrapFetchWithPayment

`wrapFetchWithPayment` takes a standard `fetch` function and an `x402Client` instance, and returns a new fetch function that automatically handles `402 Payment Required` responses.

### How It Works

1. The wrapped fetch makes the initial HTTP request normally.
2. If the server responds with `402 Payment Required`, the wrapper:
   - Parses payment requirements from the response (the base64 `PAYMENT-REQUIRED` header for V2, the JSON body for V1).
   - Selects a suitable payment method based on registered schemes, spend controls and policies.
   - Creates a payment payload by signing a transaction group.
   - Retries the request with the `PAYMENT-SIGNATURE` header.
3. If the response is anything other than 402, it is returned as-is.
4. The response to the paid retry is returned as-is, including a 402 when the server rejects the payment; the wrapper does not pay a second time (unless an `onPaymentResponse` hook returns `{ recovered: true }`, which triggers exactly one retry with a fresh payload).

### Signature

```typescript
function wrapFetchWithPayment(
  fetch: typeof globalThis.fetch,
  client: x402Client | x402HTTPClient,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
```

### Example

```typescript
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";

// Assume `signer` is a ClientAvmSigner (see implementation sections below)
const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));

const fetchWithPay = wrapFetchWithPayment(fetch, client);

// GET request
const getResponse = await fetchWithPay("https://api.example.com/paid-content");
console.log(await getResponse.json());

// POST request with body
const postResponse = await fetchWithPay("https://api.example.com/paid-action", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "premium data" }),
});
console.log(await postResponse.json());
```

---

## Config-Based Usage with wrapFetchWithPaymentFromConfig

For a more declarative setup, use `wrapFetchWithPaymentFromConfig` with an `x402ClientConfig` object:

### Signature

```typescript
function wrapFetchWithPaymentFromConfig(
  fetch: typeof globalThis.fetch,
  config: x402ClientConfig,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
```

### Example

```typescript
import {
  wrapFetchWithPaymentFromConfig,
  type x402ClientConfig,
} from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

// Assume `signer` is a ClientAvmSigner
const config: x402ClientConfig = {
  schemes: [
    {
      network: ALGORAND_TESTNET_CAIP2, // "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
      client: new ExactAvmScheme(signer),
    },
  ],
  policies: [
    // Optional: filter payment requirements
    (version, reqs) => reqs.filter((r) => BigInt(r.amount ?? "0") < BigInt("10000000")),
  ],
};

const fetchWithPay = wrapFetchWithPaymentFromConfig(fetch, config);

const response = await fetchWithPay("https://api.example.com/paid-endpoint");
```

### Using Wildcard Networks

To accept payment on any Algorand network (testnet or mainnet), use the wildcard:

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

> The wildcard also matches servers that still advertise the legacy full-genesis-hash ids (for example `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`) during the CAIP-2 transition. An exact registration such as `ALGORAND_TESTNET_CAIP2` matches only the canonical id `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe`.

---

## Implementing ClientAvmSigner for Browser

In browser environments, use `@txnlab/use-wallet` to connect Algorand wallets like Pera, Defly, or Lute.

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

### With @txnlab/use-wallet (React)

```typescript
import { useWallet } from "@txnlab/use-wallet-react";
import type { ClientAvmSigner } from "@x402/avm";

function useAvmSigner(): ClientAvmSigner | null {
  const { activeAccount, signTransactions } = useWallet();

  if (!activeAccount) return null;

  return {
    address: activeAccount.address,
    signTransactions: async (
      txns: Uint8Array[],
      indexesToSign?: number[],
    ): Promise<(Uint8Array | null)[]> => {
      // @txnlab/use-wallet's signTransactions accepts the same format
      const signed = await signTransactions(txns, indexesToSign);
      return signed;
    },
  };
}
```

### Full React Component Example

```tsx
import React, { useMemo, useCallback } from "react";
import { useWallet, WalletProvider } from "@txnlab/use-wallet-react";
import { WalletId, WalletManager, NetworkId } from "@txnlab/use-wallet";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import type { ClientAvmSigner } from "@x402/avm";

// Configure wallets (@txnlab/use-wallet v4)
const walletManager = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY, WalletId.LUTE],
  defaultNetwork: NetworkId.TESTNET,
});

function PaidContentViewer() {
  const { activeAccount, signTransactions } = useWallet();

  // Build the signer from the connected wallet
  const signer: ClientAvmSigner | null = useMemo(() => {
    if (!activeAccount) return null;
    return {
      address: activeAccount.address,
      signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
        return signTransactions(txns, indexesToSign);
      },
    };
  }, [activeAccount, signTransactions]);

  // Build the payment-enabled fetch
  const fetchWithPay = useMemo(() => {
    if (!signer) return null;
    const client = new x402Client();
    client.register("algorand:*", new ExactAvmScheme(signer));
    return wrapFetchWithPayment(fetch, client);
  }, [signer]);

  const loadContent = useCallback(async () => {
    if (!fetchWithPay) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const response = await fetchWithPay("https://api.example.com/premium-article");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("Paid content:", data);
    } catch (error) {
      console.error("Payment or fetch failed:", error);
    }
  }, [fetchWithPay]);

  return (
    <div>
      <h2>Premium Content</h2>
      {!activeAccount && <p>Connect your Algorand wallet to access paid content.</p>}
      {activeAccount && (
        <button onClick={loadContent}>
          Load Premium Content (pay with USDC)
        </button>
      )}
    </div>
  );
}

// App wrapper with wallet provider
export default function App() {
  return (
    <WalletProvider manager={walletManager}>
      <PaidContentViewer />
    </WalletProvider>
  );
}
```

### With Pera Wallet (Vanilla JS)

```typescript
import { PeraWalletConnect } from "@perawallet/connect";
import { decodeUnsignedTransaction } from "algosdk"; // peer dependency of @perawallet/connect
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import type { ClientAvmSigner } from "@x402/avm";

const peraWallet = new PeraWalletConnect();

async function setupPaymentFetch(): Promise<typeof fetch> {
  // Connect wallet
  const accounts = await peraWallet.connect();
  const address = accounts[0];

  // Create signer using Pera
  const signer: ClientAvmSigner = {
    address,
    signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
      // Pera's signTransaction expects SignerTransaction[][] ({ txn: algosdk.Transaction, signers? }),
      // so decode the raw transaction bytes; signers: [] tells Pera to skip a transaction
      const txnGroup = txns.map((txn, i) => ({
        txn: decodeUnsignedTransaction(txn),
        signers: indexesToSign && !indexesToSign.includes(i) ? [] : [address],
      }));

      const signedTxns = await peraWallet.signTransaction([txnGroup]);
      // Map back to the expected format (null for unsigned)
      return txns.map((_, i) => {
        if (indexesToSign && !indexesToSign.includes(i)) return null;
        return signedTxns.shift() ?? null;
      });
    },
  };

  // Build client
  const client = new x402Client();
  client.register("algorand:*", new ExactAvmScheme(signer));

  return wrapFetchWithPayment(fetch, client);
}

// Usage
const paidFetch = await setupPaymentFetch();
const response = await paidFetch("https://api.example.com/paid-api");
```

---

## Implementing ClientAvmSigner for Node.js

In Node.js or server environments, use `toClientAvmSigner` from `@x402/avm`.

### Environment Variables

```bash
# Base64-encoded 64-byte key (32-byte seed + 32-byte public key)
AVM_PRIVATE_KEY=base64EncodedPrivateKeyHere
```

### Basic Implementation

```typescript
import { toClientAvmSigner } from "@x402/avm";

// Usage
const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);
console.log("Signer address:", signer.address);
```

### Full Node.js Script

```typescript
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

async function main() {
  // Create signer from private key
  const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);

  // Configure x402 client
  const client = new x402Client();
  client.register(
    // A custom algodUrl is used for every request the scheme builds (no per-network
    // auto-detection), so register it for the matching network only
    ALGORAND_TESTNET_CAIP2,
    new ExactAvmScheme(signer, {
      // Optional: custom Algod endpoint (without it, AlgoNode TestNet/MainNet is picked per network)
      algodUrl: process.env.ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud",
    }),
  );

  // Wrap fetch
  const fetchWithPay = wrapFetchWithPayment(fetch, client);

  // Make paid API calls
  try {
    const response = await fetchWithPay("https://api.example.com/premium/weather", {
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Weather data:", data);

      // Check payment response header
      const paymentResponse = response.headers.get("PAYMENT-RESPONSE");
      if (paymentResponse) {
        console.log("Payment receipt:", paymentResponse);
      }
    } else {
      console.error("Request failed:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
```

### With Custom Algod URL

```typescript
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const client = new x402Client();
client.register(
  ALGORAND_TESTNET_CAIP2,
  new ExactAvmScheme(signer, {
    algodUrl: process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
    algodToken: process.env.ALGOD_TOKEN || "",
  }),
);

const fetchWithPay = wrapFetchWithPayment(fetch, client);
```

`ExactAvmScheme`'s second argument is a `ClientAvmConfig`: `{ algorandClient?, algodUrl?, algodToken? }`. A pre-configured `AlgorandClient` (from `@algorandfoundation/algokit-utils`) takes precedence over `algodUrl`/`algodToken`.

---

## Payment Policies

Policies filter and transform payment requirements before a selection is made. They are applied in order.

> **Spend controls run before policies.** By default an `x402Client` accepts only assets its schemes recognize as default assets (on Algorand: USDC, ASA `31566704` on MainNet and `10458941` on TestNet) and caps each payment at `$1`. A policy cannot raise that cap; change it with `client.setSpendControls({ maxAmountPerPayment: "$5" })` (or `spendControls` in `x402ClientConfig`), opt other assets in with `allowedAssets`, or pass `false` to disable spend controls.

### Prefer Algorand Network

```typescript
import { wrapFetchWithPayment, x402Client, type PaymentPolicy } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";

// Policy: prefer Algorand networks over EVM/SVM
const preferAlgorand: PaymentPolicy = (version, reqs) => {
  const algorandReqs = reqs.filter((r) => r.network.startsWith("algorand:"));
  // If Algorand options exist, use only those; otherwise fall back to all options
  return algorandReqs.length > 0 ? algorandReqs : reqs;
};

const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));
client.registerPolicy(preferAlgorand);

const fetchWithPay = wrapFetchWithPayment(fetch, client);
```

### Maximum Amount Limit

```typescript
// Policy: reject payments over 1 USDC (1,000,000 microunits)
const maxAmount: PaymentPolicy = (version, reqs) => {
  return reqs.filter((r) => {
    const amount = BigInt(r.amount ?? "0"); // V2: atomic units of the asset
    return amount <= BigInt("1000000"); // 1 USDC
  });
};

client.registerPolicy(maxAmount);
```

### Prefer Testnet

```typescript
import { isTestnetNetwork } from "@x402/avm";

// isTestnetNetwork() accepts the canonical id (ALGORAND_TESTNET_CAIP2) and the legacy full-hash form
const preferTestnet: PaymentPolicy = (version, reqs) => {
  const testnetReqs = reqs.filter((r) => isTestnetNetwork(r.network));
  return testnetReqs.length > 0 ? testnetReqs : reqs;
};

client.registerPolicy(preferTestnet);
```

### Combine Multiple Policies

```typescript
const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));

// Policies are applied in order
client
  .registerPolicy(preferAlgorand)   // First: prefer Algorand
  .registerPolicy(preferTestnet)    // Then: prefer testnet
  .registerPolicy(maxAmount);       // Finally: enforce max amount
```

### Using Config-Based Policies

```typescript
const config: x402ClientConfig = {
  schemes: [
    { network: "algorand:*", client: new ExactAvmScheme(signer) },
  ],
  policies: [preferAlgorand, maxAmount],
};

const fetchWithPay = wrapFetchWithPaymentFromConfig(fetch, config);
```

---

## Error Handling

### Common Error Scenarios

```typescript
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";

const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));
const fetchWithPay = wrapFetchWithPayment(fetch, client);

try {
  const response = await fetchWithPay("https://api.example.com/paid-endpoint");

  if (response.ok) {
    const data = await response.json();
    console.log("Success:", data);
  } else if (response.status === 402) {
    // The paid retry was refused (verification or settlement failed). The wrapper returns
    // this response instead of throwing; the PAYMENT-REQUIRED header's `error` has the reason.
    console.error("Payment was rejected by the server");
  } else {
    // Other HTTP error from the server
    console.error(`Server error: ${response.status} ${response.statusText}`);
  }
} catch (error) {
  if (error instanceof Error) {
    // Errors raised while building the payment are wrapped as
    // "Failed to create payment payload: <reason>", so test the specific reasons first.
    if (error.message.includes("Failed to parse payment requirements")) {
      // Server returned 402 but with invalid payment requirements
      console.error("Invalid payment requirements from server");
    } else if (error.message.includes("No network/scheme registered")) {
      // Server requires a network/scheme we don't support
      console.error("Unsupported payment network requested");
    } else if (error.message.includes("rejected by spendControls")) {
      // Asset not allowed, or amount above the spend cap ($1 by default)
      console.error("Payment blocked by spend controls:", error.message);
    } else if (error.message.includes("Payment creation aborted")) {
      // A beforePaymentCreation hook aborted the payment
      console.error("Payment was blocked by a hook:", error.message);
    } else if (error.message.includes("Failed to create payment payload")) {
      // Could not create the transaction (insufficient balance, Algod error, etc.)
      console.error("Could not create payment:", error.message);
    } else if (error.message.includes("Payment already attempted")) {
      // The request you passed in already carried a PAYMENT-SIGNATURE (or X-PAYMENT) header
      console.error("Request already contained a payment header");
    } else {
      console.error("Unexpected error:", error.message);
    }
  }
}
```

### Using Hooks for Monitoring

```typescript
const client = new x402Client();
client.register("algorand:*", new ExactAvmScheme(signer));

// Log before each payment
client.onBeforePaymentCreation(async (context) => {
  const { selectedRequirements } = context;
  console.log(
    `About to pay ${selectedRequirements.amount} on ${selectedRequirements.network}`,
  );

  // Optionally abort the payment
  const amountUSDC = Number(selectedRequirements.amount) / 1_000_000;
  if (amountUSDC > 10) {
    return { abort: true, reason: "Amount exceeds $10 USDC limit" };
  }
});

// Log after successful payment
client.onAfterPaymentCreation(async (context) => {
  console.log("Payment created successfully for:", context.paymentRequired.resource?.url);
});

// Handle payment failures
client.onPaymentCreationFailure(async (context) => {
  console.error("Payment failed:", context.error.message);
  // Optionally recover with fallback payload
  // return { recovered: true, payload: fallbackPayload };
});

const fetchWithPay = wrapFetchWithPayment(fetch, client);
```

### Reading Payment Response Headers

```typescript
import { decodePaymentResponseHeader } from "@x402/fetch";

const response = await fetchWithPay("https://api.example.com/paid-endpoint");

// After settlement the server adds a PAYMENT-RESPONSE header (base64-encoded settlement response)
const paymentResponseHeader = response.headers.get("PAYMENT-RESPONSE");

if (paymentResponseHeader) {
  const receipt = decodePaymentResponseHeader(paymentResponseHeader);
  // { success, transaction, network, payer?, errorReason?, ... }
  console.log("Transaction settled:", receipt.transaction, "on", receipt.network);
}
```

`new x402HTTPClient(client).getPaymentSettleResponse((name) => response.headers.get(name))` does the same lookup (it also falls back to the V1 `X-PAYMENT-RESPONSE` header) and throws if no payment response header is present.

---

## Complete Examples

### Complete Browser Example (React + Pera Wallet)

```tsx
// app.tsx
import React, { useState, useMemo, useCallback } from "react";
import { WalletProvider, useWallet } from "@txnlab/use-wallet-react";
import { WalletId, WalletManager, NetworkId } from "@txnlab/use-wallet";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import type { ClientAvmSigner } from "@x402/avm";

const WALLET_MANAGER = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY, WalletId.LUTE],
  defaultNetwork: NetworkId.TESTNET,
});

function PaidApiDemo() {
  const { activeAccount, signTransactions, wallets } = useWallet();
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const signer: ClientAvmSigner | null = useMemo(() => {
    if (!activeAccount) return null;
    return {
      address: activeAccount.address,
      signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
        return signTransactions(txns, indexesToSign);
      },
    };
  }, [activeAccount, signTransactions]);

  const fetchWithPay = useMemo(() => {
    if (!signer) return null;
    const client = new x402Client();
    client.register("algorand:*", new ExactAvmScheme(signer));
    return wrapFetchWithPayment(fetch, client);
  }, [signer]);

  const handleConnect = useCallback(async () => {
    const pera = wallets.find((w) => w.id === WalletId.PERA);
    if (pera) await pera.connect();
  }, [wallets]);

  const handleFetch = useCallback(async () => {
    if (!fetchWithPay) return;
    setLoading(true);
    try {
      const response = await fetchWithPay("https://api.example.com/premium-content");
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [fetchWithPay]);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>x402-avm Fetch Demo</h1>

      {!activeAccount ? (
        <button onClick={handleConnect}>Connect Pera Wallet</button>
      ) : (
        <div>
          <p>Connected: {activeAccount.address.slice(0, 8)}...</p>
          <button onClick={handleFetch} disabled={loading}>
            {loading ? "Paying & Fetching..." : "Fetch Premium Content ($0.01 USDC)"}
          </button>
        </div>
      )}

      {result && (
        <pre style={{ background: "#f5f5f5", padding: "10px", marginTop: "10px" }}>
          {result}
        </pre>
      )}
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider manager={WALLET_MANAGER}>
      <PaidApiDemo />
    </WalletProvider>
  );
}
```

### Complete Node.js Example (CLI Tool)

```typescript
// cli-paid-api.ts
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

async function main() {
  // Validate environment
  const privateKey = process.env.AVM_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: AVM_PRIVATE_KEY environment variable is required");
    console.error("Format: Base64-encoded 64-byte key (32-byte seed + 32-byte pubkey)");
    process.exit(1);
  }

  // Create signer
  const signer = toClientAvmSigner(privateKey);
  console.log(`Using address: ${signer.address}`);

  // Configure client (TestNet only, because a TestNet Algod URL is pinned)
  const client = new x402Client();
  client.register(
    ALGORAND_TESTNET_CAIP2,
    new ExactAvmScheme(signer, {
      algodUrl: process.env.ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud",
    }),
  );

  // Safety limit: max $5 USDC per request (spend controls default to $1)
  client.setSpendControls({ maxAmountPerPayment: "$5" });

  // Logging hooks
  client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
    const amountUSDC = Number(selectedRequirements.amount) / 1_000_000;
    console.log(`[x402] Paying $${amountUSDC.toFixed(6)} USDC on ${selectedRequirements.network}`);
  });

  client.onAfterPaymentCreation(async () => {
    console.log("[x402] Payment transaction signed successfully");
  });

  // Create wrapped fetch
  const fetchWithPay = wrapFetchWithPayment(fetch, client);

  // Make the API call
  const url = process.argv[2] || "https://api.example.com/paid-endpoint";
  console.log(`\nFetching: ${url}`);

  try {
    const response = await fetchWithPay(url);
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (response.status === 402) {
      console.error("Payment was rejected by the server (see the PAYMENT-REQUIRED header)");
    }

    // Print response headers of interest
    const paymentResponse = response.headers.get("PAYMENT-RESPONSE");
    if (paymentResponse) {
      console.log(`Payment Response: ${paymentResponse}`);
    }

    // Print body
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      console.log("\nResponse:", JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log("\nResponse:", text);
    }
  } catch (error) {
    console.error("\nFailed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
```

Run with:

```bash
AVM_PRIVATE_KEY="your-base64-key" npx tsx cli-paid-api.ts https://api.example.com/paid-endpoint
```

---

## API Reference Summary

### Exports from `@x402/fetch`

| Export | Type | Description |
|--------|------|-------------|
| `wrapFetchWithPayment` | Function | Wraps fetch with automatic 402 payment handling |
| `wrapFetchWithPaymentFromConfig` | Function | Config-based variant of the above |
| `x402Client` | Class | Core client for managing payment schemes |
| `x402HTTPClient` | Class | HTTP-level payment client |
| `decodePaymentResponseHeader` | Function | Decodes the PAYMENT-RESPONSE header |
| `PaymentPolicy` | Type | Policy function type for filtering requirements |
| `SelectPaymentRequirements` | Type | Selector function type (`new x402Client(selector)`) |
| `SchemeRegistration` | Type | Scheme registration configuration |
| `x402ClientConfig` | Type | Configuration object type (`schemes`, `policies?`, `spendControls?`, `paymentRequirementsSelector?`) |
| `HTTPResourceResponse` | Type | Result of `x402HTTPClient.processResponse()` |
| `PaymentRequired` | Type | 402 response structure |
| `PaymentRequirements` | Type | Individual payment requirement |
| `PaymentPayload` | Type | Signed payment payload |
| `Network` | Type | Network identifier string type |
| `SchemeNetworkClient` | Type | Client-side scheme interface |

### Exports from `@x402/avm`

| Export | Type | Description |
|--------|------|-------------|
| `ExactAvmScheme` | Class | Algorand exact payment scheme (client; same class as `@x402/avm/exact/client`) |
| `toClientAvmSigner` | Function | Creates a `ClientAvmSigner` from a Base64-encoded 64-byte private key |
| `ClientAvmSigner` | Interface | Signer interface for client wallets |
| `ClientAvmConfig` | Interface | Algod client configuration (`algorandClient?`, `algodUrl?`, `algodToken?`) |
| `ALGORAND_TESTNET_CAIP2` | Constant | `"algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"` |
| `ALGORAND_MAINNET_CAIP2` | Constant | `"algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k"` |
| `isTestnetNetwork` | Function | True for Algorand TestNet (canonical or legacy full-hash id) |
| `isAvmSignerWallet` | Function | Type guard for ClientAvmSigner |

### Exports from `@x402/avm/exact/client`

| Export | Type | Description |
|--------|------|-------------|
| `ExactAvmScheme` | Class | Client scheme: `new ExactAvmScheme(signer, config?: ClientAvmConfig)`, registered with `client.register(network, scheme)` |
