---
description: Complete environment setup guide covering development environment configuration, required services, API keys, and deployment preparation for Karaoke Turbo.
---

# Environment Setup Guide

This comprehensive guide covers setting up your development environment for the Karaoke Turbo platform, including all required services, API keys, and configuration.

## Prerequisites

### System Requirements

- **Node.js**: Version 18+ (recommended: use Node 20)
- **Bun**: Latest version (1.0+) as package manager
- **Git**: For version control
- **Browser**: Chrome/Chromium for testing (MetaMask support)

### Development Tools

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
node --version
```

## Environment Variables

### Required Variables

Create `.env` file in the project root with these required variables:

```env
# Blockchain Configuration
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org

# Smart Contracts  
KARAOKE_STORE_ADDRESS=0x306466a909df4dc0508b68b4511bcf8130abcb43

# Lit Protocol Configuration
LIT_NETWORK=datil
MIDI_DECRYPTOR_ACTION_CID=QmYourActionCIDHere
LIT_PKP_PUBLIC_KEY=0x04YourPKPPublicKeyHere
LIT_PKP_ETH_ADDRESS=0xYourPKPEthAddressHere

# AIOZ Network (IPFS)
AIOZ_API_URL=https://premium.aiozpin.network
AIOZ_API_KEY=your-aioz-api-key-optional

# Tableland Database
TABLELAND_PRIVATE_KEY=0xYourTablelandPrivateKeyHere

# Development
NODE_ENV=development
VITE_DEV_MODE=true
```

### Environment Templates

The project provides template files:

- **`.env.example`**: Complete example with all variables
- **`.env.test`**: Test environment configuration  
- **`.env.local.example`**: Local development overrides

### Variable Descriptions

#### Blockchain Configuration

```env
# Base Sepolia testnet
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org

# Alternative RPC endpoints (if needed)
# RPC_URL=https://base-sepolia.g.alchemy.com/v2/your-key
# RPC_URL=https://sepolia.base.org
```

#### Smart Contract Addresses

```env
# Main karaoke store contract
KARAOKE_STORE_ADDRESS=0x306466a909df4dc0508b68b4511bcf8130abcb43

# USDC token on Base Sepolia
USDC_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Optional: Override default addresses for testing
# KARAOKE_STORE_ADDRESS=0xYourTestContractAddress
```

#### Lit Protocol Configuration

```env
# Network selection (datil for testnet)
LIT_NETWORK=datil

# MIDI decryption action (deployed to IPFS)
MIDI_DECRYPTOR_ACTION_CID=QmYourMIDIDecryptorActionCID

# PKP (Programmable Key Pair) for access control
LIT_PKP_PUBLIC_KEY=0x04PublicKeyForYourPKPHere
LIT_PKP_ETH_ADDRESS=0xEthereumAddressForYourPKPHere

# Optional: PKP token ID for advanced usage
# LIT_PKP_TOKEN_ID=123456
```

#### AIOZ Network (IPFS)

```env
# AIOZ Network endpoint
AIOZ_API_URL=https://premium.aiozpin.network

# Optional: API key for premium features
AIOZ_API_KEY=your-premium-api-key

# Fallback IPFS gateway
IPFS_GATEWAY_URL=https://gateway.pinata.cloud
```

#### Database Configuration

```env
# Private key for Tableland operations (separate from main wallet)
TABLELAND_PRIVATE_KEY=0xPrivateKeyForTablelandOperations

# Table names (auto-discovered, but can override)
SONGS_TABLE_NAME=songs_v7_84532_132
PURCHASES_TABLE_NAME=purchases_v1_84532_117
```

## Service Setup

### 1. Base Sepolia Network

**Network Details:**
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia.basescan.org
- **Faucet**: [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

**Setup Steps:**
1. Add Base Sepolia to MetaMask
2. Get testnet ETH from faucet
3. Get testnet USDC from [Circle Faucet](https://faucet.circle.com/)

### 2. Lit Protocol

**Network**: Datil (testnet)  
**Documentation**: [Lit Protocol Docs](https://developer.litprotocol.com/)

**Setup Process:**

```bash
# Deploy MIDI decryption action
bun run deploy-midi-decryptor

# This will output:
# ✅ Action deployed to IPFS: QmYourActionCIDHere
# Add this CID to your .env file as MIDI_DECRYPTOR_ACTION_CID
```

**PKP Requirements:**
- Generate PKP through Lit Protocol dashboard
- Fund PKP address with small amount of ETH
- Add PKP public key and address to environment

### 3. AIOZ Network (IPFS)

**Network**: AIOZ Network premium IPFS  
**Documentation**: [AIOZ Network Docs](https://docs.aioz.network/)

**Setup Options:**

**Option A: Free Tier**
```env
AIOZ_API_URL=https://premium.aiozpin.network
# No API key needed for basic usage
```

**Option B: Premium Tier**
1. Sign up at [AIOZ Network](https://aioz.network/)
2. Get API key from dashboard
3. Add to environment variables

### 4. Tableland Database

**Network**: Base Sepolia  
**Documentation**: [Tableland Docs](https://docs.tableland.xyz/)

**Setup Process:**

```bash
# Deploy songs table
bun run deploy-songs-table

