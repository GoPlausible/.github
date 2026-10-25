# x402-avm V2: Hono Middleware Examples

> **Python examples**: See [x402-avm-flask-examples-python](../python/x402-avm-flask-examples-python.md) for the Python equivalent using Flask.

Comprehensive examples for integrating x402-avm payment-gated routes with Hono,
including Algorand (AVM) blockchain payments and Cloudflare Workers deployment.

## Table of Contents

- [Installation](#installation)
- [Quick Start with paymentMiddlewareFromConfig](#quick-start-with-paymentmiddlewarefromconfig)
- [Using paymentMiddleware with x402ResourceServer](#using-paymentmiddleware-with-x402resourceserver)
- [Using paymentMiddlewareFromHTTPServer](#using-paymentmiddlewarefromhttpserver)
- [Route Configuration](#route-configuration)
- [Algorand Payment Routes](#algorand-payment-routes)
- [Multiple Protected Routes](#multiple-protected-routes)
- [Cloudflare Workers Deployment](#cloudflare-workers-deployment)
- [Bun / Deno Deployment](#bun--deno-deployment)
- [Facilitator Server with Hono](#facilitator-server-with-hono)
- [Complete Examples](#complete-examples)
- [Environment Variables](#environment-variables)

---

## Installation

```bash
npm install @x402/hono @x402/avm @x402/core hono@^4.13.13
```

> **hono version:** use `hono` >= 4.13.11 (`hono@^4.13.13` above). Earlier 4.x releases have published security advisories, e.g. CVE-2026-111757 (`serveStatic` path re-decoding) and CVE-2026-84364 (`parseBody` memory exhaustion).

> **Note:** `@x402/avm` uses `@algorandfoundation/algokit-utils` v10 (`10.0.0-alpha.46` in `@x402/avm` 2.28.0) internally, not `algosdk`. If you are migrating from GoPlausible's earlier `@x402-avm/*` packages or from an `algosdk`-based setup, switch to the upstream `@x402/*` packages, **remove `algosdk` from your project dependencies** and update your signer code as shown below.

For Node.js server deployment:

```bash
npm install @x402/hono @x402/avm @x402/core hono@^4.13.13 @hono/node-server
```

---

## Quick Start with paymentMiddlewareFromConfig

The simplest way to add x402 payment gating to a Hono app.
`paymentMiddlewareFromConfig` creates the `x402ResourceServer` internally; you pass the
scheme servers to register as its third argument.

```typescript
import { Hono } from "hono";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = new Hono();

// Route configuration
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

// Apply middleware (returns MiddlewareHandler).
// The third argument registers the AVM exact scheme server for all Algorand networks.
app.use(
  paymentMiddlewareFromConfig(routes, facilitatorClient, [
    { network: "algorand:*", server: new ExactAvmScheme() },
  ]),
);

// Protected route
app.get("/api/weather", (c) => {
  return c.json({
    temperature: 72,
    condition: "sunny",
    city: "San Francisco",
  });
});

// Public route (not in routes config)
app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

export default app;
```

### Running with Node.js

```typescript
import { serve } from "@hono/node-server";

serve({
  fetch: app.fetch,
  port: 4021,
}, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
```

### Running with Bun

```typescript
export default {
  port: 4021,
  fetch: app.fetch,
};
```

---

## Using paymentMiddleware with x402ResourceServer

Use this when you need more control over the `x402ResourceServer` instance --
for registering multiple schemes, customizing configuration, or reusing the
server across different middleware.

```typescript
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = new Hono();

// Create and configure the resource server
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.goplausible.xyz",
});

const server = new x402ResourceServer(facilitatorClient);

// Register AVM exact payment scheme (wildcard for all Algorand networks)
server.register("algorand:*", new ExactAvmScheme());

// Define routes
const routes: RoutesConfig = {
  "GET /api/premium/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.10",
    },
    description: "Premium API access",
  },
  "POST /api/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.50",
    },
    description: "AI content generation",
  },
};

// Apply middleware with pre-configured server
app.use(paymentMiddleware(routes, server));

app.get("/api/premium/data", (c) => {
  return c.json({ data: "premium content" });
});

app.get("/api/premium/stats", (c) => {
  return c.json({ views: 15000, revenue: "$1234.56" });
});

app.post("/api/generate", async (c) => {
  const body = await c.req.json();
  return c.json({ prompt: body.prompt, result: "Generated content..." });
});

export default app;
```

---

## Using paymentMiddlewareFromHTTPServer

The most advanced variant. Use this when you need HTTP-level hooks such as
`onProtectedRequest` for custom access control (API key bypass, rate limiting,
request logging).

```typescript
import { Hono } from "hono";
import {
  paymentMiddlewareFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
} from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = new Hono();

// Create resource server with AVM support
const facilitatorClient = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register("algorand:*", new ExactAvmScheme());

const routes: RoutesConfig = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.05",
    },
    description: "Protected data endpoint",
  },
};

// Create HTTP server with hooks
const httpServer = new x402HTTPResourceServer(resourceServer, routes);

// Hook: grant free access for valid API keys
httpServer.onProtectedRequest(async (context, routeConfig) => {
  const apiKey = context.adapter.getHeader("x-api-key");

  if (apiKey === process.env.API_KEY) {
    console.log(`API key bypass for ${context.path}`);
    return { grantAccess: true };
  }

  // Deny specific user agents
  const ua = context.adapter.getUserAgent();
  if (ua.includes("BadBot")) {
    return { abort: true, reason: "Blocked user agent" };
  }

  // Continue to payment flow
  return undefined;
});

// Apply middleware
app.use(paymentMiddlewareFromHTTPServer(httpServer));

app.get("/api/data", (c) => {
  return c.json({ data: "protected content" });
});

export default app;
```

---

## Route Configuration

Routes use the same `RoutesConfig` type (from `@x402/core/server`) as Express. The
configuration maps `"METHOD /path"` patterns to `RouteConfig` objects. Annotating your
route objects with `RoutesConfig` keeps literal values such as `network` typed as CAIP-2
identifiers.

### Route Pattern Examples

```typescript
import type { RoutesConfig } from "@x402/core/server";
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402/avm";

const routes: RoutesConfig = {
  // Exact match
  "GET /api/weather": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ADDRESS",
      price: "$0.01",
    },
    description: "Weather data",
  },

  // Wildcard: matches /api/premium/anything
  "GET /api/premium/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ADDRESS",
      price: "$0.10",
    },
    description: "Premium endpoints",
  },

  // All HTTP methods
  "/api/resource": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ADDRESS",
      price: "$0.05",
    },
    description: "Resource CRUD",
  },

  // Multiple payment options (Algorand or EVM).
  // EVM also needs server.register("eip155:*", new ExactEvmScheme()) from "@x402/evm/exact/server".
  "GET /api/cross-chain": {
    accepts: [
      {
        scheme: "exact",
        network: ALGORAND_TESTNET_CAIP2,
        payTo: "YOUR_ALGORAND_ADDRESS",
        price: "$0.01",
      },
      {
        scheme: "exact",
        network: "eip155:84532",
        payTo: "0xYourEvmAddress",
        price: "$0.01",
      },
    ],
    description: "Cross-chain endpoint",
  },

  // Explicit USDC amount (base units, 6 decimals)
  "GET /api/usdc-only": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ADDRESS",
      price: { amount: "5000000", asset: USDC_TESTNET_ASA_ID }, // 5.00 USDC
    },
    description: "USDC-only endpoint",
  },
};
```

### Single RouteConfig

When all routes share the same payment config:

```typescript
import type { RouteConfig } from "@x402/core/server";

const singleRoute: RouteConfig = {
  accepts: {
    scheme: "exact",
    network: ALGORAND_TESTNET_CAIP2,
    payTo: "YOUR_ADDRESS",
    price: "$0.05",
  },
  description: "All routes use this config",
};

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
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.01",  // USD price, converted to USDC base units (10000)
    },
    description: "Data paid in USDC",
  },
};
```

### USDC (ASA) Payments

To name the asset explicitly, pass an `AssetAmount` (`{ amount, asset }`) as the
price. `amount` is in the asset's base units (USDC has 6 decimals).

```typescript
import type { RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

const routes: RoutesConfig = {
  "GET /api/premium": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: {
        amount: "500000",            // 0.50 USDC (6 decimals)
        asset: USDC_TESTNET_ASA_ID,  // "10458941"
      },
    },
    description: "Premium endpoint paid in USDC",
  },
};
```

### Mainnet Deployment

```typescript
import type { RoutesConfig } from "@x402/core/server";
import { ALGORAND_MAINNET_CAIP2, USDC_MAINNET_ASA_ID } from "@x402/avm";

// Use a facilitator whose /supported lists Algorand MainNet
// (for example https://facilitator.goplausible.xyz).
const routes: RoutesConfig = {
  "GET /api/production": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_MAINNET_CAIP2,
      payTo: "YOUR_MAINNET_ADDRESS",
      price: {
        amount: "1000000",           // 1.00 USDC (6 decimals)
        asset: USDC_MAINNET_ASA_ID,  // "31566704"
      },
    },
    description: "Production endpoint",
  },
};
```

---

## Multiple Protected Routes

```typescript
import { Hono } from "hono";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

const app = new Hono();
const PAY_TO = "YOUR_ALGORAND_ADDRESS";
const facilitatorClient = new HTTPFacilitatorClient();

const routes: RoutesConfig = {
  // Tier 1: cheap lookups
  "GET /api/lookup/:id": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.001",
    },
    description: "Simple data lookup",
  },

  // Tier 2: medium-cost analytics
  "GET /api/analytics/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.05",
    },
    description: "Analytics data",
  },

  // Tier 3: expensive generation
  "POST /api/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$1.00",
    },
    description: "AI content generation",
  },

  // Explicit USDC amount for high-value endpoints
  "GET /api/report/full": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: { amount: "10000000", asset: USDC_TESTNET_ASA_ID }, // 10.00 USDC
    },
    description: "Full analytics report (USDC)",
  },
};

app.use(
  paymentMiddlewareFromConfig(routes, facilitatorClient, [
    { network: "algorand:*", server: new ExactAvmScheme() },
  ]),
);

// Route handlers
app.get("/api/lookup/:id", (c) => {
  return c.json({ id: c.req.param("id"), data: "lookup result" });
});

app.get("/api/analytics/*", (c) => {
  return c.json({ pageViews: 15420, uniqueVisitors: 8734 });
});

app.post("/api/generate", async (c) => {
  const body = await c.req.json();
  return c.json({ prompt: body.prompt, result: "Generated content" });
});

app.get("/api/report/full", (c) => {
  return c.json({ report: "Comprehensive analytics report..." });
});

// Public routes (not in routes config)
app.get("/", (c) => {
  return c.json({
    name: "x402-avm Hono API",
    endpoints: {
      lookup: "GET /api/lookup/:id ($0.001)",
      analytics: "GET /api/analytics/* ($0.05)",
      generate: "POST /api/generate ($1.00)",
      report: "GET /api/report/full ($10.00 USDC)",
    },
  });
});

app.get("/api/health", (c) => c.json({ status: "ok" }));

export default app;
```

---

## Cloudflare Workers Deployment

Hono is an ideal choice for Cloudflare Workers. Here is how to deploy an
x402-avm payment-gated API on the edge.

### wrangler.toml

```toml
name = "x402-avm-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"
# @x402/hono uses Node's Buffer when it settles a payment
compatibility_flags = ["nodejs_compat"]

[vars]
PAY_TO = "YOUR_ALGORAND_ADDRESS"
FACILITATOR_URL = "https://facilitator.goplausible.xyz"
```

### src/index.ts

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

type Bindings = {
  PAY_TO: string;
  FACILITATOR_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for cross-origin requests
app.use("*", cors());

// Setup payment middleware using env vars from wrangler.toml.
// Bindings are only available per request, so the middleware is built inside the
// request; with the default syncFacilitatorOnStart (true) it fetches the facilitator's
// /supported within that request. See the static alternative below to avoid the
// per-request setup.
app.use("*", async (c, next) => {
  const routes: RoutesConfig = {
    "GET /api/data": {
      accepts: {
        scheme: "exact",
        network: ALGORAND_TESTNET_CAIP2,
        payTo: c.env.PAY_TO,
        price: "$0.01",
      },
      description: "Edge data endpoint",
    },
    "POST /api/process": {
      accepts: {
        scheme: "exact",
        network: ALGORAND_TESTNET_CAIP2,
        payTo: c.env.PAY_TO,
        price: "$0.10",
      },
      description: "Edge processing endpoint",
    },
  };

  const facilitatorClient = new HTTPFacilitatorClient({
    url: c.env.FACILITATOR_URL,
  });

  const middleware = paymentMiddlewareFromConfig(
    routes,
    facilitatorClient,
    [{ network: "algorand:*", server: new ExactAvmScheme() }], // schemes
  );

  return middleware(c, next);
});

// Protected routes
app.get("/api/data", (c) => {
  return c.json({
    data: "Edge-served paid content",
    region: c.req.header("cf-ipcountry") || "unknown",
  });
});

app.post("/api/process", async (c) => {
  const body = await c.req.json();
  return c.json({
    processed: true,
    input: body,
    region: c.req.header("cf-ipcountry") || "unknown",
  });
});

// Public routes
app.get("/", (c) => {
  return c.json({
    name: "x402-avm Edge API",
    runtime: "Cloudflare Workers",
  });
});

export default app;
```

### Alternative: Static Route Config (avoids per-request creation)

With `syncFacilitatorOnStart = false` the middleware makes no facilitator request while
the module loads, but it also does not initialize the resource server itself. Call
`initialize()` once, inside the first request, before the middleware runs.

```typescript
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

// Static configuration (created once at module level)
const routes: RoutesConfig = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.01",
    },
    description: "Edge data",
  },
};

const facilitatorClient = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register("algorand:*", new ExactAvmScheme());

const app = new Hono();

// Apply once at module scope
const x402 = paymentMiddleware(
  routes,
  resourceServer,
  undefined,
  undefined,
  false,  // syncFacilitatorOnStart = false
);

// Fetch the facilitator's /supported once, on the first request
let initialized: Promise<void> | undefined;
app.use(async (c, next) => {
  initialized ??= resourceServer.initialize().catch((error) => {
    initialized = undefined; // retry on the next request
    throw error;
  });
  await initialized;
  return x402(c, next);
});

app.get("/api/data", (c) => c.json({ data: "content" }));
app.get("/", (c) => c.json({ status: "ok" }));

export default app;
```

---

## Bun / Deno Deployment

### Bun

```typescript
// src/index.ts
import { Hono } from "hono";
import { paymentMiddlewareFromConfig } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = new Hono();

const routes: RoutesConfig = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.01",
    },
    description: "Data endpoint",
  },
};

app.use(
  paymentMiddlewareFromConfig(routes, new HTTPFacilitatorClient(), [
    { network: "algorand:*", server: new ExactAvmScheme() },
  ]),
);

app.get("/api/data", (c) => c.json({ data: "content" }));
app.get("/", (c) => c.json({ status: "ok" }));

// Bun native server
export default {
  port: 4021,
  fetch: app.fetch,
};
```

### Deno

```typescript
// main.ts -- npm: specifiers so Hono and @x402/hono share the same hono package
import { Hono } from "npm:hono";
import { paymentMiddlewareFromConfig } from "npm:@x402/hono";
import { ExactAvmScheme } from "npm:@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "npm:@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "npm:@x402/avm";

const app = new Hono();

const routes: RoutesConfig = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.01",
    },
    description: "Data endpoint",
  },
};

app.use(
  paymentMiddlewareFromConfig(routes, new HTTPFacilitatorClient(), [
    { network: "algorand:*", server: new ExactAvmScheme() },
  ]),
);

app.get("/api/data", (c) => c.json({ data: "content" }));

Deno.serve({ port: 4021 }, app.fetch);
```

---

## Facilitator Server with Hono

A facilitator server built with Hono for verifying and settling Algorand payments.

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { toFacilitatorAvmSigner, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const app = new Hono();
app.use("*", cors());

// ---- Signer ----

const signer = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!, {
  testnetUrl: process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  algodToken: process.env.ALGOD_TOKEN,
});

const facilitatorAddress = signer.getAddresses()[0];

// ---- Facilitator ----

const facilitator = new x402Facilitator();
facilitator.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer));

// ---- Endpoints ----

app.post("/verify", async (c) => {
  try {
    const { paymentPayload, paymentRequirements } = await c.req.json();
    const result = await facilitator.verify(paymentPayload, paymentRequirements);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/settle", async (c) => {
  try {
    const { paymentPayload, paymentRequirements } = await c.req.json();
    const result = await facilitator.settle(paymentPayload, paymentRequirements);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/supported", (c) => {
  return c.json(facilitator.getSupported());
});

app.get("/", (c) => {
  return c.json({
    name: "x402-avm Facilitator",
    address: facilitatorAddress,
    networks: [ALGORAND_TESTNET_CAIP2],
  });
});

serve({ fetch: app.fetch, port: 4020 }, (info) => {
  console.log(`Facilitator running on http://localhost:${info.port}`);
  console.log(`Address: ${facilitatorAddress}`);
});
```

---

## Complete Examples

### Full Hono Application (Node.js)

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient, type RoutesConfig } from "@x402/core/server";
import {
  ALGORAND_TESTNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402/avm";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());

// Setup x402
const PAY_TO = process.env.PAY_TO || "YOUR_ALGORAND_ADDRESS";
const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://facilitator.goplausible.xyz",
});

const server = new x402ResourceServer(facilitatorClient);
server.register("algorand:*", new ExactAvmScheme());

const routes: RoutesConfig = {
  "GET /api/weather/:city": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.01",
    },
    description: "City weather data",
    unpaidResponseBody: () => ({
      contentType: "application/json",
      body: {
        message: "Pay $0.01 to access weather data",
        cities: ["san-francisco", "new-york", "london"],
      },
    }),
  },
  "GET /api/analytics/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: { amount: "500000", asset: USDC_TESTNET_ASA_ID }, // 0.50 USDC
    },
    description: "Analytics (USDC)",
  },
  "POST /api/ai/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$1.00",
    },
    description: "AI generation",
  },
};

// Apply x402 payment middleware
app.use(paymentMiddleware(routes, server));

// ---- Route Handlers ----

app.get("/api/weather/:city", (c) => {
  const city = c.req.param("city");
  return c.json({
    city,
    temperature: Math.floor(Math.random() * 40) + 50,
    condition: ["sunny", "cloudy", "rainy"][Math.floor(Math.random() * 3)],
    humidity: Math.floor(Math.random() * 60) + 30,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/analytics/*", (c) => {
  return c.json({
    pageViews: 15420,
    uniqueVisitors: 8734,
    bounceRate: 0.32,
    avgSessionDuration: "3m 42s",
    topPages: ["/home", "/pricing", "/docs"],
  });
});

app.post("/api/ai/generate", async (c) => {
  const { prompt } = await c.req.json();
  return c.json({
    prompt,
    generated: "AI-generated response based on your prompt...",
    model: "gpt-4",
    tokens: 256,
  });
});

// ---- Public Routes ----

app.get("/", (c) => {
  return c.json({
    name: "x402-avm Hono Demo",
    version: "2.0.0",
    endpoints: {
      weather: "GET /api/weather/:city ($0.01 USDC)",
      analytics: "GET /api/analytics/* (0.50 USDC)",
      generate: "POST /api/ai/generate ($1.00 USDC)",
    },
  });
});

app.get("/api/health", (c) => c.json({ status: "healthy" }));

// ---- Start Server ----

const port = parseInt(process.env.PORT || "4021");
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`x402-avm Hono server: http://localhost:${info.port}`);
  console.log(`Pay-to: ${PAY_TO}`);
});
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PAY_TO` | Algorand address to receive payments | `ABC...XYZ` (58 chars) |
| `FACILITATOR_URL` | URL of the facilitator server | `https://facilitator.goplausible.xyz` |
| `AVM_PRIVATE_KEY` | Base64-encoded 64-byte key (facilitator only) | `base64string...` |
| `ALGOD_SERVER` | Algorand node URL | `https://testnet-api.algonode.cloud` |
| `ALGOD_TOKEN` | Algorand node API token | `""` |
| `PORT` | Server port | `4021` |

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
