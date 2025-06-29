# MIDI Processing Pipeline

This document explains how to encrypt and upload MIDI files for the Karaoke dApp.

## Overview

The pipeline:
1. Encrypts MIDI files using Lit Protocol
2. Uploads encrypted data to AIOZ Network (IPFS)
3. Updates Tableland with the CID
4. Tracks uploads to prevent duplicates

## Setup

1. Copy `.env.example` to `.env` and fill in the values:
```bash
cp .env.example .env
```

2. Required environment variables:
- `MIDI_DECRYPTOR_ACTION_CID`: The CID of your deployed MIDI Decryptor Lit Action
- `KARAOKE_STORE_ADDRESS`: Your deployed KaraokeStore contract address
- `TABLELAND_PRIVATE_KEY`: Private key that owns the songs table

## Usage

### Process a Single Song

```bash
# Process the test MIDI file for song ID 1
bun run process-song --midi "test-data/midi/Lorde - Royals/piano.mid" --song-id 1

# Dry run (no upload/update)
bun run process-song --midi "test-data/midi/Lorde - Royals/piano.mid" --song-id 1 --dry-run
```

### Verify a Song

Check if a song has been properly updated in Tableland:

```bash
bun run verify-song --song-id 1
```

## CID Tracking

The system automatically tracks uploaded CIDs in `cid-tracker.json` to:
- Prevent duplicate uploads (AIOZ rejects duplicates)
- Maintain a record of all uploads
- Allow recovery if Tableland update fails

## Testing the Full Flow

1. **Process a song**:
   ```bash
   bun run process-song --midi "test-data/midi/Lorde - Royals/piano.mid" --song-id 1
   ```

2. **Purchase access** (via your dApp or contract interaction)

3. **Test decryption** (via the MIDI Decryptor Lit Action)

## Troubleshooting

### "File exists on AIOZ but CID unknown"
This happens when:
- The file was uploaded before but not tracked
- The `cid-tracker.json` was deleted

Solution: Manually add the CID to `cid-tracker.json`

### Lit Protocol Connection Issues
- Ensure you're using the correct network (`datil` for production)
- Check that the MIDI_DECRYPTOR_ACTION_CID is correct

### Tableland Update Fails
- Verify you own the table with the private key
- Check that the song ID exists in the table
- Ensure you have enough gas on Base