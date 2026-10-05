/**
 * Support / Customer Care data layer.
 * Ticket types, sample data, FAQ content, auto-reply keyword matching,
 * and localStorage persistence helpers.
 *
 * LEG-10/LEG-12 (prod sweep 2026-08-12): the money rules in this file were
 * written independently of the code that charges the money, so they drifted.
 * The delivery numbers now interpolate from COMPANY.store — the same figures
 * lib/store-pricing.ts uses and the API enforces — rather than being retyped.
 *
 * I-09 (prod sweep 2026-08-12) extended that rule to three more claims this
 * file was making on its own authority — the cancellation ladder, the
 * video-proof window and the list of languages the product speaks. All three
 * now interpolate from the module that governs them, and the popular-article
 * list carries a real destination per row instead of a title nobody wrote.
 */

import { COMPANY } from './company';
import {
 HELP_CATEGORIES,
 HELP_LANGS,
 HELP_SOURCE_LANG,
 getHelpArticle,
} from './help-articles';
import {
 FULL_REFUND_HOURS_BEFORE,
 CANCELLATION_CUTOFF_HOURS,
 PARTIAL_REFUND_PERCENT,
 REFUND_SETTLEMENT_SENTENCE,
 REFUND_DAYS_LABEL,
} from './cancellation-policy';

const FREE_DELIVERY_ABOVE = `₹${COMPANY.store.freeDeliveryAboveInr.toLocaleString('en-IN')}`;
const FLAT_DELIVERY_FEE = `₹${COMPANY.store.flatDeliveryFeeInr}`;

/** "English, Hindi, Tamil, Telugu, Bengali and Marathi" — from the one list. */
const OFFERED_LANGUAGES = (() => {
 const labels = HELP_LANGS.map((l) => l.label);
 return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
})();

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketCategory =
 | 'puja'
 | 'darshan'
 | 'payments'
 | 'account'
 | 'store'
 | 'astrology'
 | 'wellness'
 | 'yatra';

/**
 * The five categories the SERVER stores — apps/api/src/routes/support.ts:413,
 * `z.enum(['BOOKING','PAYMENT','ACCOUNT','TECHNICAL','OTHER'])`.
 *
 * The eight above are this site's help-centre taxonomy (they drive /support,
 * the FAQ deep-links and the ticket picker); the five below are what the API
 * will accept and therefore what comes back on a ticket that has round-tripped.
 * lib/support-api.ts owns the translation between them.
 */
export type ApiTicketCategory =
 | 'BOOKING'
 | 'PAYMENT'
 | 'ACCOUNT'
 | 'TECHNICAL'
 | 'OTHER';

/** A ticket's category is one vocabulary offline, the other once stored. */
export type StoredTicketCategory = TicketCategory | ApiTicketCategory;

export interface TicketMessage {
 id: string;
 author: 'user' | 'agent' | 'system';
 authorName: string;
 body: string;
 createdAt: string; // ISO
 internal?: boolean; // admin-only note
}

export interface TicketActivity {
 id: string;
 type: 'status_change' | 'priority_change' | 'assignment' | 'created' | 'note';
 text: string;
 createdAt: string;
}

export interface Ticket {
 id: string;
 subject: string;
 category: StoredTicketCategory;
 priority: TicketPriority;
 status: TicketStatus;
 createdAt: string;
 updatedAt: string;
 orderId?: string;
 attachmentName?: string;
 userName: string;
 userEmail: string;
 userPhone?: string;
 userJoinedAt?: string;
 userTotalOrders?: number;
 assignedTo?: string;
 messages: TicketMessage[];
 activity: TicketActivity[];
}

export interface SupportCategory {
 id: TicketCategory;
 name: string;
 description: string;
 emoji: string;
}

export const SUPPORT_CATEGORIES: SupportCategory[] = [
 {
 id: 'puja',
 name: 'Puja Bookings',
 description: 'Cancel, reschedule, prasad delivery',
 emoji: '',
 },
 {
 id: 'darshan',
 name: 'Live Darshan',
 description: 'Streaming issues, offline temple',
 emoji: '',
 },
 {
 id: 'payments',
 name: 'Payments & Refunds',
 description: 'Failed payments, refund status',
 emoji: '',
 },
 {
 id: 'account',
 name: 'Account & Profile',
 description: 'Login, password, profile settings',
 emoji: '',
 },
 {
 id: 'store',
 name: 'Store Orders',
 description: 'Shipping, returns, order status',
 emoji: '️',
 },
 {
 id: 'astrology',
 name: 'Astrology Consultations',
 description: 'Kundli, reports, astrologer chat',
 emoji: '',
 },
 {
 id: 'wellness',
 name: 'Wellness Sessions',
 description: 'Yoga, meditation, ayurveda',
 emoji: '',
 },
 {
 id: 'yatra',
 name: 'Yatra & Travel',
 description: 'Pilgrimage tours, bookings',
 emoji: '',
 },
];

export const CATEGORY_MAP: Record<TicketCategory, SupportCategory> =
 SUPPORT_CATEGORIES.reduce((acc, c) => {
 acc[c.id] = c;
 return acc;
 }, {} as Record<TicketCategory, SupportCategory>);

/**
 * Human labels for the five categories the API stores. A ticket fetched from
 * the server carries `BOOKING`, not `puja`, and `CATEGORY_MAP` has no entry for
 * it — the pages used to fall back to printing the raw enum at the reader.
 */
export const API_CATEGORY_LABELS: Record<ApiTicketCategory, string> = {
 BOOKING: 'Booking',
 PAYMENT: 'Payment',
 ACCOUNT: 'Account',
 TECHNICAL: 'Technical',
 OTHER: 'Other',
};

