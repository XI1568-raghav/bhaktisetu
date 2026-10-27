import coreWebVitals from 'eslint-config-next/core-web-vitals';

// Next 16 removed `next lint`; ESLint runs directly (`pnpm lint`).
//
// The lint script was a no-op until 2026-10 (eslint 8 + the root `ajv` override
// crashed), so the backlog below was never surfaced. eslint-config-next 16 also
// turns on the React Compiler rule set. These rules are warnings, not errors,
// so the gate catches NEW classic problems (rules-of-hooks, a11y, undefined
// vars) without blocking on ~300 pre-existing findings. Burn them down, then
// delete the matching line.
const BACKLOG = [
  'react-hooks/set-state-in-effect',
  'react-hooks/preserve-manual-memoization',
  'react-hooks/purity',
  'react-hooks/immutability',
  'react-hooks/refs',
  'react/no-unescaped-entities',
  '@next/next/no-html-link-for-pages',
];

export default [
  ...coreWebVitals,
  { ignores: ['.next/**', '.open-next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'] },
  { rules: Object.fromEntries(BACKLOG.map((r) => [r, 'warn'])) },
];
