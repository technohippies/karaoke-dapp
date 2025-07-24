# Synpress v4.1.0 MetaMask Popup Issue Summary

## Problem Description

Synpress v4.1.0 fails with the error:
```
Error: strict mode violation: locator('.popover-container [data-testid="popover-close"]') resolved to 2 elements
```

This occurs in `retryIfMetaMaskCrashAfterUnlock` function in `@synthetixio/synpress-metamask/src/prepareExtension.ts` BEFORE any test code or wallet setup runs.

## Root Cause

MetaMask v11.9.1 shows multiple popups simultaneously:
1. "What's new" popup
2. "You have switched network" notification

Synpress tries to close these popups using a generic selector `.popover-container [data-testid="popover-close"]` which matches both popups, causing Playwright's strict mode to fail.

## Attempted Solutions

### 1. ✅ Modified Wallet Setup (Didn't Work)
Added popup handling in `basic.setup.ts` and `connected.setup.ts`:
```typescript
// Close specific popups
const whatsNewClose = walletPage.locator('section:has-text("What\'s new") [data-testid="popover-close"]')
const networkSwitchClose = walletPage.locator('section:has-text("You have switched") [data-testid="popover-close"]')
```
**Result**: Doesn't help because the error occurs in Synpress internals before our code runs.

### 2. ✅ Created Non-Wallet Tests (Works)
Created `app-only.spec.ts` that tests the app without MetaMask:
```bash
bunx playwright test e2e/tests/app-only.spec.ts
```
**Result**: All 4 tests pass, confirming Playwright setup is correct.

### 3. ✅ Verified Environment
- ES module configuration: Fixed with `fileURLToPath`
- Port configuration: Fixed to use 3000
- TypeScript strict mode: Enabled as required
- Private key from .env: Correctly loaded

## Known Workarounds

### Option 1: Downgrade Synpress
```bash
bun add -D @synthetixio/synpress@3.7.2-beta.10
```
Note: v3 has different API and may require code changes.

### Option 2: Use EthereumWalletMock
Instead of real MetaMask, use the mock:
```typescript
import { ethereumWalletMockFixtures } from "@synthetixio/synpress/playwright"
const test = testWithSynpress(ethereumWalletMockFixtures)
```
Note: Mock doesn't support all MetaMask features.

### Option 3: Fork and Fix Synpress
1. Fork https://github.com/Synthetixio/synpress
2. Fix the selector in `prepareExtension.ts` to handle multiple popups
3. Use your fork as dependency

### Option 4: Wait for Official Fix
Monitor https://github.com/Synthetixio/synpress/issues for updates.

## Current Status

- ✅ Basic Playwright tests work without wallet
- ✅ App is correctly configured
- ❌ MetaMask integration blocked by Synpress v4.1.0 bug
- ❌ Cannot test Web3 flows (purchase, unlock, signatures)

## Recommendations

1. **Short term**: Use `app-only.spec.ts` tests for basic functionality
2. **Medium term**: Try EthereumWalletMock or downgrade to Synpress v3
3. **Long term**: Wait for Synpress fix or contribute a fix upstream

## Test Commands

```bash
# Run non-wallet tests (works)
bunx playwright test e2e/tests/app-only.spec.ts

# Run with UI mode for debugging
bunx playwright test --ui

# View test report
bunx playwright show-report

# Debug environment
cd e2e && ./debug-setup.sh
```