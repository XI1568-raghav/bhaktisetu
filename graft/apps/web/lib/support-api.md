# apps\web\lib\support-api.ts

- NewTicketInput · type · L46-L46 — Type inferred from newTicketSchema describing the validated shape of a new support ticket submission.
- ReplyInput · type · L56-L56 — Type inferred from replySchema describing the validated shape of a ticket reply, including the internal-note flag.
- PatchTicketInput · type · L63-L63 — Type inferred from patchTicketSchema describing the optional admin-editable ticket fields (status, priority, assignee).
- authHeaders · function · L67-L69 — Builds the Authorization bearer header when a token is present so API calls can be made with or without authentication.
- asJson · function · L71-L84 — Parses a fetch Response as JSON and converts non-OK responses into thrown Errors that surface the backend's message field when available.
- unwrapTicket · function · L86-L91 — Normalizes a single-ticket API response by extracting the nested `ticket` property when the backend wraps it.
- unwrapTickets · function · L93-L101 — Normalizes a ticket-list API response by accepting a raw array or a `tickets`/`data` wrapper, defaulting to an empty list.
- listTickets · function · L105-L116 — Fetches the current user's support tickets, or all tickets when the admin `all` flag is set.
- getTicketById · function · L118-L128 — Fetches a single support ticket by id and normalizes the response envelope.
- createTicket · function · L130-L141 — Submits a validated new support ticket to the backend and returns the created ticket.
- patchTicket · function · L143-L155 — Sends admin edits (status, priority, assignee) for a ticket and returns the updated ticket.
- postMessage · function · L157-L169 — Posts a reply or internal note to a ticket's message thread and returns the updated ticket.
