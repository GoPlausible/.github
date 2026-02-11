# x402-avm V2: Paywall UI Examples

Comprehensive guide for using `@x402-avm/paywall` to create payment-gated content with server-side middleware and client-side wallet integration for Algorand (AVM).

---

## Table of Contents

1. [Installation](#installation)
2. [Overview](#overview)
3. [Creating a Paywall with PaywallBuilder](#creating-a-paywall-with-paywallbuilder)
4. [AVM Paywall Handler](#avm-paywall-handler)
5. [Express.js Integration](#expressjs-integration)
6. [Hono Integration](#hono-integration)
7. [Next.js Integration](#nextjs-integration)
8. [Wallet Integration (Pera, Defly, Lute)](#wallet-integration)
9. [Custom Paywall Configuration](#custom-paywall-configuration)
10. [Styling and Branding](#styling-and-branding)
11. [Multi-Network Paywalls](#multi-network-paywalls)
12. [Complete Examples](#complete-examples)

---

## Installation

### Server-Side (Paywall Provider + Middleware)

```bash
npm install @x402-avm/paywall @x402-avm/avm @x402-avm/core
```

Plus your framework-specific middleware package:

```bash
# Express.js
npm install @x402-avm/express

# Hono
npm install @x402-avm/hono

# Next.js
npm install @x402-avm/next
```

### Full Installation (All Packages)

```bash
npm install @x402-avm/paywall @x402-avm/avm @x402-avm/core @x402-avm/express algosdk
```

---

## Overview

The x402 paywall system has two sides:

**Server side** (your API/website):
- Middleware intercepts requests to protected routes.
- If no payment header is present, it returns a `402 Payment Required` response.
- For browser requests, it returns an HTML paywall page instead of raw JSON.
- After payment, middleware verifies and settles the transaction.

**Client side** (the paywall HTML page):
- The paywall HTML page is served to browsers when payment is required.
- It embeds the payment configuration in `window.x402`.
- It connects to Algorand wallets (Pera, Defly, Lute) via `@txnlab/use-wallet`.
- After the user pays, it retries the original request with the payment header.

### Architecture

```
Browser Request
     |
     v
[Server Middleware]
     |
     +-- Has PAYMENT-SIGNATURE header?
     |     |
     |     +-- Yes: Verify payment, settle transaction, return content
     |     +-- No: Is this a browser request (Accept: text/html)?
     |           |
     |           +-- Yes: Return paywall HTML page (402)
     |           +-- No: Return JSON 402 response
     |
     v
[Paywall HTML Page]
     |
     +-- Reads window.x402 config
     +-- Shows wallet connection UI
     +-- User connects wallet (Pera/Defly/Lute)
     +-- User approves payment
     +-- Retries request with PAYMENT-SIGNATURE header
     +-- Redirects to paid content
```

---

## Creating a Paywall with PaywallBuilder

The `PaywallBuilder` class creates a `PaywallProvider` that generates HTML paywall pages for specific blockchain networks.

### createPaywall() Factory

```typescript
import { createPaywall, avmPaywall } from "@x402-avm/paywall";

// Create a paywall that supports Algorand
const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({
    appName: "My DApp",
    appLogo: "https://example.com/logo.png",
    testnet: true,
  })
  .build();
```

### PaywallBuilder API

```typescript
import { PaywallBuilder, avmPaywall, evmPaywall, svmPaywall } from "@x402-avm/paywall";

const paywall = new PaywallBuilder()
  // Register network handlers (order matters -- first match wins)
  .withNetwork(avmPaywall)    // Supports algorand:* networks
  .withNetwork(evmPaywall)    // Supports eip155:* networks
  .withNetwork(svmPaywall)    // Supports solana:* networks

  // Set default configuration
  .withConfig({
    appName: "Premium API",
    appLogo: "https://cdn.example.com/logo.svg",
    currentUrl: "https://api.example.com",
    testnet: false,  // Use mainnet
  })

  // Build the provider
  .build();

// Use the provider to generate HTML
const html = paywall.generateHtml(paymentRequired);
// Or override config at runtime:
const html2 = paywall.generateHtml(paymentRequired, {
  currentUrl: "https://api.example.com/specific-page",
  testnet: true,
});
```

### PaywallProvider Interface

```typescript
interface PaywallProvider {
  generateHtml(paymentRequired: PaymentRequired, config?: PaywallConfig): string;
}

interface PaywallConfig {
  appName?: string;      // App name shown in wallet connection modal
  appLogo?: string;      // App logo URL
  currentUrl?: string;   // URL of the content being accessed
  testnet?: boolean;     // Whether to use testnet (default: true)
}
```

---

## AVM Paywall Handler

The `avmPaywall` handler is responsible for generating Algorand-specific paywall HTML when a payment requirement specifies an Algorand network.

### How It Works

```typescript
import { avmPaywall } from "@x402-avm/paywall/avm";

// The handler checks if it supports the requirement
avmPaywall.supports({ network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=", ... });
// Returns: true (network starts with "algorand:")

avmPaywall.supports({ network: "eip155:84532", ... });
// Returns: false
```

### Importing avmPaywall

There are two import paths:

```typescript
// From the paywall package root (re-exported for convenience)
import { avmPaywall } from "@x402-avm/paywall";

// From the AVM-specific subpath
import { avmPaywall } from "@x402-avm/paywall/avm";
```

Both import the same handler.

### What the Handler Generates

The `avmPaywall.generateHtml()` method produces a full HTML page that:

1. Embeds the payment configuration in a `window.x402` global object:
   ```javascript
   window.x402 = {
     amount: 0.01,           // Amount in USDC (human-readable)
     paymentRequired: {...},  // Full PaymentRequired response
     testnet: true,           // Network mode
     currentUrl: "...",       // URL to retry after payment
     config: { chainConfig: {} },
     appName: "My App",
     appLogo: "https://...",
   };
   ```

2. Provides a React-based UI with:
   - Wallet selection (discovers wallets via `@wallet-standard/app`).
   - Automatic balance checking (USDC ASA balance on Algorand).
   - Transaction signing flow.
   - Payment submission and retry.

3. Supports Algorand wallets that implement the `algorand:signTransaction` wallet-standard feature, including:
   - **Pera Wallet** -- Most popular Algorand mobile wallet.
   - **Defly Wallet** -- DeFi-focused Algorand wallet.
   - **Lute Wallet** -- Desktop browser extension wallet.

### Handler Interface

```typescript
interface PaywallNetworkHandler {
  supports(requirement: PaymentRequirements): boolean;
  generateHtml(
    requirement: PaymentRequirements,
    paymentRequired: PaymentRequired,
    config: PaywallConfig,
  ): string;
}
```

---

## Express.js Integration

### Basic Setup

```typescript
import express from "express";
import {
  paymentMiddleware,
  x402ResourceServer,
} from "@x402-avm/express";
import { createPaywall, avmPaywall } from "@x402-avm/paywall";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";

const app = express();

// ---- Route Configuration ----

const routes = {
  "/api/premium-content": {
    accepts: {
      scheme: "exact",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      asset: "10458941",           // USDC ASA ID on testnet
      payTo: "YOUR_ALGORAND_ADDRESS_HERE",
      price: "$0.01",             // 0.01 USDC
      maxTimeoutSeconds: 300,
    },
    description: "Access to premium content",
    mimeType: "application/json",
  },
};

// ---- Paywall Configuration ----

const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({
    appName: "Premium API",
    appLogo: "https://example.com/logo.png",
    testnet: true,
  })
  .build();

// ---- Server Setup ----

// Create resource server (facilitator handles verification/settlement)
const facilitatorUrl = process.env.FACILITATOR_URL || "https://facilitator.example.com";
const server = new x402ResourceServer({ url: facilitatorUrl });

// Apply middleware
app.use(paymentMiddleware(routes, server, { testnet: true }, paywall));

// ---- Protected Route ----

app.get("/api/premium-content", (req, res) => {
  res.json({
    title: "Premium Article",
    content: "This is the paid content that was unlocked by your USDC payment.",
    timestamp: new Date().toISOString(),
  });
});

// ---- Free Route ----

app.get("/api/free-content", (req, res) => {
  res.json({ message: "This content is free!" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

### With Pre-Configured Resource Server

```typescript
import {
  paymentMiddlewareFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
} from "@x402-avm/express";
import { createPaywall, avmPaywall } from "@x402-avm/paywall";

// Create and configure the resource server
const resourceServer = new x402ResourceServer({ url: facilitatorUrl });

// Create HTTP server with hooks
const httpServer = new x402HTTPResourceServer(resourceServer, routes)
  .onProtectedRequest(async (context) => {
    console.log(`[x402] Protected request: ${context.path}`);
  });

// Build paywall
const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({ appName: "My App", testnet: true })
  .build();

// Apply middleware
app.use(paymentMiddlewareFromHTTPServer(httpServer, { testnet: true }, paywall));
```

### Multiple Protected Routes

```typescript
const routes = {
  "/api/weather": {
    accepts: {
      scheme: "exact",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      asset: "10458941",
      payTo: "YOUR_ADDRESS",
      price: "$0.001",        // 0.001 USDC per weather query
      maxTimeoutSeconds: 60,
    },
    description: "Real-time weather data",
    mimeType: "application/json",
  },
  "/api/analytics": {
    accepts: {
      scheme: "exact",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      asset: "10458941",
      payTo: "YOUR_ADDRESS",
      price: "$0.05",         // 0.05 USDC per analytics report
      maxTimeoutSeconds: 300,
    },
    description: "Detailed analytics report",
    mimeType: "application/json",
  },
  "/api/ai-summary": {
    accepts: {
      scheme: "exact",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      asset: "10458941",
      payTo: "YOUR_ADDRESS",
      price: "$0.10",         // 0.10 USDC per AI summary
      maxTimeoutSeconds: 600,
    },
    description: "AI-powered content summary",
    mimeType: "application/json",
  },
};
```

---

## Hono Integration

### Basic Setup

```typescript
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/hono";
import { createPaywall, avmPaywall } from "@x402-avm/paywall";

const app = new Hono();

const routes = {
  "/api/premium": {
    accepts: {
      scheme: "exact",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      asset: "10458941",
      payTo: "YOUR_ALGORAND_ADDRESS",
      price: "$0.01",
      maxTimeoutSeconds: 300,
    },
    description: "Premium content access",
    mimeType: "application/json",
  },
};

const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({ appName: "Hono API", testnet: true })
  .build();

const server = new x402ResourceServer({ url: process.env.FACILITATOR_URL! });

// Apply payment middleware
app.use("*", paymentMiddleware(routes, server, { testnet: true }, paywall));

// Protected route
app.get("/api/premium", (c) => {
  return c.json({
    content: "This is premium content, paid with USDC on Algorand!",
  });
});

// Free route
app.get("/", (c) => c.text("Welcome to the Hono API"));

export default app;
```

### Hono with Cloudflare Workers

```typescript
import { Hono } from "hono";
import { paymentMiddlewareFromConfig, x402ResourceServer } from "@x402-avm/hono";
import { createPaywall, avmPaywall } from "@x402-avm/paywall";

type Env = {
  FACILITATOR_URL: string;
  PAYTO_ADDRESS: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const routes = {
    "/api/data": {
      accepts: {
        scheme: "exact",
        network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
        asset: "10458941",
        payTo: c.env.PAYTO_ADDRESS,
        price: "$0.01",
        maxTimeoutSeconds: 300,
      },
      description: "Paid API data",
      mimeType: "application/json",
    },
  };

  const paywall = createPaywall()
    .withNetwork(avmPaywall)
    .withConfig({ appName: "Worker API", testnet: true })
    .build();

  const server = new x402ResourceServer({ url: c.env.FACILITATOR_URL });

  const middleware = paymentMiddleware(routes, server, { testnet: true }, paywall);
  return middleware(c, next);
});

app.get("/api/data", (c) => {
  return c.json({ data: "Premium data from Cloudflare Worker" });
});

export default app;
```

---

## Next.js Integration

### Middleware Approach (middleware.ts)

```typescript
// middleware.ts
import { paymentProxy, x402ResourceServer } from "@x402-avm/next";
import { createPaywall, avmPaywall } from "@x402-avm/paywall";
import { NextRequest, NextResponse } from "next/server";

const routes = {
  "/api/premium": {
    accepts: {
      scheme: "exact",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      asset: "10458941",
      payTo: process.env.PAYTO_ADDRESS!,
      price: "$0.01",
      maxTimeoutSeconds: 300,
    },
    description: "Premium API endpoint",
    mimeType: "application/json",
  },
};

const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({
    appName: "Next.js App",
    appLogo: "/logo.png",
    testnet: true,
  })
  .build();

const server = new x402ResourceServer({ url: process.env.FACILITATOR_URL! });

const proxy = paymentProxy(routes, server, { testnet: true }, paywall);

export async function middleware(request: NextRequest) {
  // Only apply to /api/premium routes
  if (request.nextUrl.pathname.startsWith("/api/premium")) {
    return proxy(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/premium/:path*"],
};
```

### Route Handler Approach (withX402)

```typescript
// app/api/premium/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402-avm/next";
import { createPaywall, avmPaywall } from "@x402-avm/paywall";

const server = new x402ResourceServer({
  url: process.env.FACILITATOR_URL!,
});

const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({ appName: "Next.js App", testnet: true })
  .build();

const routeConfig = {
  accepts: {
    scheme: "exact",
    network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    asset: "10458941",
    payTo: process.env.PAYTO_ADDRESS!,
    price: "$0.01",
    maxTimeoutSeconds: 300,
  },
  description: "Premium content",
  mimeType: "application/json",
};

async function handler(request: NextRequest) {
  return NextResponse.json({
    content: "Premium content unlocked with Algorand USDC payment!",
    timestamp: new Date().toISOString(),
  });
}

// Wrap the handler with x402 payment protection
export const GET = withX402(handler, routeConfig, server, { testnet: true }, paywall);
```

---

## Wallet Integration

The AVM paywall HTML page uses `@wallet-standard/app` to discover Algorand wallets and `@txnlab/use-wallet` ecosystem patterns for transaction signing.

### Supported Wallets

| Wallet | Type | Feature |
|--------|------|---------|
| Pera Wallet | Mobile + WalletConnect | `algorand:signTransaction` |
| Defly Wallet | Mobile + WalletConnect | `algorand:signTransaction` |
| Lute Wallet | Browser Extension | `algorand:signTransaction` |

### Wallet Discovery

The paywall page discovers wallets using the wallet-standard API:

```typescript
import { getWallets } from "@wallet-standard/app";

const walletsApi = getWallets();
const algorandWallets = walletsApi.get().filter((wallet) => {
  return "algorand:signTransaction" in wallet.features;
});
```

### Signer Derivation

Once a wallet is connected, the paywall derives a `ClientAvmSigner`:

```typescript
import type { ClientAvmSigner } from "@x402-avm/avm";

// The paywall internally creates this signer from the connected wallet
const signer: ClientAvmSigner = {
  address: activeAccount.address,
  async signTransactions(txns: Uint8Array[], indexesToSign?: number[]) {
    const signFeature = wallet.features["algorand:signTransaction"];
    return signFeature.signTransaction({ txns, indexesToSign });
  },
};
```

### React Hooks (Used Internally by Paywall)

The paywall template uses several React hooks internally. These are not public API but are useful for understanding and custom implementations:

```typescript
// useAlgorandWalletOptions -- discovers Algorand-capable wallets
import { useAlgorandWalletOptions } from "@x402-avm/paywall/avm/algorand/useAlgorandWalletOptions";
const walletOptions = useAlgorandWalletOptions();

// useAlgorandSigner -- derives ClientAvmSigner from connected wallet
import { useAlgorandSigner } from "@x402-avm/paywall/avm/algorand/useAlgorandSigner";
const signer = useAlgorandSigner({ activeWallet, activeAccount });

// useAlgorandBalance -- tracks USDC balance for connected account
import { useAlgorandBalance } from "@x402-avm/paywall/avm/algorand/useAlgorandBalance";
const { usdcBalance, formattedBalance, refreshBalance } = useAlgorandBalance({
  activeAccount,
  paymentRequired,
  onStatus: (msg) => console.log(msg),
});
```

### Custom Wallet Integration (Outside Paywall)

If you need to build a custom payment UI instead of using the built-in paywall:

```typescript
import { useWallet } from "@txnlab/use-wallet-react";
import { wrapFetchWithPayment, x402Client } from "@x402-avm/fetch";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";

function CustomPaymentUI() {
  const { activeAccount, signTransactions } = useWallet();

  async function payAndFetch(url: string) {
    if (!activeAccount) throw new Error("Connect wallet first");

    const signer: ClientAvmSigner = {
      address: activeAccount.address,
      signTransactions: async (txns, indexes) => signTransactions(txns, indexes),
    };

    const client = new x402Client();
    registerExactAvmScheme(client, { signer });
    const fetchWithPay = wrapFetchWithPayment(fetch, client);

    const response = await fetchWithPay(url);
    return response;
  }

  // ... render your custom UI
}
```

---

## Custom Paywall Configuration

### PaywallConfig Options

```typescript
interface PaywallConfig {
  appName?: string;      // Shown in wallet connection modal title
  appLogo?: string;      // Logo URL shown in the paywall header
  currentUrl?: string;   // URL the paywall should retry after payment
  testnet?: boolean;     // Network mode (affects AlgoNode endpoint)
}
```

### Setting Config at Build Time

```typescript
const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({
    appName: "My Premium API",
    appLogo: "https://cdn.example.com/logo.svg",
    testnet: false,  // Production: mainnet
  })
  .build();
```

### Overriding Config at Runtime

When the middleware generates the paywall HTML, you can override the build-time config:

```typescript
// The middleware passes runtime config from paywallConfig parameter
app.use(paymentMiddleware(
  routes,
  server,
  {
    // This PaywallConfig is passed to paywall.generateHtml() as runtime override
    testnet: process.env.NODE_ENV !== "production",
    appName: process.env.APP_NAME || "My App",
  },
  paywall,
));
```

### window.x402 Configuration Object

The generated HTML page injects a `window.x402` object that the paywall React app reads:

```javascript
window.x402 = {
  // Amount in human-readable USDC (e.g., 0.01 for $0.01)
  amount: 0.01,

  // Full PaymentRequired response from the server
  paymentRequired: {
    x402Version: 2,
    accepts: [{
      scheme: "exact",
      network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
      asset: "10458941",
      payTo: "ALGO_ADDRESS...",
      amount: "10000",
      maxTimeoutSeconds: 300,
    }],
    resource: {
      url: "https://api.example.com/premium",
      description: "Premium content",
      mimeType: "application/json",
    },
  },

  // Whether to use testnet Algod endpoints
  testnet: true,

  // URL to retry with payment header
  currentUrl: "https://api.example.com/premium",

  // Chain configuration (reserved for future use)
  config: { chainConfig: {} },

  // Branding
  appName: "My App",
  appLogo: "https://example.com/logo.png",
};
```

---

## Styling and Branding

### Built-In Paywall UI

The built-in AVM paywall page provides a styled payment UI out of the box with:

- Clean, responsive design that works on mobile and desktop.
- Wallet selection dropdown with icons for detected wallets.
- USDC balance display for the connected account.
- Payment amount and description from the server configuration.
- Loading states and error messages.
- Automatic redirect after successful payment.

### Customizing the App Name and Logo

```typescript
const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({
    appName: "Acme Premium",          // Shown in header and wallet modal
    appLogo: "https://acme.com/logo.svg",  // Logo in paywall header
  })
  .build();
```

### Building a Custom Paywall

If the built-in paywall does not meet your needs, you can create a completely custom `PaywallNetworkHandler`:

```typescript
import type { PaywallNetworkHandler, PaymentRequirements, PaymentRequired, PaywallConfig } from "@x402-avm/paywall";

const customAvmPaywall: PaywallNetworkHandler = {
  supports(requirement: PaymentRequirements): boolean {
    return requirement.network.startsWith("algorand:");
  },

  generateHtml(
    requirement: PaymentRequirements,
    paymentRequired: PaymentRequired,
    config: PaywallConfig,
  ): string {
    const amount = requirement.amount
      ? parseFloat(requirement.amount) / 1_000_000
      : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${config.appName || "Payment Required"}</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            text-align: center;
          }
          .logo { width: 64px; height: 64px; border-radius: 12px; }
          .amount { font-size: 2em; font-weight: bold; color: #1a1a2e; }
          .pay-btn {
            background: #6c63ff;
            color: white;
            border: none;
            padding: 16px 48px;
            font-size: 1.1em;
            border-radius: 12px;
            cursor: pointer;
            margin-top: 24px;
          }
          .pay-btn:hover { background: #5a52d5; }
        </style>
        <script>
          window.x402 = {
            amount: ${amount},
            paymentRequired: ${JSON.stringify(paymentRequired)},
            testnet: ${config.testnet ?? true},
            currentUrl: "${paymentRequired.resource?.url || config.currentUrl || ""}",
            config: { chainConfig: {} },
            appName: "${config.appName || ""}",
            appLogo: "${config.appLogo || ""}",
          };
        </script>
      </head>
      <body>
        ${config.appLogo ? `<img src="${config.appLogo}" class="logo" alt="logo" />` : ""}
        <h1>Payment Required</h1>
        <p>${paymentRequired.resource?.description || "Access to premium content"}</p>
        <div class="amount">$${amount.toFixed(2)} USDC</div>
        <p>on Algorand ${config.testnet ? "Testnet" : "Mainnet"}</p>
        <button class="pay-btn" id="payBtn">Connect Wallet & Pay</button>
        <div id="status"></div>

        <!-- Your custom payment logic here -->
        <script>
          // Read config from window.x402
          const { paymentRequired, currentUrl } = window.x402;
          // Implement wallet connection and payment...
        </script>
      </body>
      </html>
    `;
  },
};

// Use your custom handler
const paywall = createPaywall()
  .withNetwork(customAvmPaywall)
  .withConfig({ appName: "Custom Paywall" })
  .build();
```

---

## Multi-Network Paywalls

You can configure your server to accept payments on multiple networks and let the paywall handle routing to the appropriate wallet.

### Server: Accept Multiple Networks

```typescript
const routes = {
  "/api/premium": {
    // Accept payment on EITHER Algorand testnet or EVM Base Sepolia
    accepts: [
      {
        scheme: "exact",
        network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
        asset: "10458941",
        payTo: "ALGO_ADDRESS_HERE",
        price: "$0.01",
        maxTimeoutSeconds: 300,
      },
      {
        scheme: "exact",
        network: "eip155:84532",
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        payTo: "0xEVM_ADDRESS_HERE",
        price: "$0.01",
        maxTimeoutSeconds: 30,
      },
    ],
    description: "Premium content - pay with USDC on Algorand or Base",
    mimeType: "application/json",
  },
};
```

### Paywall: Register Multiple Network Handlers

```typescript
import { createPaywall, avmPaywall, evmPaywall } from "@x402-avm/paywall";

const paywall = createPaywall()
  .withNetwork(avmPaywall)    // Handles algorand:* requirements
  .withNetwork(evmPaywall)    // Handles eip155:* requirements
  .withConfig({
    appName: "Multi-Chain Premium",
    testnet: true,
  })
  .build();
```

The paywall will select the first matching handler based on the order of `accepts` in the payment requirements and the order of `.withNetwork()` calls.

### Algorand + Solana + EVM

```typescript
import { createPaywall, avmPaywall, evmPaywall, svmPaywall } from "@x402-avm/paywall";

const paywall = createPaywall()
  .withNetwork(avmPaywall)    // algorand:*
  .withNetwork(evmPaywall)    // eip155:*
  .withNetwork(svmPaywall)    // solana:*
  .withConfig({
    appName: "Universal Paywall",
    testnet: true,
  })
  .build();
```

---

## Complete Examples

### Complete Express.js Server with AVM Paywall

```typescript
// server.ts
import express from "express";
import cors from "cors";
import {
  paymentMiddleware,
  x402ResourceServer,
} from "@x402-avm/express";
import { createPaywall, avmPaywall } from "@x402-avm/paywall";

const app = express();
app.use(cors());
app.use(express.json());

// ---- Configuration ----

const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.example.com";
const PAYTO_ADDRESS = process.env.PAYTO_ADDRESS || "YOUR_ALGORAND_ADDRESS";
const PORT = parseInt(process.env.PORT || "3000");
const IS_TESTNET = process.env.NODE_ENV !== "production";

const ALGORAND_TESTNET_NETWORK = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const ALGORAND_MAINNET_NETWORK = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
const USDC_TESTNET_ASA = "10458941";
const USDC_MAINNET_ASA = "31566704";

const network = IS_TESTNET ? ALGORAND_TESTNET_NETWORK : ALGORAND_MAINNET_NETWORK;
const usdcAsset = IS_TESTNET ? USDC_TESTNET_ASA : USDC_MAINNET_ASA;

// ---- Route Definitions ----

const routes = {
  "/api/weather": {
    accepts: {
      scheme: "exact",
      network,
      asset: usdcAsset,
      payTo: PAYTO_ADDRESS,
      price: "$0.001",
      maxTimeoutSeconds: 60,
    },
    description: "Real-time weather data for any city",
    mimeType: "application/json",
  },
  "/api/article/:id": {
    accepts: {
      scheme: "exact",
      network,
      asset: usdcAsset,
      payTo: PAYTO_ADDRESS,
      price: "$0.05",
      maxTimeoutSeconds: 300,
    },
    description: "Full premium article access",
    mimeType: "application/json",
  },
  "/api/report": {
    accepts: {
      scheme: "exact",
      network,
      asset: usdcAsset,
      payTo: PAYTO_ADDRESS,
      price: "$1.00",
      maxTimeoutSeconds: 600,
    },
    description: "Comprehensive analytics report",
    mimeType: "application/json",
  },
};

// ---- Paywall Setup ----

const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({
    appName: "Premium Data API",
    appLogo: "https://example.com/api-logo.png",
    testnet: IS_TESTNET,
  })
  .build();

// ---- Middleware ----

const server = new x402ResourceServer({ url: FACILITATOR_URL });
app.use(paymentMiddleware(routes, server, { testnet: IS_TESTNET }, paywall));

// ---- Route Handlers ----

app.get("/", (req, res) => {
  res.json({
    name: "Premium Data API",
    endpoints: {
      "/api/weather?city=London": "$0.001 USDC - Weather data",
      "/api/article/:id": "$0.05 USDC - Premium articles",
      "/api/report": "$1.00 USDC - Full analytics report",
    },
    network: IS_TESTNET ? "Algorand Testnet" : "Algorand Mainnet",
    payTo: PAYTO_ADDRESS,
  });
});

app.get("/api/weather", (req, res) => {
  const city = req.query.city || "London";
  res.json({
    city,
    temperature: Math.round(15 + Math.random() * 20),
    humidity: Math.round(40 + Math.random() * 40),
    conditions: ["Sunny", "Cloudy", "Rainy", "Windy"][Math.floor(Math.random() * 4)],
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/article/:id", (req, res) => {
  res.json({
    id: req.params.id,
    title: "Premium Article: Advanced Algorand Development",
    content: "This is the full premium article content...",
    author: "x402-avm Team",
    publishedAt: new Date().toISOString(),
  });
});

app.get("/api/report", (req, res) => {
  res.json({
    title: "Comprehensive Analytics Report",
    generatedAt: new Date().toISOString(),
    metrics: {
      totalUsers: 15420,
      activeUsers: 8932,
      revenue: "$42,150",
      growth: "+15.3%",
    },
    sections: [
      { title: "User Acquisition", data: "..." },
      { title: "Retention Analysis", data: "..." },
      { title: "Revenue Breakdown", data: "..." },
    ],
  });
});

// ---- Start Server ----

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Network: ${IS_TESTNET ? "Algorand Testnet" : "Algorand Mainnet"}`);
  console.log(`Pay-to address: ${PAYTO_ADDRESS}`);
  console.log(`Facilitator: ${FACILITATOR_URL}`);
});
```

### Complete Next.js App with withX402

```typescript
// app/api/premium/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withX402, x402ResourceServer } from "@x402-avm/next";
import { createPaywall, avmPaywall } from "@x402-avm/paywall";

const server = new x402ResourceServer({
  url: process.env.FACILITATOR_URL!,
});

const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withConfig({
    appName: "Next.js Premium",
    appLogo: "/logo.svg",
    testnet: process.env.NODE_ENV !== "production",
  })
  .build();

const routeConfig = {
  accepts: {
    scheme: "exact",
    network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    asset: "10458941",
    payTo: process.env.PAYTO_ADDRESS!,
    price: "$0.01",
    maxTimeoutSeconds: 300,
  },
  description: "Premium AI-generated content",
  mimeType: "application/json",
};

async function handler(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const topic = searchParams.get("topic") || "Algorand";

  return NextResponse.json({
    topic,
    content: `Premium AI analysis of "${topic}"...`,
    generatedAt: new Date().toISOString(),
    model: "premium-v2",
  });
}

export const GET = withX402(
  handler,
  routeConfig,
  server,
  { testnet: process.env.NODE_ENV !== "production" },
  paywall,
);
```

```typescript
// app/page.tsx (Client component to interact with the paid API)
"use client";

import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function fetchPremium() {
    setLoading(true);
    try {
      // Direct fetch -- browser will see the paywall HTML on 402
      const res = await fetch("/api/premium?topic=DeFi");
      if (res.ok) {
        const data = await res.json();
        setResult(JSON.stringify(data, null, 2));
      } else if (res.status === 402) {
        // In browser, the paywall HTML page handles the 402
        // This branch is reached by programmatic fetch (not browser navigation)
        setResult("Payment required -- navigate to /api/premium in browser to see paywall");
      }
    } catch (err) {
      setResult(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "40px", maxWidth: "600px", margin: "auto" }}>
      <h1>x402-avm Next.js Demo</h1>
      <p>
        Visit{" "}
        <a href="/api/premium?topic=Algorand">/api/premium</a>{" "}
        in your browser to see the paywall.
      </p>
      <button onClick={fetchPremium} disabled={loading}>
        {loading ? "Loading..." : "Fetch Premium (programmatic)"}
      </button>
      {result && (
        <pre style={{ background: "#f0f0f0", padding: "16px", marginTop: "16px" }}>
          {result}
        </pre>
      )}
    </main>
  );
}
```

### Complete Hono API with Multi-Network Support

```typescript
// index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { paymentMiddleware, x402ResourceServer } from "@x402-avm/hono";
import { createPaywall, avmPaywall, evmPaywall } from "@x402-avm/paywall";

const app = new Hono();
app.use("*", cors());

// Accept payments on BOTH Algorand and Base Sepolia
const routes = {
  "/api/data": {
    accepts: [
      {
        scheme: "exact",
        network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
        asset: "10458941",
        payTo: process.env.ALGO_PAYTO!,
        price: "$0.01",
        maxTimeoutSeconds: 300,
      },
      {
        scheme: "exact",
        network: "eip155:84532",
        asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        payTo: process.env.EVM_PAYTO!,
        price: "$0.01",
        maxTimeoutSeconds: 30,
      },
    ],
    description: "Premium data - pay with USDC on Algorand or Base",
    mimeType: "application/json",
  },
};

// Multi-network paywall
const paywall = createPaywall()
  .withNetwork(avmPaywall)
  .withNetwork(evmPaywall)
  .withConfig({
    appName: "Multi-Chain API",
    testnet: true,
  })
  .build();

const server = new x402ResourceServer({ url: process.env.FACILITATOR_URL! });

app.use("*", paymentMiddleware(routes, server, { testnet: true }, paywall));

app.get("/", (c) => {
  return c.json({
    name: "Multi-Chain Premium API",
    endpoints: { "/api/data": "$0.01 USDC (Algorand or Base)" },
    networks: ["Algorand Testnet", "Base Sepolia"],
  });
});

app.get("/api/data", (c) => {
  return c.json({
    message: "This content was unlocked with USDC payment!",
    timestamp: new Date().toISOString(),
    data: { value: 42, trend: "up" },
  });
});

export default {
  port: 3000,
  fetch: app.fetch,
};
```

---

## API Reference Summary

### Exports from `@x402-avm/paywall`

| Export | Type | Description |
|--------|------|-------------|
| `createPaywall` | Function | Creates a new `PaywallBuilder` instance |
| `PaywallBuilder` | Class | Builder for configuring and building paywall providers |
| `avmPaywall` | Object | AVM network handler (algorand:*) |
| `evmPaywall` | Object | EVM network handler (eip155:*) |
| `svmPaywall` | Object | SVM network handler (solana:*) |
| `PaywallProvider` | Type | Interface for paywall HTML generation |
| `PaywallConfig` | Type | Configuration options for paywall branding |
| `PaywallNetworkHandler` | Type | Interface for network-specific handlers |
| `PaymentRequired` | Type | 402 response structure |
| `PaymentRequirements` | Type | Individual payment requirement |

### Exports from `@x402-avm/paywall/avm`

| Export | Type | Description |
|--------|------|-------------|
| `avmPaywall` | Object | AVM paywall handler (same as main export) |

### PaywallBuilder Methods

| Method | Description |
|--------|-------------|
| `.withNetwork(handler)` | Register a network-specific paywall handler |
| `.withConfig(config)` | Set default paywall configuration |
| `.build()` | Build and return a `PaywallProvider` |

### PaywallProvider Methods

| Method | Description |
|--------|-------------|
| `.generateHtml(paymentRequired, config?)` | Generate paywall HTML page |

### Middleware Functions

| Package | Function | Description |
|---------|----------|-------------|
| `@x402-avm/express` | `paymentMiddleware(routes, server, config?, paywall?)` | Express middleware |
| `@x402-avm/express` | `paymentMiddlewareFromHTTPServer(httpServer, config?, paywall?)` | Express (HTTP server) |
| `@x402-avm/express` | `paymentMiddlewareFromConfig(routes, facilitator?, schemes?, config?, paywall?)` | Express (config) |
| `@x402-avm/hono` | `paymentMiddleware(routes, server, config?, paywall?)` | Hono middleware |
| `@x402-avm/hono` | `paymentMiddlewareFromHTTPServer(httpServer, config?, paywall?)` | Hono (HTTP server) |
| `@x402-avm/hono` | `paymentMiddlewareFromConfig(routes, facilitator?, schemes?, config?, paywall?)` | Hono (config) |
| `@x402-avm/next` | `paymentProxy(routes, server, config?, paywall?)` | Next.js middleware proxy |
| `@x402-avm/next` | `withX402(handler, routeConfig, server, config?, paywall?)` | Next.js route wrapper |
| `@x402-avm/next` | `paymentProxyFromHTTPServer(httpServer, config?, paywall?)` | Next.js (HTTP server) |
| `@x402-avm/next` | `paymentProxyFromConfig(routes, facilitator?, schemes?, config?, paywall?)` | Next.js (config) |
