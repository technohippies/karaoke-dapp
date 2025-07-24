# E2E Tests with Synpress and Playwright

This directory contains end-to-end tests for the Karaoke web application using Synpress (for Web3 testing) and Playwright.

## Setup

1. **Install dependencies** (already done if you ran `bun install`):
   ```bash
   bun add -D @synthetixio/synpress @playwright/test
   ```

2. **Install Playwright browsers**:
   ```bash
   bunx playwright install
   ```

3. **Build wallet cache** (REQUIRED before running tests):
   ```bash
   bun run test:e2e:build-cache
   ```
   This creates cached wallet setups to speed up test execution.

## Configuration

- **Private Key**: Tests use the same private key as defined in the root `.env` file
- **Wallet Password**: Set to `Tester@1234` in wallet setup files
- **Network**: Tests run on Base mainnet (chain ID: 8453)

## Running Tests

```bash
# Run all tests in headless mode
bun run test:e2e

# Run tests in headed mode (see browser)
bun run test:e2e:headed

# Run tests in UI mode (interactive)
bun run test:e2e:ui

# Debug tests
bun run test:e2e:debug

# Show test report
bun run test:e2e:report
```

## Test Structure

```
e2e/
├── wallet-setup/         # Wallet configurations
│   ├── basic.setup.ts    # Basic wallet with private key
│   └── connected.setup.ts # Pre-connected wallet
├── tests/                # Test files
│   ├── wallet-connection.spec.ts
│   ├── song-purchase.spec.ts
│   └── karaoke-scoring.spec.ts
├── utils/                # Test utilities
│   ├── test-helpers.ts   # Helper functions
│   └── constants.ts      # Test constants
└── fixtures/             # Custom test fixtures
    └── karaoke-fixtures.ts
```

## Test Flow

The tests cover the complete user journey:

1. **Wallet Connection**: Connect MetaMask to the app
2. **Credit Purchase**: Buy song/voice credits with USDC (includes approval)
3. **Song Unlock**: Unlock a song using song credits
4. **Content Decryption**: Sign for Lit Protocol to decrypt content
5. **Start Karaoke**: Begin karaoke session (deducts voice credits)
6. **Scoring**: Complete karaoke and receive AI-powered score

## Signatures Required

Each test may require multiple signatures:
- **USDC Approval**: ERC-20 approval for spending USDC
- **Purchase Transaction**: Buy credits from smart contract
- **Unlock Transaction**: Unlock specific song
- **Lit Protocol SIWE**: Sign-in with Ethereum for decryption
- **Start Karaoke Transaction**: Deduct voice credits
- **Scoring SIWE**: Sign for AI scoring via Lit Action

## Tips

1. **First Run**: The first test run will be slower as it builds browser caches
2. **Wallet State**: Each test starts with a fresh wallet state from the setup
3. **Network**: Ensure you're testing against the correct network (Base mainnet)
4. **Debugging**: Use `page.pause()` in tests to debug step by step

## Common Issues

1. **Cache not found**: Run `bun run test:e2e:build-cache` first
2. **Timeouts**: Increase timeouts in `playwright.config.ts` for slower connections
3. **Wallet not connecting**: Ensure MetaMask extension is properly installed
4. **Private key mismatch**: Verify the root `.env` file has the correct `PRIVATE_KEY`