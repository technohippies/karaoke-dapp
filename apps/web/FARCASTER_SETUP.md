# Farcaster Mini App Setup Guide

## Current Status

✅ Created public directory structure at `public/.well-known/`
✅ Created basic `farcaster.json` manifest file

## Next Steps

### 1. Update Domain
Replace `yourdomain.com` in `/public/.well-known/farcaster.json` with your actual domain.

### 2. Create Required Assets

You need to create the following image assets and place them in the `public` directory:

- **app-icon-1024.png** - 1024x1024px PNG icon (no alpha/transparency)
  - Use one of the Scarlett assets as base (e.g., scarlett-thumbs-up.png)
  
- **splash-200.png** - 200x200px loading screen image
  - Can be a smaller version of the app icon
  
- **hero-1200x630.png** - 1200x630px promotional banner
  - Should showcase the app's key features
  
- **og-1200x630.png** - 1200x630px Open Graph image
  - Can be the same as hero image or a variation
  
- **screenshot1.png, screenshot2.png, screenshot3.png** - 1284x2778px (portrait)
  - App screenshots showing different features

### 3. Add Account Association

To verify ownership, you need to:

1. Visit the [Warpcast Mini App Manifest Tool](https://warpcast.com/~/developers/mini-apps/manifest)
2. Enter your domain exactly as it appears in the manifest
3. Sign with your Farcaster account
4. Copy the generated `accountAssociation` object
5. Add it to your `farcaster.json` file

### 4. Deploy and Test

1. Deploy your app with the manifest at `/.well-known/farcaster.json`
2. Ensure all image URLs are accessible
3. Test in Warpcast by navigating to your domain

## Manifest Configuration

The current manifest is configured for:
- **Base Sepolia** testnet (chain ID: eip155:84532)
- **Education** category with language learning focus
- Required capabilities: Sign-in and Ethereum provider access

## Mini App Detection

The manifest uses the query parameter pattern `?miniApp=true` for detection. This allows the app to:
- Lazy-load the Farcaster SDK only when needed
- Adjust UI for mini app context
- Track mini app vs web usage

## Example Integration

```typescript
// In your app's entry point or layout
useEffect(() => {
  const url = new URL(window.location.href);
  const isMiniApp = url.searchParams.get('miniApp') === 'true';
  
  if (isMiniApp) {
    import('@farcaster/miniapp-sdk').then(({ sdk }) => {
      sdk.actions.ready();
    });
  }
}, []);
```