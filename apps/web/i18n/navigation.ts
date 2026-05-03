import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware Link / useRouter / usePathname / redirect helpers. Use these
// in client components instead of `next/link` whenever the destination should
// follow the active locale.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
