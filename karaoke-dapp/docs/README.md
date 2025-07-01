# Karaoke Turbo Documentation

Comprehensive documentation for the Karaoke Turbo decentralized karaoke platform.

## Quick Start

```bash
# Start the documentation server
bun run docs:dev

# Build documentation
bun run docs:build

# Preview built docs
bun run docs:preview
```

## Documentation Structure

### Architecture
- **[Overview](/architecture/)** - High-level system design
- **[State Machines](/architecture/state-machines)** - XState implementation details
- **[Data Flow](/architecture/data-flow)** - How data moves through the system
- **[Security Model](/architecture/security-model)** - Security considerations

### Packages
- **[Overview](/packages/)** - Monorepo package organization
- **[UI Components](/packages/ui)** - Shared React components
- **[Services](/packages/services)** - Business logic and integrations
- **[Database](/packages/db)** - Storage utilities
- **[Smart Contracts](/packages/contracts)** - Blockchain contracts
- **[Lit Actions](/packages/lit-actions)** - Encryption actions

### API Reference
- **[Overview](/api/)** - Service interfaces
- **[Audio Services](/api/audio-services)** - MIDI and audio processing
- **[Karaoke Services](/api/karaoke-services)** - Recording and analysis
- **[Database](/api/database)** - Data management
- **[Encryption](/api/encryption)** - Lit Protocol integration

### Smart Contracts
- **[Overview](/contracts/)** - Contract architecture
- **[KaraokeStore](/contracts/karaoke-store)** - Main platform contract
- **[Deployment](/contracts/deployment)** - Deployment procedures

### Guides
- **[Getting Started](/guides/)** - Development setup
- **[Development Setup](/guides/development-setup)** - Local environment
- **[Deployment](/guides/deployment)** - Production deployment
- **[Testing](/guides/testing)** - Testing strategies

## Key Features Documented

✅ **Complete Package Documentation**
- All 7 packages thoroughly documented
- API interfaces and usage examples
- Development workflows

✅ **Architecture Deep Dive**
- XState machine patterns
- Service-oriented architecture
- Data flow diagrams

✅ **Smart Contract Reference**
- Complete KaraokeStore contract documentation
- Deployment procedures
- Security considerations

✅ **Development Guides**
- Step-by-step setup instructions
- Testing methodologies
- Production deployment checklist

✅ **Service APIs**
- Audio processing services
- Encryption and security
- Database management
- Recording and analysis

## Contributing to Documentation

### Adding New Pages

1. Create markdown file in appropriate section
2. Add to sidebar in `.vitepress/config.ts`
3. Link from parent pages

### Updating Content

1. Edit markdown files directly
2. Use proper heading hierarchy
3. Include code examples
4. Add diagrams where helpful

### Style Guidelines

- Use clear, concise language
- Include practical examples
- Document all public APIs
- Keep code examples current

## Deployment

The documentation can be deployed to any static hosting:

```bash
# Build for production
bun run docs:build

# Deploy to Vercel
vercel --prod dist

# Deploy to Netlify
netlify deploy --prod --dir dist
```

## Search

Full-text search is enabled via VitePress local search. No additional configuration needed.

## Maintenance

- Update documentation with code changes
- Verify links and examples regularly
- Keep deployment guides current
- Review for outdated information

---

**Documentation Status:** ✅ Complete initial version
**Last Updated:** 2025-01-07
**VitePress Version:** 1.6.3