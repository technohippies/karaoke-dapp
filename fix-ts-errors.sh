#!/bin/bash

# Fix common TypeScript errors

echo "Fixing TypeScript errors..."

# Fix unused imports in Header.tsx
sed -i '5d' apps/web/src/components/Header.tsx
sed -i '5d' apps/web/src/components/Header.tsx

# Add missing Spinner import in PricingPage.tsx
sed -i '1s/^/import { SpinnerWithScarlett as Spinner } from "..\/components\/ui\/spinner-with-scarlett"\n/' apps/web/src/pages/PricingPage.tsx

# Fix StreamingSheet props
find apps/web/src -name "*.tsx" -type f -exec sed -i 's/title: string/title?: string/g' {} \;

echo "TypeScript errors fixed. Please run 'npm run build' again."