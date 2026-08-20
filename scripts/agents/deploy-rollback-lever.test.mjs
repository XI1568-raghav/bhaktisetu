/**
 * OPS-06 — the written rollback procedure could not work.
 *
 * `docs/deploy-runbook-2026-04-28.md` and `docs/sentry-releases.md` both said
 * roll back by reverting the commit and pushing. Both Render services are
 * `autoDeploy: false` (`render.yaml:28` and `:60`) and no workflow deploys from
 * main, so a push changes nothing that is serving traffic. Following the
 * procedure during an outage produces a green git history and an unchanged
 * production.
 *
 * The mechanism that does exist is a `workflow_dispatch` on `render-diag.yml`.
 * Before 2026-08-20 even that could not roll back: the deploy step declared a
 * `branch` input, never referenced it, and POSTed a body containing only
 * `clearCache`. Render's create-deploy API takes `commitId`, not a branch — so
 * the only thing the dispatch could deploy was whatever the service's tracked
 * branch already pointed at. Rolling back still required authoring, reviewing
 * and merging a revert first, while production was down.
 *
 * This guards the lever the runbook now depends on. Structure is asserted from
 * the parsed YAML; the one text check strips shell comments before matching, so
 * a comment that merely names `commitId` can never satisfy it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const WORKFLOW = '.github/workflows/render-diag.yml';

function deployStep(text) {
  const doc = yaml.load(text) ?? {};
  const steps = doc.jobs?.diag?.steps ?? [];
  return steps.find((s) => typeof s?.if === 'string' && s.if.includes("inputs.mode == 'deploy'"));
}

/** Drop whole-line shell comments so a `# ... commitId ...` line proves nothing. */
export function stripShellComments(script) {
  return String(script ?? '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
}

// Verbatim shape of the deploy step before 2026-08-20. `branch` is declared and
// bound into the environment, and is then never used by the request.
const PRE_FIX = `name: Render diag
on:
  workflow_dispatch:
    inputs:
      mode:
        default: 'deploys'
      sid:
        default: 'srv-d970l2ks728c738fc33g'
      branch:
        description: 'branch to deploy (for clearCache)'
        default: 'main'
jobs:
  diag:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deploy + poll to live + curl
        if: \${{ github.event.inputs.mode == 'deploy' }}
        env:
          RK: \${{ secrets.RENDER_API_KEY }}
          SID: \${{ github.event.inputs.sid }}
          BRANCH: \${{ github.event.inputs.branch }}
        run: |
          # a rollback would need commitId here, and there is none
          r=$(curl -s -X POST -H "$A" --data "{\\"clearCache\\":\\"clear\\"}" "https://api.render.com/v1/services/$SID/deploys")
`;

describe('OPS-06 — the deploy dispatch must be able to deploy a chosen commit', () => {
  it('the pre-fix workflow had no commit lever at all', () => {
    const doc = yaml.load(PRE_FIX);
    expect(doc.on.workflow_dispatch.inputs.commit).toBeUndefined();

    const step = deployStep(PRE_FIX);
    expect(step).toBeDefined();
    expect(step.env.COMMIT).toBeUndefined();
    // The comment naming commitId must not count as the lever existing.
    expect(stripShellComments(step.run)).not.toContain('commitId');
  });

  it('render-diag.yml now exposes a `commit` input', () => {
    const doc = yaml.load(readFileSync(WORKFLOW, 'utf8'));
    expect(doc.on.workflow_dispatch.inputs.commit).toBeDefined();
  });

  it('the deploy step binds that input and sends it as commitId', () => {
    const step = deployStep(readFileSync(WORKFLOW, 'utf8'));
    expect(step).toBeDefined();
    expect(step.env.COMMIT).toBe('${{ github.event.inputs.commit }}');
    expect(stripShellComments(step.run)).toContain('commitId');
  });

  it('the runbook the workflow points at exists', () => {
    // A dispatch nobody can find is the same as no dispatch. The input
    // description names this file; it has to be there.
    expect(() => readFileSync('docs/runbooks/prod-rollback.md', 'utf8')).not.toThrow();
  });

  it('render.yaml still has autoDeploy disabled on both services — the runbook assumes it', () => {
    // If this ever flips to true, pushing WOULD deploy and the runbook must be
    // rewritten again. Failing here is the reminder.
    const doc = yaml.load(readFileSync('render.yaml', 'utf8'));
    const services = doc.services ?? [];
    expect(services.length).toBeGreaterThanOrEqual(2);
    for (const svc of services) {
      expect(svc.autoDeploy).toBe(false);
    }
  });
});
