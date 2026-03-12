# x402-avm V2 Extensions Examples

> **Python examples**: See [x402-avm-extensions-examples-python](../python/x402-avm-extensions-examples-python.md) for Python (`x402-avm[extensions]`) examples.

Comprehensive examples for the `@x402-avm/extensions` TypeScript package, covering the Bazaar discovery extension, Sign-in-with-X extension, and the `WithExtensions` type utility.

## Table of Contents

- [Installation](#installation)
- [Overview](#overview)
- [Bazaar Discovery Extension](#bazaar-discovery-extension)
  - [Concept](#concept)
  - [Resource Server: Declaring Discovery Info](#resource-server-declaring-discovery-info)
  - [Resource Server: Using bazaarResourceServerExtension](#resource-server-using-bazaarresourceserverextension)
  - [Facilitator: Extracting Discovery Info](#facilitator-extracting-discovery-info)
  - [Facilitator Client: Querying the Bazaar](#facilitator-client-querying-the-bazaar)
- [WithExtensions Type Utility](#withextensions-type-utility)
  - [TypeScript Usage](#typescript-usage)
  - [Chaining Multiple Extensions](#chaining-multiple-extensions)
- [Sign-in-with-X Extension](#sign-in-with-x-extension)
  - [Concept](#sign-in-with-x-concept)
  - [TypeScript Usage](#sign-in-with-x-typescript-usage)
- [Complete Examples](#complete-examples)
  - [Resource Server with Bazaar Discovery](#resource-server-with-bazaar-discovery)
  - [Facilitator with Bazaar Cataloging](#facilitator-with-bazaar-cataloging)

---

## Installation

```bash
npm install @x402-avm/extensions @x402-avm/core
```

For full AVM support:

```bash
npm install @x402-avm/extensions @x402-avm/core @x402-avm/avm algosdk
```

---

## Overview

x402-avm extensions add optional capabilities on top of the core payment protocol. Extensions are designed to be composable -- you can use one, many, or none.

| Extension | Purpose | Status |
|-----------|---------|--------|
| **Bazaar** | Resource discovery and cataloging for facilitators | Stable |
| **Sign-in-with-X** | Authentication via payment proof | In Development |

Extensions work at two levels:
1. **Resource Server Extensions** -- Enrich the `PaymentRequired` response with extension-specific data
2. **Facilitator Extensions** -- Extract and process extension data during verification/settlement

---

## Bazaar Discovery Extension

### Concept

The Bazaar extension enables automatic cataloging of x402-protected resources. When a resource server declares its endpoints using Bazaar discovery metadata, facilitators can index and discover paid resources.

**Architecture:**

1. Resource server declares discovery info (input params, output format)
2. Discovery info is included in the `PaymentRequired` response under `extensions.bazaar`
3. Client copies extensions to the `PaymentPayload`
4. Facilitator extracts discovery info and catalogs the resource in the Bazaar

**V2 Format:**
- `info`: Contains the actual discovery data (method, params, output examples)
- `schema`: JSON Schema that validates the structure of `info`

**V1 Compatibility:**
- Discovery info was stored in `PaymentRequirements.outputSchema`
- V1 data is automatically transformed to V2 `DiscoveryInfo` format

### Resource Server: Declaring Discovery Info

```typescript
import {
  declareDiscoveryExtension,
  BAZAAR,
} from "@x402-avm/extensions";

// ============================================================
// Example 1: GET endpoint with query parameters
// ============================================================
const weatherExtension = declareDiscoveryExtension({
  // input: example values for query parameters
  input: { city: "San Francisco", units: "metric" },
  // inputSchema: JSON Schema describing the query parameters
  inputSchema: {
    properties: {
      city: { type: "string", description: "City name" },
      units: {
        type: "string",
        enum: ["metric", "imperial"],
        description: "Temperature units",
      },
    },
    required: ["city"],
  },
  // output: example response
  output: {
    example: {
      temperature: 18.5,
      condition: "Partly Cloudy",
      humidity: 65,
    },
    schema: {
      properties: {
        temperature: { type: "number" },
        condition: { type: "string" },
        humidity: { type: "number" },
      },
    },
  },
});

// Result: { bazaar: { info: {...}, schema: {...} } }
// The HTTP method is filled in at runtime by bazaarResourceServerExtension

// ============================================================
// Example 2: GET endpoint with no input (simple data retrieval)
// ============================================================
const priceExtension = declareDiscoveryExtension({
  output: {
    example: {
      price: 42000.50,
      currency: "USD",
      timestamp: "2025-01-01T00:00:00Z",
    },
  },
});

// ============================================================
// Example 3: POST endpoint with JSON body
// ============================================================
const analysisExtension = declareDiscoveryExtension({
  bodyType: "json",
  input: {
    text: "Analyze this text for sentiment",
    language: "en",
  },
  inputSchema: {
    properties: {
      text: { type: "string", maxLength: 10000 },
      language: { type: "string", enum: ["en", "es", "fr", "de"] },
    },
    required: ["text"],
  },
  output: {
    example: {
      sentiment: "positive",
      confidence: 0.92,
      keywords: ["analyze", "sentiment"],
    },
  },
});

// ============================================================
// Example 4: POST endpoint with form-data body
// ============================================================
const uploadExtension = declareDiscoveryExtension({
  bodyType: "form-data",
  input: {
    file: "(binary)",
    description: "A photo to process",
  },
  inputSchema: {
    properties: {
      file: { type: "string", format: "binary" },
      description: { type: "string" },
    },
    required: ["file"],
  },
  output: {
    example: {
      processedUrl: "https://cdn.example.com/processed/abc123.jpg",
      width: 1920,
      height: 1080,
    },
  },
});
```

### Resource Server: Using bazaarResourceServerExtension

The `bazaarResourceServerExtension` enriches the discovery declaration at request time by narrowing the HTTP method to the actual method used.

```typescript
import {
  x402HTTPResourceServer,
  HTTPFacilitatorClient,
} from "@x402-avm/core/server";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
  BAZAAR,
} from "@x402-avm/extensions";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

// Create resource server
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.example.com",
});

const httpServer = new x402HTTPResourceServer(facilitatorClient, {
  routes: [
    {
      path: "/api/weather",
      config: {
        scheme: "exact",
        payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
        price: {
          asset: USDC_TESTNET_ASA_ID,
          amount: "10000",
          extra: { name: "USDC", decimals: 6 },
        },
        network: ALGORAND_TESTNET_CAIP2,
        maxTimeoutSeconds: 60,
      },
      description: "Weather data API",
      mimeType: "application/json",
    },
  ],
});

// Register AVM scheme
registerExactAvmScheme(httpServer.resourceServer);

// Register the bazaar extension on the resource server
httpServer.resourceServer.registerExtension(bazaarResourceServerExtension);

// Now, when the resource server builds a PaymentRequired response,
// it will include the bazaar discovery extension.
// The bazaarResourceServerExtension.enrichDeclaration hook
// automatically narrows the method to the actual HTTP method (e.g., "GET").

// For each protected route, declare its discovery metadata:
const weatherDiscovery = declareDiscoveryExtension({
  input: { city: "San Francisco" },
  inputSchema: {
    properties: {
      city: { type: "string" },
    },
    required: ["city"],
  },
  output: {
    example: { temperature: 72, condition: "Sunny" },
  },
});

// Include in the PaymentRequired response extensions
// (this is handled by the route config or manually):
const paymentRequired = httpServer.resourceServer.createPaymentRequired(
  {
    url: "https://api.example.com/weather",
    description: "Weather data API",
    mimeType: "application/json",
  },
  [/* resource configs */],
  // Extensions are passed here:
  weatherDiscovery,
);
```

### Facilitator: Extracting Discovery Info

```typescript
import {
  extractDiscoveryInfo,
  validateDiscoveryExtension,
  validateAndExtract,
  extractDiscoveryInfoFromExtension,
  BAZAAR,
  type DiscoveryInfo,
  type DiscoveredResource,
  type ValidationResult,
} from "@x402-avm/extensions";
import type { PaymentPayload, PaymentRequirements } from "@x402-avm/core/types";

// ============================================================
// Method 1: Full extraction from payload + requirements
// ============================================================
async function processPaymentWithDiscovery(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
) {
  // extractDiscoveryInfo handles both V2 and V1 formats automatically
  const discovered: DiscoveredResource | null = extractDiscoveryInfo(
    paymentPayload,
    paymentRequirements,
  );

  if (discovered) {
    console.log("Resource URL:", discovered.resourceUrl);
    console.log("HTTP Method:", discovered.method);
    console.log("x402 Version:", discovered.x402Version);
    console.log("Description:", discovered.description);
    console.log("MIME Type:", discovered.mimeType);
    console.log("Discovery Info:", discovered.discoveryInfo);

    // Catalog in the Bazaar
    await catalogResource(discovered);
  }
}

// ============================================================
// Method 2: Direct extension validation
// ============================================================
function validateExtension(extension: unknown) {
  const result: ValidationResult = validateDiscoveryExtension(
    extension as any,
  );

  if (result.valid) {
    console.log("Extension is valid");
  } else {
    console.error("Validation errors:", result.errors);
  }
}

// ============================================================
// Method 3: Validate and extract in one step
// ============================================================
function processExtension(extension: unknown) {
  const { valid, info, errors } = validateAndExtract(extension as any);

  if (valid && info) {
    console.log("Method:", info.input.method);
    console.log("Type:", info.input.type);

    // Check if it's a query-based or body-based endpoint
    if ("queryParams" in info.input) {
      console.log("Query params:", info.input.queryParams);
    }
    if ("body" in info.input) {
      console.log("Body type:", (info.input as any).bodyType);
      console.log("Body:", (info.input as any).body);
    }

    if (info.output) {
      console.log("Output example:", info.output.example);
    }
  } else {
    console.error("Invalid:", errors);
  }
}

// ============================================================
// Method 4: Extract from extension directly (lower-level)
// ============================================================
function extractDirect(extension: unknown) {
  try {
    const info: DiscoveryInfo = extractDiscoveryInfoFromExtension(
      extension as any,
      true, // validate
    );
    console.log("Extracted:", info);
  } catch (err) {
    console.error("Failed:", err);
  }
}

// ============================================================
// Method 5: Skip validation (when you trust the source)
// ============================================================
function extractWithoutValidation(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
) {
  const discovered = extractDiscoveryInfo(
    paymentPayload,
    paymentRequirements,
    false, // skip validation
  );

  if (discovered) {
    // Use directly without schema validation
    console.log("Resource:", discovered.resourceUrl);
  }
}
```

### Facilitator Client: Querying the Bazaar

```typescript
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import {
  withBazaar,
  type BazaarClientExtension,
  type DiscoveryResourcesResponse,
  type DiscoveryResource,
  type ListDiscoveryResourcesParams,
} from "@x402-avm/extensions";

// ============================================================
// Basic usage
// ============================================================
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.example.com",
});

// Extend with Bazaar capabilities
const client = withBazaar(facilitatorClient);

// List all discovered resources
const allResources: DiscoveryResourcesResponse =
  await client.extensions.discovery.listResources();

console.log("Total resources:", allResources.pagination.total);
for (const resource of allResources.items) {
  console.log(`- ${resource.resource} (${resource.type})`);
  console.log(`  Payment: ${resource.accepts.length} method(s)`);
  console.log(`  Updated: ${resource.lastUpdated}`);
}

// ============================================================
// Filtered query
// ============================================================
const httpResources = await client.extensions.discovery.listResources({
  type: "http",
  limit: 10,
  offset: 0,
});

// ============================================================
// Pagination
// ============================================================
async function getAllResources() {
  const allItems: DiscoveryResource[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const page = await client.extensions.discovery.listResources({
      limit,
      offset,
    });

    allItems.push(...page.items);

    if (allItems.length >= page.pagination.total) {
      break;
    }
    offset += limit;
  }

  return allItems;
}

// ============================================================
// Finding Algorand-compatible resources
// ============================================================
async function findAlgorandResources() {
  const resources = await client.extensions.discovery.listResources({
    type: "http",
  });

  return resources.items.filter((resource) =>
    resource.accepts.some((req) =>
      req.network.startsWith("algorand:"),
    ),
  );
}
```

---

## WithExtensions Type Utility

### TypeScript Usage

The `WithExtensions<T, E>` type utility properly merges extension types when chaining.

```typescript
import { WithExtensions } from "@x402-avm/extensions";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";

// Type definition:
// type WithExtensions<T, E> = T extends { extensions: infer Existing }
//   ? Omit<T, "extensions"> & { extensions: Existing & E }
//   : T & { extensions: E };

// When T has no existing extensions:
type ClientWithBazaar = WithExtensions<
  HTTPFacilitatorClient,
  { discovery: { listResources(): Promise<any> } }
>;
// Result: HTTPFacilitatorClient & { extensions: { discovery: { listResources(): Promise<any> } } }

// When T already has extensions (chaining):
type ClientWithBazaarAndAuth = WithExtensions<
  ClientWithBazaar,
  { auth: { login(): Promise<void> } }
>;
// Result: HTTPFacilitatorClient & { extensions: { discovery: ..., auth: ... } }
```

### Chaining Multiple Extensions

```typescript
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { withBazaar } from "@x402-avm/extensions";

// Define a custom extension
interface MyCustomExtension {
  custom: {
    doSomething(): Promise<string>;
  };
}

function withCustom<T extends HTTPFacilitatorClient>(
  client: T,
): T & { extensions: MyCustomExtension } {
  const extended = client as T & { extensions: MyCustomExtension };
  const existingExtensions =
    (client as any).extensions ?? {};

  extended.extensions = {
    ...existingExtensions,
    custom: {
      async doSomething() {
        return "done";
      },
    },
  } as any;

  return extended;
}

// Chain extensions -- order does not matter
const client = withBazaar(withCustom(new HTTPFacilitatorClient({
  url: "https://facilitator.example.com",
})));

// All extension methods are available with full type safety
const resources = await client.extensions.discovery.listResources();
const result = await client.extensions.custom.doSomething();
```

---

## Sign-in-with-X Extension

### Sign-in-with-X Concept

The Sign-in-with-X extension enables authentication through payment proof. When a client makes a payment, the facilitator can verify not just the payment but also the identity of the payer.

**Note:** This extension is currently in development. The interface below represents the planned API.

### Sign-in-with-X TypeScript Usage

```typescript
// Planned API (in development)
import { signInWithX } from "@x402-avm/extensions";

// Resource server declares sign-in requirement
const signInConfig = {
  // The resource requires authentication via payment
  requireAuth: true,
  // Accepted chains for identity verification
  acceptedChains: [
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
    "eip155:8453",
  ],
};

// Client-side: the payment header implicitly proves identity
// The facilitator verifies:
// 1. The payment is valid
// 2. The sender address matches the expected user
// 3. The transaction is on an accepted chain

// Resource server can then map the payer address to a user:
function getUserFromPayment(settleResult: any) {
  if (settleResult.success) {
    const payerAddress = settleResult.payer;
    const network = settleResult.network;

    // Look up or create user by their chain address
    return getOrCreateUser(payerAddress, network);
  }
}
```

---

## Complete Examples

### Resource Server with Bazaar Discovery

A complete Express.js resource server with Bazaar discovery for Algorand payments.

```typescript
// server.ts
import express from "express";
import {
  x402HTTPResourceServer,
  HTTPFacilitatorClient,
} from "@x402-avm/core/server";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
  BAZAAR,
} from "@x402-avm/extensions";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

const app = express();

// Setup facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://facilitator.example.com",
});

// Create HTTP resource server
const httpServer = new x402HTTPResourceServer(facilitatorClient, {
  routes: [
    {
      path: "/api/weather",
      config: {
        scheme: "exact",
        payTo: process.env.RECEIVER_ADDRESS!,
        price: {
          asset: USDC_TESTNET_ASA_ID,
          amount: "10000",  // 0.01 USDC
          extra: { name: "USDC", decimals: 6 },
        },
        network: ALGORAND_TESTNET_CAIP2,
        maxTimeoutSeconds: 60,
      },
      description: "Real-time weather data",
      mimeType: "application/json",
    },
    {
      path: "/api/analyze",
      config: {
        scheme: "exact",
        payTo: process.env.RECEIVER_ADDRESS!,
        price: {
          asset: USDC_TESTNET_ASA_ID,
          amount: "500000",  // 0.50 USDC
          extra: { name: "USDC", decimals: 6 },
        },
        network: ALGORAND_TESTNET_CAIP2,
        maxTimeoutSeconds: 120,
      },
      description: "AI text analysis",
      mimeType: "application/json",
    },
  ],
});

// Register AVM scheme and bazaar extension
registerExactAvmScheme(httpServer.resourceServer);
httpServer.resourceServer.registerExtension(bazaarResourceServerExtension);

// Declare discovery metadata for each endpoint
const weatherDiscovery = declareDiscoveryExtension({
  input: { city: "San Francisco", units: "metric" },
  inputSchema: {
    properties: {
      city: { type: "string" },
      units: { type: "string", enum: ["metric", "imperial"] },
    },
    required: ["city"],
  },
  output: {
    example: {
      temperature: 18.5,
      condition: "Partly Cloudy",
      humidity: 65,
      windSpeed: 12.3,
    },
  },
});

const analysisDiscovery = declareDiscoveryExtension({
  bodyType: "json",
  input: { text: "Sample text for analysis", language: "en" },
  inputSchema: {
    properties: {
      text: { type: "string", maxLength: 50000 },
      language: { type: "string" },
    },
    required: ["text"],
  },
  output: {
    example: {
      sentiment: "neutral",
      confidence: 0.85,
      entities: ["person", "location"],
      summary: "A brief summary of the analyzed text.",
    },
  },
});

// Weather endpoint
app.get("/api/weather", async (req, res) => {
  const result = await httpServer.processRequest({
    url: req.url,
    method: req.method,
    headers: req.headers,
    adapter: {
      getHeader: (name: string) => req.headers[name.toLowerCase()] as string,
    },
    // Pass discovery extensions for the PaymentRequired response
    extensions: weatherDiscovery,
  });

  if (result.status === 402) {
    return res.status(402).json(result.body);
  }

  // Return weather data
  const city = (req.query.city as string) || "San Francisco";
  res.json({
    temperature: 18.5,
    condition: "Partly Cloudy",
    humidity: 65,
    windSpeed: 12.3,
    city,
  });
});

// Analysis endpoint
app.post("/api/analyze", express.json(), async (req, res) => {
  const result = await httpServer.processRequest({
    url: req.url,
    method: req.method,
    headers: req.headers,
    adapter: {
      getHeader: (name: string) => req.headers[name.toLowerCase()] as string,
    },
    extensions: analysisDiscovery,
  });

  if (result.status === 402) {
    return res.status(402).json(result.body);
  }

  // Perform analysis
  const { text, language } = req.body;
  res.json({
    sentiment: "neutral",
    confidence: 0.85,
    entities: ["person", "location"],
    summary: `Analysis of ${text.length} characters in ${language || "en"}.`,
  });
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
  console.log(`Resource server with Bazaar discovery on port ${PORT}`);
});
```

### Facilitator with Bazaar Cataloging

```typescript
// facilitator-with-bazaar.ts
import express from "express";
import { x402Facilitator } from "@x402-avm/core/facilitator";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/facilitator";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";
import {
  extractDiscoveryInfo,
  type DiscoveredResource,
} from "@x402-avm/extensions";

// In-memory catalog (use a database in production)
const catalog: Map<string, DiscoveredResource & { settledCount: number }> = new Map();

// Create facilitator (signer setup omitted for brevity)
const facilitator = new x402Facilitator();
registerExactAvmScheme(facilitator, {
  signer: facilitatorSigner,
  networks: ALGORAND_TESTNET_CAIP2,
});

// Register after-settle hook to catalog discovered resources
facilitator.onAfterSettle(async (context) => {
  if (context.result.success) {
    const discovered = extractDiscoveryInfo(
      context.paymentPayload,
      context.requirements,
    );

    if (discovered) {
      const key = `${discovered.method}:${discovered.resourceUrl}`;
      const existing = catalog.get(key);

      if (existing) {
        existing.settledCount += 1;
      } else {
        catalog.set(key, { ...discovered, settledCount: 1 });
      }

      console.log(`Cataloged: ${key} (${catalog.get(key)!.settledCount} settlements)`);
    }
  }
});

const app = express();
app.use(express.json());

// Standard facilitator endpoints
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

// Bazaar discovery endpoint
app.get("/discovery/resources", (req, res) => {
  const type = req.query.type as string | undefined;
  const limit = parseInt(req.query.limit as string || "50", 10);
  const offset = parseInt(req.query.offset as string || "0", 10);

  let items = Array.from(catalog.values());

  // Filter by type
  if (type) {
    items = items.filter(
      (r) => r.discoveryInfo.input.type === type,
    );
  }

  // Paginate
  const total = items.length;
  const paged = items.slice(offset, offset + limit);

  res.json({
    x402Version: 2,
    items: paged.map((r) => ({
      resource: r.resourceUrl,
      type: r.discoveryInfo.input.type,
      x402Version: r.x402Version,
      accepts: [],  // Populated from stored payment requirements
      lastUpdated: new Date().toISOString(),
      metadata: {
        method: r.method,
        description: r.description,
        mimeType: r.mimeType,
        settledCount: r.settledCount,
      },
    })),
    pagination: { limit, offset, total },
  });
});

app.listen(4000, () => {
  console.log("Facilitator with Bazaar discovery on port 4000");
});
```

---

## Summary

| Feature | TypeScript Import |
|---------|-------------------|
| Bazaar Extension Key | `BAZAAR` from `@x402-avm/extensions` |
| Declare Discovery | `declareDiscoveryExtension(config)` |
| Server Extension | `bazaarResourceServerExtension` from `@x402-avm/extensions` |
| Extract Discovery | `extractDiscoveryInfo(payload, req)` from `@x402-avm/extensions` |
| Validate Extension | `validateDiscoveryExtension(ext)` from `@x402-avm/extensions` |
| Validate + Extract | `validateAndExtract(ext)` from `@x402-avm/extensions` |
| Client Extension | `withBazaar(client)` from `@x402-avm/extensions` |
| Type Utility | `WithExtensions<T, E>` from `@x402-avm/extensions` |
| Sign-in-with-X | In development |
