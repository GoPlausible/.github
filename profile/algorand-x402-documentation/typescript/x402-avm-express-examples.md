# x402-avm V2: Express Middleware Examples

> **Python examples**: See [x402-avm-fastapi-examples-python](../python/x402-avm-fastapi-examples-python.md) for the Python equivalent using FastAPI.

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
- [Complete End-to-End Example](#complete-end-to-end-example)
- [Environment Variables](#environment-variables)

---

## Installation

```bash
npm install @x402/express @x402/avm @x402/core
```

> **Note:** `@x402/avm` uses `@algorandfoundation/algokit-utils` v10 (`10.0.0-alpha.46` in `@x402/avm` 2.28.0) internally, not `algosdk`. If you are migrating from GoPlausible's earlier `@x402-avm/*` packages or from an `algosdk`-based setup, switch to the upstream `@x402/*` packages, **remove `algosdk` from your project dependencies** and update your signer code as shown below.

For paywall UI support:

```bash
npm install @x402/express @x402/avm @x402/core @x402/paywall
```

---

## Quick Start with paymentMiddlewareFromConfig

The simplest way to get started. `paymentMiddlewareFromConfig` creates and configures
the `x402ResourceServer` internally; you pass the scheme servers to register as its
third argument.

```typescript
import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = express();

// Route configuration with Algorand testnet payments
const routes: RoutesConfig = {
  "GET /api/weather": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: "$0.01", // USD price, paid in USDC (ASA) on Algorand
    },
    description: "Current weather data",
  },
};

// Create facilitator client. Without a url it defaults to https://x402.org/facilitator,
// which lists Algorand TestNet only; the GoPlausible facilitator serves MainNet and TestNet.
const facilitatorClient = new HTTPFacilitatorClient({ url: "https://facilitator.goplausible.xyz" });

// Apply middleware -- simplest variant.
// The third argument registers the AVM exact scheme server for all Algorand networks.
app.use(
  paymentMiddlewareFromConfig(
    routes,
    facilitatorClient,
    [{ network: "algorand:*", server: new ExactAvmScheme() }],
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
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = express();

// Create facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.goplausible.xyz",
});

// Create and configure the resource server
const server = new x402ResourceServer(facilitatorClient);

// Register AVM exact payment scheme (wildcard for all Algorand networks)
server.register("algorand:*", new ExactAvmScheme());

// Define routes
const routes: RoutesConfig = {
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
} from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = express();

// Create resource server with AVM support
const facilitatorClient = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register("algorand:*", new ExactAvmScheme());

// Define routes
const routes: RoutesConfig = {
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

Routes are defined using the `RoutesConfig` type (from `@x402/core/server`), which maps
HTTP method + path patterns to `RouteConfig` objects. Annotating your route objects with
`RoutesConfig` keeps literal values such as `network` typed as CAIP-2 identifiers.

### Route Pattern Syntax

```typescript
import type { RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2 } from "@x402/avm";

// Pattern: "METHOD /path" or just "/path" (matches all methods)
const routes: RoutesConfig = {
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
// RouteConfig / RoutesConfig: exported from @x402/core/server
// PaymentOption, DynamicPrice, DynamicPayTo: exported from @x402/core/http
interface RouteConfig {
  // Payment option(s) -- single or array for multi-network support
  accepts: PaymentOption | PaymentOption[];

  // HTTP-specific metadata
  resource?: string;       // Resource URL override (defaults to the request URL)
  description?: string;    // Human-readable description
  mimeType?: string;       // Response MIME type
  serviceName?: string;    // Optional resource metadata
  tags?: string[];
  iconUrl?: string;
  customPaywallHtml?: string; // Custom HTML for paywall

  // Custom response for unpaid API requests
  unpaidResponseBody?: (
    context: HTTPRequestContext,
  ) => HTTPResponseBody | Promise<HTTPResponseBody>; // { contentType: string; body: unknown }

  // Custom response when settlement fails
  settlementFailedResponseBody?: (
    context: HTTPRequestContext,
    settleResult: Omit<ProcessSettleFailureResponse, "response">,
  ) => HTTPResponseBody | Promise<HTTPResponseBody>;

  // Extensions (e.g., bazaar)
  extensions?: Record<string, unknown>;
}

interface PaymentOption {
  scheme: string;               // "exact"
  payTo: string | DynamicPayTo; // Algorand address (58 chars), or (context) => address
  price: Price | DynamicPrice;  // "$0.01" (USD, paid in USDC), { amount, asset } in base units, or (context) => price
  network: Network;             // CAIP-2 network identifier, e.g. ALGORAND_TESTNET_CAIP2
  maxTimeoutSeconds?: number;   // Defaults to 300
  extra?: Record<string, unknown>;
}
```

### Single RouteConfig (for single-route apps)

When your app has only one protected endpoint, you can pass a single `RouteConfig`
instead of a map:

```typescript
import { paymentMiddlewareFromConfig } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import type { RouteConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

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
app.use(
  paymentMiddlewareFromConfig(singleRoute, facilitatorClient, [
    { network: "algorand:*", server: new ExactAvmScheme() },
  ]),
);
```

---

## Algorand Payment Routes

The AVM `exact` scheme pays with an Algorand Standard Asset transfer (`axfer`). A USD
price such as `"$0.01"` resolves to USDC (ASA `10458941` on TestNet, `31566704` on
MainNet, 6 decimals); native ALGO payments are not part of the `exact` scheme in
`@x402/avm` 2.28.0.

### USD Price (Default Asset: USDC)

```typescript
import type { RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const routes: RoutesConfig = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: "$0.01",  // Price in USD -- converted to USDC base units (10000)
    },
    description: "Data endpoint paid in USDC",
  },
};
```

### USDC (ASA) Payments

To name the asset explicitly, pass an `AssetAmount` (`{ amount, asset }`) as the
price. `amount` is in the asset's base units (USDC has 6 decimals).

```typescript
import type { RoutesConfig } from "@x402/core/server";
import {
  ALGORAND_TESTNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402/avm";

const routes: RoutesConfig = {
  "GET /api/premium": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "ALGORAND_ADDRESS_HERE_58_CHARS_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      price: {
        amount: "500000",            // 0.50 USDC (6 decimals)
        asset: USDC_TESTNET_ASA_ID,  // "10458941"
      },
    },
    description: "Premium endpoint paid in USDC",
  },
};
```

### Multi-Network Support (Accept Both Testnet and Mainnet)

```typescript
import type { RoutesConfig } from "@x402/core/server";
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
} from "@x402/avm";

