import { permanentRedirect } from 'next/navigation';

// P1 #214 (2026-08-03): the festivals index lives at `/festival` (singular);
// `/festivals` (plural) was a 404 that recon flagged. Redirect plural → singular
// so any external/bookmarked/plural link resolves instead of dead-ending.
export default function FestivalsRedirect() {
  permanentRedirect('/festival');
}
