# apps\web\app\yatra\book\page.tsx

- Traveler · type · L25-L30 — Defines the per-traveler identity fields (name, age, gender, ID proof) collected for permits and registration.
- BookingData · type · L32-L52 — Defines the shape of all wizard state gathered across the five booking steps, from trip date and package tier through add-ons, travelers, and buyer contact.
- BookYatraInner · function · L56-L688 — Main wizard component that drives the five-step booking flow, persists the draft to localStorage, keeps the travelers array in sync with the count, computes the itemized price quote, and gates step progression.
- handlePay · function · L165-L227 — Assembles the booking inquiry payload, posts it to the yatra-inquiry API, caches the inquiry locally, clears the draft, and surfaces the returned reference ID or a fallback error.
- AddOnRow · function · L690-L735 — Renders a single toggleable add-on option row showing its icon, description, price, and active state.
- Row · function · L737-L744 — Renders one label/value line in the review summary.
- BookYatraPage · function · L746-L752 — Default page export that wraps the booking wizard in a Suspense boundary so useSearchParams can be used safely.
