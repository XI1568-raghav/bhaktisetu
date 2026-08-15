import { permanentRedirect } from 'next/navigation';

/**
 * TD-04 (prod sweep 2026-08-12): this path answered 404.
 *
 * Every temple card on the site badges its stream "LIVE", so `/live` is the URL
 * a devotee types and a partner links — and there was no route behind it. The
 * error page it served carried the homepage <title>, so a WhatsApp preview or a
 * SERP snippet made the dead end look like a real Darshya page and it kept
 * getting shared.
 *
 * The hub already exists at /darshan. A 308 rather than a rendered alias so the
 * two URLs never compete for the same query, matching how the legacy /kundli
 * and /festivals paths are handled.
 */
export default function LivePage(): never {
  permanentRedirect('/darshan');
}
