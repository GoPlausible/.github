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
- [Algorand x402 Legacy V2 Using AlgoSDK (archived)](../archive/algorand-x402-documentation/V2_Algosdk_legacy/typescript)
- [x402 Legacy V1 NPM Packages for Algorand (AVM) implementation](#x402-legacy-v1-npm-packages-for-algorand-avm-implementation)
- [x402 Legacy V1 Package-Specific Examples](#x402-legacy-v1-package-specific-examples)
- [Algorand x402 Legacy V1 Screencast (archived)](../archive/algorand-x402-documentation/v1/x402-screencast.md)

## Introduction

GoPlausible has built the reference implementation, packages, documentation and example code for Algorand (AVM) x402 integration, available as FOSS, and contributed it to the x402 protocol repository (now [x402-foundation/x402](https://github.com/x402-foundation/x402), formerly coinbase/x402):

- The Algorand `exact` scheme specification, proposed by the Algorand Foundation in [x402 PR #361](https://github.com/x402-foundation/x402/pull/361), is merged: [scheme_exact_algo.md](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_algo.md).
- The TypeScript implementation was contributed by GoPlausible in [x402 PR #1560](https://github.com/x402-foundation/x402/pull/1560) (merged April 2026): Algorand support ships in the official `@x402/*` npm packages since `@x402/avm` 2.10.0.
- Algorand network identifiers follow CAIP-2 since [x402 PR #2931](https://github.com/x402-foundation/x402/pull/2931) (`@x402/avm` >= 2.20.0) — see [V2 CAIP-2 Network Identifiers](#v2-caip-2-network-identifiers).

By collaboration between Algorand Foundation and GoPlausible, The x402 protocol has been extended to support Algorand Virtual Machine (AVM), enabling payment verification and settlement on Algorand networks **(both mainnet and testnet)**. This implementation follows the Algorand `exact` payment scheme and also the implementation patterns established for EVM and SVM networks for 100% alignment, providing a consistent developer experience across all supported blockchains.

Key features of the Algorand implementation:

- **Native Protocol Features**: Uses Algorand's native transaction capabilities for flexible, secure and efficient payments.
- **Fee Abstraction**: Supports fee delegation through atomic transaction groups
- **Asset Support**: Payments are Algorand Standard Asset (ASA) transfers, e.g. USDC; ALGO pays only the network fees
- **Fast Finality**: Benefits from Algorand's instant finality (~3 second blocks, no forks)
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

In the `exact` scheme the payment is always an Algorand Standard Asset (ASA) transfer (`axfer`), e.g. USDC: the specification requires `paymentRequirements.asset` to be an ASA ID, and both the TypeScript and Python facilitators reject any other payment transaction type. Native ALGO is used only for network fees. Handling includes:

1. Asset ID validation (`asset` must be an ASA ID)
2. ASA opt-in: the receiver must be opted in to the asset, otherwise the group fails simulation
3. Decimal place conversions on asset units and amounts

## Facilitator

Algorand has a dedicated facilitator that handles payment verification and settlement for the x402 protocol on Algorand **MAINNET** and **TESTNET**:
- **Facilitator Address**: [x402-avm-facilitator](https://facilitator.goplausible.xyz/)
- **Supported Networks**: Algorand Mainnet and Testnet, Solana Mainnet and Devnet, Base ETH and Sepolia. Check live here [Algorand x402 supported networks](https://facilitator.goplausible.xyz/supported)
- **Facilitator API docs**: [Algorand x402 Facilitator OpenAPI docs](https://facilitator.goplausible.xyz/docs)
- **Getting started guide**: [facilitator.goplausible.xyz/guide](https://facilitator.goplausible.xyz/guide) · **Bazaar discovery**: [`/discovery/resources`](https://facilitator.goplausible.xyz/discovery/resources) · **Dashboard**: [`/dashboard`](https://facilitator.goplausible.xyz/dashboard)
- **Fee payer**: the facilitator's fee payer address is returned in `/supported` as `extra.feePayer`; servers copy it into their payment requirements so buyers pay no network fees.
- **Network identifiers**: `/supported` lists the canonical CAIP-2 Algorand ids first. During the migration to CAIP-2 it also lists, and still accepts, the legacy full-hash ids; those will be switched off with advance notice.
- **Settlement timing**: settle waits for on-chain confirmation before reporting success (typically 3–6 seconds end to end). Give HTTP clients a timeout well above that — e.g. 30 s; Python's `httpx` defaults to 5 s.

## x402 V2 Packages for Algorand (AVM) implementation:

### Typescript Packages:

#### Core and Mechanism Packages:

- x402 V2 Core Package [@x402/core](https://www.npmjs.com/package/@x402/core)
- x402 V2 AVM (Algorand) Mechanism [@x402/avm](https://www.npmjs.com/package/@x402/avm) — use >= 2.20.0 for CAIP-2 Algorand network ids

#### Extensions and Paywall Packages:

- x402 V2 Extensions [@x402/extensions](https://www.npmjs.com/package/@x402/extensions)
- x402 V2 Paywall UI [@x402/paywall](https://www.npmjs.com/package/@x402/paywall)

#### Back end Framework-Specific Middleware and Client Packages:

- x402 V2 Express Middleware [@x402/express](https://www.npmjs.com/package/@x402/express)
- x402 V2 Hono Middleware [@x402/hono](https://www.npmjs.com/package/@x402/hono)
- x402 V2 Next.js Middleware [@x402/next](https://www.npmjs.com/package/@x402/next)

#### HTTP Client Packages:

- x402 V2 Fetch Client [@x402/fetch](https://www.npmjs.com/package/@x402/fetch)
- x402 V2 Axios Client [@x402/axios](https://www.npmjs.com/package/@x402/axios)

### Python Packages:

- x402 V2 Python SDK [x402-avm](https://pypi.org/project/x402-avm/) — the upstream Python `x402` package has no Algorand support; `x402-avm` is the same SDK with the AVM mechanism added. Its network constants are canonical CAIP-2 ids from 2.0.3; 2.0.2 and earlier use the legacy full-hash form.

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
  │ PAYMENT- │                  │                │
  │ SIGNATURE│                  │                │
  │─────────>│ 5. verify()      │                │
  │          │─────────────────>│ 6. simulate    │
  │          │                  │───────────────>│
  │          │                  │<───────────────│
  │          │<─────────────────│                │
  │          │ 7. settle()      │                │
  │          │─────────────────>│ 8. sign, send, │
  │          │                  │    confirm     │
  │          │                  │───────────────>│
  │          │                  │<───────────────│
  │          │<─────────────────│ 9. txId        │
  │ 10. 200  │                  │                │
  │<─────────│                  │                │
```

### Detailed Steps

1. **Client** requests a protected resource and receives a `402 Payment Required` response. The `PAYMENT-REQUIRED` header carries a base64-encoded `PaymentRequired` object (`x402Version`, `resource`, `accepts`, optional `extensions`); each entry of `accepts` is a `PaymentRequirements` (scheme, network, amount, asset, payTo, maxTimeoutSeconds, extra)

2. **Client** creates an atomic transaction group based on `paymentRequirements` (field values below are the TypeScript `@x402/avm` client's; the Python `x402-avm` client differs as noted):

   **Without fee abstraction** (no `feePayer` in `extra`):
   - Single ASA transfer transaction (`axfer`) with:
     - Sender: client's Algorand address
     - Receiver: `paymentRequirements.payTo`
     - Amount: `paymentRequirements.amount` (atomic units)
     - Asset Index: `paymentRequirements.asset` (ASA ID)
     - Fee: from the network's suggested parameters (normally the 1,000 µAlgo minimum)
     - Note: `x402-payment-v2-<timestamp>`

   **With fee abstraction** (`feePayer` in `extra`):
   - **Transaction [0] — Fee Payer** (unsigned, for the facilitator to sign):
     - Type: `pay` (payment)
     - Sender: `feePayer` address
     - Receiver: `feePayer` (self-payment)
     - Amount: `0`
     - Fee: covers the whole group via fee pooling, computed from the encoded transaction sizes (`max(fee_per_byte × size, min_fee)` per transaction)
     - Note: `x402-fee-payer-<timestamp>`
     - Python `x402-avm`: a flat pooled fee of `min_fee × 2`
   - **Transaction [1] — ASA Transfer** (signed by client):
     - Type: `axfer` (asset transfer)
     - Sender: client's address
     - Receiver: `paymentRequirements.payTo`
     - Amount: `paymentRequirements.amount`
     - Asset Index: `paymentRequirements.asset`
     - Fee: `0` (the fee payer covers it)
     - Note: `x402-payment-v2-<timestamp>` (Python `x402-avm`: `x402-payment-<nanoseconds>`)
   - An atomic group ID is assigned to both transactions

3. **Client** signs only its own transactions (ASA transfer), leaves fee payer transaction unsigned. Encodes all transactions as base64 msgpack strings in `paymentGroup` array.

4. **Client** retries the request with a `PAYMENT-SIGNATURE` header carrying the base64-encoded `PaymentPayload`; `accepted` is the requirement the client chose:

   ```json
   {
     "x402Version": 2,
     "resource": { "url": "https://api.example.com/weather", "description": "Weather data", "mimeType": "application/json" },
     "accepted": {
       "scheme": "exact",
       "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe",
       "amount": "10000",
       "asset": "10458941",
       "payTo": "PAYEE_ADDRESS",
       "maxTimeoutSeconds": 60,
       "extra": { "feePayer": "FEE_PAYER_ADDRESS" }
     },
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

6. **Facilitator** runs `verify()` (the [scheme specification](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_algo.md#verification) lists the required checks):
   - Validates `x402Version` (`2`), `scheme` (`exact`) and that `network` matches between `accepted` and the requirements
   - Validates group size ≤ 16 transactions and the `paymentIndex` bounds
   - Decodes all transactions (signed and unsigned); only facilitator-managed addresses may leave transactions unsigned
   - Verifies group ID consistency across all transactions
   - Verifies the payment transaction at `paymentIndex`:
     - Type must be `axfer` (asset transfer)
     - Asset ID matches `requirements.asset`
     - Receiver matches `requirements.payTo`
     - Amount matches `requirements.amount`
     - Transaction is signed, and the signature is valid
   - Verifies every transaction sent by a facilitator address (the fee payer):
     - Type is `pay`, amount is `0`, no `closeRemainderTo`, no `rekeyTo`
     - Fee ≤ `maxReasonableGroupFee(groupSize)` (TypeScript: 5,000 µAlgo per transaction in the group; Python `x402-avm`: `MAX_REASONABLE_FEE` = 16,000 µAlgo)
   - Signs the fee payer transaction and **simulates** the full group on an Algorand node
   - Returns `VerifyResponse { isValid, invalidReason?, payer? }`

   Facilitators may enforce more than the specification requires. The GoPlausible facilitator also rejects key-registration transactions and any `rekeyTo` / close-to fields on every transaction in the group, and checks that every transaction's genesis hash belongs to the requested network.

7. **Facilitator** runs `settle()`:
   - Re-verifies the payment
   - Signs all facilitator-managed transactions (fee payer)
   - Submits the complete signed group to the Algorand network
   - Waits for the group to be confirmed in a block (final on inclusion — Algorand has no forks)
   - Returns `SettleResponse { success, transaction (txId), network, payer }`

8. **Resource Server** returns the protected resource with a `PAYMENT-RESPONSE` header carrying the base64-encoded settlement response

### Algorand-Specific Advantages

- **Instant Finality**: Algorand transactions are final in ~3.3 seconds — no reorgs, no rollbacks
- **Atomic Groups**: Up to 16 transactions execute all-or-nothing (no partial failures)
- **Fee Pooling**: One transaction in a group can pay fees for all others
- **Composability**: Additional transactions (smart contract calls, opt-ins) can be added to the `paymentGroup` alongside the payment

## Schema and Types

### V2 CAIP-2 Network Identifiers

x402 V2 uses [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md) identifiers. For Algorand, the [CAIP-2 Algorand namespace profile](https://namespaces.chainagnostic.org/algorand/caip2) defines the reference as the URL-safe base64 encoding of the network's genesis hash, truncated to the first 32 characters:

| Network          | CAIP-2 Identifier                           | SDK constant            |
| ---------------- | ------------------------------------------- | ----------------------- |
| Algorand Mainnet | `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k` | `ALGORAND_MAINNET_CAIP2` |
| Algorand Testnet | `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe` | `ALGORAND_TESTNET_CAIP2` |

Use the SDK constants rather than hardcoding the strings (`@x402/avm` >= 2.20.0, `x402-avm` >= 2.0.3). Full genesis hashes appear only in the transactions' `gh` field (`ALGORAND_MAINNET_GENESIS_HASH`, `ALGORAND_TESTNET_GENESIS_HASH`).

> **Migration note:** earlier releases used the full base64 genesis hash as the reference (`algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`, `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`), which is not valid CAIP-2. The GoPlausible facilitator still accepts that legacy form during the transition; upcoming upstream SDK releases reject it ([x402 PR #3894](https://github.com/x402-foundation/x402/pull/3894)). Upgrade to the versions above and use the constants.

V1 network names (`algorand-mainnet`, `algorand-testnet`) belong to the legacy V1 protocol. Upstream `@x402/avm` is V2-only; the Python `x402-avm` package and the GoPlausible facilitator still accept the V1 names.

### PaymentRequirements

```typescript
// TypeScript
type PaymentRequirements = {
  scheme: string; // "exact"
  network: Network; // CAIP-2 identifier, e.g. ALGORAND_TESTNET_CAIP2
  asset: string; // ASA ID as string (e.g., "10458941" for USDC testnet)
  amount: string; // Amount in atomic units (smallest unit)
  payTo: string; // Recipient address (58-char Algorand address)
  maxTimeoutSeconds: number; // Payment validity window
  extra: Record<string, unknown>; // AVM-specific: feePayer (optional)
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

| Key        | Type     | Description                            | Source                                                       |
| ---------- | -------- | -------------------------------------- | ------------------------------------------------------------ |
| `feePayer` | `string` | Fee payer address for gasless payments | Defined by the scheme spec; from the facilitator's `/supported` (`getExtra()`) |
| `decimals` | `number` | Asset decimals (e.g., 6 for USDC)      | Not part of the spec; added by the Python `x402-avm` server for display |

#### Example

```typescript
const paymentRequirements = {
  scheme: "exact",
  network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe", // ALGORAND_TESTNET_CAIP2
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

### PAYMENT-SIGNATURE Header Payload

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

#### Full PAYMENT-SIGNATURE Header Example

The header value is this JSON, base64-encoded:

```json
{
  "x402Version": 2,
  "accepted": {
    "scheme": "exact",
    "network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe",
    "amount": "10000",
    "asset": "10458941",
    "payTo": "PAYEE_ADDRESS",
    "maxTimeoutSeconds": 60,
    "extra": { "feePayer": "FEE_PAYER_ADDRESS" }
  },
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
| Max Reasonable Fee    | `5,000` µAlgo × group size (TypeScript) · `16,000` µAlgo (Python) | Safety cap for the fee payer transaction (`maxReasonableGroupFee(groupSize)` / `MAX_REASONABLE_FEE`) |

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
```

Algod endpoints are set in code: `toFacilitatorAvmSigner(privateKey, { testnetUrl, mainnetUrl, algodToken })` (defaults: AlgoNode public endpoints).

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
# Facilitator URL
FACILITATOR_URL=http://localhost:3000/facilitator
# Or use the online facilitator:
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

Both SDKs use AlgoNode public endpoints by default.

**Python (`x402-avm`)** reads these environment variables:

```bash
# Custom Algod endpoints (optional — fallback to AlgoNode)
ALGOD_MAINNET_URL=https://mainnet-api.algonode.cloud    # default
ALGOD_TESTNET_URL=https://testnet-api.algonode.cloud    # default

# Custom Indexer endpoints (optional)
INDEXER_MAINNET_URL=https://mainnet-idx.algonode.cloud   # default
INDEXER_TESTNET_URL=https://testnet-idx.algonode.cloud   # default
```

**TypeScript (`@x402/avm`)** reads no environment variables — pass endpoints in code: `new ExactAvmScheme(signer, { algodUrl, algodToken })` or `{ algorandClient }` on the client, and `toFacilitatorAvmSigner(privateKey, { testnetUrl, mainnetUrl, algodToken })` on the facilitator.

### Package Installation

#### TypeScript

> **Breaking Change:** `algosdk` has been removed as a direct dependency. The AVM packages now use `@algorandfoundation/algokit-utils` (v10 alpha) internally. If you were previously installing `algosdk` alongside `@x402/avm`, remove it from your install command and uninstall it from your project.

```bash
# Core packages (@x402/avm >= 2.20.0 for CAIP-2 network ids)
npm install @x402/core @x402/avm

# Server middleware (choose one)
npm install @x402/express    # Express.js
npm install @x402/hono hono@^4.13.13   # Hono (hono >= 4.13.11: earlier 4.x releases have security advisories)
npm install @x402/next       # Next.js

# Client packages (choose one)
npm install @x402/fetch      # Fetch API
npm install @x402/axios      # Axios

# Paywall UI (optional)
npm install @x402/paywall

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

> Legacy and no longer maintained — use the V2 `@x402/*` packages above.

- [x402 Core Package](https://www.npmjs.com/package/x402-avm)
- [x402-express Package](https://www.npmjs.com/package/x402-avm-express)
- [x402-hono Package](https://www.npmjs.com/package/x402-avm-hono)
- [x402-next Package](https://www.npmjs.com/package/x402-avm-next)
- [x402-fetch Package](https://www.npmjs.com/package/x402-avm-fetch)
- [x402-axios Package](https://www.npmjs.com/package/x402-avm-axios)

This guide provides comprehensive documentation and examples for using the x402 protocol with Algorand (AVM) across various packages.

## x402 Legacy V1 Package-Specific Examples

- [x402 V1 Core Package Examples](../archive/algorand-x402-documentation/v1/x402-v1-core-examples.md)
- [x402 V1 Express Examples](../archive/algorand-x402-documentation/v1/x402-v1-express-examples.md)
- [x402 V1 Hono Examples](../archive/algorand-x402-documentation/v1/x402-v1-hono-examples.md)
- [x402 V1 Next Examples](../archive/algorand-x402-documentation/v1/x402-v1-next-examples.md)
- [x402 V1 Fetch Examples](../archive/algorand-x402-documentation/v1/x402-v1-fetch-examples.md)
- [x402 V1 Axios Examples](../archive/algorand-x402-documentation/v1/x402-v1-axios-examples.md)
