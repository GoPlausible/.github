# x402-avm V2 Extensions Examples

Comprehensive examples for the `@x402-avm/extensions` TypeScript package and `x402-avm[extensions]` Python package, covering the Bazaar discovery extension, Sign-in-with-X extension, and the `WithExtensions` type utility.

## Table of Contents

- [Installation](#installation)
- [Overview](#overview)
- [Bazaar Discovery Extension](#bazaar-discovery-extension)
  - [Concept](#concept)
  - [Resource Server: Declaring Discovery Info (TypeScript)](#resource-server-declaring-discovery-info-typescript)
  - [Resource Server: Declaring Discovery Info (Python)](#resource-server-declaring-discovery-info-python)
  - [Resource Server: Using bazaarResourceServerExtension](#resource-server-using-bazaarresourceserverextension)
  - [Facilitator: Extracting Discovery Info (TypeScript)](#facilitator-extracting-discovery-info-typescript)
  - [Facilitator: Extracting Discovery Info (Python)](#facilitator-extracting-discovery-info-python)
  - [Facilitator Client: Querying the Bazaar (TypeScript)](#facilitator-client-querying-the-bazaar-typescript)
  - [Facilitator Client: Querying the Bazaar (Python)](#facilitator-client-querying-the-bazaar-python)
- [WithExtensions Type Utility](#withextensions-type-utility)
  - [TypeScript Usage](#typescript-usage)
  - [Chaining Multiple Extensions](#chaining-multiple-extensions)
- [Sign-in-with-X Extension](#sign-in-with-x-extension)
  - [Concept](#sign-in-with-x-concept)
  - [TypeScript Usage](#sign-in-with-x-typescript-usage)
  - [Python Usage](#sign-in-with-x-python-usage)
- [Complete Examples](#complete-examples)
  - [Resource Server with Bazaar Discovery (TypeScript)](#resource-server-with-bazaar-discovery-typescript)
  - [Resource Server with Bazaar Discovery (Python)](#resource-server-with-bazaar-discovery-python)
  - [Facilitator with Bazaar Cataloging (TypeScript)](#facilitator-with-bazaar-cataloging-typescript)
  - [Facilitator with Bazaar Cataloging (Python)](#facilitator-with-bazaar-cataloging-python)

---

## Installation

### TypeScript

```bash
npm install @x402-avm/extensions @x402-avm/core
```

For full AVM support:

```bash
npm install @x402-avm/extensions @x402-avm/core @x402-avm/avm algosdk
```

### Python

```bash
pip install "x402-avm[extensions]"
```

For full AVM support:

```bash
pip install "x402-avm[extensions,avm]"
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

### Resource Server: Declaring Discovery Info (TypeScript)

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

### Resource Server: Declaring Discovery Info (Python)

```python
# Python equivalent of declareDiscoveryExtension
# The discovery extension is a dictionary structure

BAZAAR = "bazaar"

def declare_discovery_extension_get(
    input_params: dict | None = None,
    input_schema: dict | None = None,
    output_example: dict | None = None,
    output_schema: dict | None = None,
) -> dict:
    """Declare a GET endpoint discovery extension."""
    info = {
        "input": {
            "type": "http",
            **({"queryParams": input_params} if input_params else {}),
        },
    }
    if output_example:
        info["output"] = {"type": "json", "example": output_example}

    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "input": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "const": "http"},
                    "method": {"type": "string", "enum": ["GET", "HEAD", "DELETE"]},
                    **(
                        {"queryParams": {"type": "object", **(input_schema or {})}}
                        if input_schema
                        else {}
                    ),
                },
                "required": ["type"],
                "additionalProperties": False,
            },
        },
        "required": ["input"],
    }
    if output_example and output_schema:
        schema["properties"]["output"] = {
            "type": "object",
            "properties": {
                "type": {"type": "string"},
                "example": {"type": "object", **output_schema},
            },
            "required": ["type"],
        }

    return {BAZAAR: {"info": info, "schema": schema}}


def declare_discovery_extension_post(
    body_type: str,
    input_body: dict | None = None,
    input_schema: dict | None = None,
    output_example: dict | None = None,
    output_schema: dict | None = None,
) -> dict:
    """Declare a POST/PUT/PATCH endpoint discovery extension."""
    info = {
        "input": {
            "type": "http",
            "bodyType": body_type,
            "body": input_body or {},
        },
    }
    if output_example:
        info["output"] = {"type": "json", "example": output_example}

    schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "input": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "const": "http"},
                    "method": {"type": "string", "enum": ["POST", "PUT", "PATCH"]},
                    "bodyType": {"type": "string", "enum": ["json", "form-data", "text"]},
                    "body": input_schema or {},
                },
                "required": ["type", "bodyType", "body"],
                "additionalProperties": False,
            },
        },
        "required": ["input"],
    }

    return {BAZAAR: {"info": info, "schema": schema}}


# Usage examples:

# GET endpoint with query params
weather_extension = declare_discovery_extension_get(
    input_params={"city": "San Francisco", "units": "metric"},
    input_schema={
        "properties": {
            "city": {"type": "string"},
            "units": {"type": "string", "enum": ["metric", "imperial"]},
        },
        "required": ["city"],
    },
    output_example={
        "temperature": 18.5,
        "condition": "Partly Cloudy",
    },
)

# POST endpoint with JSON body
analysis_extension = declare_discovery_extension_post(
    body_type="json",
    input_body={"text": "Analyze this text", "language": "en"},
    input_schema={
        "properties": {
            "text": {"type": "string"},
            "language": {"type": "string"},
        },
        "required": ["text"],
    },
    output_example={"sentiment": "positive", "confidence": 0.92},
)
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

### Facilitator: Extracting Discovery Info (TypeScript)

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

### Facilitator: Extracting Discovery Info (Python)

```python
# Python equivalent of discovery info extraction

BAZAAR = "bazaar"


def extract_discovery_info(
    payment_payload: dict,
    payment_requirements: dict,
    validate: bool = True,
) -> dict | None:
    """
    Extract discovery info from payment payload and requirements.
    Handles both V2 (extensions) and V1 (outputSchema) formats.
    """
    x402_version = payment_payload.get("x402Version", 1)

    if x402_version == 2:
        extensions = payment_payload.get("extensions", {})
        bazaar_ext = extensions.get(BAZAAR)
        if not bazaar_ext:
            return None

        info = bazaar_ext.get("info")
        if not info:
            return None

        # Optional: validate info against schema
        if validate:
            schema = bazaar_ext.get("schema")
            if schema:
                # Use jsonschema library for validation
                try:
                    import jsonschema
                    jsonschema.validate(info, schema)
                except jsonschema.ValidationError as e:
                    print(f"Validation failed: {e.message}")
                    return None

        resource = payment_payload.get("resource", {})
        return {
            "resourceUrl": resource.get("url", ""),
            "description": resource.get("description"),
            "mimeType": resource.get("mimeType"),
            "method": info.get("input", {}).get("method", "GET"),
            "x402Version": 2,
            "discoveryInfo": info,
        }

    elif x402_version == 1:
        # V1: discovery info in outputSchema
        output_schema = payment_requirements.get("outputSchema")
        if not output_schema:
            return None

        return {
            "resourceUrl": payment_requirements.get("resource", ""),
            "description": payment_requirements.get("description"),
            "mimeType": payment_requirements.get("mimeType"),
            "method": "GET",  # V1 default
            "x402Version": 1,
            "discoveryInfo": _transform_v1_to_v2(output_schema),
        }

    return None


def _transform_v1_to_v2(output_schema: dict) -> dict:
    """Transform V1 outputSchema to V2 DiscoveryInfo format."""
    return {
        "input": {
            "type": "http",
            "method": "GET",
        },
        "output": {
            "type": "json",
            "example": output_schema,
        },
    }


# Usage:
discovered = extract_discovery_info(payment_payload, payment_requirements)
if discovered:
    print(f"Found: {discovered['resourceUrl']}")
    print(f"Method: {discovered['method']}")
    print(f"Version: {discovered['x402Version']}")
    # Catalog in your database
```

### Facilitator Client: Querying the Bazaar (TypeScript)

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

### Facilitator Client: Querying the Bazaar (Python)

```python
import httpx


class BazaarClient:
    """Client for querying the Bazaar discovery service."""

    def __init__(self, facilitator_url: str, auth_token: str | None = None):
        self._url = facilitator_url
        self._headers = {}
        if auth_token:
            self._headers["Authorization"] = f"Bearer {auth_token}"

    async def list_resources(
        self,
        type_filter: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """List discovered x402 resources from the Bazaar."""
        params = {"limit": str(limit), "offset": str(offset)}
        if type_filter:
            params["type"] = type_filter

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self._url}/discovery/resources",
                params=params,
                headers=self._headers,
            )
            response.raise_for_status()
            return response.json()

    async def find_algorand_resources(self) -> list[dict]:
        """Find all resources that accept Algorand payments."""
        data = await self.list_resources(type_filter="http")
        return [
            resource
            for resource in data.get("items", [])
            if any(
                req.get("network", "").startswith("algorand:")
                for req in resource.get("accepts", [])
            )
        ]


# Usage:
bazaar = BazaarClient("https://facilitator.example.com")
resources = await bazaar.list_resources(type_filter="http", limit=10)
print(f"Found {resources['pagination']['total']} resources")

algorand_resources = await bazaar.find_algorand_resources()
for r in algorand_resources:
    print(f"  {r['resource']} - {len(r['accepts'])} payment method(s)")
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

### Sign-in-with-X Python Usage

```python
# Planned API (in development)

# Resource server can extract payer identity from settlement result
def get_user_from_payment(settle_result: dict) -> dict | None:
    """Extract user identity from a settled payment."""
    if settle_result.get("success"):
        payer_address = settle_result.get("payer")
        network = settle_result.get("network")

        # Map chain address to user
        return get_or_create_user(payer_address, network)
    return None


# For Algorand specifically, the address is deterministic:
# - Same private key always produces the same address
# - Address can be used as a stable identity
# - Works across testnet and mainnet (same key, same address)

def get_or_create_user(address: str, network: str) -> dict:
    """Look up or create a user by their Algorand address."""
    # Your database logic here
    user = db.users.find_one({"algorand_address": address})
    if not user:
        user = db.users.insert_one({
            "algorand_address": address,
            "network": network,
            "created_at": datetime.utcnow(),
        })
    return user
```

---

## Complete Examples

### Resource Server with Bazaar Discovery (TypeScript)

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

### Resource Server with Bazaar Discovery (Python)

```python
# server.py - FastAPI resource server with Bazaar discovery
import os
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from x402 import x402ResourceServer
from x402.mechanisms.avm.exact import register_exact_avm_server
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.constants import USDC_TESTNET_ASA_ID

app = FastAPI(title="x402-avm Resource Server with Bazaar")

server = x402ResourceServer(
    facilitator_url=os.environ.get("FACILITATOR_URL", "https://facilitator.example.com")
)
register_exact_avm_server(server)

RECEIVER = os.environ["RECEIVER_ADDRESS"]

weather_config = {
    "scheme": "exact",
    "payTo": RECEIVER,
    "price": {
        "asset": str(USDC_TESTNET_ASA_ID),
        "amount": "10000",
        "extra": {"name": "USDC", "decimals": 6},
    },
    "network": ALGORAND_TESTNET_CAIP2,
    "maxTimeoutSeconds": 60,
}

# Bazaar discovery metadata for the weather endpoint
weather_discovery = {
    "bazaar": {
        "info": {
            "input": {
                "type": "http",
                "method": "GET",
                "queryParams": {"city": "San Francisco", "units": "metric"},
            },
            "output": {
                "type": "json",
                "example": {
                    "temperature": 18.5,
                    "condition": "Partly Cloudy",
                    "humidity": 65,
                },
            },
        },
        "schema": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "properties": {
                "input": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "const": "http"},
                        "method": {"type": "string", "enum": ["GET"]},
                        "queryParams": {
                            "type": "object",
                            "properties": {
                                "city": {"type": "string"},
                                "units": {"type": "string", "enum": ["metric", "imperial"]},
                            },
                            "required": ["city"],
                        },
                    },
                    "required": ["type", "method"],
                },
            },
            "required": ["input"],
        },
    }
}


@app.get("/api/weather")
async def weather(request: Request, city: str = "San Francisco", units: str = "metric"):
    x_payment = request.headers.get("X-PAYMENT")

    if not x_payment:
        payment_required = server.create_payment_required(
            url=str(request.url),
            description="Real-time weather data",
            mime_type="application/json",
            configs=[weather_config],
            extensions=weather_discovery,
        )
        return JSONResponse(content=payment_required, status_code=402)

    result = await server.process_payment(x_payment, weather_config)
    if not result.verified:
        return JSONResponse(content={"error": result.error}, status_code=402)

    return {
        "temperature": 18.5,
        "condition": "Partly Cloudy",
        "humidity": 65,
        "windSpeed": 12.3,
        "city": city,
        "units": units,
    }
```

### Facilitator with Bazaar Cataloging (TypeScript)

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

### Facilitator with Bazaar Cataloging (Python)

```python
# facilitator_with_bazaar.py
import os
from datetime import datetime
from fastapi import FastAPI, Request, Query
from fastapi.responses import JSONResponse
from x402 import x402Facilitator
from x402.mechanisms.avm.exact import register_exact_avm_facilitator
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2

app = FastAPI(title="x402-avm Facilitator with Bazaar")

# In-memory catalog
catalog: dict[str, dict] = {}

BAZAAR = "bazaar"


def extract_and_catalog(payment_payload: dict, requirements: dict, settle_result: dict):
    """Extract discovery info and catalog the resource."""
    if not settle_result.get("success"):
        return

    x402_version = payment_payload.get("x402Version", 1)
    discovered = None

    if x402_version == 2:
        extensions = payment_payload.get("extensions", {})
        bazaar_ext = extensions.get(BAZAAR)
        if bazaar_ext:
            info = bazaar_ext.get("info", {})
            resource = payment_payload.get("resource", {})
            discovered = {
                "resourceUrl": resource.get("url", ""),
                "description": resource.get("description"),
                "mimeType": resource.get("mimeType"),
                "method": info.get("input", {}).get("method", "GET"),
                "x402Version": 2,
                "discoveryInfo": info,
            }
    elif x402_version == 1:
        output_schema = requirements.get("outputSchema")
        if output_schema:
            discovered = {
                "resourceUrl": requirements.get("resource", ""),
                "description": requirements.get("description"),
                "mimeType": requirements.get("mimeType"),
                "method": "GET",
                "x402Version": 1,
                "discoveryInfo": {
                    "input": {"type": "http", "method": "GET"},
                    "output": {"type": "json", "example": output_schema},
                },
            }

    if discovered:
        key = f"{discovered['method']}:{discovered['resourceUrl']}"
        if key in catalog:
            catalog[key]["settledCount"] += 1
            catalog[key]["lastUpdated"] = datetime.utcnow().isoformat()
        else:
            catalog[key] = {
                **discovered,
                "settledCount": 1,
                "lastUpdated": datetime.utcnow().isoformat(),
            }
        print(f"Cataloged: {key} ({catalog[key]['settledCount']} settlements)")


# Initialize facilitator (signer setup from previous examples)
facilitator = x402Facilitator()
register_exact_avm_facilitator(
    facilitator, signer, networks=[ALGORAND_TESTNET_CAIP2]
)


@app.post("/verify")
async def verify(request: Request):
    body = await request.json()
    result = await facilitator.verify(
        body["paymentPayload"], body["paymentRequirements"]
    )
    return result


@app.post("/settle")
async def settle(request: Request):
    body = await request.json()
    result = await facilitator.settle(
        body["paymentPayload"], body["paymentRequirements"]
    )

    # Catalog after successful settlement
    extract_and_catalog(
        body["paymentPayload"],
        body["paymentRequirements"],
        result,
    )

    return result


@app.get("/discovery/resources")
async def discovery_resources(
    type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List discovered x402 resources from the Bazaar catalog."""
    items = list(catalog.values())

    # Filter by type
    if type:
        items = [
            r for r in items
            if r.get("discoveryInfo", {}).get("input", {}).get("type") == type
        ]

    total = len(items)
    paged = items[offset : offset + limit]

    return {
        "x402Version": 2,
        "items": [
            {
                "resource": r["resourceUrl"],
                "type": r.get("discoveryInfo", {}).get("input", {}).get("type", "http"),
                "x402Version": r["x402Version"],
                "accepts": [],
                "lastUpdated": r.get("lastUpdated", ""),
                "metadata": {
                    "method": r["method"],
                    "description": r.get("description"),
                    "mimeType": r.get("mimeType"),
                    "settledCount": r.get("settledCount", 0),
                },
            }
            for r in paged
        ],
        "pagination": {"limit": limit, "offset": offset, "total": total},
    }


# Run: uvicorn facilitator_with_bazaar:app --port 4000
```

---

## Summary

| Feature | TypeScript Import | Python Equivalent |
|---------|-------------------|-------------------|
| Bazaar Extension Key | `BAZAAR` from `@x402-avm/extensions` | `"bazaar"` string constant |
| Declare Discovery | `declareDiscoveryExtension(config)` | Manual dict construction |
| Server Extension | `bazaarResourceServerExtension` from `@x402-avm/extensions` | Manual extension in handler |
| Extract Discovery | `extractDiscoveryInfo(payload, req)` from `@x402-avm/extensions` | Custom `extract_discovery_info()` |
| Validate Extension | `validateDiscoveryExtension(ext)` from `@x402-avm/extensions` | `jsonschema.validate()` |
| Validate + Extract | `validateAndExtract(ext)` from `@x402-avm/extensions` | Combined custom function |
| Client Extension | `withBazaar(client)` from `@x402-avm/extensions` | Custom `BazaarClient` class |
| Type Utility | `WithExtensions<T, E>` from `@x402-avm/extensions` | N/A (Python uses duck typing) |
| Sign-in-with-X | In development | In development |
