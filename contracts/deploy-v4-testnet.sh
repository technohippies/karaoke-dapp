#!/bin/bash

# Deploy KaraokeSchoolV4 to Base Sepolia

echo "🚀 Deploying KaraokeSchoolV4 to Base Sepolia..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and add your configuration"
    exit 1
fi

# Load environment variables
source .env

# Verify required variables
if [ -z "$PRIVATE_KEY" ] || [ -z "$SPLITS_ADDRESS" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Please ensure PRIVATE_KEY and SPLITS_ADDRESS are set in .env"
    exit 1
fi

# Deploy to Base Sepolia
echo "📦 Compiling contracts..."
forge build

echo "🔗 Deploying to Base Sepolia..."
forge script script/DeployV4.s.sol \
    --rpc-url https://sepolia.base.org \
    --broadcast \
    --verify \
    --verifier blockscout \
    --verifier-url https://base-sepolia.blockscout.com/api \
    -vvvv

echo "✅ Deployment complete!"
echo "📝 Update VITE_KARAOKE_CONTRACT in apps/web/.env.local with the new proxy address"