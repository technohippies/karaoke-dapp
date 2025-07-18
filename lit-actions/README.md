# Lit Actions

This directory contains Lit Protocol serverless functions used by the Karaoke School application.

## Active Lit Actions

- **karaokeScorerV18.js** - Current production version with valid API keys
- **singleLineScorer.js** - Used for Study Mode pronunciation practice

## Legacy Versions (for reference only)

- **karaokeScorer.js** - V16 with invalid API keys (DO NOT USE)
- **karaokeScorerV17.js** - Debug version (DO NOT USE)
- **voiceGrader.js** - Old PKP-based grader (deprecated)

## Important Notes

When updating the contract:
1. DO NOT re-upload Lit Actions unless API keys need to be changed
2. If re-uploading, ensure valid API keys are in `.env`
3. See `CONTRACT_UPDATE_GUIDE.md` for full process

## Deployment

To deploy a new Lit Action:
```bash
npm run upload-action -- ./lit-actions/filename.js --name "Description"
```

The CID will be displayed and saved to `deployments.json`.