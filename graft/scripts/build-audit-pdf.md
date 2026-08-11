# scripts\build-audit-pdf.mjs

Standalone build script that converts the Darshya V3 audit report from markdown into a styled, paginated A4 PDF by rendering hand-rolled HTML in headless Chromium via playwright-core.

- escapeHtml · function · L17-L22 — Escapes &, <, and > so raw report text can be safely embedded into the generated HTML without breaking markup or injecting tags.
