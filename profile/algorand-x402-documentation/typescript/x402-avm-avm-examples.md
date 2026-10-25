# x402-avm V2 AVM Mechanism Examples (TypeScript)

Comprehensive examples for the `@x402/avm` TypeScript package covering signer interfaces, constants, utilities, transaction handling, and fee abstraction.

> **Python examples**: See [x402-avm-avm-examples-python](../python/x402-avm-avm-examples-python.md) for Python (`x402-avm[avm]`) examples.

## Table of Contents

- [Installation](#installation)
- [Signer Interfaces](#signer-interfaces)
  - [ClientAvmSigner](#clientavmsigner)
  - [FacilitatorAvmSigner](#facilitatoravmsigner)
- [Client Signer Implementations](#client-signer-implementations)
  - [With @txnlab/use-wallet (Browser)](#with-txnlabuse-wallet-browser)
  - [Full React Example](#full-react-example)
  - [With a Private Key (Server-Side)](#with-a-private-key-server-side)
- [Facilitator Signer Implementation](#facilitator-signer-implementation)
- [Constants](#constants)
  - [Network Identifiers](#network-identifiers)
  - [USDC Configuration](#usdc-configuration)
  - [Algod Endpoints](#algod-endpoints)
  - [Transaction Limits](#transaction-limits)
  - [Address Validation](#address-validation)
- [Utility Functions](#utility-functions)
  - [Address Validation](#address-validation-utilities)
  - [Amount Conversion](#amount-conversion)
  - [Transaction Encoding/Decoding](#transaction-encodingdecoding)
  - [Network Utilities](#network-utilities)
  - [Transaction Inspection](#transaction-inspection)
- [Transaction Group Creation and Signing](#transaction-group-creation-and-signing)
  - [Simple Payment Group](#simple-payment-group)
  - [Fee-Abstracted Payment Group](#fee-abstracted-payment-group)
- [Fee Abstraction Setup](#fee-abstraction-setup)
  - [How Fee Abstraction Works](#how-fee-abstraction-works)
  - [Client-Side Fee Abstraction](#client-side-fee-abstraction)
- [ExactAvmScheme Registration](#exactavmscheme-registration)
  - [Client Registration](#client-registration)
  - [Server Registration](#server-registration)
  - [Facilitator Registration](#facilitator-registration)
- [Complete Examples](#complete-examples)
  - [Browser Client with Wallet](#browser-client-with-wallet)
  - [Node.js Facilitator Service](#nodejs-facilitator-service)

---

## Installation

```bash
npm install @x402/avm
```

> **No `algosdk`:** `@x402/avm` (on npm since 2.10.0) is built on `@algorandfoundation/algokit-utils` v10 (2.28.0 pins `10.0.0-alpha.46`) and has no `algosdk` dependency. If you are migrating from GoPlausible's earlier `@x402-avm/*` packages or from algosdk-based signer code, remove `algosdk` from your x402 dependencies and update your signer code as shown below. (Browser wallet libraries such as `@txnlab/use-wallet` v4 declare their own `algosdk` peer dependency; that is separate from x402.)

For browser wallet integration:

```bash
npm install @x402/avm @x402/core @x402/fetch @txnlab/use-wallet-react
```

`@txnlab/use-wallet-react` v4 also needs its peer dependencies (for example `algosdk` v3 and the connector packages of the wallets you enable).

---

## Signer Interfaces

### ClientAvmSigner

The client signer interface is compatible with `@txnlab/use-wallet` and similar wallet libraries.

```typescript
// Interface definition (exported as: import type { ClientAvmSigner } from "@x402/avm"):
interface ClientAvmSigner {
  // The Algorand address of the signer
  address: string;

  // Sign one or more transactions
  // txns: Array of unsigned transactions (encoded as Uint8Array msgpack)
  // indexesToSign: Optional array of indexes to sign (if not provided, sign all)
  // Returns: Array of signed transactions (null for unsigned ones)
  signTransactions(
    txns: Uint8Array[],
    indexesToSign?: number[],
  ): Promise<(Uint8Array | null)[]>;
}

// Type guard
import { isAvmSignerWallet } from "@x402/avm";

function checkWallet(wallet: unknown) {
  if (isAvmSignerWallet(wallet)) {
    // wallet is ClientAvmSigner
    console.log("Address:", wallet.address);
  }
}
```

### FacilitatorAvmSigner

The facilitator signer handles signing, simulation, submission and confirmation for the facilitator scheme.

```typescript
import type { Network } from "@x402/core/types";
import type {
  AlgodClient,
  SimulateResponse,
  PendingTransactionResponse,
} from "@algorandfoundation/algokit-utils/algod-client";

// Interface definition (exported as: import type { FacilitatorAvmSigner } from "@x402/avm"):
interface FacilitatorAvmSigner {
  // Get all fee payer addresses this facilitator manages
  getAddresses(): readonly string[];

  // Sign a transaction with the signer matching the sender address
  signTransaction(txn: Uint8Array, senderAddress: string): Promise<Uint8Array>;

  // Get Algod client for a specific network
  getAlgodClient(network: Network): AlgodClient;

  // Simulate a transaction group before submission
  simulateTransactions(txns: Uint8Array[], network: Network): Promise<SimulateResponse>;

  // Submit signed transactions to the network, returns the transaction ID
  sendTransactions(signedTxns: Uint8Array[], network: Network): Promise<string>;

  // Wait for transaction confirmation
  // (toFacilitatorAvmSigner defaults to 5 rounds; the facilitator scheme passes 10 when settling)
  waitForConfirmation(
    txId: string,
    network: Network,
    waitRounds?: number,
  ): Promise<PendingTransactionResponse>;
}
```

---

## Client Signer Implementations

### With @txnlab/use-wallet (Browser)

The `signTransactions` function from `@txnlab/use-wallet-react` (v4) accepts the same arguments as `ClientAvmSigner.signTransactions` and returns the same result.

```typescript
import type { ClientAvmSigner } from "@x402/avm";
import { useWallet } from "@txnlab/use-wallet-react";

// In a React component:
function PaymentComponent() {
  const { activeAccount, signTransactions } = useWallet();

  // Wrap the wallet as a ClientAvmSigner
  const signer: ClientAvmSigner | null = activeAccount
    ? {
        address: activeAccount.address,
        signTransactions: async (txns, indexesToSign) => {
          // @txnlab/use-wallet's signTransactions takes (txnGroup, indexesToSign)
          return signTransactions(txns, indexesToSign);
        },
      }
    : null;

  return signer ? <PaidContent signer={signer} /> : <ConnectWallet />;
}
```

> `@x402/avm` uses Node's `Buffer` for base64 encoding, so browser bundles need a `Buffer` polyfill (the upstream `@x402/paywall` AVM bundle injects one).

### Full React Example

```typescript
import React, { useCallback } from "react";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import type { ClientAvmSigner } from "@x402/avm";
import {
  useWallet,
  WalletProvider,
  WalletManager,
  WalletId,
  NetworkId,
} from "@txnlab/use-wallet-react";

const walletManager = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY, WalletId.KIBISIS],
  defaultNetwork: NetworkId.TESTNET,
});

function PaidContent() {
  const { activeAccount, signTransactions } = useWallet();

  const fetchPaidResource = useCallback(async () => {
    if (!activeAccount) return;

    const signer: ClientAvmSigner = {
      address: activeAccount.address,
      signTransactions: async (txns, indexes) => signTransactions(txns, indexes),
    };

    const client = new x402Client().register("algorand:*", new ExactAvmScheme(signer));
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);

    const response = await fetchWithPayment("https://api.example.com/premium");
    if (response.ok) {
      const data = await response.json();
      console.log("Data:", data);
    }
  }, [activeAccount, signTransactions]);

  return (
    <button onClick={fetchPaidResource} disabled={!activeAccount}>
      Fetch Paid Resource
    </button>
  );
}

export default function App() {
  return (
    <WalletProvider manager={walletManager}>
      <PaidContent />
    </WalletProvider>
  );
}
```

### With a Private Key (Server-Side)

```typescript
import { toClientAvmSigner } from "@x402/avm";

/**
 * Create a ClientAvmSigner from a base64-encoded private key.
 * Uses @algorandfoundation/algokit-utils internally — no algosdk required.
 *
 * The private key is 64 bytes: [32-byte seed][32-byte public key].
 * The address is derived from the seed via Ed25519.
 */
const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);
console.log("Signer address:", signer.address);
```

---

## Facilitator Signer Implementation

Complete, production-ready implementation.

```typescript
import { toFacilitatorAvmSigner } from "@x402/avm";

// Default (AlgorandClient.testNet() / .mainNet() from algokit-utils, AlgoNode endpoints):
const signer = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!);

// With custom Algod URLs (FacilitatorAvmSignerConfig):
const customSigner = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!, {
  testnetUrl: "https://testnet-api.algonode.cloud",
  mainnetUrl: "https://mainnet-api.algonode.cloud",
  algodToken: "", // optional
});

console.log("Fee payer addresses:", signer.getAddresses());
```

---

## Constants

### Network Identifiers

```typescript
import {
  // V2 CAIP-2 identifiers (URL-safe base64 genesis hash, first 32 chars)
  ALGORAND_MAINNET_CAIP2,     // "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k"
  ALGORAND_TESTNET_CAIP2,     // "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
  CAIP2_NETWORKS,             // [ALGORAND_MAINNET_CAIP2, ALGORAND_TESTNET_CAIP2]

  // Full genesis hashes (used in the transaction `gh` field, not as network ids)
  ALGORAND_MAINNET_GENESIS_HASH,  // "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
  ALGORAND_TESTNET_GENESIS_HASH,  // "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

  // Canonical or legacy full-hash id -> canonical id (throws for anything else)
  normalizeAlgorandNetwork,
} from "@x402/avm";
```

`@x402/avm` >= 2.20.0 exports the canonical ids. Until upstream PR #3894 ships it also accepts the legacy full-hash form (`algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`, `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`) on input; after that, upstream SDKs reject it. The package has no V1 constants or V1/CAIP-2 mappings; the AVM scheme is V2 only.

### USDC Configuration

```typescript
import {
  USDC_MAINNET_ASA_ID,  // "31566704"
  USDC_TESTNET_ASA_ID,  // "10458941"
  USDC_DECIMALS,        // 6
  DEFAULT_ASSETS,       // { [CAIP-2 network]: [{ asset, decimals, symbol }] }
  getDefaultAsset,
  findDefaultAsset,
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_TESTNET_CAIP2,
} from "@x402/avm";

// Look up the default (USDC) asset by network; Money prices such as "$0.10" use it
const testnetUsdc = getDefaultAsset(ALGORAND_TESTNET_CAIP2);
console.log(testnetUsdc);
// { asset: "10458941", decimals: 6, symbol: "USDC" }

// Reverse lookup by ASA id (undefined when the asset is not a default)
const mainnetUsdc = findDefaultAsset(USDC_MAINNET_ASA_ID, ALGORAND_MAINNET_CAIP2);
// { asset: "31566704", decimals: 6, symbol: "USDC" }
```

### Algod Endpoints

`@x402/avm` 2.28.0 exports no Algod endpoint constants and reads no environment variables for endpoints. Network access goes through `AlgorandClient` from `@algorandfoundation/algokit-utils`; by default `AlgorandClient.testNet()` / `AlgorandClient.mainNet()` (AlgoNode public endpoints).

```typescript
import { AlgorandClient } from "@algorandfoundation/algokit-utils/algorand-client";
import { toClientAvmSigner, toFacilitatorAvmSigner } from "@x402/avm";
import { ExactAvmScheme } from "@x402/avm/exact/client";

// Facilitator: per-network overrides (FacilitatorAvmSignerConfig)
const facilitatorSigner = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!, {
  testnetUrl: "https://my-testnet-node.example.com",
  mainnetUrl: "https://my-node.example.com",
  algodToken: process.env.ALGOD_TOKEN,
});

// Client: ClientAvmConfig applies to every network this scheme instance handles
const clientSigner = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);
const testnetScheme = new ExactAvmScheme(clientSigner, {
  algorandClient: AlgorandClient.testNet(),
  // or: algodUrl: "https://my-testnet-node.example.com", algodToken: "..."
});
```

### Transaction Limits

```typescript
import {
  MAX_REASONABLE_FEE_PER_TXN,  // 5000 (µAlgo per transaction in the group)
  maxReasonableGroupFee,       // (groupSize) => 5000 × groupSize, cap on the fee payer txn fee
  ALGORAND_MIN_TX_FEE,         // AlgoAmount of 1000 µAlgo (re-exported from algokit-utils)
} from "@x402/avm";

maxReasonableGroupFee(2);        // => 10000 (µAlgo, [fee payer, payment] group)
ALGORAND_MIN_TX_FEE.microAlgo;   // => 1000n

// The 16-transaction group limit comes from algokit-utils:
// import { MAX_TRANSACTION_GROUP_SIZE } from "@algorandfoundation/algokit-utils/common"; // 16
```

### Address Validation

```typescript
import {
  ALGORAND_ADDRESS_LENGTH,  // 58 (re-exported from algokit-utils)
  isValidAlgorandAddress,
} from "@x402/avm";

const isValid = isValidAlgorandAddress(someAddress);  // base32 format + checksum
```

---

## Utility Functions

### Address Validation Utilities

```typescript
import { isValidAlgorandAddress } from "@x402/avm";

// Full validation (format + checksum)
isValidAlgorandAddress("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ");
// => true (zero address)

isValidAlgorandAddress("A".repeat(58));
// => false (bad checksum)

isValidAlgorandAddress("invalid");
// => false

isValidAlgorandAddress(""); // => false
```

### Amount Conversion

```typescript
import { convertToTokenAmount, convertFromTokenAmount } from "@x402/avm";

// Decimal to atomic units
convertToTokenAmount("1.50", 6);    // => "1500000"
convertToTokenAmount("0.10", 6);    // => "100000"
convertToTokenAmount("100", 6);     // => "100000000"
convertToTokenAmount("0.000001", 6); // => "1"
convertToTokenAmount("0.0000001", 6); // => "0" (extra digits are truncated, not rounded)

// Atomic units to decimal
convertFromTokenAmount("1500000", 6);   // => "1.5"
convertFromTokenAmount("100000", 6);    // => "0.1"
convertFromTokenAmount("1", 6);         // => "0.000001"
convertFromTokenAmount("100000000", 6); // => "100"
```

### Transaction Encoding/Decoding

```typescript
import {
  encodeTransaction,
  decodeTransaction,
  decodeSignedTransaction,
  decodeUnsignedTransaction,
} from "@x402/avm";

// Encode Uint8Array to base64
const base64Str = encodeTransaction(txnBytes);
// => "iaNhbXTOAAGGoKNm..."

// Decode base64 to Uint8Array
const bytes = decodeTransaction(base64Str);
// => Uint8Array [...]

// Decode a signed transaction from base64
const signedTxn = decodeSignedTransaction(base64Str);
// => SignedTransaction object (algokit-utils)

// Decode an unsigned transaction from base64
const unsignedTxn = decodeUnsignedTransaction(base64Str);
// => Transaction object (algokit-utils)
```

### Network Utilities

```typescript
import {
  getNetworkFromCaip2,
  isAlgorandNetwork,
  isTestnetNetwork,
  normalizeAlgorandNetwork,
  toFacilitatorAvmSigner,
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_TESTNET_GENESIS_HASH,
} from "@x402/avm";

// Determine network type from CAIP-2 (legacy full-hash ids are normalized first)
getNetworkFromCaip2(ALGORAND_TESTNET_CAIP2);
// => "testnet"

getNetworkFromCaip2(ALGORAND_MAINNET_CAIP2);
// => "mainnet"

getNetworkFromCaip2("eip155:8453");
// => null (not Algorand)

// Check if Algorand (CAIP-2 "algorand:" prefix)
isAlgorandNetwork(ALGORAND_TESTNET_CAIP2);
// => true

isAlgorandNetwork("algorand-testnet");
// => false (V1 names are not recognized)

isAlgorandNetwork("eip155:8453");
// => false

// Check testnet
isTestnetNetwork(ALGORAND_TESTNET_CAIP2);
// => true

// Normalize a legacy full-hash id to the canonical CAIP-2 id
normalizeAlgorandNetwork(`algorand:${ALGORAND_TESTNET_GENESIS_HASH}`);
// => "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"

normalizeAlgorandNetwork("algorand-testnet");
// throws "Unsupported Algorand network: algorand-testnet"

// Get an Algod client for a network (AlgodClient from algokit-utils)
const facilitatorSigner = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!);
const algod = facilitatorSigner.getAlgodClient(ALGORAND_TESTNET_CAIP2);
// Without a signer: AlgorandClient.testNet().client.algod
```

### Transaction Inspection

```typescript
import {
  getSenderFromTransaction,
  getTransactionId,
  hasSignature,
  getGenesisHashFromTransaction,
  decodeUnsignedTransaction,
  validateGroupId,
} from "@x402/avm";
import { groupTransactions } from "@algorandfoundation/algokit-utils/transact";

// Get sender from transaction bytes
const sender = getSenderFromTransaction(signedTxnBytes, true);  // signed (default)
const senderUnsigned = getSenderFromTransaction(unsignedTxnBytes, false);

// Get transaction ID (from signed transaction bytes)
const txId = getTransactionId(signedTxnBytes);

// Check if signed (sig, msig or lsig present)
const signed = hasSignature(signedTxnBytes);  // true/false

// Full genesis hash of a transaction (the `gh` field, not the CAIP-2 id)
const genesisHash = getGenesisHashFromTransaction(decodeUnsignedTransaction(unsignedTxnBase64));
// => "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" on TestNet

// Validate group ID consistency (unsigned transaction bytes)
const allMatch = validateGroupId([txn1Bytes, txn2Bytes, txn3Bytes]);

// Assign a group ID: @x402/avm has no helper for this; use algokit-utils
// (takes Transaction objects without a group, returns new grouped Transactions)
const groupedTxns = groupTransactions([txn1, txn2, txn3]);
```

---

## Transaction Group Creation and Signing

### Simple Payment Group

Without `extra.feePayer` in the payment requirements, `ExactAvmScheme` builds a single-transaction group: the client's asset transfer (`axfer`) to `payTo`, paying its own fee from the node's suggested params, with `paymentIndex` 0.

### Fee-Abstracted Payment Group

```typescript
// Transaction group creation is handled internally by ExactAvmScheme.
// Users do not need to build transactions manually.
// Simply create a signer and register the scheme:

import { toClientAvmSigner } from "@x402/avm";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";

const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);
const client = new x402Client().register("algorand:*", new ExactAvmScheme(signer));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// The client automatically builds and signs the correct transaction group
// (single payment or 2-transaction fee-abstracted group) based on server requirements.
const response = await fetchWithPayment("https://api.example.com/paid-resource");
```

---

## Fee Abstraction Setup

### How Fee Abstraction Works

In x402-avm, fee abstraction allows the **facilitator** to pay transaction fees on behalf of the client. This works through Algorand's **atomic transaction groups** and **pooled fees**.

**Flow:**

1. The resource server copies the facilitator's fee payer address (`/supported` → `kinds[].extra.feePayer`) into `PaymentRequirements.extra.feePayer`
2. Client creates a 2-transaction atomic group:
   - Transaction 0: fee payer `pay` transaction, sender = receiver = `feePayer`, amount 0, note `x402-fee-payer-<timestamp>`. Its fee covers the whole group: each transaction's fee is `max(fee_per_byte × encoded size, min_fee)`, summed over the group
   - Transaction 1: USDC `axfer` from the client to `payTo`, fee 0, note `x402-payment-v2-<timestamp>`
3. Client signs Transaction 1 (their USDC transfer)
4. Transaction 0 is left unsigned (for the facilitator to sign)
5. Client sends both in the `paymentGroup` array with `paymentIndex: 1`
6. Facilitator verifies, signs Transaction 0, simulates, submits the atomic group and waits for on-chain confirmation

**Security guarantees (facilitator checks):**
- Unsigned transactions are accepted only from the facilitator's own addresses; all transactions must share one group ID; groups larger than 16 are rejected
- The payer cannot be a facilitator address
- The payment transaction must be an `axfer` matching `amount`, `payTo` and `asset`, and must be signed (Ed25519 signatures are checked against the sender)
- Fee payer transaction is validated to be a `pay` self-payment (receiver = sender) with amount=0
- No `rekeyTo` or `closeRemainderTo` on the fee payer transaction
- Fee is capped at `maxReasonableGroupFee(groupSize)`: 5000 µAlgo per transaction in the group (10,000 µAlgo for a 2-transaction group)
- The signed group must pass algod simulation before settlement
- Atomic group ensures all-or-nothing execution

### Client-Side Fee Abstraction

```typescript
import { toClientAvmSigner } from "@x402/avm";
import { x402Client } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";

const signer = toClientAvmSigner(process.env.AVM_PRIVATE_KEY!);
const client = new x402Client().register("algorand:*", new ExactAvmScheme(signer));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Fee abstraction is handled automatically when the server's
// PaymentRequirements include extra.feePayer. The scheme:
// 1. Creates a 2-transaction group (fee payer txn at index 0, payment at index 1)
// 2. Signs only the payment transaction via signer
// 3. Sends both transactions in the payload
// The facilitator signs the fee payer transaction during settlement.
const response = await fetchWithPayment("https://api.example.com/paid-resource");
```

---

## ExactAvmScheme Registration

### Client Registration

```typescript
import { x402Client } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const client = new x402Client();

// All Algorand networks (wildcard)
client.register("algorand:*", new ExactAvmScheme(myClientSigner));

// Or: specific network only, with an optional custom Algod endpoint (ClientAvmConfig)
client.register(
  ALGORAND_TESTNET_CAIP2,
  new ExactAvmScheme(myClientSigner, { algodUrl: "https://testnet-api.algonode.cloud" }),
);

// Optional: payment policies
client.registerPolicy(preferTestnetPolicy);
```

### Server Registration

```typescript
import { x402ResourceServer } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { ALGORAND_TESTNET_CAIP2 } from "@x402/avm";

const server = new x402ResourceServer(facilitatorClient);

// Specific network
server.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme());

// Or with wildcard (all Algorand networks)
server.register("algorand:*", new ExactAvmScheme());
```

The server scheme copies `feePayer` from the facilitator's supported kinds into `PaymentRequirements.extra`, and resolves Money prices (`"$0.10"`) to USDC. Custom conversions can be added with `registerMoneyParser()`.

### Facilitator Registration

```typescript
import { x402Facilitator } from "@x402/core/facilitator";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2 } from "@x402/avm";

const facilitator = new x402Facilitator();

// Single network
facilitator.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(myFacilitatorSigner));

// Multiple networks
facilitator.register(
  [ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2],
  new ExactAvmScheme(myFacilitatorSigner),
);
```

---

## Complete Examples

### Browser Client with Wallet

A complete browser application using Pera Wallet to pay for API access (`@txnlab/use-wallet-react` v4).

```typescript
// app.tsx
import React, { useState, useCallback } from "react";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import type { ClientAvmSigner } from "@x402/avm";
import {
  WalletProvider,
  WalletManager,
  useWallet,
  WalletId,
  NetworkId,
} from "@txnlab/use-wallet-react";

const walletManager = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY],
  defaultNetwork: NetworkId.TESTNET,
});

function PayForWeather() {
  const { wallets, activeWallet, activeAccount, signTransactions } = useWallet();
  const [weather, setWeather] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);

    try {
      const signer: ClientAvmSigner = {
        address: activeAccount.address,
        signTransactions: async (txns, indexes) =>
          signTransactions(txns, indexes),
      };

      const client = new x402Client().register("algorand:*", new ExactAvmScheme(signer));
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);

      const response = await fetchWithPayment(
        "https://api.example.com/weather"
      );

      if (response.ok) {
        const data = await response.json();
        setWeather(JSON.stringify(data, null, 2));
      } else {
        setWeather(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setWeather(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [activeAccount, signTransactions]);

  const pera = wallets.find((wallet) => wallet.id === WalletId.PERA);

  return (
    <div>
      <h1>Weather API (Paid with USDC on Algorand)</h1>

      {!activeAccount ? (
        <button onClick={() => pera?.connect()}>
          Connect Pera Wallet
        </button>
      ) : (
        <div>
          <p>Connected: {activeAccount.address.slice(0, 8)}...</p>
          <button onClick={fetchWeather} disabled={loading}>
            {loading ? "Paying..." : "Get Weather (0.10 USDC)"}
          </button>
          <button onClick={() => activeWallet?.disconnect()}>Disconnect</button>
        </div>
      )}

      {weather && (
        <pre>{weather}</pre>
      )}
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider manager={walletManager}>
      <PayForWeather />
    </WalletProvider>
  );
}
```

### Node.js Facilitator Service

A complete Express.js facilitator service.

```typescript
// facilitator-service.ts
import express from "express";
import { x402Facilitator } from "@x402/core/facilitator";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { toFacilitatorAvmSigner, ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2 } from "@x402/avm";

const signer = toFacilitatorAvmSigner(process.env.AVM_PRIVATE_KEY!, {
  testnetUrl: "https://testnet-api.algonode.cloud",
  mainnetUrl: "https://mainnet-api.algonode.cloud",
});

console.log("Fee payer address:", signer.getAddresses()[0]);

// Setup facilitator
const facilitator = new x402Facilitator().register(
  [ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2],
  new ExactAvmScheme(signer),
);

// Express app
const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/supported", async (_req, res) => {
  try {
    // { kinds: [{ x402Version, scheme, network, extra: { feePayer } }], extensions, signers }
    res.json(facilitator.getSupported());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/verify", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };
    const result = await facilitator.verify(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/settle", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: PaymentPayload;
      paymentRequirements: PaymentRequirements;
    };
    // Re-verifies, signs the fee payer txn, submits and waits for confirmation
    const result = await facilitator.settle(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = parseInt(process.env.PORT || "4000", 10);
app.listen(PORT, () => {
  console.log(`Facilitator service running on port ${PORT}`);
  console.log(`Fee payer address: ${signer.getAddresses()[0]}`);
  console.log(`Networks: Testnet + Mainnet`);
});
```

---

## Summary

| Feature | Import / Usage |
|---------|---------------|
| Package | `@x402/avm` |
| Client Signer | `ClientAvmSigner` interface |
| Facilitator Signer | `FacilitatorAvmSigner` interface |
| Network Constants | `ALGORAND_TESTNET_CAIP2`, `ALGORAND_MAINNET_CAIP2` |
| Legacy id normalization | `normalizeAlgorandNetwork(network)` |
| USDC Config | `getDefaultAsset(network)` / `USDC_TESTNET_ASA_ID` |
| Address Validation | `isValidAlgorandAddress(addr)` |
| Amount Conversion | `convertToTokenAmount("1.5", 6)` |
| Algod Client | `facilitatorSigner.getAlgodClient(network)` |
| Encode Txn | `encodeTransaction(bytes)` |
| Decode Txn | `decodeTransaction(b64)` |
| Signer Factory | `toClientAvmSigner(key)` / `toFacilitatorAvmSigner(key)` |
| Scheme Registration | `new ExactAvmScheme(...)` from `@x402/avm/exact/client`, `/exact/server`, `/exact/facilitator` |
