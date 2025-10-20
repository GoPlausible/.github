# x402-fetch with Algorand (AVM) Examples

This document provides examples of how to use the x402-fetch package with Algorand (AVM).

## Table of Contents

- [Basic Setup](#basic-setup)
- [Client-Side Implementation](#client-side-implementation)
- [Complete Examples](#complete-examples)

## Basic Setup

First, you need to install the required packages:

```bash
npm install x402 x402-fetch @algorand/algosdk
```

## Client-Side Implementation

### Basic Usage

```typescript
import { createX402Fetch } from 'x402-fetch'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'

// Initialize Pera Wallet
// This example assumes a web environment with Pera wallet available globally
declare global {
  interface Window {
    peraWallet: any
  }
}

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

// Create an enhanced fetch function with x402 payment capability
const x402Fetch = createX402Fetch({
  // Function to create a payment for a given payment requirement
  async createPayment(paymentRequirements, fetch) {
    if (
      paymentRequirements.scheme === 'exact' &&
      (paymentRequirements.network === 'algorand' ||
        paymentRequirements.network === 'algorand-testnet')
    ) {
      // Create Algorand payment
      return await createAlgorandPayment(paymentRequirements)
    }

    // Fallback to default or other blockchain implementations
    throw new Error(
      `Unsupported payment scheme/network: ${paymentRequirements.scheme}/${paymentRequirements.network}`
    )
  },

  // Specify maximum number of retries for 402 responses
  maxRetries: 1,
})

// Function to create an Algorand payment
async function createAlgorandPayment(paymentRequirements) {
  try {
    // Check if Pera wallet is available
    if (!window.peraWallet) {
      throw new Error('Pera wallet not available')
    }

    // Connect to wallet if needed
    let accounts = await window.peraWallet.reconnectSession()

    if (!accounts || accounts.length === 0) {
      accounts = await window.peraWallet.connect()
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available in wallet')
    }

    const senderAddress = accounts[0]

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

    // Sign the transaction
    const signedTxns = await window.peraWallet.signTransaction([
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

    return paymentHeader
  } catch (error) {
    console.error('Error creating Algorand payment:', error)
    throw error
  }
}

// Now you can use x402Fetch just like regular fetch
async function fetchProtectedResource() {
  try {
    const response = await x402Fetch('https://example.com/api/protected')

    if (response.ok) {
      const data = await response.json()
      console.log('Fetched data:', data)
      return data
    } else {
      throw new Error(`Failed to fetch resource: ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}
```

### Enhanced x402Fetch with Wallet Connection UI

```typescript
// components/AlgorandFetch.tsx

import { useState, useEffect } from 'react'
import { createX402Fetch } from 'x402-fetch'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'

// Initialize Pera Wallet
// Assume we have imported a wallet connector like @perawallet/connect
import { PeraWalletConnect } from '@perawallet/connect'
const peraWallet = new PeraWalletConnect()

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

// Create an enhanced fetch function with a payment UI integration
export function useX402AlgorandFetch() {
  const [accountAddress, setAccountAddress] = useState<string | null>(null)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [currentPaymentReqs, setCurrentPaymentReqs] = useState<any>(null)
  const [paymentCallback, setPaymentCallback] = useState<((payment: any) => void) | null>(null)

  // Effect to reconnect wallet on component mount
  useEffect(() => {
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        if (accounts.length > 0) {
          setAccountAddress(accounts[0])
        }
      })
      .catch(console.error)

    // Add event listeners
    peraWallet.connector?.on('disconnect', handleDisconnect)

    return () => {
      // Clean up event listeners
      peraWallet.connector?.off('disconnect', handleDisconnect)
    }
  }, [])

  // Handle wallet disconnection
  const handleDisconnect = () => {
    setAccountAddress(null)
  }

  // Connect wallet function
  const connectWallet = async () => {
    try {
      const accounts = await peraWallet.connect()

      if (accounts.length > 0) {
        setAccountAddress(accounts[0])
        return accounts[0]
      }

      throw new Error('No accounts connected')
    } catch (error) {
      console.error('Error connecting to wallet:', error)
      throw error
    }
  }

  // Create Algorand payment
  const createAlgorandPayment = async (paymentRequirements: any) => {
    if (!accountAddress) {
      // Open wallet connection UI
      setCurrentPaymentReqs(paymentRequirements)
      setIsWalletModalOpen(true)

      // Return a promise that will be resolved when payment is created
      return new Promise((resolve, reject) => {
        setPaymentCallback(() => async (senderAddress) => {
          try {
            const payment = await generatePayment(paymentRequirements, senderAddress)
            resolve(payment)
          } catch (error) {
            reject(error)
          } finally {
            setIsWalletModalOpen(false)
            setCurrentPaymentReqs(null)
            setPaymentCallback(null)
          }
        })
      })
    }

    return await generatePayment(paymentRequirements, accountAddress)
  }

  // Generate payment header
  const generatePayment = async (paymentRequirements: any, senderAddress: string) => {
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

      // Sign the transaction
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

      return paymentHeader
    } catch (error) {
      console.error('Error generating payment:', error)
      throw error
    }
  }

  // Create the enhanced fetch function
  const x402Fetch = createX402Fetch({
    async createPayment(paymentRequirements, fetch) {
      if (
        paymentRequirements.scheme === 'exact' &&
        (paymentRequirements.network === 'algorand' ||
          paymentRequirements.network === 'algorand-testnet')
      ) {
        return await createAlgorandPayment(paymentRequirements)
      }

      throw new Error(
        `Unsupported payment scheme/network: ${paymentRequirements.scheme}/${paymentRequirements.network}`
      )
    },
    maxRetries: 1,
  })

  // Wallet connection UI component
  const WalletConnectionModal = () => {
    if (!isWalletModalOpen) return null

    const handleConnect = async () => {
      try {
        const address = await connectWallet()
        if (paymentCallback && address) {
          paymentCallback(address)
        }
      } catch (error) {
        console.error('Connection error:', error)
        setIsWalletModalOpen(false)
        setCurrentPaymentReqs(null)
        setPaymentCallback(null)
      }
    }

    return (
      <div className="modal">
        <div className="modal-content">
          <h2>Payment Required</h2>
          {currentPaymentReqs && (
            <div>
              <p>{currentPaymentReqs.description}</p>
              <p>
                Amount:{' '}
                {parseInt(currentPaymentReqs.maxAmountRequired) /
                  Math.pow(10, currentPaymentReqs.extra?.decimals || 6)}{' '}
                {currentPaymentReqs.asset === '0' ? 'ALGO' : `ASA-${currentPaymentReqs.asset}`}
              </p>
            </div>
          )}
          <button onClick={handleConnect}>Connect Algorand Wallet</button>
          <button
            onClick={() => {
              setIsWalletModalOpen(false)
              setCurrentPaymentReqs(null)
              setPaymentCallback(null)
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return {
    x402Fetch,
    WalletConnectionModal,
    accountAddress,
    connectWallet,
    disconnectWallet: () => peraWallet.disconnect(),
  }
}
```

### Using the Enhanced Fetch in a Component

```tsx
// components/FetchExample.tsx

import { useEffect, useState } from 'react'
import { useX402AlgorandFetch } from './AlgorandFetch'

export default function FetchExample() {
  const { x402Fetch, WalletConnectionModal, accountAddress } = useX402AlgorandFetch()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (url: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await x402Fetch(url)

      if (response.ok) {
        const jsonData = await response.json()
        setData(jsonData)
      } else {
        setError(`Failed to fetch: ${response.statusText}`)
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>x402-fetch with Algorand Example</h2>

      {accountAddress && (
        <p>
          Wallet connected: {accountAddress.substring(0, 6)}...
          {accountAddress.substring(accountAddress.length - 4)}
        </p>
      )}

      <div className="buttons">
        <button onClick={() => fetchData('/api/public')}>Fetch Public Resource</button>
        <button onClick={() => fetchData('/api/protected')}>Fetch Protected Resource</button>
        <button onClick={() => fetchData('/api/premium-content')}>
          Fetch Premium Content (ASA)
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {error && <p className="error">{error}</p>}

      {data && (
        <div className="data">
          <h3>Response:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}

      {/* Render the wallet connection modal when needed */}
      <WalletConnectionModal />
    </div>
  )
}
```

## Complete Examples

### Integrating with a Web Application

```typescript
// index.ts

import { createX402Fetch } from 'x402-fetch'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { PeraWalletConnect } from '@perawallet/connect'

// Initialize components
const fetchButton = document.getElementById('fetchBtn') as HTMLButtonElement
const connectButton = document.getElementById('connectBtn') as HTMLButtonElement
const resultDiv = document.getElementById('result') as HTMLDivElement
const statusDiv = document.getElementById('status') as HTMLDivElement

// Initialize Pera Wallet
const peraWallet = new PeraWalletConnect()
let currentAccount: string | null = null

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

// Connect wallet
connectButton.addEventListener('click', async () => {
  try {
    statusDiv.textContent = 'Connecting...'

    // Try to reconnect first
    let accounts = await peraWallet.reconnectSession()

    // If no accounts, request connection
    if (!accounts || accounts.length === 0) {
      accounts = await peraWallet.connect()
    }

    if (accounts && accounts.length > 0) {
      currentAccount = accounts[0]
      statusDiv.textContent = `Connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(
        accounts[0].length - 4
      )}`
      connectButton.textContent = 'Disconnect'
      connectButton.onclick = () => {
        peraWallet.disconnect()
        currentAccount = null
        statusDiv.textContent = 'Disconnected'
        connectButton.textContent = 'Connect Wallet'
        connectButton.onclick = connectWallet
      }
    } else {
      statusDiv.textContent = 'No accounts found'
    }
  } catch (error) {
    console.error('Connection error:', error)
    statusDiv.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`
  }
})

// Create an enhanced fetch function with x402 payment capability
const x402Fetch = createX402Fetch({
  // Function to create a payment for a given payment requirement
  async createPayment(paymentRequirements, fetch) {
    if (
      paymentRequirements.scheme === 'exact' &&
      (paymentRequirements.network === 'algorand' ||
        paymentRequirements.network === 'algorand-testnet')
    ) {
      // If no wallet is connected, prompt the user
      if (!currentAccount) {
        statusDiv.textContent = 'Please connect your wallet'
        resultDiv.innerHTML = `
          <div class="payment-required">
            <h3>Payment Required</h3>
            <p>${paymentRequirements.description}</p>
            <p>Amount: ${
              parseInt(paymentRequirements.maxAmountRequired) /
              Math.pow(10, paymentRequirements.extra?.decimals || 6)
            } 
            ${paymentRequirements.asset === '0' ? 'ALGO' : `ASA-${paymentRequirements.asset}`}</p>
            <p>Connect your wallet to continue.</p>
          </div>
        `
        throw new Error('Wallet not connected')
      }

      // Create Algorand payment
      return await createAlgorandPayment(paymentRequirements, currentAccount)
    }

    // Fallback to default or other blockchain implementations
    throw new Error(
      `Unsupported payment scheme/network: ${paymentRequirements.scheme}/${paymentRequirements.network}`
    )
  },

  // Specify maximum number of retries for 402 responses
  maxRetries: 1,
})

// Function to create an Algorand payment
async function createAlgorandPayment(paymentRequirements, senderAddress) {
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

    // Show payment status
    statusDiv.textContent = 'Please sign the transaction in your wallet...'

    // Sign the transaction
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

    statusDiv.textContent = 'Transaction signed, submitting payment...'

    return paymentHeader
  } catch (error) {
    console.error('Error creating Algorand payment:', error)
    statusDiv.textContent = `Payment error: ${
      error instanceof Error ? error.message : String(error)
    }`
    throw error
  }
}

// Fetch protected resource
fetchButton.addEventListener('click', async () => {
  try {
    resultDiv.textContent = 'Loading...'
    statusDiv.textContent = 'Fetching resource...'

    const response = await x402Fetch('/api/protected')

    if (response.ok) {
      const data = await response.json()
      resultDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`
      statusDiv.textContent = 'Resource fetched successfully'
    } else {
      resultDiv.textContent = `Error: ${response.statusText}`
      statusDiv.textContent = `Failed with status: ${response.status}`
    }
  } catch (error) {
    console.error('Fetch error:', error)
    resultDiv.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`
    statusDiv.textContent = 'Failed to fetch resource'
  }
})
```

### HTML Integration

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>x402-fetch with Algorand Example</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }

      .container {
        border: 1px solid #ccc;
        padding: 20px;
        border-radius: 5px;
      }

      .buttons {
        margin: 20px 0;
      }

      button {
        padding: 10px 15px;
        margin-right: 10px;
        cursor: pointer;
      }

      #status {
        font-style: italic;
        margin: 10px 0;
      }

      #result {
        padding: 15px;
        background: #f5f5f5;
        border-radius: 3px;
        min-height: 100px;
      }

      .payment-required {
        background: #fff8e1;
        padding: 15px;
        border-left: 4px solid #ffb300;
      }

      pre {
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <h1>x402-fetch with Algorand</h1>

    <div class="container">
      <h2>Wallet Status</h2>
      <div id="status">Not connected</div>
      <button id="connectBtn">Connect Wallet</button>

      <h2>Fetch Example</h2>
      <div class="buttons">
        <button id="fetchBtn">Fetch Protected Resource</button>
      </div>

      <h2>Result</h2>
      <div id="result">Click the fetch button to load data</div>
    </div>

    <script src="bundle.js"></script>
  </body>
</html>
```
