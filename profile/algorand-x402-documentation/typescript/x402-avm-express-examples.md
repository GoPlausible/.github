# x402-avm V2: Express Middleware Examples

Comprehensive examples for integrating x402-avm payment-gated routes with Express.js, including Algorand (AVM) blockchain payments.

## Table of Contents

- [Installation](#installation)
- [Quick Start with paymentMiddlewareFromConfig](#quick-start-with-paymentmiddlewarefromconfig)
- [Using paymentMiddleware with x402ResourceServer](#using-paymentmiddleware-with-x402resourceserver)
- [Using paymentMiddlewareFromHTTPServer](#using-paymentmiddlewarefromhttpserver)
- [Route Configuration](#route-configuration)
- [Algorand Payment Routes](#algorand-payment-routes)
- [Dynamic Pricing](#dynamic-pricing)
- [Multiple Routes with Different Prices](#multiple-routes-with-different-prices)
- [AVM Facilitator Server](#avm-facilitator-server)
- [Fee Abstraction Setup](#fee-abstraction-setup)
- [Paywall Integration](#paywall-integration)
- [Python FastAPI Equivalent](#python-fastapi-equivalent)
- [Complete End-to-End Example](#complete-end-to-end-example)
- [Environment Variables](#environment-variables)

---

## Installation

```bash
npm install @x402-avm/express @x402-avm/avm @x402-avm/core
```

For paywall UI support:

```bash
npm install @x402-avm/express @x402-avm/avm @x402-avm/core @x402-avm/paywall
```

---

## Quick Start with paymentMiddlewareFromConfig

The simplest way to get started. `paymentMiddlewareFromConfig` creates and configures
the `x402ResourceServer` internally.

```typescript
import express from "express";
import { paymentMiddlewareFromConfig } from "@x402-avm/express";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { x402ResourceServer } from "@x402-avm/core/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = express();

// Route configuration with Algorand testnet payments
const routes = {
  "GET /api/weather": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: "$0.01",
    },
    description: "Current weather data",
  },
};

// Create facilitator client (uses https://x402.org/facilitator by default)
const facilitatorClient = new HTTPFacilitatorClient();

// Create and register AVM scheme for server-side verification
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);

// Apply middleware -- simplest variant
app.use(
  paymentMiddlewareFromConfig(
    routes,
    facilitatorClient,
    [{ network: "algorand:*", server: server }],
  ),
);

// Protected route
app.get("/api/weather", (req, res) => {
  res.json({
    temperature: 72,
    condition: "sunny",
    city: "San Francisco",
  });
});

// Public route (not in routes config, so no payment required)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(4021, () => {
  console.log("Resource server running on http://localhost:4021");
});
```

---

## Using paymentMiddleware with x402ResourceServer

Use this when you want more control over the `x402ResourceServer` instance, such as
registering multiple schemes or reusing the server across multiple middlewares.

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/express";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm";

const app = express();

// Create facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

// Create and configure the resource server
const server = new x402ResourceServer(facilitatorClient);

// Register AVM exact payment scheme (wildcard for all Algorand networks)
registerExactAvmScheme(server);

// Define routes
const routes = {
  "GET /api/premium/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: "$0.10",
    },
    description: "Premium API access",
  },
  "POST /api/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: "$0.50",
    },
    description: "AI content generation",
  },
};

// Apply middleware with the pre-configured server
app.use(paymentMiddleware(routes, server));

// Protected routes
app.get("/api/premium/data", (req, res) => {
  res.json({ data: "premium content" });
});

app.post("/api/generate", express.json(), (req, res) => {
  res.json({ generated: "AI-generated content based on your prompt" });
});

app.listen(4021, () => {
  console.log("Server running on http://localhost:4021");
});
```

---

## Using paymentMiddlewareFromHTTPServer

The most advanced variant. Use this when you need HTTP-level hooks such as
`onProtectedRequest` for custom access control logic (e.g., API key bypass,
rate limiting, or request logging).

```typescript
import express from "express";
import {
  paymentMiddlewareFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
} from "@x402-avm/express";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm";

const app = express();

// Create resource server with AVM support
const facilitatorClient = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(resourceServer);

// Define routes
const routes = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: "$0.05",
    },
    description: "Protected data endpoint",
  },
};

// Create HTTP server with hooks
const httpServer = new x402HTTPResourceServer(resourceServer, routes);

// Hook: grant free access for requests with valid API key
httpServer.onProtectedRequest(async (context, routeConfig) => {
  const apiKey = context.adapter.getHeader("x-api-key");

  if (apiKey && isValidApiKey(apiKey)) {
    console.log(`API key access granted for ${context.path}`);
    return { grantAccess: true };
  }

  // Continue to payment flow
  return undefined;
});

// Apply middleware with the HTTP server
app.use(paymentMiddlewareFromHTTPServer(httpServer));

app.get("/api/data", (req, res) => {
  res.json({ data: "protected content" });
});

function isValidApiKey(key: string): boolean {
  // Check against your API key store
  return key === process.env.API_KEY;
}

app.listen(4021, () => {
  console.log("Server running on http://localhost:4021");
});
```

---

## Route Configuration

Routes are defined using the `RoutesConfig` type, which maps HTTP method + path patterns
to `RouteConfig` objects.

### Route Pattern Syntax

```typescript
import { ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2 } from "@x402-avm/avm";

// Pattern: "METHOD /path" or just "/path" (matches all methods)
const routes = {
  // Exact match
  "GET /api/weather": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.01",
    },
    description: "Weather data",
  },

  // Wildcard match -- all sub-paths
  "GET /api/premium/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.10",
    },
    description: "Premium API endpoints",
  },

  // All HTTP methods for a path
  "/api/resource": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.05",
    },
    description: "Resource CRUD operations",
  },

  // POST-only
  "POST /api/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$1.00",
    },
    description: "Content generation",
  },
};
```

### RouteConfig Structure

```typescript
interface RouteConfig {
  // Payment option(s) -- single or array for multi-network support
  accepts: PaymentOption | PaymentOption[];

