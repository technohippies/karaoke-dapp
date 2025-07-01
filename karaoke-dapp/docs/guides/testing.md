---
description: Comprehensive testing guide covering E2E tests with Playwright, integration tests, Storybook component testing, and development testing workflows.
---

# Testing Guide

This document covers the comprehensive testing infrastructure for Karaoke Turbo, including end-to-end tests, integration tests, and component testing.

## Testing Architecture

The platform uses a multi-layered testing approach:

- **End-to-End Tests**: Playwright + Synpress for real blockchain interactions
- **Integration Tests**: Full system testing with all services
- **Component Tests**: Storybook for UI component development
- **Unit Tests**: Individual service and utility testing

## End-to-End Testing

### Playwright + Synpress Setup

**Test Directory:** `apps/web/test/e2e/`  
**Configuration:** `apps/web/playwright.config.ts`

The E2E tests use Synpress to automate MetaMask interactions with real blockchain transactions on Base Sepolia.

### Test Files

#### Purchase Flow Test (`purchase.spec.ts`)

Tests the complete user journey from wallet connection to MIDI decryption:

```typescript
test('complete purchase and decrypt flow', async ({ page, context }) => {
  // 1. Connect MetaMask wallet
  await connectWallet(page)
  
  // 2. Navigate to song page
  await page.goto('/lorde/royals')
  
  // 3. Purchase credit pack (2 USDC for 100 credits)
  await purchaseCreditPack(page)
  
  // 4. Unlock specific song (1 credit)
  await unlockSong(page)
  
  // 5. Download and decrypt MIDI file
  await downloadMidi(page)
  
  // 6. Verify MIDI is cached in IndexedDB
  await verifyMidiCache(page)
})
```

#### Wallet Connection Test (`wallet-connection.spec.ts`)

Tests wallet connection persistence and session management:

```typescript
test('wallet connection persists across page reloads', async ({ page }) => {
  await connectWallet(page)
  await page.reload()
  
  // Verify wallet still connected
  await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible()
})
```

### Running E2E Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run with Playwright UI for debugging
bun run test:e2e:ui

# Run in headed mode (see browser)
bun run test:e2e:headed

# Run specific test file
bunx playwright test purchase.spec.ts

# Run with Synpress for crypto wallet testing
bun run synpress
```

### MetaMask Test Setup

The tests automatically set up MetaMask with:

- **Network**: Base Sepolia (Chain ID: 84532)
- **Funded Account**: Pre-loaded with ETH and USDC
- **Permissions**: Automatic site connection approval
- **Seed Phrase**: Test wallet with deterministic addresses

### Test Environment

Tests run against:

- **Base Sepolia**: Real testnet with actual transactions
- **Lit Protocol**: Datil test network
- **Tableland**: Base Sepolia deployment
- **AIOZ Network**: IPFS test endpoints

## Integration Testing

### Full System Integration

**Script:** `scripts/integration-test.ts`

Tests all system components working together:

```bash
bun run test-integration
```

#### Test Coverage

1. **Environment Validation**
   - Required environment variables
   - Network connectivity
   - Service endpoints

2. **Smart Contract Testing**
   - Contract deployment verification
   - Function call testing
   - Event emission validation

3. **Lit Protocol Integration**
   - PKP functionality
   - Action execution
   - Decryption workflows

4. **Tableland Database**
   - Table schema validation
   - Query execution
   - Data integrity checks

5. **AIOZ Network**
   - IPFS upload/download
   - Content addressing
   - Network availability

### Integration Test Output

```bash
✅ Environment Check
   - All required variables present
   - Network connectivity confirmed

✅ Smart Contract Test
   - Contract responsive at 0x306466a909df4dc0508b68b4511bcf8130abcb43
   - checkAccess function working
   - Event logs accessible

✅ Lit Protocol Test
   - PKP operational
   - Action CID accessible: QmXyZ...
   - Decryption test passed

✅ Tableland Test
   - Songs table accessible: songs_v7_84532_132
   - Query execution successful
   - Schema validation passed

✅ AIOZ Network Test
   - Upload endpoint responsive
   - Content retrieval working
   - Pinning service active
