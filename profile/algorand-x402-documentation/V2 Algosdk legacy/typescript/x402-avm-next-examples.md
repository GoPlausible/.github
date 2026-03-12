# x402-avm V2: Next.js Middleware Examples

Comprehensive examples for integrating x402-avm payment-gated routes with Next.js,
including both the proxy pattern (middleware.ts) and route handler wrapper pattern
(route.ts), with Algorand (AVM) blockchain payments.

## Table of Contents

- [Installation](#installation)
- [Architecture: Two Patterns](#architecture-two-patterns)
- [Proxy Pattern: paymentProxyFromConfig](#proxy-pattern-paymentproxyfromconfig)
- [Proxy Pattern: paymentProxy](#proxy-pattern-paymentproxy)
- [Proxy Pattern: paymentProxyFromHTTPServer](#proxy-pattern-paymentproxyfromhttpserver)
- [Route Handler Pattern: withX402](#route-handler-pattern-withx402)
- [Route Handler Pattern: withX402FromHTTPServer](#route-handler-pattern-withx402fromhttpserver)
- [App Router Examples](#app-router-examples)
- [API Route Protection](#api-route-protection)
- [Dynamic Routes with Payment](#dynamic-routes-with-payment)
- [Paywall Integration](#paywall-integration)
- [Multiple Networks and Cross-Chain](#multiple-networks-and-cross-chain)
- [Complete Examples](#complete-examples)
- [Environment Variables](#environment-variables)

---

## Installation

```bash
npm install @x402-avm/next @x402-avm/avm @x402-avm/core
```

For paywall UI support:

```bash
npm install @x402-avm/next @x402-avm/avm @x402-avm/core @x402-avm/paywall
```

---

## Architecture: Two Patterns

Next.js offers two distinct patterns for x402 payment protection:

### 1. Proxy Pattern (middleware.ts)

Uses Next.js middleware (`middleware.ts` at project root) to intercept requests
before they reach route handlers. Best for:

- Protecting multiple routes with a single configuration
- Path-based payment gating
- Minimal changes to existing route handlers

Functions: `paymentProxy`, `paymentProxyFromConfig`, `paymentProxyFromHTTPServer`

### 2. Route Handler Wrapper Pattern (route.ts)

Wraps individual App Router route handlers. Best for:

- Per-route payment configuration
- Guaranteed settlement only after successful handler response
- Fine-grained control per endpoint

Functions: `withX402`, `withX402FromHTTPServer`

---

## Proxy Pattern: paymentProxyFromConfig

The simplest setup. Place this in `middleware.ts` at your project root.
`paymentProxyFromConfig` creates the `x402ResourceServer` internally.

### middleware.ts

```typescript
import { NextRequest } from "next/server";
import { paymentProxyFromConfig } from "@x402-avm/next";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const PAY_TO = process.env.PAY_TO!;

const routes = {
  "GET /api/weather": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.01",
    },
    description: "Weather data",
  },
  "GET /api/premium/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.10",
    },
    description: "Premium API endpoints",
  },
};

const facilitatorClient = new HTTPFacilitatorClient();

const proxy = paymentProxyFromConfig(routes, facilitatorClient);

export async function middleware(request: NextRequest) {
  return proxy(request);
}

// Only run middleware on API routes
export const config = {
  matcher: "/api/:path*",
};
```

### app/api/weather/route.ts

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    temperature: 72,
    condition: "sunny",
    city: "San Francisco",
  });
}
```

### app/api/premium/data/route.ts

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: "premium content",
    tier: "gold",
  });
}
```

---

## Proxy Pattern: paymentProxy

Use this when you want more control over the `x402ResourceServer` instance.

### middleware.ts

```typescript
import { NextRequest } from "next/server";
import { paymentProxy, x402ResourceServer } from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const PAY_TO = process.env.PAY_TO!;

// Create and configure the resource server
const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
});

const server = new x402ResourceServer(facilitatorClient);

// Register AVM exact scheme (wildcard for all Algorand networks)
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
  },
  "POST /api/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$1.00",
    },
    description: "AI content generation",
  },
};

// Create proxy with pre-configured server
const proxy = paymentProxy(routes, server);

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: "/api/:path*",
};
```

---

## Proxy Pattern: paymentProxyFromHTTPServer

The most advanced proxy variant. Use when you need HTTP-level hooks.

### middleware.ts

```typescript
import { NextRequest } from "next/server";
import {
  paymentProxyFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
} from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const PAY_TO = process.env.PAY_TO!;

const facilitatorClient = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(resourceServer);

const routes = {
  "GET /api/data": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.05",
    },
    description: "Protected data",
  },
};

// Create HTTP server with hooks
const httpServer = new x402HTTPResourceServer(resourceServer, routes);

// Hook: allow free access for authenticated users
httpServer.onProtectedRequest(async (context, routeConfig) => {
  const authToken = context.adapter.getHeader("authorization");

  if (authToken && await verifyToken(authToken)) {
    return { grantAccess: true };
  }

  // Rate limiting check
  const clientIP = context.adapter.getHeader("x-forwarded-for");
  if (clientIP && isRateLimited(clientIP)) {
    return { abort: true, reason: "Rate limited" };
  }

  // Continue to payment
  return undefined;
});

const proxy = paymentProxyFromHTTPServer(httpServer);

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: "/api/:path*",
};

// Helper functions
async function verifyToken(token: string): Promise<boolean> {
  // Your auth logic here
  return token.startsWith("Bearer valid-");
}

function isRateLimited(ip: string): boolean {
  // Your rate limiting logic here
  return false;
}
```

---

## Route Handler Pattern: withX402

`withX402` wraps individual route handlers. Unlike the proxy pattern, it guarantees
that payment settlement only occurs after the handler returns a successful response
(status < 400).

### app/api/weather/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

// Create and configure server (shared across handlers in this file)
const facilitatorClient = new HTTPFacilitatorClient();
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);

// Define route payment config
const routeConfig = {
  accepts: {
    scheme: "exact",
    network: ALGORAND_TESTNET_CAIP2,
    payTo: process.env.PAY_TO!,
    price: "$0.01",
  },
  description: "Weather data",
};

// The actual handler
async function handler(request: NextRequest) {
  return NextResponse.json({
    temperature: 72,
    condition: "sunny",
    city: "San Francisco",
    timestamp: new Date().toISOString(),
  });
}

// Export wrapped handler
export const GET = withX402(handler, routeConfig, server);
```

### Separate Config Module (Recommended for Multiple Routes)

Create a shared configuration module to avoid duplicating server setup.

#### lib/x402.ts

```typescript
import { x402ResourceServer } from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

// Shared x402 server instance
const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
});

export const x402Server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(x402Server);

// Shared constants
export const PAY_TO = process.env.PAY_TO!;
export const NETWORK = ALGORAND_TESTNET_CAIP2;
```

#### app/api/weather/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { x402Server, PAY_TO, NETWORK } from "@/lib/x402";

const handler = async (request: NextRequest) => {
  return NextResponse.json({
    temperature: 72,
    condition: "sunny",
  });
};

export const GET = withX402(handler, {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: "$0.01",
  },
  description: "Weather data",
}, x402Server);
```

#### app/api/premium/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { x402Server, PAY_TO, NETWORK } from "@/lib/x402";

const handler = async (request: NextRequest) => {
  return NextResponse.json({
    data: "premium content",
    tier: "gold",
  });
};

export const GET = withX402(handler, {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: "$0.50",
  },
  description: "Premium content",
}, x402Server);
```

#### app/api/generate/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { x402Server, PAY_TO, NETWORK } from "@/lib/x402";

const handler = async (request: NextRequest) => {
  const { prompt } = await request.json();

  // If generation fails, return 500 -- payment will NOT be settled
  try {
    const result = await generateContent(prompt);
    return NextResponse.json({ prompt, result });
  } catch (error) {
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 },
    );
  }
};

export const POST = withX402(handler, {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: "$1.00",
  },
  description: "AI generation",
}, x402Server);

async function generateContent(prompt: string): Promise<string> {
  // Your AI generation logic
  return "Generated content...";
}
```

---

## Route Handler Pattern: withX402FromHTTPServer

Advanced variant with HTTP-level hooks per route handler.

### app/api/data/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  withX402FromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
} from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const facilitatorClient = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(resourceServer);

const routeConfig = {
  accepts: {
    scheme: "exact",
    network: ALGORAND_TESTNET_CAIP2,
    payTo: process.env.PAY_TO!,
    price: "$0.05",
  },
  description: "Protected data",
};

// withX402FromHTTPServer uses { "*": routeConfig } internally,
// but we create the httpServer explicitly to attach hooks
const httpServer = new x402HTTPResourceServer(resourceServer, {
  "*": routeConfig,
});

// Add a hook: log all payment attempts
httpServer.onProtectedRequest(async (context, config) => {
  console.log(`Payment request: ${context.method} ${context.path}`);
  // Return undefined to continue to payment flow
  return undefined;
});

const handler = async (request: NextRequest) => {
  return NextResponse.json({ data: "protected content" });
};

export const GET = withX402FromHTTPServer(handler, httpServer);
```

---

## App Router Examples

### Protected Page Route (HTML)

For protecting HTML pages served by Next.js App Router.

#### middleware.ts

```typescript
import { NextRequest } from "next/server";
import { paymentProxyFromConfig } from "@x402-avm/next";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const routes = {
  // Protect an HTML page
  "GET /premium-article": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: process.env.PAY_TO!,
      price: "$0.25",
    },
    description: "Premium article",
    mimeType: "text/html",
  },
  // Protect API routes
  "GET /api/data/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: process.env.PAY_TO!,
      price: "$0.01",
    },
    description: "Data API",
  },
};

const proxy = paymentProxyFromConfig(routes, new HTTPFacilitatorClient());

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: ["/premium-article", "/api/data/:path*"],
};
```

#### app/premium-article/page.tsx

```tsx
export default function PremiumArticlePage() {
  return (
    <article>
      <h1>Premium Article</h1>
      <p>This content is only accessible after payment.</p>
      <p>Full article text here...</p>
    </article>
  );
}
```

### Server Component with Data Fetching

```tsx
// app/api/data/stats/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // Fetch data from your database or external API
  const stats = await fetchStats();
  return NextResponse.json(stats);
}

