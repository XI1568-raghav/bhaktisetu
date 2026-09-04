import { BroadcastClient } from "./broadcast-client";
import { H1 } from "../../components/ui/heading-recipe";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  {
    name: "daily_aarti_reminder",
    label: "Daily aarti reminder",
    description:
      "Today's {{deity}} aarti at {{time}} in 1 hour. Watch live: darshya.online/darshan/{{slug}}",
    variables: ["deity", "time", "slug"],
  },
  {
    name: "new_puja_listed",
    label: "New puja listed",
    description:
      "New {{type}} puja available at {{temple}} from ₹{{price}}. Book: darshya.online/pujas/{{slug}}",
    variables: ["type", "temple", "price", "slug"],
  },
  {
    name: "booking_reminder_24h",
    label: "Booking reminder (24h)",
    description:
      "Your {{puja}} puja at {{temple}} is tomorrow at {{time}}. Confirmation: darshya.online/bookings/{{ref}}",
    variables: ["puja", "temple", "time", "ref"],
  },
  {
    name: "booking_video_proof_ready",
    label: "Video proof ready",
    description:
      "Video proof of your {{puja}} puja is ready: darshya.online/bookings/{{ref}}/video",
    variables: ["puja", "ref"],
  },
  {
    name: "welcome_devotee",
    label: "Welcome devotee",
    description:
      "Welcome to Darshya, {{name}}! Browse temples, book pujas, watch live darshan. darshya.online",
    variables: ["name"],
  },
];

export default function BroadcastPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className={H1.portal}>
          WhatsApp broadcast
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Send pre-approved templates to opted-in devotees. Rate-limited to 50/sec by Meta.
          Opt-outs are honoured automatically.
        </p>
      </header>
      <BroadcastClient templates={TEMPLATES} />
    </main>
  );
}
