import type { Metadata } from "next";
import RefundsPage from "../refunds/page";

export const metadata: Metadata = {
 title: "Refund & Cancellation Policy",
 description:
 "Darshya's refund and cancellation policy for puja bookings, astrology sessions, donations, and store orders.",
 alternates: { canonical: "https://darshya.online/refund" },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Refund & Cancellation Policy | Darshya",
 description:
 "Refund timelines for pujas, astrology, donations, and store orders. Refunds go back to the original payment method in 5-7 business days; international cards can take longer.",
 url: "https://darshya.online/refund",
 type: "website",
 },
};

export default function RefundPage() {
 return <RefundsPage />;
}
