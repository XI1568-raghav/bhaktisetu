# 147 Page-Level JSON-LD Nonce Codemod — jscodeshift

> **Roadmap item**: R-Q1-E-006 (P1) · **Authored**: 2026-06-13

## Goal

Mechanical codemod 147 page-level JSON-LD `<script>` tags to include `nonce={nonce}` per CSP nonce migration (shipped 7adbd87).

## Why

CSP shipped strict-dynamic + nonce. All inline `<script>` MUST carry nonce or browser blocks. 147 page-level JSON-LD scripts need the codemod.

## jscodeshift transform

`scripts/codemods/add-jsonld-nonce.js`:

```javascript
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift
  const root = j(fileInfo.source)
  
  root.find(j.JSXElement, {
    openingElement: { name: { name: 'script' } }
  })
  .filter(path => {
    const attrs = path.node.openingElement.attributes
    return attrs.some(attr => 
      attr.type === 'JSXAttribute' &&
      attr.name.name === 'type' &&
      attr.value?.value === 'application/ld+json'
    )
  })
  .forEach(path => {
    const attrs = path.node.openingElement.attributes
    const hasNonce = attrs.some(attr => 
      attr.type === 'JSXAttribute' && attr.name.name === 'nonce'
    )
    if (hasNonce) return  // already has it
    
    attrs.push(j.jsxAttribute(
      j.jsxIdentifier('nonce'),
      j.jsxExpressionContainer(j.identifier('nonce'))
    ))
  })
  
  return root.toSource({ quote: 'single' })
}
```

## Run

```bash
# Find affected files
rg -l 'type="application/ld\+json"' apps/web/app > /tmp/jsonld-files.txt
wc -l /tmp/jsonld-files.txt  # expect ~147

# Dry-run
pnpm exec jscodeshift -t scripts/codemods/add-jsonld-nonce.js \
  --dry --print --extensions tsx,ts \
  $(cat /tmp/jsonld-files.txt)

# Apply
pnpm exec jscodeshift -t scripts/codemods/add-jsonld-nonce.js \
  --extensions tsx,ts \
  $(cat /tmp/jsonld-files.txt)
```

## Per-page nonce wiring (if not present)

Each page needs:
```typescript
import { headers } from 'next/headers'
const nonce = (await headers()).get('x-nonce') ?? ''
```

If `nonce` variable not in scope, codemod adds via separate pass.

## Verify

```bash
# Build check
pnpm next build

# Curl prod page → confirm nonce attr present
curl -s https://darshya.online/pujas/rudrabhishek | grep -E 'type="application/ld\+json"' | grep -c 'nonce='
# Expect: matches count of JSON-LD scripts on page
```

## Engineering tickets

- R-Q1-E-006a: jscodeshift transform
- R-Q1-E-006b: 147 files mechanical apply
- R-Q1-E-006c: Per-page nonce wire pass

## Closes

R-Q1-E-006 — spec shipped.
