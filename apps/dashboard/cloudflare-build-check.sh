#!/bin/bash
# Cloudflare Pages Build Diagnostic Script
# Checks common issues with Next.js on Cloudflare Pages

echo "🔍 Cloudflare Pages Build Diagnostic"
echo "======================================"
echo ""

# Check 1: Next.js version
echo "✓ Checking Next.js version..."
NEXT_VERSION=$(grep '"next"' package.json | sed 's/.*"next": "\(.*\)".*/\1/')
echo "  Next.js version: $NEXT_VERSION"
echo ""

# Check 2: Build command
echo "✓ Checking package.json scripts..."
BUILD_CMD=$(grep '"build"' package.json | sed 's/.*"build": "\(.*\)".*/\1/')
echo "  Build command: $BUILD_CMD"
echo ""

# Check 3: Node version
echo "✓ Recommended Node version for Next.js 14: v18.17.0 or higher"
if [ -f ".nvmrc" ]; then
  echo "  .nvmrc file found: $(cat .nvmrc)"
else
  echo "  ⚠️  No .nvmrc file found. Cloudflare may use default Node version."
  echo "  Recommendation: Create .nvmrc with '18' or '20'"
fi
echo ""

# Check 4: next.config.js
echo "✓ Checking next.config.js..."
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
  echo "  next.config.js found"
  if grep -q "@cloudflare/next-on-pages" next.config.* 2>/dev/null; then
    echo "  ✓ @cloudflare/next-on-pages detected"
  else
    echo "  ⚠️  @cloudflare/next-on-pages not found in next.config"
    echo "  This is required for Cloudflare Pages deployment"
  fi
else
  echo "  ⚠️  next.config.js not found"
fi
echo ""

# Check 5: Dependencies
echo "✓ Checking critical dependencies..."
if grep -q "@cloudflare/next-on-pages" package.json; then
  echo "  ✓ @cloudflare/next-on-pages installed"
else
  echo "  ❌ @cloudflare/next-on-pages NOT installed"
  echo "  Run: pnpm add -D @cloudflare/next-on-pages"
fi

if grep -q "wrangler" package.json; then
  echo "  ✓ wrangler installed"
else
  echo "  ⚠️  wrangler not installed (optional but recommended)"
fi
echo ""

# Check 6: Build output
echo "✓ Checking for build artifacts..."
if [ -d ".vercel/output" ] || [ -d ".next" ]; then
  echo "  Found build artifacts (should be in .gitignore)"
else
  echo "  No build artifacts found (clean)"
fi
echo ""

# Check 7: Common issues
echo "🔧 Common Cloudflare Pages Build Issues:"
echo "========================================="
echo ""
echo "Issue 1: Missing @cloudflare/next-on-pages"
echo "  Solution: pnpm add -D @cloudflare/next-on-pages"
echo ""
echo "Issue 2: Incorrect build command"
echo "  Should be: npx @cloudflare/next-on-pages"
echo "  Or: pnpm pages:build"
echo ""
echo "Issue 3: Node version mismatch"
echo "  Create .nvmrc with Node 18 or 20"
echo ""
echo "Issue 4: Environment variables not set"
echo "  Set in Cloudflare Pages → Settings → Environment Variables"
echo "  Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL"
echo ""
echo "Issue 5: Using unsupported Next.js features"
echo "  - ISR (Incremental Static Regeneration) not supported"
echo "  - Middleware with redirect/rewrite may need adjustments"
echo "  - Image optimization requires @cloudflare/next-on-pages-image-loader"
echo ""
echo "Issue 6: Import errors or missing dependencies"
echo "  Run: pnpm install --frozen-lockfile"
echo ""

echo "📋 Recommended Cloudflare Pages Settings:"
echo "=========================================="
echo "Build command: pnpm pages:build"
echo "Build output directory: .vercel/output/static"
echo "Root directory: apps/dashboard"
echo "Node version: 18 (set via NODE_VERSION env var)"
echo ""

echo "✅ Diagnostic complete!"
