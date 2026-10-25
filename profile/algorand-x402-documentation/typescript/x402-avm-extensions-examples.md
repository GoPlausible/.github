# x402-avm V2 Extensions Examples

> **Python examples**: See [x402-avm-extensions-examples-python](../python/x402-avm-extensions-examples-python.md) for Python (`x402-avm[extensions]`) examples.

Comprehensive examples for the `@x402/extensions` TypeScript package, covering the Bazaar discovery extension, Sign-in-with-X extension, and the `WithExtensions` type utility.

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
npm install @x402/extensions @x402/core
```

> **No `algosdk`:** `@x402/extensions` itself has no Algorand dependency. Algorand support comes from `@x402/avm`, which is built on `@algorandfoundation/algokit-utils` v10 (2.28.0 pins `10.0.0-alpha.46`) and has no `algosdk` dependency. If you are migrating from GoPlausible's earlier `@x402-avm/*` packages or from algosdk-based signer code, remove `algosdk` from your x402 dependencies and create signers with `toClientAvmSigner` / `toFacilitatorAvmSigner` from `@x402/avm`.

For full AVM support:

```bash
npm install @x402/extensions @x402/core @x402/avm
```

The [complete server example](#resource-server-with-bazaar-discovery) also uses `@x402/express` and `express`.

---

## Overview

x402-avm extensions add optional capabilities on top of the core payment protocol. Extensions are designed to be composable -- you can use one, many, or none.

| Extension | Purpose | Status (`@x402/extensions` 2.28.0) |
|-----------|---------|--------|
| **Bazaar** | Resource discovery and cataloging for facilitators | Available |
| **Sign-in-with-X** | Wallet authentication (CAIP-122) for previously paid or auth-only resources | Available for EVM and Solana wallets; no Algorand support |

The package also ships the `offer-receipt`, `payment-identifier` and `builder-code` extensions and the EVM-only `eip2612-gas-sponsoring` and `erc20-approval-gas-sponsoring` extensions, which this page does not cover. Everything is exported from the package root; `@x402/extensions/bazaar` and `@x402/extensions/sign-in-with-x` are also available as subpath imports.

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
} from "@x402/extensions";

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

// Result: { bazaar: { info: {...}, schema: {...} } }  (BAZAAR.key === "bazaar")
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

The `bazaarResourceServerExtension` enriches the discovery declaration at request time: it narrows the HTTP method to the method actually used and, for parameterized routes (`/users/:id`), adds `routeTemplate` and `pathParams`. Register it on the `x402ResourceServer` and put each route's declaration in the route's `extensions`.

```typescript
import {
  x402ResourceServer,
  x402HTTPResourceServer,
  HTTPFacilitatorClient,
} from "@x402/core/server";
import type { RoutesConfig } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402/extensions";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

// Create resource server with the AVM scheme and the bazaar extension
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.goplausible.xyz",
});

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme())
  .registerExtension(bazaarResourceServerExtension);

// For each protected route, declare its discovery metadata in `extensions`
const routes: RoutesConfig = {
  "GET /api/weather": {
    accepts: {
      scheme: "exact",
      payTo: "RECEIVER_ALGORAND_ADDRESS_58_CHARS_AAAAAAAAAAAAAAAAAAA",
      price: { asset: USDC_TESTNET_ASA_ID, amount: "10000" },  // 0.01 USDC
      network: ALGORAND_TESTNET_CAIP2,
      maxTimeoutSeconds: 60,
    },
    description: "Weather data API",
    mimeType: "application/json",
    extensions: {
      ...declareDiscoveryExtension({
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
      }),
    },
  },
};

const httpServer = new x402HTTPResourceServer(resourceServer, routes);
await httpServer.initialize();

// Now, when the server builds the PaymentRequired response for GET /api/weather,
// it includes extensions.bazaar, and bazaarResourceServerExtension.enrichDeclaration
// sets info.input.method to the actual HTTP method ("GET").
```

`@x402/express`, `@x402/hono` and `@x402/next` register `bazaarResourceServerExtension` automatically when any route declares `extensions.bazaar`.

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
} from "@x402/extensions";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";

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
    if ("toolName" in discovered) {
      console.log("MCP tool:", discovered.toolName);
    } else {
      console.log("HTTP Method:", discovered.method);
    }
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
    const input = info.input;
    console.log("Type:", input.type);

    if (input.type === "http") {
      console.log("Method:", input.method);
      // Check if it's a query-based or body-based endpoint
      if ("body" in input) {
        console.log("Body type:", input.bodyType);
        console.log("Body:", input.body);
      } else {
        console.log("Query params:", input.queryParams);
      }
    } else {
      console.log("MCP tool:", input.toolName);
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
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";
import {
  withBazaar,
  type BazaarClientExtension,
  type DiscoveryResourcesResponse,
  type DiscoveryResource,
  type ListDiscoveryResourcesParams,
} from "@x402/extensions";

// ============================================================
// Basic usage
// ============================================================
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.goplausible.xyz",
});

// Extend with Bazaar capabilities (listResources -> GET /discovery/resources,
// search -> GET /discovery/search)
const client = withBazaar(facilitatorClient);

// List all discovered resources
const allResources: DiscoveryResourcesResponse =
  await client.extensions.bazaar.listResources();

console.log("Total resources:", allResources.pagination.total);
for (const resource of allResources.items) {
  console.log(`- ${resource.resource} (${resource.type})`);
  console.log(`  Payment: ${resource.accepts.length} method(s)`);
  console.log(`  Updated: ${resource.lastUpdated}`);
}

// ============================================================
// Filtered query
// ============================================================
const httpResources = await client.extensions.bazaar.listResources({
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
    const page = await client.extensions.bazaar.listResources({
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
  const resources = await client.extensions.bazaar.listResources({
    type: "http",
  });

  return resources.items.filter((resource) =>
    resource.accepts.some((req) =>
      req.network.startsWith("algorand:"),
    ),
  );
}

// Or let the facilitator filter by network (optional `network` query parameter)
const testnetResources = await client.extensions.bazaar.listResources({
  network: ALGORAND_TESTNET_CAIP2,
});

// Natural-language search (only against facilitators that implement the
// optional GET /discovery/search endpoint of the Bazaar spec)
const searchResults = await client.extensions.bazaar.search({ query: "weather" });
console.log("Matches:", searchResults.resources.length);
```

---

## WithExtensions Type Utility

### TypeScript Usage

The `WithExtensions<T, E>` type utility properly merges extension types when chaining.

```typescript
import { WithExtensions } from "@x402/extensions";
import { HTTPFacilitatorClient } from "@x402/core/server";

// Type definition:
// type WithExtensions<T, E> = T extends { extensions: infer Existing }
//   ? Omit<T, "extensions"> & { extensions: Existing & E }
//   : T & { extensions: E };

// When T has no existing extensions:
type ClientWithBazaar = WithExtensions<
  HTTPFacilitatorClient,
  { bazaar: { listResources(): Promise<any> } }
>;
// Result: HTTPFacilitatorClient & { extensions: { bazaar: { listResources(): Promise<any> } } }

// When T already has extensions (chaining):
type ClientWithBazaarAndAuth = WithExtensions<
  ClientWithBazaar,
  { auth: { login(): Promise<void> } }
>;
// Result: HTTPFacilitatorClient & { extensions: { bazaar: ..., auth: ... } }
```

### Chaining Multiple Extensions

```typescript
import { HTTPFacilitatorClient } from "@x402/core/server";
import { withBazaar } from "@x402/extensions";

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
  url: "https://facilitator.goplausible.xyz",
})));

// All extension methods are available with full type safety
const resources = await client.extensions.bazaar.listResources();
const result = await client.extensions.custom.doSomething();
```

---

## Sign-in-with-X Extension

### Sign-in-with-X Concept

The Sign-in-with-X (SIWX) extension implements [CAIP-122](https://chainagnostic.org/CAIPs/caip-122) wallet authentication. The server returns a challenge in the `sign-in-with-x` extension of the 402 response, the client signs it with its wallet and sends the proof in the `SIGN-IN-WITH-X` header, and the server grants access when the signature is valid and the wallet has paid before (or the route is auth-only).

**Algorand status:** in `@x402/extensions` 2.28.0, SIWX signature verification supports EVM (`eip155:*`) and Solana (`solana:*`) only. An `algorand:*` proof is rejected (`invalid_siwx_unsupported_chain`, "Unsupported chain namespace"), so SIWX cannot authenticate Algorand wallets yet. See `@x402/extensions/sign-in-with-x` (`declareSIWxExtension`, `createSIWxResourceServerExtension`, `createSIWxClientExtension`) for EVM/Solana usage.

### Sign-in-with-X TypeScript Usage

For Algorand payers, a resource server can record who paid from the settlement result. This is application logic built on the resource server's settle hook, not part of SIWX:

```typescript
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const resourceServer = new x402ResourceServer(
  new HTTPFacilitatorClient({ url: "https://facilitator.goplausible.xyz" }),
).register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme());

// After each successful settlement, map the payer address to a user
resourceServer.onAfterSettle(async ({ result }) => {
  if (result.success && result.payer) {
    // result.payer: Algorand address of the payer
    // result.network: CAIP-2 id, e.g. "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
    // result.transaction: id of the payment (asset transfer) transaction
    await getOrCreateUser(result.payer, result.network);
  }
});
```

---

## Complete Examples

### Resource Server with Bazaar Discovery

A complete Express.js resource server with Bazaar discovery for Algorand payments, using the `@x402/express` middleware.

```typescript
// server.ts
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { RoutesConfig } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402/extensions";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";

const app = express();

// Setup facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://facilitator.goplausible.xyz",
});

// Register AVM scheme and bazaar extension
// (the middleware would also register the bazaar extension automatically)
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme())
  .registerExtension(bazaarResourceServerExtension);

// Declare payment options and discovery metadata for each endpoint
const routes: RoutesConfig = {
  "GET /api/weather": {
    accepts: {
      scheme: "exact",
      payTo: process.env.RECEIVER_ADDRESS!,
      price: { asset: USDC_TESTNET_ASA_ID, amount: "10000" },  // 0.01 USDC
      network: ALGORAND_TESTNET_CAIP2,
      maxTimeoutSeconds: 60,
    },
    description: "Real-time weather data",
    mimeType: "application/json",
    extensions: {
      ...declareDiscoveryExtension({
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
      }),
    },
  },
  "POST /api/analyze": {
    accepts: {
      scheme: "exact",
      payTo: process.env.RECEIVER_ADDRESS!,
      price: { asset: USDC_TESTNET_ASA_ID, amount: "500000" },  // 0.50 USDC
      network: ALGORAND_TESTNET_CAIP2,
      maxTimeoutSeconds: 120,
    },
    description: "AI text analysis",
    mimeType: "application/json",
    extensions: {
      ...declareDiscoveryExtension({
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
      }),
    },
  },
};

// The middleware answers unpaid requests with 402 + PAYMENT-REQUIRED (including
// extensions.bazaar), verifies PAYMENT-SIGNATURE, and settles after the handler
app.use(paymentMiddleware(routes, resourceServer));

// Weather endpoint (reached only after the payment is verified)
app.get("/api/weather", (req, res) => {
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
app.post("/api/analyze", express.json(), (req, res) => {
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
import { x402Facilitator } from "@x402/core/facilitator";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { toFacilitatorAvmSigner, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";
import {
  extractDiscoveryInfo,
  type DiscoveredResource,
} from "@x402/extensions";

// In-memory catalog (use a database in production)
type CatalogEntry = DiscoveredResource & {
  accepts: PaymentRequirements[];
  settledCount: number;
  lastUpdated: string;
};
const catalog: Map<string, CatalogEntry> = new Map();

// Create facilitator
const facilitatorSigner = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!);
const facilitator = new x402Facilitator().register(
  ALGORAND_TESTNET_CAIP2,
  new ExactAvmScheme(facilitatorSigner),
);

// Register after-settle hook to catalog discovered resources
facilitator.onAfterSettle(async (context) => {
  if (context.result.success) {
    const discovered = extractDiscoveryInfo(
      context.paymentPayload,
      context.requirements,
    );

    if (discovered) {
      const kind = "toolName" in discovered ? `MCP ${discovered.toolName}` : discovered.method;
      const key = `${kind}:${discovered.resourceUrl}`;
      const existing = catalog.get(key);

      if (existing) {
        existing.settledCount += 1;
        existing.lastUpdated = new Date().toISOString();
      } else {
        catalog.set(key, {
          ...discovered,
          accepts: [context.requirements],
          settledCount: 1,
          lastUpdated: new Date().toISOString(),
        });
      }

      console.log(`Cataloged: ${key} (${catalog.get(key)!.settledCount} settlements)`);
    }
  }
});

const app = express();
app.use(express.json());

// Standard facilitator endpoints
app.get("/supported", (_req, res) => {
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
  const result = await facilitator.settle(paymentPayload, paymentRequirements);
  res.json(result);
});

// Bazaar discovery endpoint (response shape read by withBazaar().extensions.bazaar.listResources)
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
      accepts: r.accepts,
      lastUpdated: r.lastUpdated,
      description: r.description,
      mimeType: r.mimeType,
      extensions: r.extensions,
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
| Bazaar Extension Key | `BAZAAR` from `@x402/extensions` |
| Declare Discovery | `declareDiscoveryExtension(config)` |
| Server Extension | `bazaarResourceServerExtension` from `@x402/extensions` |
| Extract Discovery | `extractDiscoveryInfo(payload, req)` from `@x402/extensions` |
| Validate Extension | `validateDiscoveryExtension(ext)` from `@x402/extensions` |
| Validate + Extract | `validateAndExtract(ext)` from `@x402/extensions` |
| Client Extension | `withBazaar(client)` from `@x402/extensions` (`client.extensions.bazaar.listResources()` / `.search()`) |
| Type Utility | `WithExtensions<T, E>` from `@x402/extensions` |
| Sign-in-with-X | `@x402/extensions/sign-in-with-x` (EVM and Solana only; no Algorand) |
