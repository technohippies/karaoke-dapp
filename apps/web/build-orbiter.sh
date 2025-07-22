#!/bin/bash

# Orbiter-specific production build script
# This ensures production env vars are used since Orbiter doesn't support env vars

echo "🚀 Building for Orbiter deployment (production)..."

# Export all production environment variables
export VITE_WEB3AUTH_CLIENT_ID=BMcb3LGQcwuitzN2W9i70c_nZPFsWEzIMXw5xhYW7fbgob30JxkF4Fc6fWfwSuIv1HkkNKgCgMBLpjKd0JGYOKY
export VITE_WEB3AUTH_NETWORK=sapphire_mainnet
export VITE_DEFAULT_CHAIN_ID=8453
export VITE_NETWORK_NAME=base-mainnet
export VITE_KARAOKE_CONTRACT=0x06AC258d391A5B2B6660d8d5Dee97507591376D0
export VITE_BASE_MAINNET_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
export VITE_TABLELAND_CHAIN_ID=8453
export VITE_SONGS_TABLE_NAME=karaoke_songs_8453_8453_25
export VITE_BASE_MAINNET_RPC_URL=https://mainnet.base.org
export VITE_ENABLE_TESTNET_FEATURES=false

# Run the build with production env vars
echo "📦 Running production build..."
npm run build

echo "✅ Orbiter production build complete!"
echo "📝 Next step: Run 'npx orbiter deploy' to deploy"