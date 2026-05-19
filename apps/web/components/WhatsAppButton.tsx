'use client';

import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919037049955';
const GREETING = 'Namaste! I have a question about Darshya.';

export default function WhatsAppButton() {
 const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(GREETING)}`;
 return (
 <a
 href={href}
 target="_blank"
 rel="noopener noreferrer"
 aria-label="Chat on WhatsApp"
 className="fixed bottom-20 right-5 z-[59] flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform"
 >
 <MessageCircle className="w-7 h-7" fill="white" stroke="#25D366" strokeWidth={1.5} />
 </a>
 );
}
