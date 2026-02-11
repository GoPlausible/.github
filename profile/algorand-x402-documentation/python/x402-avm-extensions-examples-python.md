# x402-avm Python Extensions Examples

This document covers the `x402-avm[extensions]` optional extra, which installs `jsonschema>=4.0.0` and enables the Bazaar discovery extension for the x402 payment protocol.

> **Package naming**: The PyPI package is `x402-avm`, but the Python import name is `x402`. All imports use `from x402...`, not `from x402_avm...`.

---

## 1. Installation

```bash
# Extensions only
pip install "x402-avm[extensions]"

# Extensions + Algorand support (typical for AVM projects)
pip install "x402-avm[extensions,avm]"

# Extensions + server framework + Algorand
pip install "x402-avm[extensions,avm,fastapi]"
pip install "x402-avm[extensions,avm,flask]"

# Everything (all chains, all frameworks, extensions)
pip install "x402-avm[all]"
```

The `extensions` extra adds one dependency: `jsonschema>=4.0.0`. It is required for schema validation of discovery extensions.

---

## 2. Bazaar Discovery Extension -- Concept

Bazaar is a resource discovery protocol built into x402. It allows payment-gated APIs to advertise:

- **What they accept as input** -- query parameters for GET/HEAD/DELETE endpoints, or request body schemas for POST/PUT/PATCH endpoints.
- **What they return as output** -- the shape, type, and examples of the response data.

This metadata enables facilitators to automatically catalog and index x402-enabled resources, so clients can discover APIs by their capabilities rather than just by URL. Think of it as a machine-readable menu for paid APIs.

The Bazaar extension follows a two-part structure:

- **`info`**: The actual discovery data (example input/output values).
- **`schema`**: A JSON Schema that validates the structure of `info`, ensuring correctness.

This design supports both v2 (extensions embedded in `PaymentRequired` responses) and v1 (discovery info in `PaymentRequirements.output_schema`) formats.

---

## 3. Declaring Discovery Extensions (Resource Server Side)

Resource servers use `declare_discovery_extension()` to describe their endpoints. The function returns a dict with a `"bazaar"` key ready to spread into your route's `extensions` field.

### Query-based API (GET with query parameters)

```python
from x402.extensions.bazaar import declare_discovery_extension, OutputConfig

# Declare a GET endpoint that accepts a city query parameter
# and returns weather data as JSON
discovery = declare_discovery_extension(
    input={"city": "San Francisco"},
    input_schema={
        "properties": {
            "city": {"type": "string", "description": "City name"},
        },
        "required": ["city"],
    },
    output=OutputConfig(
        example={"weather": "sunny", "temperature": 70},
        schema={
            "properties": {
                "weather": {"type": "string"},
                "temperature": {"type": "number"},
            },
            "required": ["weather", "temperature"],
        },
    ),
)
# discovery is: {"bazaar": {"info": {...}, "schema": {...}}}
```

Key points:

- The `input` parameter provides example values for the query parameters.
- The `input_schema` is a JSON Schema describing the expected query parameters.
- The `output` parameter uses `OutputConfig` with an example response and optional schema.
- The HTTP method is NOT passed here -- it is inferred from the route key (e.g., `"GET /weather"`) or injected at runtime by `bazaar_resource_server_extension`.

### Body-based API (POST with JSON body)

```python
from x402.extensions.bazaar import declare_discovery_extension, OutputConfig

# Declare a POST endpoint that accepts a JSON body
discovery = declare_discovery_extension(
    input={"prompt": "Tell me about Algorand", "max_tokens": 100},
    input_schema={
        "properties": {
            "prompt": {"type": "string", "description": "The text prompt"},
            "max_tokens": {"type": "integer", "description": "Maximum tokens"},
        },
        "required": ["prompt"],
    },
    body_type="json",  # This makes it a body extension (POST/PUT/PATCH)
    output=OutputConfig(
        example={"text": "Algorand is a...", "tokens_used": 42},
        schema={
            "properties": {
                "text": {"type": "string"},
                "tokens_used": {"type": "integer"},
            },
            "required": ["text"],
        },
    ),
)
```

The `body_type` parameter determines whether a query or body extension is created:

