// Sub-agent runner — spawns role-specific Opus 4.7 worker to compose queue files per item.
// Returns parsed queue files + errors + usage. Catches Opus throw (proxy 403/ModelRejected
// etc) → returns empty queueFiles w/ error string (orchestrator handles partial failure).
import yaml from 'js-yaml';
import { callOpus47 } from './_anthropic-client.mjs';

// Structured-output tool for queue files (0-queue-write fix, 2026-07-31).
// A model does not reliably emit the `---END-QUEUE-FILE---` + YAML-frontmatter
// text format, so sub-agents returned rich briefings that evaporated into
// "0 queue files". Request each queue file as a `write_queue` tool_use block —
// the same structured-output mechanism the Decision Agent already uses — and
// parse it directly from `content.filter(c => c.type === 'tool_use')`. The
// legacy text/frontmatter parser below is kept as a fallback.
const WRITE_QUEUE_TOOL = {
  name: 'write_queue',
  description:
    'Emit ONE queue file for a roadmap item. Call once per item. The input IS the queue file: frontmatter fields at top level + the Claude Code prompt in `body`.',
  input_schema: {
    type: 'object',
    required: [
      'queueId',
      'itemId',
      'role',
      'emittedAt',
      'cycle',
      'priority',
      'estTokens',
      'estMinutes',
      'body',
    ],
    properties: {
      queueId: { type: 'string', description: 'Q-<cycleId>-<itemId>' },
      itemId: { type: 'string' },
      role: { type: 'string' },
      emittedAt: { type: 'string', description: 'ISO timestamp' },
      cycle: { type: 'string' },
      priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
      estTokens: { type: 'integer', minimum: 1000, maximum: 50000 },
      estMinutes: { type: 'integer', minimum: 15, maximum: 360 },
      consumedAt: { type: ['string', 'null'] },
      consumedBy: { type: ['string', 'null'] },
      consumedInSessionId: { type: ['string', 'null'] },
      body: { type: 'string', description: 'The self-contained Claude Code prompt (markdown).' },
    },
  },
};

const SUBAGENT_SYSTEM = (role) => `You are ${role}-agent for Bhaktisetu. Opus 4.7 max effort.
Master Orchestrator spawned you to compose Claude Code prompts for specific roadmap items.

Your job:
  1. Read each item's full content (provided)
  2. Compose ONE Claude Code prompt PER ITEM
  3. Each prompt must be:
     - Self-contained (paste into /goal command works without other context)
     - Cite all files + line numbers to touch
     - Specify TDD test-first per superpowers doctrine
     - List success_criteria verbatim from item
     - Include verify commands (curl / SQL / pnpm test)
     - Estimate token + minute cost
     - Tag founder-action required steps explicitly
  4. Output format: ONE markdown document per item, separated by line "---END-QUEUE-FILE---"
  5. Each document starts with YAML frontmatter. REQUIRED fields:
     - queueId (Q-<cycleId>-<itemId>)
     - itemId
     - role
     - emittedAt (ISO timestamp)
     - cycle (cycle ID passed in your context)
     - priority (P0/P1/P2/P3 from item)
     - estTokens (1000-50000)
     - estMinutes (15-360)
     - consumedAt: null
     - consumedBy: null
     - consumedInSessionId: null
     Plus item-specific fields as relevant (featureFlag, prFlag, founderActionRequired, scopeNote, etc).
     The consumed* fields MUST be present even though null — queue-pop.ps1 replaces them when founder consumes.

Tone: terse caveman per Bhaktisetu doctrine. Code blocks normal. Security warnings normal.
Never invent file paths.`;

export async function runSubagent({
  role,
  itemIds,
  briefing,
  items,
  cycleId,
  opusFn = callOpus47,
}) {
  const targetItems = items.filter((i) => itemIds.includes(i.id));
  const userMsg = `Briefing: ${briefing}\n\nItems to process (compose one queue file per item):\n\n${targetItems
    .map((i) => `## ${i.id} — ${i.title}\n\`\`\`yaml\n${yaml.dump(i)}\n\`\`\``)
    .join(
      '\n\n',
    )}\n\nCycle: ${cycleId}\nEmit each queue file by calling the \`write_queue\` tool ONCE per item (structured output — do NOT write ---END-QUEUE-FILE--- markers or raw YAML frontmatter in prose).`;

  const errors = [];
  let response;
  // Sub-agent budget trimmed 16k→12k tokens, 12min→8min wall (2026-06-12) for
  // Render free-tier survival. Cycle 8 observed killed mid-stream by Render
  // container restart. Smaller budget = faster completion = better chance of
  // surviving the next restart-event.
  const PER_SUBAGENT_TIMEOUT_MS = 8 * 60 * 1000;
  let timeoutHandle;
  try {
    const timer = new Promise((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`sub-agent ${role} timeout after ${PER_SUBAGENT_TIMEOUT_MS}ms`)),
        PER_SUBAGENT_TIMEOUT_MS,
      );
      if (timeoutHandle.unref) timeoutHandle.unref();
    });
    response = await Promise.race([
      opusFn({
        system: SUBAGENT_SYSTEM(role),
        messages: [{ role: 'user', content: userMsg }],
        maxTokens: 12000,
        tools: [WRITE_QUEUE_TOOL],
      }),
      timer,
    ]);
  } catch (e) {
    return { queueFiles: [], errors: [e.message], usage: null };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }

  // Preferred path: write_queue tool_use blocks (structured output, immune to
  // the model text-format drift that caused the 0-queue-write bug).
  const queueFiles = [];
  const toolCalls = (response.content || []).filter(
    (c) => c?.type === 'tool_use' && c?.name === 'write_queue',
  );
  for (const tc of toolCalls) {
    const input = tc?.input ?? {};
    const { body, ...frontmatter } = input;
    if (!frontmatter.queueId || !frontmatter.itemId) {
      errors.push('write_queue block missing queueId or itemId');
      continue;
    }
    queueFiles.push({ frontmatter, body: typeof body === 'string' ? body : '', raw: null });
  }
  if (queueFiles.length > 0) {
    return { queueFiles, errors, usage: response.usage };
  }

  // Legacy fallback: ---END-QUEUE-FILE--- + YAML-frontmatter text parsing.
  const text = response.content.find((c) => c.type === 'text')?.text || '';
  const chunks = text
    .split(/^---END-QUEUE-FILE---$/m)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const m = chunk.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) {
      errors.push(`malformed queue file: ${chunk.slice(0, 100)}`);
      continue;
    }
    try {
      const frontmatter = yaml.load(m[1]);
      const body = m[2];
      if (!frontmatter?.queueId || !frontmatter?.itemId) {
        errors.push(`missing queueId or itemId in: ${chunk.slice(0, 100)}`);
        continue;
      }
      queueFiles.push({ frontmatter, body, raw: chunk });
    } catch (e) {
      errors.push(`yaml parse fail: ${e.message}`);
    }
  }

  return { queueFiles, errors, usage: response.usage };
}
