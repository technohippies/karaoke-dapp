#!/bin/bash
# Re-encrypt all songs with the current contract address

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Source environment files
if [ -f ".env" ]; then
    source .env
fi
if [ -f "../.env" ]; then
    source ../.env
fi

# Check for contract address
CONTRACT_ADDRESS="${KARAOKE_CONTRACT:-$KARAOKE_PROXY}"
if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}❌ Error: KARAOKE_CONTRACT or KARAOKE_PROXY not set in .env${NC}"
    exit 1
fi

# Check for Pinata JWT
if [ -z "$PINATA_JWT" ]; then
    echo -e "${RED}❌ Error: PINATA_JWT not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}🔄 Re-encrypting songs with contract address...${NC}"
echo -e "📝 Using contract: ${YELLOW}${CONTRACT_ADDRESS}${NC}"
echo ""

# Navigate to scripts directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Re-encrypt all songs
npx tsx prepare-song.ts --all

echo ""
echo -e "${GREEN}✅ Re-encryption complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check encrypted files in data/encrypted/"
echo "2. Update Tableland with new CIDs using:"
echo "   cd ../tableland"
echo "   npx tsx operations/update/update-encrypted-content.ts <songId> <stems_and_translations_json>"
echo "3. Test decryption in the web app"