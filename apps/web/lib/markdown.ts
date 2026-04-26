/**
 * Lightweight markdown-to-HTML converter for devotional content.
 * Handles headings, bold, italic, horizontal rules, and line breaks.
 * No external dependencies required.
 */

export function markdownToHtml(md: string): string {
 if (!md) return '';

 // First, handle multi-line bold markers: **...\n...**
 // Replace them with per-line bold so our line-by-line processor can handle them
 let processed = md.replace(/\*\*([^*]+?)\*\*/gs, (_, content: string) => {
 // If the content contains newlines, bold each line individually
 if (content.includes('\n')) {
 return content
 .split('\n')
 .map((line: string) => (line.trim() ? `**${line}**` : ''))
 .join('\n');
 }
 return `**${content}**`;
 });

 // Escape HTML entities
 processed = processed
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;');

 // Process block-level elements
 const lines = processed.split('\n');
 const result: string[] = [];
 let inParagraph = false;

 for (let i = 0; i < lines.length; i++) {
 const line = lines[i] ?? '';

 // Horizontal rule
 if (/^---+$/.test(line.trim())) {
 if (inParagraph) {
 result.push('</p>');
 inParagraph = false;
 }
 result.push('<hr class="my-6 border-surface-200" />');
 continue;
 }

 // Headings (h3 first since ### starts with ##)
 const h3Match = line.match(/^### (.+)$/);
 if (h3Match) {
 if (inParagraph) {
 result.push('</p>');
 inParagraph = false;
 }
 result.push(`<h3 class="text-lg font-bold text-surface-800 mt-6 mb-3">${processInline(h3Match[1] ?? '')}</h3>`);
 continue;
 }

 const h2Match = line.match(/^## (.+)$/);
 if (h2Match) {
 if (inParagraph) {
 result.push('</p>');
 inParagraph = false;
 }
 result.push(`<h2 class="text-xl font-bold text-surface-800 mt-8 mb-4">${processInline(h2Match[1] ?? '')}</h2>`);
 continue;
 }

 // Empty line — close paragraph
 if (line.trim() === '') {
 if (inParagraph) {
 result.push('</p>');
 inParagraph = false;
 }
 continue;
 }

 // Regular text line
 const lineHtml = processInline(line);
 if (!inParagraph) {
 result.push('<p class="text-surface-600 leading-relaxed mb-2">');
 inParagraph = true;
 result.push(lineHtml);
 } else {
 result.push(`<br/>${lineHtml}`);
 }
 }

 if (inParagraph) {
 result.push('</p>');
 }

 return result.join('\n');
}

/**
 * Process inline markdown: bold, italic.
 */
function processInline(text: string): string {
 return text
 // Bold: **text**
 .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-surface-800">$1</strong>')
 // Italic: *text* (but not inside words with underscores)
 .replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '<em class="italic text-surface-500">$1</em>');
}

/**
 * Check if content body is already HTML (starts with an HTML tag).
 * If so, return it as-is; otherwise convert from markdown.
 */
export function renderContentBody(body: string): string {
 if (!body) return '';

 const trimmed = body.trim();

 // If it already starts with an HTML tag, return as-is (legacy format)
 if (trimmed.startsWith('<h') || trimmed.startsWith('<p') || trimmed.startsWith('<div')) {
 return body;
 }

 return markdownToHtml(body);
}
