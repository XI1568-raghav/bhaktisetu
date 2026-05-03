import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

// `as-needed` keeps existing English URLs unprefixed so we don't have to
// rewrite the entire app at once — only new translated pages opt in.
export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'as-needed',
});
