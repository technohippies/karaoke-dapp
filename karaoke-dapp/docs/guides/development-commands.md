---
description: Complete reference for all development commands, scripts, and workflows in the Karaoke Turbo project including setup, testing, deployment, and maintenance tasks.
---

# Development Commands Reference

This comprehensive guide covers all available commands for developing, testing, and maintaining the Karaoke Turbo platform.

## Quick Reference

### Essential Commands

```bash
# Start development
bun install              # Install dependencies
bun run dev             # Start web app (port 3000)

# Documentation  
bun run docs:dev        # Start docs server (port 5174)
bun run docs:build      # Build docs with LLM files

# Testing
bun run test:e2e        # End-to-end tests
bun run test-integration # Full system integration test

# Deployment
bun run deploy-songs-table    # Deploy Tableland table
bun run deploy-midi-decryptor # Deploy Lit Action
```

## Root Package Commands

### Development

```bash
# Core development workflow
bun install                    # Install all workspace dependencies
bun run dev                   # Start documentation server (port 5174)
bun run build                 # Build all packages in dependency order
bun run lint                  # Run ESLint across all packages  
bun run format               # Format code with Prettier
bun run typecheck            # TypeScript compilation check
```

### Documentation

```bash
# VitePress documentation
bun run docs:dev             # Development server with hot reload
bun run docs:build           # Build static documentation site
bun run docs:preview         # Preview built documentation
bun run docs:llms            # Generate LLM-friendly documentation files
```

### Song Management

```bash
# MIDI processing and encryption
bun run process-song         # Encrypt and upload MIDI files to IPFS
bun run verify-song          # Verify song exists in Tableland database
bun run test-decrypt         # Test MIDI decryption without purchase
```

### Deployment & Infrastructure

```bash
# Smart contract and service deployment
bun run deploy-songs-table   # Create Tableland songs table
bun run deploy-midi-decryptor # Upload Lit Action to IPFS
bun run test-integration     # Validate entire system integration
```

## Web Application Commands

### Development Server

```bash
cd apps/web

# Development
bun run dev                  # Vite dev server (localhost:3000)
bun run build               # Production build
bun run preview             # Preview production build
bun run typecheck           # TypeScript validation
bun run lint               # ESLint checking
```

### Testing

```bash
# End-to-end testing with Playwright + Synpress
bun run test:e2e            # Run all E2E tests headless
bun run test:e2e:ui         # Interactive test runner with UI
bun run test:e2e:headed     # Run tests in headed browser mode
bun run test:e2e:debug      # Debug mode with browser inspection

# Crypto wallet testing
bun run synpress            # Synpress-specific wallet tests
```

### Advanced Testing

```bash
# Specific test execution
bunx playwright test purchase.spec.ts          # Run single test file
bunx playwright test --grep "purchase flow"    # Run tests matching pattern
bunx playwright test --debug                   # Step-through debugging
bunx playwright test --ui                      # Visual test runner

# Test reports and analysis
bunx playwright show-report                    # View test results
bunx playwright test --reporter=html           # Generate HTML report
```

## Storybook Commands

### Component Development

```bash
cd apps/storybook

# Storybook development
bun run dev                 # Start Storybook server (port 6006)
bun run build              # Build static Storybook
bun run preview            # Preview built Storybook
```

### Component Testing

```bash
# Visual testing and documentation
bun run test-storybook     # Run Storybook tests (if configured)
bun run chromatic          # Visual regression testing (if setup)
```

## Package-Specific Commands

### UI Package (`packages/ui`)

```bash
cd packages/ui

bun run build              # Build component library
bun run dev               # Development mode with watch
bun run lint              # Lint components  
bun run typecheck         # TypeScript validation
bun run storybook         # Local Storybook instance
```

### Services Package (`packages/services`)

```bash
cd packages/services

bun run build             # Build services library
bun run dev              # Development mode
bun run test             # Unit tests
bun run lint             # ESLint checking
bun run typecheck        # TypeScript validation
```

### Contracts Package (`packages/contracts`)

```bash
cd packages/contracts

bun run build            # Build contract interfaces
bun run typecheck        # Validate TypeScript
bun run lint            # ESLint checking
```

## Song Processing Pipeline

### MIDI Processing

```bash
# Complete song processing workflow
bun run process-song        # Interactive song processing wizard
bun run process-song --file path/to/song.mid  # Process specific MIDI file
bun run process-song --batch ./songs/         # Batch process directory
```

### Verification & Testing

```bash
# Song validation
bun run verify-song --id 1              # Verify song by ID in database
bun run verify-song --slug "lorde-royals" # Verify by slug
bun run test-decrypt --song-id 1         # Test decryption for specific song
```

### Content Management

```bash
# IPFS and content management
bun run upload-to-aioz       # Manual IPFS upload
bun run check-cid-tracker    # Verify CID tracking file
bun run cleanup-cache        # Clear local processing cache
```

## Database Commands

### Tableland Operations

```bash
# Database deployment and management
bun run deploy-songs-table          # Deploy songs table to Tableland
bun run deploy-purchases-table      # Deploy purchases tracking table
bun run verify-tableland-schema     # Validate table schemas
```

### Data Management

```bash
# Database queries and maintenance
bun run query-songs              # Interactive song database queries
bun run backup-tableland-data    # Export table data
bun run sync-local-cache         # Sync IndexedDB with Tableland
```

## Lit Protocol Commands

### Action Deployment