async function fetchStats() {
  return {
    totalUsers: 15420,
    revenue: "$128,345",
    activeSubscriptions: 3456,
  };
}
```

---

## API Route Protection

### Protecting Multiple HTTP Methods

```typescript
// app/api/resource/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { x402Server, PAY_TO, NETWORK } from "@/lib/x402";

const routeConfig = {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: "$0.05",
  },
  description: "Resource CRUD",
};

// GET handler
const getHandler = async (request: NextRequest) => {
  return NextResponse.json({ resource: "data", method: "GET" });
};

// POST handler (same price)
const postHandler = async (request: NextRequest) => {
  const body = await request.json();
  return NextResponse.json({ created: true, resource: body });
};

// PUT handler (different price)
const putHandler = async (request: NextRequest) => {
  const body = await request.json();
  return NextResponse.json({ updated: true, resource: body });
};

export const GET = withX402(getHandler, routeConfig, x402Server);
export const POST = withX402(postHandler, routeConfig, x402Server);
export const PUT = withX402(putHandler, {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: "$0.10",  // Higher price for updates
  },
  description: "Resource update",
}, x402Server);
```

### Conditional Payment (Free Tier + Paid Tier)

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  withX402FromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
} from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const facilitatorClient = new HTTPFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(resourceServer);

const httpServer = new x402HTTPResourceServer(resourceServer, {
  "*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: process.env.PAY_TO!,
      price: "$0.05",
    },
    description: "Search API",
  },
});

// Grant free access for basic queries (< 10 results)
httpServer.onProtectedRequest(async (context) => {
  const limit = context.adapter.getQueryParam("limit");
  if (limit && parseInt(limit) <= 10) {
    // Free tier: up to 10 results
    return { grantAccess: true };
  }
  // Paid tier: unlimited results
  return undefined;
});

const handler = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "100");

  const results = await performSearch(query, limit);
  return NextResponse.json({ query, results, count: results.length });
};

export const GET = withX402FromHTTPServer(handler, httpServer);

async function performSearch(query: string, limit: number) {
  // Your search logic
  return Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
    id: i,
    title: `Result ${i + 1} for "${query}"`,
  }));
}
```

