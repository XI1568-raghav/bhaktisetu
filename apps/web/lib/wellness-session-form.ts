/** Wellness session form helpers (kept out of page.tsx: Next forbids extra exports from a page file). */

// The date/time field holds "YYYY-MM-DDTHH:mm" read as INDIA time (the list above prints IST), whereas
// the API speaks ISO 8601 UTC. IST has no daylight saving, so the +05:30 offset is exact; an instructor
// travelling abroad enters and reads the same clock as every student.
const IST_OFFSET = '+05:30';

export function toLocalInput(iso: string | undefined): string {
 if (!iso) return '';
 const d = new Date(iso);
 if (isNaN(d.getTime())) return '';
 const parts = Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', {
   timeZone: 'Asia/Kolkata',
   hourCycle: 'h23',
   year: 'numeric',
   month: '2-digit',
   day: '2-digit',
   hour: '2-digit',
   minute: '2-digit',
  })
   .formatToParts(d)
   .map((p) => [p.type, p.value]),
 ) as Record<string, string>;
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromLocalInput(value: string): Date {
 return new Date(`${value.slice(0, 16)}:00${IST_OFFSET}`);
}

// Mirrors the API's createSessionSchema so a bad entry gets a sentence here instead of a silent no-op
// (whitespace-only text used to pass the browser's `required` and then do nothing) or a generic 400.
export function validateSessionForm(f: {
 title: string;
 description: string;
 scheduledAt: string;
 duration: string;
 price: string;
 capacity: string;
 editing: boolean;
 minCapacity: number;
}): string | null {
 if (f.title.trim().length < 3) return 'Give the session a title of at least 3 characters.';
 if (f.title.trim().length > 200) return 'Keep the title under 200 characters.';
 if (!f.description.trim()) return 'Add a short description so learners know what to expect.';
 if (!f.scheduledAt) return 'Choose when the session starts.';
 const start = fromLocalInput(f.scheduledAt);
 if (Number.isNaN(start.getTime())) return 'Choose a valid start date and time.';
 if (!f.editing && start.getTime() < Date.now()) return 'Choose a start time in the future (India time).';
 const duration = Number(f.duration);
 if (!Number.isInteger(duration) || duration < 5 || duration > 600) return 'Duration must be a whole number of minutes between 5 and 600.';
 const capacity = Number(f.capacity);
 if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) return 'Capacity must be a whole number between 1 and 10,000.';
 if (f.editing && capacity < f.minCapacity) return `${f.minCapacity} learners already hold seats, so capacity cannot be lower than ${f.minCapacity}.`;
 if (f.price.trim() === '') return 'Enter a price in rupees (0 for a free session).';
 const price = Number(f.price);
 if (!Number.isFinite(price) || price < 0) return 'Price cannot be negative.';
 if (price > 1_000_000) return 'Price cannot be more than 10,00,000 rupees.';
 return null;
}

