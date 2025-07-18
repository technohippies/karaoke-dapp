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
   cd ../scripts
   npx tsx encrypt-api-keys.ts
   ```
3. Update the Lit Action with encrypted keys
4. Deploy:
   ```bash
   npx tsx upload-lit-action.ts ../lit-actions/karaokeScorer.js --name "Karaoke Scorer V19"
   ```
5. Update frontend with new CID

## Deployment Process

1. **Check current CID** in use:
   ```bash
   grep LIT_ACTION_CID ../.env
   ```

2. **Deploy new version**:
   ```bash
   cd ../scripts
   npx tsx upload-lit-action.ts ../lit-actions/filename.js --name "Description"
   ```

3. **Update references**:
   - `.env`: `LIT_ACTION_CID=<new_cid>`
   - `apps/web/src/services/integrations/lit/KaraokeScoringService.ts`

4. **Test thoroughly** before removing old versions

## File Structure
```
lit-actions/
├── karaokeScorerV18.js    # Current production scorer
├── singleLineScorer.js    # Study mode scorer
├── karaokeScorer.js       # Legacy (broken keys)
├── karaokeScorerV17.js    # Legacy (debug)
├── voiceGrader.js         # Legacy (deprecated)
├── deployments.json       # Deployment history
└── README.md             # This file
```