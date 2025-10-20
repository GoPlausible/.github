# x402-next with Algorand (AVM) Examples

This document provides examples of how to use the x402-next package with Algorand (AVM).

## Table of Contents

- [Basic Setup](#basic-setup)
- [Client-Side Integration](#client-side-integration)
- [Server-Side Integration](#server-side-integration)
- [Complete Example](#complete-example)

## Basic Setup

First, you need to install the required packages:

```bash
npm install x402 x402-next @algorand/algosdk @txnlab/use-wallet
```

## Server-Side Integration

### Setting Up Next.js API Routes with x402 Middleware

```typescript
// pages/api/protected.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { withX402 } from 'x402-next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Your protected resource logic
  res.status(200).json({
    message: 'This is a protected resource',
    data: 'Your premium content here',
  })
}

// Define payment requirements for Algorand
const paymentRequirements = {
  scheme: 'exact',
  network: 'algorand-testnet',
  maxAmountRequired: '1000000', // 1 ALGO
  asset: '0', // 0 for ALGO
  payTo: process.env.RESOURCE_WALLET_ADDRESS as string,
  resource: 'https://example.com/api/protected',
  description: 'Access to protected content',
  mimeType: 'application/json',
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6,
    feePayer: process.env.ALGORAND_FEE_PAYER, // Optional
  },
}

// Apply x402 middleware
export default withX402(handler, {
  paymentRequirements,
  facilitatorUrl: process.env.FACILITATOR_URL as string,
})
```

### Using Edge Runtime API Routes

```typescript
// pages/api/edge-protected.ts

import { withX402Edge } from 'x402-next'
import type { NextRequest } from 'next/server'

// Define payment requirements for Algorand
const paymentRequirements = {
  scheme: 'exact',
  network: 'algorand-testnet',
  maxAmountRequired: '1000000', // 1 ALGO
  asset: '0',
  payTo: process.env.RESOURCE_WALLET_ADDRESS as string,
  resource: 'https://example.com/api/edge-protected',
  description: 'Access to protected content with edge runtime',
  mimeType: 'application/json',
  maxTimeoutSeconds: 60,
  outputSchema: null,
  extra: {
    decimals: 6,
    feePayer: process.env.ALGORAND_FEE_PAYER, // Optional
  },
}

const handler = async (req: NextRequest) => {
  // Your protected resource logic
  return new Response(
    JSON.stringify({
      message: 'This is a protected resource using edge runtime',
      data: 'Your premium content here',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

// Apply x402 edge middleware
export default withX402Edge(handler, {
  paymentRequirements,
  facilitatorUrl: process.env.FACILITATOR_URL as string,
})

export const config = {
  runtime: 'edge',
}
```

### Dynamic Payment Requirements

```typescript
// pages/api/dynamic-protected.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { withDynamicX402 } from 'x402-next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const tier = req.query.tier as string

  res.status(200).json({
    message: `This is a protected ${tier} resource`,
    data: `Your premium ${tier} content here`,
  })
}

// Apply dynamic x402 middleware
export default withDynamicX402(
  handler,
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
      resource: `https://example.com/api/dynamic-protected?tier=${tier}`,
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
```

### ASA Payment Example

```typescript
// pages/api/premium-content.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { withX402 } from 'x402-next'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({
    message: 'This is premium content paid with ASA',
    data: 'Your premium content here',
  })
}

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

// Apply x402 middleware
export default withX402(handler, {
  paymentRequirements: asaPaymentRequirements,
  facilitatorUrl: process.env.FACILITATOR_URL as string,
})
```

## Client-Side Integration

### Setting Up Algorand Wallet Connection

```tsx
// components/AlgorandWalletConnector.tsx

import { useEffect, useState } from 'react'
import { PeraWalletConnect } from '@perawallet/connect'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'

// Initialize Pera Wallet
const peraWallet = new PeraWalletConnect()

interface WalletConnectorProps {
  onAddressChange: (address: string | null) => void
}

const AlgorandWalletConnector: React.FC<WalletConnectorProps> = ({ onAddressChange }) => {
  const [accountAddress, setAccountAddress] = useState<string | null>(null)

  useEffect(() => {
    // Reconnect to session when the component is mounted
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        if (accounts.length > 0) {
          setAccountAddress(accounts[0])
          onAddressChange(accounts[0])
        }
      })
      .catch((e) => console.log('Error reconnecting to wallet:', e))

    // Add event listeners
    peraWallet.connector?.on('disconnect', handleDisconnect)

    return () => {
      // Clean up event listeners
      peraWallet.connector?.off('disconnect', handleDisconnect)
    }
  }, [onAddressChange])

  const handleConnectWallet = async () => {
    try {
      const newAccounts = await peraWallet.connect()
      if (newAccounts.length > 0) {
        setAccountAddress(newAccounts[0])
        onAddressChange(newAccounts[0])
      }
    } catch (error) {
      console.error('Connection error:', error)
    }
  }

  const handleDisconnect = () => {
    setAccountAddress(null)
    onAddressChange(null)
  }

  return (
    <div className="wallet-connector">
      {!accountAddress ? (
        <button onClick={handleConnectWallet}>Connect Algorand Wallet</button>
      ) : (
        <div>
          <p>
            Connected: {accountAddress.substring(0, 6)}...
            {accountAddress.substring(accountAddress.length - 4)}
          </p>
          <button onClick={() => peraWallet.disconnect()}>Disconnect</button>
        </div>
      )}
    </div>
  )
}