---

## Dynamic Routes with Payment

### Path Parameters

#### middleware.ts

```typescript
import { NextRequest } from "next/server";
import { paymentProxyFromConfig } from "@x402-avm/next";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const PAY_TO = process.env.PAY_TO!;

const routes = {
  // Matches /api/users/123, /api/users/abc, etc.
  "GET /api/users/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.01",
    },
    description: "User profile data",
  },
  // Matches /api/reports/2025/01, /api/reports/2025/02, etc.
  "GET /api/reports/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.25",
    },
    description: "Monthly report",
  },
};

const proxy = paymentProxyFromConfig(routes, new HTTPFacilitatorClient());

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: ["/api/users/:path*", "/api/reports/:path*"],
};
```

#### app/api/users/[id]/route.ts

```typescript
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await fetchUser(params.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

async function fetchUser(id: string) {
  return { id, name: "Alice", email: "alice@example.com" };
}
```

#### app/api/reports/[year]/[month]/route.ts

```typescript
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { year: string; month: string } },
) {
  return NextResponse.json({
    year: params.year,
    month: params.month,
    data: "Monthly report data...",
  });
}
```

### Dynamic Pricing Based on Path

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { x402Server, PAY_TO, NETWORK } from "@/lib/x402";

// app/api/images/[quality]/route.ts

