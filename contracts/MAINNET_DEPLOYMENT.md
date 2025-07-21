# Base Mainnet Deployment Checklist

## Pre-deployment

- [ ] Ensure Ledger is connected and Ethereum app is open
- [ ] Check ETH balance on Base mainnet
- [ ] Verify USDC address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- [ ] Decide on splits contract address (or use deployer temporarily)

## Deployment Steps

1. **Run deployment script**:
   ```bash
   cd contracts
   ./deploy-mainnet-ledger.sh
   ```

2. **Save addresses** from deployment output:
   - Proxy Address: `0x...`
   - Implementation Address: `0x...`

3. **Verify contracts** on Basescan (should happen automatically)

## Post-deployment Configuration

1. **Update environment files**:
   - Copy `.env.mainnet.example` to `.env.mainnet`
   - Fill in the deployed proxy address
   - Update VITE_KARAOKE_CONTRACT with proxy address

2. **Create new PKP** for mainnet:
   - Mint new PKP on Lit Protocol
   - Set up access control conditions with new contract address
   - Update PKP details in `.env.mainnet`

3. **Create Tableland tables** on Base mainnet:
   - Deploy songs table
   - Update SONGS_TABLE_NAME in `.env.mainnet`

4. **Update frontend**:
   - Switch to Base mainnet configuration
   - Test all functionality

5. **Re-encrypt content**:
   - Update all encrypted content with new contract address
   - Test decryption with new PKP

## Security Considerations

- [ ] Double-check all addresses before deployment
- [ ] Ensure proxy admin is secure
- [ ] Test on small amounts first
- [ ] Have recovery plan ready

## Contract Addresses Reference

### Base Mainnet
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Chain ID: 8453
- Explorer: https://basescan.org

### Deployment Gas Estimates
- KaraokeSchoolV2: ~2M gas
- KaraokeProxy: ~1M gas
- Total: ~3-4M gas (check current gas prices)