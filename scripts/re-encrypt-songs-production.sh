#!/bin/bash

# Re-encrypt songs for production mainnet deployment
# This will use the production proxy address for Lit Protocol encryption

echo "🔐 Re-encrypting songs for production deployment..."
echo "Using production environment variables from .env.production"
echo ""

# Source production environment
source .env.production

# Verify we have the right proxy address
echo "Production proxy address: $KARAOKE_PROXY"
echo "Expected: 0x9A6C30424E925b5764Aa498B9b485d379C8403ba"
echo ""

if [ "$KARAOKE_PROXY" != "0x9A6C30424E925b5764Aa498B9b485d379C8403ba" ]; then
    echo "❌ Error: KARAOKE_PROXY is not set to production address!"
    exit 1
fi

# Run the re-encryption
echo "Starting re-encryption process..."
cd "$(dirname "$0")"
bun run prepare-song.ts --all

echo ""
echo "✅ Re-encryption complete!"
echo ""
echo "Next steps:"
echo "1. Check the output in data/encrypted/"
echo "2. Prepare the data for Tableland insertion"
echo "3. Insert into production Tableland table using Ledger"