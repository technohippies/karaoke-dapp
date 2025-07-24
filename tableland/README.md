# Tableland Module

Clean, organized Tableland operations. All scripts are network-agnostic.

## 📁 Folder Structure

```
tableland/
├── deploy/                  # Deployment scripts
│   ├── deploy-table.ts      # Deploy to any network
│   ├── deploy-table-ledger.ts # Deploy with Ledger
│   └── deprecated/          # Old versions
├── operations/              # CRUD operations
│   ├── add/                 # Add songs
│   ├── update/              # Update data
│   └── query/               # Query data
├── deployments/             # Deployment records
│   ├── testnet/
│   └── mainnet/
├── scripts/                 # Utility scripts
└── core/                    # Shared utilities
```

## 🌐 Available Networks

All defined in `config.ts`:
- `optimism-sepolia` (default for most scripts)
- `base-sepolia`
- `base-mainnet`
- `optimism-mainnet`

## 🚀 Core Operations

### Deploy Tables
```bash
# Deploy to any network
bun run deploy songs optimism-sepolia
bun run deploy songs base-mainnet

# Deploy with Ledger
bun run deploy:ledger songs base-mainnet
```

### Query Data
```bash
# Query any network (default: optimism-sepolia)
bun run query "SELECT * FROM {table}"

# Query specific network
bun run query "SELECT * FROM {table}" base-mainnet

# Query with custom table
bun run query "SELECT * FROM {table}" optimism-sepolia "custom_table_name"
```

### Update Data
```bash
# Update on default network
bun run update 1 '{"title":"New Title"}'

# Update on specific network
bun run update 1 '{"stems":{"piano":"QmNewCID"}}' base-mainnet

# Update multiple fields
bun run update 1 '{"duration":195,"language":"es"}' optimism-sepolia
```

### Add Songs
```bash
# Add single song
bun run add song.json
bun run add song.json base-mainnet

# Batch add songs
bun run batch ./songs-folder/
bun run batch ./songs-folder/ optimism-sepolia
```

## 📝 Usage Pattern

All scripts follow the same pattern:
```bash
script.ts <required-args> [network] [tableName]
```

- If network is provided and valid, it's used
- Otherwise, the argument is treated as a table name on the default network
- Scripts automatically load table names from `deployments/` folder

## 💾 Deployment Records

All deployments are automatically saved:
```
deployments/
├── testnet/
│   ├── optimism_sepolia.json
│   └── base_sepolia.json
└── mainnet/
    ├── base_mainnet.json
    └── optimism_mainnet.json
```

Format:
```json
{
  "tables": {
    "songs": {
      "network": "optimism-sepolia",
      "chainId": 11155420,
      "tableName": "karaoke_songs_11155420_123",
      "transactionHash": "0x...",
      "deployedAt": "2024-01-21T10:30:00Z"
    }
  },
  "lastUpdated": "2024-01-21T10:30:00Z"
}
```

## 🔧 Configuration

### `config.ts`
Centralized config with network settings and table schemas. Add new networks/schemas here.

### `TableManager.ts`
Reusable class for programmatic table operations.

## 📋 Data Structure

Songs table includes:
- `id`, `isrc`, `iswc`, `title`, `artist`, `duration`, `language`
- `stems` - JSON: `{"piano":"QmCID"}` (will expand to multiple instruments)
- `translations` - JSON: `{"zh":"QmCID","ug":"QmCID","bo":"QmCID"}`
- `artwork_hash` - JSON: `{"id":"hash","ext":"png","sizes":{"t":"300x300x1"}}`
- `streaming_links` - JSON: `{"spotify":"id","youtube":"id"}`
- `genius_id`, `lrclib_id`, `genius_slug`
- `updated_at` - Unix timestamp

## 🔐 Encryption Flow

1. **Encrypt**: Lit Protocol encrypts content using Base Sepolia contract access conditions
2. **Store**: Encrypted content uploaded to IPFS via Pinata
3. **Index**: CIDs stored in Optimism Sepolia Tableland for metadata
4. **Access**: Web app queries Tableland → fetches from IPFS → decrypts with Lit

## 🔄 Workflow After Contract Update

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
   bun run update 1 '{
     "stems": {
       "piano": "QmU6BW8DHL8Ack54Pmtu18mjPFhGYmQy3V45br5dJN8WSL"
     },
     "translations": {
       "zh": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW",
       "ug": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW",
       "bo": "QmPQRRJcnnsLEg59kEtHSoPeAe9rWfa7PwYYWtWUniXHCW"
     }
   }' optimism-sepolia
   ```

3. **Verify updates**:
   ```bash
   bun run query "SELECT id, title, stems, translations FROM {table}"
   ```

## 🔤 Ledger Setup

Before deploying to mainnet with Ledger:

1. **Connect your Ledger device** via USB
2. **Unlock it** with your PIN
3. **Open the Ethereum app** on the device
4. **Enable "Contract data"** in the Ethereum app settings:
   - Go to Settings → Contract data → Enable

## 🔒 Security Notes

- **Never commit private keys** to version control
- **Use Ledger for mainnet** deployments to ensure security
- **Verify addresses** before approving transactions on Ledger
- **Test on testnet first** before mainnet deployments

## 🚫 Anti-Bloat Rules

- ✅ Use existing tools for updates/queries
- ❌ Don't create new scripts for one-off tasks
- ✅ Add functionality to existing modular tools
- ❌ Don't duplicate query/update logic