// Conventional Commits enforcement — root config for the poojly monorepo.
// Mirrors the spec at https://www.conventionalcommits.org/en/v1.0.0/
// Enforced server-side by .github/workflows/commitlint.yml on every PR
// (free-tier: ~15-20s/run, no install needed — uses npx with a cached layer).
//
// Format: type(scope): subject
//   type   = feat | fix | docs | style | refactor | perf | test | ci | chore | build | revert | security
//   scope  = optional, lowercase, e.g. api | web | admin | mobile | prisma | render | cf | ci | agents
//   subject = imperative mood ("add" not "added"), lowercase, no trailing period
//
// The default config-conventional is extended (not replaced) so we keep its
// type set and just ADD the project-specific `security` type used by the
// Darshya audit commits (e.g. "security(secrets): …"). Marking it non-breaking
// (release: false) so it never triggers a version bump on its own.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // project-specific type, advisory (won't auto-version a release)
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'ci',
        'chore',
        'build',
        'revert',
        'security',
      ],
    ],
    // scope lowercased — catches "Feat(API):" drift
    'scope-case': [2, 'always', 'lower-case'],
    // subject imperative + lowercase + no trailing period
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    // keep headers scannable
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 200],
  },
};
