# apps\api\src\lib\pdf-receipt.ts

- ReceiptData · interface · L20-L34 — Defines the donor, donation, and donee-organisation fields legally required on an Indian 80G tax receipt (names, PANs, 80G registration, amount, receipt number, payment mode).
- amountInWords · function · L40-L63 — Converts a donation amount into its English words using the Indian numbering system (crore/lakh/thousand) as required on 80G receipts.
- under1000 · function · L45-L49 — Renders any number below 1000 into English words, the building block for each crore/lakh/thousand segment.
- generate80GReceipt · function · L65-L180 — Lays out and renders the full 80G receipt PDF — branding, donor/donee details, amount in figures and words, payment mode, tax note, and signatory line — returning it as a Buffer.
- wrap · function · L182-L196 — Wraps long address text into fixed-width lines so it fits within the receipt's printable area.
