#!/bin/bash
set -e

echo "=== BHAKTISETU REGRESSION CHECK ==="
echo ""

echo "1. Type checking..."
pnpm turbo type-check
echo ""

echo "2. Building all apps..."
pnpm turbo build
echo ""

echo "3. Running unit tests..."
pnpm turbo test
echo ""

echo "4. All checks passed!"
