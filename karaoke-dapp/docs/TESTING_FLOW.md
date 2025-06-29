# Testing the MIDI Processing Flow

This document outlines how to test the complete MIDI encryption and upload flow.

## Current Status

✅ **Working Components:**
- CID tracking system to prevent duplicate uploads
- Lit Protocol encryption (using MIDI Decryptor Action as authorized party)
- AIOZ upload simulation (dry run mode)
- Processing script with proper error handling

## Test Flow

### 1. Dry Run Test (Working)

```bash
bun run process-song -- --midi "../test-data/midi/Lorde - Royals/piano.mid" --song-id 1 --dry-run
```

This will:
- Read the MIDI file
- Encrypt it using Lit Protocol
- Simulate upload (no actual AIOZ call)
- Show the CID that would be generated

### 2. Full Processing (Requires Configuration)

To run the full flow, you need:

1. **Deploy MIDI Decryptor Action** to Lit Protocol
2. **Deploy KaraokeStore Contract** to Base Sepolia
3. **Configure Environment**:
   ```env
   MIDI_DECRYPTOR_ACTION_CID=<your-action-cid>
   KARAOKE_STORE_ADDRESS=<your-contract-address>
   TABLELAND_PRIVATE_KEY=<table-owner-private-key>
   ```

4. **Run Processing**:
   ```bash
   bun run process-song --midi "../test-data/midi/Lorde - Royals/piano.mid" --song-id 1
   ```

### 3. Verify Upload

```bash
bun run verify-song --song-id 1
```

## Architecture Summary

```
MIDI File → Lit Encryption → Encrypted JSON → AIOZ Upload → CID → Tableland Update
    ↓             ↓                ↓              ↓           ↓
piano.mid   Access Control   {ciphertext,    IPFS Hash   stems: {
            (Action Only)     hash, ACL}                  piano: "Qm..."
                                                         }
```

## Key Points

1. **Encryption**: Only the MIDI Decryptor Lit Action can decrypt
2. **Storage**: Encrypted data stored on AIOZ (IPFS)
3. **Access Control**: Contract tracks who can access songs
4. **No Re-encryption**: Contract updates don't require re-encrypting files

## Next Steps

1. Deploy the MIDI Decryptor Action
2. Get AIOZ API credentials (if required)
3. Deploy contract to Base Sepolia
4. Run full processing flow
5. Test decryption via Lit Action