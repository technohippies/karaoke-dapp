#!/bin/bash

echo "🚀 Running Synpress E2E Tests"
echo "============================"

# Set environment variables to help with Synpress
export HEADLESS=false
export FAIL_ON_ERROR=false
export METAMASK_VERSION=11.9.1
export SLOW_MODE=true

# Check if cache exists
if [ ! -d ".cache-synpress" ]; then
    echo "⚠️  Building wallet cache..."
    cd ..
    bun run test:e2e:build-cache
    cd e2e
fi

# Run tests
echo "🧪 Running tests..."
bunx playwright test "$@"