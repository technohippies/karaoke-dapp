# E2E Test Wallet Setup

## Test Wallet Details

The test wallet uses a well-known seed phrase that generates the following address:
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Seed**: `test test test test test test test test test test test junk`

## Getting Base Sepolia ETH for Testing

To run purchase tests, you need Base Sepolia ETH. Here are your options:

### Option 1: Base Sepolia Faucets (Recommended)

1. **Coinbase Wallet Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Sign in with Coinbase account
   - Enter the test wallet address
   - Receive 0.05 ETH daily

2. **Alchemy Faucet**: https://www.alchemy.com/faucets/base-sepolia
   - Sign in with Alchemy account
   - Enter the test wallet address
   - Limited daily allowance

3. **QuickNode Faucet**: https://faucet.quicknode.com/base/sepolia
   - Requires QuickNode account
   - Enter the test wallet address

### Option 2: Bridge from Sepolia

1. Get Sepolia ETH from: https://sepoliafaucet.com/
2. Bridge to Base Sepolia using: https://bridge.base.org/

### Option 3: Use a Different Test Wallet

If you already have Base Sepolia ETH in another wallet:

1. Create a new wallet setup file (e.g., `funded.setup.ts`)
2. Use your funded wallet's seed phrase
3. Update the tests to use the new setup

## Running Purchase Tests

Before running purchase tests:

1. Ensure the test wallet has Base Sepolia ETH
2. The smart contract should be deployed on Base Sepolia
3. Song credits price should be reasonable for testing (e.g., 0.001 ETH)

## Mock Testing Alternative

For CI/CD or when faucets are unavailable, consider:
- Mocking the contract calls
- Using a local fork of Base Sepolia
- Creating a test mode that simulates purchases