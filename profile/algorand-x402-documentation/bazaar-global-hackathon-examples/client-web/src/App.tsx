import { useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { ExactAvmScheme } from "@x402/avm/exact/client";

const ALGORAND_TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";

// The paid endpoint — /my-api is proxied to the local server example by Vite.
const URL_TO_PAY = import.meta.env.VITE_RESOURCE_SERVER_URL || "/my-api";

export function App() {
  const { wallets, activeAddress, activeWallet, signTransactions } = useWallet();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const append = (line: string) => setLog((l) => [...l, line]);

  async function pay() {
    if (!activeAddress) return;
    setBusy(true);
    setLog([]);
    try {
      // Exactly as the guide instructs: the connected wallet IS the signer —
      // ClientAvmSigner = { address, signTransactions }, no keys in the app.
      const client = new x402Client().register(
        ALGORAND_TESTNET,
        new ExactAvmScheme({ address: activeAddress, signTransactions }),
      );

      const paidFetch = wrapFetchWithPayment(fetch, client);
      append(`→ requesting ${URL_TO_PAY} …`);
      const res = await paidFetch(URL_TO_PAY);
      append(`← ${res.status} ${res.statusText}`);
      append(`body: ${JSON.stringify(await res.json())}`);

      // The settle result comes back in the PAYMENT-RESPONSE header:
      const settle = new x402HTTPClient(client).getPaymentSettleResponse(
        (name) => res.headers.get(name),
      );
      append(`💰 payment response: ${JSON.stringify(settle, null, 2)}`);
      append(`   txn id: ${settle.transaction}`);
    } catch (err) {
      append(`❌ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ fontFamily: "monospace", maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>x402 web client — wallet as the signer</h1>
      <p>
        Pays <code>$0.01 USDC</code> (Algorand TestNet) for <code>{URL_TO_PAY}</code> through the
        GoPlausible facilitator. Gasless — the connected wallet only signs the USDC transfer.
      </p>

      {!activeAddress ? (
        <section>
          <h2>1 · Connect a wallet</h2>
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => wallet.connect()}
              style={{ display: "block", margin: "8px 0", padding: "8px 16px" }}
            >
              Connect {wallet.metadata.name}
            </button>
          ))}
        </section>
      ) : (
        <section>
          <p>
            Connected: <b>{activeAddress}</b>{" "}
            <button onClick={() => activeWallet?.disconnect()}>disconnect</button>
          </p>
          <h2>2 · Pay for the API</h2>
          <button onClick={pay} disabled={busy} style={{ padding: "10px 20px" }}>
            {busy ? "paying…" : "Pay $0.01 USDC → GET /my-api"}
          </button>
        </section>
      )}

      {log.length > 0 && (
        <pre style={{ background: "#111", color: "#8f8", padding: 12, whiteSpace: "pre-wrap" }}>
          {log.join("\n")}
        </pre>
      )}
    </main>
  );
}
