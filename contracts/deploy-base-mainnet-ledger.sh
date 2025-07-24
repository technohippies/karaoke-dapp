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

# Get required environment variables
if [ -z "$USDC_ADDRESS" ]; then
    echo "📝 Setting Base Mainnet USDC address..."
    export USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
fi

if [ -z "$SPLITS_ADDRESS" ]; then
    echo "📝 Setting Base Mainnet Splits address..."
    export SPLITS_ADDRESS="0x7eA10e96D656Ab19D679fFfA3CA1Db9A531B1210"
fi

echo ""
echo "📋 Configuration:"
echo "   - USDC Address: $USDC_ADDRESS"
echo "   - Splits Address: $SPLITS_ADDRESS"
echo ""
echo "📋 Deployment will:"
echo "   1. Deploy KaraokeSchool implementation"
echo "   2. Deploy ERC1967Proxy with initialization"
echo ""
echo "Press Enter to start deployment or Ctrl+C to cancel..."
read

# Deploy using Ledger
forge script script/DeployLedger.s.sol \
    --rpc-url $RPC_URL \
    --ledger \
    --sender $LEDGER_ADDRESS \
    --broadcast \
    --verify \
    --verifier-url https://api.basescan.org/api \
    --etherscan-api-key ${BASESCAN_API_KEY:-"YOUR_BASESCAN_API_KEY"} \
    -vvv

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update .env files with the new proxy address"
echo "2. Update PKP conditions with the new contract address"
echo "3. Re-encrypt content with the new proxy address"
echo ""
echo "To verify deployment:"
echo "   cast call <PROXY_ADDRESS> 'owner()' --rpc-url $RPC_URL"