// Your facilitator must support both networks in its /supported response
// (https://facilitator.goplausible.xyz lists Algorand MainNet and TestNet).
const routes: RoutesConfig = {
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
import type { RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

// Also register an EVM scheme server on your x402ResourceServer:
//   server.register("eip155:*", new ExactEvmScheme()); // from "@x402/evm/exact/server"
const routes: RoutesConfig = {
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
    description: "Cross-chain: pay with USDC on Algorand or Base Sepolia",
  },
};
```

---

## Dynamic Pricing

Use a `DynamicPrice` function to compute price at request time.

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = express();

// Parse JSON bodies BEFORE the payment middleware so the price function can read them
app.use(express.json());

const facilitatorClient = new HTTPFacilitatorClient();
const server = new x402ResourceServer(facilitatorClient);
server.register("algorand:*", new ExactAvmScheme());

const routes: RoutesConfig = {
  "GET /api/ai/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      // Dynamic price based on query parameters
      price: (context) => {
        const model = context.adapter.getQueryParam?.("model") ?? "basic";
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
      price: async (context) => {
        const body = (await context.adapter.getBody?.()) as { width?: number } | undefined;
        const width = body?.width ?? 256;
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

app.post("/api/image/resize", (req, res) => {
  res.json({ resized: true, width: req.body.width });
});

app.listen(4021);
```

---

## Multiple Routes with Different Prices

```typescript
import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

const app = express();

const PAY_TO = "YOUR_ALGORAND_ADDRESS";
const facilitatorClient = new HTTPFacilitatorClient();

const routes: RoutesConfig = {
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

  // Explicit USDC amount: premium subscription check
  "GET /api/subscription/status": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: {
        amount: "5000000", // 5.00 USDC (6 decimals)
        asset: USDC_TESTNET_ASA_ID,
      },
    },
    description: "Monthly subscription verification",
  },
};

app.use(
  paymentMiddlewareFromConfig(routes, facilitatorClient, [
    { network: "algorand:*", server: new ExactAvmScheme() },
  ]),
);

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
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { toFacilitatorAvmSigner, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = express();
app.use(express.json());

// ----------------------------------------------------------------
// Create signer using toFacilitatorAvmSigner
// ----------------------------------------------------------------

const signer = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!, {
  testnetUrl: process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
});

// ----------------------------------------------------------------
// Create and configure the facilitator
// ----------------------------------------------------------------

const facilitator = new x402Facilitator();

facilitator.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer));

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
user. This is implemented as an atomic transaction group where the facilitator signs
a fee-covering transaction.

### Resource Server with Fee Abstraction

You do not configure the fee payer on the route. The facilitator's `ExactAvmScheme`
(`@x402/avm/exact/facilitator`) advertises its address in `/supported` as `extra.feePayer`,
and the server-side `ExactAvmScheme` (`@x402/avm/exact/server`) copies it into the
`extra.feePayer` of every payment requirement it builds.

```typescript
import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = express();

const routes: RoutesConfig = {
  "GET /api/premium": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_RESOURCE_SERVER_ADDRESS",
      price: "$0.10",
      // No extra.feePayer needed: it is filled in from the facilitator's /supported response
    },
    description: "Fee-abstracted premium endpoint",
  },
};

