# apps\web\app\org\members\page.tsx

- Member · interface · L6-L13 — Data shape describing an organization member row (identity, role, and join date) returned by the members API.
- authHeader · function · L17-L28 — Builds the Authorization header by recovering the session access token from localStorage, falling back to a legacy token key so API calls authenticate.
- OrgMembersContent · function · L30-L180 — Component that wires member loading, inviting, role changes, and removal for the org identified by the ?org= query param, rendering the invite form and members table.
- load · function · L39-L51 — Fetches the current org's member list from the API and stores it in state, toggling the loading indicator.
- invite · function · L57-L73 — Submits the invite form to the API and reports success or the server's error message to the user.
- changeRole · function · L75-L83 — Posts a member's new role to the API and refreshes the member list so the table reflects the change.
- remove · function · L85-L93 — Confirms with the user, deletes the member via the API, and reloads the list.
- OrgMembersPage · function · L182-L188 — Default export that wraps the members content in a Suspense boundary so useSearchParams works during prerendering.
