import { WEB3AUTH_NETWORK } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";
import { base, baseSepolia, optimismSepolia } from "wagmi/chains";

const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "YOUR_WEB3AUTH_CLIENT_ID"; // get from https://dashboard.web3auth.io

// Fix blockExplorerUrl to be an array as Web3Auth expects
const baseMainnetFixed = {
  ...base,
  blockExplorers: {
    ...base.blockExplorers,
    default: {
      ...base.blockExplorers?.default,
      url: [base.blockExplorers?.default.url || "https://basescan.org"] // Make it an array
    }
  }
};

const baseSepoliaFixed = {
  ...baseSepolia,
  blockExplorers: {
    ...baseSepolia.blockExplorers,
    default: {
      ...baseSepolia.blockExplorers?.default,
      url: [baseSepolia.blockExplorers?.default.url || "https://sepolia.basescan.org"] // Make it an array
    }
  }
};

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET, // Must match your Web3Auth dashboard setting
    // Default to Base mainnet
    chainConfig: {
      chainNamespace: "eip155",
      chainId: "0x2105", // Base mainnet in hex (8453)
      rpcTarget: "https://mainnet.base.org",
      displayName: "Base",
      blockExplorerUrl: "https://basescan.org",
      ticker: "ETH",
      tickerName: "Ethereum",
    },
    uiConfig: {
      appName: "Karaoke Quest",
      appUrl: window.location.origin,
      theme: "dark",
      loginMethodsOrder: ["google", "twitter", "discord", "github"],
    },
  },
  // Wagmi configuration - include both mainnet and testnet
  chains: [baseMainnetFixed, baseSepoliaFixed, optimismSepolia],
};

export default web3AuthContextConfig;