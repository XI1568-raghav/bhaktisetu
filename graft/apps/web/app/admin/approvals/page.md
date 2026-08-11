# apps\web\app\admin\approvals\page.tsx

- BackendRole · type · L24-L30 — Enumerates the uppercase provider role codes returned by the backend approvals API so responses can be typed and mapped to UI roles.
- BackendApproval · type · L32-L39 — Describes the raw shape of a pending-approval row returned by the backend before it is normalised for display.
- UiRole · type · L41-L47 — Defines the lowercase role keys the UI uses for filtering, labels, and badge colours.
- PendingApproval · interface · L58-L65 — View-model for a pending approval card, holding the normalised name, role, city, and submission date shown in the list.
- AdminApprovalsPage · function · L85-L328 — Loads pending provider approvals from the admin API, normalises backend roles for display, and lets admins filter, approve, or reject each registration.
- patchUser · function · L147-L159 — Sends the approve/reject decision to the backend by PATCHing the user's approved flag, throwing on non-OK responses.
- handleApprove · function · L161-L171 — Approves a pending provider and removes their card from the list, surfacing any failure as an error message.
- handleReject · function · L173-L185 — Rejects a pending provider, removes their card, and closes/resets the rejection-reason modal.
