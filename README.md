# Lit Protocol PKP Voice Grader

This project implements a secure PKP-based voice grading system for a karaoke dapp using Lit Protocol. The implementation uses Unix timestamp seconds for nonces to avoid JavaScript number precision issues.

## Project Structure

- `/scripts` - Setup and testing scripts for Lit Protocol
- `/lit-actions` - Lit Action code for voice grading
- `/apps/web` - React frontend for the karaoke application

## Architecture

- **Dapp Owner**: Owns the PKP and controls what it can sign
- **Users**: Create regular sessions to execute the Lit Action
- **Lit Action**: Has permission to sign with the PKP, validates all inputs
- **Smart Contract**: Verifies PKP signatures for refunds

## Setup Steps

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your private key:

```bash
cp .env.example .env
# Edit .env and add your Chronicle Yellowstone private key
```

### 3. Upload Lit Action to IPFS

```bash
bun run upload-action
```

Add the returned CID to your `.env` file as `LIT_ACTION_CID`.

### 4. Mint Capacity Credits

```bash
bun run mint-capacity
```

This will:
- Mint Capacity Credits NFT for rate-limited access
- Configure 100 requests/minute for 1 day (adjustable in script)
- Create a delegation auth sig that any address can use
- Output the NFT ID and delegation to add to `.env`

### 5. Mint PKP (Dapp Owner Only)

```bash
bun run mint-pkp
```

This will:
- Mint a new PKP on Chronicle Yellowstone
- Add your wallet AND the Lit Action as permitted auth methods
- Configure both with signing permissions from the start
- Make the PKP self-owned (secure, immutable)
- Output the PKP details to add to `.env`

### 6. Test the Setup

```bash
bun run test-action
```

This simulates a user:
- Creating a regular session (with their own wallet)
- Executing the Lit Action
- Getting a PKP-signed response

## Security Model

1. **Users never get direct PKP access** - They can only trigger signatures through your Lit Action
2. **Lit Action validates everything** - Session tokens, audio data, credit calculations
3. **Controlled signing** - PKP only signs the exact message format your contract expects
4. **No delegation needed** - Users use their own wallets for sessions

## Production Checklist

- [ ] Fund your Chronicle Yellowstone wallet with LIT tokens
- [ ] Mint PKP and save credentials securely
- [ ] Upload Lit Action and verify CID
- [ ] Add permissions for Lit Action
- [ ] Test with multiple user wallets
- [ ] Deploy contract with PKP address
- [ ] Update contract address in Lit Action params

## Files

- `scripts/mint-pkp.ts` - Mints a new PKP with all permissions configured
- `scripts/mint-capacity-credits.ts` - Mints Capacity Credits NFT for rate-limited access
- `scripts/upload-action.ts` - Uploads Lit Action to IPFS
- `scripts/test-action.ts` - Tests the full flow
- `lit-actions/voiceGrader.js` - The Lit Action code

## Running the Web App

1. Install dependencies:
   ```bash
   bun install
   ```

2. Configure the web app:
   ```bash
   cd apps/web
   cp .env.example .env
   # Edit .env with your RPC URL and capacity delegation
   ```

3. Start the development server:
   ```bash
   bun run dev:web
   ```

4. Open http://localhost:3000 in your browser

## Technical Notes

- **Nonce Generation**: Uses `Math.floor(Date.now() / 1000)` for Unix seconds instead of milliseconds to avoid Lit Action signing failures
- **PKP Address**: 0xBc2296278633Cf8946321e94E0B71912315792a4
- **Working Lit Action CID**: QmcGpHHeMxXaQBPzLgFUxWkwgkRKJoX3YY5vLf41EvitLw
- **Contract**: 0x91B69AC1Ac63C7CB850214d52b2f3d890FED557e on Base Sepolia
- **Secure Lit Action**: `voiceGrader-secure.js` includes on-chain session verification