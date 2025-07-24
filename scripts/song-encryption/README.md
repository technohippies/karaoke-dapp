# Song Encryption Scripts

Scripts for encrypting song content (MIDI files and lyrics) with Lit Protocol.

## Scripts

### prepare-song.ts
Encrypts songs with Lit Protocol and uploads to IPFS.

```bash
# Single song
npx tsx prepare-song.ts <songId>

# All songs
npx tsx prepare-song.ts --all
```

### re-encrypt-songs.sh
Batch re-encryption after contract updates.

```bash
bash re-encrypt-songs.sh
```

## Workflow

1. Deploy new contract
2. Update KARAOKE_CONTRACT in .env
3. Run `re-encrypt-songs.sh`
4. Update Tableland with new CIDs from `data/encrypted/`

## Output

- Individual files: `data/encrypted/song-{id}.json`
- Summary: `data/encrypted/prepared-songs.json`

Each file contains IPFS CIDs for encrypted MIDI and lyrics.