export default AlgorandWalletConnector
```

### Creating Algorand Payment for x402

```tsx
// utils/algorandPayment.ts

import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { encodePaymentHeader } from 'x402'
import { PeraWalletConnect } from '@perawallet/connect'

const peraWallet = new PeraWalletConnect()
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

export interface PaymentRequirements {
  scheme: string
  network: string
  maxAmountRequired: string
  asset: string
  payTo: string
  resource: string
  description: string
  mimeType: string
  maxTimeoutSeconds: number
  outputSchema: any
  extra?: {
    decimals?: number
    feePayer?: string
  }
}

export async function createAlgorandPayment(
  paymentRequirements: PaymentRequirements,
  senderAddress: string
): Promise<string> {
  try {
    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do()

    // Determine if this is an ALGO payment or ASA transfer
    const isASA = paymentRequirements.asset !== '0'

    // Parse amount
    const amount = parseInt(paymentRequirements.maxAmountRequired, 10)

    // Create transaction lease from payment requirements hash
    const paymentReqHash = sha256(JSON.stringify(paymentRequirements))
    const lease = new Uint8Array(Buffer.from(paymentReqHash, 'hex'))

    let transaction

    if (isASA) {
      // ASA transfer transaction
      transaction = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: senderAddress,
        to: paymentRequirements.payTo,
        amount,
        assetIndex: parseInt(paymentRequirements.asset, 10),
        suggestedParams: params,
        lease,
      })
    } else {
      // ALGO payment transaction
      transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: senderAddress,
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

    // Sign the transaction with Pera Wallet
    const signedTxns = await peraWallet.signTransaction([
      [{ txn: txnBytes, signers: [senderAddress] }],
    ])
    const signedTxnBase64 = Buffer.from(signedTxns).toString('base64')

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
  } catch (error) {
    console.error('Error creating Algorand payment:', error)
    throw error
  }
}
```

### Client-Side Component for Protected Content

```tsx
// components/ProtectedContent.tsx

import { useState, useEffect } from 'react'
import { createAlgorandPayment } from '../utils/algorandPayment'
import AlgorandWalletConnector from './AlgorandWalletConnector'

interface ProtectedContentProps {
  resourceUrl: string
}

