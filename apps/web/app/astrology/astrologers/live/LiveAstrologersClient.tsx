'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Star,
  UserRound,
} from 'lucide-react';
import { API_BASE_URL, fetchWithTimeout, isNetworkFailure } from '../../../../lib/api-config';
import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';

/**
 * The REAL astrologer directory.
 *
 * Every other astrologer surface on the consumer side reads
 * `GET /astrology/astrologers`, which is a 15-row in-memory MOCK fixture. This
 * page reads `GET /astrology/astrologers/live` — approved `AstrologerProfile`
 * rows, with the online badge fed by the go-online toggle in the astrologer
 * portal (apps/api/src/routes/astrology.ts:132).
 *
 * Nothing on this page is invented. There is deliberately no fallback array:
 * if the fetch fails the page says the fetch failed, and if the directory is
 * empty it says the directory is empty. A devotee must never be able to pay to
 * consult someone who does not exist, and a real astrologer's card must never
 * carry a stranger's stock portrait — hence initials, not photos, since the
 * API carries no image for these profiles.
 */

// Mirrors the API payload exactly. Optional fields are optional because the DB
// columns are nullable — they are rendered as "unknown", never as a made-up value.
export interface LiveAstrologer {
  id: string;
  userId: string;
  name: string;
  specializations?: string[] | null;
  languages?: string[] | null;
  experienceYears?: number | null;
  rating?: number | null;
  consultationCount?: number | null;
  perMinuteRate?: number | null;
  isOnline?: boolean;
  mode?: { chat?: boolean; call?: boolean } | null;
  bio?: string | null;
  verified?: boolean;
}

type LoadState = 'loading' | 'ready' | 'error';

const FETCH_TIMEOUT_MS = 15_000;