  // HTTP-specific metadata
  resource?: string;       // Resource identifier
  description?: string;    // Human-readable description
  mimeType?: string;       // Response MIME type
  customPaywallHtml?: string; // Custom HTML for paywall

  // Custom response for unpaid API requests
  unpaidResponseBody?: (context) => { contentType: string; body: any };

  // Extensions (e.g., bazaar)
  extensions?: Record<string, unknown>;
}

interface PaymentOption {
  scheme: string;          // "exact"
  payTo: string;           // Algorand address (58 chars)
  price: Price;            // "$0.01" or amount string
  network: string;         // CAIP-2 network identifier
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
}
```

### Single RouteConfig (for single-route apps)

When your app has only one protected endpoint, you can pass a single `RouteConfig`
instead of a map:

```typescript
const singleRoute: RouteConfig = {
  accepts: {
    scheme: "exact",
    network: ALGORAND_TESTNET_CAIP2,
    payTo: "YOUR_ALGORAND_ADDRESS",
    price: "$0.05",
  },
  description: "Single protected endpoint",
};

// This protects ALL routes with the same config
app.use(paymentMiddlewareFromConfig(singleRoute, facilitatorClient));
```

---

## Algorand Payment Routes

### ALGO Native Token Payments

```typescript
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const routes = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: "$0.01",  // Price in USD -- resolved to ALGO equivalent
    },
    description: "Data endpoint paid in ALGO",
  },
};
```

### USDC (ASA) Payments

```typescript
import {
  ALGORAND_TESTNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402-avm/avm";

const routes = {
  "GET /api/premium": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: "$0.50",
      extra: {
        asset: USDC_TESTNET_ASA_ID,  // "10458941"
      },
    },
    description: "Premium endpoint paid in USDC",
  },
};
```

### Multi-Network Support (Accept Both Testnet and Mainnet)

```typescript
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
} from "@x402-avm/avm";

