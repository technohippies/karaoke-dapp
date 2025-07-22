#!/bin/bash

# Production build script that uses .env.production

# Save current .env if it exists
if [ -f .env ]; then
  cp .env .env.backup
fi

# Use production env for build
cp .env.production .env

# Run the build
echo "Building with production environment..."
tsc && vite build && cp dist/index.html dist/404.html

# Restore original .env
if [ -f .env.backup ]; then
  mv .env.backup .env
else
  rm .env
fi

echo "Production build complete!"