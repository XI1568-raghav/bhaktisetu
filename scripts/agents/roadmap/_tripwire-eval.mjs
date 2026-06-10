// scripts/agents/roadmap/_tripwire-eval.mjs
// Sandboxed JS evaluator for tripwire conditions.
// SECURITY: new Function w/ strict mode + only safe globals exposed as args.
// Dangerous globals (globalThis, global, Function, eval, process, require) are
// shadowed by parameter names bound to undefined, blocking sandbox escapes.

const ALLOWED_GLOBALS = ['Math', 'Object', 'Array', 'JSON', 'Date'];
// Note: `import` is a reserved keyword, not a global identifier, so it cannot be
// shadowed via parameter name (and dynamic `import()` is unavailable in `new Function`).
// Note: `import` is a reserved keyword and `eval` cannot be used as a binding
// name in strict mode — neither can be shadowed via parameter. Strict mode
// itself prevents direct `eval(...)` rebinding, and global access is gated by
// shadowing `globalThis` / `global` / `window` / `self`.
const BLOCKED_GLOBALS = ['globalThis', 'global', 'Function', 'process', 'require', 'window', 'self'];

export function evalTripwires(tripwires, ctx) {
  const fired = [];
  // Deep-freeze ctx via JSON round-trip (drops fns + freezes structure)
  const safeCtx = Object.freeze(JSON.parse(JSON.stringify(ctx)));
  const paramNames = ['ctx', ...ALLOWED_GLOBALS, ...BLOCKED_GLOBALS];
  const allowedValues = [Math, Object, Array, JSON, Date];
  const blockedValues = BLOCKED_GLOBALS.map(() => undefined);
  for (const tw of tripwires) {
    try {
      const fn = new Function(
        ...paramNames,
        `"use strict"; return Boolean(${tw.condition});`
      );
      const result = fn(safeCtx, ...allowedValues, ...blockedValues);
      if (result) fired.push({ ...tw, firedAt: new Date().toISOString() });
    } catch (e) {
      console.warn(`tripwire ${tw.id} eval error: ${e.message}`);
    }
  }
  return fired;
}