/** Reads either vocabulary; never prints a raw enum member. */
export function ticketCategoryLabel(category: StoredTicketCategory | string): string {
 const web = CATEGORY_MAP[category as TicketCategory];
 if (web) return web.name;
 return API_CATEGORY_LABELS[category as ApiTicketCategory] ?? String(category);
}

/** The help-centre emoji when we have one; nothing rather than a wrong one. */
export function ticketCategoryEmoji(category: StoredTicketCategory | string): string {
 return CATEGORY_MAP[category as TicketCategory]?.emoji ?? '';
}

export const PRIORITIES: { id: TicketPriority; label: string }[] = [
 { id: 'low', label: 'Low' },
 { id: 'medium', label: 'Medium' },
 { id: 'high', label: 'High' },
 { id: 'urgent', label: 'Urgent' },
];

export const STATUSES: { id: TicketStatus; label: string }[] = [
 { id: 'open', label: 'Open' },
 { id: 'in_progress', label: 'In Progress' },
 { id: 'resolved', label: 'Resolved' },
 { id: 'closed', label: 'Closed' },
];

// ─────────────────────────── Ticket ID & storage ──────────────────────

export function formatTicketId(seed?: number): string {
 const n = seed ?? Date.now();
 const last5 = String(n).slice(-5).padStart(5, '0');
 return `BS-TKT-${last5}`;
}

const STORAGE_KEY = 'poojly:support:tickets:v1';

export function loadUserTickets(): Ticket[] {
 if (typeof window === 'undefined') return [];
 try {
 const raw = window.localStorage.getItem(STORAGE_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw) as Ticket[];
 return Array.isArray(parsed) ? parsed : [];
 } catch {
 return [];
 }
}

export function saveUserTickets(tickets: Ticket[]): void {
 if (typeof window === 'undefined') return;
 try {
 window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
 } catch {
 /* noop */
 }
}

export function addUserTicket(ticket: Ticket): void {
 const all = loadUserTickets();
 all.unshift(ticket);
 saveUserTickets(all);
}

export function updateUserTicket(id: string, updater: (t: Ticket) => Ticket): Ticket | null {
 const all = loadUserTickets();
 const idx = all.findIndex((t) => t.id === id);
 if (idx < 0) return null;
 const current = all[idx];
 if (!current) return null;
 const next = updater(current);
 all[idx] = next;
 saveUserTickets(all);
 return next;
}

export function getUserTicket(id: string): Ticket | null {
 const all = loadUserTickets();
 return all.find((t) => t.id === id) ?? null;
}

// ─────────────────────────── Sample admin tickets ──────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600 * 1000).toISOString();