const routes = {
  "GET /api/data": {
    accepts: [
      {
        scheme: "exact",
        network: ALGORAND_TESTNET_CAIP2,
        payTo: "YOUR_TESTNET_ADDRESS",
        price: "$0.01",
      },
      {
        scheme: "exact",
        network: ALGORAND_MAINNET_CAIP2,
        payTo: "YOUR_MAINNET_ADDRESS",
        price: "$0.01",
      },
    ],
    description: "Accepts payment on testnet or mainnet",
  },
};
```

### Cross-Chain: Accept Algorand AND EVM Payments

```typescript
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const routes = {
  "GET /api/data": {
    accepts: [
      {
        scheme: "exact",
        network: ALGORAND_TESTNET_CAIP2,
        payTo: "YOUR_ALGORAND_ADDRESS",
        price: "$0.01",
      },
      {
        scheme: "exact",
        network: "eip155:84532",  // Base Sepolia
        payTo: "0xYourEvmAddress",
        price: "$0.01",
      },
    ],
    description: "Cross-chain: pay with ALGO or ETH",
  },
};
```

---

## Dynamic Pricing

Use a `DynamicPrice` function to compute price at request time.

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/express";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = express();

const facilitatorClient = new HTTPFacilitatorClient();
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);

const routes = {
  "GET /api/ai/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      // Dynamic price based on query parameters
      price: (context) => {
        const model = context.adapter.getQueryParam("model") || "basic";
        switch (model) {
          case "gpt4":
            return "$0.50";
          case "gpt3":
            return "$0.10";
          default:
            return "$0.01";
        }
      },
    },
    description: "AI generation with model-based pricing",
  },
  "POST /api/image/resize": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      // Price based on request body (for POST)
      price: (context) => {
        const body = context.adapter.getBody();
        const width = body?.width || 256;
        if (width > 2048) return "$0.25";
        if (width > 1024) return "$0.10";
        return "$0.05";
      },
    },
    description: "Image resize with size-based pricing",
  },
};

app.use(paymentMiddleware(routes, server));

app.get("/api/ai/generate", (req, res) => {
  const model = req.query.model || "basic";
  res.json({ model, result: "Generated content..." });
});

app.post("/api/image/resize", express.json(), (req, res) => {
  res.json({ resized: true, width: req.body.width });
});

app.listen(4021);
```

---

## Multiple Routes with Different Prices

```typescript
import express from "express";
import { paymentMiddlewareFromConfig } from "@x402-avm/express";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

const app = express();

const PAY_TO = "YOUR_ALGORAND_ADDRESS";
const facilitatorClient = new HTTPFacilitatorClient();

const routes = {
  // Cheap: simple data lookup
  "GET /api/lookup/:id": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.001",
    },
    description: "Simple data lookup",
  },

  // Medium: aggregated data
  "GET /api/analytics/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.05",
    },
    description: "Analytics dashboard data",
  },

  // Expensive: AI generation
  "POST /api/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$1.00",
    },
    description: "AI content generation",
  },

  // USDC only: premium subscription check
  "GET /api/subscription/status": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$5.00",
      extra: {
        asset: USDC_TESTNET_ASA_ID,
      },
    },
    description: "Monthly subscription verification",
  },
};

app.use(paymentMiddlewareFromConfig(routes, facilitatorClient));

app.get("/api/lookup/:id", (req, res) => {
  res.json({ id: req.params.id, data: "lookup result" });
});

app.get("/api/analytics/*", (req, res) => {
  res.json({ analytics: "dashboard data" });
});

app.post("/api/generate", express.json(), (req, res) => {
  res.json({ generated: "content" });
});

app.get("/api/subscription/status", (req, res) => {
  res.json({ active: true, expiresAt: "2026-03-01" });
});

// Public routes (not in routes config)
app.get("/", (req, res) => {
  res.json({ message: "Welcome! See /api/* for paid endpoints." });
});

app.listen(4021, () => {
  console.log("Multi-route server on http://localhost:4021");
});
```

