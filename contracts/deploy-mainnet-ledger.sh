#!/bin/bash

# Base Mainnet configuration
CHAIN_ID=8453
RPC_URL="https://mainnet.base.org"

echo "🚀 Deploying KaraokeSchool to Base Mainnet with Ledger..."
echo "📍 RPC URL: $RPC_URL"
echo "🔗 Chain ID: $CHAIN_ID"
echo ""
echo "⚠️  IMPORTANT: Make sure your Ledger is:"
echo "   - Connected and unlocked"
echo "   - Ethereum app is open"
echo "   - Blind signing is enabled (if needed)"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Get the Ledger address
echo "🔍 Detecting Ledger address..."
LEDGER_ADDRESS=$(cast wallet address --ledger)
echo "📍 Ledger address: $LEDGER_ADDRESS"

# Check balance
BALANCE=$(cast balance $LEDGER_ADDRESS --rpc-url $RPC_URL)
echo "💰 Balance: $BALANCE ETH"

echo ""
echo "📋 Deployment will:"
echo "   1. Deploy KaraokeSchoolV2 implementation"
echo "   2. Deploy KaraokeProxy"
echo "   3. Set implementation in proxy"
echo "   4. Initialize implementation"
echo ""
echo "Press Enter to start deployment or Ctrl+C to cancel..."
read

# Deploy using Ledger
forge script script/DeployMainnet.s.sol \
    --rpc-url $RPC_URL \
    --ledger \
    --sender $LEDGER_ADDRESS \
    --broadcast \
    --verify \
    --verifier-url https://api.basescan.org/api \
    --etherscan-api-key YZJQ7PBJA9DPQMXC5GFR3R3Y8PSMYVE1P7 \
    -vvv

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update .env files with the new proxy address"
echo "2. Update PKP conditions with the new contract address"
echo "3. Re-encrypt content with the new proxy address"