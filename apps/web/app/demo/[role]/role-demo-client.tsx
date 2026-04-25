'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Signal,
  Wifi,
  Battery,
  Home,
  Search,
  MapPin,
  Video,
  Music,
  User,
  Heart,
  Star,
  Clock,
  Play,
  Users,
  Bell,
  Calendar,
  CreditCard,
  Settings,
  Camera,
  Upload,
  CheckCircle2,
  DollarSign,
  Package,
  Truck,
  MessageCircle,
  Phone,
  Award,
  FileText,
  BarChart3,
  TrendingUp,
  Wallet,
  Eye,
  ShoppingBag,
  Plus,
  BookOpen,
  Store,
  Leaf,
  Building2,
  MilkOff,
  IndianRupee,
  Image,
  Shield,
  Sparkles,
  Send,
  ThumbsUp,
  Mic,
  RadioTower,
  CircleDot,
  PawPrint,
} from 'lucide-react';

// ─── Role metadata ──────────────────────────────────────────────────────────

type RoleKey = 'devotee' | 'pandit' | 'store-owner' | 'astrologer' | 'wellness' | 'temple-manager' | 'gaushala-manager';

const roleMeta: Record<RoleKey, { name: string; color: string; accent: string }> = {
  devotee: { name: 'Devotee', color: 'saffron', accent: 'bg-saffron-600' },
  pandit: { name: 'Pandit', color: 'amber', accent: 'bg-amber-600' },
  'store-owner': { name: 'Store Owner', color: 'emerald', accent: 'bg-emerald-600' },
  astrologer: { name: 'Astrologer', color: 'purple', accent: 'bg-purple-600' },
  wellness: { name: 'Wellness Instructor', color: 'teal', accent: 'bg-teal-600' },
  'temple-manager': { name: 'Temple Manager', color: 'rose', accent: 'bg-rose-600' },
  'gaushala-manager': { name: 'Gaushala Manager', color: 'lime', accent: 'bg-lime-600' },
};

// ─── Shared UI Components ───────────────────────────────────────────────────

function StatusBar({ variant }: { variant: 'ios' | 'android' }) {
  if (variant === 'ios') {
    return (
      <div className="flex items-center justify-between px-7 pt-3 pb-1 bg-surface-50 shrink-0">
        <span className="text-[11px] font-semibold text-surface-900" style={{ fontFamily: '-apple-system, sans-serif' }}>9:41</span>
        <div className="w-[76px] h-[26px] bg-surface-900 rounded-full" />
        <div className="flex items-center gap-1">
          <Signal className="w-3.5 h-3.5 text-surface-900" />
          <Wifi className="w-3.5 h-3.5 text-surface-900" />
          <Battery className="w-5 h-3 text-surface-900" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-5 pt-2.5 pb-1 bg-surface-50 shrink-0">
      <span className="text-[11px] font-medium text-surface-800">9:41</span>
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-900 rounded-full z-10" />
      <div className="flex items-center gap-1.5">
        <Signal className="w-3 h-3 text-surface-700" />
        <Wifi className="w-3 h-3 text-surface-700" />
        <div className="w-4 h-2.5 border border-surface-700 rounded-[2px] relative">
          <div className="absolute inset-[1px] bg-surface-700 rounded-[1px]" style={{ width: '75%' }} />
        </div>
      </div>
    </div>
  );
}

function FormField({ label, placeholder, type = 'text' }: { label: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-surface-500 mb-1 block">{label}</label>
      <div className="w-full px-3 py-2 bg-surface-100 rounded-lg text-xs text-surface-400 border border-surface-200/60">
        {placeholder}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = 'bg-saffron-50 text-saffron-700' }: { label: string; value: string; icon: React.ElementType; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-surface-200/60">
      <div className={`w-7 h-7 ${color.split(' ')[0]} rounded-lg flex items-center justify-center mb-1.5`}>
        <Icon className={`w-3.5 h-3.5 ${color.split(' ')[1]}`} />
      </div>
      <p className="text-sm font-bold text-surface-900">{value}</p>
      <p className="text-[9px] text-surface-400">{label}</p>
    </div>
  );
}

function ListItem({ title, subtitle, right, icon: Icon, iconBg = 'bg-saffron-50', iconColor = 'text-saffron-600' }: {
  title: string; subtitle: string; right?: string; icon: React.ElementType; iconBg?: string; iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-surface-200/60">
      <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-900 truncate">{title}</p>
        <p className="text-[9px] text-surface-400">{subtitle}</p>
      </div>
      {right && <span className="text-xs font-bold text-saffron-600 shrink-0">{right}</span>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-surface-900 mb-2">{children}</h2>;
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full py-2.5 bg-saffron-600 text-white text-xs font-semibold rounded-xl text-center">
      {children}
    </div>
  );
}

function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 pt-3 pb-2">
      {subtitle && <p className="text-[9px] text-surface-400 font-medium">{subtitle}</p>}
      <h1 className="text-lg font-bold text-surface-900 tracking-tight">{title}</h1>
    </div>
  );
}

