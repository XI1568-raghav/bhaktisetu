import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Star, Languages, Award, Calendar, IndianRupee } from 'lucide-react';

export const runtime = 'edge';

interface PageProps {
 params: Promise<{ id: string }>;
}

function resolveApiBase(): string {
 const candidate = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
 return candidate.endsWith('/api/v1') ? candidate : `${candidate.replace(/\/$/, '')}/api/v1`;
}

interface PanditDetail {
 id: string;
 userId: string;
 templeName?: string | null;
 experience?: number;
 specialties?: string[];
 languages?: string[];
 bio?: string | null;
 city?: string | null;
 state?: string | null;
 rating?: number;
 totalPujas?: number;
 pricePerPuja?: number | string;
 reviews?: Array<{
 id: string;
 rating: number;
 comment: string | null;
 createdAt: string;
 }>;
}

async function getPandit(id: string): Promise<PanditDetail | null> {
 try {
 const res = await fetch(`${resolveApiBase()}/providers/pandit/${id}`, {
 next: { revalidate: 60, tags: [`pandit-${id}`] },
 });
 if (!res.ok) return null;
 const data = await res.json();
 return (data.provider as PanditDetail) ?? null;
 } catch {
 return null;
 }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
 const { id } = await params;
 const pandit = await getPandit(id);
 if (!pandit) return { title: 'Pandit · Darshya' };
 const name = pandit.templeName || 'Verified Pandit';
 return {
 title: `${name} · Verified Pandit on Darshya`,
 description: pandit.bio?.slice(0, 160) ?? `Book a puja with ${name} on Darshya. Verified pandit, transparent pricing, video proof.`,
 };
}

export default async function PanditDetailPage({ params }: PageProps) {
 const { id } = await params;
 const pandit = await getPandit(id);

 if (!pandit) notFound();

 const name = pandit.templeName || 'Verified Pandit';
 const price = Number(pandit.pricePerPuja);
 const priceLabel = Number.isFinite(price) && price > 0 ? `₹${price.toLocaleString('en-IN')}` : null;
 const rating = typeof pandit.rating === 'number' && pandit.rating > 0 ? pandit.rating.toFixed(1) : null;

 return (
 <div className="min-h-screen bg-[var(--color-bg)]">
 <div className="max-w-4xl mx-auto px-4 py-6">
 <Link
 href="/pandits"
 className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-6"
 >
 <ArrowLeft className="w-4 h-4" />
 All pandits
 </Link>

 {/* Header card */}
 <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 mb-6">
 <div className="flex flex-col sm:flex-row gap-5">
 <div className="w-20 h-20 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
 <span className="text-2xl font-bold text-saffron-700">
 {name.charAt(0).toUpperCase()}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <h1 className="text-2xl font-semibold text-surface-800 mb-1">{name}</h1>
 <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-500 mb-3">
 {pandit.city && (
 <span className="inline-flex items-center gap-1">
 <MapPin className="w-3.5 h-3.5" />
 {pandit.city}
 {pandit.state ? `, ${pandit.state}` : ''}
 </span>
 )}
 {typeof pandit.experience === 'number' && pandit.experience > 0 && (
 <span className="inline-flex items-center gap-1">
 <Calendar className="w-3.5 h-3.5" />
 {pandit.experience}+ years experience
 </span>
 )}
 {rating && (
 <span className="inline-flex items-center gap-1">
 <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
 <span className="font-medium text-surface-700">{rating}</span>
 {pandit.totalPujas ? <span className="text-surface-400">({pandit.totalPujas} pujas)</span> : null}
 </span>
 )}
 </div>
 {pandit.bio && (
 <p className="text-sm text-surface-600 leading-relaxed">{pandit.bio}</p>
 )}
 </div>
 </div>
 </div>

 {/* Specialties + languages */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
 {pandit.specialties && pandit.specialties.length > 0 && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-700 mb-3 inline-flex items-center gap-2">
 <Award className="w-4 h-4 text-saffron-600" />
 Specialties
 </h2>
 <div className="flex flex-wrap gap-2">
 {pandit.specialties.map((s) => (
 <span
 key={s}
 className="px-3 py-1 bg-saffron-50 text-saffron-700 text-xs rounded-full"
 >
 {s}
 </span>
 ))}
 </div>
 </div>
 )}
 {pandit.languages && pandit.languages.length > 0 && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-700 mb-3 inline-flex items-center gap-2">
 <Languages className="w-4 h-4 text-saffron-600" />
 Languages
 </h2>
 <div className="flex flex-wrap gap-2">
 {pandit.languages.map((l) => (
 <span
 key={l}
 className="px-3 py-1 bg-surface-100 text-surface-700 text-xs rounded-full"
 >
 {l}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Pricing + book CTA */}
 {priceLabel && (
 <div className="bg-saffron-50 border border-saffron-200 rounded-xl p-5 flex items-center justify-between mb-6">
 <div>
 <p className="text-xs text-saffron-700 mb-0.5">Starting from</p>
 <p className="text-2xl font-semibold text-saffron-800 inline-flex items-center">
 <IndianRupee className="w-5 h-5" />
 {priceLabel.replace('₹', '')}
 <span className="ml-1 text-sm font-normal text-saffron-700">/ puja</span>
 </p>
 </div>
 <Link
 href={`/pujas?panditId=${pandit.id}`}
 className="px-5 py-2.5 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700"
 >
 Book a Puja
 </Link>
 </div>
 )}

 {/* Reviews */}
 {pandit.reviews && pandit.reviews.length > 0 && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-700 mb-4">Recent reviews</h2>
 <div className="space-y-4">
 {pandit.reviews.slice(0, 5).map((r) => (
 <div key={r.id} className="border-b border-surface-100 last:border-b-0 pb-3 last:pb-0">
 <div className="flex items-center gap-2 mb-1">
 <div className="inline-flex items-center gap-0.5">
 {Array.from({ length: 5 }).map((_, i) => (
 <Star
 key={i}
 className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-surface-200'}`}
 />
 ))}
 </div>
 <span className="text-xs text-surface-500">
 {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
 </span>
 </div>
 {r.comment && <p className="text-sm text-surface-600">{r.comment}</p>}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
