# packages\api-client\src\hooks\wave-1-4.ts

Module of React Query hooks that wire UI components to the store orders, support ticket, wellness session, astrology consultation, admin commission, subscription, and donation API endpoints with automatic cache invalidation after mutations.

- useStoreOrders · function · L12-L17 — Provides a cached list of store orders from the backend for order-list screens.
- useStoreOrder · function · L19-L25 — Fetches a single store order's details, holding off until a real order id is supplied.
- useCreateStoreOrder · function · L27-L33 — Submits a new store order and refreshes cached order lists so the new order appears.
- useUpdateStoreOrderStatus · function · L35-L49 — Changes a store order's fulfillment status (with an optional staff note) and refreshes order caches so lists reflect the new state.
- useSupportTickets · function · L53-L59 — Lists support tickets, letting admins request every ticket in the system rather than just their own via the `all` flag.
- useSupportTicket · function · L61-L67 — Fetches one support ticket with its details once a ticket id is available.
- useCreateSupportTicket · function · L69-L75 — Opens a new support ticket and refreshes ticket lists.
- useUpdateSupportTicket · function · L77-L84 — Applies arbitrary field updates (e.g. status, priority) to a support ticket and refreshes ticket caches.
- useAddTicketMessage · function · L86-L107 — Appends a reply — optionally an internal staff-only note — to a ticket thread and refreshes only that ticket's detail cache.
- useWellnessSessionsV2 · function · L114-L121 — Fetches the real Prisma-backed wellness session list, named V2 to avoid colliding with an existing mock-data hook of the same name.
- useWellnessSession · function · L123-L130 — Fetches a single wellness session's details once a session id is available.
- useCreateWellnessSession · function · L132-L138 — Creates a new wellness session and refreshes session lists.
- useEnrollWellnessSession · function · L140-L147 — Enrolls the current user in a wellness session and refreshes session caches to show the new enrollment.
- useVerifyWellnessEnrollment · function · L149-L161 — Submits provider verification of a user's wellness enrollment and refreshes session caches.
- useSetWellnessRoom · function · L163-L175 — Attaches a video room URL to a wellness session so participants can join, then refreshes session caches.
- useAstrologyConsultations · function · L179-L188 — Lists astrology consultations, optionally scoped to the viewer's role (e.g. astrologer vs customer).
- useUpdateConsultation · function · L190-L203 — Closes out an astrology consultation by marking it COMPLETED or CANCELLED — the only transitions this hook permits — and refreshes consultation caches.
- useStartConsultationCall · function · L205-L216 — Starts the video call for a consultation and returns the generated room URL, then refreshes consultation caches.
- useAdminCommissions · function · L220-L239 — Fetches admin commission records filtered by any combination of payout status, provider, and date range.
- useSubscriptionPlans · function · L243-L250 — Lists available subscription plans, optionally filtered to plans for a specific user role.
- useMySubscription · function · L252-L259 — Fetches the current user's active subscription, or null if they have none.
- useSubscribe · function · L261-L268 — Subscribes the current user to a chosen plan and refreshes subscription caches.
- useCancelSubscription · function · L270-L276 — Cancels the current user's subscription and refreshes subscription caches.
- useCreateDonationOrder · function · L280-L285 — Creates a payment order for a donation so the donor can be sent through checkout.
- useVerifyDonation · function · L287-L291 — Verifies a completed donation payment with the backend after checkout returns.
