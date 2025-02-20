#!/bin/bash

echo "📦 Installing dependencies..."
bun install

echo "🏗️ Building and deploying with SAM..."
sam build && sam deploy

echo "✅ Build completed successfully!"
