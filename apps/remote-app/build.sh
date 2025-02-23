#!/bin/bash

echo "📦 Installing dependencies..."
bun install

echo "🏗️ Building TypeScript files..."
# Create dist directory if it doesn't exist
mkdir -p dist

# Bundle the application with all dependencies
echo "📦 Bundling application..."
bun build ./src/validate-session.mts --outdir ./dist --target node --format esm

# Rename the output file to match the handler name
mv ./dist/validate-session.js ./dist/validate-session.mjs

# Create a specific package.json for the build
cat > ./dist/package.json << 'EOL'
{
  "name": "validate-session",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-sfn": "^3.750.0",
    "@smithy/core": "^3.1.4",
    "aws-lambda": "^1.0.7",
    "jose": "^5.9.6",
    "uuid": "^11.0.5",
    "xlsx": "^0.18.5"
  }
}
EOL

# Copy Makefile to dist
cp Makefile ./dist/

echo "🏗️ Building and deploying with SAM..."
sam build && sam deploy

echo "✅ Build completed successfully!"