const handler = async (
  request: NextRequest,
) => {
  const quality = request.nextUrl.pathname.split("/").pop();
  return NextResponse.json({ quality, image: "base64..." });
};

// Dynamic price based on quality
export const GET = withX402(handler, {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: (context) => {
      const path = context.path;
      if (path.includes("/hd")) return "$0.50";
      if (path.includes("/4k")) return "$1.00";
      return "$0.10";  // standard
    },
  },
  description: "Image at requested quality",
}, x402Server);
```

---

## Paywall Integration

### Browser Paywall with Proxy Pattern

When a browser (Accept: text/html) hits a protected route, the middleware
can serve a paywall HTML page.

#### middleware.ts

```typescript
import { NextRequest } from "next/server";
import { paymentProxy, x402ResourceServer } from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const facilitatorClient = new HTTPFacilitatorClient();
const server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(server);

const routes = {
  "GET /premium/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: process.env.PAY_TO!,
      price: "$0.25",
    },
    description: "Premium content",
    mimeType: "text/html",
  },
};

// Paywall config for browser UI
const paywallConfig = {
  title: "Premium Content",
  description: "Pay with Algorand to unlock this content",
  logoUrl: "/logo.png",
};

const proxy = paymentProxy(routes, server, paywallConfig);

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: "/premium/:path*",
};
```

### Custom Paywall HTML

```typescript
const routes = {
  "GET /premium/article": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: process.env.PAY_TO!,
      price: "$0.25",
    },
    description: "Premium article",
    customPaywallHtml: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Required</title>
          <style>
            body { font-family: sans-serif; max-width: 600px; margin: 50px auto; }
            .price { font-size: 2em; color: #6366f1; }
          </style>
        </head>
        <body>
          <h1>Premium Article</h1>
          <p class="price">$0.25</p>
          <p>Pay with your Algorand wallet to read this article.</p>
          <p>Supported wallets: Pera, Defly, Kibisis</p>
        </body>
      </html>
    `,
  },
};
```

### Unpaid Response Body (for API clients)

```typescript
const routes = {
  "GET /api/article/:id": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: process.env.PAY_TO!,
      price: "$0.10",
    },
    description: "Full article",
    // Custom 402 response body for API (non-browser) clients
    unpaidResponseBody: (context) => ({
      contentType: "application/json",
      body: {
        title: "Article Preview",
        preview: "First paragraph of the article...",
        fullArticle: false,
        paymentRequired: {
          price: "$0.10",
          network: "Algorand Testnet",
        },
      },
    }),
  },
};
```

---

## Multiple Networks and Cross-Chain

### Accept Algorand Testnet and Mainnet

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
    description: "Data endpoint (testnet or mainnet)",
  },
};
```

### Cross-Chain: Algorand + EVM

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
    description: "Cross-chain: ALGO or ETH",
  },
};
```

### USDC Payments

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
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$5.00",
      extra: {
        asset: USDC_TESTNET_ASA_ID,  // "10458941"
      },
    },
    description: "Premium (USDC only)",
  },
};
```

---

## Complete Examples

### Full Next.js App with Proxy Pattern

#### Project Structure

```
my-x402-app/
  .env.local
  middleware.ts
  app/
    page.tsx
    api/
      health/route.ts
      weather/[city]/route.ts
      premium/data/route.ts
      generate/route.ts
  lib/
    x402.ts
```

#### .env.local

```bash
PAY_TO=ALGORAND_ADDRESS_HERE_58_CHARS
FACILITATOR_URL=https://x402.org/facilitator
```

#### middleware.ts

```typescript
import { NextRequest } from "next/server";
import { paymentProxy } from "@x402-avm/next";
import { x402Server, PAY_TO } from "@/lib/x402";
import {
  ALGORAND_TESTNET_CAIP2,
  USDC_TESTNET_ASA_ID,
} from "@x402-avm/avm";

const routes = {
  "GET /api/weather/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.01",
    },
    description: "Weather data",
    unpaidResponseBody: () => ({
      contentType: "application/json",
      body: { message: "Pay $0.01 for weather data" },
    }),
  },
  "GET /api/premium/*": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$0.50",
      extra: { asset: USDC_TESTNET_ASA_ID },
    },
    description: "Premium content (USDC)",
  },
  "POST /api/generate": {
    accepts: {
      scheme: "exact",
      network: ALGORAND_TESTNET_CAIP2,
      payTo: PAY_TO,
      price: "$1.00",
    },
    description: "AI generation",
  },
};

const paywallConfig = {
  title: "x402-avm Demo",
  description: "Pay with Algorand to access premium features",
};

