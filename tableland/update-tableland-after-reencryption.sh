#!/bin/bash

echo "🔄 Updating Tableland with new IPFS CIDs after re-encryption..."
echo

# Update Song 1 (Royals)
echo "📝 Updating Song 1 (Royals)..."
cd /media/t42/th42/Code/lit-test/tableland
npx tsx update-encrypted-content.ts 1 '{
  "stems": {
    "piano": "QmXGUXw5xyQNEeEZwHfVTYcjF4uGEbzequeam3NSMCEmSe"
  },
  "translations": {
    "zh": "QmVDRK8tbXwfxa3GLojP2xhSbWL3inChXdprxQpDvxgLfp",
    "ug": "QmVDRK8tbXwfxa3GLojP2xhSbWL3inChXdprxQpDvxgLfp",
    "bo": "QmVDRK8tbXwfxa3GLojP2xhSbWL3inChXdprxQpDvxgLfp"
  }
}'

echo
echo "📝 Updating Song 2 (Dancing Queen)..."
npx tsx update-encrypted-content.ts 2 '{
  "stems": {
    "piano": "QmW8KmT6JsiJMmUwQijbUeBPoSw6szxE6StXmnbY5ZhTum"
  },
  "translations": {
    "zh": "QmNigWH5PGDWQFhfCff2HaU4rSSXoSxhkgom6K9XXThia6",
    "ug": "QmNigWH5PGDWQFhfCff2HaU4rSSXoSxhkgom6K9XXThia6",
    "bo": "QmNigWH5PGDWQFhfCff2HaU4rSSXoSxhkgom6K9XXThia6"
  }
}'

echo
echo "✅ Tableland updates complete!"
echo
echo "Next steps:"
echo "1. Clear any cached content in the web app"
echo "2. Test decryption with the new contract"