- `body_type=None` (default): Creates a query extension for GET/HEAD/DELETE.
- `body_type="json"`: Creates a body extension for POST/PUT/PATCH with JSON content.
- `body_type="form-data"`: Creates a body extension for form-data content.
- `body_type="text"`: Creates a body extension for plain text content.

### Minimal declaration (no output)

```python
from x402.extensions.bazaar import declare_discovery_extension

# Just describe the input -- output is optional
discovery = declare_discovery_extension(
    input={"query": "example search term"},
    input_schema={
        "properties": {"query": {"type": "string"}},
        "required": ["query"],
    },
)
```

---

## 4. Using in Route Configuration

Discovery extensions integrate with route configs through the `extensions` field. Here is how to set up an Algorand-gated API with Bazaar discovery.

### FastAPI route configuration

```python
from x402.extensions.bazaar import declare_discovery_extension, OutputConfig
from x402.http import PaymentOption
from x402.http.types import RouteConfig
from x402.schemas import Network

AVM_NETWORK: Network = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
AVM_ADDRESS = "YOUR_ALGORAND_ADDRESS..."

routes = {
    "GET /weather": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                pay_to=AVM_ADDRESS,
                price="$0.001",
                network=AVM_NETWORK,
            ),
        ],
        description="Weather report",
        mime_type="application/json",
        extensions={
            **declare_discovery_extension(
                input={"city": "San Francisco"},
                input_schema={
                    "properties": {"city": {"type": "string"}},
                    "required": ["city"],
                },
                output=OutputConfig(
                    example={"weather": "sunny", "temperature": 70},
                    schema={
                        "properties": {
                            "weather": {"type": "string"},
                            "temperature": {"type": "number"},
                        },
                        "required": ["weather", "temperature"],
                    },
                ),
            )
        },
    ),
}
```

The `**declare_discovery_extension(...)` spread merges the `{"bazaar": {...}}` dict into the `extensions` dict of the route config.

### Multi-chain route (Algorand + EVM)

```python
routes = {
    "GET /weather": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                pay_to=AVM_ADDRESS,
                price="$0.001",
                network="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
            ),
            PaymentOption(
                scheme="exact",
                pay_to=EVM_ADDRESS,
                price="$0.001",
                network="eip155:84532",
            ),
        ],
        extensions={
            **declare_discovery_extension(
                input={"city": "San Francisco"},
                input_schema={
                    "properties": {"city": {"type": "string"}},
                    "required": ["city"],
                },
                output=OutputConfig(
                    example={"weather": "sunny", "temperature": 70},
                ),
            )
        },
    ),
}
```

The Bazaar discovery extension is chain-agnostic -- the same discovery metadata applies regardless of which payment network the client uses.

---

## 5. Registering Extension on Server

The `bazaar_resource_server_extension` is a server-side extension that enriches discovery declarations with HTTP method information from the request context at runtime. It must be registered on your `x402ResourceServer` or `x402ResourceServerSync` instance.

### Async server (FastAPI)

```python
from x402.server import x402ResourceServer
from x402.http import FacilitatorConfig, HTTPFacilitatorClient
from x402.extensions.bazaar import bazaar_resource_server_extension
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.schemas import Network

AVM_NETWORK: Network = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(url="https://x402.org/facilitator")
)
server = x402ResourceServer(facilitator)
server.register(AVM_NETWORK, ExactAvmServerScheme())
server.register_extension(bazaar_resource_server_extension)
```

### Sync server (Flask)

```python
from x402.server import x402ResourceServerSync
from x402.http import FacilitatorConfig, HTTPFacilitatorClientSync
from x402.extensions.bazaar import bazaar_resource_server_extension
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.schemas import Network

AVM_NETWORK: Network = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

facilitator = HTTPFacilitatorClientSync(
    FacilitatorConfig(url="https://x402.org/facilitator")
)
server = x402ResourceServerSync(facilitator)
server.register(AVM_NETWORK, ExactAvmServerScheme())
server.register_extension(bazaar_resource_server_extension)
```

What the extension does at runtime:

