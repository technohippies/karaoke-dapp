# Lit Actions

This directory contains Lit Protocol serverless functions used by the Karaoke School application.

## Active Lit Actions

### karaokeScorerV18.js
- **CID**: `Qma1dWbGf1NWNP1TSWR6UERTZAaxVr8bbVGD89f2WHFiMq`
- **Purpose**: Full karaoke scoring with real-time feedback
- **Features**:
  - Speech-to-text via Deepgram
  - LLM scoring via OpenRouter (Claude 3.5 Sonnet)
  - Embedded encrypted API keys
- **Status**: ✅ PRODUCTION

### singleLineScorer.js
- **Purpose**: Study Mode pronunciation practice
- **Features**: Single line scoring without full karaoke functionality
- **Status**: ✅ ACTIVE

## Legacy Versions (DO NOT USE)

- **karaokeScorer.js** - V16 with broken API keys after re-upload
- **karaokeScorerV17.js** - Debug version with test keys
- **voiceGrader.js** - Old PKP-based grader (deprecated)

## Critical: API Key Management

### How It Works
1. API keys are encrypted with **simple conditions** (always true)
2. This makes them **independent of contract changes**
3. Keys are embedded directly in the Lit Action code
4. Decryption happens within the secure Lit Action environment

### When Contract Updates DON'T Affect Lit Actions
- Contract address changes
- Contract logic changes
- Access control modifications

**The Lit Actions continue working because their API keys use simple conditions!**

### When You MUST Re-deploy Lit Actions
- API keys expire or change
- You accidentally upload with invalid keys
- You need to update the scoring logic

### If API Keys Stop Working
1. Add valid keys to `.env`:
   ```
   DEEPGRAM_API_KEY=your_key
   OPENROUTER_API_KEY=your_key
   ```
2. Encrypt the keys:
   ```bash
   cd lit-actions/tools
   npm install  # if needed
   npm run encrypt-keys
   ```
3. Update the Lit Action with encrypted keys
4. Deploy:
   ```bash
   cd lit-actions/tools
   npm run upload ../karaoke-scorer/karaokeScorerV22.js -- --name "Karaoke Scorer V22"
   ```
5. Update frontend with new CID

## Deployment Process

1. **Deploy new version**:
   ```bash
   cd lit-actions/tools
   bun install  # if needed
   bun run upload ../karaoke-scorer/karaokeScorerV22.js -- --name "Description"
   ```

2. **Update references**:
   - Update `apps/web/src/constants/litActions.ts` with new CID
   - The services automatically use the updated constants

3. **Test thoroughly** before removing old versions

## File Structure
```
lit-actions/
├── karaoke-scorer/
│   └── karaokeScorerV21.js    # Current production scorer
├── exercises/
│   └── say-it-back/
│       └── sayItBackV2.js     # Study mode scorer
├── tools/
│   ├── deploy.ts              # Deploy Lit Actions to IPFS
│   ├── encrypt-keys.ts        # Encrypt API keys
│   └── package.json           # Dependencies
├── deployments.json           # Deployment history
└── README.md                  # This file
```

## Scripts

### Setup
```bash
cd lit-actions/tools
bun install
```

### Available Commands
```bash
cd lit-actions/tools
bun run upload ../karaoke-scorer/karaokeScorerV21.js -- --name "Karaoke Scorer V21"
bun run encrypt-keys
```

### Environment Variables
- `PINATA_JWT` - Required for uploads, stored in root `.env`
- `DEEPGRAM_API_KEY` & `OPENROUTER_API_KEY` - For encryption, stored in `scripts/.env`