# apps\web\app\gaushala-portal\volunteers\page.tsx · [[client-side-auth-api-base-url-resolution]] [[gaushala-manager-portal]] [[graceful-degradation-in-portal-data-fetching]]

- Volunteer · type · L9-L18 — Data shape for a volunteer record returned by the gaushala API, including contact info, role, active flag, and join date.
- VolunteersPage · function · L27-L33 — Route entry that restricts the volunteers page to gaushala managers and admins via AuthGuard.
- VolunteersContent · function · L35-L328 — Main volunteers management UI: loads volunteers, filters them by search text and active status, and wires add/toggle/remove actions to the API.
- load · function · L54-L72 — Fetches the volunteer list from the gaushala API with the session token and stores it in state, tolerating failures gracefully.
- handleAdd · function · L79-L111 — Validates and submits the new-volunteer form, requiring a name and only sending optional fields (phone, email, notes) when non-empty.
- toggleActive · function · L113-L125 — Flips a volunteer's active flag via PATCH and refreshes the list, implementing the Active/Inactive badge toggle.
- remove · function · L127-L139 — Deletes a volunteer after a confirmation prompt and reloads the list.
- StatCard · function · L330-L338 — Presentational card showing a single summary metric (icon, value, label) in the stats row.
- Field · function · L340-L352 — Reusable labeled text input used by the add-volunteer modal form.
- countNewThisMonth · function · L354-L358 — Counts volunteers whose join date falls on or after the first day of the current calendar month for the 'New This Month' stat.
