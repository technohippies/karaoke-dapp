#!/bin/bash

echo "🔍 Debugging Synpress E2E Setup"
echo "==============================="

# Check if .env exists
if [ ! -f "../../../.env" ]; then
    echo "❌ Root .env file not found!"
    exit 1
else
    echo "✅ Root .env file found"
    grep "PRIVATE_KEY" ../../../.env > /dev/null && echo "✅ PRIVATE_KEY found in .env" || echo "❌ PRIVATE_KEY not found in .env"
fi

# Check if cache exists
if [ -d ".cache-synpress" ]; then
    echo "✅ Wallet cache exists"
    ls -la .cache-synpress/
else
    echo "⚠️  No wallet cache found. Run: bun run test:e2e:build-cache"
fi

# Check Node/Bun version
echo ""
echo "Environment:"
echo "Node version: $(node --version)"
echo "Bun version: $(bun --version)"

# Check if dev server is running
curl -s http://localhost:3000 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Dev server is running on port 3000"
else
    echo "⚠️  Dev server not running. Run: bun run dev"
fi

echo ""
echo "📝 Next steps:"
echo "1. Clear cache: rm -rf .cache-synpress"
echo "2. Rebuild cache: bun run test:e2e:build-cache"
echo "3. Run minimal test: bunx playwright test e2e/tests/minimal-wallet.spec.ts --headed"