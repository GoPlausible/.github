import asyncio
import base64
import os

from dotenv import load_dotenv

load_dotenv()

from algosdk import encoding
from x402 import x402Client
from x402.http import x402HTTPClient
from x402.http.clients.httpx import x402HttpxClient
from x402.mechanisms.avm.exact.register import register_exact_avm_client


class PrivateKeySigner:
    """ClientAvmSigner implementation using a base64-encoded private key.

    Key format: 64 bytes = [32-byte seed][32-byte public key].
    """

    def __init__(self, private_key_b64: str):
        self._secret_key = base64.b64decode(private_key_b64)
        if len(self._secret_key) != 64:
            raise ValueError(f"Invalid key length: expected 64, got {len(self._secret_key)}")
        self._address = encoding.encode_address(self._secret_key[32:])
        # algosdk Transaction.sign() expects a base64 string private key
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
            # algosdk msgpack_decode expects a base64 string, msgpack_encode returns one
            txn_obj = encoding.msgpack_decode(base64.b64encode(txn_bytes).decode())
            signed = txn_obj.sign(self._signing_key)
            result.append(base64.b64decode(encoding.msgpack_encode(signed)))
        return result


signer = PrivateKeySigner(os.environ["AVM_PRIVATE_KEY"])
print("buyer account:", signer.address)

client = x402Client()
register_exact_avm_client(client, signer)

url = os.getenv("RESOURCE_URL", "http://localhost:4021/my-api")
print("→ requesting", url)


async def main() -> None:
    async with x402HttpxClient(client, base_url="http://localhost:4021") as http:
        res = await http.get(url)
        print("←", res.status_code)
        print("body:", (await res.aread()).decode())  # paid, verified, settled — one call

        # The settle result comes back in the PAYMENT-RESPONSE header:
        settle = x402HTTPClient(client).get_payment_settle_response(
            lambda name: res.headers.get(name)
        )
        print("💰 payment response:", settle.model_dump_json(indent=2))
        print("   txn id:", settle.transaction)


asyncio.run(main())
