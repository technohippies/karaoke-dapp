# Karaoke Language Learning Dapp

A decentralized karaoke application that combines language learning with blockchain technology, using Lit Protocol for secure content encryption.

## 🎤 Features

- **Multi-language Support**: Interface available in English, Chinese (中文), Uyghur (ئۇيغۇرچە), and Tibetan (བོད་སྐད)
- **Spaced Repetition System (SRS)**: Learn lyrics efficiently using the FSRS algorithm
- **Encrypted Content**: Songs and translations protected via Lit Protocol
- **Web3 Authentication**: Connect with popular wallets including MetaMask, Coinbase, and JoyID
- **Voice & Song Credits**: Token-based access system
- **AI-Powered Feedback**: Real-time pronunciation scoring
- **Offline-First**: Local data persistence with IndexedDB

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Base Mainnet ETH for transactions
- USDC on Base Mainnet for purchasing credits

### Installation

```bash
# Clone the repository
git clone https://github.com/technohippies/karaoke-dapp.git
cd karaoke-dapp

# Install dependencies
bun install

# Set up environment variables
cd apps/web
cp .env.example .env
# Edit .env with your configuration

# Start development server
bun dev
```

### Environment Setup

Create `.env` file in `apps/web/`:

```bash
# For production deployment
# Copy values from .env.production or set:
VITE_DEFAULT_CHAIN_ID=8453
VITE_NETWORK_NAME=base-mainnet
VITE_KARAOKE_CONTRACT=0x00a4c373c8263A70b520880151fA39D323030B22
VITE_BASE_MAINNET_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
VITE_TABLELAND_CHAIN_ID=8453
VITE_SONGS_TABLE_NAME=karaoke_songs_8453_8453_25
```

For local development, create `.env.local` to override any settings.

## 📁 Project Structure

```
karaoke-dapp/
├── apps/
│   └── web/                 # React frontend application
│       ├── src/
│       │   ├── components/  # UI components
│       │   ├── pages/       # Route pages
│       │   ├── services/    # Business logic
│       │   ├── hooks/       # Custom React hooks
│       │   └── i18n/        # Translations
│       └── public/
├── contracts/               # Smart contracts
│   ├── src/                # Solidity contracts
│   └── script/             # Deployment scripts
├── lit-actions/            # Lit Protocol serverless functions
├── scripts/                # Utility scripts
├── tableland/              # Tableland database management
└── data/                   # Song content (gitignored)
```

## 🏗️ Architecture

### Smart Contracts

**KaraokeSchool** (`0x00a4c373c8263A70b520880151fA39D323030B22` on Base Mainnet)
- Manages voice and song credits
- Handles song unlocking mechanism
- Escrows credits during karaoke sessions
- Verifies PKP signatures for scoring

### Lit Protocol Integration

- **Content Encryption**: Songs, MIDI files, and translations encrypted via Lit Protocol
- **Access Control**: Only users who unlocked songs can decrypt content
- **Lit Actions**: 
  - Karaoke Scorer - Contains embedded API keys for Deepgram (STT) and OpenRouter (LLM)
  - Exercise - "Say It Back": Single line STT grading

### Database

- **IndexedDB**: Local storage for offline functionality
- **Tableland**: Decentralized SQL database for song metadata
- **IPFS (Pinata)**: Encrypted content storage

## 🛠️ Development

### Production Build

```bash
# Build frontend
cd apps/web
bun run build

# The app is deployed on Base Mainnet
# Current deployment:
# - Contract: 0x06AC258d391A5B2B6660d8d5Dee97507591376D0
# - Network: Base Mainnet (Chain ID: 8453)
# - Tableland: karaoke_songs_8453_8453_25
```

### Adding New Songs

1. Add MIDI and translation files to `data/raw/`
2. Update `data/metadata.json`
3. Run encryption script: `cd scripts && bun prepare-song.ts --id [songId]`
4. Deploy to Tableland: `cd tableland && bun add-song.ts`

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPLv3) - see the LICENSE file for details.

## 📚 Repository Access

This project is available on multiple platforms for redundancy and censorship resistance:

### Primary Repository
- **GitHub**: https://github.com/technohippies/karaoke-dapp.git

### Decentralized Mirrors
- **Radicle**: https://app.radicle.xyz/nodes/rosa.radicle.xyz/rad:zjAPSYMsctUsESkgc9XqTgcstWUH
- **Clone via Radicle**: `rad:zjAPSYMsctUsESkgc9XqTgcstWUH`

The Radicle repository serves as a decentralized, censorship-resistant mirror. Updates are automatically synced from GitHub with a slight delay. If the repository is removed from centralized platforms for any reason, or if access is restricted in your region, the full codebase remains permanently accessible through Radicle's peer-to-peer network.

## ⚖️ Legal Notice and Copyright Compliance

### Content Licensing
This platform operates in full compliance with copyright law and digital rights management:

- **Lyrics Content**: All copyrighted lyrics are dynamically loaded from LRCLIB's API. We do not host, store, or distribute any copyrighted lyrical content on our servers or in this repository.

- **Musical Works**: Our infrastructure does not host any copyrighted audio recordings or musical works. The platform uses only MIDI files representing musical notation data, not recorded performances.

- **Digital Rights Management**: Encrypted MIDI files are available for download (not streaming) only after completing an on-chain purchase transaction. This ensures proper licensing and royalty tracking.

- **Royalty Compliance**: All transactions are recorded on-chain with full transparency. Royalties are automatically calculated and reserved for rights holders according to Mechanical Licensing Collective (MLC) requirements and applicable copyright law.

- **Rights Holder Payments**: Smart contracts ensure appropriate royalties are separated and made available to verified rights holders through transparent on-chain mechanisms.

### Disclaimer
This software is provided as a decentralized platform for language learning karaoke. Users are responsible for ensuring their use of the platform complies with all applicable laws in their jurisdiction. The platform operators make no representations about content availability in any specific jurisdiction.

## 🙏 Acknowledgments

- Lit Protocol for content encryption
- RainbowKit for wallet connections
- Tableland for decentralized database
- Splits.org for payment splitting infrastructure
- Paradigm for Foundry/Forge development framework
- Base & Ethereum