---

## AVM Facilitator Server

A facilitator server verifies and settles Algorand payments on behalf of resource servers.
This example shows how to build a facilitator using Express with the AVM scheme.

```typescript
import express from "express";
import { x402Facilitator } from "@x402-avm/core/facilitator";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/facilitator";
import type { FacilitatorAvmSigner } from "@x402-avm/avm";
import algosdk from "algosdk";

const app = express();
app.use(express.json());

// ----------------------------------------------------------------
// Signer implementation (implements FacilitatorAvmSigner interface)
// ----------------------------------------------------------------

const privateKeyBase64 = process.env.AVM_PRIVATE_KEY!;
const privateKeyBytes = Buffer.from(privateKeyBase64, "base64");
const address = algosdk.encodeAddress(privateKeyBytes.slice(32));

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN || "",
  process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  "",
);

const signer: FacilitatorAvmSigner = {
  address,

  async getAlgodClient(network: string) {
    return algodClient;
  },

  async signGroupTransactions(
    groupTxnBytes: Uint8Array[],
    myIndices: number[],
  ): Promise<Uint8Array[]> {
    const result = [...groupTxnBytes];
    for (const idx of myIndices) {
      const txn = algosdk.decodeUnsignedTransaction(groupTxnBytes[idx]);
      const signed = txn.signTxn(privateKeyBytes);
      result[idx] = signed;
    }
    return result;
  },

  async sendGroup(signedGroupBytes: Uint8Array[]): Promise<string> {
    const combined = new Uint8Array(
      signedGroupBytes.reduce((acc, b) => acc + b.length, 0),
    );
    let offset = 0;
    for (const bytes of signedGroupBytes) {
      combined.set(bytes, offset);
      offset += bytes.length;
    }
    const { txId } = await algodClient.sendRawTransaction(combined).do();
    return txId;
  },

  async simulateGroup(groupTxnBytes: Uint8Array[]): Promise<any> {
    const txns = groupTxnBytes.map((bytes) => {
      try {
        return algosdk.decodeSignedTransaction(bytes);
      } catch {
        const unsigned = algosdk.decodeUnsignedTransaction(bytes);
        return new algosdk.SignedTransaction(unsigned);
      }
    });
    const atc = new algosdk.AtomicTransactionComposer();
    // Use simulate with allow_empty_signatures
    const request = new algosdk.modelsv2.SimulateRequest({
      txnGroups: [
        new algosdk.modelsv2.SimulateRequestTransactionGroup({
          txns: txns.map((t) => algosdk.decodeObj(algosdk.encodeMsgpack(t))),
        }),
      ],
      allowEmptySignatures: true,
    });
    return algodClient.simulateTransactions(request).do();
  },
};

// ----------------------------------------------------------------
// Create and configure the facilitator
// ----------------------------------------------------------------

const facilitator = new x402Facilitator();

registerExactAvmScheme(facilitator, {
  signer,
  networks: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
});

// ----------------------------------------------------------------
// Facilitator HTTP endpoints
// ----------------------------------------------------------------

// Verify endpoint
app.post("/verify", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;
    const result = await facilitator.verify(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Settle endpoint
app.post("/settle", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;
    const result = await facilitator.settle(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Supported schemes endpoint
app.get("/supported", (req, res) => {
  res.json(facilitator.getSupported());
});

app.listen(4020, () => {
  console.log("Facilitator running on http://localhost:4020");
});
```

---

## Fee Abstraction Setup

Fee abstraction allows a facilitator to pay Algorand transaction fees on behalf of the
user. This is implemented as an atomic transaction group where the facilitator co-signs
a fee-covering transaction.

### Resource Server with Fee Abstraction

