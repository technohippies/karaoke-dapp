# Data Organization

## Structure

```
data/
├── raw/                    # Original unencrypted content
│   ├── midi/              # MIDI files by song ID
│   │   ├── 1/
│   │   └── 2/
│   └── translations/      # Translation files by song ID
│       ├── 1/
│       └── 2/
│
├── encrypted/             # Encrypted content (output from prepare-song.ts)
│   ├── song-1.json       # Contains midiCid, translationsCid, metadata
│   └── song-2.json
│
└── metadata.json         # Master metadata file with all song info
```

## Workflow

1. **Raw data** lives in `raw/midi/` and `raw/translations/`
2. **Encryption script** reads from raw, outputs to `encrypted/`
3. **Tableland scripts** read from `encrypted/` to insert/update

## Files

- `metadata.json` - Master list of all songs with their metadata
- `encrypted/song-{id}.json` - Encryption results with CIDs and access conditions
- `raw/` - Original content that gets encrypted