export const SAMPLE_ADMIN_TICKETS: Ticket[] = [
 {
 id: 'BS-TKT-48213',
 subject: 'Prasad not delivered after Kashi Vishwanath puja',
 category: 'puja',
 priority: 'high',
 status: 'in_progress',
 createdAt: daysAgo(2),
 updatedAt: hoursAgo(3),
 orderId: 'BS-20260418-A91B2',
 userName: 'Rohan Mehta',
 userEmail: 'rohan.mehta@gmail.com',
 userPhone: '+91 98200 11223',
 userJoinedAt: daysAgo(240),
 userTotalOrders: 14,
 assignedTo: 'Priya S.',
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Rohan Mehta',
 body: 'I booked a Rudrabhishek puja on 16 April. Video proof came but prasad was never delivered. Courier status stuck on "in transit" for 5 days.',
 createdAt: daysAgo(2),
 },
 {
 id: 'm2',
 author: 'agent',
 authorName: 'Priya S.',
 body: 'Namaste Rohan ji — checked with the temple and courier partner. Parcel was misrouted to Varanasi hub. Rerouted today, ETA 22 April. Apologies for the delay.',
 createdAt: hoursAgo(8),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created by user', createdAt: daysAgo(2) },
 { id: 'a2', type: 'assignment', text: 'Assigned to Priya S.', createdAt: daysAgo(2) },
 { id: 'a3', type: 'status_change', text: 'Status: Open → In Progress', createdAt: hoursAgo(8) },
 ],
 },
 {
 id: 'BS-TKT-48207',
 subject: 'Live darshan stream buffering every few seconds',
 category: 'darshan',
 priority: 'medium',
 status: 'open',
 createdAt: hoursAgo(6),
 updatedAt: hoursAgo(6),
 userName: 'Aishwarya Nair',
 userEmail: 'aishwarya.nair@outlook.com',
 userPhone: '+91 90000 55667',
 userJoinedAt: daysAgo(45),
 userTotalOrders: 3,
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Aishwarya Nair',
 body: 'Tirumala morning darshan keeps buffering. Tried both mobile data and WiFi. Other streams work fine.',
 createdAt: hoursAgo(6),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created by user', createdAt: hoursAgo(6) },
 ],
 },
 {
 id: 'BS-TKT-48199',
 subject: 'Refund not credited — 9 days since cancellation',
 category: 'payments',
 priority: 'urgent',
 status: 'open',
 createdAt: daysAgo(1),
 updatedAt: daysAgo(1),
 orderId: 'BS-20260411-D7720',
 userName: 'Sanjay Gupta',
 userEmail: 'sgupta.nri@gmail.com',
 userPhone: '+1 408-555-0198',
 userJoinedAt: daysAgo(620),
 userTotalOrders: 31,
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Sanjay Gupta',
 body: 'Cancelled a puja booking on 12 April (order D7720). Refund shows as initiated but nothing in my card statement. This is urgent — charge was ₹2,140.',
 createdAt: daysAgo(1),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created by user', createdAt: daysAgo(1) },
 ],
 },
 {
 id: 'BS-TKT-48184',
 subject: 'Cannot log in — OTP never arrives',
 category: 'account',
 priority: 'medium',
 status: 'resolved',
 createdAt: daysAgo(3),
 updatedAt: daysAgo(1),
 userName: 'Meera Iyer',
 userEmail: 'meera.iyer@yahoo.in',
 userPhone: '+91 99876 54321',
 userJoinedAt: daysAgo(12),
 userTotalOrders: 1,
 assignedTo: 'Arjun K.',
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Meera Iyer',
 body: 'OTP never comes to my phone number, and email OTP goes to spam.',
 createdAt: daysAgo(3),
 },
 {
 id: 'm2',
 author: 'agent',
 authorName: 'Arjun K.',
 body: 'Enabled whitelisted SMS gateway for your number and resent. Also whitelisted our domain for your email provider. Try again please.',
 createdAt: daysAgo(2),
 },
 {
 id: 'm3',
 author: 'user',
 authorName: 'Meera Iyer',
 body: 'Worked, thank you!',
 createdAt: daysAgo(1),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created', createdAt: daysAgo(3) },
 { id: 'a2', type: 'status_change', text: 'Resolved', createdAt: daysAgo(1) },
 ],
 },
 {
 id: 'BS-TKT-48170',
 subject: 'Rudraksha mala arrived broken',
 category: 'store',
 priority: 'high',
 status: 'in_progress',
 createdAt: daysAgo(4),
 updatedAt: hoursAgo(20),
 orderId: 'BS-20260415-S4412',
 attachmentName: 'mala_broken.jpg',
 userName: 'Vikram Joshi',
 userEmail: 'vjoshi@gmail.com',
 userJoinedAt: daysAgo(90),
 userTotalOrders: 6,
 assignedTo: 'Neha R.',
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Vikram Joshi',
 body: 'The 108-bead rudraksha mala arrived with 3 beads broken and thread loose. Attached photo.',
 createdAt: daysAgo(4),
 },
 {
 id: 'm2',
 author: 'agent',
 authorName: 'Neha R.',
 body: 'Sorry to see this. Initiated replacement from Haridwar stockist. You will receive a pickup for the damaged mala tomorrow; replacement ships same day.',
 createdAt: hoursAgo(20),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created', createdAt: daysAgo(4) },
 { id: 'a2', type: 'assignment', text: 'Assigned to Neha R.', createdAt: daysAgo(4) },
 ],
 },
 {
 id: 'BS-TKT-48155',
 subject: 'Astrologer did not join scheduled call',
 category: 'astrology',
 priority: 'high',
 status: 'open',
 createdAt: hoursAgo(30),
 updatedAt: hoursAgo(30),
 userName: 'Priya Desai',
 userEmail: 'priya.desai@hotmail.com',
 userJoinedAt: daysAgo(180),
 userTotalOrders: 9,
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Priya Desai',
 body: 'Booked a 30-min consultation with Pt. Sharma yesterday 6pm. He never joined. Please refund or reschedule.',
 createdAt: hoursAgo(30),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created', createdAt: hoursAgo(30) },
 ],
 },
 {
 id: 'BS-TKT-48144',
 subject: 'Yoga class link not working',
 category: 'wellness',
 priority: 'low',
 status: 'resolved',
 createdAt: daysAgo(6),
 updatedAt: daysAgo(5),
 userName: 'Kavita Rao',
 userEmail: 'kavita.rao@gmail.com',
 userJoinedAt: daysAgo(30),
 userTotalOrders: 2,
 assignedTo: 'Priya S.',
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Kavita Rao',
 body: 'Zoom link in my wellness session email says "invalid meeting".',
 createdAt: daysAgo(6),
 },
 {
 id: 'm2',
 author: 'agent',
 authorName: 'Priya S.',
 body: 'Sorry — teacher regenerated the link last-minute. Resent the correct link to your email.',
 createdAt: daysAgo(5),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created', createdAt: daysAgo(6) },
 { id: 'a2', type: 'status_change', text: 'Resolved', createdAt: daysAgo(5) },
 ],
 },
 {
 id: 'BS-TKT-48130',
 subject: 'Char Dham yatra itinerary missing Badrinath day',
 category: 'yatra',
 priority: 'medium',
 status: 'in_progress',
 createdAt: daysAgo(2),
 updatedAt: hoursAgo(14),
 orderId: 'BS-20260410-Y8821',
 userName: 'Ramesh Pillai',
 userEmail: 'ramesh.pillai@gmail.com',
 userPhone: '+91 98111 22334',
 userJoinedAt: daysAgo(500),
 userTotalOrders: 22,
 assignedTo: 'Arjun K.',
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Ramesh Pillai',
 body: 'My Char Dham itinerary (order Y8821) shows Kedarnath and Gangotri but Badrinath day is missing.',
 createdAt: daysAgo(2),
 },
 {
 id: 'm2',
 author: 'agent',
 authorName: 'Arjun K.',
 body: 'Confirmed the glitch — regenerating your PDF itinerary now. Will email within an hour.',
 createdAt: hoursAgo(14),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created', createdAt: daysAgo(2) },
 { id: 'a2', type: 'assignment', text: 'Assigned to Arjun K.', createdAt: daysAgo(2) },
 ],
 },
 {
 id: 'BS-TKT-48122',
 subject: 'Double charged for same puja booking',
 category: 'payments',
 priority: 'urgent',
 status: 'in_progress',
 createdAt: hoursAgo(10),
 updatedAt: hoursAgo(2),
 orderId: 'BS-20260420-P7321',
 userName: 'Anand Kumar',
 userEmail: 'anand.k@zohomail.in',
 userPhone: '+91 99988 77665',
 userJoinedAt: daysAgo(15),
 userTotalOrders: 2,
 assignedTo: 'Priya S.',
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Anand Kumar',
 body: 'Razorpay charged me twice for the Mahamrityunjay puja — ₹1,100 each. Only one booking confirmed.',
 createdAt: hoursAgo(10),
 },
 {
 id: 'm2',
 author: 'agent',
 authorName: 'Priya S.',
 body: 'Confirmed duplicate auth on Razorpay. Refund of ₹1,100 initiated — will reflect in 5-7 business days.',
 createdAt: hoursAgo(2),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created', createdAt: hoursAgo(10) },
 { id: 'a2', type: 'priority_change', text: 'Priority: High → Urgent', createdAt: hoursAgo(9) },
 ],
 },
 {
 id: 'BS-TKT-48110',
 subject: 'Wrong idol received in order',
 category: 'store',
 priority: 'medium',
 status: 'resolved',
 createdAt: daysAgo(8),
 updatedAt: daysAgo(3),
 orderId: 'BS-20260413-S2890',
 userName: 'Lakshmi Narayanan',
 userEmail: 'lakshmi.n@gmail.com',
 userJoinedAt: daysAgo(400),
 userTotalOrders: 18,
 assignedTo: 'Neha R.',
 messages: [
 {
 id: 'm1',
 author: 'user',
 authorName: 'Lakshmi Narayanan',
 body: 'Ordered brass Lakshmi idol, received Saraswati idol.',
 createdAt: daysAgo(8),
 },
 {
 id: 'm2',
 author: 'agent',
 authorName: 'Neha R.',
 body: 'Arranged pickup and dispatched correct idol. Tracking shared over email.',
 createdAt: daysAgo(6),
 },
 {
 id: 'm3',
 author: 'user',
 authorName: 'Lakshmi Narayanan',
 body: 'Received correct one. Thank you.',
 createdAt: daysAgo(3),
 },
 ],
 activity: [
 { id: 'a1', type: 'created', text: 'Ticket created', createdAt: daysAgo(8) },
 { id: 'a2', type: 'status_change', text: 'Resolved', createdAt: daysAgo(3) },
 ],
 },
];