1. When an HTTP request arrives for a payment-protected route that has a `"bazaar"` extension, the extension intercepts the declaration enrichment step.
2. It reads the HTTP method from the transport context (e.g., `request.method`).
3. It injects the method into `info.input.method` and updates the schema to require it.
4. The enriched extension is included in the 402 Payment Required response.

> **Note**: The FastAPI and Flask middlewares (`PaymentMiddlewareASGI` and `payment_middleware`) handle passing the request context to the extension automatically.

---

## 6. Validating Discovery Extensions

The `validate_discovery_extension` function validates that an extension's `info` data conforms to its `schema`. This is used primarily on the facilitator side to ensure data integrity before cataloging.

```python
from x402.extensions.bazaar import (
    declare_discovery_extension,
    validate_discovery_extension,
    OutputConfig,
)
from x402.extensions.bazaar.types import parse_discovery_extension

# Create an extension
ext_dict = declare_discovery_extension(
    input={"city": "San Francisco"},
    input_schema={
        "properties": {"city": {"type": "string"}},
        "required": ["city"],
    },
    output=OutputConfig(example={"weather": "sunny", "temperature": 70}),
)

# Parse the bazaar portion into a typed extension object
extension = parse_discovery_extension(ext_dict["bazaar"])

# Validate info against schema
result = validate_discovery_extension(extension)

if result.valid:
    print("Extension is valid")
else:
    print("Validation errors:", result.errors)
```

`validate_discovery_extension` accepts both:

- A `DiscoveryExtension` Pydantic model (from `parse_discovery_extension`).
- A raw `dict` with `"info"` and `"schema"` keys.

The `ValidationResult` dataclass:

```python
@dataclass
class ValidationResult:
    valid: bool
    errors: list[str]  # Empty when valid
```

---

## 7. Extracting Discovery Info

### From a payment request (facilitator use case)

The main extraction function handles both v2 (extensions in `PaymentPayload`) and v1 (output_schema in `PaymentRequirements`) formats:

```python
from x402.extensions.bazaar import extract_discovery_info

# Called by the facilitator when processing a payment
# payment_payload: PaymentPayload or dict
# payment_requirements: PaymentRequirements or dict
discovered = extract_discovery_info(
    payment_payload=payment_payload,
    payment_requirements=payment_requirements,
    validate=True,  # default: validates v2 extensions before extracting
)

if discovered:
    print(f"Resource URL: {discovered.resource_url}")
    print(f"HTTP Method: {discovered.method}")
    print(f"x402 Version: {discovered.x402_version}")
    print(f"Description: {discovered.description}")
    print(f"MIME Type: {discovered.mime_type}")

    # Access the discovery info details
    info = discovered.discovery_info
    if hasattr(info.input, "query_params"):
        print(f"Query params: {info.input.query_params}")
    elif hasattr(info.input, "body"):
        print(f"Body: {info.input.body}")

    if info.output:
        print(f"Output example: {info.output.example}")
```

The `DiscoveredResource` dataclass:

```python
@dataclass
class DiscoveredResource:
    resource_url: str          # Normalized URL (no query/hash)
    method: str                # HTTP method (GET, POST, etc.)
    x402_version: int          # 1 or 2
    discovery_info: DiscoveryInfo  # QueryDiscoveryInfo or BodyDiscoveryInfo
    description: str | None    # From resource info or requirements
    mime_type: str | None      # From resource info or requirements
```

### From an extension object directly

For when you already have the extension data and want to extract just the info:

```python
from x402.extensions.bazaar import extract_discovery_info_from_extension

# From a dict
info = extract_discovery_info_from_extension(
    extension={"info": {...}, "schema": {...}},
    validate=True,  # Raises ValueError if validation fails
)

# info is a QueryDiscoveryInfo or BodyDiscoveryInfo
print(f"Input type: {info.input.type}")
```

### Validate and extract in one step

```python
from x402.extensions.bazaar import validate_and_extract

result = validate_and_extract(extension_data)

if result.valid and result.info:
    # Use result.info (QueryDiscoveryInfo or BodyDiscoveryInfo)
    print(f"Method: {result.info.input.method}")
else:
    print("Validation errors:", result.errors)
```

---

## 8. Querying Discovery Resources (Client Side)

