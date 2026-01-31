import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StellarWalletProvider } from "./utils/stellar-wallet";
import App from "./App";
import "./index.css";

// Create QueryClient for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Render app with TanStack Query and Stellar Wallet providers
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <StellarWalletProvider>
        <App />
      </StellarWalletProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
