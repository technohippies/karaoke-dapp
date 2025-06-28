#!/bin/bash
set -e

echo "🚀 Karaoke dApp Deployment Script"
echo "================================="

# Check environment
if [ ! -f .env ]; then
    echo "❌ .env file not found. Copy .env.example and configure it."
    exit 1
fi

# Load environment
export $(cat .env | grep -v '^#' | xargs)

echo "📋 Deployment Steps:"
echo "1. Deploy MusicStoreV2 contract"
echo "2. Deploy Lit Actions"
echo "3. Update Tableland songs"
echo ""

# Step 1: Deploy contracts
echo "1️⃣ Deploying MusicStoreV2..."
cd packages/contracts

# Install dependencies if needed
if [ ! -d "lib/openzeppelin-contracts" ]; then
    forge install OpenZeppelin/openzeppelin-contracts
fi

# Build contracts
forge build

# Deploy to Base Sepolia (test)
if [ "$1" == "production" ]; then
    echo "🔐 Production deployment - connect your Ledger"
    forge script script/DeployWithLedger.s.sol --rpc-url $RPC_URL_BASE --broadcast --ledger
else
    forge script script/Deploy.s.sol --rpc-url $RPC_URL_SEPOLIA --broadcast
fi

cd ../..

# Step 2: Deploy Lit Actions
echo "2️⃣ Deploying Lit Actions..."
cd packages/lit-actions
bun install
bun run deploy
cd ../..

# Step 3: Update songs (if tables exist)
if [ ! -z "$TABLELAND_SONGS_TABLE" ]; then
    echo "3️⃣ Updating songs in Tableland..."
    cd packages/tableland
    bun install
    bun run update-songs
    cd ../..
else
    echo "⚠️  Skipping song update - TABLELAND_SONGS_TABLE not set"
    echo "   Create tables in Tableland Studio first"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update apps/web with deployed contract addresses"
echo "2. Fund Lit PKP wallet with Recall tokens"
echo "3. Test with a song purchase flow"