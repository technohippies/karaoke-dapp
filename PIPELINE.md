# SimpleKaraokeV2 Content Pipeline

## Overview

This pipeline handles the preparation and deployment of encrypted karaoke content for the V2 contract.

## Directory Structure

```
/media/t42/th42/Code/lit-test/
├── data/                         # Source data (outside web app)
│   ├── songs-metadata.json       # Song catalog
│   ├── midi/
│   │   ├── 1/                    # Song ID folders
│   │   │   └── lorde-royals-piano.mid
│   │   └── 2/
│   │       └── abba-dancing-queen-piano.mid
│   ├── translations/
│   │   ├── 1/
│   │   │   ├── metadata.json
│   │   │   ├── translation-zh.json
│   │   │   ├── translation-ug.json
│   │   │   └── translation-bo.json
│   │   └── 2/
│   │       └── (same structure)
│   └── encrypted-v2/             # Output encrypted data
├── scripts/                      # Data preparation scripts
│   ├── prepare-song.ts           # Encrypt & upload to IPFS
│   └── update-tableland-v2.ts    # Update Tableland
├── contracts/
│   ├── SimpleKaraokeV2Simplified.sol
│   └── deployment-v2.json
└── apps/web/                     # Frontend (consumes from Tableland)
```

## Workflow

### 1. Deploy Contract

```bash
cd contracts
forge script scripts/DeploySimpleKaraokeV2.s.sol \
  --rpc-url base-sepolia \
  --broadcast \
  --verify \
  --private-key $PRIVATE_KEY
```

### 2. Set Contract Address

After deployment, update `.env`:
```
KARAOKE_V2_CONTRACT=0x... # Your deployed contract address
```

### 3. Prepare Songs

```bash
cd scripts
npm install
npm run prepare-song -- --all
```

Or prepare a single song:
```bash
npm run prepare-song -- 1
```

### 4. Update Contract

Use the generated CIDs to update the contract:
```javascript
// From prepared-songs.json
await contract.setSongMetadata(
  songId,
  "bafyrei...", // MIDI CID
  "bafyrei..."  // Lyrics CID
)
```

## Access Control

Songs are encrypted with Lit Protocol using this condition:
- User must have `hasUnlockedSong[user][songId] == true` in the V2 contract

## Files Generated

- `deployment-v2.json` - Contract deployment info
- `data/encrypted-v2/song-{id}.json` - Individual encrypted songs
- `data/encrypted-v2/prepared-songs.json` - Summary of all songs

## Environment Variables

Required in `.env`:
```
PRIVATE_KEY=your_deployer_private_key
PKP_ADDRESS=0xe7674fe5EAfdDb2590462E58B821DcD17052F76D
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
KARAOKE_V2_CONTRACT=0x... # After deployment
```