The `with_bazaar` function extends a facilitator client with discovery query capabilities:

```python
from x402.http import HTTPFacilitatorClient, FacilitatorConfig
from x402.extensions.bazaar import with_bazaar, ListDiscoveryResourcesParams

# Create a facilitator client and extend it with bazaar
facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(url="https://x402.org/facilitator")
)
client = with_bazaar(facilitator)

# List all discovered resources
response = client.extensions.discovery.list_resources()
for resource in response.resources:
    print(f"URL: {resource.url}")
    print(f"Type: {resource.type}")
    print(f"Metadata: {resource.metadata}")

# Filter and paginate
response = client.extensions.discovery.list_resources(
    ListDiscoveryResourcesParams(
        type="http",
        limit=10,
        offset=0,
    )
)
print(f"Total resources: {response.total}")
print(f"Returned: {len(response.resources)}")
```

The extended client delegates all original facilitator client methods transparently:

```python
# These still work -- delegated to the wrapped client
supported = client.get_supported()
```

---

## 9. Complete Example -- Algorand Weather API with Bazaar Discovery

This end-to-end example shows a FastAPI server that:

1. Gates a weather endpoint behind Algorand micropayments.
2. Advertises the endpoint via Bazaar discovery.
3. Registers the bazaar extension on the server.

### Server (`server.py`)

```python
"""Algorand-gated weather API with Bazaar discovery."""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

from x402.extensions.bazaar import (
    OutputConfig,
    bazaar_resource_server_extension,
    declare_discovery_extension,
)
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.schemas import Network
from x402.server import x402ResourceServer

load_dotenv()

# Configuration
AVM_ADDRESS = os.environ["AVM_ADDRESS"]
AVM_NETWORK: Network = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402.org/facilitator")


# Response models
class WeatherReport(BaseModel):
    weather: str
    temperature: int


class WeatherResponse(BaseModel):
    report: WeatherReport


# FastAPI app
app = FastAPI(title="Weather API (x402 + Algorand + Bazaar)")

# x402 server setup
facilitator = HTTPFacilitatorClient(FacilitatorConfig(url=FACILITATOR_URL))
server = x402ResourceServer(facilitator)
server.register(AVM_NETWORK, ExactAvmServerScheme())
server.register_extension(bazaar_resource_server_extension)

# Route configuration with Bazaar discovery
routes = {
    "GET /weather": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                pay_to=AVM_ADDRESS,
                price="$0.001",
                network=AVM_NETWORK,
            ),
        ],
        description="Get weather data for a city",
        mime_type="application/json",
        extensions={
            **declare_discovery_extension(
                input={"city": "San Francisco"},
                input_schema={
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "City name to get weather for",
                        },
                    },
                    "required": ["city"],
                },
                output=OutputConfig(
                    example={"weather": "sunny", "temperature": 70},
                    schema={
                        "properties": {
                            "weather": {"type": "string"},
                            "temperature": {"type": "number"},
                        },
                        "required": ["weather", "temperature"],
                    },
                ),
            )
        },
    ),
}

# Apply payment middleware
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)


# Endpoints
@app.get("/weather")
async def get_weather(city: str = "San Francisco") -> WeatherResponse:
    return WeatherResponse(
        report=WeatherReport(weather="sunny", temperature=70)
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=4021)
```

### Client discovering and calling the API

```python
"""Client that discovers and calls the Algorand-gated weather API."""

import httpx

from x402.http import FacilitatorConfig, HTTPFacilitatorClient
from x402.extensions.bazaar import with_bazaar, ListDiscoveryResourcesParams

FACILITATOR_URL = "https://x402.org/facilitator"

# Step 1: Discover available resources via the facilitator
facilitator = HTTPFacilitatorClient(FacilitatorConfig(url=FACILITATOR_URL))
client = with_bazaar(facilitator)

resources = client.extensions.discovery.list_resources(
    ListDiscoveryResourcesParams(type="http", limit=50)
)

for resource in resources.resources:
    print(f"Discovered: {resource.url} ({resource.type})")
    if resource.metadata:
        print(f"  Metadata: {resource.metadata}")

# Step 2: Make a paid request to the weather API
# (Payment handling with x402Client is covered in the core SDK examples)
```

