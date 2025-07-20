#!/bin/bash

# Load environment variables
source ../.env.local

# Configuration
RPC_URL="https://sepolia.base.org"
PROXY_ADDRESS="0x9908f93A794297093fA0d235B51Ffbd86FDe8d08"
IMPLEMENTATION_ADDRESS="0xc7D24B90C69c6F389fbC673987239f62F0869e3a"  # Current KaraokeSchool

echo "🔧 Setting up proxy..."
echo "📍 Proxy: $PROXY_ADDRESS"
echo "📍 Implementation: $IMPLEMENTATION_ADDRESS"

# Set implementation
cast send $PROXY_ADDRESS \
    "upgradeImplementation(address)" \
    $IMPLEMENTATION_ADDRESS \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

echo "✅ Proxy setup complete!"

# Verify the setup
echo ""
echo "🔍 Verifying proxy setup..."
echo "Getting proxy info..."
cast call $PROXY_ADDRESS "getProxyInfo()" --rpc-url $RPC_URL

echo ""
echo "Testing hasUnlockedSong through proxy..."
cast call $PROXY_ADDRESS \
    "hasUnlockedSong(address,uint256)" \
    "0x0C6433789d14050aF47198B2751f6689731Ca79C" \
    "1" \
    --rpc-url $RPC_URL