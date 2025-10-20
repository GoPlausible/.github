<img src="https://github.com/user-attachments/assets/e5256b28-db76-44f7-9fbf-da4057bc0448" alt="GoPlausible" width="200" />

# x402 Protocol with Algorand (AVM) Guide

This guide provides comprehensive documentation and examples for using the x402 protocol with Algorand (AVM) across various packages.

## Table of Contents
- [X402 Protocol Algorand (AVM) Specification](./algorand-guide/scheme_exact_avm.md)
- [Introduction](#introduction)
- [Algorand Implementation Details](#algorand-implementation-details)
- [Payment Flow](#payment-flow)
- [Schema and Types](#schema-and-types)
- [Package-Specific Examples](#package-specific-examples)
- [Environment Setup](#environment-setup)
- [Demo and Screenshots](#demo-and-screenshots)

## Introduction

The x402 protocol has been extended to support Algorand Virtual Machine (AVM), enabling payment verification and settlement on Algorand networks (both mainnet and testnet). This implementation follows the `exact` payment scheme pattern established for EVM and SVM networks, providing a consistent developer experience across all supported blockchains.

Key features of the Algorand implementation:

- **Native Protocol Features**: Leverages Algorand's lease field for PaymentRequirements attestation and binding transactions to payment requirements
- **Fee Abstraction**: Supports fee delegation through atomic transaction groups
- **Asset Support**: Handles both ALGO and Algorand Standard Assets (ASAs)
- **Fast Finality**: Benefits from Algorand's sub-5 second transaction finality
- **Wallet Support**: Integrates with Algorand wallets via `@txnlab/use-wallet`

## Algorand Implementation Details

The Algorand implementation of x402 utilizes several unique features of the Algorand blockchain:

### Lease Field for PaymentRequirements attestation

The implementation uses Algorand's `lease` field for PaymetRequirement attestation and bind transactions to specific payment requests. The lease value is set to the SHA-256 hash of the `paymentRequirements`, ensuring that:

1. Each transaction is uniquely tied to a specific payment request
2. The transaction cannot be reused for a different payment request
3. If the same client attempts to pay for the same resource multiple times, each payment requires a new transaction

### Atomic Transaction Groups for Fee Abstraction

When a fee payer is specified, the implementation uses Algorand's atomic transaction groups to ensure that:

1. The client's payment transaction (with fee=0) and the facilitator's fee-covering transaction are processed together
2. Either both transactions succeed or both fail
3. The fee payer only pays for the minimum Algorand network fee

### ASA Support

The implementation supports both native ALGO payments and transfers of Algorand Standard Assets (ASAs), with special handling for:

1. ASA opt-in verification
2. Asset ID validation
3. Decimal place conversion

## Payment Flow

1. **Client** requests a resource and receives a 402 Payment Required response with `paymentRequirements`
2. **Client** creates an Algorand transaction with:
   - Payment amount matching `paymentRequirements.maxAmountRequired`
   - Recipient matching `paymentRequirements.payTo`
   - Asset ID matching `paymentRequirements.asset` (0 for ALGO)
   - Lease field set to SHA-256 hash of `paymentRequirements`
3. **Client** signs the transaction and includes it in the `X-PAYMENT` header
4. **Resource Server** verifies the payment via the **Facilitator**
5. **Facilitator** submits the transaction (possibly as part of an atomic group for fee abstraction)
6. **Resource Server** grants access to the resource once the payment is settled

## Schema and Types

### NetworkSchema for Algorand

```typescript
// Extended NetworkSchema with Algorand networks
export const NetworkSchema = z.enum([
  // Existing networks
  'base-sepolia',
  'base',
  'avalanche-fuji',
  'avalanche',
  'iotex',
  'solana-devnet',
  'solana',
  // Algorand networks
  'algorand-testnet',
  'algorand',
])
```

### Payment Requirements for Algorand

```typescript
const paymentRequirements = {
  scheme: 'exact',
  network: 'algorand', // or "algorand-testnet"
  maxAmountRequired: '1000', // amount in smallest unit (microAlgos for ALGO)
  asset: '31566704', // ASA ID or "0" for ALGO
  payTo: 'PAYEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  resource: 'https://example.com/weather',
  description: 'Access to protected content',
  mimeType: 'application/json',
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6, // Optional, defaults to 6 for ALGO
    feePayer: 'PAYERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Optional
  },
}
```

### X-PAYMENT Header Payload for Algorand

```typescript
const paymentHeader = {
  x402Version: 1,
  scheme: 'exact',
  network: 'algorand', // or "algorand-testnet"
  payload: {
    transaction: 'AAAAAAAAAAAAA...AAAAAAAAAAAAA=', // Base64-encoded signed transaction
    feeTransaction: 'BBBBBBBBBBBBB...BBBBBBBBBBBBB=', // Optional, only if feePayer is used
  },
}
```

## Package-Specific Examples

- [x402 Core Package Examples](./x402-core-examples.md)
- [x402-express Examples](./x402-express-examples.md)
- [x402-hono Examples](./x402-hono-examples.md)
- [x402-next Examples](./x402-next-examples.md)
- [x402-fetch Examples](./x402-fetch-examples.md)
- [x402-axios Examples](./x402-axios-examples.md)

## Environment Setup

### Required Environment Variables

```bash
# Resource server configuration
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3000/facilitator
RESOURCE_WALLET_ADDRESS=YOUR_ALGORAND_ADDRESS
NETWORK=algorand-testnet  # or algorand for mainnet
ASSET=0  # 0 for ALGO or ASA ID for Algorand Standard Asset
PRICE=0.01  # Price in ALGO or ASA units
ALGOD_SERVER=https://testnet-api.algonode.cloud  # or mainnet
ALGOD_TOKEN=
ALGOD_PORT=
ALGORAND_FEE_PAYER=YOUR_FEE_PAYER_ADDRESS  # Optional
```

### Package Installation

```bash
npm install @algorand/algosdk @txnlab/use-wallet
# Plus the x402 packages you need:
npm install x402 x402-express x402-next # etc.
```

## Demo and Screenshots

You can check out the live x402-Algorand demo set to receive 0.01 USDC with paid fees on Algorand TESTNET here: [X402-Algorand](https://x402-avm.vercel.app)

### Automated Tests and Lint Checks

All tests have passed for the Algorand implementation:

![All tests passed](https://github.com/user-attachments/assets/f172ddaf-b9ed-46aa-a1e7-ecf44587f3d2)

All lint checks have passed as well:

![Lint checks passed](https://github.com/user-attachments/assets/17b11b44-7329-4ce8-931d-30a20b71da4e)

### Implementation Screenshots

The following screenshots showcase the Algorand implementation in action:

![Implementation Screenshot 1](https://github.com/user-attachments/assets/f3518ba7-e6d5-48d7-acf2-b19b54ec3b0c)

![Implementation Screenshot 2](https://github.com/user-attachments/assets/00c574e9-9d3b-4337-9bfb-86ec9b90f7ea)

![Implementation Screenshot 3](https://github.com/user-attachments/assets/ae594b3c-0ea7-47f0-b79c-f3a21c039a7c)
