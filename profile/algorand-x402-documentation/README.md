<img src="https://github.com/user-attachments/assets/e5256b28-db76-44f7-9fbf-da4057bc0448" alt="GoPlausible" width="200" />

# x402 Protocol with Algorand (AVM) documentation

## Table of Contents

- [Introduction](#introduction)
- [Algorand Implementation Details](#algorand-implementation-details)
- [Facilitator](#facilitator)
- [x402 V2 Packages for Algorand (AVM) implementation](#x402-v2-packages-for-algorand-avm-implementation)
- [x402 V2 Package-Specific Code examples](#x402-v2-package-specific-code-examples)
  - [Typescript Examples](#typescript-examples)
  - [Python Examples](#python-examples)
- [Algorand x402 Screencast](./x402-screencast.md)
- [Payment Flow](#payment-flow)
- [Schema and Types](#schema-and-types)
- [Environment Setup](#environment-setup)
- [x402 Legacy V1 NPM Packages for Algorand (AVM) implementation](#x402-legacy-v1-npm-packages-for-algorand-avm-implementation)
- [x402 Legacy V1 Package-Specific Examples](#x402-legacy-v1-package-specific-examples)
- [Algorand x402 Legacy V1 Screencast](./v1/x402-screencast.md)

## Introduction

GoPlausible has built the reference implementation, packages, documentation and example codes for Algorand (AVM) X402 integration available as FOSS and also contributed to the Algorand Foundation PR to Coinbase's x402 protocol repo: [Coinbase x402 PR #361](https://github.com/coinbase/x402/pull/361/) which has been [merged to Coinbase x402 repository](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_algo.md) and is available in the main Coinbase 402 repository.

By collaboration between Algorand Foundation and GoPlausible, The x402 protocol has been extended to support Algorand Virtual Machine (AVM), enabling payment verification and settlement on Algorand networks **(both mainnet and testnet)**. This implementation follows the Algorand `exact` payment scheme and also the implementation patterns established for EVM and SVM networks for 100% alignment, providing a consistent developer experience across all supported blockchains.

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

## Facilitator

Algorand has a dedicated facilitator that handles payment verification and settlement for the x402 protocol on Algorand **MAINNET** and **TESTNET**:
- **Facilitator Address**: [x402-avm-facilitator](https://facilitator.goplausible.xyz/)
- **Supported Networks**: Algorand Mainnet and Testnet, Solana Mainnet and Devnet, Base ETH and Sepolia. Check live here [Algorand x402 supported networks](https://facilitator.goplausible.xyz/supported)
- **Facilitator API docs**: [Algorand x402 Facilitator OpenAPI docs](https://facilitator.goplausible.xyz/docs)

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

### Typescript Examples:

#### Core and Mechanism Examples:

- x402 V2 Core Package Examples [x402-avm-core-examples](./typescript/x402-avm-core-examples.md)
- x402 V2 AVM (Algorand) Mechanism Examples [x402-avm-avm-examples](./typescript/x402-avm-avm-examples.md)

#### Extensions and Paywall Examples:

- x402 V2 Extensions Examples [x402-avm-extensions-examples](./typescript/x402-avm-extensions-examples.md)
- x402 V2 Paywall UI Examples [x402-avm-paywall-examples](./typescript/x402-avm-paywall-examples.md)

#### Back-end Framework-Specific Middleware Examples:

- x402 V2 Express Middleware Examples [x402-avm-express-examples](./typescript/x402-avm-express-examples.md)
- x402 V2 Hono Middleware Examples [x402-avm-hono-examples](./typescript/x402-avm-hono-examples.md)

#### Fullstack Framework-Specific Examples:

- x402 V2 Next.js Middleware Examples [x402-avm-next-examples](./typescript/x402-avm-next-examples.md)

#### HTTP Client Examples:

- x402 V2 Fetch Client Examples [x402-avm-fetch-examples](./typescript/x402-avm-fetch-examples.md)
- x402 V2 Axios Client Examples [x402-avm-axios-examples](./typescript/x402-avm-axios-examples.md)

### Python Examples:

#### Core and Mechanism Examples:

- x402 V2 AVM (Algorand) Mechanism Examples (Python) [x402-avm-avm-examples-python](./python/x402-avm-avm-examples-python.md)

#### Extensions Examples:

- x402 V2 Extensions Examples (Python) [x402-avm-extensions-examples-python](./python/x402-avm-extensions-examples-python.md)

#### Back end Framework-Specific Middleware Examples:

- x402 V2 FastAPI Middleware Examples (Python) [x402-avm-fastapi-examples-python](./python/x402-avm-fastapi-examples-python.md)
- x402 V2 Flask Middleware Examples (Python) [x402-avm-flask-examples-python](./python/x402-avm-flask-examples-python.md)

#### HTTP Client Examples:

- x402 V2 HTTPX Client Examples (Python) [x402-avm-httpx-examples-python](./python/x402-avm-httpx-examples-python.md)
- x402 V2 Requests Client Examples (Python) [x402-avm-requests-examples-python](./python/x402-avm-requests-examples-python.md)

## Payment Flow

### Overview

```
Client → Resource Server → Facilitator → Algorand Network
  │          │                  │                │
  │ 1. GET   │                  │                │
  │─────────>│                  │                │
  │ 2. 402   │                  │                │
  │<─────────│                  │                │
  │ 3. Build │                  │                │
  │   payload│                  │                │
  │ 4. GET + │                  │                │
  │ X-PAYMENT│                  │                │
  │─────────>│ 5. verify()      │                │
  │          │─────────────────>│ 6. simulate    │
  │          │                  │───────────────>│
  │          │                  │<───────────────│
  │          │<─────────────────│                │
  │          │ 7. settle()      │                │
  │          │─────────────────>│ 8. sign + send │
  │          │                  │───────────────>│
  │          │                  │<───────────────│
  │          │<─────────────────│ 9. txId        │
  │ 10. 200  │                  │                │
  │<─────────│                  │                │
```

### Detailed Steps

1. **Client** requests a protected resource and receives a `402 Payment Required` response containing `paymentRequirements` (scheme, network, amount, asset, payTo, extra)

2. **Client** creates an atomic transaction group based on `paymentRequirements`:

   **Without fee abstraction** (no `feePayer` in `extra`):
   - Single ASA transfer transaction (`axfer`) with:
     - Sender: client's Algorand address
     - Receiver: `paymentRequirements.payTo`
     - Amount: `paymentRequirements.amount` (atomic units)
     - Asset Index: `paymentRequirements.asset` (ASA ID)
     - Fee: minimum fee (1000 microAlgos)
     - Note: `"x402-payment-v2"` (bytes)

   **With fee abstraction** (`feePayer` in `extra`):
   - **Transaction [0] — Fee Payer** (unsigned, for facilitator to sign):
     - Type: `pay` (payment)
     - Sender: `feePayer` address
     - Receiver: `feePayer` (self-payment)
     - Amount: `0`
     - Fee: `minFee × 2` (pooled fee covering both transactions)
     - FlatFee: `true`
     - Note: `"x402-fee-payer"` (bytes)
   - **Transaction [1] — ASA Transfer** (signed by client):
     - Type: `axfer` (asset transfer)
     - Sender: client's address
     - Receiver: `paymentRequirements.payTo`
     - Amount: `paymentRequirements.amount`
     - Asset Index: `paymentRequirements.asset`
     - Fee: `0` (fee payer covers)
     - FlatFee: `true`
     - Note: `"x402-payment-v2"` (bytes)
   - Atomic group ID is assigned to both transactions

3. **Client** signs only its own transactions (ASA transfer), leaves fee payer transaction unsigned. Encodes all transactions as base64 msgpack strings in `paymentGroup` array.

4. **Client** sends the request with `X-PAYMENT` header containing the payload:

   ```json
   {
     "x402Version": 2,
     "scheme": "exact",
     "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
     "payload": {
       "paymentGroup": [
         "<base64-fee-payer-txn>",
         "<base64-signed-asa-transfer>"
       ],
       "paymentIndex": 1
     }
   }
   ```

5. **Resource Server** forwards the payment to the **Facilitator** for verification.

6. **Facilitator** runs `verify()`:
   - Validates payload format (`paymentGroup` array, `paymentIndex` bounds)
   - Validates group size ≤ 16 transactions
   - Decodes all transactions (signed and unsigned)
   - Only allows unsigned transactions from facilitator-managed addresses
   - Verifies group ID consistency across all transactions
   - **Security checks** on all transactions:
     - No `keyreg` (key registration) transactions
     - No `rekeyTo` (unless balanced sandwich pattern: A→B then B→A)
     - No `closeRemainderTo` or `assetCloseTo` fields (prevents account draining)
   - Verifies payment transaction at `paymentIndex`:
     - Type must be `axfer` (asset transfer)
     - Asset ID matches `requirements.asset`
     - Receiver matches `requirements.payTo`
     - Amount matches `requirements.amount`
     - Transaction is signed
   - Verifies fee payer transaction (if present):
     - Sender is in facilitator's managed addresses
     - Type is `pay`, amount is `0`, no `closeRemainderTo`, no `rekeyTo`
     - Fee ≤ `MAX_REASONABLE_FEE` (10 Algo / 10,000,000 microAlgos)
   - Signs fee payer transaction and **simulates** the full group on-chain
   - Returns `VerifyResponse { isValid, invalidReason? }`

7. **Facilitator** runs `settle()`:
   - Re-verifies the payment
   - Signs all facilitator-managed transactions (fee payer)
   - Submits the complete signed group to the Algorand network
   - Extracts the payment transaction ID
   - Returns `SettleResponse { success, transaction (txId), network }`

8. **Resource Server** grants access to the protected resource

### Algorand-Specific Advantages

- **Instant Finality**: Algorand transactions are final in ~3.3 seconds — no reorgs, no rollbacks
- **Atomic Groups**: Up to 16 transactions execute all-or-nothing (no partial failures)
- **Fee Pooling**: One transaction in a group can pay fees for all others
- **Composability**: Additional transactions (smart contract calls, opt-ins) can be added to the `paymentGroup` alongside the payment

## Schema and Types

### V2 CAIP-2 Network Identifiers

x402 V2 uses [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md) identifiers — the genesis hash uniquely identifies each Algorand network:

| Network          | CAIP-2 Identifier                                       |
| ---------------- | ------------------------------------------------------- |
| Algorand Mainnet | `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=` |
| Algorand Testnet | `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=` |

V1 legacy identifiers (`algorand-mainnet`, `algorand-testnet`) are still supported via automatic mapping.

### PaymentRequirements

```typescript
// TypeScript
type PaymentRequirements = {
  scheme: string; // "exact"
  network: Network; // CAIP-2 identifier
  asset: string; // ASA ID as string (e.g., "10458941" for USDC testnet)
  amount: string; // Amount in atomic units (smallest unit)
  payTo: string; // Recipient address (58-char Algorand address)
  maxTimeoutSeconds: number; // Payment validity window
  extra: Record<string, unknown>; // AVM-specific: feePayer, decimals
};
```

```python
# Python
class PaymentRequirements(BaseX402Model):
    scheme: str                            # "exact"
    network: Network                       # CAIP-2 identifier
    asset: str                             # ASA ID as string
    amount: str                            # Atomic units (smallest unit)
    pay_to: str                            # Recipient address
    max_timeout_seconds: int               # Validity window
    extra: dict[str, Any]                  # feePayer, decimals
```

#### `extra` Field Contents (AVM-Specific)

| Key        | Type     | Description                            | Source                     |
| ---------- | -------- | -------------------------------------- | -------------------------- |
| `feePayer` | `string` | Fee payer address for gasless payments | Facilitator's `getExtra()` |
| `decimals` | `number` | Asset decimals (e.g., 6 for USDC)      | Server enhancement         |

#### Example

```typescript
const paymentRequirements = {
  scheme: "exact",
  network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
  amount: "10000", // 0.01 USDC (6 decimal places)
  asset: "10458941", // USDC ASA ID on Algorand Testnet
  payTo: "PAYEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  maxTimeoutSeconds: 60,
  extra: {
    decimals: 6,
    feePayer: "PAYERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  },
};
```

### X-PAYMENT Header Payload

```typescript
// TypeScript
interface ExactAvmPayloadV2 {
  /** Array of base64-encoded msgpack transactions forming an atomic group */
  paymentGroup: string[];
  /** Zero-based index of the payment transaction within paymentGroup */
  paymentIndex: number;
}
```

```python
# Python
@dataclass
class ExactAvmPayload:
    payment_group: list[str] = field(default_factory=list)
    payment_index: int = 0
```

#### Full X-PAYMENT Header Example

```json
{
  "x402Version": 2,
  "scheme": "exact",
  "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
  "payload": {
    "paymentGroup": ["iqNhbXQAo2ZlZc0H0KJm...==", "iqNhbXTOAAAnEKRhcmN2..."],
    "paymentIndex": 1
  }
}
```

### Constants Reference

| Constant              | Value                             | Description                           |
| --------------------- | --------------------------------- | ------------------------------------- |
| USDC Mainnet ASA ID   | `31566704`                        | USDC on Algorand Mainnet              |
| USDC Testnet ASA ID   | `10458941`                        | USDC on Algorand Testnet              |
| USDC Decimals         | `6`                               | Decimal places for USDC               |
| Min Transaction Fee   | `1000` microAlgos                 | Minimum fee per transaction           |
| Max Atomic Group Size | `16`                              | Maximum transactions in a group       |
| Max Reasonable Fee    | `10,000,000` microAlgos (10 Algo) | Safety cap for fee payer transactions |

## Environment Setup

### Facilitator (Standalone Examples)

The facilitator verifies and settles payments. It needs a private key to sign fee payer transactions.

> **Online Facilitator**: You can use the public GoPlausible facilitator at `https://facilitator.goplausible.xyz` instead of running your own.

#### TypeScript

```bash
# Server port (default: 4022)
PORT=4022

# AVM facilitator private key (Base64-encoded, 64 bytes: 32-byte seed + 32-byte pubkey)
AVM_PRIVATE_KEY=<your-base64-private-key>

# Algod endpoint (optional — defaults to AlgoNode public testnet)
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
```

#### Python

```bash
# Server port (default: 4022)
PORT=4022

# AVM facilitator private key (Base64-encoded, 64 bytes: 32-byte seed + 32-byte pubkey)
AVM_PRIVATE_KEY=<your-base64-private-key>

# Algod endpoint (optional — defaults to AlgoNode public testnet)
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
```

### Facilitator (Next.js Reference Site)

The Next.js reference site bundles the facilitator as an API route (`/facilitator`). It uses different env var names with `FACILITATOR_` prefix.

```bash
# Facilitator URL (both server-side and client-side)
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3000/facilitator
FACILITATOR_URL=http://localhost:3000/facilitator
# Or use the online facilitator:
# NEXT_PUBLIC_FACILITATOR_URL=https://facilitator.goplausible.xyz
# FACILITATOR_URL=https://facilitator.goplausible.xyz

# AVM facilitator private key (Base64-encoded, 64 bytes: 32-byte seed + 32-byte pubkey)
FACILITATOR_AVM_PRIVATE_KEY=<your-base64-private-key>

# AVM payee address (58-character Algorand address)
RESOURCE_AVM_ADDRESS=YOUR_ALGORAND_ADDRESS_HERE
```

### Resource Server

The resource server protects endpoints and requires payment via x402.

#### TypeScript

```bash
# AVM payee address (receives payments)
AVM_ADDRESS=YOUR_ALGORAND_ADDRESS_HERE

# Facilitator URL for payment verification
FACILITATOR_URL=http://localhost:4022
# Or use the online facilitator:
# FACILITATOR_URL=https://facilitator.goplausible.xyz
```

#### Python

```bash
# AVM payee address (receives payments)
AVM_ADDRESS=YOUR_ALGORAND_ADDRESS_HERE

# Facilitator URL for payment verification
FACILITATOR_URL=http://localhost:4022
# Or use the online facilitator:
# FACILITATOR_URL=https://facilitator.goplausible.xyz
```

### Client

The client makes payments to access protected resources.

#### TypeScript

```bash
# AVM client private key (Base64-encoded, 64 bytes)
AVM_PRIVATE_KEY=<your-base64-private-key>

# Protected resource server
RESOURCE_SERVER_URL=http://localhost:4021
ENDPOINT_PATH=/weather
```

#### Python

```bash
# AVM client private key (Base64-encoded, 64 bytes)
AVM_PRIVATE_KEY=<your-base64-private-key>

# Protected resource server
RESOURCE_SERVER_URL=http://localhost:4021
ENDPOINT_PATH=/weather
```

### Private Key Format

The `AVM_PRIVATE_KEY` / `FACILITATOR_AVM_PRIVATE_KEY` is a **Base64-encoded 64-byte key**:

- First 32 bytes: Ed25519 seed (private key)
- Last 32 bytes: Ed25519 public key
- Address is derived from the public key: `encode_address(secret_key[32:])`

### SDK Algod Endpoint Configuration

The SDK uses AlgoNode public endpoints by default. Override with environment variables:

```bash
# Custom Algod endpoints (optional — fallback to AlgoNode)
ALGOD_MAINNET_URL=https://mainnet-api.algonode.cloud    # default
ALGOD_TESTNET_URL=https://testnet-api.algonode.cloud    # default

# Python SDK also supports custom Indexer endpoints
INDEXER_MAINNET_URL=https://mainnet-idx.algonode.cloud   # default
INDEXER_TESTNET_URL=https://testnet-idx.algonode.cloud   # default
```

### Package Installation

#### TypeScript

```bash
# Core packages
npm install @x402-avm/core @x402-avm/avm algosdk

# Server middleware (choose one)
npm install @x402-avm/express    # Express.js
npm install @x402-avm/hono       # Hono
npm install @x402-avm/next       # Next.js

# Client packages (choose one)
npm install @x402-avm/fetch      # Fetch API
npm install @x402-avm/axios      # Axios

# Paywall UI (optional)
npm install @x402-avm/paywall

# Wallet integration (for browser clients)
npm install @txnlab/use-wallet
```

#### Python

```bash
# Minimal AVM support
pip install x402-avm[avm]

# Server frameworks (choose one)
pip install x402-avm[avm,fastapi]
pip install x402-avm[avm,flask]

# HTTP clients (choose one)
pip install x402-avm[avm,httpx]
pip install x402-avm[avm,requests]

# Full installation (all mechanisms + all extras)
pip install x402-avm[all]
```

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
