# Tableland Management Scripts

## Setup

1. Create tables using Tableland Studio GUI
2. Update `.env` with table names:
   ```
   TABLELAND_SONGS_TABLE=songs_v5_84532_24
   TABLELAND_PURCHASES_TABLE=purchases_v1_84532_117
   ```

## Usage

### Update Songs
```bash
# Add MIDI files to data/midi/
# Update data/songs.json with metadata
bun run update-songs
```

### Workflow
1. Deploy contracts: `bun run deploy:contracts`
2. Deploy Lit Actions: `bun run deploy:lit`
3. Update songs: `bun run update:songs`

## Data Structure

- `data/midi/` - Raw MIDI files
- `data/encrypted/` - Encrypted MIDIs (local storage for MVP)
- `data/songs.json` - Song metadata

In production, encrypted MIDIs would be stored on IPFS/AIOZ.