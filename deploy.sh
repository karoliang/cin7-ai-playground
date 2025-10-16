#!/bin/bash

# Simple deployment script to bypass Next.js detection
echo "Building and deploying CIN7 AI Playground..."

# Clean and build
rm -rf dist
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "Build failed - dist directory not found"
    exit 1
fi

# Deploy with explicit directory
echo "Deploying to Netlify..."
netlify deploy --prod --dir=dist --site=cin7-ai-playground.netlify.app

echo "Deployment completed!"