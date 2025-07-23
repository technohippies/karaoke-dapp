# Porto + Lit Protocol Test App

This is a minimal test application to verify Porto.sh wallet integration with Lit Protocol for:
1. Connecting with Porto (passkey-based smart account)
2. Purchasing access with USDC using batched transactions
3. Decrypting content using Lit Protocol with EIP-1271 signature verification

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `VITE_PURCHASE_CONTRACT_ADDRESS`: Your purchase contract address
   - `VITE_TEST_CIPHERTEXT`: Encrypted content from Lit
   - `VITE_TEST_DATA_TO_ENCRYPT_HASH`: Corresponding hash

2. Install dependencies:
   ```bash
   cd apps/porto-test
   npm install
   ```

3. Run the development server (HTTPS required for Porto):
   ```bash
   npm run dev
   ```

4. Open https://localhost:3001

## Test Flow

1. **Connect Porto Wallet**: Uses passkey authentication via Porto's iframe dialog
2. **Purchase Access**: Batched USDC approval + purchase in single transaction
3. **Connect to Lit**: Establishes session using EIP-1271 signature verification
4. **Decrypt Content**: Verifies on-chain access and decrypts

## Key Integration Points

- Porto signatures use EIP-1271 for smart account validation
- `derivedVia: 'EIP1271'` flag tells Lit to verify signatures on-chain
- Batched transactions via `useSendCalls` (EIP-5792)
- Custom auth provider wraps Porto's wallet client for Lit

## Troubleshooting

- Ensure HTTPS is enabled (vite-plugin-mkcert handles this)
- Porto dialog requires secure context
- Check browser console for detailed error messages
- Verify contract addresses match your deployment