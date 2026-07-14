#!/usr/bin/env node
// The Darshya MCP server: a low-level SDK Server over stdio that registers the
// 6 read-only tools (funnel/kpi/agent-reports/agent-report-read/prod-health/
// recent-commits). Each tool ships its own `{ name, description, inputSchema }`
// def (JSON-Schema) plus a handler that validates args via zod internally and
// returns `{ content: [{ type:'text', text }] }`. ListTools returns the defs
// verbatim; CallTool dispatches by name and converts any thrown error into an
// `isError` text response so a single bad tool call can't crash the server.
//
// Import note: the SDK root entry `@modelcontextprotocol/sdk` has NO built
// index.js in 1.29.0 (the package.json `exports` points at a file that isn't
// shipped), so we import from the subpaths that DO exist: `./server`,
// `./server/stdio.js`, and `./types.js`. Verified to resolve at both type-check
// and runtime.
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { disconnectPrisma } from './prisma.js';

import { funnelToday, funnelTodayToolDef } from './tools/funnel-today.js';
import { kpiSnapshot, kpiSnapshotToolDef } from './tools/kpi-snapshot.js';
import { agentReports, agentReportsToolDef } from './tools/agent-reports.js';
import { agentReportRead, agentReportReadToolDef } from './tools/agent-reports.js';
import { prodHealth, prodHealthToolDef } from './tools/prod-health.js';
import { recentCommits, recentCommitsToolDef } from './tools/recent-commits.js';

// Tool registry: name -> { def (name/description/inputSchema), handler (args -> {content}) }.
// The handler is typed loosely (`any` args/return) on purpose: the 6 real
// handlers each have a *narrow* zod-inferred param type (`{}`, `{root?}`, ...)
// that is contravariantly incompatible with a shared `unknown` param, and
// recentCommits returns an untyped `new Promise`. Each handler re-validates its
// own args via zod and returns `{content:[{type:'text',text}]}` at runtime; the
// try/catch in dispatch converts any throw into an isError response. So the
// registry type only needs to be callable for dispatch bookkeeping.
type ToolEntry = {
  def: { name: string; description: string; inputSchema: object };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any) => Promise<any>;
};
const TOOLS: ToolEntry[] = [
  { def: funnelTodayToolDef, handler: funnelToday },
  { def: kpiSnapshotToolDef, handler: kpiSnapshot },
  { def: agentReportsToolDef, handler: agentReports },
  { def: agentReportReadToolDef, handler: agentReportRead },
  { def: prodHealthToolDef, handler: prodHealth },
  { def: recentCommitsToolDef, handler: recentCommits },
];

const server = new Server(
  { name: 'darshya-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

// List: return the tool defs verbatim.
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => t.def),
}));

// Call: dispatch by name. Args come through as params.arguments (unknown).
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = TOOLS.find((t) => t.def.name === name);
  if (!tool) {
    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ error: `Unknown tool: ${name}` }) },
      ],
      isError: true,
    };
  }
  try {
    // Each handler validates its own args via its zod schema + returns {content}.
    return await tool.handler((args ?? {}) as any);
  } catch (err) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: (err as Error).message }) }],
      isError: true,
    };
  }
});

// Graceful shutdown: release the Prisma connection on SIGINT/SIGTERM so we don't
// leak pooled connections when the MCP client disconnects.
async function shutdown() {
  await disconnectPrisma();
  await server.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const transport = new StdioServerTransport();
await server.connect(transport);
// stdio transport keeps the process alive; no explicit listen needed.
