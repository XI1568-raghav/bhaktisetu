# apps\web\app\store-admin\orders\page.tsx

- OrderStatus · type · L25-L32 — Enumerates the seven lifecycle states an order can occupy, from PENDING through DELIVERED plus terminal CANCELLED/REFUNDED.
- OrderItem · interface · L44-L48 — Describes one line item in an order (name, quantity, unit price) for rendering the order contents.
- StatusHistoryEntry · interface · L50-L55 — Records a single status change event (who, when, note) so admins can audit an order's fulfillment timeline.
- Order · interface · L57-L69 — Models a customer order with items, totals, current status, and its full status-change history for the admin list.
- isReverseTransition · function · L84-L92 — Decides whether a status change moves backward in the fulfillment flow (or out of a terminal state) so the UI can demand typed confirmation.
- formatCurrency · function · L94-L100 — Formats order amounts as whole-rupee INR strings for display.
- formatDateTime · function · L102-L112 — Renders an order timestamp as a localized Indian date-time string, falling back to the raw value if unparseable.
- getStatusConfig · function · L114-L125 — Maps each order status to its display label, badge colors, and icon for consistent status presentation.
- normalizeOrder · function · L128-L157 — Converts loosely-shaped backend order payloads into the strict Order model by tolerating alternate field names and casing.
- ToastMsg · interface · L161-L165 — Describes a transient success/error notification shown after admin actions.
- StoreAdminOrdersPage · function · L169-L674 — Main page that loads store orders and lets admins search, filter by status tab, expand history, and change order status with safeguards.
- commitStatusChange · function · L237-L268 — Persists a status change to the backend (with optional note/tracking number) and updates local state plus a toast on success or failure.
- requestStatusChange · function · L270-L277 — Routes a requested status change to either the typed-confirmation modal for reverse transitions or the note prompt for forward ones.
- Modal · function · L678-L704 — Generic titled dialog wrapper with a close action used for the confirmation and note prompts.