```typescript
import express from "express";
import { paymentMiddlewareFromConfig } from "@x402-avm/express";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = express();

const routes = {
  "GET /api/premium": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_RESOURCE_SERVER_ADDRESS",
      price: "$0.10",
      extra: {
        // Fee payer address -- the facilitator pays Algorand txn fees
        feePayer: "FACILITATOR_FEE_PAYER_ADDRESS",
      },
    },
    description: "Fee-abstracted premium endpoint",
  },
};

// Point to your custom facilitator that supports fee abstraction
const facilitatorClient = new HTTPFacilitatorClient({
  url: "http://localhost:4020",
});

app.use(paymentMiddlewareFromConfig(routes, facilitatorClient));

app.get("/api/premium", (req, res) => {
  res.json({ premium: true, data: "Fee-abstracted content" });
});

app.listen(4021, () => {
  console.log("Fee-abstracted server on http://localhost:4021");
});
```

When a client makes a payment, the x402 protocol creates a 2-transaction atomic group:
1. **Payment transaction** (signed by user): transfers ALGO/ASA to `payTo`
2. **Fee transaction** (signed by facilitator): covers network fees, `amount=0, fee=2000`

The facilitator co-signs transaction 2 during settlement.

---

## Paywall Integration

The `@x402-avm/paywall` package provides a browser-based payment UI that automatically
appears when a user visits a protected route in their browser.

### Basic Paywall

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/express";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm";

const app = express();

const facilitatorClient = new HTTPFacilitatorClient();
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);

const routes = {
  "GET /premium-article": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.25",
    },
    description: "Premium article access",
    mimeType: "text/html",
  },
};

// Paywall configuration
const paywallConfig = {
  title: "Premium Content",
  description: "Pay to access this article",
  logoUrl: "https://example.com/logo.png",
  // Customize colors (optional)
  theme: {
    primaryColor: "#6366f1",
    backgroundColor: "#ffffff",
  },
};

app.use(paymentMiddleware(routes, server, paywallConfig));

