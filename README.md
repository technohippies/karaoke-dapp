# Karaoke dApp

Fully decentralized karaoke platform on Base Sepolia. No servers, no centralized data storage.

## Decentralized Architecture

This is a **serverless, decentralized application**:
- No backend servers or centralized infrastructure
- Users control their own data via blockchain and IPFS
- Operates as a non-profit public good

## Copyright Notice

This project **cannot and does not host any copyrighted content**:

- **Lyrics**: Fetched directly by users from third-party APIs (LRCLIB). No intermediary servers.
- **Images**: Loaded directly in users' browsers from external sources (Genius API). No proxying or caching.
- **MIDI Files**: Repository contains only programmatically generated demo files. All user content is stored on decentralized networks (IPFS/Arweave).
- **Audio**: Generated programmatically from MIDI files, encrypted, and tracked for royalty distribution.

## Royalty Compliance

This platform operates in full compliance with music licensing regulations:
- **MLC Compliant**: Follows Mechanical Licensing Collective payout schedules and regulations
- **Royalty Tracking**: All usage is tracked on-chain for transparent royalty distribution
- **Automated Payouts**: Royalties distributed to confirmed addresses via DNS verification
- **Rights Holder Priority**: We actively ensure all relevant parties receive their entitled payouts

There is no centralized infrastructure to receive takedown requests - all content decisions are made by individual users.

## Requirements

- Node.js 18+
- Bun 1.1.0+

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

## Build

```bash
bun run build
```

## License

AGPL-3.0