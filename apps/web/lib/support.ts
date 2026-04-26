/**
 * Support / Customer Care data layer.
 * Ticket types, sample data, FAQ content, auto-reply keyword matching,
 * and localStorage persistence helpers.
 */

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
 category: TicketCategory;
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
 body: 'Cancelled a puja booking on 12 April (order D7720). Stripe says refund initiated but nothing in my card statement. This is urgent — charge was $2,140.',
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
 body: 'Confirmed duplicate auth on Razorpay. Refund of ₹1,100 initiated — will reflect in 3-5 business days.',
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
 'I checked with the astrologer and there was a genuine scheduling conflict. We\'re offering two options: (1) full refund credited in 3-5 days, or (2) priority reschedule with a senior astrologer at no extra cost — plus a 15% credit for the inconvenience. Let me know which you prefer.',
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
 'I can help you book a puja. Browse 40+ options at /pujas — Rudrabhishek, Mahamrityunjay, Satyanarayan and more. Every booking includes video proof and prasad delivery. Would you like me to share the most popular ones?',
 },
 {
 keywords: ['refund', 'cancel', 'money back'],
 reply:
 'For refunds: bookings cancelled 24+ hours before the scheduled time get a full refund. Refunds reach Indian cards in 3-5 business days, international cards in 5-7 days. Share your order ID and I can check the status.',
 },
 {
 keywords: ['darshan', 'stream', 'buffer', 'live'],
 reply:
 'Live darshan streams run 4am-10pm IST from 50+ temples. If you see buffering: switch to 480p via the gear icon, or try the mobile app. Which temple stream is having trouble?',
 },
 {
 keywords: ['prasad', 'delivery', 'courier'],
 reply:
 'Prasad ships within 24 hours of puja completion — usually reaches India in 3-5 days, international in 7-14 days. Tracking is emailed automatically. Want me to pull the status for your order?',
 },
 {
 keywords: ['login', 'otp', 'password', 'sign in'],
 reply:
 'For login issues: OTPs can take up to 2 minutes. Check spam folder. If still nothing, try email OTP instead of SMS, or reset password via /auth/forgot. Need me to escalate to account recovery?',
 },
 {
 keywords: ['astrologer', 'kundli', 'horoscope', 'astrology'],
 reply:
 'We have 30+ verified astrologers for chat, call, and report services. Starting ₹99 for a 10-min intro call. Browse at /astrology. Looking for a specific service?',
 },
 {
 keywords: ['store', 'order', 'shipping', 'product'],
 reply:
 'Store orders ship within 24-48 hours. Standard delivery: 3-5 days pan-India, 7-14 days international. Free shipping over ₹999. Share your order ID for status.',
 },
 {
 keywords: ['price', 'cost', 'how much', 'fee'],
 reply:
 'Puja prices range from ₹501 (simple aarti) to ₹25,000 (full yagya). Astrology starts at ₹99. Store items from ₹199. NRI pricing available in USD. Want me to show a specific category?',
 },
 {
 keywords: ['contact', 'phone', 'call'],
 reply:
 'Reach us at: +91-80-6900-9000 (8am–11pm IST), ️ support@darshya.online, or WhatsApp +91 98765 43210. For urgent booking issues, best to open a ticket at /support.',
 },
 {
 keywords: ['temple', 'which temple', 'temples'],
 reply:
 'We partner with 50+ temples across India — Kashi Vishwanath, Tirumala, Somnath, Vaishno Devi, Shirdi Sai Baba, and more. Browse all at /temples.',
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
 'Darshya is India\'s devotional super-app — live darshan from 50+ temples, online puja booking with video proof, panchang, spiritual content, e-commerce for religious items, astrology consultations, wellness sessions, and yatra tours. All in one place.',
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
 'Yes. NRI users pay in USD and get access to all pujas, darshan, store, and yatra bookings. Prasad and physical goods ship internationally — delivery 7-14 days depending on country.',
 },
 {
 id: 'gs-5',
 section: 'Getting Started',
 question: 'Which languages does Darshya support?',
 answer:
 'The app is available in English, Hindi, Tamil, Telugu, Kannada, Marathi, and Bengali. More languages coming soon. Switch from the language selector in the footer.',
 },

 // Bookings & Payments (8)
 {
 id: 'bp-1',
 section: 'Bookings & Payments',
 question: 'How do I book a puja?',
 answer:
 'Go to /pujas, pick a puja (e.g. Rudrabhishek, Satyanarayan), choose a temple and date, enter your sankalp details (name, gotra, nakshatra), and pay. You\'ll get a booking confirmation instantly, video proof after the puja, and prasad by post.',
 },
 {
 id: 'bp-2',
 section: 'Bookings & Payments',
 question: 'Can I cancel or reschedule a puja?',
 answer:
 'Yes, up to 24 hours before the scheduled time. Go to /bookings, tap the booking, and choose "Cancel" or "Reschedule". Full refund within 3-5 business days.',
 },
 {
 id: 'bp-3',
 section: 'Bookings & Payments',
 question: 'What payment methods are accepted?',
 answer:
 'For India: UPI, net banking, all major cards, wallets (Paytm, PhonePe, GPay). For international users: Visa, Mastercard, Amex via Stripe. No cash-on-delivery for bookings.',
 },
 {
 id: 'bp-4',
 section: 'Bookings & Payments',
 question: 'When will I receive the video proof?',
 answer:
 'Within 2-4 hours of puja completion. You\'ll get a push notification and email with the video link. Video is hosted securely and accessible from /bookings forever.',
 },
 {
 id: 'bp-5',
 section: 'Bookings & Payments',
 question: 'When will the prasad arrive?',
 answer:
 'Prasad ships within 24 hours of puja. Within India: 3-5 days. NRI users: 7-14 days depending on country. Tracking link is emailed automatically.',
 },
 {
 id: 'bp-6',
 section: 'Bookings & Payments',
 question: 'Why did my payment fail?',
 answer:
 'Most common reasons: bank blocked the transaction, 2FA timeout, insufficient balance, or expired card. Try again with a different method. If money was deducted but booking didn\'t confirm, it auto-refunds within 5 business days.',
 },
 {
 id: 'bp-7',
 section: 'Bookings & Payments',
 question: 'How do refunds work?',
 answer:
 'Cancellations 24+ hours before → full refund. Within 24 hours → 50%. After puja has started → no refund (but we review case-by-case for genuine issues). Refunds reach Indian cards in 3-5 days, international in 5-7 days.',
 },
 {
 id: 'bp-8',
 section: 'Bookings & Payments',
 question: 'Can I get a GST invoice?',
 answer:
 'Yes. After booking, go to /bookings → tap the booking → "Download Invoice". Invoice includes GST breakup. For business/GSTIN invoices, email support@darshya.online with your GSTIN before booking.',
 },

 // Live Darshan (4)
 {
 id: 'ld-1',
 section: 'Live Darshan',
 question: 'Is live darshan really live?',
 answer:
 'Yes — our streams use AWS IVS with ~3 second latency. You\'re watching the sanctum sanctorum in near-real-time. Schedule for each temple is shown on the darshan page.',
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
 'Yes. Each temple page has a "Recent Aartis" section with recordings from the last 7 days. Favorites can be saved to your account for offline viewing (Plus subscribers).',
 },

 // Store & Delivery (5)
 {
 id: 'sd-1',
 section: 'Store & Delivery',
 question: 'What can I buy on the Darshya store?',
 answer:
 'Idols, puja samagri, rudraksha, yantras, incense, lamps, religious books, temple bells, and prasad variety packs. All items are sourced from verified spiritual retailers.',
 },
 {
 id: 'sd-2',
 section: 'Store & Delivery',
 question: 'What are the shipping timelines?',
 answer:
 'India: 3-5 business days (free over ₹999, else ₹49). International: 7-14 business days. Prasad parcels ship same-day from the temple city.',
 },
 {
 id: 'sd-3',
 section: 'Store & Delivery',
 question: 'Can I return a product?',
 answer:
 'Yes, within 7 days of delivery if the item is damaged, wrong, or defective. Idols and consecrated items cannot be returned once unpacked (religious reasons). Email support@darshya.online with photos.',
 },
 {
 id: 'sd-4',
 section: 'Store & Delivery',
 question: 'Do you ship to the US, UK, and Middle East?',
 answer:
 'Yes — we deliver to 40+ countries including US, UK, Canada, Australia, UAE, Singapore. Duties and taxes are calculated at checkout for transparency.',
 },
 {
 id: 'sd-5',
 section: 'Store & Delivery',
 question: 'Is the product genuinely blessed/consecrated?',
 answer:
 'Rudraksha, yantras, and idols are pre-consecrated at partner temples before shipping — video proof of consecration is available on request. Regular samagri is sourced but not consecrated.',
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
 question: 'Are the astrologers verified?',
 answer:
 'Yes — every astrologer goes through a 5-step verification: ID, educational credentials, 2 expert interviews, test readings, and ongoing user rating monitoring. Average 10+ years experience.',
 },
 {
 id: 'aw-3',
 section: 'Astrology & Wellness',
 question: 'What wellness sessions are available?',
 answer:
 'Live yoga (daily 6am & 6pm IST), guided meditation, pranayama, ayurveda consultations, and chakra healing. Group sessions from ₹99, 1-on-1 from ₹499.',
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
 'AC transport, vetted hotels, all temple darshan bookings (including VIP where available), vegetarian meals, English/Hindi speaking guide, and 24/7 coordinator support. Flights not included unless specified.',
 },
 {
 id: 'yt-3',
 section: 'Yatra & Travel',
 question: 'Can seniors and disabled devotees join?',
 answer:
 'Yes. We offer senior-friendly yatras with shorter walks, wheelchair assistance, and medical tie-ups. Mention requirements during booking — we customize the itinerary.',
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
 'Yes — we never store card details. All payments go through Razorpay (India) or Stripe (international), both PCI-DSS Level 1 certified. We only store the last 4 digits for your reference.',
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

// ─────────────────────────── Popular articles ─────────────────────────

export interface HelpArticle {
 id: string;
 title: string;
 excerpt: string;
 category: string;
 readTime: string;
}

export const POPULAR_ARTICLES: HelpArticle[] = [
 {
 id: 'art-1',
 title: 'How to book your first puja on Darshya',
 excerpt: 'A step-by-step walkthrough — from picking the right puja to receiving video proof and prasad at home.',
 category: 'Puja Bookings',
 readTime: '4 min',
 },
 {
 id: 'art-2',
 title: 'Understanding video proof: what to expect',
 excerpt: 'Video proof is mandatory for every booking. Here\'s when it arrives, what it contains, and how long it stays accessible.',
 category: 'Puja Bookings',
 readTime: '3 min',
 },
 {
 id: 'art-3',
 title: 'Troubleshoot live darshan buffering in 60 seconds',
 excerpt: 'Three quick fixes that solve 90% of streaming issues — before you have to contact support.',
 category: 'Live Darshan',
 readTime: '2 min',
 },
 {
 id: 'art-4',
 title: 'Refund timelines explained (India & NRI)',
 excerpt: 'Exactly when refunds arrive for different payment methods, cancellation windows, and international cards.',
 category: 'Payments & Refunds',
 readTime: '3 min',
 },
 {
 id: 'art-5',
 title: 'Setting up your sankalp: name, gotra, nakshatra',
 excerpt: 'Why these details matter, where to find them, and how to save them once for all future bookings.',
 category: 'Account & Profile',
 readTime: '5 min',
 },
 {
 id: 'art-6',
 title: 'What to do if your prasad is delayed',
 excerpt: 'Typical courier delays, how to track, and when to raise a ticket for a replacement or refund.',
 category: 'Store Orders',
 readTime: '3 min',
 },
 {
 id: 'art-7',
 title: 'How to choose the right astrologer for your concern',
 excerpt: 'Match astrologers by speciality — marriage, career, health — and pick between chat, call, and detailed reports.',
 category: 'Astrology',
 readTime: '6 min',
 },
 {
 id: 'art-8',
 title: 'Joining your first live yoga session',
 excerpt: 'Tech check, attire, what to keep ready, and making the most of your instructor-led sessions.',
 category: 'Wellness',
 readTime: '4 min',
 },
 {
 id: 'art-9',
 title: 'Char Dham yatra: best time, routes, and health prep',
 excerpt: 'A complete planning guide for the Char Dham pilgrimage — altitude, weather, fitness, and what to pack.',
 category: 'Yatra & Travel',
 readTime: '8 min',
 },
 {
 id: 'art-10',
 title: 'Securing your account: 2FA, OTPs, and family access',
 excerpt: 'Simple steps to keep your spiritual and payment data safe without making sign-in a chore.',
 category: 'Account & Profile',
 readTime: '4 min',
 },
];