# This will create tables and output table names
# Add table names to environment if needed
```

**Private Key Setup:**
1. Create dedicated wallet for Tableland operations
2. Fund with small amount of ETH for gas
3. Add private key to `.env`

## Development Wallet Setup

### MetaMask Configuration

**Network Setup:**
1. Open MetaMask
2. Add Custom Network:
   - **Network Name**: Base Sepolia
   - **RPC URL**: https://sepolia.base.org
   - **Chain ID**: 84532
   - **Currency Symbol**: ETH
   - **Block Explorer**: https://sepolia.basescan.org

### Test Funds

**Get ETH for Gas:**
1. Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
2. Connect wallet and request ETH
3. Wait for transaction confirmation

**Get USDC for Testing:**
1. Visit [Circle USDC Faucet](https://faucet.circle.com/)
2. Select Base Sepolia network
3. Request USDC tokens
4. Import USDC token in MetaMask:
   - **Contract Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - **Symbol**: USDC
   - **Decimals**: 6

## Local Development Setup

### Step-by-Step Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/karaoke-turbo.git
cd karaoke-turbo

# 2. Install dependencies
bun install

# 3. Copy environment template
cp .env.example .env

# 4. Edit environment variables
# Add your API keys and addresses to .env

# 5. Verify environment
bun run validate:env

# 6. Start development server
bun run dev
```

### Environment Validation

```bash
# Check all environment variables
bun run validate:env

# Test network connectivity
bun run test-integration

# Verify contract access
bun run test-contracts
```

**Expected Output:**
```bash
✅ Environment Validation
   - All required variables present
   - Base Sepolia connectivity confirmed
   - Smart contract accessible
   - Lit Protocol network available
   - AIOZ Network responsive
   - Tableland tables accessible
```

## Service Configuration

### Vite Configuration

The web app uses Vite with environment variable injection:

```typescript
// apps/web/vite.config.ts
export default defineConfig({
  define: {
    'process.env.CHAIN_ID': JSON.stringify(process.env.CHAIN_ID),
    'process.env.RPC_URL': JSON.stringify(process.env.RPC_URL),
    // ... other variables
  }
})
```

### TypeScript Environment

Environment variables are typed for better development experience:

```typescript
// packages/utils/src/env.ts
interface Environment {
  CHAIN_ID: string
  RPC_URL: string
  KARAOKE_STORE_ADDRESS: string
  LIT_NETWORK: 'datil' | 'serrano' | 'manzano'
  MIDI_DECRYPTOR_ACTION_CID: string
  // ... other variables
}

export const env: Environment = {
  CHAIN_ID: process.env.CHAIN_ID!,
  RPC_URL: process.env.RPC_URL!,
  // ... validate and parse environment
}
```

## Testing Environment

### E2E Test Configuration

Playwright tests require additional environment setup:

```env
# .env.test
# Extends .env with test-specific overrides

# Test wallet configuration
TEST_WALLET_PRIVATE_KEY=0xTestWalletPrivateKeyHere
TEST_WALLET_ADDRESS=0xTestWalletAddressHere

# Test data
TEST_SONG_ID=1
TEST_USER_ADDRESS=0xTestUserAddressHere

# Browser testing
HEADLESS=false
SLOW_MO=100
```

### Test Data Setup

```bash
# Set up test environment
bun run setup:test-env

# Fund test wallets
bun run fund-test-wallets

# Verify test setup
bun run test:e2e --dry-run
```

## Production Environment

### Environment Differences

**Development vs Production:**

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `LIT_NETWORK` | `datil` | `manzano` |
| `CHAIN_ID` | `84532` (Sepolia) | `8453` (Mainnet) |
| `RPC_URL` | Testnet endpoint | Mainnet endpoint |

### Production Checklist

- [ ] Switch to mainnet contract addresses
- [ ] Update Lit Protocol network to `manzano`
- [ ] Use production RPC endpoints
- [ ] Secure API key management
- [ ] Enable error monitoring
- [ ] Configure CDN for static assets

## Security Considerations

### API Key Management

**Development:**
- Store keys in `.env` file (gitignored)
- Use separate keys for each developer
- Rotate keys regularly

**Production:**
- Use environment variable injection
- Implement key rotation policies
- Monitor key usage and access

### Private Key Security

**Best Practices:**
1. **Separate Keys**: Use different keys for different purposes
2. **Minimal Permissions**: Grant only necessary permissions
3. **Key Rotation**: Rotate keys periodically
4. **Secure Storage**: Use secure key management systems

**Never:**
- Commit private keys to version control
- Share private keys in plain text
- Use production keys in development

## Troubleshooting

### Common Issues

**Environment Variable Issues:**
```bash
# Check if variables are loaded
bun run validate:env

# Debug specific variable
echo $CHAIN_ID
```

**Network Connectivity:**
```bash
# Test Base Sepolia connection
curl -X POST https://sepolia.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

**Contract Access:**
```bash
# Test contract interaction
bun run test-contracts

# Check contract on explorer
open https://sepolia.basescan.org/address/0x306466a909df4dc0508b68b4511bcf8130abcb43
```

### Getting Help

**Resources:**
- **Documentation**: This comprehensive guide
- **Example Configs**: `.env.example` and related templates
- **Integration Tests**: Run `bun run test-integration`
- **Community**: Discord/GitHub for community support

**Debug Commands:**
```bash
# Full system health check
bun run health:check

# Network diagnostics
bun run debug:network

# Service connectivity
bun run debug:services
```