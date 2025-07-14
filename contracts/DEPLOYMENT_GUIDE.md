# Quick Contract Deployment Guide

## Method 1: Cast Send with Bytecode (WORKING SOLUTION)
```bash
# When forge create shows "dry run" warnings but won't broadcast:
source .env
cast send --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --create $(cat out/ContractName.sol/ContractName.json | jq -r '.bytecode.object')<constructor_args_hex>

# Example with constructor args:
cast send --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --create $(cat out/SimpleKaraokeV2Minimal.sol/SimpleKaraokeV2.json | jq -r '.bytecode.object')0000000000000000000000036cbd53842c5426634e7929541ec2318f3dcf7e000000000000000000000000e7674fe5eafddb2590462e58b821dcd17052f76d
```

## Method 2: Isolated Deployment
```bash
# Create clean directory
mkdir deploy-v3
cp YourContract.sol deploy-v3/
cd deploy-v3

# Deploy without interference from other contracts
forge create YourContract \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args arg1 arg2
```

## Common Issues & Solutions

1. **Forge create shows "dry run" warnings but won't broadcast**:
   - This appears to be a foundry bug where `--broadcast` flag is ignored
   - **Solution**: Use `cast send --create` with compiled bytecode (Method 1 above)
   - The transaction details from forge are correct, it just won't send them

2. **Stack too deep**: Simplify contract by:
   - Extracting functions to reduce local variables
   - Using internal functions to break up complex operations
   - Removing unused struct fields

3. **Version conflicts**: 
   - Keep deployment contracts in separate folders
   - Or temporarily rename conflicting .sol files to .sol.bak

4. **Constructor args encoding**:
   - Use `cast --to-base16 $(cast --from-utf8 "string")` for strings
   - Addresses: pad to 32 bytes with leading zeros
   - Example: `0x036CbD...` becomes `0000000000000000000000036cbd53842c5426634e7929541ec2318f3dcf7e`

## Deployed Contracts

### SimpleKaraokeV2 (Fixed - No songMetadata requirement)
- Address: `0xFc7AF4F3e39C09d313cfE3F819480A10D79Dbd4C`
- Network: Base Sepolia  
- Deploy TX: `0x75808fc1d501b3abe5a956d192e779b5409e8778b12a80f458becbff5a99374c`
- Constructor Args:
  - USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  - PKP: `0xe7674fe5EAfdDb2590462E58B821DcD17052F76D`
- Notes: Removed songMetadata requirement from `unlockSong()` function

### SimpleKaraokeV2 (Old - WITH songMetadata requirement)
- Address: `0xFA8DC581F65ba0ae5b700967a4a3dF446587ff19`
- Network: Base Sepolia
- Deploy TX: `0xc25b53e8e56f7f00c8433c5e01e9b70f3fa4e33f20a1132f4c0f21224d8532a9`
- Status: DEPRECATED - had songMetadata requirement causing unlock failures