const proxy = paymentProxy(routes, x402Server, paywallConfig);

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: "/api/:path*",
};
```

#### lib/x402.ts

```typescript
import { x402ResourceServer } from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";

export const PAY_TO = process.env.PAY_TO!;

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
});

export const x402Server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(x402Server);
```

#### app/api/weather/[city]/route.ts

```typescript
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { city: string } },
) {
  return NextResponse.json({
    city: params.city,
    temperature: Math.floor(Math.random() * 40) + 50,
    condition: ["sunny", "cloudy", "rainy"][Math.floor(Math.random() * 3)],
    humidity: Math.floor(Math.random() * 60) + 30,
  });
}
```

#### app/api/premium/data/route.ts

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    analytics: {
      pageViews: 15420,
      uniqueVisitors: 8734,
      bounceRate: 0.32,
    },
  });
}
```

#### app/api/generate/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  return NextResponse.json({
    prompt,
    generated: "AI-generated content...",
    model: "gpt-4",
    tokens: 256,
  });
}
```

#### app/api/health/route.ts

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "healthy" });
}
```

#### app/page.tsx

```tsx
export default function Home() {
  return (
    <main>
      <h1>x402-avm Next.js Demo</h1>
      <p>API Endpoints:</p>
      <ul>
        <li>GET /api/weather/:city -- $0.01 ALGO</li>
        <li>GET /api/premium/data -- $0.50 USDC</li>
        <li>POST /api/generate -- $1.00 ALGO</li>
        <li>GET /api/health -- Free</li>
      </ul>
    </main>
  );
}
```

---

### Full Next.js App with Route Handler Pattern

#### Project Structure

```
my-x402-app/
  .env.local
  app/
    page.tsx
    api/
      health/route.ts
      weather/route.ts
      premium/route.ts
      generate/route.ts
  lib/
    x402.ts
```

#### lib/x402.ts

```typescript
import { x402ResourceServer } from "@x402-avm/next";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

export const PAY_TO = process.env.PAY_TO!;
export const NETWORK = ALGORAND_TESTNET_CAIP2;

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
});

export const x402Server = new x402ResourceServer(facilitatorClient);
registerExactAvmScheme(x402Server);
```

#### app/api/weather/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { x402Server, PAY_TO, NETWORK } from "@/lib/x402";

const handler = async (request: NextRequest) => {
  const city = request.nextUrl.searchParams.get("city") || "san-francisco";
  return NextResponse.json({
    city,
    temperature: 72,
    condition: "sunny",
  });
};

export const GET = withX402(handler, {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: "$0.01",
  },
  description: "Weather data",
}, x402Server);
```

#### app/api/premium/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { x402Server, PAY_TO, NETWORK } from "@/lib/x402";
import { USDC_TESTNET_ASA_ID } from "@x402-avm/avm";

const handler = async (request: NextRequest) => {
  return NextResponse.json({
    data: "premium content",
    analytics: { views: 15000, revenue: "$1234.56" },
  });
};

export const GET = withX402(handler, {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: "$0.50",
    extra: { asset: USDC_TESTNET_ASA_ID },
  },
  description: "Premium analytics (USDC)",
}, x402Server);
```

#### app/api/generate/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { x402Server, PAY_TO, NETWORK } from "@/lib/x402";

const handler = async (request: NextRequest) => {
  try {
    const { prompt } = await request.json();
    const result = await generateContent(prompt);
    return NextResponse.json({ prompt, result });
  } catch (error) {
    // 500 error -- payment will NOT be settled
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 },
    );
  }
};

export const POST = withX402(handler, {
  accepts: {
    scheme: "exact",
    network: NETWORK,
    payTo: PAY_TO,
    price: "$1.00",
  },
  description: "AI generation",
}, x402Server);

async function generateContent(prompt: string): Promise<string> {
  return "Generated content based on: " + prompt;
}
```

#### app/api/health/route.ts

```typescript
import { NextResponse } from "next/server";

// Not wrapped with withX402, so it's free
export async function GET() {
  return NextResponse.json({ status: "healthy" });
}
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

### Choosing Between Patterns

| Criteria | Proxy (middleware.ts) | withX402 (route.ts) |
|----------|----------------------|---------------------|
| Setup complexity | Single file | Per-route setup |
| Route configuration | Centralized | Distributed |
| Settlement guarantee | Settles on proxy forward | Settles after handler success |
| Error handling | Proxy-level | Handler-level |
| Handler changes | None required | Wrap each export |
| Multiple methods | Via route patterns | Per-method wrapping |
| Best for | Multi-route APIs | Individual endpoints |
