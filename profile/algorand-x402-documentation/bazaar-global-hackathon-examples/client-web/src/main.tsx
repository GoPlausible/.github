import "./polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { NetworkId, WalletId, WalletManager } from "@txnlab/use-wallet";
import { WalletProvider } from "@txnlab/use-wallet-react";
import { App } from "./App";

const manager = new WalletManager({
  // Lute needs no required options; the built-in TestNet network config
  // already carries the genesisId it uses during initialization.
  wallets: [WalletId.LUTE],
  defaultNetwork: NetworkId.TESTNET,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider manager={manager}>
      <App />
    </WalletProvider>
  </React.StrictMode>,
);
