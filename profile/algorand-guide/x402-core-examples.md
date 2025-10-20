# x402 Core Package with Algorand (AVM) Examples

This document provides examples of how to use the x402 core package with Algorand (AVM).

## Table of Contents

- [Types and Schemas](#types-and-schemas)
- [Client Implementation](#client-implementation)
- [Facilitator Implementation](#facilitator-implementation)
- [Complete Examples](#complete-examples)

## Types and Schemas

### Network and Type Definitions

The x402 core package extends the existing types to include Algorand networks:

```typescript
import { z } from 'zod'

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
  // New Algorand networks
  'algorand-testnet',
  'algorand',
])
export type Network = z.infer<typeof NetworkSchema>

// Algorand-specific payload schema
export const ExactAvmPayloadSchema = z.object({
  transaction: z.string(),
  feeTransaction: z.string().optional(),
})
export type ExactAvmPayload = z.infer<typeof ExactAvmPayloadSchema>
```

### Payment Requirements

```typescript
import { PaymentRequirements } from 'x402-avm'

// For ALGO payments
const algoPaymentRequirements: PaymentRequirements = {
  scheme: 'exact',
  network: 'algorand-testnet',
  maxAmountRequired: '1000000', // 1 ALGO (6 decimal places)
  asset: '0', // 0 for ALGO
  payTo: 'RESOURCE_WALLET_ADDRESS',
  resource: 'https://example.com/resource',
  description: 'Access to protected content',
  mimeType: 'application/json',
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6,
    feePayer: 'OPTIONAL_FEE_PAYER_ADDRESS', // Optional
  },
}

// For ASA (Algorand Standard Asset) payments
const asaPaymentRequirements: PaymentRequirements = {
  scheme: 'exact',
  network: 'algorand-testnet',
  maxAmountRequired: '10000', // 10 units of the ASA
  asset: '31566704', // ASA ID
  payTo: 'RESOURCE_WALLET_ADDRESS',
  resource: 'https://example.com/resource',
  description: 'Access to protected content',
  mimeType: 'application/json',
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6, // ASA decimal places (varies by asset)
    feePayer: 'OPTIONAL_FEE_PAYER_ADDRESS', // Optional
  },
}
```

## Client Implementation

### Creating a Client

```typescript
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { encodePaymentHeader } from 'x402-avm'
import { WalletManager } from './walletManager' // See wallet-implementation-guide.md

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

// Initialize wallet manager
const walletManager = new WalletManager({
  wallets: ['pera', 'defly'],
  defaultNetwork: 'testnet',
})

// Function to create and sign an Algorand payment
async function createAlgorandPayment(paymentRequirements) {
  if (!walletManager.activeAccount) {
    throw new Error('No active wallet account')
  }

  // Get transaction parameters
  const params = await algodClient.getTransactionParams().do()

  // Determine if this is an ALGO payment or ASA transfer
  const isASA = paymentRequirements.asset !== '0'

  // Parse amount from payment requirements
  const amount = parseInt(paymentRequirements.maxAmountRequired, 10)

  // Create transaction lease from payment requirements hash
  const paymentReqHash = sha256(JSON.stringify(paymentRequirements))
  const lease = new Uint8Array(Buffer.from(paymentReqHash, 'hex'))

  let transaction

  if (isASA) {
    // ASA transfer transaction
    transaction = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: walletManager.activeAccount.address,
      to: paymentRequirements.payTo,
      amount,
      assetIndex: parseInt(paymentRequirements.asset, 10),
      suggestedParams: params,
      lease,
    })
  } else {
    // ALGO payment transaction
    transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: walletManager.activeAccount.address,
      to: paymentRequirements.payTo,
      amount,
      suggestedParams: params,
      lease,
    })
  }

  // If a fee payer is specified, set up fee delegation
  let feeTransaction = null
  if (paymentRequirements.extra?.feePayer) {
    // Set transaction fee to 0 since fee payer will cover it
    transaction.fee = 0

    // Create fee payer transaction (amount=0, fee=cover both)
    const feePayer = paymentRequirements.extra.feePayer
    feeTransaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: feePayer,
      to: feePayer,
      amount: 0,
      suggestedParams: {
        ...params,
        fee: 2000, // Cover fee for both transactions (2 * 1000 = 2000 microAlgos)
      },
    })

    // Assign group ID to ensure atomic execution
    const txns = [transaction, feeTransaction]
    algosdk.assignGroupID(txns)
  }

  // Convert transaction to bytes
  const txnBytes = transaction.toByte()

  // Sign the transaction
  const signedTxns = await walletManager.signTransactions([txnBytes])
  const signedTxnBase64 = Buffer.from(signedTxns[0]).toString('base64')

  // Create x402 payment header
  const paymentHeader = {
    x402Version: 1,
    scheme: 'exact',
    network: paymentRequirements.network,
    payload: {
      transaction: signedTxnBase64,
    },
  }

  // Add fee transaction if present
  if (feeTransaction) {
    const feeTxnBytes = feeTransaction.toByte()
    const feeTxnBase64 = Buffer.from(feeTxnBytes).toString('base64')
    paymentHeader.payload.feeTransaction = feeTxnBase64
  }

  // Encode the payment header for HTTP header
  return encodePaymentHeader(paymentHeader)
}
```

### Using the Payment in HTTP Requests

```typescript
async function fetchProtectedResource(url, paymentRequirements) {
  // First attempt - will get 402 Payment Required
  const initialResponse = await fetch(url)

  if (initialResponse.status === 402) {
    // Generate payment header
    const paymentHeader = await createAlgorandPayment(paymentRequirements)

    // Retry with payment header
    const paymentResponse = await fetch(url, {
      headers: {
        'X-PAYMENT': paymentHeader,
      },
    })

    if (paymentResponse.ok) {
      return await paymentResponse.json()
    } else {
      throw new Error(`Payment failed: ${paymentResponse.statusText}`)
    }
  } else if (initialResponse.ok) {
    return await initialResponse.json()
  } else {
    throw new Error(`Request failed: ${initialResponse.statusText}`)
  }
}
```

## Facilitator Implementation

### Verification Logic

```typescript
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { X402Error, ErrorCodes } from 'x402-avm'

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

async function verifyAlgorandPayment(payload, paymentRequirements) {
  try {
    // Decode the base64 transaction
    const transactionBuffer = Buffer.from(payload.transaction, 'base64')
    const transaction = algosdk.decodeSignedTransaction(transactionBuffer).txn

    // Verify the transaction

    // 1. Verify lease matches payment requirements hash
    const paymentReqHash = sha256(JSON.stringify(paymentRequirements))
    const expectedLease = new Uint8Array(Buffer.from(paymentReqHash, 'hex'))

    if (!transaction.lease || !Buffer.from(transaction.lease).equals(Buffer.from(expectedLease))) {
      throw new X402Error(ErrorCodes.INVALID_TRANSACTION, 'Invalid lease field in transaction')
    }

    // 2. Verify transaction amount
    const expectedAmount = parseInt(paymentRequirements.maxAmountRequired, 10)

    if (transaction.amount !== expectedAmount) {
      throw new X402Error(
        ErrorCodes.INVALID_AMOUNT,
        'Transaction amount does not match required amount'
      )
    }

    // 3. Verify recipient address
    if (transaction.to.toString() !== paymentRequirements.payTo) {
      throw new X402Error(
        ErrorCodes.INVALID_RECIPIENT,
        'Transaction recipient does not match required recipient'
      )
    }

    // 4. Verify asset ID for ASA transfers
    if (paymentRequirements.asset !== '0') {
      if (
        !transaction.assetIndex ||
        transaction.assetIndex.toString() !== paymentRequirements.asset
      ) {
        throw new X402Error(
          ErrorCodes.INVALID_ASSET,
          'Transaction asset ID does not match required asset'
        )
      }
    }

    // 5. Verify the transaction is still valid (within round validity window)
    const currentRound = (await algodClient.status().do()).last_round

    if (transaction.firstValid > currentRound || transaction.lastValid < currentRound) {
      throw new X402Error(
        ErrorCodes.TRANSACTION_EXPIRED,
        'Transaction is no longer valid (round validity window expired)'
      )
    }

    // 6. If fee transaction is present, verify it
    if (payload.feeTransaction && paymentRequirements.extra?.feePayer) {
      const feeTxnBuffer = Buffer.from(payload.feeTransaction, 'base64')
      const feeTxn = algosdk.decodeUnsignedTransaction(feeTxnBuffer)

      // Verify fee payer address
      if (feeTxn.from.toString() !== paymentRequirements.extra.feePayer) {
        throw new X402Error(
          ErrorCodes.INVALID_FEE_PAYER,
          'Fee payer does not match expected fee payer'
        )
      }

      // Verify fee transaction has amount=0
      if (feeTxn.amount !== 0) {
        throw new X402Error(ErrorCodes.INVALID_FEE_TRANSACTION, 'Fee transaction amount must be 0')
      }

      // Verify fee transaction has sufficient fee
      if (feeTxn.fee < 2000) {
        throw new X402Error(
          ErrorCodes.INSUFFICIENT_FEE,
          'Fee transaction does not cover required fee'
        )
      }

      // Verify transactions have the same group ID
      if (
        !transaction.group ||
        !feeTxn.group ||
        !Buffer.from(transaction.group).equals(Buffer.from(feeTxn.group))
      ) {
        throw new X402Error(
          ErrorCodes.INVALID_GROUP_ID,
          'Transactions do not share the same group ID'
        )
      }
    }

    return { isValid: true }
  } catch (error) {
    if (error instanceof X402Error) {
      throw error
    }
    throw new X402Error(ErrorCodes.VERIFICATION_FAILED, `Verification failed: ${error.message}`)
  }
}
```

### Settlement Logic

```typescript
async function settleAlgorandPayment(payload, paymentRequirements) {
  try {
    // Decode the base64 transaction
    const transactionBuffer = Buffer.from(payload.transaction, 'base64')
    const signedTxn = new Uint8Array(transactionBuffer)

    // If fee transaction is present, create atomic transaction group
    if (payload.feeTransaction && paymentRequirements.extra?.feePayer) {
      // Decode fee transaction
      const feeTxnBuffer = Buffer.from(payload.feeTransaction, 'base64')
      const unsignedFeeTxn = new Uint8Array(feeTxnBuffer)

      // Sign fee transaction with facilitator private key
      const feePayerPrivateKey = getFeePayerPrivateKey() // Function to get fee payer private key
      const signedFeeTxn = algosdk.signTransaction(unsignedFeeTxn, feePayerPrivateKey)

      // Submit atomic transaction group
      const txns = [signedTxn, signedFeeTxn.blob]
      const response = await algodClient.sendRawTransaction(txns).do()

      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, response.txId, 4)

      return {
        success: true,
        transaction: response.txId,
        network: paymentRequirements.network,
        payer: algosdk.encodeAddress(algosdk.decodeSignedTransaction(signedTxn).txn.from.publicKey),
      }
    } else {
      // Submit single transaction
      const response = await algodClient.sendRawTransaction(signedTxn).do()

      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, response.txId, 4)

      return {
        success: true,
        transaction: response.txId,
        network: paymentRequirements.network,
        payer: algosdk.encodeAddress(algosdk.decodeSignedTransaction(signedTxn).txn.from.publicKey),
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}
```

## Complete Examples

### Client Example with Algorand

```typescript
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { encodePaymentHeader } from 'x402-avm'
import { WalletManager } from './walletManager'

export async function createAlgorandPayment(paymentRequirements) {
  const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')
  const walletManager = new WalletManager({
    wallets: ['pera', 'defly'],
    defaultNetwork: 'testnet',
  })

  // Connect wallet if not connected
  if (!walletManager.activeAccount) {
    await walletManager.connect('pera')
  }

  const params = await algodClient.getTransactionParams().do()
  const amount = parseInt(paymentRequirements.maxAmountRequired, 10)
  const paymentReqHash = sha256(JSON.stringify(paymentRequirements))
  const lease = new Uint8Array(Buffer.from(paymentReqHash, 'hex'))

  let transaction
  if (paymentRequirements.asset === '0') {
    // ALGO payment
    transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: walletManager.activeAccount.address,
      to: paymentRequirements.payTo,
      amount,
      suggestedParams: params,
      lease,
    })
  } else {
    // ASA transfer
    transaction = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: walletManager.activeAccount.address,
      to: paymentRequirements.payTo,
      amount,
      assetIndex: parseInt(paymentRequirements.asset, 10),
      suggestedParams: params,
      lease,
    })
  }

  let feeTransaction = null
  if (paymentRequirements.extra?.feePayer) {
    transaction.fee = 0
    const feePayer = paymentRequirements.extra.feePayer
    feeTransaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: feePayer,
      to: feePayer,
      amount: 0,
      suggestedParams: {
        ...params,
        fee: 2000,
      },
    })

    const txns = [transaction, feeTransaction]
    algosdk.assignGroupID(txns)
  }

  const txnBytes = transaction.toByte()
  const signedTxns = await walletManager.signTransactions([txnBytes])
  const signedTxnBase64 = Buffer.from(signedTxns[0]).toString('base64')

  const paymentHeader = {
    x402Version: 1,
    scheme: 'exact',
    network: paymentRequirements.network,
    payload: {
      transaction: signedTxnBase64,
    },
  }

  if (feeTransaction) {
    const feeTxnBytes = feeTransaction.toByte()
    const feeTxnBase64 = Buffer.from(feeTxnBytes).toString('base64')
    paymentHeader.payload.feeTransaction = feeTxnBase64
  }

  return encodePaymentHeader(paymentHeader)
}

// Usage example
async function main() {
  const paymentRequirements = {
    scheme: 'exact',
    network: 'algorand-testnet',
    maxAmountRequired: '1000000', // 1 ALGO
    asset: '0',
    payTo: 'RESOURCE_WALLET_ADDRESS',
    resource: 'https://example.com/resource',
    description: 'Access to protected content',
    mimeType: 'application/json',
    maxTimeoutSeconds: 60,
    outputSchema: null,
  }

  try {
    const paymentHeader = await createAlgorandPayment(paymentRequirements)

    // Use the payment header in your HTTP request
    const response = await fetch(paymentRequirements.resource, {
      headers: {
        'X-PAYMENT': paymentHeader,
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log('Resource access granted:', data)
    } else {
      console.error('Payment failed:', response.statusText)
    }
  } catch (error) {
    console.error('Error creating payment:', error)
  }
}
```

### Facilitator Example with Algorand

```typescript
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { X402Error, ErrorCodes } from 'x402-avm'

class AlgorandFacilitator {
  private algodClient: algosdk.Algodv2
  private feePayerPrivateKey: Uint8Array | null = null

  constructor(
    algodServer: string,
    algodToken: string = '',
    algodPort: string = '',
    feePayerMnemonic?: string
  ) {
    this.algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort)

    if (feePayerMnemonic) {
      this.feePayerPrivateKey = algosdk.mnemonicToSecretKey(feePayerMnemonic).sk
    }
  }

  async verify(payload: any, paymentRequirements: any): Promise<{ isValid: boolean }> {
    try {
      // Decode the base64 transaction
      const transactionBuffer = Buffer.from(payload.transaction, 'base64')
      const decodedTxn = algosdk.decodeSignedTransaction(transactionBuffer)
      const transaction = decodedTxn.txn

      // Verify the transaction

      // 1. Verify lease matches payment requirements hash
      const paymentReqHash = sha256(JSON.stringify(paymentRequirements))
      const expectedLease = new Uint8Array(Buffer.from(paymentReqHash, 'hex'))

      if (
        !transaction.lease ||
        !Buffer.from(transaction.lease).equals(Buffer.from(expectedLease))
      ) {
        throw new X402Error(ErrorCodes.INVALID_TRANSACTION, 'Invalid lease field in transaction')
      }

      // 2. Verify transaction amount
      const expectedAmount = parseInt(paymentRequirements.maxAmountRequired, 10)
      const actualAmount = transaction.type === 'axfer' ? transaction.amount : transaction.amount

      if (actualAmount !== expectedAmount) {
        throw new X402Error(
          ErrorCodes.INVALID_AMOUNT,
          'Transaction amount does not match required amount'
        )
      }

      // 3. Verify recipient address
      const recipientAddress = transaction.to.toString()
      if (recipientAddress !== paymentRequirements.payTo) {
        throw new X402Error(
          ErrorCodes.INVALID_RECIPIENT,
          'Transaction recipient does not match required recipient'
        )
      }

      // 4. Verify asset ID for ASA transfers
      if (paymentRequirements.asset !== '0') {
        if (
          transaction.type !== 'axfer' ||
          transaction.assetIndex.toString() !== paymentRequirements.asset
        ) {
          throw new X402Error(
            ErrorCodes.INVALID_ASSET,
            'Transaction asset ID does not match required asset'
          )
        }
      }

      // 5. Verify the transaction is still valid (within round validity window)
      const currentRound = (await this.algodClient.status().do()).last_round

      if (transaction.firstValid > currentRound || transaction.lastValid < currentRound) {
        throw new X402Error(
          ErrorCodes.TRANSACTION_EXPIRED,
          'Transaction is no longer valid (round validity window expired)'
        )
      }

      // 6. If fee transaction is present, verify it
      if (payload.feeTransaction && paymentRequirements.extra?.feePayer) {
        const feeTxnBuffer = Buffer.from(payload.feeTransaction, 'base64')
        const feeTxn = algosdk.decodeUnsignedTransaction(feeTxnBuffer)

        // Verify fee payer address
        if (feeTxn.from.toString() !== paymentRequirements.extra.feePayer) {
          throw new X402Error(
            ErrorCodes.INVALID_FEE_PAYER,
            'Fee payer does not match expected fee payer'
          )
        }

        // Verify fee transaction has amount=0
        if (feeTxn.amount !== 0) {
          throw new X402Error(
            ErrorCodes.INVALID_FEE_TRANSACTION,
            'Fee transaction amount must be 0'
          )
        }

        // Verify fee transaction has sufficient fee
        if (feeTxn.fee < 2000) {
          throw new X402Error(
            ErrorCodes.INSUFFICIENT_FEE,
            'Fee transaction does not cover required fee'
          )
        }

        // Verify transactions have the same group ID
        if (
          !transaction.group ||
          !feeTxn.group ||
          !Buffer.from(transaction.group).equals(Buffer.from(feeTxn.group))
        ) {
          throw new X402Error(
            ErrorCodes.INVALID_GROUP_ID,
            'Transactions do not share the same group ID'
          )
        }
      }

      // 7. If ASA payment, verify recipient has opted in
      if (paymentRequirements.asset !== '0') {
        const recipientInfo = await this.algodClient
          .accountInformation(paymentRequirements.payTo)
          .do()
        const assets = recipientInfo.assets || []
        const hasOptedIn = assets.some(
          (asset) => asset['asset-id'].toString() === paymentRequirements.asset
        )

        if (!hasOptedIn) {
          throw new X402Error(
            ErrorCodes.RECIPIENT_NOT_OPTED_IN,
            'Recipient has not opted in to the asset'
          )
        }
      }

      return { isValid: true }
    } catch (error) {
      if (error instanceof X402Error) {
        throw error
      }
      throw new X402Error(ErrorCodes.VERIFICATION_FAILED, `Verification failed: ${error.message}`)
    }
  }

  async settle(payload: any, paymentRequirements: any): Promise<any> {
    try {
      // Decode the base64 transaction
      const transactionBuffer = Buffer.from(payload.transaction, 'base64')
      const signedTxn = new Uint8Array(transactionBuffer)

      // If fee transaction is present, create atomic transaction group
      if (payload.feeTransaction && paymentRequirements.extra?.feePayer) {
        if (!this.feePayerPrivateKey) {
          throw new Error('Fee payer private key not configured')
        }

        // Decode fee transaction
        const feeTxnBuffer = Buffer.from(payload.feeTransaction, 'base64')
        const unsignedFeeTxn = algosdk.decodeUnsignedTransaction(feeTxnBuffer)

        // Sign fee transaction with facilitator private key
        const signedFeeTxn = algosdk.signTransaction(unsignedFeeTxn, this.feePayerPrivateKey)

        // Submit atomic transaction group
        const txns = [signedTxn, signedFeeTxn.blob]
        const response = await this.algodClient.sendRawTransaction(txns).do()

        // Wait for confirmation
        await algosdk.waitForConfirmation(this.algodClient, response.txId, 4)

        return {
          success: true,
          transaction: response.txId,
          network: paymentRequirements.network,
          payer: algosdk.encodeAddress(
            algosdk.decodeSignedTransaction(signedTxn).txn.from.publicKey
          ),
        }
      } else {
        // Submit single transaction
        const response = await this.algodClient.sendRawTransaction(signedTxn).do()

        // Wait for confirmation
        await algosdk.waitForConfirmation(this.algodClient, response.txId, 4)

        return {
          success: true,
          transaction: response.txId,
          network: paymentRequirements.network,
          payer: algosdk.encodeAddress(
            algosdk.decodeSignedTransaction(signedTxn).txn.from.publicKey
          ),
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
}

// Usage example
async function main() {
  const facilitator = new AlgorandFacilitator(
    'https://testnet-api.algonode.cloud',
    '',
    '',
    process.env.PRIVATE_KEY
  )

  const paymentRequirements = {
    scheme: 'exact',
    network: 'algorand-testnet',
    maxAmountRequired: '1000000',
    asset: '0',
    payTo: 'RESOURCE_WALLET_ADDRESS',
    resource: 'https://example.com/resource',
    description: 'Access to protected content',
    mimeType: 'application/json',
    maxTimeoutSeconds: 60,
    outputSchema: null,
  }

  const payload = {
    transaction: 'BASE64_ENCODED_TRANSACTION',
  }

  try {
    // Verify the payment
    const verificationResult = await facilitator.verify(payload, paymentRequirements)

    if (verificationResult.isValid) {
      // Settle the payment
      const settlementResult = await facilitator.settle(payload, paymentRequirements)

      if (settlementResult.success) {
        console.log('Payment settled successfully:', settlementResult.transaction)
      } else {
        console.error('Settlement failed:', settlementResult.error)
      }
    }
  } catch (error) {
    console.error('Verification failed:', error)
  }
}
```
