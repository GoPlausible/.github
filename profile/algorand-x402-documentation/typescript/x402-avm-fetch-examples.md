# x402-avm V2: Fetch Client Examples

Comprehensive guide for using `@x402-avm/fetch` to make automatic payments over HTTP using the native `fetch` API with Algorand (AVM) support.

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
9. [Python Equivalent with httpx](#python-equivalent-with-httpx)
10. [Complete Examples](#complete-examples)

---

## Installation

### TypeScript / JavaScript

```bash
npm install @x402-avm/fetch @x402-avm/avm algosdk
```

Or with other package managers:

```bash
pnpm add @x402-avm/fetch @x402-avm/avm algosdk
yarn add @x402-avm/fetch @x402-avm/avm algosdk
```

### Python

```bash
pip install "x402-avm[httpx,avm]"
```

Or with uv:

```bash
uv add "x402-avm[httpx,avm]"
```

---

## Quick Start

The simplest way to get started with x402-avm fetch is a 10-line setup:

```typescript
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import algosdk from "algosdk";

// 1. Create a signer (see detailed examples below)
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

// 2. Create and configure the client
const client = new x402Client();
registerExactAvmScheme(client, { signer });

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
   - Parses payment requirements from the response (headers for V2, body for V1).
   - Selects a suitable payment method based on registered schemes.
   - Creates a payment payload by signing a transaction group.
   - Retries the request with the `PAYMENT-SIGNATURE` header.
3. If the response is anything other than 402, it is returned as-is.

### Signature

```typescript
function wrapFetchWithPayment(
  fetch: typeof globalThis.fetch,
  client: x402Client | x402HTTPClient,
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
```

### Example

```typescript
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

// Assume `signer` is a ClientAvmSigner (see implementation sections below)
const client = new x402Client();
registerExactAvmScheme(client, { signer });

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
} from "@x402-avm/fetch";
import { ExactAvmScheme } from "@x402-avm/avm";

// Assume `signer` is a ClientAvmSigner
const config: x402ClientConfig = {
  schemes: [
    {
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
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
import type { ClientAvmSigner } from "@x402-avm/avm";

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
import { WalletId } from "@txnlab/use-wallet";
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";

// Configure wallet providers
const walletProviders = [
  { id: WalletId.PERA },
  { id: WalletId.DEFLY },
  { id: WalletId.LUTE },
];

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
    registerExactAvmScheme(client, { signer });
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
          Load Premium Content (pay with ALGO/USDC)
        </button>
      )}
    </div>
  );
}

// App wrapper with wallet provider
export default function App() {
  return (
    <WalletProvider wallets={walletProviders}>
      <PaidContentViewer />
    </WalletProvider>
  );
}
```

### With Pera Wallet (Vanilla JS)

```typescript
import { PeraWalletConnect } from "@perawallet/connect";
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";

const peraWallet = new PeraWalletConnect();

async function setupPaymentFetch(): Promise<typeof fetch> {
  // Connect wallet
  const accounts = await peraWallet.connect();
  const address = accounts[0];

  // Create signer using Pera
  const signer: ClientAvmSigner = {
    address,
    signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
      // Pera expects transactions in a specific format
      const txnGroup = txns.map((txn, i) => ({
        txn,
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
  registerExactAvmScheme(client, { signer });

  return wrapFetchWithPayment(fetch, client);
}

// Usage
const paidFetch = await setupPaymentFetch();
const response = await paidFetch("https://api.example.com/paid-api");
```

---

## Implementing ClientAvmSigner for Node.js

In Node.js or server environments, use algosdk directly with a private key.

### Environment Variables

```bash
# Base64-encoded 64-byte key (32-byte seed + 32-byte public key)
AVM_PRIVATE_KEY=base64EncodedPrivateKeyHere
```

### Basic Implementation

```typescript
import algosdk from "algosdk";
import type { ClientAvmSigner } from "@x402-avm/avm";

function createNodeSigner(privateKeyBase64: string): ClientAvmSigner {
  const secretKey = Buffer.from(privateKeyBase64, "base64");
  const address = algosdk.encodeAddress(secretKey.slice(32));

  return {
    address,
    signTransactions: async (
      txns: Uint8Array[],
      indexesToSign?: number[],
    ): Promise<(Uint8Array | null)[]> => {
      return txns.map((txnBytes, i) => {
        // Skip transactions we should not sign
        if (indexesToSign && !indexesToSign.includes(i)) {
          return null;
        }

        // Decode, sign, return blob
        const decoded = algosdk.decodeUnsignedTransaction(txnBytes);
        const signed = algosdk.signTransaction(decoded, secretKey);
        return signed.blob;
      });
    },
  };
}

// Usage
const signer = createNodeSigner(process.env.AVM_PRIVATE_KEY!);
console.log("Signer address:", signer.address);
```

### Full Node.js Script

```typescript
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import algosdk from "algosdk";

async function main() {
  // Create signer from private key
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

  // Configure x402 client
  const client = new x402Client();
  registerExactAvmScheme(client, {
    signer,
    algodConfig: {
      // Optional: custom Algod endpoint (defaults to AlgoNode)
      algodUrl: process.env.ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud",
    },
  });

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

### With Custom Algod Client

```typescript
import algosdk from "algosdk";
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

// Create a custom Algod client (e.g., for a private node)
const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN || "",
  process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  process.env.ALGOD_PORT || "",
);

const client = new x402Client();
registerExactAvmScheme(client, {
  signer,
  algodConfig: {
    algodClient, // Pass pre-configured client directly
  },
});

const fetchWithPay = wrapFetchWithPayment(fetch, client);
```

---

## Payment Policies

Policies filter and transform payment requirements before a selection is made. They are applied in order.

### Prefer Algorand Network

```typescript
import { wrapFetchWithPayment, x402Client, type PaymentPolicy } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

// Policy: prefer Algorand networks over EVM/SVM
const preferAlgorand: PaymentPolicy = (version, reqs) => {
  const algorandReqs = reqs.filter((r) => r.network.startsWith("algorand:"));
  // If Algorand options exist, use only those; otherwise fall back to all options
  return algorandReqs.length > 0 ? algorandReqs : reqs;
};

const client = new x402Client();
registerExactAvmScheme(client, { signer });
client.registerPolicy(preferAlgorand);

const fetchWithPay = wrapFetchWithPayment(fetch, client);
```

### Maximum Amount Limit

```typescript
// Policy: reject payments over 1 USDC (1,000,000 microunits)
const maxAmount: PaymentPolicy = (version, reqs) => {
  return reqs.filter((r) => {
    const amount = BigInt(r.amount ?? r.maxAmountRequired ?? "0");
    return amount <= BigInt("1000000"); // 1 USDC
  });
};

client.registerPolicy(maxAmount);
```

### Prefer Testnet

```typescript
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const preferTestnet: PaymentPolicy = (version, reqs) => {
  const testnetReqs = reqs.filter((r) => r.network === ALGORAND_TESTNET_CAIP2);
  return testnetReqs.length > 0 ? testnetReqs : reqs;
};

client.registerPolicy(preferTestnet);
```

### Combine Multiple Policies

```typescript
const client = new x402Client();
registerExactAvmScheme(client, { signer });

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
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

const client = new x402Client();
registerExactAvmScheme(client, { signer });
const fetchWithPay = wrapFetchWithPayment(fetch, client);

try {
  const response = await fetchWithPay("https://api.example.com/paid-endpoint");

  if (response.ok) {
    const data = await response.json();
    console.log("Success:", data);
  } else {
    // Non-402 error from server (after payment succeeded or was not required)
    console.error(`Server error: ${response.status} ${response.statusText}`);
  }
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("Failed to parse payment requirements")) {
      // Server returned 402 but with invalid payment requirements
      console.error("Invalid payment requirements from server");
    } else if (error.message.includes("Failed to create payment payload")) {
      // Could not create the transaction (insufficient balance, wrong network, etc.)
      console.error("Could not create payment:", error.message);
    } else if (error.message.includes("Payment already attempted")) {
      // Server returned 402 even after payment was sent
      console.error("Payment was rejected by the server");
    } else if (error.message.includes("No network/scheme registered")) {
      // Server requires a network/scheme we don't support
      console.error("Unsupported payment network requested");
    } else if (error.message.includes("Payment creation aborted")) {
      // A beforePaymentCreation hook aborted the payment
      console.error("Payment was blocked by policy");
    } else {
      console.error("Unexpected error:", error.message);
    }
  }
}
```

### Using Hooks for Monitoring

```typescript
const client = new x402Client();
registerExactAvmScheme(client, { signer });

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
const response = await fetchWithPay("https://api.example.com/paid-endpoint");

// The server includes a payment response header after settlement
import { decodePaymentResponseHeader } from "@x402-avm/fetch";

const paymentResponseHeader =
  response.headers.get("PAYMENT-RESPONSE") ||
  response.headers.get("X-PAYMENT-RESPONSE");

if (paymentResponseHeader) {
  const receipt = decodePaymentResponseHeader(paymentResponseHeader);
  console.log("Transaction settled:", receipt);
}
```

---

## Python Equivalent with httpx

The Python `x402-avm` package provides equivalent functionality using `httpx` for async HTTP and `requests` for sync HTTP.

### Installation

```bash
pip install "x402-avm[httpx,avm]"
```

### Async with httpx (x402AsyncTransport)

```python
import httpx
from x402.client import x402Client
from x402.http.clients import x402AsyncTransport
from x402.mechanisms.avm.exact.register import register_exact_avm_client

# Create signer (algosdk-based, implementation provided by integrator)
import algosdk
import base64

secret_key = base64.b64decode(os.environ["AVM_PRIVATE_KEY"])
address = algosdk.encoding.encode_address(secret_key[32:])


class MyAvmSigner:
    """Simple ClientAvmSigner implementation using algosdk."""

    @property
    def address(self) -> str:
        return address

    def sign_transactions(
        self,
        unsigned_txns: list[bytes],
        indexes_to_sign: list[int],
    ) -> list[bytes | None]:
        result = []
        for i, txn_bytes in enumerate(unsigned_txns):
            if i not in indexes_to_sign:
                result.append(None)
                continue
            txn = algosdk.encoding.msgpack_decode(
                base64.b64encode(txn_bytes).decode()
            )
            signed = txn.sign(
                base64.b64encode(secret_key).decode()
            )
            result.append(
                base64.b64decode(algosdk.encoding.msgpack_encode(signed))
            )
        return result


signer = MyAvmSigner()

# Configure client
client = x402Client()
register_exact_avm_client(client, signer)

# Create httpx client with payment transport
async with httpx.AsyncClient(transport=x402AsyncTransport(client)) as http:
    response = await http.get("https://api.example.com/paid-endpoint")
    print(response.json())
```

### Wrapper Function Style

```python
from x402.client import x402Client
from x402.http.clients import wrapHttpxWithPayment
from x402.mechanisms.avm.exact.register import register_exact_avm_client

client = x402Client()
register_exact_avm_client(client, signer)

# wrapHttpxWithPayment creates a new httpx.AsyncClient with payment transport
async with wrapHttpxWithPayment(client) as http:
    response = await http.get("https://api.example.com/paid-endpoint")
    print(response.status_code, response.json())
```

### Convenience Class Style

```python
from x402.client import x402Client
from x402.http.clients import x402HttpxClient
from x402.mechanisms.avm.exact.register import register_exact_avm_client

client = x402Client()
register_exact_avm_client(client, signer)

async with x402HttpxClient(client) as http:
    response = await http.get("https://api.example.com/paid-endpoint")
    print(response.json())
```

### Sync with requests (x402HTTPAdapter)

```python
import requests
from x402.client import x402ClientSync
from x402.http.clients import x402HTTPAdapter, wrapRequestsWithPayment
from x402.mechanisms.avm.exact.register import register_exact_avm_client

# Note: requests requires x402ClientSync (synchronous variant)
client_sync = x402ClientSync()
register_exact_avm_client(client_sync, signer)

# Option 1: Manual adapter mounting
session = requests.Session()
adapter = x402HTTPAdapter(client_sync)
session.mount("https://", adapter)
session.mount("http://", adapter)

response = session.get("https://api.example.com/paid-endpoint")
print(response.json())

# Option 2: Wrapper function
session = wrapRequestsWithPayment(requests.Session(), client_sync)
response = session.get("https://api.example.com/paid-endpoint")
```

---

## Complete Examples

### Complete Browser Example (React + Pera Wallet)

```tsx
// app.tsx
import React, { useState, useMemo, useCallback } from "react";
import { WalletProvider, useWallet } from "@txnlab/use-wallet-react";
import { WalletId } from "@txnlab/use-wallet";
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";

const WALLET_PROVIDERS = [
  { id: WalletId.PERA },
  { id: WalletId.DEFLY },
  { id: WalletId.LUTE },
];

function PaidApiDemo() {
  const { activeAccount, signTransactions, providers } = useWallet();
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
    registerExactAvmScheme(client, { signer });
    return wrapFetchWithPayment(fetch, client);
  }, [signer]);

  const handleConnect = useCallback(async () => {
    const pera = providers?.find((p) => p.metadata.id === WalletId.PERA);
    if (pera) await pera.connect();
  }, [providers]);

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
    <WalletProvider wallets={WALLET_PROVIDERS}>
      <PaidApiDemo />
    </WalletProvider>
  );
}
```

### Complete Node.js Example (CLI Tool)

```typescript
// cli-paid-api.ts
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";
import algosdk from "algosdk";

async function main() {
  // Validate environment
  const privateKey = process.env.AVM_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: AVM_PRIVATE_KEY environment variable is required");
    console.error("Format: Base64-encoded 64-byte key (32-byte seed + 32-byte pubkey)");
    process.exit(1);
  }

  // Create signer
  const secretKey = Buffer.from(privateKey, "base64");
  const address = algosdk.encodeAddress(secretKey.slice(32));
  console.log(`Using address: ${address}`);

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

  // Configure client with policies
  const client = new x402Client();
  registerExactAvmScheme(client, {
    signer,
    algodConfig: {
      algodUrl: process.env.ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud",
    },
  });

  // Safety policy: max $5 USDC per request
  client.registerPolicy((version, reqs) => {
    return reqs.filter((r) => BigInt(r.amount ?? "0") <= BigInt("5000000"));
  });

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

### Complete Python Example (Async Script)

```python
#!/usr/bin/env python3
"""x402-avm async client example using httpx."""

import asyncio
import base64
import os

import algosdk
import httpx

from x402.client import x402Client
from x402.http.clients import x402AsyncTransport
from x402.mechanisms.avm.exact.register import register_exact_avm_client


class AlgorandSigner:
    """ClientAvmSigner implementation using algosdk."""

    def __init__(self, private_key_b64: str):
        self._secret_key = base64.b64decode(private_key_b64)
        self._address = algosdk.encoding.encode_address(self._secret_key[32:])
        # algosdk expects base64 private key for signing
        self._signing_key = private_key_b64

    @property
    def address(self) -> str:
        return self._address

    def sign_transactions(
        self,
        unsigned_txns: list[bytes],
        indexes_to_sign: list[int],
    ) -> list[bytes | None]:
        result: list[bytes | None] = []
        for i, txn_bytes in enumerate(unsigned_txns):
            if i not in indexes_to_sign:
                result.append(None)
                continue

            # Decode unsigned transaction from raw msgpack bytes
            txn = algosdk.encoding.msgpack_decode(
                base64.b64encode(txn_bytes).decode()
            )
            # Sign the transaction
            signed = txn.sign(self._signing_key)
            # Encode back to raw msgpack bytes
            signed_bytes = base64.b64decode(
                algosdk.encoding.msgpack_encode(signed)
            )
            result.append(signed_bytes)

        return result


async def main():
    # Load private key from environment
    private_key = os.environ.get("AVM_PRIVATE_KEY")
    if not private_key:
        print("Error: AVM_PRIVATE_KEY environment variable required")
        return

    # Create signer
    signer = AlgorandSigner(private_key)
    print(f"Using address: {signer.address}")

    # Configure x402 client
    client = x402Client()
    register_exact_avm_client(client, signer)

    # Make paid API requests
    async with httpx.AsyncClient(transport=x402AsyncTransport(client)) as http:
        url = "https://api.example.com/paid-endpoint"
        print(f"\nFetching: {url}")

        response = await http.get(url)
        print(f"Status: {response.status_code}")

        # Check for payment response header
        payment_response = response.headers.get("payment-response")
        if payment_response:
            print(f"Payment receipt: {payment_response}")

        print(f"Body: {response.json()}")


if __name__ == "__main__":
    asyncio.run(main())
```

---

## API Reference Summary

### Exports from `@x402-avm/fetch`

| Export | Type | Description |
|--------|------|-------------|
| `wrapFetchWithPayment` | Function | Wraps fetch with automatic 402 payment handling |
| `wrapFetchWithPaymentFromConfig` | Function | Config-based variant of the above |
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

### Exports from `@x402-avm/avm`

| Export | Type | Description |
|--------|------|-------------|
| `ExactAvmScheme` | Class | Algorand exact payment scheme (client) |
| `ClientAvmSigner` | Interface | Signer interface for client wallets |
| `ClientAvmConfig` | Interface | Algod client configuration |
| `ALGORAND_TESTNET_CAIP2` | Constant | `"algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="` |
| `ALGORAND_MAINNET_CAIP2` | Constant | `"algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="` |
| `isAvmSignerWallet` | Function | Type guard for ClientAvmSigner |

### Exports from `@x402-avm/avm/exact/client`

| Export | Type | Description |
|--------|------|-------------|
| `registerExactAvmScheme` | Function | Registers AVM schemes (V1 + V2) to an x402Client |
| `AvmClientConfig` | Interface | Configuration for AVM client registration |
