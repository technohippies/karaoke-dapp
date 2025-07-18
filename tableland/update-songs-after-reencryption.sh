#!/bin/bash

echo "🔄 Updating Tableland with new IPFS CIDs after re-encryption..."
echo

# Update Song 1 (Royals)
echo "📝 Updating Song 1 (Royals)..."
npx tsx update-encrypted-content.ts 1 '{
  "stems": {
    "piano": "QmZbVn6bgx3ApmWwyk9X86tYZnWubRhhAUocD79SFSYnZo"
  },
  "translations": {
    "zh": "QmUDefXHoJ5ZaHorZqxVDK6TN6qkpyyUT99Gfmv34yzXZo",
    "ug": "QmUDefXHoJ5ZaHorZqxVDK6TN6qkpyyUT99Gfmv34yzXZo",
    "bo": "QmUDefXHoJ5ZaHorZqxVDK6TN6qkpyyUT99Gfmv34yzXZo"
  }
}'

echo
echo "📝 Updating Song 2 (Dancing Queen)..."
npx tsx update-encrypted-content.ts 2 '{
  "stems": {
    "piano": "QmeqRHw2boSZrL3NaPVNbFZGUfUmLDRefF5WnjUsawooCT"
  },
  "translations": {
    "zh": "QmSQi22DzoMkqHmGyAJ8Q42gKUthcg7FUwjUTMLEXfki5a",
    "ug": "QmSQi22DzoMkqHmGyAJ8Q42gKUthcg7FUwjUTMLEXfki5a",
    "bo": "QmSQi22DzoMkqHmGyAJ8Q42gKUthcg7FUwjUTMLEXfki5a"
  }
}'

echo
echo "✅ Tableland updates complete!"
echo
echo "Next steps:"
echo "1. Clear any cached content in the web app"
echo "2. Test decryption with the new contract"