### Flask variant (synchronous)

```python
"""Flask version of the Algorand-gated weather API with Bazaar discovery."""

import os

from dotenv import load_dotenv
from flask import Flask, jsonify

from x402.extensions.bazaar import (
    OutputConfig,
    bazaar_resource_server_extension,
    declare_discovery_extension,
)
from x402.http import FacilitatorConfig, HTTPFacilitatorClientSync, PaymentOption
from x402.http.middleware.flask import payment_middleware
from x402.http.types import RouteConfig
from x402.mechanisms.avm.exact import ExactAvmServerScheme
from x402.schemas import Network
from x402.server import x402ResourceServerSync

load_dotenv()

AVM_ADDRESS = os.environ["AVM_ADDRESS"]
AVM_NETWORK: Network = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

app = Flask(__name__)

facilitator = HTTPFacilitatorClientSync(
    FacilitatorConfig(url=os.getenv("FACILITATOR_URL", "https://x402.org/facilitator"))
)
server = x402ResourceServerSync(facilitator)
server.register(AVM_NETWORK, ExactAvmServerScheme())
server.register_extension(bazaar_resource_server_extension)

routes = {
    "GET /weather": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                pay_to=AVM_ADDRESS,
                price="$0.001",
                network=AVM_NETWORK,
            ),
        ],
        extensions={
            **declare_discovery_extension(
                input={"city": "San Francisco"},
                input_schema={
                    "properties": {"city": {"type": "string"}},
                    "required": ["city"],
                },
                output=OutputConfig(
                    example={"weather": "sunny", "temperature": 70},
                ),
            )
        },
    ),
}
payment_middleware(app, routes=routes, server=server)


@app.route("/weather")
def get_weather():
    return jsonify({"report": {"weather": "sunny", "temperature": 70}})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4021, debug=False)
```

---

## 10. Type Reference

### Constants

| Name | Value | Description |
|------|-------|-------------|
| `BAZAAR` | `"bazaar"` | Extension key identifier used in route configs and extension dicts |

### Literal Types

| Name | Values | Description |
|------|--------|-------------|
| `QueryParamMethods` | `"GET"`, `"HEAD"`, `"DELETE"` | HTTP methods that use query parameters |
| `BodyMethods` | `"POST"`, `"PUT"`, `"PATCH"` | HTTP methods that use request bodies |
| `BodyType` | `"json"`, `"form-data"`, `"text"` | Content types for body-based requests |

### Pydantic Models (from `x402.extensions.bazaar.types`)

| Type | Fields | Description |
|------|--------|-------------|
| `QueryInput` | `type`, `method`, `query_params`, `headers` | Input spec for query-param methods |
| `BodyInput` | `type`, `method`, `body_type`, `body`, `query_params`, `headers` | Input spec for body methods |
| `OutputInfo` | `type`, `format`, `example` | Output specification |
| `QueryDiscoveryInfo` | `input: QueryInput`, `output: OutputInfo` | Discovery info for GET/HEAD/DELETE |
| `BodyDiscoveryInfo` | `input: BodyInput`, `output: OutputInfo` | Discovery info for POST/PUT/PATCH |
| `QueryDiscoveryExtension` | `info: QueryDiscoveryInfo`, `schema_: dict` | Full extension with schema (query) |
| `BodyDiscoveryExtension` | `info: BodyDiscoveryInfo`, `schema_: dict` | Full extension with schema (body) |

### Union Types

| Name | Members | Description |
|------|---------|-------------|
| `DiscoveryInfo` | `QueryDiscoveryInfo \| BodyDiscoveryInfo` | Any discovery info |
| `DiscoveryExtension` | `QueryDiscoveryExtension \| BodyDiscoveryExtension` | Any extension |

### Config Dataclasses (from `x402.extensions.bazaar.resource_service`)

| Type | Fields | Description |
|------|--------|-------------|
| `OutputConfig` | `example`, `schema` | Configure output for `declare_discovery_extension` |
| `DeclareQueryDiscoveryConfig` | `input`, `input_schema`, `output` | Config for query discovery |
| `DeclareBodyDiscoveryConfig` | `input`, `input_schema`, `body_type`, `output` | Config for body discovery |

