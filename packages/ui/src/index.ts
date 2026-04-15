// ──────────────────────────────────────────────
// @bhaktisetu/ui — Barrel Export & Utilities
// ──────────────────────────────────────────────

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS conflict resolution.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Re-export components
export { Button, type ButtonProps } from "./components/Button.js";
export { Card, CardHeader, CardContent, CardFooter } from "./components/Card.js";
export { Badge, type BadgeProps } from "./components/Badge.js";

// Re-export theme
export { theme } from "./primitives/theme.js";