// ─────────────────────────── Mock agent reply generator ──────────────────

export function generateAgentReply(category: TicketCategory, subject: string): string {
 const base = `Namaste — I'm ${randomAgentName()} from the Darshya support team. I've looked into your ticket "${subject}".`;
 const bodies: Record<TicketCategory, string> = {
 puja:
 'I can see your booking in our system. The puja was performed as scheduled and video proof is uploaded. For the prasad, I\'ve contacted the temple coordinator and courier partner — you should receive a tracking update within 12 hours. If the parcel does not reach you in 3 days, reply on this ticket and we will issue a full refund of the prasad portion.',
 darshan:
 'Streaming hiccups are usually caused by CDN edge cache or local network. Please try: (1) switch to the 480p feed via the gear icon, (2) clear cache, (3) use the mobile app if on desktop. If it still stutters, share the exact time and temple so we can pull the IVS logs.',
 payments:
 'I\'ve pulled the transaction record. The refund was initiated from our end on the same day — banks take 5-7 business days to credit, especially for international cards. If it doesn\'t reflect by EOD tomorrow, please share the last 4 digits of the card and I\'ll escalate with the payment gateway directly.',
 account:
 'I\'ve triggered a password reset and manually verified your account. Please check the email (including spam). If OTP still doesn\'t arrive, we can switch your account to email-OTP-only mode as a workaround.',
 store:
 'Sorry about the issue. I\'ve created a return pickup request — a delivery partner will collect the item within 48 hours. Replacement will be dispatched the moment pickup is scanned. No charges for the return.',
 astrology:
 'I checked with the astrologer and there was a genuine scheduling conflict. We\'re offering two options: (1) full refund credited in 5-7 business days, or (2) priority reschedule with a senior astrologer at no extra cost — plus a 15% credit for the inconvenience. Let me know which you prefer.',
 wellness:
 'Apologies for the confusion. I\'ve resent the correct session link and added 1 complimentary session to your account as a goodwill gesture. The teacher has also been notified to double-check links ahead of time.',
 yatra:
 'Our yatra coordinator is aware and working on it. The revised itinerary PDF will land in your inbox within 2 hours. All pre-booked hotels, darshan slots, and transport remain intact — only the document was missing a page.',
 };
 return `${base}\n\n${bodies[category]}\n\nLet me know if you need anything else.`;
}

function randomAgentName(): string {
 const names = ['Priya S.', 'Arjun K.', 'Neha R.', 'Rahul M.', 'Kavita B.'];
 return names[Math.floor(Math.random() * names.length)] ?? 'Support';
}

// ─────────────────────────── Live chat auto-reply ──────────────────────

export interface AutoReplyRule {
 keywords: string[];
 reply: string;
}