```

## Component Testing

### Storybook Setup

**Directory:** `apps/storybook/`  
**Port:** 6006

Storybook provides isolated component development and testing:

```bash
cd apps/storybook
bun run dev
```

### Component Stories

#### Karaoke Components

- **KaraokeDisplay**: Main karaoke interface with lyrics
- **KaraokeScore**: Performance results and scoring
- **LyricSheet**: Synchronized lyric display
- **CountdownTimer**: Karaoke countdown interface

#### Purchase Components

- **PurchaseSlider**: Credit pack purchase flow
- **ConnectWalletSheet**: Wallet connection modal
- **SongCard**: Individual song display

#### UI Components

- **Button variants**: Primary, secondary, destructive
- **Form components**: Input, select, checkbox
- **Layout components**: Header, footer, navigation

### Storybook Testing

```bash
# Start Storybook development server
bun run storybook

# Build Storybook for production
bun run build-storybook

# Run visual regression tests (if configured)
bun run test-storybook
```

## MIDI Processing Tests

### Decryption Testing

Test MIDI decryption without full purchase flow:

```bash
bun run test-decrypt
```

This script:
1. Fetches encrypted MIDI from IPFS
2. Tests Lit Protocol decryption
3. Validates MIDI file format
4. Checks audio processing pipeline

### Song Processing Pipeline

Test the complete song processing workflow:

```bash
bun run process-song
```

Tests:
- MIDI file encryption
- IPFS upload
- Metadata generation
- Tableland registration

## Test Data Management

### Test Accounts

**Funded Test Wallet:**
- Address: `0x742d35Cc6634C0532925a3b8D5C1D2e5d0d1234` (example)
- ETH Balance: 0.1 ETH (for gas)
- USDC Balance: 10 USDC (for testing purchases)

### Test Songs

**Available Test Songs:**
- "Royals" by Lorde (ID: 1)
- MIDI files pre-encrypted and uploaded
- Lyrics synchronized with LRCLIB

### Test Database

**Tableland Tables:**
- `songs_v7_84532_132`: Song metadata
- `purchases_v1_84532_117`: Purchase records

## Continuous Integration

### GitHub Actions (Planned)

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:e2e
        env:
          # Test environment variables
          CHAIN_ID: 84532
          RPC_URL: ${{ secrets.BASE_SEPOLIA_RPC }}
```

## Performance Testing

### Load Testing

Test system performance under load:

```bash
# Simulate multiple concurrent users
bun run test-load

# Test MIDI decryption performance
bun run benchmark-decrypt

# Database query performance
bun run benchmark-db
```

### Metrics Monitored

- **Transaction Speed**: Block confirmation times
- **Decryption Latency**: Lit Protocol response times
- **Database Performance**: Tableland query speeds
- **IPFS Performance**: Upload/download speeds

## Test Debugging

### Common Issues

**Test Failures:**
1. **Network Issues**: Check Base Sepolia connectivity
2. **Wallet Setup**: Verify MetaMask configuration
3. **Contract State**: Ensure sufficient test tokens
4. **Environment**: Validate all required variables

### Debugging Commands

```bash
# Run single test with verbose output
bunx playwright test purchase.spec.ts --debug

# Inspect test state
bunx playwright test --ui

# Generate test report
bunx playwright show-report
```

### Test Data Reset

```bash
# Reset test wallet state
bun run reset-test-wallet

# Clear browser storage
bunx playwright test --headed --global-setup ./test/clear-storage.ts
```

## Best Practices

### Writing Tests

1. **Atomic Tests**: Each test should be independent
2. **Real Data**: Use actual blockchain transactions
3. **Error Scenarios**: Test failure cases thoroughly
4. **Performance**: Monitor test execution times

### Test Maintenance

1. **Regular Updates**: Keep test data current
2. **Environment Sync**: Update test configs with deployments
3. **Documentation**: Document test scenarios clearly
4. **CI Integration**: Automate test execution

### Security Testing

1. **Access Control**: Test unauthorized access scenarios
2. **Input Validation**: Test with malicious inputs
3. **Rate Limiting**: Test API endpoint limits
4. **Error Handling**: Verify no sensitive data leaks

## Test Reports

### Coverage Reports

Generated test coverage includes:
- Component render testing
- User interaction flows
- Error boundary testing
- Performance benchmarks

### Automated Reporting

Tests generate reports for:
- **Success Rate**: Pass/fail percentages
- **Performance Metrics**: Response times
- **Error Analysis**: Failure categorization
- **Coverage Statistics**: Code coverage percentages