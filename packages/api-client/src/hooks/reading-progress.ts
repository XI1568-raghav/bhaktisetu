// ──────────────────────────────────────────────
// @poojly/api-client — Reading Progress Hook
// Hybrid: anon → localStorage, auth → API.
// ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — react peer dep, types provided by host app
import { useEffect, useRef, useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { api, ApiClientError } from "../client.js";
import type { ReadingProgress } from "@poojly/shared";

// poojly_* prefix kept for back-compat (folder is bhaktisetu/, brand is darshya).
const STORAGE_KEY = "poojly_reading_progress";
const FLUSH_THROTTLE_MS = 5_000;

// Endpoints
const BASE = "/api/v1/me/reading-progress";

// ─── Storage helpers (SSR-safe) ──────────────────────────────────────────────

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAllLocal(): Record<string, ReadingProgress> {
  if (!hasLocalStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllLocal(data: Record<string, ReadingProgress>): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded — ignore */
  }
}

function readLocal(bookSlug: string): ReadingProgress | null {
  return readAllLocal()[bookSlug] ?? null;
}

function writeLocal(progress: ReadingProgress): void {
  const all = readAllLocal();
  all[progress.bookSlug] = progress;
  writeAllLocal(all);
}

function clearLocalAll(): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const readingProgressKeys = {
  all: ["reading-progress"] as const,
  list: () => ["reading-progress", "list"] as const,
  detail: (bookSlug: string) => ["reading-progress", "detail", bookSlug] as const,
};

// ─── API response shapes ─────────────────────────────────────────────────────

interface ListResponse {
  success: boolean;
  progress: ReadingProgress[];
}

interface DetailResponse {
  success: boolean;
  progress: ReadingProgress | null;
}

interface UpsertResponse {
  success: boolean;
  progress: ReadingProgress;
  skipped?: boolean;
}

// ─── Hook options ────────────────────────────────────────────────────────────

export interface UseReadingProgressOptions {
  /** When true, hook reads/writes via API. When false (default), localStorage only. */
  isAuthenticated?: boolean;
}

// ─── useReadingProgress(bookSlug) ────────────────────────────────────────────

export function useReadingProgress(
  bookSlug: string,
  options: UseReadingProgressOptions = {}
) {
  const { isAuthenticated = false } = options;
  const queryClient = useQueryClient();

  // Pending updates buffered for throttled flush.
  const pendingRef = useRef<ReadingProgress | null>(null);
  const lastFlushAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Read query ──
  const query = useQuery<ReadingProgress | null>({
    queryKey: readingProgressKeys.detail(bookSlug),
    queryFn: async () => {
      if (isAuthenticated) {
        try {
          const res = await api.get<DetailResponse>(`${BASE}/${bookSlug}`);
          return res.progress ?? readLocal(bookSlug);
        } catch (err) {
          if (err instanceof ApiClientError && err.statusCode === 401) {
            return readLocal(bookSlug);
          }
          throw err;
        }
      }
      return readLocal(bookSlug);
    },
    staleTime: 60_000,
  });

  // ── Mutation: upsert progress ──
  const mutation = useMutation<UpsertResponse | null, ApiClientError, ReadingProgress>({
    mutationFn: async (progress) => {
      // Always write local first — instant UI + offline.
      writeLocal(progress);
      if (!isAuthenticated) return null;
      return api.put<UpsertResponse>(BASE, {
        bookSlug: progress.bookSlug,
        chapterSlug: progress.chapterSlug,
        chapterNumber: progress.chapterNumber,
        scrollPercent: progress.scrollPercent,
        lastVerse: progress.lastVerse,
      });
    },
    onSuccess: (_data, vars) => {
      queryClient.setQueryData(readingProgressKeys.detail(vars.bookSlug), vars);
    },
  });

  // ── Throttled save: caller invokes save(); hook flushes ≤ once per FLUSH_THROTTLE_MS ──
  const flushNow = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    lastFlushAtRef.current = Date.now();
    mutation.mutate(pending);
  }, [mutation]);

  const save = useCallback(
    (progress: Omit<ReadingProgress, "updatedAt">) => {
      const full: ReadingProgress = {
        ...progress,
        updatedAt: new Date().toISOString(),
      };
      pendingRef.current = full;
      const elapsed = Date.now() - lastFlushAtRef.current;
      if (elapsed >= FLUSH_THROTTLE_MS) {
        flushNow();
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          flushNow();
        }, FLUSH_THROTTLE_MS - elapsed);
      }
    },
    [flushNow]
  );

  // beforeunload flush — guarantees last scroll position is persisted.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onUnload = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flushNow();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flushNow]);

  return {
    progress: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    save,
    flushNow,
    isSaving: mutation.isPending,
  };
}

// ─── useAllReadingProgress ───────────────────────────────────────────────────

export function useAllReadingProgress(options: UseReadingProgressOptions = {}) {
  const { isAuthenticated = false } = options;

  return useQuery<ReadingProgress[]>({
    queryKey: readingProgressKeys.list(),
    queryFn: async () => {
      const local = Object.values(readAllLocal());
      if (!isAuthenticated) return local;
      try {
        const res = await api.get<ListResponse>(BASE);
        // merge: server wins per bookSlug, local fills gaps
        const map = new Map<string, ReadingProgress>();
        for (const p of local) map.set(p.bookSlug, p);
        for (const p of res.progress) map.set(p.bookSlug, p);
        return Array.from(map.values()).sort(
          (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
        );
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) return local;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

// ─── useMergeAnonReadingProgress ─────────────────────────────────────────────
// Call once on login. Pushes any localStorage rows to the server.
// Server upserts (last-write-wins), so safe to re-call.

export function useMergeAnonReadingProgress() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiClientError, void>({
    mutationFn: async () => {
      const local = Object.values(readAllLocal());
      if (local.length === 0) return;
      await Promise.all(
        local.map((p) =>
          api.put<UpsertResponse>(BASE, {
            bookSlug: p.bookSlug,
            chapterSlug: p.chapterSlug,
            chapterNumber: p.chapterNumber,
            scrollPercent: p.scrollPercent,
            lastVerse: p.lastVerse,
          }).catch(() => null)
        )
      );
      // Local can stay as cache fallback; do not clear.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: readingProgressKeys.all });
    },
  });
}

// ─── Test surface ────────────────────────────────────────────────────────────

export const __testing = {
  STORAGE_KEY,
  FLUSH_THROTTLE_MS,
  readLocal,
  writeLocal,
  readAllLocal,
  writeAllLocal,
  clearLocalAll,
};