export const AUTO_REPLY_RULES: AutoReplyRule[] = [
 {
 keywords: ['hi', 'hii', 'hello', 'hey', 'namaste', 'pranam', 'ram ram', 'jai shri ram'],
 reply:
 'Namaste! I can help with puja bookings, live darshan, yatra planning, astrology, home pujas, wellness, and more. What would you like help with?',
 },
 {
 keywords: ['thank', 'thanks', 'thank you', 'shukriya', 'dhanyavaad'],
 reply:
 "You're welcome! If there's anything else you need, just let me know. May your spiritual journey with Darshya be blessed.",
 },
 {
 keywords: ['help', 'what can you do', 'what do you do'],
 reply:
 'I can help with: booking pujas (temple or home), live darshan, yatra planning, astrology consultations, wellness sessions, store orders, refunds, and account issues. What would you like to explore?',
 },
 {
 keywords: ['book', 'puja', 'pooja'],
 reply:
 'I can help you book a puja. Browse the pujas at /pujas. Every booking includes video proof; prasad delivery is an optional flat ₹150 add-on. What would you like to know?',
 },
 {
 keywords: ['refund', 'cancel', 'money back'],
 // I-09: the live-chat bot quoted the same superseded ladder the FAQ did, so
 // the first answer a devotee got was wrong at exactly the moment they were
 // deciding whether to cancel. Interpolated from lib/cancellation-policy.
 reply: `For refunds: cancelling ${FULL_REFUND_HOURS_BEFORE} hours or more before the scheduled time returns 100%, and between ${CANCELLATION_CUTOFF_HOURS} and ${FULL_REFUND_HOURS_BEFORE} hours returns ${PARTIAL_REFUND_PERCENT}%. Inside ${CANCELLATION_CUTOFF_HOURS} hours a booking can no longer be cancelled. ${REFUND_SETTLEMENT_SENTENCE} Share your order ID and I can check the status.`,
 },
 {
 keywords: ['darshan', 'stream', 'buffer', 'live'],
 reply:
 'Each darshan stream follows its own temple\'s schedule; /darshan shows what is live now. If you see buffering: switch to 480p via the gear icon, or try the mobile app. Which temple stream is having trouble?',
 },
 {
 keywords: ['prasad', 'delivery', 'courier'],
 reply:
 'Prasad delivery is an optional flat ₹150 add-on chosen when you book. We do not promise a delivery date; your booking page shows a tracking ID once one is recorded. Share your booking number and I can check what it shows.',
 },
 {
 keywords: ['login', 'otp', 'password', 'sign in'],
 reply:
 'For login issues: OTPs can take up to 2 minutes. Check spam folder. If still nothing, try email OTP instead of SMS, or reset password via /auth/forgot. Need me to escalate to account recovery?',
 },
 {
 keywords: ['astrologer', 'kundli', 'horoscope', 'astrology'],
 reply:
 'You can browse astrologers for chat, call, and report services at /astrology; the price is shown on each profile. Looking for a specific service?',
 },
 {
 keywords: ['store', 'order', 'shipping', 'product'],
 reply:
 // LEG-12: this said "Free shipping over ₹999". The cart charges
 // `subtotal >= 499 ? 0 : 49` (lib/store-pricing.ts, mirrored and enforced
 // by apps/api/src/lib/store-pricing.ts), so support was quoting a
 // threshold no basket has ever been measured against.
 `Store orders are delivered within India only, and we do not promise delivery times. Free delivery on orders of ${FREE_DELIVERY_ABOVE} and above; below that a flat ${FLAT_DELIVERY_FEE}. Your order page shows the status and a tracking number once the courier assigns one.`,
 },
 {
 keywords: ['price', 'cost', 'how much', 'fee'],
 reply:
 'Every puja, astrologer and store item shows its price before you pay. NRI pricing is shown in USD at 2.5x the domestic price and charged in INR. Want me to point you to a specific category?',
 },
 {
 keywords: ['contact', 'phone', 'call'],
 reply:
 'Reach us at: +91 92551 09400 (Mon–Sat 9am–7pm IST), support@darshya.online, or WhatsApp +91 92551 09400. For urgent booking issues, best to open a ticket at /support.',
 },
 {
 keywords: ['temple', 'which temple', 'temples'],
 reply:
 'Browse the temples listed on Darshya at /temples, with the pujas offered at each.',
 },
];

export function findAutoReply(message: string): string | null {
 const lower = message.toLowerCase();
 for (const rule of AUTO_REPLY_RULES) {
 if (rule.keywords.some((k) => lower.includes(k))) return rule.reply;
 }
 return null;
}

// ─────────────────────────── FAQ ───────────────────────────────────────

export interface FaqItem {
 id: string;
 section: string;
 question: string;
 answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
 // Getting Started (5)
 {
 id: 'gs-1',
 section: 'Getting Started',
 question: 'What is Darshya?',
 answer:
 'Darshya is India\'s devotional super-app — live darshan, online puja booking with video proof, panchang, spiritual content, e-commerce for religious items, astrology consultations, wellness sessions, and yatra tours. All in one place.',
 },
 {
 id: 'gs-2',
 section: 'Getting Started',
 question: 'How do I create an account?',
 answer:
 'Tap "Sign In" at the top right and enter your phone or email. You\'ll get an OTP — enter it and you\'re in. You can add your name, gotra, and nakshatra later from the profile page.',
 },
 {
 id: 'gs-3',
 section: 'Getting Started',
 question: 'Is Darshya free to use?',
 answer:
 'Browsing temples, darshan streams, panchang, and spiritual content is completely free. You pay only for bookings — pujas, astrology, wellness, store items, yatra tours.',
 },
 {
 id: 'gs-4',
 section: 'Getting Started',
 question: 'Does Darshya work outside India?',
 answer:
 'Yes, you can book pujas from abroad. NRI pricing is 2.5x the domestic price, shown in USD and charged in INR through Razorpay; an international card works where your card issuer allows international payments. Store orders are delivered within India only, and we do not promise prasad delivery dates.',
 },
 {
 id: 'gs-5',
 section: 'Getting Started',
 question: 'Which languages does Darshya support?',
 // I-09: this named seven languages including one — Kannada — that has no
 // landing page, no locale file and no help article; /help/articles/kn/…
 // answered 404 while this line invited a reader to switch to it. The list is
 // now generated from HELP_LANGS, which is the same set as SUPPORTED_LOCALES,
 // so it cannot name a language the product has nowhere to send you.
 answer: `The app is available in ${OFFERED_LANGUAGES}. Switch from the language selector in the footer. Coverage differs by language — most of the product is English, and each language page says how much of it is translated.`,
 },

