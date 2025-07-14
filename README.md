# Karaoke Application with Lit Protocol

## Deployed Contracts

### SimpleKaraokeV2 (Current - July 2025)
- **Address**: `0xFA8DC581F65ba0ae5b700967a4a3dF446587ff19`
- **Network**: Base Sepolia (Chain ID: 84532)
- **Features**: 
  - Credit system (voice & song credits)
  - Song unlocking mechanism
  - Encrypted MIDI & lyrics storage
  - PKP signature verification
  - USDC payment integration
- **Deploy TX**: `0xc25b53e8e56f7f00c8433c5e01e9b70f3fa4e33f20a1132f4c0f21224d8532a9`

### SimpleKaraokeV1 (Deprecated)
- **Address**: `0x1a79D4CcA843F9DfeFFE372cff5D2fAD006EaF2B`
- **Network**: Base Sepolia
- **Features**: Pay upfront with ETH, single grade submission
- **Lit Action CID**: `QmZTr3g3QLMnteqpozbMdhoaEitZaEDY5CqMAucXyM9yfk`

## V2 Pipeline

### Directory Structure
```
/media/t42/th42/Code/lit-test/
├── data/
│   ├── raw/               # Unencrypted source content
│   │   ├── midi/         # MIDI files by song ID
│   │   └── translations/ # Translation files by song ID
│   ├── encrypted/        # Encrypted output with CIDs
│   └── metadata.json     # Master song metadata
├── scripts/              # Data preparation scripts
│   └── prepare-song.ts   # Encrypt & upload to IPFS
├── tableland/            # Modular Tableland management
│   ├── deploy-tables.ts
│   ├── add-song.ts
│   └── update-encrypted-content.ts
└── contracts/
    └── SimpleKaraokeV2Simplified.sol
```

### Workflow
1. Add content to `data/raw/midi/{id}/` and `data/raw/translations/{id}/`
2. Update `data/metadata.json` with song info
3. Run: `cd scripts && bun prepare-song.ts --all`
4. Deploy/update Tableland: `cd tableland && bun add ../data/encrypted/song-{id}.json`
5. Update contract with encrypted CIDs if needed

## Environment Variables
```bash
# Contract addresses
KARAOKE_V2_CONTRACT=0xFA8DC581F65ba0ae5b700967a4a3dF446587ff19
PKP_ADDRESS=0xe7674fe5EAfdDb2590462E58B821DcD17052F76D

# IPFS (Pinata)
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret

# Tableland
SONGS_TABLE_NAME=songs_84532_xxx
```

## Key Components
- **PKP Address**: `0xe7674fe5EAfdDb2590462E58B821DcD17052F76D`
- **USDC (Base Sepolia)**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Pricing**: 
  - Combo Pack: 3 USDC (100 voice + 10 song credits)
  - Voice Pack: 1 USDC (50 credits)
  - Song Pack: 2 USDC (5 credits)