---
description: Monorepo package organization including UI components, services, database utilities, smart contracts, and Lit Protocol actions.
---

# Packages Overview

The Karaoke Turbo project is organized as a monorepo with several focused packages that handle different aspects of the platform.

## Package Structure

```
packages/
├── ui/              # Shared UI components
├── services/        # Business logic and external integrations  
├── db/              # Database utilities and IndexedDB
├── contracts/       # Smart contracts (Solidity)
├── lit-actions/     # Lit Protocol actions
├── utils/           # Shared utility functions
└── eslint-config/   # Shared linting configuration
```

## Core Packages

### UI Components (`@karaoke-dapp/ui`)

Reusable React components built with Tailwind CSS and Radix UI primitives.

**Key Components:**
- `KaraokeDisplay` - Main karaoke interface with lyrics and countdown
- `KaraokeScore` - Performance results and scoring
- `PurchaseSlider` - Song purchase interface
- `ConnectWalletSheet` - Web3 wallet connection
- `MicrophonePermission` - Audio permission handling

**Features:**
- TypeScript support
- Storybook integration
- Tailwind CSS styling
- Accessible by default

### Services (`@karaoke-dapp/services`)

Business logic and external service integrations.

**Key Services:**
- `DatabaseService` - Song metadata and user data
- `EncryptionService` - Lit Protocol integration
- `AiozUploadService` - Decentralized storage uploads

**Browser Services:**
- Local storage management
- IndexedDB operations
- Cache strategies

### Database (`@karaoke-dapp/db`)

Database utilities for both local and decentralized storage.

**Components:**
- `idb.ts` - IndexedDB wrapper for local caching
- `tableland.ts` - Tableland database operations
- `cid-tracker.ts` - Content addressing utilities

### Smart Contracts (`@karaoke-dapp/contracts`)

Solidity contracts for the on-chain components.

**Main Contracts:**
- `KaraokeStore_V0_1_0.sol` - Credit system and access control
- Deployment scripts for Base network
- Integration with USDC token

### Lit Actions (`@karaoke-dapp/lit-actions`)

Programmable cryptography actions for the Lit Protocol.

**Actions:**
- MIDI decryption for purchased songs
- Session signature validation
- Access control enforcement

### Utilities (`@karaoke-dapp/utils`)

Shared utility functions used across packages.

**Common Utilities:**
- Type definitions
- Helper functions
- Constants and configuration

## Package Dependencies

<Mermaid>
<pre>
graph TD
    A[apps/web] --> B[packages/ui]
    A --> C[packages/services]
    A --> D[packages/db]
    B --> E[packages/utils]
    C --> E
    C --> F[packages/contracts]
    C --> G[packages/lit-actions]
    D --> E
</pre>
</Mermaid>

## Development Workflow

### Building Packages

```bash
# Build all packages
bun run build

# Build specific package
bun run build --filter=@karaoke-dapp/ui
```

### Testing

```bash
# Run all tests
bun test

# Test specific package
bun test packages/services
```

### Storybook

UI components are documented and tested in Storybook:

```bash
bun run storybook
```

## Package.json Scripts

Each package includes standardized scripts:

- `build` - TypeScript compilation
- `dev` - Development mode with watch
- `test` - Unit tests
- `lint` - ESLint checking
- `typecheck` - TypeScript validation

## Inter-Package Communication

Packages communicate through well-defined TypeScript interfaces:

```typescript
// Example: UI component using services
import { DatabaseService } from '@karaoke-dapp/services'
import type { Song } from '@karaoke-dapp/utils'

export function SongCard({ songId }: { songId: number }) {
  const [song, setSong] = useState<Song | null>(null)
  
  useEffect(() => {
    const db = new DatabaseService()
    db.getSong(songId).then(setSong)
  }, [songId])
  
  // ... component logic
}
```

## Adding New Packages

To add a new package:

1. Create directory in `packages/`
2. Add `package.json` with workspace dependencies
3. Configure TypeScript with appropriate references
4. Update root `turbo.json` for build pipeline
5. Add to relevant documentation