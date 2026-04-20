#!/bin/bash
set -e

echo "🗄️  Setting up Poojly database..."
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ .env file not found. Copy .env.example to .env first."
  exit 1
fi

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🔄 Applying migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database ready!"