 // Bookings & Payments (8)
 {
 id: 'bp-1',
 section: 'Bookings & Payments',
 question: 'How do I book a puja?',
 answer:
 'Go to /pujas, pick a puja (e.g. Rudrabhishek, Satyanarayan), choose a temple and date, enter your sankalp details (name, gotra, nakshatra), and pay. Your booking page shows its status, and video proof appears there after the puja. Prasad delivery is an optional add-on.',
 },
 {
 id: 'bp-2',
 section: 'Bookings & Payments',
 question: 'Can I cancel or reschedule a puja?',
 answer: `Go to /bookings, tap the booking, and choose "Cancel" or "Reschedule". Cancelling ${FULL_REFUND_HOURS_BEFORE} hours or more before the scheduled time returns everything you paid; between ${CANCELLATION_CUTOFF_HOURS} and ${FULL_REFUND_HOURS_BEFORE} hours it returns ${PARTIAL_REFUND_PERCENT}%. Inside ${CANCELLATION_CUTOFF_HOURS} hours the pandit is assigned and samagri is bought, so cancellation is no longer possible. Rescheduling depends on pandit and temple availability.`,
 },
 {
 id: 'bp-3',
 section: 'Bookings & Payments',
 question: 'What payment methods are accepted?',
 answer:
 'For India: UPI, net banking, all major cards, wallets (Paytm, PhonePe, GPay). International Visa, Mastercard and Amex cards are accepted too, billed in INR. No cash-on-delivery for bookings.',
 },
 {
 id: 'bp-4',
 section: 'Bookings & Payments',
 question: 'When will I receive the video proof?',
 // I-09: this promised 2-4 hours. COMPANY.refunds.videoProofTargetLabel — the
 // figure /refunds and /terms publish, and the only one the escalation sweep
 // is built around — is an order of magnitude wider, so support was setting an
 // expectation the delivery path was never designed to meet.
 answer: `The delivery target is ${COMPANY.refunds.videoProofTargetLabel} after the scheduled time. It appears on the booking at /bookings. If ${COMPANY.refunds.missingVideoEscalationHours} hours pass with no video and the booking is still waiting on its pandit, it is cancelled and sent to our team for review.`,
 },
 {
 id: 'bp-5',
 section: 'Bookings & Payments',
 question: 'When will the prasad arrive?',
 answer:
 'Prasad delivery is an optional flat ₹150 add-on chosen at booking. We do not promise a delivery date; your booking page shows a tracking ID once one is recorded.',
 },
 {
 id: 'bp-6',
 section: 'Bookings & Payments',
 question: 'Why did my payment fail?',
 answer:
 `Most common reasons: bank blocked the transaction, 2FA timeout, insufficient balance, or expired card. Try again with a different method. If money was deducted but no booking appears, it is usually an authorisation your bank releases on its own, typically within ${REFUND_DAYS_LABEL}; email support@darshya.online with the transaction ID if it does not.`,
 },
 {
 id: 'bp-7',
 section: 'Bookings & Payments',
 question: 'How do refunds work?',
 // I-09: this published a ladder the engine refuses to produce — a full refund
 // at the 24-hour mark and a 50% tier inside it. DEFAULT_CANCEL_POLICY pays
 // 100% at 48h+ and 75% between 24h and 48h, and cancelBooking refuses
 // outright inside 24h, so the 50% tier is unreachable for a devotee. Same
 // module /refunds and the checkout terms checkbox read (DB-06, LEG-19).
 answer: `Cancelling ${FULL_REFUND_HOURS_BEFORE} hours or more before the scheduled time returns 100%; between ${CANCELLATION_CUTOFF_HOURS} and ${FULL_REFUND_HOURS_BEFORE} hours it returns ${PARTIAL_REFUND_PERCENT}%. Cancellation is not possible within ${CANCELLATION_CUTOFF_HOURS} hours of the scheduled time. If the pandit or temple cancels, you are refunded in full whenever it happens. ${REFUND_SETTLEMENT_SENTENCE}`,
 },
 {
 id: 'bp-8',
 section: 'Bookings & Payments',
 question: 'Can I get an invoice for my booking?',
 // LEG-10: this used to be titled "Can I get a GST invoice?" and answered
 // "Invoice includes GST breakup. For business/GSTIN invoices, email …
 // with your GSTIN before booking." Darshya has no GSTIN
 // (COMPANY.tax.HAS_GST_REGISTRATION_VERIFIED === false), no code path adds
 // a tax line to a booking or a store order, and a document itemising GST
 // without a registration number is not a valid tax invoice.
 //
 // It also sent people to a "Download Invoice" button on /bookings that has
 // never existed: there is no such control anywhere in apps/web/app, and no
 // API route serves the PDF. The only delivery path is the email attachment
 // sent from payment.service.ts once the payment is confirmed, so the answer
 // now describes that instead of a control the devotee cannot find.
 answer:
 'Yes — we email it to you automatically. As soon as your payment is confirmed, Darshya sends a payment receipt PDF to your registered email address, so there is nothing to download. It shows what you paid, and it is not a GST tax invoice: Darshya is not GST-registered yet, so no GST is charged and none is shown. The amount on the receipt is the whole amount taken from your card. If you need a GST invoice for a business claim, wait until we publish a GSTIN — we cannot issue one before then.',
 },