// Point to your facilitator (here: the AVM facilitator above, which advertises feePayer)
const facilitatorClient = new HTTPFacilitatorClient({
  url: "http://localhost:4020",
});

app.use(
  paymentMiddlewareFromConfig(routes, facilitatorClient, [
    { network: "algorand:*", server: new ExactAvmScheme() },
  ]),
);

app.get("/api/premium", (req, res) => {
  res.json({ premium: true, data: "Fee-abstracted content" });
});

app.listen(4021, () => {
  console.log("Fee-abstracted server on http://localhost:4021");
});
```

When the payment requirements carry `extra.feePayer`, the client (`ExactAvmScheme` from
`@x402/avm/exact/client`) builds a 2-transaction atomic group and sends it as
`{ paymentGroup, paymentIndex: 1 }`:
1. **Fee payer transaction** (index 0, left unsigned by the client): `pay` from `feePayer` to itself, `amount=0`, note `x402-fee-payer-<timestamp>`. Its fee covers the whole group through fee pooling and is computed from the encoded transaction sizes (`fee = max(fee_per_byte × size, min_fee)` per transaction, summed over the group).
2. **Payment transaction** (index 1, signed by the user): `axfer` of the ASA (USDC by default) to `payTo`, `fee=0`, note `x402-payment-v2-<timestamp>`.

During verification and settlement the facilitator checks the fee payer transaction
(zero amount, self-payment, no close-to or rekey, fee at most
`maxReasonableGroupFee(groupSize)` = 5000 µAlgo × group size), signs it, simulates the
group, submits it and waits for on-chain confirmation.

---

## Paywall Integration

The `@x402/paywall` package provides a browser-based payment UI that automatically
appears when a user visits a protected route in their browser.

### Basic Paywall

Build a paywall provider with the Algorand handler (`avmPaywall`) and pass it as the
fourth argument. Without a provider, browsers get a static "Payment Required" page.

```typescript
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";
import { createPaywall } from "@x402/paywall";
import { avmPaywall } from "@x402/paywall/avm";

const app = express();

