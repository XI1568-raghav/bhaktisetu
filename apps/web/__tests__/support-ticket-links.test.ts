import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * There is no app/support/tickets/[id] route: the detail page is
 * /support/tickets/view?id=<id>. The list and the "new ticket" redirect linked
 * to /support/tickets/<id>, so every ticket click was a 404.
 */
const FILES = ['app/support/tickets/page.tsx', 'app/support/ticket/new/page.tsx'];

describe('support ticket links', () => {
  it.each(FILES)('%s links to the view page, not a non-existent dynamic route', (f) => {
    const src = readFileSync(join(__dirname, '..', f), 'utf8');
    expect(src).not.toMatch(/\/support\/tickets\/\$\{/);
    expect(src).toMatch(/\/support\/tickets\/view\?id=\$\{/);
  });
});