app.get("/premium-article", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Premium Article</h1>
        <p>This is the full article content after payment.</p>
      </body>
    </html>
  `);
});

app.listen(4021);
```

### Custom Paywall HTML

```typescript
const routes = {
  "GET /premium": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.10",
    },
    description: "Premium content",
    // Provide your own paywall HTML
    customPaywallHtml: `
      <html>
        <head><title>Payment Required</title></head>
        <body>
          <h1>Payment Required</h1>
          <p>Please pay $0.10 in ALGO to access this content.</p>
          <p>Use an x402-compatible wallet to make the payment.</p>
        </body>
      </html>
    `,
  },
};
```

### Custom Paywall Provider

```typescript
import { PaywallProvider } from "@x402-avm/core/server";

// Create a custom paywall provider
const customPaywall: PaywallProvider = {
  generatePaywall(paymentRequirements, routeConfig, paywallConfig) {
    return `
      <html>
        <body>
          <h1>${paywallConfig?.title || "Payment Required"}</h1>
          <p>Price: ${paymentRequirements.maxAmountRequired}</p>
          <p>Network: ${paymentRequirements.network}</p>
          <p>Pay to: ${paymentRequirements.payTo}</p>
          <script>
            // Your custom payment widget code
          </script>
        </body>
      </html>
    `;
  },
};

// Pass as the paywall parameter
app.use(paymentMiddleware(routes, server, paywallConfig, customPaywall));
```

### Unpaid Response Body (for API clients)

When an API client (non-browser) hits a protected route without payment, you can
return preview data instead of an empty 402:

```typescript
const routes = {
  "GET /api/article/:id": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.10",
    },
    description: "Full article",
    // Return preview for unpaid requests
    unpaidResponseBody: (context) => ({
      contentType: "application/json",
      body: {
        title: "Article Title",
        preview: "First paragraph of the article...",
        message: "Pay $0.10 to read the full article",
      },
    }),
  },
};
```

---

## Python FastAPI Equivalent

The Python SDK provides equivalent middleware for FastAPI and Flask.

### Installation

```bash
pip install "x402-avm[fastapi,avm]"
```

### FastAPI with payment_middleware

```python
from fastapi import FastAPI
from x402.server import x402ResourceServer
from x402.http import HTTPFacilitatorClient
from x402.http.middleware import fastapi_payment_middleware
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm.constants import ALGORAND_TESTNET_CAIP2

app = FastAPI()

# Create and configure server
facilitator_client = HTTPFacilitatorClient()
server = x402ResourceServer(facilitator_client)
register_exact_avm_server(server)

# Define routes
routes = {
    "GET /api/weather": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": "YOUR_ALGORAND_ADDRESS",
            "price": "$0.01",
        },
        "description": "Weather data",
    },
    "GET /api/premium/*": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": "YOUR_ALGORAND_ADDRESS",
            "price": "$0.10",
        },
        "description": "Premium content",
    },
}

# Create middleware
_middleware = fastapi_payment_middleware(routes, server)


# Apply middleware
@app.middleware("http")
async def x402_middleware(request, call_next):
    return await _middleware(request, call_next)


# Protected routes
@app.get("/api/weather")
async def get_weather():
    return {"temperature": 72, "condition": "sunny"}


@app.get("/api/premium/data")
async def get_premium():
    return {"data": "premium content"}


# Public route
@app.get("/api/health")
async def health():
    return {"status": "ok"}
```

### FastAPI with payment_middleware_from_config

```python
from fastapi import FastAPI
from x402.http.middleware import fastapi_payment_middleware_from_config
from x402.http import HTTPFacilitatorClient
from x402.mechanisms.avm.constants import ALGORAND_TESTNET_CAIP2

app = FastAPI()

routes = {
    "GET /api/data": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": "YOUR_ALGORAND_ADDRESS",
            "price": "$0.05",
        },
    },
}

facilitator_client = HTTPFacilitatorClient()
_middleware = fastapi_payment_middleware_from_config(
    routes,
    facilitator_client=facilitator_client,
)


@app.middleware("http")
async def x402_middleware(request, call_next):
    return await _middleware(request, call_next)


@app.get("/api/data")
async def get_data():
    return {"data": "protected content"}
```

### FastAPI with ASGI Middleware Class

```python
from fastapi import FastAPI
from x402.server import x402ResourceServer
from x402.http import HTTPFacilitatorClient
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm.constants import ALGORAND_TESTNET_CAIP2

app = FastAPI()

facilitator_client = HTTPFacilitatorClient()
server = x402ResourceServer(facilitator_client)
register_exact_avm_server(server)

routes = {
    "GET /api/data": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": "YOUR_ALGORAND_ADDRESS",
            "price": "$0.05",
        },
    },
}

# Alternative: add as ASGI middleware class
app.add_middleware(
    PaymentMiddlewareASGI,
    routes=routes,
    server=server,
)


@app.get("/api/data")
async def get_data():
    return {"data": "protected content"}
```

### Flask Equivalent

```bash
pip install "x402-avm[flask,avm]"
```

```python
from flask import Flask, jsonify
from x402.server import x402ResourceServerSync
from x402.http import HTTPFacilitatorClientSync
from x402.http.middleware import flask_payment_middleware
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm.constants import ALGORAND_TESTNET_CAIP2

app = Flask(__name__)

# Flask uses synchronous variants
facilitator_client = HTTPFacilitatorClientSync()
server = x402ResourceServerSync(facilitator_client)
register_exact_avm_server(server)

routes = {
    "GET /api/weather": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": "YOUR_ALGORAND_ADDRESS",
            "price": "$0.01",
        },
        "description": "Weather data",
    },
}

# Apply WSGI middleware (wraps app.wsgi_app automatically)
flask_payment_middleware(app, routes, server)


@app.route("/api/weather")
def get_weather():
    return jsonify({"temperature": 72, "condition": "sunny"})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(port=4021)
```

---

## Complete End-to-End Example

A full application with resource server, facilitator, and multiple protected routes.

### Project Structure

```
my-x402-app/
  package.json
  .env
  src/
    resource-server.ts   # Express resource server
    facilitator.ts       # Express facilitator server
```

### .env

```bash
# Resource server
RESOURCE_PAY_TO=ALGORAND_ADDRESS_FOR_RECEIVING_PAYMENTS
PORT=4021

# Facilitator
AVM_PRIVATE_KEY=base64_encoded_64_byte_private_key
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
FACILITATOR_PORT=4020
```

### resource-server.ts

```typescript
import express from "express";
import dotenv from "dotenv";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/express";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import {
  ALGORAND_TESTNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402-avm/avm";

dotenv.config();

const app = express();
app.use(express.json());

const PAY_TO = process.env.RESOURCE_PAY_TO!;
const FACILITATOR_URL = `http://localhost:${process.env.FACILITATOR_PORT || 4020}`;

// Create facilitator client pointing to our local facilitator
const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
});

