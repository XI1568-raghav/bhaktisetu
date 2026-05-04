import type { Metadata } from "next";
import RefundsPage from "../refunds/page";

export const metadata: Metadata = {
 title: "Refund & Cancellation Policy",
 description:
 "Darshya's refund and cancellation policy for puja bookings, astrology sessions, donations, and store orders.",
 alternates: { canonical: "https://darshya.online/refund" },
 openGraph: {
 title: "Refund & Cancellation Policy | Darshya",
 description:
 "Refund timelines for pujas, astrology, donations, and store orders. Processed via Razorpay in 5-7 business days.",
 url: "https://darshya.online/refund",
 type: "website",
 },
};

export default function RefundPage() {
 return <RefundsPage />;
}
