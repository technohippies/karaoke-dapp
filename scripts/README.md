# Scripts Directory

Utility scripts organized by function.

## Structure

### /song-encryption
Scripts for encrypting song content with Lit Protocol:
- `prepare-song.ts` - Encrypt songs and upload to IPFS
- `re-encrypt-songs.sh` - Batch re-encryption after contract updates

## Setup

Each subdirectory has its own dependencies. Navigate to the specific folder and run:
```bash
npm install
```

## Related Directories

- `/tableland` - Database operations
- `/contracts` - Smart contract deployment
- `/lit-actions` - Lit Protocol actions and tools
- `/data` - Source data and encrypted outputs