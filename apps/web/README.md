# Karaoke Language Learning Web App

The frontend application for the decentralized karaoke language learning platform.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
bun run dev
```

## 🏗️ Architecture

### Technology Stack
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **RainbowKit** for wallet connections
- **wagmi** for Web3 interactions
- **i18next** for internationalization
- **IndexedDB** for offline storage

### Key Features

#### 🌐 Multilingual Support
- English, Mandarin (中文), Uyghur (ئۇيغۇرچە), and Tibetan (བོད་སྐད)
- Automatic language detection
- Persistent language preferences

#### 📚 Spaced Repetition System (SRS)
- FSRS algorithm implementation
- Progress tracking per line
- Study mode with individual line practice
- Review scheduling

#### 🎤 Karaoke Features
- Real-time MIDI playback
- Synchronized lyrics display
- AI-powered pronunciation scoring
- Voice recording and analysis

#### 💳 Credit System
- Voice credits for karaoke sessions
- Song credits for unlocking content
- USDC payment integration
- Transparent pricing

#### 🔐 Security & Privacy
- Lit Protocol content encryption
- Secure API key management
- PKP-signed scoring results
- No server-side user data storage

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components
│   ├── Header.tsx     # Main navigation
│   ├── StudyStats.tsx # SRS statistics
│   └── ...
├── pages/             # Route components
│   ├── HomePage.tsx   # Song catalog
│   ├── SongPage.tsx   # Song details/karaoke
│   ├── StudyPage.tsx  # SRS study mode
│   └── AccountPage.tsx # User account
├── services/          # Business logic
│   ├── database/      # Tableland integration
│   ├── integrations/  # External APIs
│   └── storage/       # Local storage
├── hooks/             # Custom React hooks
├── i18n/              # Translations
│   └── locales/       # Language files
└── constants.ts       # Configuration
```

## 🔧 Configuration

### Environment Variables

```bash
# Base Sepolia RPC endpoint
VITE_BASE_SEPOLIA_RPC=https://sepolia.base.org

# Contract addresses (MUST match encryption contract)
VITE_KARAOKE_CONTRACT_ADDRESS=0xc7D24B90C69c6F389fbC673987239f62F0869e3a
VITE_BASE_SEPOLIA_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Optional: Custom IPFS gateway
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud
```

## 🧪 Development

### Running Tests
```bash
bun test
```

### Building for Production
```bash
bun run build
```

### Code Quality
```bash
# Type checking
bun run type-check

# Linting
bun run lint
```

## 🎨 UI Components

The app uses a custom component library built on top of Radix UI:
- **Button**: Primary interactive element
- **BottomSheet**: Mobile-friendly overlays
- **Tabs**: Content organization
- **Progress**: Visual feedback

All components follow a consistent neutral theme with proper dark mode support.

## 🌍 Internationalization

Adding new translations:
1. Add translation keys to all locale files in `src/i18n/locales/`
2. Use the `useTranslation` hook in components
3. Follow the existing key structure

## 📱 Mobile Optimization

- Responsive design for all screen sizes
- Touch-optimized interactions
- Bottom sheet patterns for mobile
- Progressive Web App capabilities

## 🚀 Deployment

The app can be deployed to any static hosting service:

```bash
# Build the app
bun run build

# Preview locally
bun run preview

# Deploy (example with Vercel)
vercel --prod
```

## 🔄 After Contract Update

When the smart contract is updated:

1. **Update contract address** in `src/constants/contracts.ts`:
   ```typescript
   export const KARAOKE_CONTRACT_ADDRESS = '0xNEW_ADDRESS' as const
   ```

2. **Update ABI** if contract interface changed:
   ```bash
   # Copy from contracts/out/KaraokeSchool.sol/KaraokeSchool.json
   cp ../../contracts/out/KaraokeSchool.sol/KaraokeSchool.json src/constants/abi/
   ```

3. **Update environment variables**:
   - `.env`: `VITE_KARAOKE_CONTRACT_ADDRESS=0xNEW_ADDRESS`
   - `.env.example`: Update for other developers

4. **Clear browser cache** and IndexedDB to ensure fresh data

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPLv3).