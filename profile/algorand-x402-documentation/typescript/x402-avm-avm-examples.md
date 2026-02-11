# x402-avm V2 AVM Mechanism Examples (TypeScript)

Comprehensive examples for the `@x402-avm/avm` TypeScript package covering signer interfaces, constants, utilities, transaction handling, and fee abstraction.

> **Python examples**: See [x402-avm-avm-examples-python.md](./x402-avm-avm-examples-python.md) for Python (`x402-avm[avm]`) examples.

## Table of Contents

- [Installation](#installation)
- [Signer Interfaces](#signer-interfaces)
  - [ClientAvmSigner](#clientavmsigner)
  - [FacilitatorAvmSigner](#facilitatoravmsigner)
- [Client Signer Implementations](#client-signer-implementations)
  - [With @txnlab/use-wallet (Browser)](#with-txnlabuse-wallet-browser)
  - [Full React Example](#full-react-example)
  - [With algosdk Private Key (Server-Side)](#with-algosdk-private-key-server-side)
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
npm install @x402-avm/avm algosdk
```

For browser wallet integration:

```bash
npm install @x402-avm/avm algosdk @txnlab/use-wallet
```

---

## Signer Interfaces

### ClientAvmSigner

The client signer interface is compatible with `@txnlab/use-wallet` and similar wallet libraries.

```typescript
import type { ClientAvmSigner } from "@x402-avm/avm";

// Interface definition:
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
import { isAvmSignerWallet } from "@x402-avm/avm";

function checkWallet(wallet: unknown) {
  if (isAvmSignerWallet(wallet)) {
    // wallet is ClientAvmSigner
    console.log("Address:", wallet.address);
  }
}
```

### FacilitatorAvmSigner

The facilitator signer handles verification, signing, simulation, and settlement.

```typescript
import type { FacilitatorAvmSigner } from "@x402-avm/avm";
import type { Network } from "@x402-avm/core/types";

// Interface definition:
interface FacilitatorAvmSigner {
  // Get all fee payer addresses this facilitator manages
  getAddresses(): readonly string[];

  // Sign a transaction with the signer matching the sender address
  signTransaction(txn: Uint8Array, senderAddress: string): Promise<Uint8Array>;

  // Get Algod client for a specific network
  getAlgodClient(network: Network): unknown; // algosdk.Algodv2

  // Simulate a transaction group before submission
  simulateTransactions(txns: Uint8Array[], network: Network): Promise<unknown>;

  // Submit signed transactions to the network
  sendTransactions(signedTxns: Uint8Array[], network: Network): Promise<string>;

  // Wait for transaction confirmation
  waitForConfirmation(
    txId: string,
    network: Network,
    waitRounds?: number,
  ): Promise<unknown>;
}
```

---

## Client Signer Implementations

### With @txnlab/use-wallet (Browser)

The `@txnlab/use-wallet` library provides a `signTransactions` function that is directly compatible with the `ClientAvmSigner` interface.

```typescript
import type { ClientAvmSigner } from "@x402-avm/avm";
import { useWallet } from "@txnlab/use-wallet";

// In a React component:
function PaymentComponent() {
  const { activeAccount, signTransactions } = useWallet();

  // The wallet adapter is already a ClientAvmSigner!
  const signer: ClientAvmSigner | null = activeAccount
    ? {
        address: activeAccount.address,
        signTransactions: async (txns, indexesToSign) => {
          // @txnlab/use-wallet's signTransactions has the same signature
          return signTransactions(txns, indexesToSign);
        },
      }
    : null;

  return signer ? <PaidContent signer={signer} /> : <ConnectWallet />;
}
```

### Full React Example

```typescript
import React, { useCallback } from "react";
import { x402Client } from "@x402-avm/core/client";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";
import { useWallet, WalletProvider, WalletId } from "@txnlab/use-wallet-react";

const walletConfig = {
  wallets: [WalletId.PERA, WalletId.DEFLY, WalletId.KIBISIS],
};

function PaidContent() {
  const { activeAccount, signTransactions } = useWallet();

  const fetchPaidResource = useCallback(async () => {
    if (!activeAccount) return;

    const signer: ClientAvmSigner = {
      address: activeAccount.address,
      signTransactions: async (txns, indexes) => signTransactions(txns, indexes),
    };

    const client = new x402Client({ schemes: [] });
    registerExactAvmScheme(client, { signer });

    const response = await client.fetch("https://api.example.com/premium");
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
    <WalletProvider value={walletConfig}>
      <PaidContent />
    </WalletProvider>
  );
}
```

### With algosdk Private Key (Server-Side)

```typescript
import type { ClientAvmSigner } from "@x402-avm/avm";
import algosdk from "algosdk";

/**
 * Create a ClientAvmSigner from a base64-encoded private key.
 *
 * The private key is 64 bytes: [32-byte seed][32-byte public key].
 * The address is derived from the last 32 bytes (public key).
 */
function createPrivateKeySigner(privateKeyBase64: string): ClientAvmSigner {
  const secretKey = Buffer.from(privateKeyBase64, "base64");

  if (secretKey.length !== 64) {
    throw new Error(`Invalid key length: expected 64, got ${secretKey.length}`);
  }

  const address = algosdk.encodeAddress(secretKey.slice(32));

  return {
    address,
    signTransactions: async (
      txns: Uint8Array[],
      indexesToSign?: number[],
    ): Promise<(Uint8Array | null)[]> => {
      return txns.map((txnBytes, i) => {
        // Skip if not in indexes to sign
        if (indexesToSign && !indexesToSign.includes(i)) {
          return null;
        }

        // Decode, sign, return raw blob
        const decoded = algosdk.decodeUnsignedTransaction(txnBytes);
        const signed = algosdk.signTransaction(decoded, secretKey);
        return signed.blob;
      });
    },
  };
}

// Usage:
const signer = createPrivateKeySigner(process.env.AVM_PRIVATE_KEY!);
console.log("Signer address:", signer.address);
```

---

## Facilitator Signer Implementation

Complete, production-ready implementation.

```typescript
import type { FacilitatorAvmSigner, FacilitatorAvmSignerConfig } from "@x402-avm/avm";
import type { Network } from "@x402-avm/core/types";
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_MAINNET_CAIP2,
  createAlgodClient,
  isAlgorandNetwork,
  isTestnetNetwork,
} from "@x402-avm/avm";
import algosdk from "algosdk";

/**
 * Creates a FacilitatorAvmSigner from a base64-encoded private key.
 * Supports both mainnet and testnet with automatic network detection.
 */
function createFacilitatorSigner(
  privateKeyBase64: string,
  config?: FacilitatorAvmSignerConfig,
): FacilitatorAvmSigner {
  const secretKey = Buffer.from(privateKeyBase64, "base64");
  const address = algosdk.encodeAddress(secretKey.slice(32));

  // Create Algod clients for each network
  const clients: Record<string, algosdk.Algodv2> = {};

  function getClient(network: Network): algosdk.Algodv2 {
    if (!clients[network]) {
      clients[network] = createAlgodClient(
        network,
        isTestnetNetwork(network) ? config?.testnetUrl : config?.mainnetUrl,
        config?.algodToken,
      );
    }
    return clients[network];
  }

  return {
    getAddresses: () => [address],

    signTransaction: async (txn: Uint8Array, _senderAddress: string) => {
      const decoded = algosdk.decodeUnsignedTransaction(txn);
      const signed = algosdk.signTransaction(decoded, secretKey);
      return signed.blob;
    },

    getAlgodClient: (network: Network) => getClient(network),

    simulateTransactions: async (txns: Uint8Array[], network: Network) => {
      const client = getClient(network);

      const signedTxns = txns.map((txnBytes) => {
        try {
          // Already signed
          return algosdk.decodeSignedTransaction(txnBytes);
        } catch {
          // Unsigned -- wrap for simulation
          const txn = algosdk.decodeUnsignedTransaction(txnBytes);
          return new algosdk.SignedTransaction({ txn });
        }
      });

      const request = new algosdk.modelsv2.SimulateRequest({
        txnGroups: [
          new algosdk.modelsv2.SimulateRequestTransactionGroup({
            txns: signedTxns,
          }),
        ],
        allowEmptySignatures: true,
      });

      const result = await client.simulateTransactions(request).do();

      // Check for simulation failures
      for (const group of result.txnGroups || []) {
        if (group.failureMessage) {
          throw new Error(`Simulation failed: ${group.failureMessage}`);
        }
      }

      return result;
    },

    sendTransactions: async (signedTxns: Uint8Array[], network: Network) => {
      const client = getClient(network);

      // Concatenate all signed transaction bytes for atomic group submission
      const combined = Buffer.concat(signedTxns.map((t) => Buffer.from(t)));
      const { txId } = await client.sendRawTransaction(combined).do();
      return txId;
    },

    waitForConfirmation: async (
      txId: string,
      network: Network,
      waitRounds: number = 4,
    ) => {
      const client = getClient(network);
      return algosdk.waitForConfirmation(client, txId, waitRounds);
    },
  };
}

// Usage:
const facilitatorSigner = createFacilitatorSigner(
  process.env.AVM_PRIVATE_KEY!,
  {
    testnetUrl: "https://testnet-api.algonode.cloud",
    mainnetUrl: "https://mainnet-api.algonode.cloud",
  },
);

console.log("Fee payer addresses:", facilitatorSigner.getAddresses());
```

---

## Constants

### Network Identifiers

```typescript
import {
  // V2 CAIP-2 identifiers (primary)
  ALGORAND_MAINNET_CAIP2,     // "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
  ALGORAND_TESTNET_CAIP2,     // "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
  CAIP2_NETWORKS,              // [MAINNET_CAIP2, TESTNET_CAIP2]

  // Genesis hashes (used in transactions)
  ALGORAND_MAINNET_GENESIS_HASH,  // "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
  ALGORAND_TESTNET_GENESIS_HASH,  // "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

  // V1 identifiers (backward compat)
  V1_ALGORAND_MAINNET,  // "algorand-mainnet"
  V1_ALGORAND_TESTNET,  // "algorand-testnet"
  V1_NETWORKS,           // ["algorand-mainnet", "algorand-testnet"]

  // Bidirectional mapping
  V1_TO_CAIP2,  // { "algorand-mainnet": CAIP2, "algorand-testnet": CAIP2 }
  CAIP2_TO_V1,  // { CAIP2: "algorand-mainnet", CAIP2: "algorand-testnet" }
} from "@x402-avm/avm";
```

### USDC Configuration

```typescript
import {
  USDC_MAINNET_ASA_ID,  // "31566704"
  USDC_TESTNET_ASA_ID,  // "10458941"
  USDC_DECIMALS,         // 6
  USDC_CONFIG,           // Record<network, { asaId, name, decimals }>
} from "@x402-avm/avm";

// Look up USDC config by network
const testnetUsdc = USDC_CONFIG[ALGORAND_TESTNET_CAIP2];
console.log(testnetUsdc);
// { asaId: "10458941", name: "USDC", decimals: 6 }
```

### Algod Endpoints

```typescript
import {
  DEFAULT_ALGOD_MAINNET,   // env ALGOD_MAINNET_URL or "https://mainnet-api.algonode.cloud"
  DEFAULT_ALGOD_TESTNET,   // env ALGOD_TESTNET_URL or "https://testnet-api.algonode.cloud"
  NETWORK_TO_ALGOD,        // Record<network, url>
  FALLBACK_ALGOD_MAINNET,  // "https://mainnet-api.algonode.cloud"
  FALLBACK_ALGOD_TESTNET,  // "https://testnet-api.algonode.cloud"
} from "@x402-avm/avm";

// Override with environment variables:
// ALGOD_MAINNET_URL=https://my-node.example.com
// ALGOD_TESTNET_URL=https://my-testnet-node.example.com
```

### Transaction Limits

```typescript
import {
  MAX_ATOMIC_GROUP_SIZE,  // 16 (max transactions per group)
  MIN_TXN_FEE,            // 1000 (microAlgos)
  MAX_REASONABLE_FEE,     // 10_000_000 (10 ALGO sanity check)
} from "@x402-avm/avm";
```

### Address Validation

```typescript
import {
  ALGORAND_ADDRESS_REGEX,   // /^[A-Z2-7]{58}$/
  ALGORAND_ADDRESS_LENGTH,  // 58
} from "@x402-avm/avm";

const isValid = ALGORAND_ADDRESS_REGEX.test(someAddress);
```

---

## Utility Functions

### Address Validation Utilities

```typescript
import { isValidAlgorandAddress } from "@x402-avm/avm";

// Full validation (format + checksum via algosdk)
isValidAlgorandAddress("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
// => true (zero address)

isValidAlgorandAddress("invalid");
// => false

isValidAlgorandAddress(""); // => false
```

### Amount Conversion

```typescript
import { convertToTokenAmount, convertFromTokenAmount } from "@x402-avm/avm";

// Decimal to atomic units
convertToTokenAmount("1.50", 6);    // => "1500000"
convertToTokenAmount("0.10", 6);    // => "100000"
convertToTokenAmount("100", 6);     // => "100000000"
convertToTokenAmount("0.000001", 6); // => "1"

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
} from "@x402-avm/avm";

// Encode Uint8Array to base64
const base64Str = encodeTransaction(txnBytes);
// => "iaNhbXTOAAGGoKNm..."

// Decode base64 to Uint8Array
const bytes = decodeTransaction(base64Str);
// => Uint8Array [...]

// Decode a signed transaction from base64
const signedTxn = decodeSignedTransaction(base64Str);
// => algosdk.SignedTransaction

// Decode an unsigned transaction from base64
const unsignedTxn = decodeUnsignedTransaction(base64Str);
// => algosdk.Transaction
```

### Network Utilities

```typescript
import {
  getNetworkFromCaip2,
  isAlgorandNetwork,
  isTestnetNetwork,
  v1ToCaip2,
  caip2ToV1,
  createAlgodClient,
} from "@x402-avm/avm";

// Determine network type from CAIP-2
getNetworkFromCaip2("algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=");
// => "testnet"

getNetworkFromCaip2("algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=");
// => "mainnet"

getNetworkFromCaip2("eip155:8453");
// => null (not Algorand)

// Check if Algorand
isAlgorandNetwork("algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=");
// => true

isAlgorandNetwork("algorand-testnet");
// => true (V1 format also recognized)

isAlgorandNetwork("eip155:8453");
// => false

// Check testnet
isTestnetNetwork("algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=");
// => true

// Convert V1 <-> CAIP-2
v1ToCaip2("algorand-testnet");
// => "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

caip2ToV1("algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=");
// => "algorand-testnet"

// Create Algod client
const algod = createAlgodClient("algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=");
// Uses DEFAULT_ALGOD_TESTNET automatically

const customAlgod = createAlgodClient(
  "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
  "https://my-custom-node.example.com",
  "my-api-token",
);
```

### Transaction Inspection

```typescript
import {
  getSenderFromTransaction,
  getTransactionId,
  hasSignature,
  getGenesisHashFromTransaction,
  validateGroupId,
  assignGroupId,
} from "@x402-avm/avm";

// Get sender from transaction bytes
const sender = getSenderFromTransaction(signedTxnBytes, true);  // signed
const senderUnsigned = getSenderFromTransaction(unsignedTxnBytes, false);

// Get transaction ID
const txId = getTransactionId(signedTxnBytes);

// Check if signed
const signed = hasSignature(txnBytes);  // true/false

// Validate group ID consistency
const allMatch = validateGroupId([txn1Bytes, txn2Bytes, txn3Bytes]);

// Assign group ID to transactions (algosdk.Transaction objects)
const groupedTxns = assignGroupId([txn1, txn2, txn3]);
```

---

## Transaction Group Creation and Signing

### Simple Payment Group

A single USDC transfer without fee abstraction.

```typescript
import algosdk from "algosdk";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID, createAlgodClient } from "@x402-avm/avm";

async function createSimplePayment(
  senderAddress: string,
  receiverAddress: string,
  amount: number,  // in atomic units (e.g., 1000000 = 1 USDC)
) {
  const algod = createAlgodClient(ALGORAND_TESTNET_CAIP2);
  const params = await algod.getTransactionParams().do();

  // Create USDC transfer
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: receiverAddress,
    amount,
    assetIndex: parseInt(USDC_TESTNET_ASA_ID, 10),
    suggestedParams: params,
  });

  // Return as bytes for the signer
  return [txn.toByte()];
}
```

### Fee-Abstracted Payment Group

A USDC transfer with a fee payer transaction (2-transaction atomic group).

```typescript
import algosdk from "algosdk";
import {
  ALGORAND_TESTNET_CAIP2,
  USDC_TESTNET_ASA_ID,
  MIN_TXN_FEE,
  createAlgodClient,
  encodeTransaction,
} from "@x402-avm/avm";

async function createFeeAbstractedPayment(
  senderAddress: string,
  receiverAddress: string,
  feePayerAddress: string,
  amount: number,
) {
  const algod = createAlgodClient(ALGORAND_TESTNET_CAIP2);
  const params = await algod.getTransactionParams().do();

  // Transaction 0: USDC transfer (client pays, fee = 0)
  const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: senderAddress,
    to: receiverAddress,
    amount,
    assetIndex: parseInt(USDC_TESTNET_ASA_ID, 10),
    suggestedParams: {
      ...params,
      fee: 0,      // Client pays zero fee
      flatFee: true,
    },
  });

  // Transaction 1: Fee payer (self-payment with pooled fee)
  const feePayerTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: feePayerAddress,
    to: feePayerAddress,  // Self-payment
    amount: 0,             // No value transfer
    suggestedParams: {
      ...params,
      fee: MIN_TXN_FEE * 2,  // Cover fee for both txns (2000 microAlgos)
      flatFee: true,
    },
  });

  // Assign group ID for atomic execution
  const grouped = algosdk.assignGroupID([paymentTxn, feePayerTxn]);

  // Return as bytes
  const paymentBytes = grouped[0].toByte();
  const feePayerBytes = grouped[1].toByte();

  return {
    // For the payment payload
    paymentGroup: [
      encodeTransaction(paymentBytes),
      encodeTransaction(feePayerBytes),
    ],
    paymentIndex: 0,  // Index of the payment transaction
    rawBytes: [paymentBytes, feePayerBytes],
  };
}
```

---

## Fee Abstraction Setup

### How Fee Abstraction Works

In x402-avm, fee abstraction allows the **facilitator** to pay transaction fees on behalf of the client. This works through Algorand's **atomic transaction groups** and **pooled fees**.

**Flow:**

1. Client creates a 2-transaction atomic group:
   - Transaction 0: USDC transfer from client to resource owner (fee = 0)
   - Transaction 1: Self-payment by fee payer (fee covers both transactions)
2. Client signs Transaction 0 (their USDC transfer)
3. Transaction 1 is left unsigned (for the facilitator to sign)
4. Client sends both in the `paymentGroup` array
5. Facilitator verifies, signs Transaction 1, and submits the atomic group

**Security guarantees:**
- Fee payer transaction is validated to be a self-payment with amount=0
- No rekey, close-to, or other dangerous operations
- Fee is capped at a reasonable maximum
- Atomic group ensures all-or-nothing execution

### Client-Side Fee Abstraction

```typescript
import { x402Client } from "@x402-avm/core/client";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";
import { ALGORAND_TESTNET_CAIP2 } from "@x402-avm/avm";
import algosdk from "algosdk";

// The fee abstraction is handled automatically by the ExactAvmScheme
// when it detects a feePayer in the PaymentRequirements

const signer: ClientAvmSigner = {
  address: myAddress,
  signTransactions: async (txns, indexesToSign) => {
    return txns.map((txn, i) => {
      if (indexesToSign && !indexesToSign.includes(i)) return null;
      const decoded = algosdk.decodeUnsignedTransaction(txn);
      return algosdk.signTransaction(decoded, secretKey).blob;
    });
  },
};

const client = new x402Client({ schemes: [] });
registerExactAvmScheme(client, { signer });

// When the server's PaymentRequirements include a feePayer address,
// the scheme automatically:
// 1. Creates a 2-transaction group (payment + fee payer)
// 2. Asks the signer to sign only the payment transaction
// 3. Sends both transactions in the payload
//
// The facilitator then:
// 1. Verifies the payment transaction
// 2. Validates the fee payer transaction (self-payment, amount=0, no rekey)
// 3. Signs the fee payer transaction
// 4. Submits the atomic group
const response = await client.fetch("https://api.example.com/paid-resource");
```

---

## ExactAvmScheme Registration

### Client Registration

```typescript
import { x402Client } from "@x402-avm/core/client";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";

const client = new x402Client({ schemes: [] });

registerExactAvmScheme(client, {
  signer: myClientSigner,
  algodConfig: {
    algodUrl: "https://testnet-api.algonode.cloud",
  },
  // Optional: specific networks only
  networks: ["algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="],
  // Optional: payment policies
  policies: [preferTestnetPolicy],
});
```

### Server Registration

```typescript
import { x402ResourceServer } from "@x402-avm/core/server";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/server";

const server = new x402ResourceServer(facilitatorClient);

registerExactAvmScheme(server, {
  // Optional: specific networks
  networks: ["algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="],
});

// Or with wildcard (default)
registerExactAvmScheme(server);  // registers algorand:*
```

### Facilitator Registration

```typescript
import { x402Facilitator } from "@x402-avm/core/facilitator";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/facilitator";
import { ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2 } from "@x402-avm/avm";

const facilitator = new x402Facilitator();

// Single network
registerExactAvmScheme(facilitator, {
  signer: myFacilitatorSigner,
  networks: ALGORAND_TESTNET_CAIP2,
});

// Multiple networks
registerExactAvmScheme(facilitator, {
  signer: myFacilitatorSigner,
  networks: [ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2],
});
```

---

## Complete Examples

### Browser Client with Wallet

A complete browser application using Pera Wallet to pay for API access.

```typescript
// app.tsx
import React, { useState, useCallback } from "react";
import { x402Client } from "@x402-avm/core/client";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/client";
import type { ClientAvmSigner } from "@x402-avm/avm";
import {
  WalletProvider,
  useWallet,
  WalletId,
} from "@txnlab/use-wallet-react";

const walletProviders = {
  wallets: [WalletId.PERA, WalletId.DEFLY],
};

function PayForWeather() {
  const { activeAccount, signTransactions, connect, disconnect } = useWallet();
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

      const client = new x402Client({ schemes: [] });
      registerExactAvmScheme(client, { signer });

      const response = await client.fetch(
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

  return (
    <div>
      <h1>Weather API (Paid with USDC on Algorand)</h1>

      {!activeAccount ? (
        <button onClick={() => connect(WalletId.PERA)}>
          Connect Pera Wallet
        </button>
      ) : (
        <div>
          <p>Connected: {activeAccount.address.slice(0, 8)}...</p>
          <button onClick={fetchWeather} disabled={loading}>
            {loading ? "Paying..." : "Get Weather (0.10 USDC)"}
          </button>
          <button onClick={disconnect}>Disconnect</button>
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
    <WalletProvider value={walletProviders}>
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
import { x402Facilitator } from "@x402-avm/core/facilitator";
import { registerExactAvmScheme } from "@x402-avm/avm/exact/facilitator";
import { ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2 } from "@x402-avm/avm";
import algosdk from "algosdk";

// Build signer from environment
const secretKey = Buffer.from(process.env.AVM_PRIVATE_KEY!, "base64");
const address = algosdk.encodeAddress(secretKey.slice(32));

const algodTestnet = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");
const algodMainnet = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", "");

function getClient(network: string) {
  return network === ALGORAND_MAINNET_CAIP2 ? algodMainnet : algodTestnet;
}

const signer = {
  getAddresses: () => [address] as const,
  signTransaction: async (txn: Uint8Array) => {
    const decoded = algosdk.decodeUnsignedTransaction(txn);
    return algosdk.signTransaction(decoded, secretKey).blob;
  },
  getAlgodClient: (network: string) => getClient(network),
  simulateTransactions: async (txns: Uint8Array[], network: string) => {
    const client = getClient(network);
    const stxns = txns.map((t) => {
      try { return algosdk.decodeSignedTransaction(t); }
      catch { return new algosdk.SignedTransaction({ txn: algosdk.decodeUnsignedTransaction(t) }); }
    });
    const req = new algosdk.modelsv2.SimulateRequest({
      txnGroups: [new algosdk.modelsv2.SimulateRequestTransactionGroup({ txns: stxns })],
      allowEmptySignatures: true,
    });
    const result = await client.simulateTransactions(req).do();
    for (const g of result.txnGroups || []) {
      if (g.failureMessage) throw new Error(`Simulation failed: ${g.failureMessage}`);
    }
    return result;
  },
  sendTransactions: async (signedTxns: Uint8Array[], network: string) => {
    const client = getClient(network);
    const combined = Buffer.concat(signedTxns.map((t) => Buffer.from(t)));
    const { txId } = await client.sendRawTransaction(combined).do();
    return txId;
  },
  waitForConfirmation: async (txId: string, network: string, rounds = 4) => {
    return algosdk.waitForConfirmation(getClient(network), txId, rounds);
  },
};

// Setup facilitator
const facilitator = new x402Facilitator();
registerExactAvmScheme(facilitator, {
  signer,
  networks: [ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2],
});

// Express app
const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/supported", async (_req, res) => {
  try {
    res.json(facilitator.getSupportedNetworks());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/verify", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;
    const result = await facilitator.verify(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/settle", async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;
    const result = await facilitator.settle(paymentPayload, paymentRequirements);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = parseInt(process.env.PORT || "4000", 10);
app.listen(PORT, () => {
  console.log(`Facilitator service running on port ${PORT}`);
  console.log(`Fee payer address: ${address}`);
  console.log(`Networks: Testnet + Mainnet`);
});
```

---

## Summary

| Feature | Import / Usage |
|---------|---------------|
| Package | `@x402-avm/avm` |
| Client Signer | `ClientAvmSigner` interface |
| Facilitator Signer | `FacilitatorAvmSigner` interface |
| Network Constants | `ALGORAND_TESTNET_CAIP2` |
| USDC Config | `USDC_CONFIG[network]` |
| Address Validation | `isValidAlgorandAddress(addr)` |
| Amount Conversion | `convertToTokenAmount("1.5", 6)` |
| Algod Client | `createAlgodClient(network)` |
| Encode Txn | `encodeTransaction(bytes)` |
| Decode Txn | `decodeTransaction(b64)` |
| algosdk Encoding | Raw `Uint8Array` directly |
