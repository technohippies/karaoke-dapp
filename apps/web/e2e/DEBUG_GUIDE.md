# Synpress E2E Testing Debug Guide

## Known Issues & Solutions

### 1. MetaMask Multiple Popup Error

**Error**: `strict mode violation: locator('.popover-container [data-testid="popover-close"]') resolved to 2 elements`

**Cause**: MetaMask shows multiple popups simultaneously:
- "What's new" popup
- "You have switched network" notification

**Solution**: 
- Updated wallet setup files to handle popups individually using specific selectors
- Uses `section:has-text()` to target specific popups
- Wrapped in try-catch to handle cases where popups might not appear

### 2. Missing Test Selectors

**Issue**: App doesn't have `data-testid` attributes

**Current Workarounds**:
- Use text-based selectors: `page.locator('button').filter({ hasText: /connect wallet/i })`
- Use CSS class selectors: `page.locator('.group.relative.flex')`
- Use role-based selectors: `page.getByRole('button', { name: /text/i })`

**Long-term Solution**: Add data-testid attributes to React components

### 3. Chinese UI Default

**Issue**: App defaults to Chinese language

**Solution**: Tests now use flexible selectors that work with multiple languages:
```typescript
// Handles both English and Chinese
const connectButton = page.locator('button').filter({ hasText: /connect|连接/i })
```

### 4. ES Module Configuration

**Issue**: `__dirname` not available in ES modules

**Solution**: Already implemented using:
```typescript
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
```

## Step-by-Step Debug Process

### 1. Run Debug Script
```bash
cd apps/web/e2e
./debug-setup.sh
```

### 2. Clear and Rebuild Cache
```bash
rm -rf .cache-synpress
cd ..
bun run test:e2e:build-cache
```

### 3. Test Basic Functionality
```bash
# Test without wallet (should pass)
bunx playwright test e2e/tests/working-basic.spec.ts --headed

# Test minimal wallet connection
bunx playwright test e2e/tests/minimal-wallet.spec.ts --headed
```

### 4. Debug Failed Tests
```bash
# Use UI mode to inspect selectors
bunx playwright test --ui

# Use debug mode
PWDEBUG=1 bunx playwright test e2e/tests/minimal-wallet.spec.ts
```

## Common Errors & Fixes

### "No tests found"
- Check file naming: Must end with `.spec.ts`
- Verify test structure uses `test()` or `test.describe()`

### "Timeout waiting for dev server"
- Start dev server: `bun run dev`
- Check port 3000 is free: `lsof -i :3000`

### "Cannot find module"
- Check imports use correct paths
- Ensure `type: "module"` in package.json

### "MetaMask not connecting"
- Check extension ID is correct
- Verify wallet password matches setup
- Ensure private key is valid

## Environment Requirements

- Node.js 18+
- Bun 1.0+
- Playwright browsers installed
- Root `.env` with `PRIVATE_KEY`
- TypeScript strict mode enabled

## Test Structure Best Practices

1. **Use Page Object Model** (future improvement):
```typescript
class KaraokePage {
  constructor(private page: Page) {}
  
  async connectWallet() {
    // Centralize selectors
  }
}
```

2. **Handle Async Operations**:
```typescript
// Always wait for network idle after navigation
await page.goto('/')
await page.waitForLoadState('networkidle')
```

3. **Flexible Selectors**:
```typescript
// Good: Works with multiple languages
const button = page.locator('button').filter({ hasText: /connect|连接/i })

// Bad: Language-specific
const button = page.getByText('Connect Wallet')
```

## Next Steps

1. **Add data-testid to React components** for reliable selectors
2. **Create page objects** for better test organization
3. **Add visual regression tests** using Playwright screenshots
4. **Set up CI/CD** with GitHub Actions

## Useful Commands

```bash
# Run specific test file
bunx playwright test path/to/test.spec.ts

# Run tests in headed mode
bunx playwright test --headed

# Run tests in UI mode (best for debugging)
bunx playwright test --ui

# Generate test report
bunx playwright show-report

# Update Playwright
bun update @playwright/test

# Update Synpress
bun update @synthetixio/synpress
```