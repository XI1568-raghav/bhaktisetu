# apps\api\src\lib\pdf-invoice.ts

- InvoiceInput · type · L10-L47 — Discriminated union that defines the required billing data for each of the four invoiceable product types, using the `type` tag to drive all downstream formatting decisions.
- shortIdFor · function · L61-L72 — Derives a compact 8-character alphanumeric identifier from each product's native reference (booking number, UUID, or order number) for use in the invoice number.
- formatInr · function · L74-L76 — Formats a numeric amount as an Indian-locale INR currency string with two decimal places for display on the invoice.
- wrap · function · L78-L92 — Splits long text (addresses, item descriptions) into multiple lines that fit the invoice's fixed-width columns.
- LineItem · interface · L94-L99 — Internal row shape (description, quantity, unit and total price) used to render the invoice's itemized charges table uniformly across product types.
- lineItemsFor · function · L101-L138 — Normalizes each product type into invoice line items — a single fixed row for services, or per-item rows with quantity-times-price totals for store orders.
- totalFor · function · L140-L142 — Picks the authoritative grand total: the order's precomputed totalInr for store orders versus the single amountInr for service-type invoices.
- recipientFor · function · L144-L155 — Determines the bill-to party for each product type, attaching a shipping address only for store orders.
- referenceFor · function · L157-L168 — Builds the human-readable reference label (e.g. "Booking #…", "Order #…") tying the invoice back to the originating transaction.
- generateInvoice · function · L170-L277 — Renders the complete A4 tax-invoice PDF — header, invoice metadata, bill-to block, itemized table, total, and tax disclaimers — and returns it as a Buffer.
