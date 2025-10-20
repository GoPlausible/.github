# x402-axios with Algorand (AVM) Examples

This document provides examples of how to use the x402-axios package with Algorand (AVM).

## Table of Contents

- [Basic Setup](#basic-setup)
- [Client-Side Implementation](#client-side-implementation)
- [Complete Examples](#complete-examples)

## Basic Setup

First, you need to install the required packages:

```bash
npm install x402-avm x402-avm-axios @algorand/algosdk
```

## Client-Side Implementation

### Basic Usage

```typescript
import axios from 'axios'
import { createX402Axios } from 'x402-avm-axios'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { PeraWalletConnect } from '@perawallet/connect'

// Initialize Pera Wallet
const peraWallet = new PeraWalletConnect()

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

// Create an enhanced axios instance with x402 payment capability
const x402Axios = createX402Axios(axios, {
  // Function to create a payment for a given payment requirement
  async createPayment(paymentRequirements, axiosInstance) {
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
    // Connect to wallet if needed
    let accounts = await peraWallet.reconnectSession()

    if (!accounts || accounts.length === 0) {
      accounts = await peraWallet.connect()
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available in wallet')
    }

    const senderAddress = accounts[0]

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do()

    // Determine if this is an ALGO payment or ASA transfer
    const isASA = paymentRequirements.asset && paymentRequirements.asset !== '0'

    // Parse amount
    const amount = Number(paymentRequirements.maxAmountRequired)

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
        assetIndex: Number(paymentRequirements.asset),
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
    console.error('Error creating Algorand payment:', error)
    throw error
  }
}

// Now you can use x402Axios just like regular axios
async function fetchProtectedResource() {
  try {
    const response = await x402Axios.get('https://example.com/api/protected')
    console.log('Fetched data:', response.data)
    return response.data
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}
```

### Creating a Custom x402Axios Instance

```typescript
import axios from 'axios'
import { createX402Axios } from 'x402-avm-axios'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { PeraWalletConnect } from '@perawallet/connect'

// Create a custom Axios instance with base configuration
const baseAxios = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
})

// Initialize Pera Wallet
const peraWallet = new PeraWalletConnect()

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

// Create an Algorand payment creation function
async function createAlgorandPayment(paymentRequirements) {
  // Implementation as shown in the previous example
  try {
    // Connect to wallet if needed
    let accounts = await peraWallet.reconnectSession()

    if (!accounts || accounts.length === 0) {
      accounts = await peraWallet.connect()
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available in wallet')
    }

    const senderAddress = accounts[0]

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do()

    // Determine if this is an ALGO payment or ASA transfer
    const isASA = paymentRequirements.asset && paymentRequirements.asset !== '0'

    // Parse amount
    const amount = Number(paymentRequirements.maxAmountRequired)

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
        assetIndex: Number(paymentRequirements.asset),
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
    console.error('Error creating Algorand payment:', error)
    throw error
  }
}

// Create an enhanced axios instance with x402 payment capability
const x402Axios = createX402Axios(baseAxios, {
  async createPayment(paymentRequirements, axiosInstance) {
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

export { x402Axios }
```

### React Component for x402-axios with Algorand

```tsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { createX402Axios } from 'x402-avm-axios'
import { PeraWalletConnect } from '@perawallet/connect'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

// Initialize Pera Wallet
const peraWallet = new PeraWalletConnect()

// Component to manage Algorand wallet and x402 payments
export function AlgorandAxiosComponent() {
  const [accountAddress, setAccountAddress] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

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
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error)
    }
  }

  // Create an Algorand payment function
  const createAlgorandPayment = async (paymentRequirements: any) => {
    try {
      if (!accountAddress) {
        throw new Error('No wallet connected')
      }

      // Get transaction parameters
      const params = await algodClient.getTransactionParams().do()

      // Determine if this is an ALGO payment or ASA transfer
      const isASA = paymentRequirements.asset && paymentRequirements.asset !== '0'

      // Parse amount
      const amount = Number(paymentRequirements.maxAmountRequired)

      // Create transaction lease from payment requirements hash
      const paymentReqHash = sha256(JSON.stringify(paymentRequirements))
      const lease = new Uint8Array(Buffer.from(paymentReqHash, 'hex'))

      let transaction

      if (isASA) {
        // ASA transfer transaction
        transaction = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: accountAddress,
          to: paymentRequirements.payTo,
          amount,
          assetIndex: Number(paymentRequirements.asset),
          suggestedParams: params,
          lease,
        })
      } else {
        // ALGO payment transaction
        transaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          from: accountAddress,
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
        [{ txn: txnBytes, signers: [accountAddress] }],
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

  // Create an enhanced axios instance with x402 payment capability
  const x402Axios = createX402Axios(axios, {
    async createPayment(paymentRequirements, axiosInstance) {
      if (
        paymentRequirements.scheme === 'exact' &&
        (paymentRequirements.network === 'algorand' ||
          paymentRequirements.network === 'algorand-testnet')
      ) {
        // If not connected, prompt to connect
        if (!accountAddress) {
          // Set error message
          setError('Please connect your wallet to make a payment')
          throw new Error('Wallet not connected')
        }

        return await createAlgorandPayment(paymentRequirements)
      }

      throw new Error(
        `Unsupported payment scheme/network: ${paymentRequirements.scheme}/${paymentRequirements.network}`
      )
    },
    maxRetries: 1,
  })

  // Function to fetch protected resource
  const fetchProtectedResource = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await x402Axios.get('/api/protected')
      setData(response.data)
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="algorand-axios-component">
      <h2>x402-axios with Algorand Example</h2>

      {/* Wallet Connection */}
      <div className="wallet-section">
        {accountAddress ? (
          <div>
            <p>
              Wallet Connected: {accountAddress.substring(0, 6)}...
              {accountAddress.substring(accountAddress.length - 4)}
            </p>
            <button onClick={() => peraWallet.disconnect()}>Disconnect</button>
          </div>
        ) : (
          <div>
            <p>No wallet connected</p>
            <button onClick={connectWallet}>Connect Wallet</button>
          </div>
        )}
      </div>

      {/* Request Section */}
      <div className="request-section">
        <h3>Make Protected Request</h3>
        <button onClick={fetchProtectedResource} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Protected Resource'}
        </button>
      </div>

      {/* Result Section */}
      {error && <div className="error">{error}</div>}

      {data && (
        <div className="result">
          <h3>Response Data:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
```

## Complete Examples

### Full Integration with Configuration

```typescript
// utils/algorandX402.ts

import axios, { AxiosRequestConfig } from 'axios'
import { createX402Axios } from 'x402-avm-axios'
import algosdk from '@algorand/algosdk'
import { sha256 } from 'js-sha256'
import { PeraWalletConnect } from '@perawallet/connect'

// Initialize Pera Wallet
const peraWallet = new PeraWalletConnect()

// Initialize Algorand client
const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')

// Track wallet connection state
let currentAccount: string | null = null

// Connect wallet function
export async function connectWallet(): Promise<string | null> {
  try {
    // Try to reconnect first
    let accounts = await peraWallet.reconnectSession()

    // If no accounts, request connection
    if (!accounts || accounts.length === 0) {
      accounts = await peraWallet.connect()
    }

    if (accounts && accounts.length > 0) {
      currentAccount = accounts[0]
      return accounts[0]
    }

    return null
  } catch (error) {
    console.error('Connection error:', error)
    return null
  }
}

// Disconnect wallet function
export function disconnectWallet(): void {
  peraWallet.disconnect()
  currentAccount = null
}

// Get current wallet account
export function getCurrentAccount(): string | null {
  return currentAccount
}

// Function to create an Algorand payment
async function createAlgorandPayment(paymentRequirements: any): Promise<any> {
  try {
    // If no wallet is connected, connect it
    if (!currentAccount) {
      const account = await connectWallet()
      if (!account) {
        throw new Error('Failed to connect wallet')
      }
    }

    const senderAddress = currentAccount as string

    // Get transaction parameters
    const params = await algodClient.getTransactionParams().do()

    // Determine if this is an ALGO payment or ASA transfer
    const isASA = paymentRequirements.asset && paymentRequirements.asset !== '0'

    // Parse amount
    const amount = Number(paymentRequirements.maxAmountRequired)

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
        assetIndex: Number(paymentRequirements.asset),
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
    console.error('Error creating Algorand payment:', error)
    throw error
  }
}

// Create a global axios instance
const baseAxiosInstance = axios.create({
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
})

// Create x402 enhanced Axios instance
export const algorandX402Axios = createX402Axios(baseAxiosInstance, {
  async createPayment(paymentRequirements, axiosInstance) {
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

// Factory function to create configured x402Axios instances
export function createConfiguredX402Axios(config?: AxiosRequestConfig) {
  const customAxios = axios.create({
    ...config,
    baseURL: config?.baseURL || process.env.API_BASE_URL || 'http://localhost:3000',
  })

  return createX402Axios(customAxios, {
    async createPayment(paymentRequirements, axiosInstance) {
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
}
```

### Using the Configured x402-axios with Algorand

```typescript
// examples/usageExample.ts

import {
  algorandX402Axios,
  connectWallet,
  disconnectWallet,
  getCurrentAccount,
  createConfiguredX402Axios,
} from './utils/algorandX402'

// Example of using the pre-configured instance
async function fetchProtectedResource() {
  try {
    // Make sure wallet is connected
    if (!getCurrentAccount()) {
      console.log('Connecting wallet...')
      const account = await connectWallet()
      if (account) {
        console.log(
          `Wallet connected: ${account.substring(0, 6)}...${account.substring(account.length - 4)}`
        )
      } else {
        console.error('Failed to connect wallet')
        return
      }
    }

    // Make request to protected resource
    console.log('Fetching protected resource...')
    const response = await algorandX402Axios.get('/api/protected')
    console.log('Response:', response.data)
  } catch (error) {
    console.error('Error fetching resource:', error)
  }
}

// Example of creating and using a custom instance
async function fetchWithCustomConfig() {
  // Create custom configured instance
  const customX402Axios = createConfiguredX402Axios({
    baseURL: 'https://api.example.com',
    timeout: 5000,
    headers: {
      'Custom-Header': 'CustomValue',
    },
  })

  try {
    // Make sure wallet is connected
    if (!getCurrentAccount()) {
      await connectWallet()
    }

    // Make request to protected resource with custom config
    const response = await customX402Axios.get('/api/premium')
    console.log('Custom response:', response.data)
  } catch (error) {
    console.error('Error with custom fetch:', error)
  }
}

// Example of POST request with data
async function postToProtectedResource(data: any) {
  try {
    // Make sure wallet is connected
    if (!getCurrentAccount()) {
      await connectWallet()
    }

    // Make POST request to protected resource
    const response = await algorandX402Axios.post('/api/protected/submit', data)
    console.log('POST response:', response.data)
    return response.data
  } catch (error) {
    console.error('Error posting to resource:', error)
    throw error
  }
}

// Run examples
async function runExamples() {
  try {
    // Example 1: Basic GET request
    await fetchProtectedResource()

    // Example 2: Custom instance
    await fetchWithCustomConfig()

    // Example 3: POST request with data
    const postData = { message: 'Hello from x402-axios with Algorand!' }
    await postToProtectedResource(postData)

    // Disconnect wallet when done
    disconnectWallet()
    console.log('Wallet disconnected')
  } catch (error) {
    console.error('Example execution error:', error)
  }
}

// Run the examples
runExamples()
```

### React Integration Example

```tsx
// components/ProtectedDataFetcher.tsx

import React, { useState, useEffect } from 'react'
import { algorandX402Axios, connectWallet, disconnectWallet, getCurrentAccount } from '../utils/algorandX402'

interface ProtectedDataFetcherProps {
  endpoint: string
}

export const ProtectedDataFetcher: React.FC<ProtectedDataFetcherProps> = ({ endpoint }) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<string | null>(getCurrentAccount())

  // Reconnect wallet on component mount
  useEffect(() => {
    if (!account) {
      connectWallet().then((newAccount) => {
        setAccount(newAccount)
      })
    }

    // Cleanup
    return () => {
      // Don't disconnect wallet on component unmount
      // as it might be used by other components
    }
  }, [])

  // Handle wallet connection
  const handleConnect = async () => {
    setLoading(true)
    try {
      const newAccount = await connectWallet()
      setAccount(newAccount)
      setError(null)
    } catch (err) {
      setError(`Connection error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnectWallet()
    setAccount(null)
  }
```
