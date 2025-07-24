#!/bin/bash

# Base Mainnet configuration
RPC_URL="https://mainnet.base.org"
PROXY_ADDRESS="0x06AC258d391A5B2B6660d8d5Dee97507591376D0"

echo "🔍 Checking Base Mainnet deployment..."
echo "📍 Proxy Address: $PROXY_ADDRESS"
echo ""

# Check proxy owner
echo "👤 Checking proxy owner..."
OWNER=$(cast call $PROXY_ADDRESS "owner()" --rpc-url $RPC_URL | cast --to-address)
echo "   Owner: $OWNER"

# Check implementation address
echo ""
echo "📦 Checking implementation address..."
# ERC1967 implementation slot: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
IMPL_SLOT="0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
IMPL_ADDRESS=$(cast storage $PROXY_ADDRESS $IMPL_SLOT --rpc-url $RPC_URL | cast --to-address)
echo "   Implementation: $IMPL_ADDRESS"

# Check USDC address
echo ""
echo "💵 Checking USDC token address..."
USDC=$(cast call $PROXY_ADDRESS "usdcToken()" --rpc-url $RPC_URL | cast --to-address)
echo "   USDC: $USDC"

# Check splits contract
echo ""
echo "📊 Checking splits contract..."
SPLITS=$(cast call $PROXY_ADDRESS "splitsContract()" --rpc-url $RPC_URL | cast --to-address)
echo "   Splits: $SPLITS"

# Check prices
echo ""
echo "💰 Checking prices..."
COMBO=$(cast call $PROXY_ADDRESS "COMBO_PRICE()" --rpc-url $RPC_URL | cast --to-dec)
VOICE=$(cast call $PROXY_ADDRESS "VOICE_PACK_PRICE()" --rpc-url $RPC_URL | cast --to-dec)
SONG=$(cast call $PROXY_ADDRESS "SONG_PACK_PRICE()" --rpc-url $RPC_URL | cast --to-dec)

echo "   Combo Price: $(echo "scale=2; $COMBO / 1000000" | bc) USDC"
echo "   Voice Pack Price: $(echo "scale=2; $VOICE / 1000000" | bc) USDC"
echo "   Song Pack Price: $(echo "scale=2; $SONG / 1000000" | bc) USDC"

echo ""
echo "✅ Deployment check complete!"