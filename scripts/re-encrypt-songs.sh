#!/bin/bash
# Re-encrypt all songs with the correct contract address

echo "🔄 Re-encrypting songs with correct contract address..."
echo "📝 Contract: ${KARAOKE_CONTRACT}"

# Re-encrypt all songs
cd scripts && npx tsx prepare-song.ts --all

echo "✅ Re-encryption complete!"
echo ""
echo "Next steps:"
echo "1. Update Tableland with new IPFS hashes"
echo "2. Clear any cached content in the web app"
echo "3. Test decryption with the web app"