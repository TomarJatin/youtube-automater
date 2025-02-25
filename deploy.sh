#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
pnpm prisma generate

# Build the application
echo "🏗️ Building application..."
pnpm build

# Start the application with PM2
echo "🌟 Starting application..."
pm2 delete youtube-automater 2>/dev/null || true
pm2 start npm --name "youtube-automater" -- start

echo "✅ Deployment complete!"
