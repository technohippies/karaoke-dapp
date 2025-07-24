# Tableland Module

Clean, organized Tableland operations. All scripts are network-agnostic and support both private key and Ledger signing.

## 📁 Folder Structure

```
tableland/
├── deploy/                  # Deployment scripts
│   ├── unified-deploy.ts    # Main unified deployment tool
│   ├── index.ts            # Entry point wrapper
│   ├── README.md           # Deployment documentation
│   └── deprecated/         # Legacy scripts (do not use)
│       ├── deploy-table.ts # Old single deployment
│       └── MIGRATION.md    # Migration guide
├── operations/             # CRUD operations
│   ├── add/               # Add songs (supports --ledger)
│   ├── update/            # Update data
│   └── query/             # Query data
├── deployments/           # Deployment records
│   ├── testnet/          # Test network deployments
│   └── mainnet/          # Main network deployments
├── scripts/              # Utility scripts
├── config.ts             # Centralized configuration
└── package.json          # NPM scripts and dependencies
```

## 🌐 Available Networks

All defined in `config.ts`:
- `optimism-sepolia` (default for most scripts)
- `base-sepolia`
- `base-mainnet`
- `optimism-mainnet`

## 🚀 Core Operations

### Deploy Tables (Unified System)

The new unified deployment system provides powerful features for managing table deployments:

```bash
# Show deployment help
bun run deploy --help

# Deploy a single table with private key
bun run deploy:table songs base-mainnet

# Deploy with Ledger
bun run deploy:table songs base-mainnet --ledger
bun run deploy:table songs base-mainnet --ledger --path "m/44'/60'/0'/0/1"

# Dry run (preview without deploying)
bun run deploy:table songs base-mainnet --dry-run

# Batch deploy multiple tables
bun run deploy:batch songs,user_history base-mainnet
bun run deploy:batch all base-mainnet,base-sepolia --ledger

# List all deployments
bun run deploy:list
bun run deploy:list base-mainnet

# Verify a deployment
bun run deploy:verify songs base-mainnet

# Legacy method (still supported)
bun run deploy:legacy songs base-mainnet
```

### Add Songs
```bash
# Add single song with private key
bun run add song.json
bun run add song.json base-mainnet
bun run add song.json base-mainnet karaoke_songs_8453_123

# Add single song with Ledger
bun run add song.json base-mainnet --ledger
bun run add song.json --ledger  # uses default network

# Batch add songs with private key
bun run batch ./songs-folder/
bun run batch ./songs-folder/ optimism-sepolia

# Batch add songs with Ledger
bun run batch ./songs-folder/ base-mainnet --ledger
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

## 📝 Usage Pattern

All scripts follow the same pattern:
```bash
script.ts <required-args> [network] [tableName] [--ledger] [--path <derivation-path>]
```

- If network is provided and valid, it's used
- Otherwise, the argument is treated as a table name on the default network
- Scripts automatically load table names from `deployments/` folder
- `--ledger` flag enables hardware wallet signing
- `--path` allows custom derivation paths for Ledger

## 🔤 Ledger Setup

When using the `--ledger` flag:

1. **Connect your Ledger device** via USB
2. **Unlock it** with your PIN
3. **Open the Ethereum app** on the device
4. **Enable "Contract data"** in the Ethereum app settings:
   - Go to Settings → Contract data → Enable
5. **Approve each transaction** on the device when prompted

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
      "deployedAt": "2024-01-21T10:30:00Z",
      "deployedBy": "0x..."
    }
  },
  "lastUpdated": "2024-01-21T10:30:00Z"
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the parent directory with:

```env
# For private key signing
PRIVATE_KEY=your_private_key_here

# Optional: Custom RPC URLs
BASE_MAINNET_RPC_URL=https://mainnet.base.org
OPTIMISM_MAINNET_RPC_URL=https://mainnet.optimism.io

# Optional: Table name (for compatibility)
SONGS_TABLE_NAME=karaoke_songs_8453_123
```

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

## 🎯 Unified Deployment System

The new unified deployment system (`deploy/unified-deploy.ts`) consolidates all deployment functionality:

### Key Features
- **Single Entry Point**: All deployment operations through one tool
- **Batch Deployments**: Deploy multiple tables across multiple networks
- **Deployment Tracking**: Automatic tracking and history
- **Dry Run Mode**: Preview deployments before execution
- **Built-in Verification**: Verify deployments are accessible
- **Hardware Wallet Support**: Full Ledger integration
- **Better Error Handling**: Comprehensive error messages

### Migration from Legacy Scripts
- `deploy-table.ts` → `bun run deploy:table`
- `deploy-tables.ts` → `bun run deploy:batch`
- `deploy-table-ledger-*.ts` → `bun run deploy:table --ledger`

See [deploy/README.md](deploy/README.md) for complete documentation.

## 🔄 Migration Notes

All deployment and operation scripts have been modernized:
- **Deployment**: Use the unified deployment system
- **Operations**: All scripts support `--ledger` flag
- **Legacy Scripts**: Preserved in `deprecated/` folders but should not be used

This provides a cleaner, more maintainable codebase with consistent CLI interfaces across all operations.