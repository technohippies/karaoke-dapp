---
description: Development setup guide for Karaoke Turbo including environment configuration, project structure, and common development tasks.
---

# Getting Started Guide

Welcome to Karaoke Turbo development! This guide will help you set up the project locally and understand the development workflow.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-repo/karaoke-turbo
cd karaoke-turbo/karaoke-dapp

# Install dependencies
bun install

# Start development server
bun run dev
```

## Prerequisites

### Required Software

- **Node.js** 18+ or **Bun** (recommended)
- **Git** for version control
- **MetaMask** or compatible Web3 wallet
- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier

### Recommended Setup

- **Base Sepolia ETH** for testing transactions
- **USDC on Base Sepolia** for testing purchases
- **Lit Protocol** test account

## Environment Configuration

Create a `.env` file in the `karaoke-dapp` directory:

```env
# Lit Protocol Configuration
LIT_NETWORK=datil
MIDI_DECRYPTOR_ACTION_CID=QmYourActionCID

# Smart Contract
KARAOKE_STORE_ADDRESS=0xYourContractAddress

# Storage Configuration
AIOZ_API_URL=https://premium.aiozpin.network
AIOZ_GATEWAY_URL=https://premium.w3q.link

# Database (for deployment scripts)
TABLELAND_PRIVATE_KEY=0xYourPrivateKey

# Network Configuration
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org

# Development
NODE_ENV=development
VITE_APP_NAME=Karaoke Turbo
```

## Development Workflow

### 1. Start the Development Server

```bash
bun run dev
```

This starts:
- Vite development server on `http://localhost:5173`
- Hot module replacement
- TypeScript type checking

### 2. Run Storybook (Optional)

```bash
bun run storybook
```

Access component stories at `http://localhost:6006`

### 3. Testing

```bash
# Run all tests
bun test

# Run with watch mode
bun test --watch

# Run specific test file
bun test packages/services/database.test.ts
```

### 4. Linting and Formatting

```bash
# Check linting
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format
```

## Project Structure

Understanding the codebase organization:

```
karaoke-dapp/
├── apps/
│   ├── web/              # Main React application
│   │   ├── src/
│   │   │   ├── components/   # App-specific components
│   │   │   ├── pages/        # Route components
│   │   │   ├── services/     # App-specific services
│   │   │   ├── machines/     # XState state machines
│   │   │   ├── contexts/     # React contexts
│   │   │   └── utils/        # Utility functions
│   │   └── public/           # Static assets
│   └── storybook/        # Component documentation
├── packages/
│   ├── ui/               # Shared UI components
│   ├── services/         # Business logic
│   ├── db/               # Database utilities
│   ├── contracts/        # Smart contracts
│   └── utils/            # Shared utilities
└── docs/                 # This documentation
```

## Key Development Concepts

### State Management with XState

The app uses XState for complex state management:

```typescript
// Example: Song state machine
const songMachine = createMachine({
  initial: 'idle',
  states: {
    idle: {
      on: { CHECK_ACCESS: 'checkingAccess' }
    },
    checkingAccess: {
      invoke: {
        src: 'checkAccess',
        onDone: 'purchased',
        onError: 'error'
      }
    }
    // ... more states
  }
})
```

### Audio Context Management

Audio features are managed through React context:

```typescript
const { loadMidi, play, pause, currentTime } = useAudio()
```

### Web3 Integration

Using Wagmi for blockchain interactions:

```typescript
const { isConnected, address } = useAccount()
const { connect } = useConnect()
```

## Common Development Tasks

### Adding a New Component

1. Create component in appropriate package:
   ```bash
   # For shared components
   packages/ui/src/components/

   # For app-specific components  
   apps/web/src/components/
   ```

2. Write the component with TypeScript:
   ```typescript
   interface MyComponentProps {
     title: string
     onClick: () => void
   }

   export function MyComponent({ title, onClick }: MyComponentProps) {
     return <button onClick={onClick}>{title}</button>
   }
   ```

3. Add Storybook story (for UI components):
   ```typescript
   export default {
     title: 'Components/MyComponent',
     component: MyComponent,
   }

   export const Default = {
     args: {
       title: 'Click me',
       onClick: () => console.log('clicked'),
     },
   }
   ```

4. Export from package index:
   ```typescript
   export { MyComponent } from './components/my-component'
   ```

### Adding a New Service

1. Create service class:
   ```typescript
   export class MyService {
     async doSomething(): Promise<Result> {
       // Implementation
     }
   }
   ```

2. Add tests:
   ```typescript
   describe('MyService', () => {
     it('should do something', async () => {
       const service = new MyService()
       const result = await service.doSomething()
       expect(result).toBeDefined()
     })
   })
   ```

3. Update package exports

### Working with State Machines

1. Define machine states and events:
   ```typescript
   type MyEvent = 
     | { type: 'START' }
     | { type: 'COMPLETE'; data: any }
   ```

2. Create machine:
   ```typescript
   const myMachine = createMachine({
     types: {} as { events: MyEvent },
     // ... machine definition
   })
   ```

3. Use in component:
   ```typescript
   const [state, send] = useMachine(myMachine)
   ```

## Debugging Tips

### Common Issues

1. **Module not found**: Check package dependencies in `package.json`
2. **Type errors**: Ensure proper TypeScript configuration
3. **Wallet connection**: Verify network configuration
4. **Audio issues**: Check browser permissions

### Development Tools

- **React DevTools**: Component inspection
- **XState DevTools**: State machine visualization
- **Browser DevTools**: Network and console debugging
- **Vite DevTools**: Build analysis

## Building for Production

```bash
# Build all packages
bun run build

# Preview production build
bun run preview
```

## Next Steps

- [Deployment Guide](/guides/deployment) - Deploy to production
- [Testing Guide](/guides/testing) - Comprehensive testing strategies
- [Architecture Overview](/architecture/) - Understand system design
- [API Reference](/api/) - Service documentation