#!/bin/bash

# Load environment variables
source ../.env.local

# Base Sepolia RPC
RPC_URL="https://sepolia.base.org"

echo "🚀 Deploying KaraokeProxy to Base Sepolia..."
echo "📍 RPC URL: $RPC_URL"
echo "👤 Deployer: $(cast wallet address --private-key $PRIVATE_KEY)"

# Deploy the proxy
forge script script/DeployProxy.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --verifier-url https://api-sepolia.basescan.org/api \
    --etherscan-api-key YZJQ7PBJA9DPQMXC5GFR3R3Y8PSMYVE1P7 \
    -vvv

echo "✅ Deployment complete!"