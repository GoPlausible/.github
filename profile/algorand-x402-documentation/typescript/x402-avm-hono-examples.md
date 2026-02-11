# x402-avm V2: Hono Middleware Examples

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
- [Python Flask Equivalent](#python-flask-equivalent)
- [Complete Examples](#complete-examples)
- [Environment Variables](#environment-variables)

---

## Installation

```bash
npm install @x402-avm/hono @x402-avm/avm @x402-avm/core hono
```

For Node.js server deployment:

```bash
npm install @x402-avm/hono @x402-avm/avm @x402-avm/core hono @hono/node-server
```

---

## Quick Start with paymentMiddlewareFromConfig

The simplest way to add x402 payment gating to a Hono app.
`paymentMiddlewareFromConfig` creates the `x402ResourceServer` internally.

```typescript
import { Hono } from "hono";
import { paymentMiddlewareFromConfig } from "@x402-avm/hono";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = new Hono();

// Route configuration
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

// Create facilitator client
const facilitatorClient = new HTTPFacilitatorClient();

// Apply middleware (returns MiddlewareHandler)
app.use(paymentMiddlewareFromConfig(routes, facilitatorClient));

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
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/hono";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = new Hono();

// Create and configure the resource server
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

const server = new x402ResourceServer(facilitatorClient);

// Register AVM exact payment scheme (wildcard for all Algorand networks)
registerExactAvmScheme(server);

// Define routes
const routes = {
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
} from "@x402-avm/hono";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = new Hono();

// Create resource server with AVM support
const facilitatorClient = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(resourceServer);

const routes = {
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

Routes use the same `RoutesConfig` type as Express. The configuration maps
`"METHOD /path"` patterns to `RouteConfig` objects.

### Route Pattern Examples

```typescript
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402-avm/avm";

const routes = {
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

  // Multiple payment options (Algorand or EVM)
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

  // USDC payments
  "GET /api/usdc-only": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ADDRESS",
      price: "$5.00",
      extra: { asset: USDC_TESTNET_ASA_ID },
    },
    description: "USDC-only endpoint",
  },
};
```

### Single RouteConfig

When all routes share the same payment config:

```typescript
const singleRoute = {
  accepts: {
    scheme: "exact",
    network: ALGORAND_TESTNET_CAIP2,
    payTo: "YOUR_ADDRESS",
    price: "$0.05",
  },
  description: "All routes use this config",
};

app.use(paymentMiddlewareFromConfig(singleRoute, facilitatorClient));
```

---

## Algorand Payment Routes

### Native ALGO Payments

```typescript
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const routes = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.01",  // USD price, resolved to ALGO at payment time
    },
    description: "Data paid in ALGO",
  },
};
```

### USDC (ASA) Payments

```typescript
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

const routes = {
  "GET /api/premium": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.50",
      extra: {
        asset: USDC_TESTNET_ASA_ID,  // "10458941"
      },
    },
    description: "Premium endpoint paid in USDC",
  },
};
```

### Mainnet Deployment

```typescript
import { ALGORAND_MAINNET_CAIP2, USDC_MAINNET_ASA_ID } from "@x402-avm/avm";

const routes = {
  "GET /api/production": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_MAINNET_CAIP2,
      payTo: "YOUR_MAINNET_ADDRESS",
      price: "$1.00",
      extra: {
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
import { paymentMiddlewareFromConfig } from "@x402-avm/hono";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

const app = new Hono();
const PAY_TO = "YOUR_ALGORAND_ADDRESS";
const facilitatorClient = new HTTPFacilitatorClient();

const routes = {
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

  // USDC payments for high-value endpoints
  "GET /api/report/full": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$10.00",
      extra: { asset: USDC_TESTNET_ASA_ID },
    },
    description: "Full analytics report (USDC)",
  },
};

app.use(paymentMiddlewareFromConfig(routes, facilitatorClient));

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

[vars]
PAY_TO = "YOUR_ALGORAND_ADDRESS"
FACILITATOR_URL = "https://x402.org/facilitator"
```

### src/index.ts

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { paymentMiddlewareFromConfig } from "@x402-avm/hono";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

type Bindings = {
  PAY_TO: string;
  FACILITATOR_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for cross-origin requests
app.use("*", cors());

// Setup payment middleware using env vars from wrangler.toml
app.use("*", async (c, next) => {
  const routes = {
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

  // Disable facilitator sync on start for serverless (cold start optimization)
  const middleware = paymentMiddlewareFromConfig(
    routes,
    facilitatorClient,
    undefined,  // schemes
    undefined,  // paywallConfig
    undefined,  // paywall
    false,       // syncFacilitatorOnStart = false for Workers
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

```typescript
import { Hono } from "hono";
import { paymentMiddlewareFromConfig } from "@x402-avm/hono";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

