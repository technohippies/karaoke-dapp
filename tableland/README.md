# Tableland Module

Clean, modular Tableland operations for the karaoke app. **No script bloat** - these tools handle any update/query scenario.

## Current Setup

- **Network**: Optimism Sepolia (11155420)
- **Table**: `karaoke_songs_11155420_11155420_181`
- **Contract**: Base Sepolia (for Lit Protocol encryption)

## Core Tools

### `update-encrypted-content.ts`
Update ANY field(s) in songs. JSON objects auto-stringified.

```bash
# Update stems
bun run update-encrypted-content.ts 1 '{"stems":{"piano":"QmNewCID"}}'

# Update multiple fields
bun run update-encrypted-content.ts 1 '{"stems":{"piano":"CID1"},"duration":195}'

# Update artwork
bun run update-encrypted-content.ts 1 '{"artwork_hash":{"id":"abc123","ext":"png"}}'

# Update any field
bun run update-encrypted-content.ts 1 '{"genius_id":12345,"language":"fr"}'

# Use custom table
bun run update-encrypted-content.ts 1 '{"title":"New Title"}' "custom_table_name"
```

### `query.ts`
Run ANY SQL query. Use `{table}` as placeholder.

```bash
# Get all songs
bun run query.ts "SELECT * FROM {table}"

# Get specific song
bun run query.ts "SELECT * FROM {table} WHERE id = 1"

# Get titles and artists
bun run query.ts "SELECT id, title, artist FROM {table}"

# Use custom table
bun run query.ts "SELECT * FROM {table}" "custom_table_name"
```

### `deploy-table.ts`
Deploy new tables using config schemas.

```bash
# Deploy songs table
bun run deploy-table.ts songs optimism-sepolia

# Deploy user history table
bun run deploy-table.ts user_history optimism-sepolia
```

## Configuration

### `config.ts`
Centralized config with network settings and table schemas. Add new networks/schemas here.

### `TableManager.ts`
Reusable class for programmatic table operations.

## Data Structure

Songs table includes:
- `id`, `isrc`, `iswc`, `title`, `artist`, `duration`, `language`
- `stems` - JSON: `{"piano":"QmCID"}` (will expand to multiple instruments)
- `translations` - JSON: `{"zh":"QmCID","ug":"QmCID","bo":"QmCID"}`
- `artwork_hash` - JSON: `{"id":"hash","ext":"png","sizes":{"t":"300x300x1"}}`
- `streaming_links` - JSON: `{"spotify":"id","youtube":"id"}`
- `genius_id`, `lrclib_id`, `genius_slug`
- `updated_at` - Unix timestamp

## Encryption Flow

1. **Encrypt**: Lit Protocol encrypts content using Base Sepolia contract access conditions
2. **Store**: Encrypted content uploaded to IPFS via Pinata
3. **Index**: CIDs stored in Optimism Sepolia Tableland for metadata
4. **Access**: Web app queries Tableland → fetches from IPFS → decrypts with Lit

## Workflow After Contract Update

When the smart contract is updated and content is re-encrypted:

1. **Get new IPFS CIDs** from re-encryption output:
   ```bash
   # After running scripts/re-encrypt-songs.sh, you'll see:
   # Song 1: MIDI CID: QmU6BW8DHL8Ack54Pmtu18mjPFhGYmQy3V45br5dJN8WSL
   # Song 1: Lyrics CID: QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW
   ```

2. **Update each song** with new CIDs:
   ```bash
   # Update Song 1
   npx tsx update-encrypted-content.ts 1 '{
     "stems": {
       "piano": "QmU6BW8DHL8Ack54Pmtu18mjPFhGYmQy3V45br5dJN8WSL"
     },
     "translations": {
       "zh": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW",
       "ug": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW",
       "bo": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW"
     }
   }'
   ```

3. **Verify updates**:
   ```bash
   npx tsx query.ts "SELECT id, title, stems, translations FROM {table}"
   ```

## Anti-Bloat Rules

- ✅ Use existing tools for updates/queries
- ❌ Don't create new scripts for one-off tasks
- ✅ Add functionality to existing modular tools
- ❌ Don't duplicate query/update logic