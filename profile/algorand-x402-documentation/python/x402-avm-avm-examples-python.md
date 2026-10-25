# x402-avm V2 AVM Mechanism Examples (Python)

Comprehensive examples for the `x402-avm[avm]` Python package covering signer protocols, constants, utilities, transaction handling, and fee abstraction.

> **TypeScript examples**: See [x402-avm-avm-examples](../typescript/x402-avm-avm-examples.md) for TypeScript (`@x402/avm`) examples.

## Table of Contents

- [Installation](#installation)
- [Signer Protocols](#signer-protocols)
  - [ClientAvmSigner](#clientavmsigner)
  - [FacilitatorAvmSigner](#facilitatoravmsigner)
- [Client Signer Implementation](#client-signer-implementation)
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
  - [Security Validation](#security-validation)
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
- [Complete Example: FastAPI Facilitator Service](#complete-example-fastapi-facilitator-service)
- [algosdk Encoding Notes](#algosdk-encoding-notes)

---

## Installation

```bash
pip install "x402-avm[avm]"
```

This installs `py-algorand-sdk` (algosdk) as a dependency.

---

## Signer Protocols

Python uses Protocol classes (structural typing -- no inheritance required).

### ClientAvmSigner

```python
from x402.mechanisms.avm.signer import ClientAvmSigner

# Protocol definition:
class ClientAvmSigner(Protocol):
    @property
    def address(self) -> str:
        """58-character Algorand address."""
        ...

    def sign_transactions(
        self,
        unsigned_txns: list[bytes],
        indexes_to_sign: list[int],
    ) -> list[bytes | None]:
        """Sign specified transactions in a group.

        Args:
            unsigned_txns: List of unsigned transaction bytes (msgpack encoded).
            indexes_to_sign: Indexes of transactions this signer should sign.

        Returns:
            List parallel to unsigned_txns, with signed bytes at
            indexes_to_sign and None elsewhere.
        """
        ...
```

### FacilitatorAvmSigner

```python
from x402.mechanisms.avm.signer import FacilitatorAvmSigner

# Protocol definition:
class FacilitatorAvmSigner(Protocol):
    def get_addresses(self) -> list[str]:
        """Get all managed fee payer addresses."""
        ...

    def sign_transaction(
        self, txn_bytes: bytes, fee_payer: str, network: str,
    ) -> bytes:
        """Sign a single transaction with the fee payer's key."""
        ...

    def sign_group(
        self,
        group_bytes: list[bytes],
        fee_payer: str,
        indexes_to_sign: list[int],
        network: str,
    ) -> list[bytes]:
        """Sign specified transactions in a group."""
        ...

    def simulate_group(
        self, group_bytes: list[bytes], network: str,
    ) -> None:
        """Simulate a transaction group (raises on failure)."""
        ...

    def send_group(
        self, group_bytes: list[bytes], network: str,
    ) -> str:
        """Send a transaction group, returns txid."""
        ...

    def confirm_transaction(
        self, txid: str, network: str, rounds: int = 4,
    ) -> None:
        """Wait for transaction confirmation."""
        ...
```

---

## Client Signer Implementation

```python
import os
import base64
from x402.mechanisms.avm.signer import ClientAvmSigner
from algosdk import encoding


class PrivateKeySigner:
    """
    ClientAvmSigner implementation using a base64-encoded private key.

    Key format: 64 bytes = [32-byte seed][32-byte public key]
    algosdk expects base64-encoded 64-byte key for signing.
    """

    def __init__(self, private_key_b64: str):
        self._secret_key = base64.b64decode(private_key_b64)
        if len(self._secret_key) != 64:
            raise ValueError(
                f"Invalid key length: expected 64, got {len(self._secret_key)}"
            )
        self._address = encoding.encode_address(self._secret_key[32:])
        # algosdk.Transaction.sign() expects base64 string
        self._signing_key = base64.b64encode(self._secret_key).decode()

    @property
    def address(self) -> str:
        return self._address

    def sign_transactions(
        self,
        unsigned_txns: list[bytes],
        indexes_to_sign: list[int],
    ) -> list[bytes | None]:
        result: list[bytes | None] = []
        for i, txn_bytes in enumerate(unsigned_txns):
            if i not in indexes_to_sign:
                result.append(None)
                continue

            # IMPORTANT: algosdk.encoding.msgpack_decode expects base64 string
            b64_txn = base64.b64encode(txn_bytes).decode("utf-8")
            txn_obj = encoding.msgpack_decode(b64_txn)

            # Sign: Transaction.sign() expects base64 private key string
            signed_txn = txn_obj.sign(self._signing_key)

            # IMPORTANT: algosdk.encoding.msgpack_encode returns base64 string
            signed_b64 = encoding.msgpack_encode(signed_txn)
            signed_bytes = base64.b64decode(signed_b64)

            result.append(signed_bytes)
        return result


# Usage:
signer = PrivateKeySigner(os.environ["AVM_PRIVATE_KEY"])
print(f"Signer address: {signer.address}")
```

---

## Facilitator Signer Implementation

Complete, production-ready implementation.

```python
import base64
from x402.mechanisms.avm.signer import FacilitatorAvmSigner
from x402.mechanisms.avm.constants import (
    ALGORAND_TESTNET_CAIP2,
    ALGORAND_MAINNET_CAIP2,
    NETWORK_CONFIGS,
)
from algosdk import encoding, transaction
from algosdk.v2client import algod
from algosdk.v2client.models import SimulateRequest, SimulateRequestTransactionGroup


class AlgorandFacilitatorSigner:
    """
    Production FacilitatorAvmSigner implementation.

    Key encoding notes (algosdk v2.11.1):
    - msgpack_decode(s) expects base64 string, NOT raw bytes
    - msgpack_encode(obj) returns base64 string, NOT raw bytes
    - Transaction.sign(pk) expects base64 string private key
    - SDK protocol passes raw msgpack bytes between methods
    - Boundary: msgpack_decode(base64.b64encode(raw).decode()) for decode
    - Boundary: base64.b64decode(msgpack_encode(obj)) for encode
    """

    def __init__(self, private_key_b64: str, algod_url: str = "", algod_token: str = ""):
        self._secret_key = base64.b64decode(private_key_b64)
        self._address = encoding.encode_address(self._secret_key[32:])
        self._signing_key = base64.b64encode(self._secret_key).decode()

        # Create algod clients per network
        self._clients: dict[str, algod.AlgodClient] = {}
        if algod_url:
            # Use provided URL for all networks
            self._default_client = algod.AlgodClient(algod_token, algod_url)
        else:
            self._default_client = None

    def _get_client(self, network: str) -> algod.AlgodClient:
        if network not in self._clients:
            if self._default_client:
                self._clients[network] = self._default_client
            else:
                config = NETWORK_CONFIGS.get(network, {})
                url = config.get("algod_url", "https://testnet-api.algonode.cloud")
                self._clients[network] = algod.AlgodClient("", url)
        return self._clients[network]

    def get_addresses(self) -> list[str]:
        return [self._address]

    def sign_transaction(
        self, txn_bytes: bytes, fee_payer: str, network: str,
    ) -> bytes:
        """Sign a single transaction."""
        b64_txn = base64.b64encode(txn_bytes).decode("utf-8")
        txn_obj = encoding.msgpack_decode(b64_txn)
        signed = txn_obj.sign(self._signing_key)
        return base64.b64decode(encoding.msgpack_encode(signed))

    def sign_group(
        self,
        group_bytes: list[bytes],
        fee_payer: str,
        indexes_to_sign: list[int],
        network: str,
    ) -> list[bytes]:
        """Sign specified transactions in a group."""
        result = list(group_bytes)
        for i in indexes_to_sign:
            result[i] = self.sign_transaction(group_bytes[i], fee_payer, network)
        return result

    def simulate_group(self, group_bytes: list[bytes], network: str) -> None:
        """Simulate a transaction group.

        Key pattern: wrap unsigned transactions with SignedTransaction(txn, None)
        and use allow_empty_signatures=True.
        """
        client = self._get_client(network)
        stxns = []
        for txn_bytes in group_bytes:
            b64 = base64.b64encode(txn_bytes).decode("utf-8")
            obj = encoding.msgpack_decode(b64)
            if isinstance(obj, transaction.SignedTransaction):
                stxns.append(obj)
            elif isinstance(obj, transaction.Transaction):
                # Wrap unsigned with empty signature for simulation
                stxns.append(transaction.SignedTransaction(obj, None))
            else:
                stxns.append(obj)

        request = SimulateRequest(
            txn_groups=[
                SimulateRequestTransactionGroup(txns=stxns)
            ],
            allow_empty_signatures=True,
        )
        result = client.simulate_transactions(request)

        # Check for failures
        for group in result.get("txn-groups", []):
            if group.get("failure-message"):
                raise Exception(
                    f"Simulation failed: {group['failure-message']}"
                )

    def send_group(self, group_bytes: list[bytes], network: str) -> str:
        """Send a transaction group.

        Key pattern: use send_raw_transaction(base64.b64encode(b''.join(group_bytes)))
        to avoid decode/re-encode overhead.
        """
        client = self._get_client(network)
        raw = base64.b64encode(b"".join(group_bytes))
        return client.send_raw_transaction(raw)

    def confirm_transaction(
        self, txid: str, network: str, rounds: int = 4,
    ) -> None:
        """Wait for transaction confirmation.

        Algorand has instant finality -- once confirmed, it is permanent.
        """
        client = self._get_client(network)
        transaction.wait_for_confirmation(client, txid, rounds)


# Usage:
import os

signer = AlgorandFacilitatorSigner(
    private_key_b64=os.environ["AVM_PRIVATE_KEY"],
    algod_url="https://testnet-api.algonode.cloud",
)
print(f"Fee payer addresses: {signer.get_addresses()}")
```

---

## Constants

### Network Identifiers

```python
from x402.mechanisms.avm.constants import (
    # V2 CAIP-2 identifiers (see the note below for the value in each release)
    ALGORAND_MAINNET_CAIP2,     # "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k"
    ALGORAND_TESTNET_CAIP2,     # "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
    SUPPORTED_NETWORKS,          # [ALGORAND_MAINNET_CAIP2, ALGORAND_TESTNET_CAIP2]

    # Genesis hashes (full hash, as used in the transaction "gh" field)
    MAINNET_GENESIS_HASH,  # "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
    TESTNET_GENESIS_HASH,  # "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

    # V1 identifiers
    V1_NETWORKS,           # ["algorand-mainnet", "algorand-testnet"]
    V1_TO_V2_NETWORK_MAP,  # {"algorand-mainnet": ALGORAND_MAINNET_CAIP2, ...}
    V2_TO_V1_NETWORK_MAP,  # {ALGORAND_MAINNET_CAIP2: "algorand-mainnet", ...}
)
```

> **Network id values**: the canonical CAIP-2 ids shown above (`algorand:` + the first 32 characters of the URL-safe base64 genesis hash) are the constant values in x402-avm >= 2.0.3; 2.0.2 and earlier use the legacy full-hash form (`algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`, `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=`), which facilitator.goplausible.xyz still accepts during the transition. The 2.0.2 network helpers (`normalize_network`, `is_valid_network`, `get_network_config`, ...) only recognize the ids in `NETWORK_CONFIGS`, so always pass the package constants instead of hardcoded strings. During the transition, `https://facilitator.goplausible.xyz/supported` lists the canonical ids first and the legacy full-hash ids as well; both are accepted on `/verify` and `/settle`, and the legacy form will be switched off with notice.

### USDC Configuration

```python
from x402.mechanisms.avm.constants import (
    ALGORAND_TESTNET_CAIP2,
    USDC_MAINNET_ASA_ID,  # 31566704 (int)
    USDC_TESTNET_ASA_ID,  # 10458941 (int)
    DEFAULT_DECIMALS,      # 6
    NETWORK_CONFIGS,
)

# Look up USDC config by network
testnet_config = NETWORK_CONFIGS[ALGORAND_TESTNET_CAIP2]
usdc_info = testnet_config["default_asset"]
# {"asa_id": 10458941, "name": "USDC", "decimals": 6}
```

### Algod Endpoints

```python
from x402.mechanisms.avm.constants import (
    MAINNET_ALGOD_URL,        # env ALGOD_MAINNET_URL or AlgoNode
    TESTNET_ALGOD_URL,        # env ALGOD_TESTNET_URL or AlgoNode
    FALLBACK_ALGOD_MAINNET,   # "https://mainnet-api.algonode.cloud"
    FALLBACK_ALGOD_TESTNET,   # "https://testnet-api.algonode.cloud"
    MAINNET_INDEXER_URL,      # env or AlgoNode
    TESTNET_INDEXER_URL,      # env or AlgoNode
)
```

### Transaction Limits

```python
from x402.mechanisms.avm.constants import (
    MAX_GROUP_SIZE,      # 16
    MIN_TXN_FEE,         # 1000
    MAX_REASONABLE_FEE,  # 16000 -- cap on the fee payer transaction fee (MAX_GROUP_SIZE * MIN_TXN_FEE)
)
```

### Address Validation

```python
from x402.mechanisms.avm.constants import AVM_ADDRESS_REGEX
import re

is_valid = bool(re.match(AVM_ADDRESS_REGEX, some_address))
```

---

## Utility Functions

### Address Validation Utilities

```python
from x402.mechanisms.avm.utils import is_valid_address

is_valid_address("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ")
# => True (format and checksum are both checked)

is_valid_address("invalid")
# => False
```

### Amount Conversion

```python
from x402.mechanisms.avm.utils import to_atomic_amount, from_atomic_amount

# Decimal to atomic units
to_atomic_amount(1.50)     # => 1500000
to_atomic_amount(0.10)     # => 100000
to_atomic_amount(100.0)    # => 100000000
to_atomic_amount(0.000001) # => 1

# Atomic units to decimal
from_atomic_amount(1500000)   # => 1.5
from_atomic_amount(100000)    # => 0.1
from_atomic_amount(1)         # => 1e-06
from_atomic_amount(100000000) # => 100.0
```

### Transaction Encoding/Decoding

```python
from x402.mechanisms.avm.utils import (
    decode_transaction_bytes,
    decode_base64_transaction,
    decode_payment_group,
    encode_transaction_group,
)

# Decode raw bytes into DecodedTransactionInfo
info = decode_transaction_bytes(raw_txn_bytes)
print(info.type)         # "axfer" or "pay"
print(info.sender)       # Algorand address
print(info.fee)          # in microAlgos
print(info.is_signed)    # True/False
print(info.asset_amount) # for asset transfers
print(info.receiver)     # for payments

# Decode from base64 string
info = decode_base64_transaction(base64_txn_string)

# Decode a full payment group
group_info = decode_payment_group(
    payment_group=["base64txn1...", "base64txn2..."],
    payment_index=0,
)
print(group_info.transactions)   # list of DecodedTransactionInfo
print(group_info.group_id)       # base64 group ID
print(group_info.total_fee)      # sum of all fees
print(group_info.has_fee_payer)  # True if fee payer detected
print(group_info.fee_payer_index)

# Encode a list of raw bytes to base64 strings
encoded = encode_transaction_group([raw_bytes_1, raw_bytes_2])
# => ["base64str1", "base64str2"]
```

### Network Utilities

```python
from x402.mechanisms.avm import ALGORAND_MAINNET_CAIP2, ALGORAND_TESTNET_CAIP2
from x402.mechanisms.avm.utils import (
    normalize_network,
    is_valid_network,
    get_network_config,
    get_usdc_asa_id,
    get_genesis_hash,
    network_from_genesis_hash,
)

# Normalize to CAIP-2 (V1 names map to the package constants)
normalize_network("algorand-testnet")
# => ALGORAND_TESTNET_CAIP2 ("algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"; see the note under Network Identifiers)

normalize_network(ALGORAND_TESTNET_CAIP2)
# => ALGORAND_TESTNET_CAIP2 (no-op)

# Validate
is_valid_network("algorand-testnet")        # True
is_valid_network(ALGORAND_TESTNET_CAIP2)    # True
is_valid_network("some-unknown-network")    # False

# Get full config
config = get_network_config("algorand-testnet")
# {
#     "algod_url": "https://testnet-api.algonode.cloud",
#     "indexer_url": "https://testnet-idx.algonode.cloud",
#     "genesis_hash": "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
#     "genesis_id": "testnet-v1.0",
#     "default_asset": {"asa_id": 10458941, "name": "USDC", "decimals": 6},
# }

# Get USDC ASA ID
get_usdc_asa_id("algorand-testnet")  # 10458941
get_usdc_asa_id(ALGORAND_MAINNET_CAIP2)  # 31566704

# Genesis hash lookup (takes the full genesis hash)
get_genesis_hash(ALGORAND_TESTNET_CAIP2)
# => "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="

network_from_genesis_hash("SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=")
# => ALGORAND_TESTNET_CAIP2
```

### Security Validation

```python
from x402.mechanisms.avm.utils import (
    decode_transaction_bytes,
    validate_no_security_risks,
    validate_rekey_operations,
    validate_fee_payer_transaction,
    is_blocked_transaction_type,
)

# Per-transaction security checks (close-to, blocked types)
info = decode_transaction_bytes(txn_bytes)
error_code = validate_no_security_risks(info)
if error_code:
    raise ValueError(f"Security risk: {error_code}")

# Rekeys are checked at group level: only a balanced rekey-and-back pair is allowed
error_code = validate_rekey_operations([info])  # pass every decoded txn of the group
if error_code:
    raise ValueError(f"Security risk: {error_code}")

# Validate fee payer transaction
error_code = validate_fee_payer_transaction(info, expected_fee_payer="ABC...")
if error_code:
    raise ValueError(f"Invalid fee payer: {error_code}")

# Check blocked types
is_blocked_transaction_type("keyreg")  # True (key registration blocked)
is_blocked_transaction_type("axfer")   # False
is_blocked_transaction_type("pay")     # False
```

---

## Transaction Group Creation and Signing

### Simple Payment Group

```python
import base64
from algosdk import transaction, encoding
from algosdk.v2client import algod
from x402.mechanisms.avm.constants import (
    ALGORAND_TESTNET_CAIP2,
    USDC_TESTNET_ASA_ID,
    NETWORK_CONFIGS,
)


def create_simple_payment(
    sender: str,
    receiver: str,
    amount: int,
) -> list[bytes]:
    """Create a simple USDC transfer."""
    config = NETWORK_CONFIGS[ALGORAND_TESTNET_CAIP2]
    client = algod.AlgodClient("", config["algod_url"])
    params = client.suggested_params()

    txn = transaction.AssetTransferTxn(
        sender=sender,
        sp=params,
        receiver=receiver,
        amt=amount,
        index=USDC_TESTNET_ASA_ID,
    )

    # Return raw msgpack bytes
    return [base64.b64decode(encoding.msgpack_encode(txn))]
```

### Fee-Abstracted Payment Group

```python
import base64
from algosdk import transaction, encoding
from algosdk.v2client import algod
from x402.mechanisms.avm.constants import (
    ALGORAND_TESTNET_CAIP2,
    USDC_TESTNET_ASA_ID,
    MIN_TXN_FEE,
    NETWORK_CONFIGS,
)
from x402.mechanisms.avm.utils import encode_transaction_group


def create_fee_abstracted_payment(
    sender: str,
    receiver: str,
    fee_payer: str,
    amount: int,
) -> dict:
    """Create a fee-abstracted USDC transfer (2-txn atomic group).

    Same layout as ExactAvmScheme builds it:
    [0] fee payer self-payment (left unsigned), [1] USDC transfer (paymentIndex = 1).
    """
    config = NETWORK_CONFIGS[ALGORAND_TESTNET_CAIP2]
    client = algod.AlgodClient("", config["algod_url"])
    params = client.suggested_params()

    # Transaction 0: Fee payer (self-payment, covers both fees)
    fee_params = transaction.SuggestedParams(
        fee=MIN_TXN_FEE * 2,  # 2000 microAlgos for 2 transactions
        first=params.first,
        last=params.last,
        gh=params.gh,
        gen=params.gen,
        flat_fee=True,
    )
    fee_payer_txn = transaction.PaymentTxn(
        sender=fee_payer,
        sp=fee_params,
        receiver=fee_payer,  # Self-payment
        amt=0,               # No value transfer
    )

    # Transaction 1: USDC transfer (fee = 0)
    payment_params = transaction.SuggestedParams(
        fee=0,
        first=params.first,
        last=params.last,
        gh=params.gh,
        gen=params.gen,
        flat_fee=True,
    )
    payment_txn = transaction.AssetTransferTxn(
        sender=sender,
        sp=payment_params,
        receiver=receiver,
        amt=amount,
        index=USDC_TESTNET_ASA_ID,
    )

    # Assign group ID
    gid = transaction.calculate_group_id([fee_payer_txn, payment_txn])
    fee_payer_txn.group = gid
    payment_txn.group = gid

    # Encode to bytes
    fee_payer_bytes = base64.b64decode(encoding.msgpack_encode(fee_payer_txn))
    payment_bytes = base64.b64decode(encoding.msgpack_encode(payment_txn))

    # The client still signs rawBytes[1] (ClientAvmSigner.sign_transactions with
    # indexes_to_sign=[1]) before sending; rawBytes[0] stays unsigned for the facilitator.
    return {
        "paymentGroup": encode_transaction_group([fee_payer_bytes, payment_bytes]),
        "paymentIndex": 1,
        "rawBytes": [fee_payer_bytes, payment_bytes],
    }
```

---

## Fee Abstraction Setup

### How Fee Abstraction Works

In x402-avm, fee abstraction allows the **facilitator** to pay transaction fees on behalf of the client. This works through Algorand's **atomic transaction groups** and **pooled fees**.

**Flow:**

1. The server's 402 `PaymentRequirements` carry the facilitator's fee payer address in `extra.feePayer` (taken from the facilitator's `/supported` response)
2. Client creates a 2-transaction atomic group:
   - Transaction 0: Self-payment by the fee payer, amount 0, note `x402-fee-payer-<time_ns>`, flat pooled fee of min fee x 2 (covers both transactions)
   - Transaction 1: USDC transfer from client to `payTo`, fee 0, note `x402-payment-<time_ns>`
3. Client signs Transaction 1 (their USDC transfer)
4. Transaction 0 is left unsigned (for the facilitator to sign)
5. Client sends both in the `paymentGroup` array with `paymentIndex: 1`
6. Facilitator verifies, signs Transaction 0, simulates, submits the atomic group, and waits for confirmation before reporting settlement

**Security guarantees:**
- Fee payer transaction is validated to be a self-payment with amount=0
- No close-to, no unbalanced rekey, no `keyreg` transactions
- Fee payer transaction fee is capped (`MAX_REASONABLE_FEE` = 16,000 microAlgos in x402-avm 2.0.2)
- Atomic group ensures all-or-nothing execution

### Client-Side Fee Abstraction

```python
import asyncio
import os

from x402 import x402Client
from x402.http.clients import x402HttpxClient
from x402.mechanisms.avm.exact import register_exact_avm_client

# Fee abstraction is automatic in the ExactAvmScheme
# The client only needs to provide a signer (PrivateKeySigner from above)

signer = PrivateKeySigner(os.environ["AVM_PRIVATE_KEY"])
client = x402Client()
register_exact_avm_client(client, signer)

# When PaymentRequirements include extra.feePayer, the scheme handles everything:
# - Creates the 2-txn atomic group [fee payer txn, USDC transfer]
# - Signs only the client's payment transaction
# - Leaves the fee payer transaction unsigned for the facilitator


async def main() -> None:
    # Settlement waits for on-chain confirmation (~3-6 s end to end), so raise
    # httpx's 5 s default timeout.
    async with x402HttpxClient(client, timeout=30.0) as http:
        response = await http.get("https://api.example.com/paid-resource")
        print(response.status_code, response.headers.get("PAYMENT-RESPONSE"))


asyncio.run(main())
```

---

## ExactAvmScheme Registration

### Client Registration

```python
from x402 import x402Client
from x402.mechanisms.avm.exact import register_exact_avm_client

client = x402Client()
register_exact_avm_client(client, signer)
```

### Server Registration

```python
from x402 import x402ResourceServer
from x402.http import FacilitatorConfig, HTTPFacilitatorClient
from x402.mechanisms.avm.exact import register_exact_avm_server

facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(url="https://facilitator.goplausible.xyz")
)
server = x402ResourceServer(facilitator)
register_exact_avm_server(server)  # registers "algorand:*" (or pass networks=[...])
```

### Facilitator Registration

```python
from x402 import x402Facilitator
from x402.mechanisms.avm.exact import register_exact_avm_facilitator
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2

facilitator = x402Facilitator()

# Single network
register_exact_avm_facilitator(
    facilitator, signer, networks=[ALGORAND_TESTNET_CAIP2]
)

# Multiple networks
register_exact_avm_facilitator(
    facilitator, signer, networks=[ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2]
)
```

---

## Complete Example: FastAPI Facilitator Service

```python
# facilitator_service.py
import os
import base64
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from x402 import x402Facilitator
from x402.mechanisms.avm.exact import register_exact_avm_facilitator
from x402.mechanisms.avm import ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2
from x402.mechanisms.avm.constants import NETWORK_CONFIGS
from x402.schemas import parse_payment_payload, parse_payment_requirements
from algosdk import encoding, transaction
from algosdk.v2client import algod
from algosdk.v2client.models import SimulateRequest, SimulateRequestTransactionGroup

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Facilitator service started")
    print(f"Fee payer address: {ADDRESS}")
    print("Networks: Testnet + Mainnet")
    yield


app = FastAPI(title="x402-avm Facilitator Service", lifespan=lifespan)

# Build signer
SECRET_KEY = base64.b64decode(os.environ["AVM_PRIVATE_KEY"])
ADDRESS = encoding.encode_address(SECRET_KEY[32:])
SIGNING_KEY = base64.b64encode(SECRET_KEY).decode()


class FacilitatorSigner:
    def __init__(self):
        self._clients: dict[str, algod.AlgodClient] = {}

    def _client(self, network: str) -> algod.AlgodClient:
        if network not in self._clients:
            config = NETWORK_CONFIGS.get(network, {})
            url = config.get("algod_url", "https://testnet-api.algonode.cloud")
            self._clients[network] = algod.AlgodClient("", url)
        return self._clients[network]

    def get_addresses(self) -> list[str]:
        return [ADDRESS]

    def sign_transaction(self, txn_bytes: bytes, fee_payer: str, network: str) -> bytes:
        b64 = base64.b64encode(txn_bytes).decode()
        txn_obj = encoding.msgpack_decode(b64)
        signed = txn_obj.sign(SIGNING_KEY)
        return base64.b64decode(encoding.msgpack_encode(signed))

    def sign_group(self, group_bytes, fee_payer, indexes, network):
        result = list(group_bytes)
        for i in indexes:
            result[i] = self.sign_transaction(group_bytes[i], fee_payer, network)
        return result

    def simulate_group(self, group_bytes, network):
        client = self._client(network)
        stxns = []
        for txn_bytes in group_bytes:
            b64 = base64.b64encode(txn_bytes).decode()
            obj = encoding.msgpack_decode(b64)
            if isinstance(obj, transaction.SignedTransaction):
                stxns.append(obj)
            else:
                stxns.append(transaction.SignedTransaction(obj, None))
        req = SimulateRequest(
            txn_groups=[SimulateRequestTransactionGroup(txns=stxns)],
            allow_empty_signatures=True,
        )
        result = client.simulate_transactions(req)
        for group in result.get("txn-groups", []):
            if group.get("failure-message"):
                raise Exception(f"Simulation failed: {group['failure-message']}")

    def send_group(self, group_bytes, network):
        client = self._client(network)
        return client.send_raw_transaction(
            base64.b64encode(b"".join(group_bytes))
        )

    def confirm_transaction(self, txid, network, rounds=4):
        client = self._client(network)
        transaction.wait_for_confirmation(client, txid, rounds)


# Initialize facilitator
signer = FacilitatorSigner()
facilitator = x402Facilitator()
register_exact_avm_facilitator(
    facilitator,
    signer,
    networks=[ALGORAND_TESTNET_CAIP2, ALGORAND_MAINNET_CAIP2],
)


@app.get("/supported")
async def supported():
    return facilitator.get_supported().model_dump(by_alias=True, exclude_none=True)


# Request body (x402 V2): {"x402Version": 2, "paymentPayload": {...}, "paymentRequirements": {...}}
@app.post("/verify")
async def verify(request: Request):
    body = await request.json()
    try:
        payload = parse_payment_payload(body["paymentPayload"])
        requirements = parse_payment_requirements(
            payload.x402_version, body["paymentRequirements"]
        )
        result = await facilitator.verify(payload, requirements)
        return result.model_dump(by_alias=True, exclude_none=True)
    except Exception as e:
        return JSONResponse(
            status_code=400, content={"error": str(e)}
        )


@app.post("/settle")
async def settle(request: Request):
    body = await request.json()
    try:
        payload = parse_payment_payload(body["paymentPayload"])
        requirements = parse_payment_requirements(
            payload.x402_version, body["paymentRequirements"]
        )
        # Returns after the group is confirmed on-chain (instant finality)
        result = await facilitator.settle(payload, requirements)
        return result.model_dump(by_alias=True, exclude_none=True)
    except Exception as e:
        return JSONResponse(
            status_code=400, content={"error": str(e)}
        )


# Run: uvicorn facilitator_service:app --port 4000
```

---

## algosdk Encoding Notes

The Python `algosdk` (v2.11.1) has different encoding conventions than the TypeScript `@x402/avm` package, which is built on `@algorandfoundation/algokit-utils` v10 (not algosdk). This is the most common source of bugs:

| Operation | Python algosdk | TypeScript (`@x402/avm`, algokit-utils v10) |
|-----------|---------------|-------------------|
| `msgpack_decode(s)` | Expects **base64 string** | N/A (uses `decodeTransaction(Uint8Array)` / `decodeSignedTransaction(Uint8Array)` from `@algorandfoundation/algokit-utils/transact`) |
| `msgpack_encode(obj)` | Returns **base64 string** | N/A (uses `encodeTransactionRaw(txn)` returning `Uint8Array`) |
| `Transaction.sign(key)` | Expects **base64 string** key | Signer from `toClientAvmSigner(privateKeyBase64)` / `toFacilitatorAvmSigner(...)` (algokit-utils `generateAddressWithSigners`) |
| SDK protocol | Passes **raw msgpack bytes** | Passes **raw `Uint8Array`** |

**Boundary conversion patterns:**

```python
import base64
from algosdk import encoding

# Raw bytes → algosdk object (DECODE)
raw_bytes: bytes = ...
b64_string = base64.b64encode(raw_bytes).decode("utf-8")
txn_obj = encoding.msgpack_decode(b64_string)

# algosdk object → raw bytes (ENCODE)
b64_string = encoding.msgpack_encode(txn_obj)
raw_bytes = base64.b64decode(b64_string)
```

---

## Summary

| Feature | Import / Usage |
|---------|---------------|
| Package | `x402-avm[avm]` (`pip install "x402-avm[avm]"`) |
| Client Signer | `ClientAvmSigner` Protocol |
| Facilitator Signer | `FacilitatorAvmSigner` Protocol |
| Network Constants | `ALGORAND_TESTNET_CAIP2`, `ALGORAND_MAINNET_CAIP2` (use the constants, never literals) |
| USDC Config | `NETWORK_CONFIGS[network]["default_asset"]` |
| Address Validation | `is_valid_address(addr)` |
| Amount Conversion | `to_atomic_amount(1.5)` |
| Algod Client | `algod.AlgodClient("", url)` |
| Encode Txn | `base64.b64encode(bytes).decode()` |
| Decode Txn | `decode_transaction_bytes(raw)` |
| algosdk Encoding | `msgpack_decode` expects base64 string |