function TabBar({ items, active = 0 }: { items: { icon: React.ElementType; label: string }[]; active?: number }) {
  return (
    <div className="shrink-0 bg-white/90 backdrop-blur-xl border-t border-surface-200/40 px-4 pt-1.5 pb-5">
      <div className="flex items-center justify-around">
        {items.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = i === active;
          return (
            <div key={tab.label} className={`flex flex-col items-center gap-0.5 ${isActive ? 'text-saffron-600' : 'text-surface-400'}`}>
              <Icon className={`w-[20px] h-[20px] ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DEVOTEE SCREENS ────────────────────────────────────────────────────────

function DevoteeScreen1() {
  return (
    <div className="bg-gradient-to-b from-saffron-50 to-white flex flex-col items-center justify-center min-h-full px-8 text-center">
      <div className="w-20 h-20 bg-saffron-100 rounded-3xl flex items-center justify-center mb-5">
        <Heart className="w-10 h-10 text-saffron-600" />
      </div>
      <h1 className="text-2xl font-bold text-surface-900 tracking-tight">
        Pooj<span className="text-saffron-600">ly</span>
      </h1>
      <p className="text-sm text-surface-500 mt-2 leading-relaxed">Your divine companion for darshan, pujas, and spiritual growth</p>
      <div className="mt-8 w-full space-y-2.5">
        <PrimaryButton>Get Started</PrimaryButton>
        <div className="py-2 text-xs text-surface-500 text-center">Already have an account? <span className="text-saffron-600 font-semibold">Sign in</span></div>
      </div>
      <div className="flex items-center gap-4 mt-8">
        {['Live Darshan', 'Book Pujas', 'Daily Content'].map((f) => (
          <div key={f} className="text-center">
            <div className="w-10 h-10 bg-white rounded-xl border border-surface-200/60 flex items-center justify-center mx-auto mb-1">
              <Sparkles className="w-4 h-4 text-saffron-500" />
            </div>
            <p className="text-[8px] text-surface-500 font-medium">{f}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DevoteeScreen2() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Create Account" />
      <div className="px-5 space-y-3">
        <FormField label="Full Name" placeholder="Arjun Sharma" />
        <FormField label="Email" placeholder="arjun@example.com" />
        <FormField label="Phone Number" placeholder="+91 98765 43210" />
        <FormField label="Password" placeholder="********" type="password" />
        <div className="flex items-start gap-2 mt-2">
          <div className="w-4 h-4 border-2 border-saffron-600 rounded bg-saffron-600 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
          <p className="text-[9px] text-surface-500 leading-relaxed">I agree to the Terms of Service and Privacy Policy</p>
        </div>
        <div className="pt-2">
          <PrimaryButton>Create Account</PrimaryButton>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 h-px bg-surface-200" />
          <span className="text-[9px] text-surface-400">or continue with</span>
          <div className="flex-1 h-px bg-surface-200" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 py-2 bg-white border border-surface-200/60 rounded-lg text-xs text-surface-600 text-center font-medium">Google</div>
          <div className="flex-1 py-2 bg-white border border-surface-200/60 rounded-lg text-xs text-surface-600 text-center font-medium">Apple</div>
        </div>
      </div>
    </div>
  );
}

function DevoteeScreen3() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2">
        <p className="text-[10px] text-surface-400 font-medium">Namaste</p>
        <h1 className="text-lg font-bold text-surface-900 tracking-tight">Arjun Sharma</h1>
      </div>
      <div className="px-5 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <div className="w-full pl-9 pr-3 py-2 bg-surface-100 rounded-xl text-xs text-surface-400">Search temples, pujas...</div>
        </div>
      </div>
      {/* Live Darshan */}
      <div className="px-5 mb-3">
        <SectionTitle>Live Darshan</SectionTitle>
        <div className="flex gap-2 overflow-hidden">
          {['Kashi Vishwanath', 'Tirupati Balaji'].map((t) => (
            <div key={t} className="shrink-0 w-[160px] rounded-xl overflow-hidden bg-white border border-surface-200/60">
              <div className="relative h-[80px] bg-gradient-to-br from-saffron-200 to-amber-100">
                <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-red-600 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 bg-white rounded-full" /> LIVE
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-saffron-400/50" />
                </div>
                <div className="absolute bottom-1.5 left-1.5">
                  <p className="text-[9px] font-semibold text-surface-800">{t}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Popular Pujas */}
      <div className="px-5 mb-3">
        <SectionTitle>Popular Pujas</SectionTitle>
        <div className="space-y-2">
          {[
            { name: 'Rudrabhishek', deity: 'Lord Shiva', price: '501' },
            { name: 'Ganesh Puja', deity: 'Lord Ganesha', price: '351' },
            { name: 'Lakshmi Puja', deity: 'Goddess Lakshmi', price: '451' },
          ].map((p) => (
            <ListItem key={p.name} title={p.name} subtitle={p.deity} right={`₹${p.price}`} icon={Sparkles} />
          ))}
        </div>
      </div>
      {/* Panchang */}
      <div className="px-5 mb-3">
        <div className="bg-gradient-to-br from-saffron-50 to-amber-50/50 rounded-xl p-3 border border-saffron-200/40">
          <h2 className="text-xs font-bold text-surface-900 mb-1.5">Today&apos;s Panchang</h2>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white/70 rounded-lg px-2.5 py-1.5"><p className="text-[8px] text-surface-400">Tithi</p><p className="text-[10px] font-semibold text-surface-900">Trayodashi</p></div>
            <div className="bg-white/70 rounded-lg px-2.5 py-1.5"><p className="text-[8px] text-surface-400">Nakshatra</p><p className="text-[10px] font-semibold text-surface-900">Hasta</p></div>
          </div>
        </div>
      </div>
      <TabBar items={[
        { icon: Home, label: 'Home' },
        { icon: MapPin, label: 'Temples' },
        { icon: Video, label: 'Darshan' },
        { icon: Music, label: 'Content' },
        { icon: User, label: 'Profile' },
      ]} active={0} />
    </div>
  );
}

function DevoteeScreen4() {
  return (
    <div className="bg-surface-50">
      <ScreenHeader title="Book a Puja" />
      <div className="px-5 space-y-3">
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Select Temple</label>
          <div className="flex items-center justify-between w-full px-3 py-2.5 bg-white rounded-lg border border-surface-200/60">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-saffron-500" />
              <span className="text-xs text-surface-900 font-medium">Kashi Vishwanath, Varanasi</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Select Puja</label>
          <div className="space-y-1.5">
            {['Rudrabhishek - ₹501', 'Maha Mrityunjaya - ₹751', 'Kaal Sarp Dosh - ₹1,101'].map((p, i) => (
              <div key={p} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${i === 0 ? 'bg-saffron-50 border-saffron-300' : 'bg-white border-surface-200/60'}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${i === 0 ? 'border-saffron-600' : 'border-surface-300'}`}>
                  {i === 0 && <div className="w-2 h-2 bg-saffron-600 rounded-full" />}
                </div>
                <span className={`text-xs ${i === 0 ? 'font-semibold text-surface-900' : 'text-surface-600'}`}>{p}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Select Date</label>
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-surface-200/60">
            <Calendar className="w-4 h-4 text-saffron-500" />
            <span className="text-xs text-surface-900">April 20, 2026</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Sankalp Details</label>
          <FormField label="" placeholder="Your name and gotra for the sankalp" />
        </div>
        <div className="bg-saffron-50 rounded-xl p-3 border border-saffron-200/40">
          <div className="flex justify-between text-xs"><span className="text-surface-500">Puja fee</span><span className="font-semibold text-surface-900">₹501</span></div>
          <div className="flex justify-between text-xs mt-1"><span className="text-surface-500">Prasad delivery</span><span className="font-semibold text-surface-900">₹99</span></div>
          <div className="border-t border-saffron-200/40 mt-2 pt-2 flex justify-between text-xs"><span className="font-bold text-surface-900">Total</span><span className="font-bold text-saffron-600">₹600</span></div>
        </div>
        <PrimaryButton>Proceed to Pay ₹600</PrimaryButton>
      </div>
    </div>
  );
}

function DevoteeScreen5() {
  return (
    <div className="bg-surface-900 min-h-full">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <div className="bg-red-600/20 text-red-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <span className="w-1 h-1 bg-red-500 rounded-full" /> LIVE
            </div>
            <span className="text-[9px] text-surface-500">12.4K watching</span>
          </div>
          <h1 className="text-base font-bold text-white mt-1">Kashi Vishwanath</h1>
          <p className="text-[10px] text-surface-500">Morning Aarti &middot; Varanasi</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
      {/* Video area */}
      <div className="mx-5 rounded-xl bg-gradient-to-br from-saffron-900/40 to-surface-800 aspect-video flex items-center justify-center border border-surface-700/50 mb-4">
        <div className="text-center">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
          <p className="text-xs text-surface-400 mt-2">Tap to watch live darshan</p>
        </div>
      </div>
      {/* Chat overlay */}
      <div className="mx-5 bg-surface-800 rounded-xl p-3 border border-surface-700/50">
        <p className="text-[9px] text-surface-500 mb-2 font-medium">Live Chat</p>
        <div className="space-y-1.5">
          {[
            { name: 'Priya M.', msg: 'Har Har Mahadev! 🙏' },
            { name: 'Rahul K.', msg: 'So beautiful, the aarti is mesmerizing' },
            { name: 'Sunita D.', msg: 'Om Namah Shivaya 🙏' },
          ].map((c) => (
            <div key={c.name} className="flex items-start gap-1.5">
              <div className="w-4 h-4 bg-saffron-600/30 rounded-full shrink-0 flex items-center justify-center">
                <span className="text-[6px] text-saffron-300 font-bold">{c.name[0]}</span>
              </div>
              <p className="text-[9px] text-surface-300"><span className="font-semibold text-saffron-400">{c.name}</span> {c.msg}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex-1 px-2.5 py-1.5 bg-surface-700 rounded-lg text-[9px] text-surface-500">Type a message...</div>
          <div className="w-7 h-7 bg-saffron-600 rounded-lg flex items-center justify-center">
            <Send className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DevoteeScreen6() {
  return (
    <div className="bg-surface-50">
      <div className="bg-gradient-to-b from-saffron-50 to-surface-50 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-saffron-100 rounded-2xl flex items-center justify-center">
            <span className="text-lg font-bold text-saffron-700">AS</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-surface-900">Arjun Sharma</h1>
            <p className="text-[10px] text-surface-400">+91 98765 43210</p>
            <span className="text-[8px] font-semibold text-saffron-700 bg-saffron-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-0.5">
              <Shield className="w-2 h-2" /> Bhakti Pass
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <div className="bg-white rounded-lg px-2 py-2 text-center border border-surface-200/60"><p className="text-sm font-bold text-surface-900">12</p><p className="text-[8px] text-surface-400">Bookings</p></div>
          <div className="bg-white rounded-lg px-2 py-2 text-center border border-surface-200/60"><p className="text-sm font-bold text-surface-900">3</p><p className="text-[8px] text-surface-400">Temples</p></div>
          <div className="bg-white rounded-lg px-2 py-2 text-center border border-surface-200/60"><p className="text-sm font-bold text-saffron-600">₹8.5K</p><p className="text-[8px] text-surface-400">Donated</p></div>
        </div>
      </div>
      <div className="px-5 mt-3">
        <SectionTitle>Upcoming Bookings</SectionTitle>
        <div className="space-y-2">
          <div className="bg-white rounded-xl p-3 border border-surface-200/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-surface-900">Rudrabhishek</span>
              <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Confirmed</span>
            </div>
            <p className="text-[9px] text-surface-400">Kashi Vishwanath &middot; Apr 20, 2026</p>
            <p className="text-[9px] text-surface-400">Booking #BS-20260420-00312</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-surface-200/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-surface-900">Ganesh Puja</span>
              <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Scheduled</span>
            </div>
            <p className="text-[9px] text-surface-400">Siddhivinayak &middot; Apr 25, 2026</p>
            <p className="text-[9px] text-surface-400">Booking #BS-20260425-00487</p>
          </div>
        </div>
      </div>
      <div className="px-5 mt-3">
        <div className="bg-white rounded-xl border border-surface-200/60 divide-y divide-surface-100">
          {[
            { icon: BookOpen, label: 'My Bookings' },
            { icon: CreditCard, label: 'Subscription' },
            { icon: Sparkles, label: 'Ask Pandit AI' },
            { icon: Settings, label: 'Settings' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="w-7 h-7 bg-surface-100 rounded-lg flex items-center justify-center"><Icon className="w-3.5 h-3.5 text-surface-600" /></div>
              <span className="flex-1 text-xs font-medium text-surface-800">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PANDIT SCREENS ─────────────────────────────────────────────────────────

function PanditScreen1() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Create Account" />
      <div className="px-5 space-y-3">
        <FormField label="Full Name" placeholder="Pt. Ramesh Tiwari" />
        <FormField label="Phone Number" placeholder="+91 99887 76655" />
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">I am a...</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Devotee', icon: Heart, active: false },
              { label: 'Pandit', icon: BookOpen, active: true },
              { label: 'Store Owner', icon: Store, active: false },
              { label: 'Astrologer', icon: Star, active: false },
            ].map((r) => (
              <div key={r.label} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${r.active ? 'bg-saffron-50 border-saffron-300' : 'bg-white border-surface-200/60'}`}>
                <r.icon className={`w-4 h-4 ${r.active ? 'text-saffron-600' : 'text-surface-400'}`} />
                <span className={`text-xs ${r.active ? 'font-semibold text-surface-900' : 'text-surface-600'}`}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>
        <FormField label="Email" placeholder="ramesh@example.com" />
        <div className="pt-2">
          <PrimaryButton>Continue as Pandit</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function PanditScreen2() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Your Experience" subtitle="Step 1 of 2" />
      <div className="px-5 space-y-3">
        <FormField label="Years of Experience" placeholder="15 years" />
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Specialties</label>
          <div className="flex flex-wrap gap-1.5">
            {['Vedic Rituals', 'Graha Shanti', 'Vivah', 'Satyanarayan', 'Rudrabhishek', 'Kaal Sarp'].map((s, i) => (
              <span key={s} className={`text-[9px] font-medium px-2.5 py-1 rounded-full ${i < 3 ? 'bg-saffron-100 text-saffron-700 border border-saffron-200' : 'bg-surface-100 text-surface-500 border border-surface-200/60'}`}>{s}</span>
            ))}
          </div>
        </div>
        <FormField label="Languages" placeholder="Hindi, Sanskrit, English" />
        <FormField label="Temple Affiliations" placeholder="Kashi Vishwanath, Varanasi" />
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Bio</label>
          <div className="w-full px-3 py-2.5 bg-surface-100 rounded-lg text-xs text-surface-400 border border-surface-200/60 min-h-[60px]">
            15+ years performing Vedic rituals. Trained at BHU Varanasi...
          </div>
        </div>
        <PrimaryButton>Next Step</PrimaryButton>
      </div>
    </div>
  );
}

function PanditScreen3() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Pricing & Documents" subtitle="Step 2 of 2" />
      <div className="px-5 space-y-3">
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Set Your Rates</label>
          <div className="space-y-2">
            {[
              { puja: 'Basic Puja', price: '₹500' },
              { puja: 'Rudrabhishek', price: '₹1,500' },
              { puja: 'Graha Shanti', price: '₹2,100' },
            ].map((r) => (
              <div key={r.puja} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-surface-200/60">
                <span className="text-xs text-surface-800">{r.puja}</span>
                <span className="text-xs font-bold text-saffron-600">{r.price}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Upload Documents</label>
          <div className="space-y-2">
            {['Aadhaar Card', 'PAN Card', 'Certification'].map((doc) => (
              <div key={doc} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2.5 border border-surface-200/60">
                <Upload className="w-4 h-4 text-surface-400" />
                <span className="text-xs text-surface-600 flex-1">{doc}</span>
                <span className="text-[8px] text-saffron-600 font-semibold bg-saffron-50 px-2 py-0.5 rounded">Upload</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Bank Details for Payouts</label>
          <FormField label="" placeholder="Account number, IFSC" />
        </div>
        <PrimaryButton>Submit for Verification</PrimaryButton>
      </div>
    </div>
  );
}

function PanditScreen4() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-surface-400">Good morning</p>
          <h1 className="text-lg font-bold text-surface-900">Pt. Ramesh</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-saffron-50 rounded-full flex items-center justify-center relative">
            <Bell className="w-4 h-4 text-saffron-600" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface-50" />
          </div>
        </div>
      </div>
      <div className="px-5 grid grid-cols-2 gap-2 mb-3">
        <StatCard label="This Month" value="₹28,500" icon={IndianRupee} />
        <StatCard label="Completed" value="18" icon={CheckCircle2} color="bg-green-50 text-green-700" />
        <StatCard label="Upcoming" value="5" icon={Clock} color="bg-blue-50 text-blue-700" />
        <StatCard label="Rating" value="4.9" icon={Star} color="bg-amber-50 text-amber-700" />
      </div>
      <div className="px-5 mb-3">
        <SectionTitle>Upcoming Bookings</SectionTitle>
        <div className="space-y-2">
          {[
            { puja: 'Rudrabhishek', devotee: 'Arjun S.', time: 'Today, 10:00 AM', temple: 'Kashi Vishwanath' },
            { puja: 'Ganesh Puja', devotee: 'Priya M.', time: 'Tomorrow, 6:00 AM', temple: 'Siddhivinayak' },
            { puja: 'Satyanarayan', devotee: 'Rahul K.', time: 'Apr 22, 8:00 AM', temple: 'Home Visit' },
          ].map((b) => (
            <div key={b.puja + b.devotee} className="bg-white rounded-xl p-3 border border-surface-200/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-surface-900">{b.puja}</span>
                <span className="text-[8px] font-bold text-saffron-600 bg-saffron-50 px-1.5 py-0.5 rounded-full">{b.time}</span>
              </div>
              <p className="text-[9px] text-surface-400">{b.devotee} &middot; {b.temple}</p>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={[
        { icon: Home, label: 'Home' },
        { icon: Calendar, label: 'Bookings' },
        { icon: Video, label: 'Record' },
        { icon: Wallet, label: 'Earnings' },
        { icon: User, label: 'Profile' },
      ]} active={0} />
    </div>
  );
}

function PanditScreen5() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Booking Detail" />
      <div className="px-5 space-y-3">
        <div className="bg-white rounded-xl p-3 border border-surface-200/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-surface-900">Rudrabhishek</span>
            <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">In Progress</span>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-surface-400">Devotee: <span className="text-surface-700 font-medium">Arjun Sharma</span></p>
            <p className="text-[9px] text-surface-400">Temple: <span className="text-surface-700 font-medium">Kashi Vishwanath, Varanasi</span></p>
            <p className="text-[9px] text-surface-400">Sankalp: <span className="text-surface-700 font-medium">Arjun Sharma, Kashyap Gotra</span></p>
            <p className="text-[9px] text-surface-400">Booking: <span className="text-surface-700 font-medium">#BS-20260420-00312</span></p>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Upload Puja Video (Required)</label>
          <div className="border-2 border-dashed border-saffron-300 rounded-xl p-6 text-center bg-saffron-50/30">
            <Camera className="w-8 h-8 text-saffron-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-surface-700">Record or upload video</p>
            <p className="text-[9px] text-surface-400 mt-0.5">Video proof is mandatory for payout</p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-saffron-600 text-white text-[10px] font-semibold px-4 py-1.5 rounded-lg">
              <Camera className="w-3 h-3" /> Start Recording
            </div>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Upload Photos</label>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="w-16 h-16 bg-surface-100 rounded-lg border border-surface-200/60 flex items-center justify-center">
                {n === 1 ? <Image className="w-5 h-5 text-surface-300" /> : <Plus className="w-4 h-4 text-surface-300" />}
              </div>
            ))}
          </div>
        </div>
        <PrimaryButton>Mark as Completed</PrimaryButton>
      </div>
    </div>
  );
}

function PanditScreen6() {
  return (
    <div className="bg-surface-50">
      <ScreenHeader title="Earnings" />
      <div className="px-5">
        <div className="bg-gradient-to-br from-saffron-600 to-amber-600 rounded-xl p-4 mb-4">
          <p className="text-[10px] text-white/70">Total Earnings</p>
          <p className="text-2xl font-bold text-white mt-0.5">₹1,85,400</p>
          <div className="flex items-center gap-3 mt-3">
            <div><p className="text-[9px] text-white/60">This Month</p><p className="text-sm font-bold text-white">₹28,500</p></div>
            <div className="w-px h-6 bg-white/20" />
            <div><p className="text-[9px] text-white/60">Pending</p><p className="text-sm font-bold text-white">₹4,200</p></div>
            <div className="w-px h-6 bg-white/20" />
            <div><p className="text-[9px] text-white/60">Pujas Done</p><p className="text-sm font-bold text-white">142</p></div>
          </div>
        </div>
        <SectionTitle>Recent Payouts</SectionTitle>
        <div className="space-y-2 mb-4">
          {[
            { date: 'Apr 15', amount: '₹8,400', status: 'Paid', pujas: 6 },
            { date: 'Apr 8', amount: '₹6,200', status: 'Paid', pujas: 4 },
            { date: 'Apr 1', amount: '₹9,100', status: 'Paid', pujas: 7 },
          ].map((p) => (
            <div key={p.date} className="flex items-center gap-2.5 bg-white rounded-xl p-3 border border-surface-200/60">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-surface-900">{p.amount}</p>
                <p className="text-[9px] text-surface-400">{p.date} &middot; {p.pujas} pujas</p>
              </div>
              <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">{p.status}</span>
            </div>
          ))}
        </div>
        <div className="w-full py-2.5 bg-surface-800 text-white text-xs font-semibold rounded-xl text-center">
          Request Payout
        </div>
      </div>
    </div>
  );
}

// ─── STORE OWNER SCREENS ────────────────────────────────────────────────────

function StoreScreen1() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Create Store Account" />
      <div className="px-5 space-y-3">
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200/40 flex items-center gap-3 mb-1">
          <Store className="w-8 h-8 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-surface-900">Sell on Darshya</p>
            <p className="text-[9px] text-surface-500">Reach millions of devotees</p>
          </div>
        </div>
        <FormField label="Owner Name" placeholder="Rajesh Gupta" />
        <FormField label="Phone Number" placeholder="+91 98765 43210" />
        <FormField label="Email" placeholder="rajesh@pujashop.com" />
        <FormField label="Password" placeholder="********" />
        <PrimaryButton>Create Store Account</PrimaryButton>
      </div>
    </div>
  );
}

function StoreScreen2() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Store Details" subtitle="Setup your store" />
      <div className="px-5 space-y-3">
        <FormField label="Store Name" placeholder="Kashi Puja Samagri" />
        <FormField label="Store Description" placeholder="Premium puja items since 1985..." />
        <FormField label="GST Number" placeholder="09AAACR5055K1Z5" />
        <FormField label="Store Address" placeholder="Vishwanath Gali, Varanasi" />
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Store Category</label>
          <div className="flex flex-wrap gap-1.5">
            {['Puja Items', 'Idols', 'Books', 'Rudraksha', 'Gemstones'].map((c, i) => (
              <span key={c} className={`text-[9px] font-medium px-2.5 py-1 rounded-full ${i < 2 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-surface-100 text-surface-500'}`}>{c}</span>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Store Logo</label>
          <div className="w-20 h-20 bg-surface-100 rounded-xl border-2 border-dashed border-surface-300 flex items-center justify-center">
            <Upload className="w-5 h-5 text-surface-300" />
          </div>
        </div>
        <PrimaryButton>Save & Continue</PrimaryButton>
      </div>
    </div>
  );
}

function StoreScreen3() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Add Product" />
      <div className="px-5 space-y-3">
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Product Photos</label>
          <div className="flex gap-2">
            <div className="w-20 h-20 bg-saffron-50 rounded-xl border border-saffron-200/60 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-saffron-300" />
            </div>
            <div className="w-20 h-20 bg-surface-100 rounded-xl border-2 border-dashed border-surface-300 flex items-center justify-center">
              <Plus className="w-5 h-5 text-surface-300" />
            </div>
          </div>
        </div>
        <FormField label="Product Name" placeholder="Brass Puja Thali Set" />
        <FormField label="Description" placeholder="Handcrafted 7-piece brass puja thali..." />
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Price (INR)" placeholder="₹899" />
          <FormField label="Stock Qty" placeholder="150" />
        </div>
        <FormField label="SKU" placeholder="KPS-BTH-001" />
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Category</label>
          <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-surface-200/60">
            <span className="text-xs text-surface-600">Puja Thali & Accessories</span>
            <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
          </div>
        </div>
        <FormField label="Weight (grams)" placeholder="450" />
        <PrimaryButton>Add Product</PrimaryButton>
      </div>
    </div>
  );
}

function StoreScreen4() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-surface-400">Store Dashboard</p>
          <h1 className="text-lg font-bold text-surface-900">Kashi Puja Samagri</h1>
        </div>
        <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
          <Bell className="w-4 h-4 text-emerald-600" />
        </div>
      </div>
      <div className="px-5 grid grid-cols-2 gap-2 mb-3">
        <StatCard label="Revenue (Month)" value="₹1.2L" icon={TrendingUp} color="bg-emerald-50 text-emerald-700" />
        <StatCard label="Orders" value="84" icon={Package} color="bg-blue-50 text-blue-700" />
        <StatCard label="Products" value="36" icon={ShoppingBag} color="bg-purple-50 text-purple-700" />
        <StatCard label="Rating" value="4.7" icon={Star} color="bg-amber-50 text-amber-700" />
      </div>
      <div className="px-5 mb-3">
        <SectionTitle>Recent Orders</SectionTitle>
        <div className="space-y-2">
          {[
            { id: '#ORD-4521', item: 'Brass Puja Thali Set', amount: '₹899', status: 'New' },
            { id: '#ORD-4520', item: 'Rudraksha Mala (5 Mukhi)', amount: '₹1,299', status: 'Shipped' },
            { id: '#ORD-4519', item: 'Camphor Pack (500g)', amount: '₹249', status: 'Delivered' },
          ].map((o) => (
            <div key={o.id} className="bg-white rounded-xl p-3 border border-surface-200/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-surface-900">{o.item}</span>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                  o.status === 'New' ? 'text-blue-600 bg-blue-50' :
                  o.status === 'Shipped' ? 'text-amber-600 bg-amber-50' :
                  'text-green-600 bg-green-50'
                }`}>{o.status}</span>
              </div>
              <p className="text-[9px] text-surface-400">{o.id} &middot; {o.amount}</p>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={[
        { icon: Home, label: 'Dashboard' },
        { icon: Package, label: 'Products' },
        { icon: ShoppingBag, label: 'Orders' },
        { icon: BarChart3, label: 'Analytics' },
        { icon: User, label: 'Profile' },
      ]} active={0} />
    </div>
  );
}

function StoreScreen5() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Order #ORD-4521" />
      <div className="px-5 space-y-3">
        <div className="bg-white rounded-xl p-3 border border-surface-200/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-surface-900">Brass Puja Thali Set</span>
            <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">New Order</span>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-surface-400">Customer: <span className="text-surface-700 font-medium">Priya Mehta</span></p>
            <p className="text-[9px] text-surface-400">Address: <span className="text-surface-700 font-medium">Andheri West, Mumbai 400053</span></p>
            <p className="text-[9px] text-surface-400">Qty: <span className="text-surface-700 font-medium">1</span></p>
            <p className="text-[9px] text-surface-400">Amount: <span className="text-saffron-600 font-bold">₹899</span></p>
          </div>
        </div>
        {/* Tracking */}
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-2 block">Order Status</label>
          <div className="space-y-0">
            {[
              { step: 'Order Placed', done: true },
              { step: 'Packed', done: true },
              { step: 'Shipped', done: false },
              { step: 'Delivered', done: false },
            ].map((s, i) => (
              <div key={s.step} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${s.done ? 'bg-green-500' : 'bg-surface-200'}`}>
                    {s.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  {i < 3 && <div className={`w-0.5 h-6 ${s.done ? 'bg-green-300' : 'bg-surface-200'}`} />}
                </div>
                <span className={`text-xs ${s.done ? 'font-semibold text-surface-900' : 'text-surface-400'} mt-0.5`}>{s.step}</span>
              </div>
            ))}
          </div>
        </div>
        <FormField label="Tracking Number" placeholder="Enter courier tracking ID" />
        <div className="flex gap-2">
          <div className="flex-1 py-2.5 bg-saffron-600 text-white text-xs font-semibold rounded-xl text-center">Mark as Shipped</div>
          <div className="py-2.5 px-4 bg-surface-100 text-surface-600 text-xs font-semibold rounded-xl text-center">Print Label</div>
        </div>
      </div>
    </div>
  );
}

// ─── ASTROLOGER SCREENS ─────────────────────────────────────────────────────

function AstrologerScreen1() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Join as Astrologer" />
      <div className="px-5 space-y-3">
        <div className="bg-purple-50 rounded-xl p-3 border border-purple-200/40 flex items-center gap-3 mb-1">
          <Star className="w-8 h-8 text-purple-600" />
          <div>
            <p className="text-xs font-semibold text-surface-900">Share Your Wisdom</p>
            <p className="text-[9px] text-surface-500">Consult devotees on Darshya</p>
          </div>
        </div>
        <FormField label="Full Name" placeholder="Acharya Vinod Sharma" />
        <FormField label="Phone" placeholder="+91 98765 43210" />
        <FormField label="Email" placeholder="vinod@astrology.com" />
        <FormField label="Password" placeholder="********" />
        <PrimaryButton>Create Astrologer Account</PrimaryButton>
      </div>
    </div>
  );
}

function AstrologerScreen2() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Setup Profile" subtitle="Complete your astrologer profile" />
      <div className="px-5 space-y-3">
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Specialties</label>
          <div className="flex flex-wrap gap-1.5">
            {['Vedic Astrology', 'Numerology', 'Palmistry', 'Vastu', 'Tarot', 'KP System'].map((s, i) => (
              <span key={s} className={`text-[9px] font-medium px-2.5 py-1 rounded-full ${i < 3 ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-surface-100 text-surface-500'}`}>{s}</span>
            ))}
          </div>
        </div>
        <FormField label="Experience" placeholder="20 years" />
        <FormField label="Languages" placeholder="Hindi, English, Sanskrit" />
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Consultation Pricing</label>
          <div className="space-y-2">
            {[
              { type: 'Chat (per min)', price: '₹15' },
              { type: 'Voice Call (per min)', price: '₹25' },
              { type: 'Video Call (per min)', price: '₹40' },
            ].map((p) => (
              <div key={p.type} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-surface-200/60">
                <span className="text-xs text-surface-800">{p.type}</span>
                <span className="text-xs font-bold text-purple-600">{p.price}</span>
              </div>
            ))}
          </div>
        </div>
        <PrimaryButton>Save Profile</PrimaryButton>
      </div>
    </div>
  );
}

function AstrologerScreen3() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-surface-400">Welcome back</p>
          <h1 className="text-lg font-bold text-surface-900">Acharya Vinod</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-green-500 rounded-full flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            <span className="text-[9px] text-white font-semibold">Online</span>
          </div>
        </div>
      </div>
      <div className="px-5 grid grid-cols-2 gap-2 mb-3">
        <StatCard label="Earnings (Month)" value="₹42,000" icon={IndianRupee} color="bg-purple-50 text-purple-700" />
        <StatCard label="Consultations" value="128" icon={MessageCircle} color="bg-blue-50 text-blue-700" />
        <StatCard label="Rating" value="4.8" icon={Star} color="bg-amber-50 text-amber-700" />
        <StatCard label="Minutes Today" value="145" icon={Clock} color="bg-green-50 text-green-700" />
      </div>
      <div className="px-5 mb-3">
        <SectionTitle>Queue (3 waiting)</SectionTitle>
        <div className="space-y-2">
          {[
            { name: 'Kavita Desai', type: 'Video Call', topic: 'Marriage compatibility' },
            { name: 'Amit Patel', type: 'Chat', topic: 'Career guidance' },
            { name: 'Sunita Roy', type: 'Voice Call', topic: 'Health concerns' },
          ].map((q) => (
            <div key={q.name} className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-surface-200/60">
              <div className="w-9 h-9 bg-purple-50 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600">{q.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-900">{q.name}</p>
                <p className="text-[9px] text-surface-400">{q.type} &middot; {q.topic}</p>
              </div>
              <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                <Phone className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={[
        { icon: Home, label: 'Home' },
        { icon: MessageCircle, label: 'Chats' },
        { icon: BarChart3, label: 'Analytics' },
        { icon: Wallet, label: 'Earnings' },
        { icon: User, label: 'Profile' },
      ]} active={0} />
    </div>
  );
}

function AstrologerScreen4() {
  return (
    <div className="bg-surface-50 min-h-full flex flex-col">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-surface-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-purple-600">K</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-surface-900">Kavita Desai</p>
            <p className="text-[9px] text-surface-400">Video Call &middot; 12:34</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center">
            <Phone className="w-3.5 h-3.5 text-red-500 rotate-[135deg]" />
          </div>
        </div>
      </div>
      <div className="flex-1 px-5 py-3 space-y-2.5 overflow-y-auto">
        {/* Messages */}
        <div className="flex justify-end">
          <div className="bg-purple-600 text-white rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%]">
            <p className="text-[10px]">Please share your birth details - date, time, and place of birth.</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%] border border-surface-200/60">
            <p className="text-[10px] text-surface-800">DOB: 15 March 1992, 10:35 AM, Pune</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-purple-600 text-white rounded-2xl rounded-br-sm px-3 py-2 max-w-[70%]">
            <p className="text-[10px]">Your Kundli shows strong 7th house placement. Jupiter is favorably positioned for marriage this year. Let me check compatibility...</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%] border border-surface-200/60">
            <p className="text-[10px] text-surface-800">That&apos;s great news! What about the Manglik dosha?</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-purple-50 rounded-xl p-2.5 max-w-[75%] border border-purple-200/40">
            <p className="text-[9px] font-semibold text-purple-700 mb-1">Kundli Analysis</p>
            <div className="grid grid-cols-2 gap-1">
              <div className="bg-white rounded px-2 py-1"><p className="text-[7px] text-surface-400">Rashi</p><p className="text-[9px] font-medium">Mithun</p></div>
              <div className="bg-white rounded px-2 py-1"><p className="text-[7px] text-surface-400">Nakshatra</p><p className="text-[9px] font-medium">Ardra</p></div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-2.5 border-t border-surface-200/60 flex items-center gap-2">
        <div className="flex-1 px-3 py-2 bg-surface-100 rounded-xl text-[10px] text-surface-400">Type your message...</div>
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
          <Send className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    </div>
  );
}

function AstrologerScreen5() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Reviews & Ratings" />
      <div className="px-5">
        <div className="bg-white rounded-xl p-4 border border-surface-200/60 mb-4 text-center">
          <p className="text-3xl font-bold text-surface-900">4.8</p>
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-amber-400 fill-amber-100'}`} />
            ))}
          </div>
          <p className="text-[9px] text-surface-400 mt-1">Based on 128 consultations</p>
        </div>
        <SectionTitle>Recent Reviews</SectionTitle>
        <div className="space-y-2.5">
          {[
            { name: 'Kavita D.', rating: 5, comment: 'Very accurate predictions. Explained everything clearly about my marriage compatibility.', date: 'Apr 16' },
            { name: 'Amit P.', rating: 5, comment: 'Best astrologer on the platform. Career advice was spot on.', date: 'Apr 15' },
            { name: 'Meera S.', rating: 4, comment: 'Good consultation. Would have liked more detailed remedies.', date: 'Apr 14' },
          ].map((r) => (
            <div key={r.name} className="bg-white rounded-xl p-3 border border-surface-200/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-surface-900">{r.name}</span>
                <div className="flex items-center gap-0.5">
                  {Array(r.rating).fill(0).map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-surface-500 leading-relaxed">{r.comment}</p>
              <p className="text-[8px] text-surface-300 mt-1">{r.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── WELLNESS SCREENS ───────────────────────────────────────────────────────

function WellnessScreen1() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Join as Instructor" />
      <div className="px-5 space-y-3">
        <div className="bg-teal-50 rounded-xl p-3 border border-teal-200/40 flex items-center gap-3 mb-1">
          <Leaf className="w-8 h-8 text-teal-600" />
          <div>
            <p className="text-xs font-semibold text-surface-900">Teach Wellness</p>
            <p className="text-[9px] text-surface-500">Yoga, meditation, and Ayurveda</p>
          </div>
        </div>
        <FormField label="Full Name" placeholder="Guru Nirmala Devi" />
        <FormField label="Phone" placeholder="+91 98765 43210" />
        <FormField label="Email" placeholder="nirmala@wellness.com" />
        <FormField label="Password" placeholder="********" />
        <PrimaryButton>Create Instructor Account</PrimaryButton>
      </div>
    </div>
  );
}

function WellnessScreen2() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Your Profile" subtitle="Step 1 of 1" />
      <div className="px-5 space-y-3">
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Certifications</label>
          <div className="space-y-1.5">
            {['Yoga Alliance RYT-500', 'Ayurveda Practitioner'].map((c) => (
              <div key={c} className="flex items-center gap-2.5 bg-teal-50 rounded-lg px-3 py-2 border border-teal-200/40">
                <Award className="w-4 h-4 text-teal-600" />
                <span className="text-xs text-surface-800 font-medium">{c}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-dashed border-surface-300">
              <Plus className="w-4 h-4 text-surface-400" />
              <span className="text-xs text-surface-400">Add certification</span>
            </div>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Session Types</label>
          <div className="flex flex-wrap gap-1.5">
            {['Yoga', 'Meditation', 'Pranayama', 'Ayurveda', 'Sound Healing'].map((s, i) => (
              <span key={s} className={`text-[9px] font-medium px-2.5 py-1 rounded-full ${i < 3 ? 'bg-teal-100 text-teal-700 border border-teal-200' : 'bg-surface-100 text-surface-500'}`}>{s}</span>
            ))}
          </div>
        </div>
        <FormField label="Experience" placeholder="12 years" />
        <FormField label="Session Pricing" placeholder="₹500/session" />
        <FormField label="Bio" placeholder="Certified yoga instructor with 12+ years..." />
        <PrimaryButton>Complete Profile</PrimaryButton>
      </div>
    </div>
  );
}

function WellnessScreen3() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-surface-400">Namaste</p>
          <h1 className="text-lg font-bold text-surface-900">Guru Nirmala</h1>
        </div>
        <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center">
          <Bell className="w-4 h-4 text-teal-600" />
        </div>
      </div>
      <div className="px-5 grid grid-cols-2 gap-2 mb-3">
        <StatCard label="Students" value="248" icon={Users} color="bg-teal-50 text-teal-700" />
        <StatCard label="Sessions (Month)" value="42" icon={Calendar} color="bg-blue-50 text-blue-700" />
        <StatCard label="Earnings" value="₹34,500" icon={IndianRupee} color="bg-green-50 text-green-700" />
        <StatCard label="Rating" value="4.9" icon={Star} color="bg-amber-50 text-amber-700" />
      </div>
      <div className="px-5 mb-3">
        <SectionTitle>Today&apos;s Sessions</SectionTitle>
        <div className="space-y-2">
          {[
            { name: 'Morning Yoga Flow', time: '6:00 - 7:00 AM', students: 18, status: 'Completed' },
            { name: 'Pranayama Basics', time: '8:00 - 8:45 AM', students: 12, status: 'Live Now' },
            { name: 'Evening Meditation', time: '6:00 - 6:30 PM', students: 24, status: 'Upcoming' },
          ].map((s) => (
            <div key={s.name} className="bg-white rounded-xl p-3 border border-surface-200/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-surface-900">{s.name}</span>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                  s.status === 'Live Now' ? 'text-red-600 bg-red-50' :
                  s.status === 'Completed' ? 'text-green-600 bg-green-50' :
                  'text-blue-600 bg-blue-50'
                }`}>{s.status}</span>
              </div>
              <p className="text-[9px] text-surface-400">{s.time} &middot; {s.students} students</p>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={[
        { icon: Home, label: 'Home' },
        { icon: Calendar, label: 'Sessions' },
        { icon: Users, label: 'Students' },
        { icon: Wallet, label: 'Earnings' },
        { icon: User, label: 'Profile' },
      ]} active={0} />
    </div>
  );
}

function WellnessScreen4() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Pranayama Basics" subtitle="Live Session" />
      <div className="px-5 space-y-3">
        <div className="bg-teal-50 rounded-xl p-3 border border-teal-200/40 flex items-center gap-3">
          <div className="bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </div>
          <span className="text-xs text-surface-700 font-medium">Duration: 32:15</span>
        </div>
        <SectionTitle>Attendees (12)</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {['Priya', 'Arjun', 'Meera', 'Rahul', 'Sunita', 'Amit', 'Kavita', 'Ravi'].map((name) => (
            <div key={name} className="text-center">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-xs font-bold text-teal-700">{name[0]}</span>
              </div>
              <p className="text-[8px] text-surface-500 truncate">{name}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-3 border border-surface-200/60">
          <p className="text-[9px] font-medium text-surface-500 mb-2">Session Controls</p>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="w-10 h-10 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Mic className="w-4 h-4 text-surface-600" />
              </div>
              <p className="text-[8px] text-surface-400">Mute</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Video className="w-4 h-4 text-surface-600" />
              </div>
              <p className="text-[8px] text-surface-400">Camera</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-1">
                <Phone className="w-4 h-4 text-white rotate-[135deg]" />
              </div>
              <p className="text-[8px] text-surface-400">End</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WellnessScreen5() {
  return (
    <div className="bg-surface-50">
      <ScreenHeader title="Earnings" />
      <div className="px-5">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl p-4 mb-4">
          <p className="text-[10px] text-white/70">Total Earnings</p>
          <p className="text-2xl font-bold text-white mt-0.5">₹2,48,000</p>
          <div className="flex items-center gap-3 mt-3">
            <div><p className="text-[9px] text-white/60">This Month</p><p className="text-sm font-bold text-white">₹34,500</p></div>
            <div className="w-px h-6 bg-white/20" />
            <div><p className="text-[9px] text-white/60">Sessions</p><p className="text-sm font-bold text-white">42</p></div>
            <div className="w-px h-6 bg-white/20" />
            <div><p className="text-[9px] text-white/60">Students</p><p className="text-sm font-bold text-white">248</p></div>
          </div>
        </div>
        <SectionTitle>Earnings Breakdown</SectionTitle>
        <div className="space-y-2">
          {[
            { type: 'Yoga Sessions', amount: '₹18,000', count: '24 sessions' },
            { type: 'Pranayama', amount: '₹9,500', count: '12 sessions' },
            { type: 'Meditation', amount: '₹7,000', count: '6 sessions' },
          ].map((e) => (
            <div key={e.type} className="flex items-center gap-2.5 bg-white rounded-xl p-3 border border-surface-200/60">
              <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-surface-900">{e.type}</p>
                <p className="text-[9px] text-surface-400">{e.count}</p>
              </div>
              <span className="text-xs font-bold text-teal-600">{e.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TEMPLE MANAGER SCREENS ─────────────────────────────────────────────────

function TempleScreen1() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Register Temple" />
      <div className="px-5 space-y-3">
        <div className="bg-rose-50 rounded-xl p-3 border border-rose-200/40 flex items-center gap-3 mb-1">
          <Building2 className="w-8 h-8 text-rose-600" />
          <div>
            <p className="text-xs font-semibold text-surface-900">Temple Management</p>
            <p className="text-[9px] text-surface-500">Bring your temple online on Darshya</p>
          </div>
        </div>
        <FormField label="Manager Name" placeholder="Shri Mahant Devnath" />
        <FormField label="Phone" placeholder="+91 98765 43210" />
        <FormField label="Email" placeholder="devnath@temple.com" />
        <FormField label="Designation" placeholder="Chief Priest / Manager" />
        <PrimaryButton>Register as Temple Manager</PrimaryButton>
      </div>
    </div>
  );
}

function TempleScreen2() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Temple Details" subtitle="Setup your temple profile" />
      <div className="px-5 space-y-3">
        <FormField label="Temple Name" placeholder="Shri Kashi Vishwanath Mandir" />
        <FormField label="Location" placeholder="Vishwanath Gali, Varanasi, UP" />
        <FormField label="Deity" placeholder="Lord Shiva" />
        <FormField label="Established" placeholder="Ancient (rebuilt 1780)" />
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Temple Photos</label>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`w-20 h-20 rounded-xl flex items-center justify-center ${n === 1 ? 'bg-rose-50 border border-rose-200/60' : 'bg-surface-100 border-2 border-dashed border-surface-300'}`}>
                {n === 1 ? <Building2 className="w-6 h-6 text-rose-300" /> : <Plus className="w-5 h-5 text-surface-300" />}
              </div>
            ))}
          </div>
        </div>
        <FormField label="Daily Darshan Hours" placeholder="5:00 AM - 9:00 PM" />
        <PrimaryButton>Save Temple Profile</PrimaryButton>
      </div>
    </div>
  );
}

function TempleScreen3() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-surface-400">Temple Dashboard</p>
          <h1 className="text-base font-bold text-surface-900">Kashi Vishwanath</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-0.5 bg-green-500 rounded-full flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            <span className="text-[8px] text-white font-semibold">Live</span>
          </div>
          <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center">
            <Bell className="w-4 h-4 text-rose-600" />
          </div>
        </div>
      </div>
      <div className="px-5 grid grid-cols-2 gap-2 mb-3">
        <StatCard label="Live Viewers" value="12.4K" icon={Eye} color="bg-rose-50 text-rose-700" />
        <StatCard label="Pujas Today" value="28" icon={Sparkles} color="bg-amber-50 text-amber-700" />
        <StatCard label="Donations (Month)" value="₹4.2L" icon={Heart} color="bg-green-50 text-green-700" />
        <StatCard label="Rating" value="4.9" icon={Star} color="bg-purple-50 text-purple-700" />
      </div>
      <div className="px-5 mb-3">
        <SectionTitle>Today&apos;s Schedule</SectionTitle>
        <div className="space-y-2">
          {[
            { event: 'Morning Aarti', time: '5:00 AM', status: 'Completed' },
            { event: 'Rudrabhishek', time: '10:00 AM', status: 'Live Now' },
            { event: 'Evening Aarti', time: '7:00 PM', status: 'Upcoming' },
          ].map((e) => (
            <div key={e.event} className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-surface-200/60">
              <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-900">{e.event}</p>
                <p className="text-[9px] text-surface-400">{e.time}</p>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                e.status === 'Live Now' ? 'text-red-600 bg-red-50' :
                e.status === 'Completed' ? 'text-green-600 bg-green-50' :
                'text-blue-600 bg-blue-50'
              }`}>{e.status}</span>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={[
        { icon: Home, label: 'Home' },
        { icon: Video, label: 'Stream' },
        { icon: Calendar, label: 'Schedule' },
        { icon: IndianRupee, label: 'Donations' },
        { icon: User, label: 'Profile' },
      ]} active={0} />
    </div>
  );
}

function TempleScreen4() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Live Stream" subtitle="Manage darshan stream" />
      <div className="px-5 space-y-3">
        <div className="bg-surface-900 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white text-[8px] px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Eye className="w-2.5 h-2.5" /> 12,438
          </div>
          <div className="text-center">
            <RadioTower className="w-10 h-10 text-surface-500 mx-auto" />
            <p className="text-[10px] text-surface-500 mt-1">Camera 1 - Sanctum</p>
          </div>
        </div>
        <div className="flex gap-2">
          {['Camera 1', 'Camera 2', 'Camera 3'].map((c, i) => (
            <div key={c} className={`flex-1 py-2 rounded-lg text-[10px] font-semibold text-center ${i === 0 ? 'bg-saffron-600 text-white' : 'bg-surface-100 text-surface-500'}`}>
              {c}
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-3 border border-surface-200/60">
          <p className="text-[9px] font-medium text-surface-500 mb-2">Stream Info</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]"><span className="text-surface-400">Quality</span><span className="font-medium text-surface-800">1080p @ 30fps</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-surface-400">Bitrate</span><span className="font-medium text-surface-800">4.5 Mbps</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-surface-400">Uptime</span><span className="font-medium text-surface-800">3h 24m</span></div>
            <div className="flex justify-between text-[10px]"><span className="text-surface-400">Peak Viewers</span><span className="font-medium text-surface-800">18,200</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 py-2.5 bg-red-500 text-white text-xs font-semibold rounded-xl text-center">End Stream</div>
          <div className="py-2.5 px-4 bg-surface-100 text-surface-600 text-xs font-semibold rounded-xl text-center">Settings</div>
        </div>
      </div>
    </div>
  );
}

function TempleScreen5() {
  return (
    <div className="bg-surface-50">
      <ScreenHeader title="Donations" />
      <div className="px-5">
        <div className="bg-gradient-to-br from-rose-600 to-pink-600 rounded-xl p-4 mb-4">
          <p className="text-[10px] text-white/70">Total Donations</p>
          <p className="text-2xl font-bold text-white mt-0.5">₹18,42,000</p>
          <div className="flex items-center gap-3 mt-3">
            <div><p className="text-[9px] text-white/60">This Month</p><p className="text-sm font-bold text-white">₹4,20,000</p></div>
            <div className="w-px h-6 bg-white/20" />
            <div><p className="text-[9px] text-white/60">Donors</p><p className="text-sm font-bold text-white">1,248</p></div>
            <div className="w-px h-6 bg-white/20" />
            <div><p className="text-[9px] text-white/60">Avg</p><p className="text-sm font-bold text-white">₹336</p></div>
          </div>
        </div>
        <SectionTitle>Recent Donations</SectionTitle>
        <div className="space-y-2">
          {[
            { name: 'Arjun Sharma', amount: '₹5,001', type: 'Online', time: '2 min ago' },
            { name: 'Priya Mehta', amount: '₹1,100', type: 'Chadhava', time: '15 min ago' },
            { name: 'NRI Donor (US)', amount: '$100', type: 'Online', time: '1 hr ago' },
            { name: 'Rahul Kumar', amount: '₹501', type: 'Bhog', time: '2 hrs ago' },
          ].map((d) => (
            <div key={d.name + d.time} className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-surface-200/60">
              <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-900">{d.name}</p>
                <p className="text-[9px] text-surface-400">{d.type} &middot; {d.time}</p>
              </div>
              <span className="text-xs font-bold text-green-600">{d.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── GAUSHALA MANAGER SCREENS ───────────────────────────────────────────────

function GaushalaScreen1() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Register Gaushala" />
      <div className="px-5 space-y-3">
        <div className="bg-lime-50 rounded-xl p-3 border border-lime-200/40 flex items-center gap-3 mb-1">
          <MilkOff className="w-8 h-8 text-lime-600" />
          <div>
            <p className="text-xs font-semibold text-surface-900">Gaushala Management</p>
            <p className="text-[9px] text-surface-500">Connect your gaushala with devotees</p>
          </div>
        </div>
        <FormField label="Manager Name" placeholder="Shri Govardhan Das" />
        <FormField label="Phone" placeholder="+91 98765 43210" />
        <FormField label="Email" placeholder="govardhan@gaushala.org" />
        <FormField label="Password" placeholder="********" />
        <PrimaryButton>Register Gaushala</PrimaryButton>
      </div>
    </div>
  );
}

function GaushalaScreen2() {
  return (
    <div className="bg-surface-50 min-h-full">
      <ScreenHeader title="Gaushala Details" subtitle="Setup your gaushala profile" />
      <div className="px-5 space-y-3">
        <FormField label="Gaushala Name" placeholder="Govardhan Gaushala" />
        <FormField label="Location" placeholder="Mathura, Uttar Pradesh" />
        <FormField label="Total Cows" placeholder="245" />
        <FormField label="Established Year" placeholder="1998" />
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Services</label>
          <div className="flex flex-wrap gap-1.5">
            {['Cow Feeding', 'Cow Adoption', 'Gau Daan', 'Panchgavya Products', 'Visits'].map((s, i) => (
              <span key={s} className={`text-[9px] font-medium px-2.5 py-1 rounded-full ${i < 3 ? 'bg-lime-100 text-lime-700 border border-lime-200' : 'bg-surface-100 text-surface-500'}`}>{s}</span>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-surface-500 mb-1 block">Photos</label>
          <div className="flex gap-2">
            <div className="w-20 h-20 bg-lime-50 rounded-xl border border-lime-200/60 flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-lime-300" />
            </div>
            <div className="w-20 h-20 bg-surface-100 rounded-xl border-2 border-dashed border-surface-300 flex items-center justify-center">
              <Plus className="w-5 h-5 text-surface-300" />
            </div>
          </div>
        </div>
        <FormField label="Daily Feed Cost (per cow)" placeholder="₹80" />
        <PrimaryButton>Save Gaushala Profile</PrimaryButton>
      </div>
    </div>
  );
}

function GaushalaScreen3() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-surface-400">Gaushala Dashboard</p>
          <h1 className="text-base font-bold text-surface-900">Govardhan Gaushala</h1>
        </div>
        <div className="w-8 h-8 bg-lime-50 rounded-full flex items-center justify-center">
          <Bell className="w-4 h-4 text-lime-600" />
        </div>
      </div>
      <div className="px-5 grid grid-cols-2 gap-2 mb-3">
        <StatCard label="Total Cows" value="245" icon={PawPrint} color="bg-lime-50 text-lime-700" />
        <StatCard label="Adoptions" value="89" icon={Heart} color="bg-rose-50 text-rose-700" />
        <StatCard label="Donations (Month)" value="₹1.8L" icon={IndianRupee} color="bg-green-50 text-green-700" />
        <StatCard label="Sponsors" value="312" icon={Users} color="bg-blue-50 text-blue-700" />
      </div>
      <div className="px-5 mb-3">
        <SectionTitle>Recent Activity</SectionTitle>
        <div className="space-y-2">
          {[
            { event: 'New Adoption', detail: 'Arjun adopted Ganga (Jersey)', time: '10 min ago', icon: Heart },
            { event: 'Donation Received', detail: '₹5,001 from Priya Mehta', time: '1 hr ago', icon: IndianRupee },
            { event: 'Feed Delivered', detail: '500kg hay + 200kg grains', time: '3 hrs ago', icon: Package },
          ].map((a) => (
            <div key={a.event + a.time} className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-surface-200/60">
              <div className="w-9 h-9 bg-lime-50 rounded-lg flex items-center justify-center">
                <a.icon className="w-4 h-4 text-lime-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-900">{a.event}</p>
                <p className="text-[9px] text-surface-400">{a.detail}</p>
              </div>
              <span className="text-[8px] text-surface-300 shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
      <TabBar items={[
        { icon: Home, label: 'Home' },
        { icon: PawPrint, label: 'Cows' },
        { icon: Heart, label: 'Adopt' },
        { icon: Wallet, label: 'Funds' },
        { icon: User, label: 'Profile' },
      ]} active={0} />
    </div>
  );
}

function GaushalaScreen4() {
  return (
    <div className="bg-surface-50">
      <ScreenHeader title="Cow Profiles" />
      <div className="px-5 mb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <div className="w-full pl-9 pr-3 py-2 bg-surface-100 rounded-xl text-xs text-surface-400">Search by name or tag...</div>
        </div>
      </div>
      <div className="px-5 flex gap-1.5 mb-3">
        {['All (245)', 'Adopted (89)', 'Available (156)'].map((f, i) => (
          <span key={f} className={`text-[9px] font-semibold px-2.5 py-1 rounded-full ${i === 0 ? 'bg-lime-600 text-white' : 'bg-surface-100 text-surface-500'}`}>{f}</span>
        ))}
      </div>
      <div className="px-5 space-y-2.5">
        {[
          { name: 'Ganga', breed: 'Jersey Cross', age: '4 years', tag: 'GG-001', adopted: true, sponsor: 'Arjun S.' },
          { name: 'Nandi', breed: 'Gir', age: '6 years', tag: 'GG-002', adopted: true, sponsor: 'Priya M.' },
          { name: 'Lakshmi', breed: 'Sahiwal', age: '3 years', tag: 'GG-003', adopted: false, sponsor: null },
          { name: 'Kamadhenu', breed: 'Red Sindhi', age: '5 years', tag: 'GG-004', adopted: false, sponsor: null },
        ].map((cow) => (
          <div key={cow.tag} className="bg-white rounded-xl p-3 border border-surface-200/60">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-lime-50 rounded-xl flex items-center justify-center">
                <PawPrint className="w-6 h-6 text-lime-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-surface-900">{cow.name}</span>
                  <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${cow.adopted ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'}`}>
                    {cow.adopted ? 'Adopted' : 'Available'}
                  </span>
                </div>
                <p className="text-[9px] text-surface-400">{cow.breed} &middot; {cow.age} &middot; Tag: {cow.tag}</p>
                {cow.sponsor && <p className="text-[9px] text-saffron-600 mt-0.5">Sponsor: {cow.sponsor}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Screen registry ────────────────────────────────────────────────────────

const screenRegistry: Record<RoleKey, { title: string; component: React.FC }[]> = {
  devotee: [
    { title: 'Welcome', component: DevoteeScreen1 },
    { title: 'Sign Up', component: DevoteeScreen2 },
    { title: 'Home Feed', component: DevoteeScreen3 },
    { title: 'Book a Puja', component: DevoteeScreen4 },
    { title: 'Live Darshan', component: DevoteeScreen5 },
    { title: 'Profile & Bookings', component: DevoteeScreen6 },
  ],
  pandit: [
    { title: 'Sign Up', component: PanditScreen1 },
    { title: 'Experience & Specialties', component: PanditScreen2 },
    { title: 'Pricing & Docs', component: PanditScreen3 },
    { title: 'Dashboard', component: PanditScreen4 },
    { title: 'Booking Detail', component: PanditScreen5 },
    { title: 'Earnings', component: PanditScreen6 },
  ],
  'store-owner': [
    { title: 'Sign Up', component: StoreScreen1 },
    { title: 'Store Setup', component: StoreScreen2 },
    { title: 'Add Product', component: StoreScreen3 },
    { title: 'Dashboard', component: StoreScreen4 },
    { title: 'Order Management', component: StoreScreen5 },
  ],
  astrologer: [
    { title: 'Sign Up', component: AstrologerScreen1 },
    { title: 'Profile Setup', component: AstrologerScreen2 },
    { title: 'Dashboard', component: AstrologerScreen3 },
    { title: 'Live Consultation', component: AstrologerScreen4 },
    { title: 'Reviews & Ratings', component: AstrologerScreen5 },
  ],
  wellness: [
    { title: 'Sign Up', component: WellnessScreen1 },
    { title: 'Profile & Certs', component: WellnessScreen2 },
    { title: 'Dashboard', component: WellnessScreen3 },
    { title: 'Live Session', component: WellnessScreen4 },
    { title: 'Earnings', component: WellnessScreen5 },
  ],
  'temple-manager': [
    { title: 'Sign Up', component: TempleScreen1 },
    { title: 'Temple Details', component: TempleScreen2 },
    { title: 'Dashboard', component: TempleScreen3 },
    { title: 'Live Stream', component: TempleScreen4 },
    { title: 'Donations', component: TempleScreen5 },
  ],
  'gaushala-manager': [
    { title: 'Sign Up', component: GaushalaScreen1 },
    { title: 'Gaushala Details', component: GaushalaScreen2 },
    { title: 'Dashboard', component: GaushalaScreen3 },
    { title: 'Cow Profiles', component: GaushalaScreen4 },
  ],
};

// ─── Phone Frame ────────────────────────────────────────────────────────────

function PhoneFrame({ children, variant }: { children: React.ReactNode; variant: 'ios' | 'android' }) {
  const isIos = variant === 'ios';
  return (
    <div className={`relative w-[375px] h-[700px] bg-surface-50 ${isIos ? 'rounded-[2.5rem] border-[6px] border-surface-900' : 'rounded-[2rem] border-[4px] border-surface-800'} shadow-2xl shadow-black/25 overflow-hidden flex flex-col`}>
      <StatusBar variant={variant} />
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {children}
      </div>
      {/* Home indicator */}
      {isIos ? (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[120px] h-[4px] bg-surface-900 rounded-full" />
      ) : (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[100px] h-[3px] bg-surface-400 rounded-full" />
      )}
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export function RoleDemoClient({ role }: { role: string }) {
  const [currentScreen, setCurrentScreen] = useState(0);

  const roleKey = role as RoleKey;
  const screens = screenRegistry[roleKey];
  const meta = roleMeta[roleKey];

  if (!screens || !meta) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg font-bold">Role not found</p>
          <Link href="/demo" className="text-saffron-400 text-sm mt-2 inline-block">Back to demos</Link>
        </div>
      </div>
    );
  }

  const totalScreens = screens.length;
  const currentEntry = screens[currentScreen];
  if (!currentEntry) return null;
  const CurrentScreenComponent = currentEntry.component;

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-900 via-surface-800 to-surface-900">
      {/* Top nav */}
      <div className="max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-saffron-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Demos
        </Link>
        <h2 className="text-sm font-semibold text-white">{meta.name} Flow</h2>
        <div className="w-20" />
      </div>

      {/* Screen title + step */}
      <div className="text-center pt-6 pb-4 px-6">
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {currentEntry.title}
        </h1>
        <p className="text-surface-500 text-sm mt-1">
          Screen {currentScreen + 1} of {totalScreens}
        </p>
      </div>

      {/* Step indicator dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {screens.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentScreen(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentScreen
                ? 'w-8 bg-saffron-500'
                : i < currentScreen
                ? 'w-2 bg-saffron-600/50'
                : 'w-2 bg-surface-600'
            }`}
            aria-label={`Go to screen ${i + 1}`}
          />
        ))}
      </div>

      {/* Phone mockups side by side */}
      <div className="flex items-start justify-center gap-8 px-6 pb-6 overflow-x-auto">
        {/* iOS */}
        <div className="flex flex-col items-center shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.99 2.97 12.5 4.7 9.56C5.55 8.1 7.13 7.2 8.82 7.17C10.1 7.15 11.32 8.04 12.11 8.04C12.89 8.04 14.37 6.96 15.92 7.14C16.57 7.17 18.39 7.4 19.56 9.12C19.47 9.17 17.29 10.45 17.31 13.11C17.34 16.28 20.05 17.29 20.09 17.3C20.06 17.38 19.67 18.76 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>
            </div>
            <span className="text-xs font-semibold text-white">iOS</span>
          </div>
          <PhoneFrame variant="ios">
            <CurrentScreenComponent />
          </PhoneFrame>
        </div>

        {/* Android */}
        <div className="flex flex-col items-center shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-[#3DDC84] rounded-md flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="white"><path d="M17.6,9.48l1.84-3.18c0.16-0.31,0.04-0.69-0.26-0.85c-0.29-0.15-0.65-0.06-0.83,0.22l-1.88,3.24 c-2.86-1.21-6.08-1.21-8.94,0L5.65,5.67c-0.19-0.29-0.58-0.38-0.87-0.2C4.5,5.65,4.41,6.01,4.56,6.3L6.4,9.48 C3.3,11.25,1.28,14.44,1,18h22C22.72,14.44,20.7,11.25,17.6,9.48z M7,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25S8.25,13.31,8.25,14C8.25,14.69,7.69,15.25,7,15.25z M17,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25s1.25,0.56,1.25,1.25C18.25,14.69,17.69,15.25,17,15.25z"/></svg>
            </div>
            <span className="text-xs font-semibold text-white">Android</span>
          </div>
          <PhoneFrame variant="android">
            <CurrentScreenComponent />
          </PhoneFrame>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-4 pb-16 px-6">
        <button
          onClick={() => setCurrentScreen((prev) => Math.max(0, prev - 1))}
          disabled={currentScreen === 0}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentScreen === 0
              ? 'bg-surface-700 text-surface-500 cursor-not-allowed'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Screen
        </button>
        <button
          onClick={() => setCurrentScreen((prev) => Math.min(totalScreens - 1, prev + 1))}
          disabled={currentScreen === totalScreens - 1}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            currentScreen === totalScreens - 1
              ? 'bg-surface-700 text-surface-500 cursor-not-allowed'
              : 'bg-saffron-600 text-white hover:bg-saffron-700'
          }`}
        >
          Next Screen
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
