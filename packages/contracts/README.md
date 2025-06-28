# Karaoke dApp Contracts

## Setup

```bash
# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts

# Build
forge build

# Test (when we add tests)
forge test
```

## Deployment

### Test deployment (Base Sepolia)
```bash
# Make sure .env is set up with PRIVATE_KEY and LIT_PKP_PUBLIC_KEY
forge script script/Deploy.s.sol --rpc-url $RPC_URL_SEPOLIA --broadcast
```

### Production deployment (Base Mainnet with Ledger)
```bash
# Connect your Ledger and unlock it
forge script script/DeployWithLedger.s.sol --rpc-url $RPC_URL_BASE --broadcast --ledger
```

## Contract Addresses

After deployment, addresses are saved in `deployments/{chainId}.json`