 // Live Darshan (4)
 {
 id: 'ld-1',
 section: 'Live Darshan',
 question: 'Is live darshan really live?',
 answer:
 'Yes. Streams that are on come from the temple\'s own camera feed. Which streams are live now, and their schedule, is shown on the darshan page.',
 },
 {
 id: 'ld-2',
 section: 'Live Darshan',
 question: 'Why is my stream buffering?',
 answer:
 'Switch to 480p via the gear icon — works on slower connections. Close other tabs or apps using bandwidth. If still laggy, try the mobile app (better adaptive bitrate). Report persistent issues with the temple name and time at /support.',
 },
 {
 id: 'ld-3',
 section: 'Live Darshan',
 question: 'Why is a temple stream offline?',
 answer:
 'Temples follow their own schedule — many close during midday (12pm–4pm) and after 10pm. Some are offline on specific days. Check the schedule on the temple\'s darshan page. For technical outages, refresh in 5 minutes.',
 },
 {
 id: 'ld-4',
 section: 'Live Darshan',
 question: 'Can I watch past aarti recordings?',
 answer:
 'Where a recording is available, the temple\'s darshan page shows it. There is no offline download.',
 },

 // Store & Delivery (5)
 {
 id: 'sd-1',
 section: 'Store & Delivery',
 question: 'What can I buy on the Darshya store?',
 answer:
 'Idols, puja samagri, rudraksha, yantras, incense, lamps, religious books, temple bells, and prasad variety packs. Items are listed by the store owners on Darshya.',
 },
 {
 id: 'sd-2',
 section: 'Store & Delivery',
 question: 'What are the shipping timelines?',
 // LEG-12: "free over ₹999, else ₹49" — the ₹999 half was never charged.
 answer:
 `Store orders are delivered within India only, and we do not publish delivery timelines. Delivery is free on orders of ${FREE_DELIVERY_ABOVE} and above, otherwise a flat ${FLAT_DELIVERY_FEE} whatever the weight or destination. Your order page shows the status and a tracking number once the courier assigns one.`,
 },
 {
 id: 'sd-3',
 section: 'Store & Delivery',
 question: 'Can I return a product?',
 answer:
 'There is no automated return process. If an item is damaged, wrong or defective, contact support within 7 days of delivery with your order number and photos; we review each case and, where it is confirmed, arrange a replacement or a refund. Consumables and prasad are not returnable.',
 },
 {
 id: 'sd-4',
 section: 'Store & Delivery',
 question: 'Do you deliver store orders outside India?',
 // LEG-10: this used to end "Duties and taxes are calculated at checkout for
 // transparency." Nothing calculates them. computeStoreOrderTotals() is
 // `Σ(unitPrice × qty) + deliveryFee` — it takes no destination, no weight
 // and no HSN code, and the API refuses any order whose total disagrees. An
 // overseas buyer was told the landed cost was settled and then met a bill
 // from the carrier at the door.
 answer:
 'No. Store orders are delivered within India only; the store checkout takes an Indian address. Prasad delivery on a puja booking is separate: an optional flat ₹150 add-on, with no promised destination country or delivery date. If you want prasad sent abroad, write to support@darshya.online first; customs duties and import rules are the recipient\'s responsibility.',
 },
 {
 id: 'sd-5',
 section: 'Store & Delivery',
 question: 'Is the product genuinely blessed/consecrated?',
 answer:
 'Whether an item is consecrated is stated on its product page. We do not promise consecration, or video proof of it, unless the listing says so.',
 },

 // Astrology & Wellness (3)
 {
 id: 'aw-1',
 section: 'Astrology & Wellness',
 question: 'How do astrology consultations work?',
 answer:
 'Pick an astrologer from /astrology, choose chat / audio / video / report. Pay, then schedule a slot or start immediately if the astrologer is online. Each session is recorded and available in your account.',
 },
 {
 id: 'aw-2',
 section: 'Astrology & Wellness',
 question: 'How are astrologers vetted?',
 answer:
 'Astrologers are listed by Darshya, but we do not run a published credential-verification process, so please read each profile before you book.',
 },
 {
 id: 'aw-3',
 section: 'Astrology & Wellness',
 question: 'What wellness sessions are available?',
 answer:
 'The sessions on offer, with their timings and prices, are listed at /wellness. The price is shown on each listing before you pay.',
 },

 // Yatra & Travel (3)
 {
 id: 'yt-1',
 section: 'Yatra & Travel',
 question: 'Which yatras does Darshya offer?',
 answer:
 'Char Dham (Yamunotri, Gangotri, Kedarnath, Badrinath), 12 Jyotirlinga circuits, Shakti Peetha tour, Vaishno Devi, Tirupati + nearby temples, Golden Triangle spiritual tour, and custom private yatras.',
 },
 {
 id: 'yt-2',
 section: 'Yatra & Travel',
 question: 'What is included in the yatra package?',
 answer:
 'AC transport, hotels, temple darshan bookings (including VIP where available), vegetarian meals, English/Hindi speaking guide, and a coordinator reached by email. Flights not included unless specified.',
 },
 {
 id: 'yt-3',
 section: 'Yatra & Travel',
 question: 'Can seniors and disabled devotees join?',
 answer:
 'Tell us your requirements when you enquire. We cannot promise specific accommodations such as wheelchair assistance until they are confirmed to you in writing.',
 },

