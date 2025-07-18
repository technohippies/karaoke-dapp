# Karaoke Language Learning Dapp

A decentralized karaoke application that combines language learning with blockchain technology, built with Lit Protocol for secure content encryption and Web3Auth for authentication.

## 🎤 Features

- **Multilingual Support**: UI available in English, Mandarin (中文), Uyghur (ئۇيغۇرچە), and Tibetan (བོད་སྐད)
- **Spaced Repetition System (SRS)**: Learn lyrics efficiently with FSRS algorithm
- **Encrypted Content**: Songs and translations secured with Lit Protocol
- **Web3 Authentication**: Social login via Web3Auth
- **Voice & Song Credits**: Token-based access system
- **AI-Powered Feedback**: Real-time pronunciation scoring
- **Offline-First**: IndexedDB for local data persistence

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Base Sepolia testnet ETH
- USDC on Base Sepolia for purchasing credits

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/karaoke-dapp.git
cd karaoke-dapp

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
cd apps/web
bun dev
```

### Environment Setup

Create a `.env` file in the project root:

```bash
# Required for development
VITE_BASE_SEPOLIA_RPC=https://sepolia.base.org
VITE_KARAOKE_CONTRACT_ADDRESS=0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d

# Required for content encryption (scripts)
DEEPGRAM_API_KEY=your_deepgram_api_key  # For speech-to-text in Lit Actions
OPENROUTER_API_KEY=your_openrouter_api_key  # For LLM scoring in Lit Actions
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret
PRIVATE_KEY=your_deployer_private_key
```

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

**KaraokeSchool** (`0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d`)
- Manages voice and song credits
- Handles song unlocking mechanism
- Escrows credits during karaoke sessions
- Verifies PKP signatures for scoring

### Lit Protocol Integration

- **Content Encryption**: Songs, MIDI files, and translations are encrypted using Lit Protocol
- **Access Control**: Only users who have unlocked songs can decrypt content
- **PKP Scoring**: Secure, tamper-proof scoring using Programmable Key Pairs
- **Lit Actions**: 
  - Karaoke Scorer: Contains embedded API keys for Deepgram (STT) and OpenRouter (LLM)
  - Single Line Scorer: For Study Mode pronunciation practice
  
**Note**: Lit Actions use simple access conditions (always true) for API key decryption, making them independent of contract changes.

### Database

- **IndexedDB**: Local storage for offline functionality
- **Tableland**: Decentralized SQL database for song metadata
- **IPFS (Pinata)**: Encrypted content storage

## 🎮 User Flow

1. **Connect Wallet**: Web3Auth social login or wallet connection
2. **Purchase Credits**: Buy song and voice credits with USDC
3. **Browse Songs**: View available songs in the catalog
4. **Unlock Songs**: Spend song credits to access content
5. **Study Mode**: Practice individual lines with SRS
6. **Karaoke Mode**: Full song performance with AI scoring
7. **Review Progress**: Track learning statistics and streaks

## 🔒 Security Considerations

- **No API Keys in Code**: All sensitive keys must be in `.env` files
- **Encrypted Storage**: All content is encrypted before IPFS upload
- **Access Control**: Smart contract verification for content access
- **PKP Verification**: Tamper-proof scoring through Lit Protocol

## 🛠️ Development

### Running Tests

```bash
# Run contract tests
cd contracts
forge test

# Run frontend tests
cd apps/web
bun test
```

### Building for Production

```bash
# Build frontend
cd apps/web
bun run build

# Deploy contracts
cd contracts
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast

# After deployment, update references:
# 1. Update contract address in apps/web/src/constants/contracts.ts
# 2. Update .env (KARAOKE_CONTRACT and VITE_KARAOKE_CONTRACT)
# 3. Extract and update ABI:
cat out/KaraokeSchool.sol/KaraokeSchool.json | python3 -c "import json, sys; print(json.dumps(json.load(sys.stdin)['abi'], indent=2))" > ../apps/web/src/constants/abi/KaraokeSchool.json

# ⚠️ IMPORTANT: See CONTRACT_UPDATE_GUIDE.md for full update process including Lit Protocol considerations
```

### Adding New Songs

1. Add MIDI and translation files to `data/raw/`
2. Update `data/metadata.json`
3. Run encryption script: `cd scripts && bun prepare-song.ts --id [songId]`
4. Deploy to Tableland: `cd tableland && bun add-song.ts`

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Add proper error handling
- Include loading states
- Ensure mobile responsiveness

## 🌐 Deployment

The application is deployed on:
- Frontend: [Your deployment URL]
- Contracts: Base Sepolia testnet

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPLv3) - see the LICENSE file for details.

## ⚠️ Important Notes

- This is a testnet application - use only test tokens
- Never commit `.env` files or API keys
- Always encrypt sensitive content before storage
- Test thoroughly on testnet before mainnet deployment

## 📚 Repository Access

This project is available on multiple platforms for redundancy and censorship resistance:

### Primary Repository
- **GitHub**: https://github.com/technohippies/karaoke-dapp.git

### Decentralized Mirror
- **Radicle**: https://app.radicle.xyz/nodes/rosa.radicle.xyz/rad:zjAPSYMsctUsESkgc9XqTgcstWUH
- **Clone via Radicle**: `rad:zjAPSYMsctUsESkgc9XqTgcstWUH`

The Radicle repository serves as a decentralized, censorship-resistant mirror. Updates are automatically synchronized from GitHub with a slight delay. If the repository is removed from centralized platforms for any reason, or if you're in a region with restricted access, the complete codebase will remain permanently accessible through Radicle's peer-to-peer network.

## ⚖️ Legal Notice & Copyright Compliance

### Content Licensing
This platform operates in full compliance with copyright law and digital rights management:

- **Lyrics Content**: All copyrighted lyrics are dynamically loaded from LRCLIB's API. We do not host, store, or distribute any copyrighted lyrical content on our servers or in this repository.

- **Musical Compositions**: No copyrighted audio recordings or musical compositions are hosted on our infrastructure. The platform utilizes MIDI files which represent musical notation data only, not recorded performances.

- **Digital Rights Management**: Encrypted MIDI files are made available for download (not streaming) exclusively after an on-chain purchase transaction is completed. This ensures proper licensing and royalty tracking.

- **Royalty Compliance**: All transactions are recorded on-chain with complete transparency. Royalties are automatically calculated and reserved for rights holders in accordance with Mechanical Licensing Collective (MLC) requirements and applicable copyright law.

- **Rights Holder Payments**: Smart contracts ensure that appropriate royalties are segregated and made available to verified rights holders through transparent on-chain mechanisms.

### Disclaimer
This software is provided as a decentralized platform for language learning through karaoke. Users are responsible for ensuring their use of the platform complies with all applicable laws in their jurisdiction. The platform operators make no representations regarding the availability of content in any particular jurisdiction.

## 🙏 Acknowledgments

- Lit Protocol for content encryption
- Web3Auth for authentication
- Tableland for decentralized database
- Base for L2 infrastructure
- Splits.org for payment splitting infrastructure
- Paradigm for Foundry/Forge development framework