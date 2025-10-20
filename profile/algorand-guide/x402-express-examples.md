# x402-express with Algorand (AVM) Examples

This document provides examples of how to use the x402-express package with Algorand (AVM).

## Table of Contents

- [Basic Setup](#basic-setup)
- [Resource Server Implementation](#resource-server-implementation)
- [Facilitator Server Implementation](#facilitator-server-implementation)
- [Complete Example](#complete-example)

## Basic Setup

First, you need to install the required packages:

```bash
npm install x402 x402-express @algorand/algosdk
```

## Resource Server Implementation

### Setting Up Express with x402 Middleware

```typescript
import express from 'express'
import { createX402Middleware } from 'x402-express'

const app = express()
const port = 3000

// Define payment requirements for Algorand
const paymentRequirements = {
  scheme: 'exact',
  network: 'algorand-testnet',
  maxAmountRequired: '1000000', // 1 ALGO
  asset: '0',
  payTo: process.env.RESOURCE_WALLET_ADDRESS as string,
  resource: 'https://example.com/api/protected-resource',
  description: 'Access to protected content',
  mimeType: 'application/json',
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6,
    feePayer: process.env.ALGORAND_FEE_PAYER, // Optional
  },
}

// Create x402 middleware with Algorand payment requirements
const x402Middleware = createX402Middleware({
  paymentRequirements,
  facilitatorUrl: process.env.FACILITATOR_URL as string,
})

// Apply middleware to protect a route
app.get('/api/protected-resource', x402Middleware, (req, res) => {
  res.json({
    message: 'This is a protected resource',
    data: 'Your premium content here',
  })
})

// Public route (no payment required)
app.get('/api/public', (req, res) => {
  res.json({
    message: 'This is a public resource',
  })
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
```

### Dynamic Payment Requirements

You can also create dynamic payment requirements based on the request:

```typescript
import express from 'express'
import { createDynamicX402Middleware } from 'x402-express'

const app = express()
const port = 3000

// Create dynamic x402 middleware for Algorand payments
const dynamicX402Middleware = createDynamicX402Middleware(
  (req) => {
    // Get request parameters
    const tier = req.query.tier as string

    // Set price based on tier
    let price
    let description

    switch (tier) {
      case 'premium':
        price = '5000000' // 5 ALGO
        description = 'Premium content access'
        break
      case 'standard':
        price = '1000000' // 1 ALGO
        description = 'Standard content access'
        break
      default:
        price = '500000' // 0.5 ALGO
        description = 'Basic content access'
    }

    // Return payment requirements
    return {
      scheme: 'exact',
      network: 'algorand-testnet',
      maxAmountRequired: price,
      asset: '0', // ALGO
      payTo: process.env.RESOURCE_WALLET_ADDRESS as string,
      resource: `https://example.com/api/tier/${tier}`,
      description,
      mimeType: 'application/json',
      maxTimeoutSeconds: 60,
      outputSchema: null,
      extra: {
        decimals: 6,
        feePayer: process.env.ALGORAND_FEE_PAYER, // Optional
      },
    }
  },
  {
    facilitatorUrl: process.env.FACILITATOR_URL as string,
  }
)

// Apply dynamic middleware to a route
app.get('/api/tier/:tier', dynamicX402Middleware, (req, res) => {
  const tier = req.params.tier
  res.json({
    message: `This is ${tier} tier content`,
    data: `Your ${tier} content here`,
  })
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
```

### ASA Payment Example

Here's how to set up Express middleware to accept payments in an Algorand Standard Asset (ASA):

```typescript
import express from 'express'
import { createX402Middleware } from 'x402-express'

const app = express()
const port = 3000

// Define payment requirements for an ASA
const asaPaymentRequirements = {
  scheme: 'exact',
  network: 'algorand-testnet',
  maxAmountRequired: '10000', // 10 units of the ASA
  asset: process.env.ASA_ID as string, // ASA ID from environment variable
  payTo: process.env.RESOURCE_WALLET_ADDRESS as string,
  resource: 'https://example.com/api/premium-content',
  description: 'Access to premium content',
  mimeType: 'application/json',
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6, // ASA decimal places (varies by asset)
    feePayer: process.env.ALGORAND_FEE_PAYER, // Optional
  },
}

// Create x402 middleware with ASA payment requirements
const asaX402Middleware = createX402Middleware({
  paymentRequirements: asaPaymentRequirements,
  facilitatorUrl: process.env.FACILITATOR_URL as string,
})

// Apply middleware to protect a route
app.get('/api/premium-content', asaX402Middleware, (req, res) => {
  res.json({
    message: 'This is premium content paid with ASA',
    data: 'Your premium content here',
  })
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
```

## Facilitator Server Implementation

### Setting Up a Facilitator Endpoint in Express

```typescript
import express from 'express'
import algosdk from '@algorand/algosdk'
import { createX402FacilitatorRoutes } from 'x402-express'
import { sha256 } from 'js-sha256'

const app = express()
app.use(express.json())
const port = 3001

// Initialize Algorand client
const algodServer = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
const algodToken = process.env.ALGOD_TOKEN || ''
const algodPort = process.env.ALGOD_PORT || ''
const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort)

// Configure fee payer if available
let feePayerPrivateKey: Uint8Array | undefined
if (process.env.ALGORAND_MNEMONIC) {
  feePayerPrivateKey = algosdk.mnemonicToSecretKey(process.env.ALGORAND_MNEMONIC).sk
}

// Custom verification function for Algorand payments
async function verifyAlgorandPayment(payload, paymentRequirements) {
  try {
    // Decode the base64 transaction
    const transactionBuffer = Buffer.from(payload.transaction, 'base64')
    const decodedTxn = algosdk.decodeSignedTransaction(transactionBuffer)
    const transaction = decodedTxn.txn

    // Verify the transaction

    // 1. Verify lease matches payment requirements hash
    const paymentReqHash = sha256(JSON.stringify(paymentRequirements))
    const expectedLease = new Uint8Array(Buffer.from(paymentReqHash, 'hex'))

    if (!transaction.lease || !Buffer.from(transaction.lease).equals(Buffer.from(expectedLease))) {
      return {
        isValid: false,
        error: 'Invalid lease field in transaction',
      }
    }

    // 2. Verify transaction amount
    const expectedAmount = parseInt(paymentRequirements.maxAmountRequired, 10)
    const actualAmount = transaction.type === 'axfer' ? transaction.amount : transaction.amount

    if (actualAmount !== expectedAmount) {
      return {
        isValid: false,
        error: 'Transaction amount does not match required amount',
      }
    }

    // 3. Verify recipient address
    const recipientAddress = transaction.to.toString()
    if (recipientAddress !== paymentRequirements.payTo) {
      return {
        isValid: false,
        error: 'Transaction recipient does not match required recipient',
      }
    }

    // 4. Verify asset ID for ASA transfers
    if (paymentRequirements.asset !== '0') {
      if (
        transaction.type !== 'axfer' ||
        transaction.assetIndex.toString() !== paymentRequirements.asset
      ) {
        return {
          isValid: false,
          error: 'Transaction asset ID does not match required asset',
        }
      }
    }

    // 5. Verify the transaction is still valid (within round validity window)
    const currentRound = (await algodClient.status().do()).last_round

    if (transaction.firstValid > currentRound || transaction.lastValid < currentRound) {
      return {
        isValid: false,
        error: 'Transaction is no longer valid (round validity window expired)',
      }
    }

    // Additional verifications for fee transaction if present
    if (payload.feeTransaction && paymentRequirements.extra?.feePayer) {
      const feeTxnBuffer = Buffer.from(payload.feeTransaction, 'base64')
      const feeTxn = algosdk.decodeUnsignedTransaction(feeTxnBuffer)

      if (feeTxn.from.toString() !== paymentRequirements.extra.feePayer) {
        return {
          isValid: false,
          error: 'Fee payer does not match expected fee payer',
        }
      }

      if (feeTxn.amount !== 0) {
        return {
          isValid: false,
          error: 'Fee transaction amount must be 0',
        }
      }

      if (feeTxn.fee < 2000) {
        return {
          isValid: false,
          error: 'Fee transaction does not cover required fee',
        }
      }

      if (
        !transaction.group ||
        !feeTxn.group ||
        !Buffer.from(transaction.group).equals(Buffer.from(feeTxn.group))
      ) {
        return {
          isValid: false,
          error: 'Transactions do not share the same group ID',
        }
      }
    }

    // 7. If ASA payment, verify recipient has opted in
    if (paymentRequirements.asset !== '0') {
      const recipientInfo = await algodClient.accountInformation(paymentRequirements.payTo).do()
      const assets = recipientInfo.assets || []
      const hasOptedIn = assets.some(
        (asset) => asset['asset-id'].toString() === paymentRequirements.asset
      )

      if (!hasOptedIn) {
        return {
          isValid: false,
          error: 'Recipient has not opted in to the asset',
        }
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: `Verification failed: ${error.message}`,
    }
  }
}

// Custom settlement function for Algorand payments
async function settleAlgorandPayment(payload, paymentRequirements) {
  try {
    // Decode the base64 transaction
    const transactionBuffer = Buffer.from(payload.transaction, 'base64')
    const signedTxn = new Uint8Array(transactionBuffer)

    // If fee transaction is present, create atomic transaction group
    if (payload.feeTransaction && paymentRequirements.extra?.feePayer && feePayerPrivateKey) {
      // Decode fee transaction
      const feeTxnBuffer = Buffer.from(payload.feeTransaction, 'base64')
      const unsignedFeeTxn = algosdk.decodeUnsignedTransaction(feeTxnBuffer)

      // Sign fee transaction with facilitator private key
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

// Set up x402 facilitator routes
const facilitatorRoutes = createX402FacilitatorRoutes({
  verifyFunctions: {
    exact: {
      'algorand-testnet': verifyAlgorandPayment,
      algorand: verifyAlgorandPayment,
    },
  },
  settleFunctions: {
    exact: {
      'algorand-testnet': settleAlgorandPayment,
      algorand: settleAlgorandPayment,
    },
  },
})

// Mount facilitator routes
app.use('/facilitator', facilitatorRoutes)

app.listen(port, () => {
  console.log(`Facilitator server running at http://localhost:${port}`)
})
```

## Complete Example

### Full Express Application with x402 and Algorand

```typescript
import express from 'express'
import algosdk from '@algorand/algosdk'
import { createX402Middleware, createX402FacilitatorRoutes } from 'x402-express'
import { sha256 } from 'js-sha256'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
app.use(express.json())

// Get configuration from environment variables
const resourceWalletAddress = process.env.RESOURCE_WALLET_ADDRESS as string
const facilitatorUrl = 'http://localhost:3000/facilitator'
const assetId = process.env.ASSET || '0'
const price = process.env.PRICE || '0.01'
const algodServer = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
const algodToken = process.env.ALGOD_TOKEN || ''
const algodPort = process.env.ALGOD_PORT || ''
const feePayer = process.env.ALGORAND_FEE_PAYER || resourceWalletAddress
const network = process.env.NETWORK || 'algorand-testnet'

// Initialize Algorand client
const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort)

// Configure fee payer if available
let feePayerPrivateKey: Uint8Array | undefined
if (process.env.ALGORAND_MNEMONIC) {
  feePayerPrivateKey = algosdk.mnemonicToSecretKey(process.env.ALGORAND_MNEMONIC).sk
}

// Define payment requirements for Algorand
const paymentRequirements = {
  scheme: 'exact',
  network,
  // Convert price to microAlgos or smallest asset unit
  maxAmountRequired: Math.floor(parseFloat(price) * 1000000).toString(),
  asset: assetId,
  payTo: resourceWalletAddress,
  resource: '/api/protected',
  description: 'Access to protected content',
  mimeType: 'application/json',
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6,
    feePayer,
  },
}

// Create x402 middleware for protected routes
const x402Middleware = createX402Middleware({
  paymentRequirements,
  facilitatorUrl,
})

// Verification function for Algorand payments
async function verifyAlgorandPayment(payload, paymentRequirements) {
  try {
    // Implementation as shown in the facilitator example above
    const transactionBuffer = Buffer.from(payload.transaction, 'base64')
    const decodedTxn = algosdk.decodeSignedTransaction(transactionBuffer)
    const transaction = decodedTxn.txn

    // Verify lease matches payment requirements hash
    const paymentReqHash = sha256(JSON.stringify(paymentRequirements))
    const expectedLease = new Uint8Array(Buffer.from(paymentReqHash, 'hex'))

    if (!transaction.lease || !Buffer.from(transaction.lease).equals(Buffer.from(expectedLease))) {
      return { isValid: false, error: 'Invalid lease field in transaction' }
    }

    // Additional verifications...

    return { isValid: true }
  } catch (error) {
    return { isValid: false, error: `Verification failed: ${error.message}` }
  }
}

// Settlement function for Algorand payments
async function settleAlgorandPayment(payload, paymentRequirements) {
  try {
    // Implementation as shown in the facilitator example above
    const transactionBuffer = Buffer.from(payload.transaction, 'base64')
    const signedTxn = new Uint8Array(transactionBuffer)

    // Fee delegation handling and transaction submission...

    const response = await algodClient.sendRawTransaction(signedTxn).do()
    await algosdk.waitForConfirmation(algodClient, response.txId, 4)

    return {
      success: true,
      transaction: response.txId,
      network: paymentRequirements.network,
      payer: algosdk.encodeAddress(algosdk.decodeSignedTransaction(signedTxn).txn.from.publicKey),
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Set up x402 facilitator routes
const facilitatorRoutes = createX402FacilitatorRoutes({
  verifyFunctions: {
    exact: {
      'algorand-testnet': verifyAlgorandPayment,
      algorand: verifyAlgorandPayment,
    },
  },
  settleFunctions: {
    exact: {
      'algorand-testnet': settleAlgorandPayment,
      algorand: settleAlgorandPayment,
    },
  },
})

// Public routes
app.get('/', (req, res) => {
  res.send('Welcome to the x402 Algorand example server')
})

// Protected routes
app.get('/api/protected', x402Middleware, (req, res) => {
  res.json({
    message: 'This is a protected resource',
    data: 'Your premium content here',
    paymentInfo: {
      network,
      asset: assetId,
      amount: price,
    },
  })
})

// Mount facilitator routes
app.use('/facilitator', facilitatorRoutes)

// Start the server
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
  console.log(`Protected resource available at http://localhost:${port}/api/protected`)
  console.log(`Facilitator endpoint available at http://localhost:${port}/facilitator`)
})
```

### Environment Variables Configuration

Create a `.env` file with the following variables:

```env
# Resource server configuration
RESOURCE_WALLET_ADDRESS=YOUR_ALGORAND_ADDRESS
NETWORK=algorand-testnet
ASSET=0
PRICE=0.01
PORT=3000

# Algorand node configuration
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
ALGOD_PORT=

# Fee payer configuration (optional)
ALGORAND_FEE_PAYER=YOUR_FEE_PAYER_ADDRESS
ALGORAND_MNEMONIC=your mnemonic phrase for fee payer wallet
```