// Create resource server with AVM support
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);

// Define all payment-protected routes
const routes = {
  // Pay in ALGO
  "GET /api/weather/:city": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.01",
    },
    description: "Weather data for a city",
    unpaidResponseBody: (context) => ({
      contentType: "application/json",
      body: {
        message: "Pay $0.01 to get weather data",
        availableCities: ["san-francisco", "new-york", "london"],
      },
    }),
  },

  // Pay in USDC
  "GET /api/analytics/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.50",
      extra: { asset: USDC_TESTNET_ASA_ID },
    },
    description: "Analytics data (USDC only)",
  },

  // Expensive endpoint
  "POST /api/ai/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$1.00",
    },
    description: "AI content generation",
  },
};

// Apply x402 middleware
app.use(paymentMiddleware(routes, server));

// ---- Route handlers ----

app.get("/api/weather/:city", (req, res) => {
  const city = req.params.city;
  res.json({
    city,
    temperature: Math.floor(Math.random() * 40) + 50,
    condition: ["sunny", "cloudy", "rainy"][Math.floor(Math.random() * 3)],
    humidity: Math.floor(Math.random() * 60) + 30,
  });
});

app.get("/api/analytics/*", (req, res) => {
  res.json({
    pageViews: 15420,
    uniqueVisitors: 8734,
    bounceRate: 0.32,
    avgSessionDuration: "3m 42s",
  });
});

app.post("/api/ai/generate", (req, res) => {
  const { prompt } = req.body;
  res.json({
    prompt,
    generated: "AI-generated response based on your prompt...",
    model: "gpt-4",
    tokens: 256,
  });
});

