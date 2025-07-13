# Karaoke Turbo Web App

A decentralized karaoke application powered by Lit Protocol PKP for secure voice grading.

## Setup

1. Install dependencies:
   ```bash
   cd apps/web
   bun install
   ```

2. Configure environment:
   - Update `LIT_RPC_URL` in `src/constants.ts` with your Infura/Alchemy key
   - Update `CAPACITY_DELEGATION_AUTH_SIG` in `src/App.tsx` with your delegation

3. Run development server:
   ```bash
   bun run dev
   ```

## Architecture

### State Management
Uses XState for predictable state management with the following flow:
1. **Disconnected** → Connect wallet
2. **Loading Data** → Fetch user credits and balances
3. **Signup/Buy Credits** → Purchase initial credits with USDC
4. **Song Selection** → Choose and unlock songs
5. **Karaoke Session** → Record, grade with Lit Protocol, claim refunds

### Lit Protocol Integration
- Connects to Yellowstone network
- Uses the secure voiceGrader Lit Action
- Verifies on-chain session before grading
- Returns PKP-signed results for contract verification

### Key Features
- **Secure Sessions**: On-chain session verification prevents abuse
- **Voice Grading**: Lit Action grades recordings and signs results
- **Credit System**: Escrow and refund unused credits
- **Song Unlocking**: Permanent song access with song credits

## Components

- **ConnectWallet**: Wallet connection interface
- **CreditPurchase**: USDC approval and credit purchase
- **SongSelection**: Browse and unlock songs
- **KaraokeSession**: Recording interface with Lit Protocol grading

## Contract Integration

Interacts with KaraokeStoreV5 at `0x91B69AC1Ac63C7CB850214d52b2f3d890FED557e` on Base Sepolia.

## Security

- Sessions must be started on-chain before recording
- Lit Action verifies session state before grading
- PKP signatures ensure tamper-proof results