const facilitatorClient = new HTTPFacilitatorClient();
const server = new x402ResourceServer(facilitatorClient);
server.register("algorand:*", new ExactAvmScheme());

const routes: RoutesConfig = {
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

// Paywall configuration (PaywallConfig: appName, appLogo, sessionTokenEndpoint, currentUrl, testnet)
const paywallConfig = {
  appName: "Premium Content",
  appLogo: "https://example.com/logo.png",
  testnet: true,
};

// Algorand paywall UI provider
const paywall = createPaywall().withNetwork(avmPaywall).build();

app.use(paymentMiddleware(routes, server, paywallConfig, paywall));

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
const routes: RoutesConfig = {
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
          <p>Please pay $0.10 in USDC on Algorand to access this content.</p>
          <p>Use an x402-compatible wallet to make the payment.</p>
        </body>
      </html>
    `,
  },
};
```

### Custom Paywall Provider

```typescript
import type { PaywallProvider } from "@x402/core/server";

// Create a custom paywall provider
const customPaywall: PaywallProvider = {
  generateHtml(paymentRequired, config) {
    const requirement = paymentRequired.accepts[0];
    return `
      <html>
        <body>
          <h1>${config?.appName || "Payment Required"}</h1>
          <p>Amount (base units): ${requirement.amount}</p>
          <p>Asset (ASA ID): ${requirement.asset}</p>
          <p>Network: ${requirement.network}</p>
          <p>Pay to: ${requirement.payTo}</p>
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
const routes: RoutesConfig = {
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
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import {
  ALGORAND_TESTNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402/avm";

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
server.register("algorand:*", new ExactAvmScheme());

// Define all payment-protected routes
const routes: RoutesConfig = {
  // USD price, paid in USDC
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

  // Explicit USDC amount (base units)
  "GET /api/analytics/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: { amount: "500000", asset: USDC_TESTNET_ASA_ID }, // 0.50 USDC
    },
    description: "Analytics data (USDC)",
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
      weather: "GET /api/weather/:city ($0.01 USDC)",
      analytics: "GET /api/analytics/* (0.50 USDC)",
      generate: "POST /api/ai/generate ($1.00 USDC)",
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
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { toFacilitatorAvmSigner, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

dotenv.config();

const app = express();
app.use(express.json());

// ---- Signer setup ----

const signer = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!, {
  testnetUrl: process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  algodToken: process.env.ALGOD_TOKEN,
});

const facilitatorAddress = signer.getAddresses()[0];

// ---- Facilitator setup ----

const facilitator = new x402Facilitator();
facilitator.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer));

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
| `RESOURCE_PAY_TO` | Algorand address to receive payments | `ABC...XYZ` (58 chars) |

The SDK does not read these variables itself: the examples pass them in code. Custom
Algod endpoints go to `toFacilitatorAvmSigner(key, { testnetUrl, mainnetUrl, algodToken })`;
without them the signer uses AlgoKit's default TestNet/MainNet endpoints.

### CAIP-2 Network Identifiers

| Network | CAIP-2 Identifier | Constant |
|---------|-------------------|----------|
| Algorand Testnet | `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe` | `ALGORAND_TESTNET_CAIP2` |
| Algorand Mainnet | `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k` | `ALGORAND_MAINNET_CAIP2` |

Use the constants from `@x402/avm` (>= 2.20.0) rather than string literals. The legacy
full-hash form (`algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`,
`algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`) is not valid CAIP-2; `@x402/avm`
still accepts it on input during the transition, and the GoPlausible facilitator's
`/supported` lists it after the canonical ids until it is switched off with notice. See
[V2 CAIP-2 Network Identifiers](../README.md#v2-caip-2-network-identifiers).

### USDC ASA IDs

| Network | ASA ID | Constant |
|---------|--------|----------|
| Testnet | `10458941` | `USDC_TESTNET_ASA_ID` |
| Mainnet | `31566704` | `USDC_MAINNET_ASA_ID` |
