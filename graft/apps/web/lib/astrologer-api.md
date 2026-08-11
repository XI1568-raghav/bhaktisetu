# apps\web\lib\astrologer-api.ts

- AvailabilityJson · type · L7-L7 — Opaque type for the free-form availability JSON (up to 64KB) whose shape is owned by the UI and stored unmodified by the backend.
- DaySlots · interface · L9-L13 — UI-side shape marking which of the morning/afternoon/evening slots an astrologer is available on a given day.
- WeekAvailability · interface · L15-L17 — Maps day names to DaySlots to represent a full week of availability in the UI.
- AstrologerDashboard · interface · L19-L21 — Shapes the /dashboard response just enough to extract the profile's availability blob.
- authHeaders · function · L25-L27 — Builds the Bearer Authorization header when a token is present, otherwise sends the request unauthenticated.
- describeFailure · function · L29-L37 — Turns a failed HTTP response into a useful error message by pulling the server's message/error detail out of the JSON body, falling back to status code only.
- getAvailability · function · L43-L52 — Loads the astrologer's saved availability by reading it off the /dashboard profile, since no dedicated GET endpoint exists.
- updateAvailability · function · L54-L66 — Persists the astrologer's availability blob via PATCH and returns the server-echoed value.
