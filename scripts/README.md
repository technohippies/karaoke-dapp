# Scripts Directory

Utility scripts for managing Lit Protocol encryption, PKP setup, and content preparation.

## Overview

This directory contains scripts for:
- Encrypting songs and content with Lit Protocol
- Managing PKP (Programmable Key Pairs)
- Uploading Lit Actions to IPFS
- Updating Tableland with encrypted content

## Prerequisites

1. Install dependencies:
   ```bash
   cd scripts
   npm install
   ```

2. Ensure `.env` is configured in the project root with:
   ```
   PRIVATE_KEY=<your_wallet_private_key>
   PINATA_JWT=<your_pinata_jwt>
   DEEPGRAM_API_KEY=<your_deepgram_key>
   OPENROUTER_API_KEY=<your_openrouter_key>
   KARAOKE_CONTRACT=<current_contract_address>
   ```

## Key Scripts

### 1. **prepare-song.ts** - Encrypt songs with Lit Protocol
```bash
# Encrypt a single song
npx tsx prepare-song.ts --id 1

# Encrypt all songs
npx tsx prepare-song.ts --all
```

This script:
- Loads MIDI files and translations from `/data/songs/`
- Fetches original lyrics from lrclib.net
- Encrypts content with Lit Protocol using contract access control
- Uploads encrypted content to IPFS via Pinata
- Saves metadata to `/data/encrypted/`

### 2. **re-encrypt-songs.sh** - Batch re-encryption after contract update
```bash
bash re-encrypt-songs.sh
```

This wrapper script:
- Uses the current KARAOKE_CONTRACT from `.env`
- Runs `prepare-song.ts --all` to re-encrypt all songs
- Shows next steps for updating Tableland

**Use this after deploying a new contract!**

### 3. **upload-lit-action.ts** - Deploy Lit Actions to IPFS
```bash
npx tsx upload-lit-action.ts ../lit-actions/karaokeScorerV18.js --name "Karaoke Scorer V18"
```

Returns the IPFS CID to use in the frontend.

### 4. **encrypt-api-keys.ts** - Encrypt API keys for Lit Actions
```bash
npx tsx encrypt-api-keys.ts
```

Encrypts API keys from `.env` with simple conditions (always true) for embedding in Lit Actions.

### 5. **mint-pkp-with-permissions.ts** - Create new PKP
```bash
npx tsx mint-pkp-with-permissions.ts
```

Mints a new PKP and sets up permissions for Lit Actions.

### 6. **set-pkp-address.ts** - Update contract PKP address
```bash
npx tsx set-pkp-address.ts <pkp_address>
```

Updates the PKP address in the smart contract (owner only).

### 7. **update-tableland-v2.ts** - Update Tableland after re-encryption
```bash
npx tsx update-tableland-v2.ts
```

**Note**: This script has issues. Use the tableland directory scripts instead:
```bash
cd ../tableland
npx tsx update-encrypted-content.ts <songId> '<json>'
```

## Workflow After Contract Update

1. **Deploy new contract** (see contracts/README.md)

2. **Update environment**:
   ```bash
   # Update .env with new contract address
   KARAOKE_CONTRACT=0xNEW_CONTRACT_ADDRESS
   VITE_KARAOKE_CONTRACT=0xNEW_CONTRACT_ADDRESS
   ```

3. **Re-encrypt all songs**:
   ```bash
   bash re-encrypt-songs.sh
   ```

4. **Update Tableland** (see tableland/README.md):
   ```bash
   cd ../tableland
   # Update each song with new IPFS CIDs
   npx tsx update-encrypted-content.ts 1 '{"stems":{"piano":"CID"},"translations":{...}}'
   ```

## Important Notes

- **Lit Actions API Keys**: The karaoke scorer Lit Action contains embedded API keys encrypted with simple conditions. These don't need re-encryption when the contract changes.
- **Access Control**: Songs are encrypted with contract-based conditions - users must have unlocked the song via the contract.
- **IPFS Storage**: All encrypted content is stored on IPFS via Pinata.

## File Structure
```
scripts/
├── prepare-song.ts         # Main encryption script
├── re-encrypt-songs.sh     # Batch re-encryption wrapper
├── upload-lit-action.ts    # Deploy Lit Actions to IPFS
├── encrypt-api-keys.ts     # Encrypt API keys for Lit Actions
├── mint-pkp-with-permissions.ts  # Create new PKP
├── set-pkp-address.ts      # Update contract PKP
├── check-pkp-address.ts    # Verify PKP configuration
├── update-tableland-v2.ts  # (Deprecated - use tableland/)
├── package.json            # Dependencies
└── README.md              # This file
```