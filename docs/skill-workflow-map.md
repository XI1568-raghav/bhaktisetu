# Skill → workflow map

> Which Claude Code skill to invoke for each business-ops task.
> Last refreshed: 2026-04-27. Update when a workflow changes owners or skill is replaced.

All skills below are pre-installed (`superpowers` plugin + base skill set + `caveman` plugin).
Plugin marketplace state: `obra/superpowers-marketplace`, `JuliusBrussee/caveman`.

## Marketing & content

| Workflow | Skill |
|---|---|
| Write the 9 pending marketing/legal pages | `frontend-design` + `marketing-skills` |
| Sharpen ICP (NRI / domestic devotee / temple admin) | `ICP-builder` |
| Competitor teardown (Vama, Sri Mandir, Utsav, AppsForBharat) | `competitive-teardown`, `competitive-matrix` |
| 10 SEO blog posts from `LAUNCH_STRATEGY.md` Phase 3 | `claude-seo`, `content-research-writer` |
| Repurpose one blog → tweets / LinkedIn / newsletter | `marketing-skills` (38 bundled) |
| NRI cold outreach to temple/community contacts | `cold-email-personalizer` |
| Temple partnership pitch deck | `sales-enablement-asset`, `pptx` |
| Win-back lapsed beta users | `winback-campaign-generator` |
| Brand voice consistency | `brand-guidelines` (also see `docs/BRAND_GUIDELINES.md`) |
| Lock down terse output style during low-context tasks | `caveman:caveman` |

## Data & analytics

| Workflow | Skill |
|---|---|
| Cluster NPS survey free-text | `NPS-survey-clusterer` |
| Cluster churn signals (once data exists) | `churn-analyzer` |
| Synthesize user interview transcripts | `user-interview-analyzer` |
| Interpret A/B experiment results | `experiment-interpreter` |

## Engineering ops

| Workflow | Skill |
|---|---|
| Sentry error → root cause | `superpowers:systematic-debugging` |
| PR review | `/review`, `code-review`, `superpowers:requesting-code-review` |
| Pre-launch security audit | `/security-review`, `security-audit` |
| Pre-deploy verification | `superpowers:verification-before-completion` |
| Dispatch parallel research agents | `superpowers:dispatching-parallel-agents` |
| Plan multi-phase work | `superpowers:write-plan` → `superpowers:execute-plan` |
| Worktree-based parallel branches | `superpowers:using-git-worktrees` |
| TDD a new feature | `superpowers:test-driven-development` |
| Add types to legacy JS | `add-types` |
| Refactor a function safely | `refactor-function` |
| Find missing test coverage | `coverage-gap` |
| Write a runbook for an incident class | `runbook` |
| Write an alert rule | `alert-rule` |
| Sentry/PostHog query templates | `monitoring-query` |
| Audit dependencies | `dependency-audit` |
| Plan a deprecation | `deprecation-path` |
| Architectural Decision Record | `adr` |
| Generate API endpoint scaffold | `api-endpoint`, `api-client`, `api-docs` |
| OpenAPI client SDK | `api-client` |
| K8s/Dockerfile/Terraform module | `k8s-manifest`, `dockerfile`, `terraform-module` |
| GitHub Actions workflow | `github-action` |
| CI/CD failure debug | `cicd-debug` |
| Load test script (k6) | `load-test` |
| E2E test (Playwright) | `e2e-test` |
| Property test | `property-test` |
| Snapshot test | `snapshot-test` |
| Regression test | `regression-test` |
| Contract test (Pact) | `contract-test` |
| Test data builder | `test-data-builder`, `seed-data` |
| Mock server (MSW) | `mock-server` |
| Improve flaky tests | `test-refactor` |
| Storybook story | `storybook-story` |
| Component scaffold | `component-scaffold` |
| Merge conflict resolve | `merge-conflict-resolve` |
| Branch name from issue | `branch-name` |
| Commit message | `commit-message` |
| PR description | `pr-description` |
| Changelog entry | `changelog-entry` |
| Release notes | `release-notes` |
| README section | `readme-section` |
| JSDoc | `jsdoc` |
| Inline code comment (only when WHY non-obvious) | `code-comment` |
| Document env vars | `env-vars` |
| Feature flag rollout plan | `feature-flag` |
| Error handling pass | `error-handling` |
| Performance audit | `performance-audit` |
| Accessibility audit (WCAG) | `accessibility-audit` |
| Write a DB migration | `write-migration` |
| Write tests | `write-tests` |

## Product & strategy

| Workflow | Skill |
|---|---|
| Generate PRD from rough idea | `PRD-generator` |
| Convert PRD into user stories | `user-story-writer` |
| Build / update roadmap | `roadmap-builder` |
| Prioritize features (RICE/ICE) | `feature-prioritization` |
| Stress-test a strategic decision | `steelman-analysis`, `product-strategy-critic` |
| Strategic advisory board (Devil's Advocate, Market Researcher, Financial Modeler) | `superpowers:dispatching-parallel-agents` with role briefs |
| Stakeholder simulation before a hard conversation | `stakeholder-simulator` |
| Monthly stakeholder/investor update | `stakeholder-update` |
| Cost estimate for a feature | `cost-estimate` |
| Opportunity sizing | `opportunity-sizing` |
| SWOT | `SWOT-builder` |

## Finance

| Workflow | Skill |
|---|---|
| Monthly earnings/financial summary | `earnings-brief` |
| Critique a financial model | `financial-model-reviewer` |
| Mutual fund / portfolio comparisons | `mutual-fund-comparison`, `portfolio-rebalance-analyzer` |

## HR / people ops

| Workflow | How (no dedicated skill) |
|---|---|
| Talent sourcing — rank resumes vs. JD | Paste JD + resumes into chat; ask for ranked Top-N with reasons |
| Onboarding 30-60-90 plan | `onboarding-doc` (then `onboarding-rewriter` to optimize) |
| Pulse survey clustering | `NPS-survey-clusterer` on free-text Google Form responses |

## Legal

| Workflow | How |
|---|---|
| Contract redlining | Paste vendor contract + your standard terms; ask for clause-by-clause diff |
| Compliance monitoring (RBI, MCA, GDPR, IT Act) | Weekly `claude-seo` or `google-news-skill` on regulator sites |

## Customer success

| Workflow | How |
|---|---|
| Knowledge base from Slack / dev notes | `doc-coauthoring` |
| Sentiment-routed ticket priority | Until a ticket MCP exists, paste ticket batch; ask for sentiment + churn-risk score |

## Files / formats

| Workflow | Skill |
|---|---|
| Generate PowerPoint deck | `pptx` |
| Generate Excel/CSV report | `xlsx` |
| Process PDF | `pdf` |
| EPUB / PDF book analyzer | `epub-pdf-analyzer` |
| YouTube transcript extract | `youtube-extractor` |
| NotebookLM bridge | `notebooklm` |
| Browser automation | `browser-act` |

## When no skill fits

Use raw tools (Read/Edit/Bash/Grep/WebFetch) plus `superpowers:brainstorm` to scope the work, then `superpowers:write-plan` if it needs sequencing.

## Skill creation

To add a new skill specific to Darshya (e.g. a `puja-booking-test-fixture` skill): use `skill-creator`. Skills live in `~/.claude/skills/` (user) or project-local `.claude/skills/`.
