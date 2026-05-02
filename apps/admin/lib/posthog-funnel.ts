import { z } from "zod";

export interface FunnelStepDef {
  id: string;
  label: string;
  event: string;
  description: string;
  properties?: { key: string; value: string; operator: string; type: string }[];
}

export const FUNNEL_STEPS: FunnelStepDef[] = [
  {
    id: "home_view",
    label: "Home view",
    event: "$pageview",
    description: "Visitor lands on darshya.online home",
    properties: [
      { key: "$pathname", value: "/", operator: "exact", type: "event" },
    ],
  },
  {
    id: "temple_view",
    label: "Temple view",
    event: "temple_viewed",
    description: "Visitor opens a temple detail page",
  },
  {
    id: "puja_view",
    label: "Puja view",
    event: "$pageview",
    description: "Visitor views a puja booking page",
    properties: [
      { key: "$pathname", value: "/pujas/", operator: "icontains", type: "event" },
    ],
  },
  {
    id: "checkout_open",
    label: "Checkout opened",
    event: "booking_started",
    description: "User starts the booking flow",
  },
  {
    id: "payment_success",
    label: "Payment success",
    event: "payment_success",
    description: "Payment completed successfully",
  },
];

export interface FunnelStepResult {
  id: string;
  label: string;
  event: string;
  description: string;
  count: number;
}

export type FunnelFetchResult =
  | { status: "ok"; steps: FunnelStepResult[]; windowDays: number }
  | { status: "missing_config"; missing: string[] }
  | { status: "empty"; steps: FunnelStepResult[]; windowDays: number }
  | { status: "error"; message: string };

const FunnelStepSchema = z.object({
  count: z.number().int().nonnegative(),
  name: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
});

const FunnelResponseSchema = z.object({
  result: z.array(FunnelStepSchema),
});

const NestedFunnelResponseSchema = z.object({
  result: z.array(z.array(FunnelStepSchema)),
});

const POSTHOG_HOST = "https://us.i.posthog.com";
const WINDOW_DAYS = 30;

export async function fetchFunnel(): Promise<FunnelFetchResult> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  const missing: string[] = [];
  if (!apiKey) missing.push("POSTHOG_API_KEY");
  if (!projectId) missing.push("POSTHOG_PROJECT_ID");
  if (missing.length > 0) {
    return { status: "missing_config", missing };
  }

  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const body = {
    insight: "FUNNELS",
    funnel_window_interval: WINDOW_DAYS,
    funnel_window_interval_unit: "day",
    date_from: dateFrom.toISOString().slice(0, 10),
    date_to: dateTo.toISOString().slice(0, 10),
    events: FUNNEL_STEPS.map((step, idx) => ({
      id: step.event,
      name: step.event,
      type: "events",
      order: idx,
      properties: step.properties ?? [],
    })),
  };

  const url = `${POSTHOG_HOST}/api/projects/${projectId}/insights/funnel/`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return {
        status: "error",
        message: `PostHog returned HTTP ${res.status}`,
      };
    }

    const json: unknown = await res.json();

    let stepCounts: number[];
    const flat = FunnelResponseSchema.safeParse(json);
    if (flat.success) {
      stepCounts = flat.data.result.map((s) => s.count);
    } else {
      const nested = NestedFunnelResponseSchema.safeParse(json);
      if (nested.success && nested.data.result.length > 0) {
        const series = nested.data.result[0];
        stepCounts = (series ?? []).map((s) => s.count);
      } else {
        return {
          status: "error",
          message: "PostHog response did not match expected funnel schema",
        };
      }
    }

    const steps: FunnelStepResult[] = FUNNEL_STEPS.map((step, idx) => ({
      id: step.id,
      label: step.label,
      event: step.event,
      description: step.description,
      count: stepCounts[idx] ?? 0,
    }));

    const total = steps.reduce((sum, s) => sum + s.count, 0);
    if (total === 0) {
      return { status: "empty", steps, windowDays: WINDOW_DAYS };
    }

    return { status: "ok", steps, windowDays: WINDOW_DAYS };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown network error",
    };
  }
}
