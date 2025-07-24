# Base Mainnet Deployment Guide

## Current Deployment

### Proxy Contract
- **Address**: `0x06AC258d391A5B2B6660d8d5Dee97507591376D0`
- **Network**: Base Mainnet (Chain ID: 8453)
- **Type**: Custom proxy pattern (KaraokeProxy)

### Configuration
- **USDC Token**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Splits Contract**: `0x7eA10e96D656Ab19D679fFfA3CA1Db9A531B1210`

## Deployment with Ledger

### Prerequisites

1. **Install Dependencies**
   ```bash
   # If not already installed
   forge install
   ```

2. **Set Environment Variables**
   ```bash
   # Create .env file from example
   cp .env.example .env
   
   # Edit .env and add:
   BASESCAN_API_KEY=your_basescan_api_key
   ```

3. **Ledger Setup**
   - Connect your Ledger device
   - Open the Ethereum app
   - Enable blind signing (Settings > Blind signing)

### Deploy New Contract

```bash
# Run the deployment script
./deploy-base-mainnet-ledger.sh
```

This script will:
1. Detect your Ledger address
2. Check your ETH balance
3. Deploy the KaraokeSchool implementation
4. Deploy an ERC1967Proxy with initialization
5. Verify contracts on Basescan

### Manual Deployment Steps

If you prefer to run commands manually:

```bash
# 1. Get your Ledger address
LEDGER_ADDRESS=$(cast wallet address --ledger)
echo "Ledger address: $LEDGER_ADDRESS"

# 2. Set environment variables
export USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
export SPLITS_ADDRESS="0x7eA10e96D656Ab19D679fFfA3CA1Db9A531B1210"

# 3. Deploy contracts
forge script script/Deploy.s.sol \
    --rpc-url https://mainnet.base.org \
    --ledger \
    --sender $LEDGER_ADDRESS \
    --broadcast \
    --verify \
    --verifier-url https://api.basescan.org/api \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvv
```

## Verify Deployment

### Check Current Deployment
```bash
./check-mainnet-deployment.sh
```

### Manual Verification
```bash
# Check proxy owner
cast call 0x06AC258d391A5B2B6660d8d5Dee97507591376D0 "owner()" --rpc-url https://mainnet.base.org

# Check USDC token
cast call 0x06AC258d391A5B2B6660d8d5Dee97507591376D0 "usdcToken()" --rpc-url https://mainnet.base.org

# Check prices
cast call 0x06AC258d391A5B2B6660d8d5Dee97507591376D0 "COMBO_PRICE()" --rpc-url https://mainnet.base.org
```

## Post-Deployment Steps

1. **Update Frontend Configuration**
   ```bash
   # Update apps/web/.env
   VITE_KARAOKE_CONTRACT=0xNEW_PROXY_ADDRESS
   ```

2. **Update Backend Configuration**
   ```bash
   # Update root .env
   KARAOKE_CONTRACT=0xNEW_PROXY_ADDRESS
   ```

3. **Re-encrypt Content**
   - All encrypted content needs to be re-encrypted with the new contract address
   - See `scripts/prepare-song.ts` for re-encryption process

4. **Update PKP Conditions**
   - PKP policies that reference the contract address need to be updated

## Upgrade Implementation

To upgrade the implementation contract while keeping the same proxy:

```bash
# Deploy new implementation
forge create src/KaraokeSchool.sol:KaraokeSchoolV3 \
    --rpc-url https://mainnet.base.org \
    --ledger \
    --constructor-args $USDC_ADDRESS $SPLITS_ADDRESS

# Upgrade proxy to new implementation
cast send 0x06AC258d391A5B2B6660d8d5Dee97507591376D0 \
    "upgradeImplementation(address)" \
    0xNEW_IMPLEMENTATION_ADDRESS \
    --rpc-url https://mainnet.base.org \
    --ledger
```

## Troubleshooting

### Common Issues

1. **"Blind signing must be enabled"**
   - Go to Ledger Ethereum app settings
   - Enable "Blind signing"

2. **Insufficient gas**
   - Deployment typically requires ~0.01 ETH
   - Ensure your Ledger address has enough ETH

3. **Verification fails**
   - Ensure BASESCAN_API_KEY is set correctly
   - Wait a few minutes after deployment before verification

### Gas Estimates

- Implementation deployment: ~2.5M gas
- Proxy deployment: ~900K gas
- Total cost at 10 gwei: ~0.035 ETH

## Security Considerations

1. **Owner Control**
   - The proxy owner can upgrade the implementation
   - Consider transferring ownership to a multisig after deployment

2. **Implementation Verification**
   - Always verify the implementation code on Basescan
   - Check that constructor arguments are correct

3. **Access Control**
   - Ensure only authorized addresses can call admin functions
   - Review all role assignments after deployment