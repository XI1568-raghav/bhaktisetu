import type { Metadata } from "next";
import {
 COMPANY,
 deliveryFeeLine,
 operatedByLine,
 postalContactLine,
} from "../../lib/company";

export const metadata: Metadata = {
 title: "Shipping & Delivery Policy",
 description:
 `Darshya's shipping and delivery policy for prasad, puja items, and store products. Free delivery on domestic orders of ₹${COMPANY.store.freeDeliveryAboveInr} and above.`,
 alternates: { canonical: "https://darshya.online/shipping" },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Shipping & Delivery Policy | Darshya",
 description:
 "Prasad and store delivery timelines: 3-7 days within India, 7-15 days for NRI orders. Tracked via India Post / Delhivery.",
 url: "https://darshya.online/shipping",
 type: "website",
 },
};

export default function ShippingPage() {
 return (
 <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Legal
 </p>
 <h1
 className="text-2xl sm:text-3xl font-bold mb-3"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 Shipping &amp; Delivery Policy
 </h1>
 <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
 Last updated: May 2, 2026
 </p>
 </div>
 </section>

 <section className="py-14 sm:py-20">
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <div className="space-y-10">
 <ShippingSection title="1. Overview">
 <p>
 Darshya ships sacred prasad, puja items, books, idols, and
 wellness products across India and to NRI devotees in select
 international markets. This Shipping Policy explains delivery
 timelines, shipping charges, tracking, and our handling of
 lost or damaged consignments.
 </p>
 </ShippingSection>

 <ShippingSection title="2. Delivery Timelines">
 <h4>2.1 Within India</h4>
 <ul>
 <li>
 <strong>Prasad &amp; sacred items:</strong> 3&ndash;7 business
 days from temple dispatch. Prasad is dispatched within 24
 hours of puja completion.
 </li>
 <li>
 <strong>Store products (idols, malas, books, decor):</strong>{" "}
 4&ndash;7 business days within metro cities; 5&ndash;10
 business days for tier-2/3 cities and remote pin codes.
 </li>
 <li>
 <strong>Festival surge:</strong> During Navaratri, Diwali,
 and major festivals, add 2&ndash;3 days to standard timelines.
 </li>
 </ul>

 <h4>2.2 International (NRI) Orders</h4>
 <ul>
 <li>
 <strong>Prasad &amp; small parcels:</strong> 7&ndash;15
 business days, depending on destination country and customs
 clearance.
 </li>
 <li>
 <strong>Larger consignments (idols, decor):</strong>{" "}
 10&ndash;21 business days. Shipped via DHL or India Post
 international tracked service.
 </li>
 <li>
 Customs duties, taxes, and import fees in the destination
 country are the responsibility of the recipient.
 </li>
 </ul>
 </ShippingSection>

 <ShippingSection title="3. Shipping Charges">
 <ul>
 <li>
 <strong>Domestic delivery.</strong> {deliveryFeeLine()} The fee is
 shown in your cart before you pay.
 </li>
 <li>
 <strong>Prasad delivery</strong> as part of a puja booking
 is included in the puja fee for domestic addresses; NRI
 addresses incur an international shipping surcharge shown
 transparently at checkout.
 </li>
 <li>
 <strong>International shipping</strong> is calculated by
 destination, weight, and dimensions at checkout. We do not
 offer free international shipping.
 </li>
 <li>
 <strong>Cash on Delivery (COD)</strong> is available on
 select domestic orders below &#8377;5,000 with a flat
 &#8377;40 COD handling fee.
 </li>
 </ul>
 </ShippingSection>

 <ShippingSection title="4. Order Processing">
 <ul>
 <li>
 Orders placed before 2:00 PM IST on a business day are
 processed the same day. Orders after 2:00 PM are processed
 the next business day.
 </li>
 <li>
 Orders are not dispatched on Sundays or national holidays.
 </li>
 <li>
 You will receive an email and SMS with the tracking number
 once the parcel is handed to the courier.
 </li>
 </ul>
 </ShippingSection>

 <ShippingSection title="5. Courier Partners &amp; Tracking">
 <p>We ship through the following partners:</p>
 <ul>
 <li>
 <strong>India Post (Speed Post):</strong> Pan-India coverage
 including remote pin codes; tracking via{" "}
 <a
 href="https://www.indiapost.gov.in"
 target="_blank"
 rel="noopener noreferrer"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 indiapost.gov.in
 </a>
 .
 </li>
 <li>
 <strong>Delhivery:</strong> Express delivery within metros
 and tier-2 cities; tracking via{" "}
 <a
 href="https://www.delhivery.com/tracking"
 target="_blank"
 rel="noopener noreferrer"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 delhivery.com/tracking
 </a>
 .
 </li>
 <li>
 <strong>Blue Dart, DTDC, Ekart:</strong> Used selectively
 for specific regions and product categories.
 </li>
 <li>
 <strong>DHL / FedEx:</strong> International orders requiring
 expedited delivery.
 </li>
 </ul>
 <p>
 The tracking link is included in your shipment confirmation
 email and is also visible in your account under{" "}
 <em>My Orders</em>.
 </p>
 </ShippingSection>

 <ShippingSection title="6. Address Accuracy">
 <p>
 Please ensure that the shipping address, pincode, and phone
 number entered at checkout are accurate. Darshya is not
 responsible for delays or non-delivery caused by incorrect
 address information. If a parcel is returned undelivered due
 to address errors, the customer bears the re-shipping cost.
 </p>
 </ShippingSection>

 <ShippingSection title="7. Lost, Damaged, or Delayed Shipments">
 <ul>
 <li>
 If a parcel is marked delivered but you have not received
 it, contact us within 48 hours at support@darshya.online.
 </li>
 <li>
 If a parcel is damaged in transit, photograph the package
 before opening and email us within 48 hours of delivery. We
 will arrange a replacement or full refund (including
 shipping).
 </li>
 <li>
 A shipment is considered lost only after the courier marks
 it untraceable or 21 days have passed for domestic / 45 days
 for international without movement. We will reship or refund
 in full once a loss is confirmed.
 </li>
 </ul>
 </ShippingSection>

 <ShippingSection title="8. International Customs &amp; Restrictions">
 <p>
 Some products (large idols, certain herbs, items containing
 sandalwood) may be restricted in specific countries. It is the
 buyer&apos;s responsibility to confirm their country&apos;s import rules
 before placing the order. If a parcel is seized or returned by
 customs, the order value (excluding shipping) will be refunded
 once the parcel is returned to our warehouse.
 </p>
 </ShippingSection>

 <ShippingSection title="9. Contact">
 <p>For shipping-related queries:</p>
 <ul>
 <li>Email: {COMPANY.supportEmail}</li>
 <li>Response window: {COMPANY.supportHours}</li>
 {postalContactLine() && <li>{postalContactLine()}</li>}
 </ul>
 <p>{operatedByLine()}</p>
 </ShippingSection>
 </div>
 </div>
 </section>
 </div>
 );
}

function ShippingSection({
 title,
 children,
}: {
 title: string;
 children: React.ReactNode;
}) {
 return (
 <div>
 <h3
 className="text-base font-semibold mb-3"
 style={{ color: "var(--color-text)" }}
 >
 {title}
 </h3>
 <div
 className="text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-sm"
 style={{ color: "var(--color-text-muted)" }}
 >
 {children}
 </div>
 </div>
 );
}