// Public endpoints
app.get("/", (req, res) => {
  res.json({
    name: "x402-avm Demo API",
    version: "2.0.0",
    endpoints: {
      weather: "GET /api/weather/:city ($0.01 ALGO)",
      analytics: "GET /api/analytics/* ($0.50 USDC)",
      generate: "POST /api/ai/generate ($1.00 ALGO)",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

const PORT = parseInt(process.env.PORT || "4021");
app.listen(PORT, () => {
  console.log(`Resource server: http://localhost:${PORT}`);
  console.log(`Facilitator:     ${FACILITATOR_URL}`);
  console.log(`Pay-to address:  ${PAY_TO}`);
});
```

### facilitator.ts

```typescript
import express from "express";
import dotenv from "dotenv";
import algosdk from "algosdk";
import { x402Facilitator } from "@x402-avm/core/facilitator";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/facilitator";
import type { FacilitatorAvmSigner } from "@x402-avm/avm";
import {
  ALGORAND_TESTNET_CAIP2,
} from "@x402-avm/avm";

dotenv.config();

const app = express();
app.use(express.json());

// ---- Signer setup ----

const privateKeyBase64 = process.env.AVM_PRIVATE_KEY!;
const privateKeyBytes = Buffer.from(privateKeyBase64, "base64");
const facilitatorAddress = algosdk.encodeAddress(privateKeyBytes.slice(32));

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN || "",
  process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  "",
);

const signer: FacilitatorAvmSigner = {
  address: facilitatorAddress,

  async getAlgodClient(_network: string) {
    return algodClient;
  },

  async signGroupTransactions(
    groupTxnBytes: Uint8Array[],
    myIndices: number[],
  ): Promise<Uint8Array[]> {
    const result = [...groupTxnBytes];
    for (const idx of myIndices) {
      const txn = algosdk.decodeUnsignedTransaction(groupTxnBytes[idx]);
      const signed = txn.signTxn(privateKeyBytes);
      result[idx] = signed;
    }
    return result;
  },

  async sendGroup(signedGroupBytes: Uint8Array[]): Promise<string> {
    const combined = new Uint8Array(
      signedGroupBytes.reduce((acc, b) => acc + b.length, 0),
    );
    let offset = 0;
    for (const bytes of signedGroupBytes) {
      combined.set(bytes, offset);
      offset += bytes.length;
    }
    const { txId } = await algodClient.sendRawTransaction(combined).do();
    return txId;
  },

  async simulateGroup(groupTxnBytes: Uint8Array[]): Promise<any> {
    const txns = groupTxnBytes.map((bytes) => {
      try {
        return algosdk.decodeSignedTransaction(bytes);
      } catch {
        const unsigned = algosdk.decodeUnsignedTransaction(bytes);
        return new algosdk.SignedTransaction(unsigned);
      }
    });
    const request = new algosdk.modelsv2.SimulateRequest({
      txnGroups: [
        new algosdk.modelsv2.SimulateRequestTransactionGroup({
          txns: txns.map((t) => algosdk.decodeObj(algosdk.encodeMsgpack(t))),
        }),
      ],
      allowEmptySignatures: true,
    });
    return algodClient.simulateTransactions(request).do();
  },
};

// ---- Facilitator setup ----

const facilitator = new x402Facilitator();
registerExactAvmScheme(facilitator, {
  signer,
  networks: ALGORAND_TESTNET_CAIP2,
});

// ---- HTTP endpoints ----

app.post("/verify", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;
    const result = await facilitator.verify(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (error: any) {
    console.error("Verify error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/settle", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;
    const result = await facilitator.settle(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (error: any) {
    console.error("Settle error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/supported", (req, res) => {
  res.json(facilitator.getSupported());
});

const PORT = parseInt(process.env.FACILITATOR_PORT || "4020");
app.listen(PORT, () => {
  console.log(`Facilitator running: http://localhost:${PORT}`);
  console.log(`Address: ${facilitatorAddress}`);
});
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AVM_PRIVATE_KEY` | Base64-encoded 64-byte key (32-byte seed + 32-byte pubkey) | `base64string...` |
| `ALGOD_SERVER` | Algorand node URL | `https://testnet-api.algonode.cloud` |
| `ALGOD_TOKEN` | Algorand node API token (empty for public nodes) | `""` |
| `ALGOD_MAINNET_URL` | Override mainnet Algod URL (used by SDK constants) | `https://mainnet-api.algonode.cloud` |
| `ALGOD_TESTNET_URL` | Override testnet Algod URL (used by SDK constants) | `https://testnet-api.algonode.cloud` |
| `RESOURCE_PAY_TO` | Algorand address to receive payments | `ABC...XYZ` (58 chars) |

### CAIP-2 Network Identifiers

| Network | CAIP-2 Identifier | Constant |
|---------|-------------------|----------|
| Algorand Testnet | `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=` | `ALGORAND_TESTNET_CAIP2` |
| Algorand Mainnet | `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=` | `ALGORAND_MAINNET_CAIP2` |

### USDC ASA IDs

| Network | ASA ID | Constant |
|---------|--------|----------|
| Testnet | `10458941` | `USDC_TESTNET_ASA_ID` |
| Mainnet | `31566704` | `USDC_MAINNET_ASA_ID` |
