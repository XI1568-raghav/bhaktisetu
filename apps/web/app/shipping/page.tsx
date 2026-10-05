import type { Metadata } from "next";
import { H1 } from '../../components/ui/heading-recipe';
import { PRASAD_DELIVERY_FEE_INR } from '../../lib/puja-pricing';
import {
 COMPANY,
 deliveryFeeLine,
 operatedByLine,
 postalContactLine,
} from "../../lib/company";

export const metadata: Metadata = {
 title: "Shipping & Delivery Policy",
 description:
 `Darshya's shipping and delivery policy. Store orders are delivered within India only; prasad delivery is an optional ₹${PRASAD_DELIVERY_FEE_INR} add-on to a puja booking. Free store delivery on orders of ₹${COMPANY.store.freeDeliveryAboveInr} and above.`,
 alternates: { canonical: "https://darshya.online/shipping" },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Shipping & Delivery Policy | Darshya",
 description:
 "Store orders are delivered within India only. Prasad delivery is an optional flat add-on chosen when you book a puja. We do not promise delivery dates.",
 url: "https://darshya.online/shipping",
 type: "website",
 },
};

/**
 * Copy-truth sweep (2026-10-05). This page used to promise DHL / FedEx / India
 * Post / Delhivery partnerships, 3-15 day timelines, international prasad and
 * store delivery, a Rs 40 COD fee and an email + SMS tracking message. None of
 * it exists in the code:
 *
 *   - the store checkout's address country is fixed to India and the API prices
 *     `subtotal + delivery fee` only (apps/api/src/lib/store-pricing.ts);
 *   - a store order only ever carries a `trackingNumber` that the store owner
 *     types in (apps/web/app/store-admin/orders), shown on /store/orders;
 *   - prasad delivery is the `prasadDeliveryRequested` flag on a puja booking,
 *     which adds PRASAD_DELIVERY_FEE_INR and an address id
 *     (booking.service.ts createBooking). The only fact the booking page can
 *     show afterwards is `prasadTrackingId`.
 * Guarded by __tests__/copy-truth-sweep.test.ts.
 */
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
 className={`${H1.catalogue} mb-3`}
 >
 Shipping &amp; Delivery Policy
 </h1>
 <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
 Last updated: October 5, 2026
 </p>
 </div>
 </section>

 <section className="py-14 sm:py-20">
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <div className="space-y-10">
 <ShippingSection title="1. Overview">
 <p>
 Darshya delivers <strong>store orders within India only</strong>.
 Separately, you can add prasad delivery to a puja booking. This
 policy says exactly what each of those is today, and what we do
 not promise.
 </p>
 </ShippingSection>

 <ShippingSection title="2. Store Orders (India only)">
 <ul>
 <li>
 Store products are delivered to addresses in India. The store
 checkout takes an Indian address only; we do not deliver store
 products to other countries.
 </li>
 <li>
 We do not publish delivery timelines for store orders. Your
 order page (<em>My Orders</em>) shows its status.
 </li>
 <li>
 Once the courier assigns a tracking number, it appears on the
 same order page. We do not name a courier in advance.
 </li>
 <li>
 <strong>Cash on Delivery</strong> is offered at store checkout
 as a payment choice. Your order is confirmed by our team after
 you place it.
 </li>
 </ul>
 </ShippingSection>

 <ShippingSection title="3. Prasad Delivery (puja bookings)">
 <ul>
 <li>
 Prasad delivery is an <strong>optional add-on</strong> you switch
 on while booking a puja. You enter the delivery address on the
 booking screen.
 </li>
 <li>
 It costs a flat &#8377;{PRASAD_DELIVERY_FEE_INR}, the same for
 every address, shown on the booking screen before you pay.
 </li>
 <li>
 We do not promise a delivery date, a courier or a delivery
 country for prasad. If you want prasad sent to an address
 outside India, write to {COMPANY.supportEmail} before you add it.
 Any customs duties or import rules at the destination are the
 recipient&apos;s responsibility.
 </li>
 <li>
 Your booking page shows a tracking ID once one has been
 recorded for the parcel. Until then it simply says prasad delivery
 is part of the booking.
 </li>
 </ul>
 </ShippingSection>

 <ShippingSection title="4. Shipping Charges">
 <ul>
 <li>
 <strong>Store delivery.</strong> {deliveryFeeLine()} The fee is
 shown in your cart before you pay.
 </li>
 <li>
 <strong>Prasad delivery</strong> as part of a puja booking
 is the optional flat &#8377;{PRASAD_DELIVERY_FEE_INR} add-on
 described above.
 </li>
 <li>
 Nothing else is added at checkout.
 </li>
 </ul>
 </ShippingSection>

 <ShippingSection title="5. Address Accuracy">
 <p>
 Please ensure that the shipping address, pincode, and phone
 number you enter are accurate. Darshya is not responsible for
 delays or non-delivery caused by incorrect address information.
 </p>
 </ShippingSection>

 <ShippingSection title="6. Lost, Damaged, or Delayed Shipments">
 <ul>
 <li>
 If a parcel is marked delivered but you have not received it,
 or it arrives damaged, email {COMPANY.supportEmail} within 7
 days of delivery. For damage, include photographs of the package.
 </li>
 <li>
 We review each case and, where an item is confirmed lost or
 damaged, arrange a replacement or a refund.
 </li>
 </ul>
 </ShippingSection>

 <ShippingSection title="7. Contact">
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