### Result Dataclasses (from `x402.extensions.bazaar.facilitator`)

| Type | Fields | Description |
|------|--------|-------------|
| `ValidationResult` | `valid: bool`, `errors: list[str]` | Validation outcome |
| `DiscoveredResource` | `resource_url`, `method`, `x402_version`, `discovery_info`, `description`, `mime_type` | Extracted resource metadata |

### Client Types (from `x402.extensions.bazaar.facilitator_client`)

| Type | Description |
|------|-------------|
| `ListDiscoveryResourcesParams` | Params for `list_resources()` (`type`, `limit`, `offset`) |
| `DiscoveryResource` | A discovered resource (`url`, `type`, `metadata`) |
| `DiscoveryResourcesResponse` | Response from `list_resources()` (`resources`, `total`, `limit`, `offset`) |
| `BazaarDiscoveryExtension` | Discovery query class with `list_resources()` method |
| `BazaarClientExtension` | Container with `.discovery` attribute |
| `BazaarExtendedClient` | Extended client with `.extensions` attribute |

---

## 11. Functions Summary

| Function | Import | Description |
|----------|--------|-------------|
| `declare_discovery_extension(input, input_schema, body_type, output)` | `from x402.extensions.bazaar import declare_discovery_extension` | Create a discovery extension dict for route config |
| `validate_discovery_extension(extension)` | `from x402.extensions.bazaar import validate_discovery_extension` | Validate extension info against its schema |
| `extract_discovery_info(payload, requirements, validate)` | `from x402.extensions.bazaar import extract_discovery_info` | Extract discovery info from payment request (v1 + v2) |
| `extract_discovery_info_from_extension(extension, validate)` | `from x402.extensions.bazaar import extract_discovery_info_from_extension` | Extract info from an extension object directly |
| `validate_and_extract(extension)` | `from x402.extensions.bazaar import validate_and_extract` | Validate and extract in one step |
| `with_bazaar(client)` | `from x402.extensions.bazaar import with_bazaar` | Extend facilitator client with discovery queries |
| `parse_discovery_extension(data)` | `from x402.extensions.bazaar.types import parse_discovery_extension` | Parse raw dict into typed extension |
| `parse_discovery_info(data)` | `from x402.extensions.bazaar.types import parse_discovery_info` | Parse raw dict into typed info |
| `is_query_method(method)` | `from x402.extensions.bazaar.types import is_query_method` | Check if method is GET/HEAD/DELETE |
| `is_body_method(method)` | `from x402.extensions.bazaar.types import is_body_method` | Check if method is POST/PUT/PATCH |

---

## 12. Summary Table

| Feature | Import / Usage |
|---------|---------------|
| **Package install** | `pip install "x402-avm[extensions]"` or `pip install "x402-avm[extensions,avm]"` |
| **Required dependency** | `jsonschema>=4.0.0` (installed automatically with `[extensions]`) |
| **Top-level import** | `from x402.extensions import ...` |
| **Bazaar sub-module** | `from x402.extensions.bazaar import ...` |
| **Declare discovery** | `declare_discovery_extension(input=..., input_schema=..., output=...)` |
| **Server extension** | `server.register_extension(bazaar_resource_server_extension)` |
| **Route config** | `RouteConfig(accepts=..., extensions={**declare_discovery_extension(...)})` |
| **Validate** | `validate_discovery_extension(extension)` returns `ValidationResult` |
| **Extract (facilitator)** | `extract_discovery_info(payload, requirements)` returns `DiscoveredResource` |
| **Extract (direct)** | `extract_discovery_info_from_extension(extension)` returns `DiscoveryInfo` |
| **Validate + extract** | `validate_and_extract(extension)` returns `ValidationExtractResult` |
| **Client discovery** | `with_bazaar(client).extensions.discovery.list_resources()` |
| **Algorand network ID** | `"algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="` (Testnet) |

---

Cross-reference: For the TypeScript version of these examples, see [`../typescript/x402-avm-extensions-examples.md`](../typescript/x402-avm-extensions-examples.md).
