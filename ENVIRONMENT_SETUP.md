# Environment Setup Guide

This guide explains how to manage different deployment environments for the Lit Test dApp.

## Environment Configuration

The project supports multiple deployment environments:
- **Local Development**: Optimism Sepolia (testnet)
- **Production**: Base Mainnet

### Environment Files

- `.env.local` - Configuration for local development (Optimism Sepolia)
- `.env.production` - Configuration for production (Base Mainnet)
- `.env` - Active configuration (copy from `.env.local` or `.env.production`)

### Key Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_DEFAULT_CHAIN_ID` | Default blockchain network | `11155420` (Optimism Sepolia) |
| `VITE_NETWORK_NAME` | Network identifier | `optimism-sepolia` |
| `VITE_KARAOKE_CONTRACT` | Deployed contract address | `0xc7D24B90C69c6F389fbC673987239f62F0869e3a` |
| `VITE_SONGS_TABLE_NAME` | Tableland table name | `karaoke_songs_11155420_11155420_181` |
| `VITE_ENABLE_TESTNET_FEATURES` | Enable testnet features | `true` or `false` |

## Switching Environments

### Local Development (Optimism Sepolia)
```bash
# Copy local environment configuration
cp .env.local .env

# Start development server
bun run dev
```

### Production Build (Base Mainnet)
```bash
# Copy production environment configuration
cp .env.production .env

# Build for production
bun run build
```

## Network Configuration

The app uses a centralized network configuration at `apps/web/src/config/networks.config.ts`:

```typescript
// Automatically loads configuration based on VITE_NETWORK_NAME
import { currentNetwork } from './config/networks.config'

// Use in components
const contractAddress = currentNetwork.contracts.karaoke
const chainId = currentNetwork.chainId
```

## Contract Deployments

### Base Sepolia (Local Development)
- Contract: `0xc7D24B90C69c6F389fbC673987239f62F0869e3a`
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Chain ID: `84532`
- Songs Table: `karaoke_songs_11155420_11155420_220`

### Base Mainnet (Production)
- Contract: To be deployed
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Chain ID: `8453`

## Deploying Contracts

### Deploy to Optimism Sepolia
```bash
cd contracts
forge script script/DeployMultiChain.s.sol:DeployMultiChain \
  --rpc-url optimism_sepolia \
  --broadcast \
  --verify
```

### Deploy to Base Mainnet
```bash
cd contracts
forge script script/DeployMultiChain.s.sol:DeployMultiChain \
  --rpc-url base_mainnet \
  --broadcast \
  --verify
```

## Tableland Configuration

Tableland tables need to be deployed separately for each network:

### Current Tables
- Optimism Sepolia: `karaoke_songs_11155420_11155420_220`
- Base Mainnet: To be deployed

### Deploy New Tables
```bash
cd tableland
bun run deploy:songs
```

## Important Notes

1. **Contract Consistency**: The contract address in `.env` must match `VITE_KARAOKE_CONTRACT` for Lit Protocol encryption to work properly.

2. **Network Switching**: Users will be prompted to switch networks automatically based on the environment configuration.

3. **Tableland Bug**: Currently using Optimism Sepolia for development due to Tableland bugs. Production will use Base Mainnet once Tableland issues are resolved.

4. **Feature Flags**: Use `VITE_ENABLE_TESTNET_FEATURES` to show/hide testnet-specific features like faucets.

## Troubleshooting

### Wrong Network Error
If users see "Wrong Network" errors:
1. Check that `VITE_DEFAULT_CHAIN_ID` matches your intended network
2. Ensure Web3Auth is configured for the correct network
3. Verify contract addresses are correct for the network

### Tableland Sync Issues
If Tableland sync fails:
1. Verify the table name in `VITE_SONGS_TABLE_NAME`
2. Check that the user is on the correct network
3. Ensure the table exists on the target network