 // Account & Security (4)
 {
 id: 'as-1',
 section: 'Account & Security',
 question: 'How do I change my phone number or email?',
 answer:
 'Go to /profile → Account Info → tap the field to edit. You\'ll verify the new number/email with OTP before the change takes effect.',
 },
 {
 id: 'as-2',
 section: 'Account & Security',
 question: 'Is my payment info safe?',
 answer:
 'Yes — we never store card details. All payments go through Razorpay, which is PCI-DSS Level 1 certified. We only store the last 4 digits for your reference.',
 },
 {
 id: 'as-3',
 section: 'Account & Security',
 question: 'How do I delete my account?',
 answer:
 'Go to /settings → Privacy → Delete Account. This is permanent — all bookings, video proofs, and order history are erased within 30 days per our privacy policy. Export your data first if needed.',
 },
 {
 id: 'as-4',
 section: 'Account & Security',
 question: 'Can I share my account with family?',
 answer:
 'Not recommended — video proofs and sankalp details are personal. Instead, add family members as "beneficiaries" in your profile — you can book pujas in their name from your own account.',
 },
];

export const FAQ_SECTIONS = [
 'Getting Started',
 'Bookings & Payments',
 'Live Darshan',
 'Store & Delivery',
 'Astrology & Wellness',
 'Yatra & Travel',
 'Account & Security',
];

// ─────────────────────── Category → FAQ section ───────────────────────

/**
 * I-09: /support's eight category tiles all linked `/support/faq?cat=<id>` and
 * the FAQ page read neither `cat` nor `q`. Every tile, and every "article" link
 * on /support and /help, landed on the same unfiltered list. The tiles are
 * ticket categories and the FAQ is organised by section, so the two need a map;
 * this is it, and the discoverability test fails if a tile maps to a section
 * that does not exist or if a tile has no mapping at all.
 */
export const FAQ_SECTION_FOR_CATEGORY: Record<TicketCategory, string> = {
 puja: 'Bookings & Payments',
 payments: 'Bookings & Payments',
 darshan: 'Live Darshan',
 store: 'Store & Delivery',
 astrology: 'Astrology & Wellness',
 wellness: 'Astrology & Wellness',
 yatra: 'Yatra & Travel',
 account: 'Account & Security',
};

// ─────────────────────────── Popular articles ─────────────────────────

export interface HelpArticle {
 id: string;
 title: string;
 excerpt: string;
 category: string;
 readTime: string;
 /** Where the row actually goes. Derived — never typed by hand. */
 href: string;
}

/**
 * I-09 — WHY THIS LIST IS GENERATED.
 *
 * It used to be ten hand-written titles with hand-written excerpts and
 * hand-written read times: "Char Dham yatra: best time, routes, and health
 * prep · 8 min", and so on. None of them had been written. Each row linked to
 * `/support/faq?q=<its own title>`, a parameter the FAQ page ignored, so a
 * devotee clicking the most prominent thing on the support page got an
 * unfiltered FAQ that did not contain the article they had just been promised.
 * Ten fabricated articles, presented as "the ones devotees read most this
 * week", on the page people reach when something has already gone wrong.
 *
 * The list is now assembled from things that exist — a help article or a FAQ
 * entry — so a row cannot outlive its content. Title, excerpt and destination
 * all come from the source record, and the read time is counted off the words
 * rather than invented.
 */
export const POPULAR_ARTICLE_REFS: ReadonlyArray<
 { kind: 'article'; slug: string } | { kind: 'faq'; id: string }
> = [
 { kind: 'article', slug: 'how-to-book-a-puja' },
 { kind: 'article', slug: 'cancel-or-reschedule-a-puja' },
 { kind: 'article', slug: 'when-will-my-refund-arrive' },
 { kind: 'article', slug: 'video-proof-what-to-expect' },
 { kind: 'article', slug: 'payment-failed-money-deducted' },
 { kind: 'article', slug: 'track-your-store-order' },
 { kind: 'article', slug: 'donation-receipts-and-tax-exemption' },
 { kind: 'faq', id: 'ld-2' },
 { kind: 'faq', id: 'aw-1' },
 { kind: 'faq', id: 'as-1' },
];

/** Reading time at 200 words per minute, rounded up to a whole minute. */
function readingTime(text: string): string {
 const words = text.trim().split(/\s+/).filter(Boolean).length;
 return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function firstSentences(text: string, limit: number): string {
 if (text.length <= limit) return text;
 const cut = text.slice(0, limit);
 const stop = cut.lastIndexOf('. ');
 return stop > limit / 2 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}

export const POPULAR_ARTICLES: HelpArticle[] = POPULAR_ARTICLE_REFS.flatMap(
 (ref, idx): HelpArticle[] => {
 const id = `art-${idx + 1}`;
 if (ref.kind === 'article') {
 const article = getHelpArticle(HELP_SOURCE_LANG, ref.slug);
 if (!article) return [];
 const category = HELP_CATEGORIES.find((c) => c.id === article.category);
 return [
 {
 id,
 title: article.title,
 excerpt: firstSentences(article.summary, 160),
 category: category?.en ?? 'Help',
 readTime: readingTime(article.body),
 href: `/help/articles/${HELP_SOURCE_LANG}/${article.slug}`,
 },
 ];
 }
 const item = FAQ_ITEMS.find((f) => f.id === ref.id);
 if (!item) return [];
 return [
 {
 id,
 title: item.question,
 excerpt: firstSentences(item.answer, 160),
 category: item.section,
 readTime: readingTime(item.answer),
 href: `/support/faq?q=${encodeURIComponent(item.question)}`,
 },
 ];
 },
);