const ProtectedContent: React.FC<ProtectedContentProps> = ({ resourceUrl }) => {
  const [content, setContent] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentRequirements, setPaymentRequirements] = useState<any>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // Fetch the resource (will return 402 if payment required)
  const fetchResource = async (paymentHeader?: string) => {
    setLoading(true)
    setError(null)

    try {
      const headers: Record<string, string> = {}

      if (paymentHeader) {
        headers['X-PAYMENT'] = paymentHeader
      }

      const response = await fetch(resourceUrl, { headers })

      if (response.status === 402) {
        // Payment required
        const data = await response.json()
        setPaymentRequirements(data)
        setLoading(false)
        return
      }

      if (response.ok) {
        // Payment successful or not required
        const data = await response.json()
        setContent(data)
        setPaymentRequirements(null)
      } else {
        setError(`Failed to fetch resource: ${response.statusText}`)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }

    setLoading(false)
  }

  // Make payment and retry request
  const handlePayment = async () => {
    if (!walletAddress || !paymentRequirements) {
      setError('Wallet not connected or payment requirements not available')
      return
    }

    setLoading(true)

    try {
      const paymentHeader = await createAlgorandPayment(paymentRequirements, walletAddress)
      await fetchResource(paymentHeader)
    } catch (err) {
      setError(`Payment error: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  // Handle wallet connection/disconnection
  const handleAddressChange = (address: string | null) => {
    setWalletAddress(address)
    if (address && paymentRequirements) {
      // If wallet connected and payment required, clear error
      setError(null)
    }
  }

  useEffect(() => {
    // Fetch the resource on component mount
    fetchResource()
  }, [resourceUrl])

  return (
    <div className="protected-content">
      {loading && <p>Loading...</p>}

      {error && <p className="error">{error}</p>}

      {!loading && paymentRequirements && (
        <div className="payment-required">
          <h3>Payment Required</h3>
          <p>{paymentRequirements.description}</p>
          <p>
            Amount:{' '}
            {parseInt(paymentRequirements.maxAmountRequired) /
              Math.pow(10, paymentRequirements.extra?.decimals || 6)}{' '}
            {paymentRequirements.asset === '0' ? 'ALGO' : `ASA-${paymentRequirements.asset}`}
          </p>

          <AlgorandWalletConnector onAddressChange={handleAddressChange} />

          {walletAddress && (
            <button onClick={handlePayment} disabled={loading}>
              Pay and Access
            </button>
          )}
        </div>
      )}

      {!loading && content && (
        <div className="content">
          <h3>Protected Content</h3>
          <pre>{JSON.stringify(content, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default ProtectedContent
```

## Complete Example

### Setting Up a Next.js Page with Protected Content

```tsx
// pages/index.tsx

import { useState } from 'react'
import Head from 'next/head'
import ProtectedContent from '../components/ProtectedContent'

export default function Home() {
  const [apiEndpoint, setApiEndpoint] = useState('/api/protected')

  return (
    <div className="container">
      <Head>
        <title>x402 Algorand Example</title>
        <meta name="description" content="Next.js app with x402 and Algorand" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>x402 with Algorand</h1>

        <div className="endpoint-selector">
          <h3>Select Protected Endpoint</h3>
          <select value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)}>
            <option value="/api/protected">Basic Protected</option>
            <option value="/api/premium-content">ASA Payment</option>
            <option value="/api/dynamic-protected?tier=standard">Standard Tier</option>
            <option value="/api/dynamic-protected?tier=premium">Premium Tier</option>
            <option value="/api/edge-protected">Edge Runtime</option>
          </select>
        </div>

        <div className="content-container">
          <ProtectedContent resourceUrl={apiEndpoint} />
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          max-width: 800px;
        }

        .endpoint-selector {
          margin: 2rem 0;
          width: 100%;
          text-align: center;
        }

        .endpoint-selector select {
          padding: 0.5rem;
          font-size: 1rem;
          border-radius: 5px;
          margin-left: 1rem;
        }

        .content-container {
          width: 100%;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          padding: 1.5rem;
        }
      `}</style>
    </div>
  )
}
```

### Setting Up a Facilitator API Route

```typescript
// pages/api/facilitator/[[...route]].ts

import type { NextApiRequest, NextApiResponse } from 'next'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { createX402FacilitatorRouter } from 'x402-next'

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
async function verifyAlgorandPayment(payload: any, paymentRequirements: any) {
  try {
    // Implementation as shown in the core examples
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
    return {
      isValid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Custom settlement function for Algorand payments
async function settleAlgorandPayment(payload: any, paymentRequirements: any) {
  try {
    // Implementation as shown in the core examples
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
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Set up x402 facilitator router
const facilitatorRouter = createX402FacilitatorRouter({
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

export default facilitatorRouter
```

### Environment Variables Configuration

Create a `.env.local` file with the following variables:

```env
# Resource server configuration
RESOURCE_WALLET_ADDRESS=YOUR_ALGORAND_ADDRESS
NETWORK=algorand-testnet
ASSET=0
PRICE=0.01
NEXT_PUBLIC_FACILITATOR_URL=/api/facilitator
FACILITATOR_URL=/api/facilitator

# Algorand node configuration
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
ALGOD_PORT=

# Fee payer configuration (optional)
ALGORAND_FEE_PAYER=YOUR_FEE_PAYER_ADDRESS
ALGORAND_MNEMONIC=your mnemonic phrase for fee payer wallet

# ASA configuration (optional)
ASA_ID=31566704
```