```bash
# Lit Protocol action management
bun run deploy-midi-decryptor       # Deploy MIDI decryption action
bun run test-lit-action            # Test action execution
bun run update-action-cid          # Update environment with new CID
```

### PKP Management

```bash
# Programmable Key Pair operations
bun run generate-pkp               # Generate new PKP for testing
bun run test-pkp-access           # Validate PKP access control
bun run rotate-pkp                # Rotate PKP keys (advanced)
```

## Testing Commands

### Integration Testing

```bash
# System-wide testing
bun run test-integration           # Full system integration test
bun run test-contracts            # Smart contract interaction tests
bun run test-encryption           # Lit Protocol encryption tests
bun run test-database             # Database connectivity tests
bun run test-ipfs                 # IPFS upload/download tests
```

### Performance Testing

```bash
# Performance and load testing
bun run benchmark-decrypt         # MIDI decryption performance
bun run benchmark-database        # Database query performance  
bun run test-load                # Simulate concurrent users
bun run test-memory-usage         # Memory usage analysis
```

### Network Testing

```bash
# Network and connectivity testing
bun run test-base-sepolia         # Base Sepolia network connectivity
bun run test-lit-network          # Lit Protocol network status
bun run test-tableland-endpoints  # Tableland API connectivity
bun run test-aioz-network         # AIOZ Network IPFS endpoints
```

## Build & Deployment Commands

### Production Builds

```bash
# Build for production
bun run build                     # Build all packages
bun run build:web                # Build web app only
bun run build:storybook          # Build component library docs
bun run build:docs               # Build documentation site
```

### Deployment Preparation

```bash
# Pre-deployment tasks
bun run lint:fix                 # Auto-fix linting issues
bun run format:check             # Verify code formatting
bun run typecheck:strict         # Strict TypeScript checking
bun run test:ci                  # CI-friendly test run
```

### Environment Management

```bash
# Environment setup and validation
bun run setup:env               # Interactive environment setup
bun run validate:env            # Validate environment variables
bun run check:dependencies      # Verify dependency health
bun run check:networks          # Validate network connectivity
```

## Maintenance Commands

### Cache Management

```bash
# Clear various caches
bun run clear:turbo              # Clear Turbo build cache
bun run clear:vite               # Clear Vite cache
bun run clear:playwright         # Clear Playwright cache
bun run clear:indexeddb          # Clear browser IndexedDB
```

### Dependency Management

```bash
# Package management
bun install                      # Install dependencies
bun update                       # Update dependencies
bun run check:outdated           # Check for outdated packages
bun run audit                    # Security audit
```

### Development Tools

```bash
# Development utilities
bun run analyze:bundle           # Bundle size analysis
bun run check:types              # TypeScript error checking
bun run validate:config          # Validate configuration files
bun run doctor                   # Health check for development environment
```

## Turbo Commands

### Workspace Management

```bash
# Turbo workspace operations
bunx turbo build                 # Build with caching
bunx turbo build --force         # Force rebuild without cache
bunx turbo build --filter=web    # Build specific package
bunx turbo dev --parallel        # Run dev scripts in parallel
```

### Cache Operations

```bash
# Turbo cache management
bunx turbo prune                 # Remove unused cache
bunx turbo clean                 # Clean all build outputs
bunx turbo run build --dry-run   # Preview build execution
```

## Debugging Commands

### Development Debugging

```bash
# Debug development issues
bun run debug:web               # Debug web app with inspector
bun run debug:storybook         # Debug Storybook components
bun run debug:tests             # Debug test execution
```

### Network Debugging

```bash
# Network and service debugging
bun run debug:contracts         # Debug contract interactions
bun run debug:lit-protocol      # Debug Lit Protocol issues
bun run debug:tableland         # Debug database connections
bun run debug:ipfs              # Debug IPFS operations
```

## CI/CD Commands

### Continuous Integration

```bash
# CI-specific commands
bun run ci:install              # CI-optimized dependency install
bun run ci:build                # CI build with error handling
bun run ci:test                 # CI test suite
bun run ci:deploy               # CI deployment process
```

### Quality Assurance

```bash
# Code quality checks
bun run qa:lint                 # Comprehensive linting
bun run qa:format               # Code formatting check
bun run qa:types                # TypeScript error checking
bun run qa:security             # Security vulnerability scan
```

## Environment-Specific Commands

### Development Environment

```bash
# Development-specific operations
NODE_ENV=development bun run dev
NODE_ENV=development bun run test:e2e
```

### Production Environment

```bash
# Production-specific operations  
NODE_ENV=production bun run build
NODE_ENV=production bun run preview
```

### Testing Environment

```bash
# Test environment operations
NODE_ENV=test bun run test-integration
NODE_ENV=test bun run validate:env
```

## Command Aliases

### Commonly Used Shortcuts

```bash
# Convenient aliases (add to your shell profile)
alias kdev="bun run dev"                    # Start development
alias ktest="bun run test:e2e"              # Run tests
alias kbuild="bun run build"                # Build project
alias kdocs="bun run docs:dev"              # Start docs
alias kstory="cd apps/storybook && bun run dev"  # Start Storybook
```

## Troubleshooting Commands

### Common Issues

```bash
# Fix common development issues
bun run fix:permissions         # Fix file permissions
bun run fix:node-modules         # Reinstall dependencies
bun run fix:cache               # Clear all caches
bun run fix:env                 # Reset environment configuration
```

### Health Checks

```bash
# System health validation
bun run health:check            # Overall system health
bun run health:network          # Network connectivity
bun run health:services         # External service status
bun run health:dependencies     # Dependency compatibility
```