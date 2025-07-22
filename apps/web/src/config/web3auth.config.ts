import { WEB3AUTH_NETWORK } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";
import { base, baseSepolia, optimismSepolia } from "wagmi/chains";

const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID || "YOUR_WEB3AUTH_CLIENT_ID"; // get from https://dashboard.web3auth.io
const networkName = import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_devnet";

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

// Map network name to Web3Auth network constant
const getWeb3AuthNetwork = (network: string) => {
  switch (network.toUpperCase()) {
    case "SAPPHIRE_MAINNET":
      return WEB3AUTH_NETWORK.SAPPHIRE_MAINNET;
    case "SAPPHIRE_DEVNET":
      return WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;
    default:
      return WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;
  }
};

// Debug logging
console.log('🔐 Web3Auth Config:', {
  clientId: clientId.substring(0, 10) + '...',
  networkName,
  network: getWeb3AuthNetwork(networkName)
});

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: getWeb3AuthNetwork(networkName),
    uiConfig: {
      appName: "Karaoke Quest", 
      appUrl: window.location.origin,
      theme: {
        primary: "#768729"
      },
      loginMethodsOrder: ["google", "twitter", "discord", "github"],
    },
  },
};

export default web3AuthContextConfig;

// Export chains for wagmi configuration separately
export const supportedChains = [baseMainnetFixed, baseSepoliaFixed, optimismSepolia];