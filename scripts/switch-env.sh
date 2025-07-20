#!/bin/bash

# Script to switch between development and production environments

if [ "$1" = "local" ] || [ "$1" = "dev" ]; then
    echo "🔄 Switching to local development environment (Optimism Sepolia)..."
    cp .env.local .env
    echo "✅ Switched to Optimism Sepolia configuration"
    echo "   Chain ID: 11155420"
    echo "   Contract: 0x2Bf88edD6c7b1bcB9B02F524AFAF044668D630E6"
    echo ""
    echo "Run 'bun run dev' to start the development server"
elif [ "$1" = "prod" ] || [ "$1" = "production" ]; then
    echo "🔄 Switching to production environment (Base Mainnet)..."
    cp .env.production .env
    echo "✅ Switched to Base Mainnet configuration"
    echo "   Chain ID: 8453"
    echo "   Contract: Not yet deployed"
    echo ""
    echo "⚠️  Note: Contract needs to be deployed to Base mainnet first"
    echo "Run 'bun run build' to create production build"
else
    echo "Usage: ./scripts/switch-env.sh [local|dev|prod|production]"
    echo ""
    echo "Examples:"
    echo "  ./scripts/switch-env.sh local     # Switch to Optimism Sepolia"
    echo "  ./scripts/switch-env.sh prod      # Switch to Base Mainnet"
    exit 1
fi