function initials(name: string): string {
  const words = name
    .replace(/\b(pt\.?|pandit|acharya|dr\.?|shri|smt\.?|guru)\b/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const picked = words.length > 0 ? words : name.trim().split(/\s+/).filter(Boolean);
  return picked
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= Math.round(rating) ? 'text-amber-500 fill-amber-500' : 'text-surface-300'
          }`}
        />
      ))}
    </span>
  );
}

function AstrologerCard({ a }: { a: LiveAstrologer }) {
  const online = a.isOnline === true;
  const rating = typeof a.rating === 'number' && a.rating > 0 ? a.rating : null;
  const consults = typeof a.consultationCount === 'number' ? a.consultationCount : 0;
  const rate = typeof a.perMinuteRate === 'number' && a.perMinuteRate > 0 ? a.perMinuteRate : null;
  const languages = (a.languages ?? []).filter(Boolean);
  const specializations = (a.specializations ?? []).filter(Boolean);

  return (
    <div className="group flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all duration-300 card-hover">
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div
              className="w-16 h-16 rounded-xl bg-gradient-to-br from-saffron-100 to-amber-100 text-saffron-700 flex items-center justify-center font-serif text-xl font-semibold"
              aria-hidden="true"
            >
              {initials(a.name) || <UserRound className="w-7 h-7" />}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                online ? 'bg-emerald-400' : 'bg-surface-400'
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-sm font-bold text-surface-800 truncate">{a.name}</h3>
              {a.verified && <BadgeCheck className="w-4 h-4 text-saffron-600 shrink-0" />}
            </div>

            {rating !== null ? (
              <div className="flex items-center gap-1.5 mb-1">
                <Stars rating={rating} />
                <span className="text-xs text-surface-500">
                  {rating.toFixed(1)}
                  {consults > 0 && ` · ${consults.toLocaleString('en-IN')} consults`}
                </span>
              </div>
            ) : (
              <p className="text-xs text-surface-500 mb-1">
                {consults > 0
                  ? `${consults.toLocaleString('en-IN')} consults · not rated yet`
                  : 'New on Darshya · not rated yet'}
              </p>
            )}

            <p className="text-xs text-surface-500">
              {typeof a.experienceYears === 'number' && a.experienceYears > 0
                ? `${a.experienceYears} yrs exp`
                : 'Experience not listed'}
              {languages.length > 0 && ` | ${languages.slice(0, 2).join(', ')}`}
            </p>
          </div>
        </div>
      </div>

      {specializations.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {specializations.slice(0, 3).map((spec) => (
              <span
                key={spec}
                className="text-xs font-medium px-2 py-0.5 rounded-md bg-saffron-50 text-saffron-600"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {online && (a.mode?.chat || a.mode?.call) && (
        <div className="px-4 pb-3 flex items-center gap-3 text-xs text-surface-500">
          {a.mode?.chat && (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </span>
          )}
          {a.mode?.call && (
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Call
            </span>
          )}
        </div>
      )}

      <div className="mt-auto px-4 pb-4 flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-surface-800">
          {rate !== null ? (
            <>
              <span className="text-lg">{'₹'}{rate}</span>
              <span className="text-xs font-normal text-surface-400">/min</span>
            </>
          ) : (
            <span className="text-xs font-normal text-surface-400">Rate on request</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/astrology/${a.id}`}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-surface-200 text-surface-600 hover:border-saffron-300 hover:text-saffron-600 transition-all duration-200"
          >
            Profile
          </Link>
          <Link
            href={`/astrology/${a.id}/book`}
            className={buttonClass(online ? 'primary' : 'secondary', 'sm')}
          >
            {online ? 'Consult now' : 'Book a slot'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LiveAstrologersClient() {
  const [state, setState] = useState<LoadState>('loading');
  const [astrologers, setAstrologers] = useState<LiveAstrologer[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [activeSpec, setActiveSpec] = useState<string>('All');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setErrorMessage(null);

    (async () => {
      try {
        const res = await fetchWithTimeout(
          `${API_BASE_URL}/astrology/astrologers/live`,
          { cache: 'no-store' },
          FETCH_TIMEOUT_MS,
        );
        if (!res.ok) {
          if (!cancelled) {
            setErrorMessage(
              "We couldn't load the astrologer directory just now. Please try again.",
            );
            setState('error');
          }
          return;
        }
        const json = (await res.json()) as { astrologers?: unknown };
        const list = Array.isArray(json?.astrologers) ? (json.astrologers as LiveAstrologer[]) : [];
        if (cancelled) return;
        // An unrecognised payload is an error, not an empty directory — saying
        // "no astrologers" when the API answered something else is a lie.
        if (!Array.isArray(json?.astrologers)) {
          setErrorMessage(
            "We couldn't load the astrologer directory just now. Please try again.",
          );
          setState('error');
          return;
        }
        setAstrologers(list.filter((a) => a && typeof a.id === 'string' && !!a.name));
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          isNetworkFailure(err)
            ? "We couldn't reach Darshya to load the astrologer directory. Check your connection and try again."
            : "We couldn't load the astrologer directory just now. Please try again.",
        );
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  // Filter pills are built from what the API actually returned — no invented taxonomy.
  const specializations = useMemo(() => {
    const set = new Set<string>();
    for (const a of astrologers) for (const s of a.specializations ?? []) if (s) set.add(s);
    return ['All', ...Array.from(set).sort((x, y) => x.localeCompare(y))];
  }, [astrologers]);

  const visible = useMemo(
    () =>
      astrologers.filter((a) => {
        if (onlineOnly && a.isOnline !== true) return false;
        if (activeSpec !== 'All' && !(a.specializations ?? []).includes(activeSpec)) return false;
        return true;
      }),
    [astrologers, onlineOnly, activeSpec],
  );

  const onlineCount = astrologers.filter((a) => a.isOnline === true).length;

  return (
    <section className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-10 lg:py-14">
      <Link
        href="/astrology"
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-saffron-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Astrology
      </Link>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-saffron-600">Verified · onboarded</p>
          <h1 className={`${H1.catalogue} mt-1`}>
            Live astrologer directory
          </h1>
          <p className="text-surface-500 mt-1 max-w-2xl prose-body">
            Every astrologer here is a real, approved Darshya profile. Availability comes from
            their own go-online status, so an &ldquo;Online&rdquo; badge means they are at their
            desk right now.
          </p>
        </div>

        {state === 'ready' && astrologers.length > 0 && (
          <p className="text-sm text-surface-500 shrink-0">
            <span className="font-semibold text-surface-800">{astrologers.length}</span> verified ·{' '}
            <span className="font-semibold text-emerald-600">{onlineCount}</span> online now
          </p>
        )}
      </div>

      {state === 'ready' && astrologers.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 text-saffron-600 focus:ring-saffron-400"
            />
            Online only
          </label>
          {specializations.length > 1 &&
            specializations.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => setActiveSpec(spec)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeSpec === spec
                    ? 'bg-saffron-600 text-white shadow-md'
                    : 'bg-white text-surface-600 border border-surface-200 hover:border-saffron-300 hover:text-saffron-600'
                }`}
              >
                {spec}
              </button>
            ))}
        </div>
      )}

      {state === 'loading' && (
        <div className="mt-8">
          <p className="flex items-center gap-2 text-sm text-surface-500">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Loading verified astrologers…
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-xl border border-[var(--color-border)] bg-surface-50 animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-6">
          <p className="font-semibold text-surface-800">
            {errorMessage ?? "We couldn't load the astrologer directory just now."}
          </p>
          <p className="mt-1 text-sm text-surface-600">
            Nothing is shown rather than a guess — this directory only ever lists real, approved
            astrologers, so we would rather show you nothing than someone who is not here.
          </p>
          <button
            type="button"
            onClick={retry}
            className={buttonClass('primary', 'md', 'mt-4')}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {state === 'ready' && astrologers.length === 0 && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="font-serif text-lg text-surface-800">No astrologers are listed yet</p>
          <p className="mx-auto mt-2 max-w-xl prose-meta text-surface-600">
            No approved astrologer has gone live on Darshya so far. As soon as one is verified they
            appear here. In the meantime the free Vedic calculators are open to everyone.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/astrology"
              className={buttonClass('primary', 'md')}
            >
              Free astrology tools
            </Link>
            <Link
              href="/become-astrologer"
              className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
            >
              Join as an astrologer
            </Link>
          </div>
        </div>
      )}

      {state === 'ready' && astrologers.length > 0 && visible.length === 0 && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="font-serif text-lg text-surface-800">
            No astrologers match this filter right now
          </p>
          <p className="mt-2 text-sm text-surface-600">
            {onlineOnly
              ? 'Nobody is online at this moment. Clear the filter to see everyone and book a slot.'
              : 'Try another specialization.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setOnlineOnly(false);
              setActiveSpec('All');
            }}
            className="mt-4 rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50"
          >
            Clear filters
          </button>
        </div>
      )}

      {state === 'ready' && visible.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visible.map((a) => (
            <AstrologerCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </section>
  );
}
