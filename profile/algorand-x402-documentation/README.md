<img src="https://github.com/user-attachments/assets/e5256b28-db76-44f7-9fbf-da4057bc0448" alt="GoPlausible" width="200" />

# x402 Protocol with Algorand (AVM) documentation

## Table of Contents

- [Introduction](#introduction)
- [Algorand Implementation Details](#algorand-implementation-details)
- [x402 V2 Packages for Algorand (AVM) implementation](#x402-v2-packages-for-algorand-avm-implementation)
- [x402 V2 Package-Specific Code examples](#x402-v2-package-specific-code-examples)
- [Algorand x402 Screencast](./x402-screencast.md)
- [Payment Flow](#payment-flow)
- [Schema and Types](#schema-and-types)
- [Environment Setup](#environment-setup)
- [x402 Legacy V1 NPM Packages for Algorand (AVM) implementation](#x402-legacy-v1-npm-packages-for-algorand-avm-implementation)
- [x402 Legacy V1 Package-Specific Examples](#x402-legacy-v1-package-specific-examples)
- [Algorand x402 Legacy V1 Screencast](./v1/x402-screencast.md)

## Introduction

GoPlausible has built the reference implementation, packages, documentation and example codes for Algorand (AVM) X402 integration available as FOSS and also contributed to the Algorand Foundation PR to Coinbase's x402 protocol repo: [Coinbase x402 PR #361](https://github.com/coinbase/x402/pull/361/) which has been [merged to Coinbase x402 repository](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_algo.md) and is available in the main Coinbase 402 repository.

By collaboration between Algorand Foundation and GoPlausible, The x402 protocol has been extended to support Algorand Virtual Machine (AVM), enabling payment verification and settlement on Algorand networks (both mainnet and testnet). This implementation follows the `exact` payment scheme pattern established for EVM and SVM networks, providing a consistent developer experience across all supported blockchains.

Key features of the Algorand implementation:

- **Native Protocol Features**: Uses Algorand's native transaction capabilities for flexible, secure and efficient payments.
- **Fee Abstraction**: Supports fee delegation through atomic transaction groups
- **Asset Support**: Handles both ALGO and Algorand Standard Assets (ASAs)
- **Fast Finality**: Benefits from Algorand's sub-5 second transaction finality
- **Wallet Support**: Integrates with Algorand wallets via `@txnlab/use-wallet`

## Algorand Implementation Details

The Algorand implementation of x402 utilizes several unique features of the Algorand blockchain:

### Transaction Group with composability

The implementation allows for composability of transactions within the payment group, enabling more complex interactions such as multi-step payments, conditional payments, or integrating with other smart contracts on Algorand.

The `paymentGroup` can include additional transactions beyond the payment and fee transactions, and the `paymentIndex` field specifies which transaction in the group is the actual payment transaction. This flexibility allows developers to create more sophisticated payment flows while still adhering to the x402 protocol.

### Fee Abstraction and beyond

Atomic transaction groups enable fee abstraction as well, allowing a third-party fee payer to cover transaction fees on behalf of the resource requester. This is achieved by grouping the payment transaction with a fee transaction from the fee payer.
This transaction is not signed by the client but is included in the `paymentGroup` and the protocol ensures that the fee transaction covers the fees for both transactions in the group. This allows for a seamless user experience where the client can make payments without needing to hold ALGO for fees, while still ensuring that the resource server receives the required payment.

### ASA Support

The implementation supports both native ALGO payments and transfers of Algorand Standard Assets (ASAs) e.g. USDC, with special handling for:

1. ASA opt-in verification
2. Asset ID validation
3. Decimal place conversions on asset units and amounts

## x402 V2 Packages for Algorand (AVM) implementation:

### Typescript Packages:

#### Core and Mechanism Packages:

- x402 V2 Core Package [@x402-avm/core](https://www.npmjs.com/package/@x402-avm/core)
- x402 V2 AVM (Algorand) Mechanism [@x402-avm/avm](https://www.npmjs.com/package/@x402-avm/avm)

#### Extensions and Paywall Packages:

- x402 V2 Extensions [@x402-avm/extensions](https://www.npmjs.com/package/@x402-avm/extensions)
- x402 V2 Paywall UI [@x402-avm/paywall](https://www.npmjs.com/package/@x402-avm/paywall)

#### Back end Framework-Specific Middleware and Client Packages:

- x402 V2 Express Middleware [@x402-avm/express](https://www.npmjs.com/package/@x402-avm/express)
- x402 V2 Hono Middleware [@x402-avm/hono](https://www.npmjs.com/package/@x402-avm/hono)
- x402 V2 Next.js Middleware [@x402-avm/next](https://www.npmjs.com/package/@x402-avm/next)

#### HTTP Client Packages:

- x402 V2 Fetch Client [@x402-avm/fetch](https://www.npmjs.com/package/@x402-avm/fetch)
- x402 V2 Axios Client [@x402-avm/axios](https://www.npmjs.com/package/@x402-avm/axios)

### Python Packages:

- x402 V2 Python SDK [x402-avm](https://pypi.org/project/x402-avm/)
  Extras packages for Python SDK: [all] , [clients] , [evm] , [extensions] , [fastapi] , [flask] , [httpx] , [mechanisms] , [requests] , [servers] , [svm]

## x402 V2 Package-Specific Code examples:

- x402 V2 Core Package Examples [x402-avm-core-examples](./x402-avm-core-examples.md)
- x402 V2 AVM (Algorand) Mechanism Examples [x402-avm-avm-examples](./x402-avm-avm-examples.md)
- x402 V2 Extensions Examples [x402-avm-extensions-examples](./x402-avm-extensions-examples.md)
- x402 V2 Paywall UI Examples [x402-avm-paywall-examples](./x402-avm-paywall-examples.md)
- x402 V2 Express Middleware Examples [x402-avm-express-examples](./x402-avm-express-examples.md)
- x402 V2 Hono Middleware Examples [x402-avm-hono-examples](./x402-avm-hono-examples.md)
- x402 V2 Next.js Middleware Examples [x402-avm-next-examples](./x402-avm-next-examples.md)
- x402 V2 Fetch Client Examples [x402-avm-fetch-examples](./x402-avm-fetch-examples.md)
- x402 V2 Axios Client Examples [x402-avm-axios-examples](./x402-avm-axios-examples.md)

## x402 Legacy V1 NPM Packages for Algorand (AVM) implementation:

- [x402 Core Package](https://www.npmjs.com/package/x402-avm)
- [x402-express Package](https://www.npmjs.com/package/x402-avm-express)
- [x402-hono Package](https://www.npmjs.com/package/x402-avm-hono)
- [x402-next Package](https://www.npmjs.com/package/x402-avm-next)
- [x402-fetch Package](https://www.npmjs.com/package/x402-avm-fetch)
- [x402-axios Package](https://www.npmjs.com/package/x402-avm-axios)

This guide provides comprehensive documentation and examples for using the x402 protocol with Algorand (AVM) across various packages.

## x402 Legacy V1 Package-Specific Examples

- [x402 V1 Core Package Examples](./v1/x402-v1-core-examples.md)
- [x402 V1 Express Examples](./v1/x402-v1-express-examples.md)
- [x402 V1 Hono Examples](./v1/x402-v1-hono-examples.md)
- [x402 V1 Next Examples](./v1/x402-v1-next-examples.md)
- [x402 V1 Fetch Examples](./v1/x402-v1-fetch-examples.md)
- [x402 V1 Axios Examples](./v1/x402-v1-axios-examples.md)

## Payment Flow

1. **Client** requests a resource and receives a 402 Payment Required response with `paymentRequirements`
2. If **feePayer** is not present **Client** creates an Algorand asset transfer (In case Asset is present, e.g. pay with USDC) or pay (if no asset is present) transaction with minimum fee (0.001 Algo) and:
   - Payment amount matching `paymentRequirements.maxAmountRequired`
   - Recipient matching `paymentRequirements.payTo`
   - Asset ID matching `paymentRequirements.asset` (0 for ALGO)
   - Lease field set to SHA-256 hash of `paymentRequirements`
3. If **feePayer** is present **Client** creates two grouped Algorand transactions in `paymentGroup` field of payload:
   - **Payment Transaction** from step 2 with fee=0.
   - **Fee Transaction** from `feePayer` to `feePayer` with amount=0, fee covering both transactions (2 x minimum fee)
4. **Client** adds other transactions to group and specifies the payment transaction index as `paymentIndex` field of payload.
5. **Client** signs the transaction and includes it in the `X-PAYMENT` header payload `paymentGroup` at `paymentIndex`.
6. **Resource Server** verifies and settles the payment via the **Facilitator**
7. **Facilitator** verifies and submits the transaction (possibly as part of an atomic group for fee abstraction) and creates settlement response (Failed or fulfilled).
8. **Resource Server** grants access to the resource once the payment is settled

## Schema and Types

### NetworkSchema for Algorand

```typescript
// Extended NetworkSchema with Algorand networks
export const NetworkSchema = z.enum([
  // Existing networks
  "base-sepolia",
  "base",
  "avalanche-fuji",
  "avalanche",
  "iotex",
  "solana-devnet",
  "solana",
  // Algorand networks
  "algorand-testnet",
  "algorand-mainnet",
]);
```

### Payment Requirements for Algorand

```typescript
const paymentRequirements = {
  scheme: "exact",
  network: "algorand", // or "algorand-testnet"
  maxAmountRequired: "10000", // amount in smallest unit 0.01 USDC (6 decimal places)
  asset: "31566704", // ASA ID or "0" for ALGO
  payTo: "PAYEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  resource: "https://example.com/weather",
  description: "Access to protected content",
  mimeType: "application/json",
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6, // Optional, defaults to 6 for ALGO
    feePayer: "PAYERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", // Optional
  },
};
```

### X-PAYMENT Header Payload for Algorand

```typescript
const paymentHeader = {
  x402Version: 1,
  scheme: "exact",
  network: "algorand-mainnet", // or "algorand-testnet"
  payload: {
    paymentGroup: [
      "AAAAAAAAAAAAA...AAAAAAAAAAAAA=",
      "BBBBBBBBBBBBB...BBBBBBBBBBBBB=",
    ],
    paymentIndex: 1,
  },
};
```

## Environment Setup

### Required Environment Variables

```bash
# Resource server configuration
FACILITATOR_URL=http://localhost:3000/facilitator
RESOURCE_WALLET_ADDRESS=YOUR_ALGORAND_ADDRESS
PRIVATE_KEY=YOUR_ALGORAND_MNEMONICS # Algorand account secret key or mnemonics
NETWORK=algorand-testnet  # or algorand for mainnet
ASSET=10458941  # USDC, use  0 or leave undefined for ALGO or use ASA ID for Algorand Standard Asset
PRICE=10000 # Price in units (e.g. 10000 for 0.01 USDC with 6 decimal places)

ALGOD_SERVER=https://testnet-api.algonode.cloud  # or mainnet
ALGOD_TOKEN=
ALGOD_PORT=
FEE_PAYER=YOUR_FEE_PAYER_ADDRESS  # Optional
```

### ENV Variables for refrence implementation site (NextJS) package on AVM:

```bash
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3000/facilitator
RESOURCE_WALLET_ADDRESS=YOUR_ALGORAND_ADDRESS
NETWORK=algorand-testnet # or algorand for mainnet
PRIVATE_KEY=YOUR_ALGORAND_MNEMONICS # Algorand account secret key or mnemonics
ASSET=10458941 // USDC ASA ID on Algorand TESTNET, use '0' or leave undefined for ALGO
PRICE=10000 # Price in units (e.g. 10000 for 0.01 USDC with 6 decimal places)
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
ALGOD_PORT=
FEE_PAYER=YOUR_FEE_PAYER_ADDRESS
```

### Package Installation

```bash
npm install @algorand/algosdk @txnlab/use-wallet
# Plus the x402 packages you need:
npm install x402 x402-express x402-next # etc.
```