// Static configuration (created once at module level)
const routes = {
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

const app = new Hono();

// Apply once at module scope
app.use(
  paymentMiddlewareFromConfig(
    routes,
    facilitatorClient,
    undefined,
    undefined,
    undefined,
    false,  // syncFacilitatorOnStart = false
  ),
);

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
import { paymentMiddlewareFromConfig } from "@x402-avm/hono";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = new Hono();

const routes = {
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

app.use(paymentMiddlewareFromConfig(routes, new HTTPFacilitatorClient()));

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
// main.ts
import { Hono } from "https://deno.land/x/hono/mod.ts";
import { paymentMiddlewareFromConfig } from "@x402-avm/hono";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = new Hono();

const routes = {
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

app.use(paymentMiddlewareFromConfig(routes, new HTTPFacilitatorClient()));

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
import algosdk from "algosdk";
import { x402Facilitator } from "@x402-avm/core/facilitator";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/facilitator";
import type { FacilitatorAvmSigner } from "@x402-avm/avm";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = new Hono();
app.use("*", cors());

// ---- Signer ----

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
      result[idx] = txn.signTxn(privateKeyBytes);
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

// ---- Facilitator ----

const facilitator = new x402Facilitator();
registerExactAvmScheme(facilitator, {
  signer,
  networks: ALGORAND_TESTNET_CAIP2,
});

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

## Python Flask Equivalent

The Python SDK provides Flask middleware for synchronous x402 payment gating.

### Installation

```bash
pip install "x402-avm[flask,avm]"
```

### Basic Flask Server

```python
from flask import Flask, jsonify
from x402.server import x402ResourceServerSync
from x402.http import HTTPFacilitatorClientSync
from x402.http.middleware import flask_payment_middleware
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm.constants import ALGORAND_TESTNET_CAIP2

app = Flask(__name__)

# Create synchronous server (Flask is WSGI, not async)
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

# Apply WSGI middleware (wraps app.wsgi_app automatically)
flask_payment_middleware(app, routes, server)


@app.route("/api/weather")
def get_weather():
    return jsonify({"temperature": 72, "condition": "sunny"})


@app.route("/api/premium/data")
def get_premium():
    return jsonify({"data": "premium content"})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(port=4021)
```

### Flask with payment_middleware_from_config

```python
from flask import Flask, jsonify
from x402.http import HTTPFacilitatorClientSync
from x402.http.middleware import flask_payment_middleware_from_config
from x402.mechanisms.avm.constants import ALGORAND_TESTNET_CAIP2

app = Flask(__name__)

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

facilitator_client = HTTPFacilitatorClientSync()
flask_payment_middleware_from_config(
    app,
    routes,
    facilitator_client=facilitator_client,
)


@app.route("/api/data")
def get_data():
    return jsonify({"data": "protected content"})


if __name__ == "__main__":
    app.run(port=4021)
```

### Flask with Multiple Routes and USDC

```python
from flask import Flask, jsonify
from x402.server import x402ResourceServerSync
from x402.http import HTTPFacilitatorClientSync
from x402.http.middleware import flask_payment_middleware
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm.constants import (
    ALGORAND_TESTNET_CAIP2,
    USDC_TESTNET_ASA_ID,
)

app = Flask(__name__)

facilitator_client = HTTPFacilitatorClientSync()
server = x402ResourceServerSync(facilitator_client)
register_exact_avm_server(server)

PAY_TO = "YOUR_ALGORAND_ADDRESS"

routes = {
    # ALGO payment
    "GET /api/lookup/*": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": PAY_TO,
            "price": "$0.001",
        },
        "description": "Simple lookup",
    },
    # USDC payment
    "GET /api/report": {
        "accepts": {
            "scheme": "exact",
            "network": ALGORAND_TESTNET_CAIP2,
            "payTo": PAY_TO,
            "price": "$5.00",
            "extra": {"asset": USDC_TESTNET_ASA_ID},
        },
        "description": "Full report (USDC)",
    },
}

flask_payment_middleware(app, routes, server)


@app.route("/api/lookup/<item_id>")
def lookup(item_id):
    return jsonify({"id": item_id, "data": "lookup result"})


@app.route("/api/report")
def report():
    return jsonify({"report": "Comprehensive analytics report..."})


@app.route("/")
def home():
    return jsonify({"status": "ok", "message": "Welcome"})


if __name__ == "__main__":
    app.run(port=4021)
```

---

## Complete Examples

### Full Hono Application (Node.js)

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/hono";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import {
  ALGORAND_TESTNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402-avm/avm";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());

// Setup x402
const PAY_TO = process.env.PAY_TO || "YOUR_ALGORAND_ADDRESS";
const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
});

const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);

const routes = {
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
      price: "$0.50",
      extra: { asset: USDC_TESTNET_ASA_ID },
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
      weather: "GET /api/weather/:city ($0.01 ALGO)",
      analytics: "GET /api/analytics/* ($0.50 USDC)",
      generate: "POST /api/ai/generate ($1.00 ALGO)",
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
| `FACILITATOR_URL` | URL of the facilitator server | `https://x402.org/facilitator` |
| `AVM_PRIVATE_KEY` | Base64-encoded 64-byte key (facilitator only) | `base64string...` |
| `ALGOD_SERVER` | Algorand node URL | `https://testnet-api.algonode.cloud` |
| `ALGOD_TOKEN` | Algorand node API token | `""` |
| `PORT` | Server port | `4021` |

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
