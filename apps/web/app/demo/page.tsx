'use client';

import { useState } from 'react';
import { getTempleHero, getDeityImage, getContentImage } from '../../lib/images';
import {
  Home,
  MapPin,
  Video,
  Music,
  User,
  Play,
  Users,
  Star,
  Clock,
  Search,
  Sparkles,
  Heart,
  Pause,
  SkipForward,
  SkipBack,
  Shield,
  Bell,
  Sunrise,
  Sunset,
  BookOpen,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Wifi,
  Battery,
  Signal,
} from 'lucide-react';

// ─── Shared Data ─────────────────────────────────────────────────────────────

const liveStreams = [
  { name: 'Kashi Vishwanath', city: 'Varanasi', deity: 'Lord Shiva', viewers: 12450, event: 'Morning Aarti', img: getTempleHero('kashi-vishwanath') },
  { name: 'Tirupati Balaji', city: 'Tirumala', deity: 'Lord Venkateswara', viewers: 28300, event: 'Suprabhatam', img: getTempleHero('tirumala-tirupati') },
  { name: 'Siddhivinayak', city: 'Mumbai', deity: 'Lord Ganesha', viewers: 8760, event: 'Abhishek', img: getTempleHero('siddhivinayak') },
];

const pujas = [
  { name: 'Rudrabhishek', deity: 'Lord Shiva', price: 501, rating: 4.9, img: getDeityImage('lord-shiva', 'square') },
  { name: 'Ganesh Puja', deity: 'Lord Ganesha', price: 351, rating: 4.8, img: getDeityImage('lord-ganesha', 'square') },
  { name: 'Lakshmi Puja', deity: 'Goddess Lakshmi', price: 451, rating: 4.7, img: getDeityImage('goddess-lakshmi', 'square') },
];

const contentItems = [
  { title: 'Om Jai Jagdish Hare', deity: 'Lord Vishnu', type: 'Aarti', duration: '6:18', img: getContentImage('aarti', 'thumbnail') },
  { title: 'Hanuman Chalisa', deity: 'Lord Hanuman', type: 'Chalisa', duration: '9:42', img: getContentImage('chalisa', 'thumbnail') },
  { title: 'Gayatri Mantra', deity: 'Goddess Gayatri', type: 'Mantra', duration: '45:00', img: getContentImage('mantra', 'thumbnail') },
  { title: 'Shiv Tandav', deity: 'Lord Shiva', type: 'Stotram', duration: '11:30', img: getContentImage('stotram', 'thumbnail') },
];

// ─── Tab definitions ─────────────────────────────────────────────────────────

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'temples', label: 'Temples', icon: MapPin },
  { id: 'darshan', label: 'Darshan', icon: Video },
  { id: 'content', label: 'Content', icon: Music },
  { id: 'profile', label: 'Profile', icon: User },
];

// ─── Screen Content ──────────────────────────────────────────────────────────

function HomeScreen() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2">
        <p className="text-[10px] text-surface-400 font-medium">Namaste</p>
        <h1 className="text-lg font-bold text-surface-900 tracking-tight">Arjun Sharma</h1>
      </div>
      <div className="px-5 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input type="text" placeholder="Search temples, pujas..." className="w-full pl-9 pr-3 py-2 bg-surface-100 rounded-xl text-xs placeholder:text-surface-400 border-0 focus:outline-none" />
        </div>
      </div>
      {/* Live Darshan */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-surface-900">Live Darshan</h2>
          <span className="text-[10px] font-semibold text-saffron-600">View All</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {liveStreams.map((s) => (
            <div key={s.name} className="shrink-0 w-[200px] rounded-xl overflow-hidden bg-white border border-surface-200/60">
              <div className="relative aspect-[16/10]">
                <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> LIVE
                </div>
                <div className="absolute bottom-2 left-2">
                  <p className="text-white text-[10px] font-semibold">{s.name}</p>
                  <p className="text-white/60 text-[8px]">{s.city}</p>
                </div>
                <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/50 text-white text-[7px] px-1 py-0.5 rounded backdrop-blur-sm">
                  <Users className="w-2 h-2" />{(s.viewers/1000).toFixed(1)}K
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Panchang */}
      <div className="px-5 mb-4">
        <div className="bg-gradient-to-br from-saffron-50 to-amber-50/50 rounded-xl p-3 border border-saffron-200/40">
          <h2 className="text-xs font-bold text-surface-900 mb-2">Today&apos;s Panchang</h2>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white/70 rounded-lg px-2.5 py-1.5"><p className="text-[8px] text-surface-400">Tithi</p><p className="text-[11px] font-semibold text-surface-900">Trayodashi</p></div>
            <div className="bg-white/70 rounded-lg px-2.5 py-1.5"><p className="text-[8px] text-surface-400">Nakshatra</p><p className="text-[11px] font-semibold text-surface-900">Hasta</p></div>
            <div className="bg-white/70 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5"><Sunrise className="w-3 h-3 text-saffron-500" /><div><p className="text-[8px] text-surface-400">Sunrise</p><p className="text-[10px] font-semibold">6:02 AM</p></div></div>
            <div className="bg-white/70 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5"><Sunset className="w-3 h-3 text-saffron-500" /><div><p className="text-[8px] text-surface-400">Sunset</p><p className="text-[10px] font-semibold">6:48 PM</p></div></div>
          </div>
        </div>
      </div>
      {/* Popular Pujas */}
      <div className="px-5 mb-4">
        <h2 className="text-sm font-bold text-surface-900 mb-2">Popular Pujas</h2>
        <div className="space-y-2">
          {pujas.map((p) => (
            <div key={p.name} className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-surface-200/60">
              <img src={p.img} alt={p.deity} className="w-11 h-11 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-surface-900">{p.name}</h3>
                <p className="text-[10px] text-surface-400">{p.deity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-saffron-600">₹{p.price}</p>
                <button className="text-[8px] font-semibold text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded mt-0.5">Book</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-2" />
    </div>
  );
}

function ContentScreen() {
  return (
    <div className="bg-surface-50">
      <div className="px-5 pt-3 pb-2">
        <h1 className="text-lg font-bold text-surface-900">Content</h1>
      </div>
      <div className="px-5 mb-3 flex gap-1.5">
        {['Aarti','Chalisa','Mantra','Bhajan'].map((t,i) => (
          <button key={t} className={`text-[10px] font-semibold px-3 py-1 rounded-full ${i===0?'bg-saffron-600 text-white':'bg-surface-100 text-surface-500'}`}>{t}</button>
        ))}
      </div>
      <div className="px-5 space-y-2 pb-4">
        {contentItems.map((c) => (
          <div key={c.title} className="flex items-center gap-2.5 bg-white rounded-xl p-2.5 border border-surface-200/60">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <img src={c.img} alt={c.deity} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="w-3 h-3 text-white fill-white ml-px" /></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-surface-900 truncate">{c.title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] font-semibold text-saffron-600 bg-saffron-50 px-1.5 py-0.5 rounded">{c.type}</span>
                <span className="text-[8px] text-surface-400">{c.deity}</span>
              </div>
            </div>
            <span className="text-[9px] text-surface-400 shrink-0">{c.duration}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen() {
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
            <span className="text-[8px] font-semibold text-saffron-700 bg-saffron-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-0.5"><Shield className="w-2 h-2" /> Bhakti Pass</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <div className="bg-white rounded-lg px-2 py-2 text-center border border-surface-200/60"><p className="text-sm font-bold text-surface-900">12</p><p className="text-[8px] text-surface-400">Bookings</p></div>
          <div className="bg-white rounded-lg px-2 py-2 text-center border border-surface-200/60"><p className="text-sm font-bold text-surface-900">3</p><p className="text-[8px] text-surface-400">Temples</p></div>
          <div className="bg-white rounded-lg px-2 py-2 text-center border border-surface-200/60"><p className="text-sm font-bold text-saffron-600">₹8.5K</p><p className="text-[8px] text-surface-400">Spent</p></div>
        </div>
      </div>
      <div className="px-5 mt-3">
        <div className="bg-white rounded-xl border border-surface-200/60 divide-y divide-surface-100">
          {[{i:BookOpen,l:'My Bookings',b:'3'},{i:CreditCard,l:'Subscription'},{i:Sparkles,l:'Ask Pandit AI'},{i:Settings,l:'Settings'}].map(({i:Icon,l,b}) => (
            <div key={l} className="flex items-center gap-3 px-3.5 py-3">
              <div className="w-7 h-7 bg-surface-100 rounded-lg flex items-center justify-center"><Icon className="w-3.5 h-3.5 text-surface-600" /></div>
              <span className="flex-1 text-xs font-medium text-surface-800">{l}</span>
              {b && <span className="text-[8px] font-semibold text-saffron-600 bg-saffron-50 px-1.5 py-0.5 rounded-full">{b}</span>}
              <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 mt-4">
        <button className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-red-600 bg-red-50 rounded-xl">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
      <p className="text-center text-[8px] text-surface-300 mt-4 pb-2">Bhaktisetu v1.0.0 — Made with devotion</p>
    </div>
  );
}

// ─── Device Frames ───────────────────────────────────────────────────────────

function IPhoneFrame({ children, activeTab, onTabChange }: { children: React.ReactNode; activeTab: string; onTabChange: (id: string) => void }) {
  return (
    <div className="relative w-[375px] h-[812px] bg-surface-50 rounded-[3rem] shadow-2xl shadow-black/25 border-[6px] border-surface-900 overflow-hidden flex flex-col">
      {/* iOS Status Bar */}
      <div className="flex items-center justify-between px-7 pt-2.5 pb-0.5 bg-surface-50 shrink-0">
        <span className="text-[11px] font-semibold text-surface-900" style={{ fontFamily: '-apple-system, SF Pro Text, sans-serif' }}>9:41</span>
        <div className="w-[76px] h-[26px] bg-surface-900 rounded-full" />
        <div className="flex items-center gap-1">
          <Signal className="w-3.5 h-3.5 text-surface-900" />
          <Wifi className="w-3.5 h-3.5 text-surface-900" />
          <Battery className="w-5 h-3 text-surface-900" />
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      {/* iOS Tab Bar */}
      <div className="shrink-0 bg-white/80 backdrop-blur-2xl border-t border-surface-200/40 px-4 pt-1.5 pb-5">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`flex flex-col items-center gap-0.5 ${isActive ? 'text-saffron-600' : 'text-surface-400'}`}>
                <Icon className={`w-[22px] h-[22px] ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                <span className="text-[9px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Home indicator */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[120px] h-[4px] bg-surface-900 rounded-full" />
    </div>
  );
}

function AndroidFrame({ children, activeTab, onTabChange }: { children: React.ReactNode; activeTab: string; onTabChange: (id: string) => void }) {
  return (
    <div className="relative w-[375px] h-[812px] bg-surface-50 rounded-[2rem] shadow-2xl shadow-black/25 border-[4px] border-surface-800 overflow-hidden flex flex-col">
      {/* Android Status Bar */}
      <div className="flex items-center justify-between px-5 pt-2 pb-0.5 bg-surface-50 shrink-0">
        <span className="text-[11px] font-medium text-surface-800">9:41</span>
        <div className="flex items-center gap-1.5">
          <Signal className="w-3 h-3 text-surface-700" />
          <Wifi className="w-3 h-3 text-surface-700" />
          <div className="w-4 h-2.5 border border-surface-700 rounded-[2px] relative">
            <div className="absolute inset-[1px] bg-surface-700 rounded-[1px]" style={{ width: '75%' }} />
          </div>
          <span className="text-[10px] text-surface-600">75%</span>
        </div>
      </div>
      {/* Punch-hole camera */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface-900 rounded-full z-10" />
      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      {/* Material 3 Bottom Nav */}
      <div className="shrink-0 bg-white border-t border-surface-200/60 px-2 pt-2 pb-2">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)} className="flex flex-col items-center gap-0.5 px-3 py-1 relative">
                {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-7 bg-saffron-100 rounded-full" />}
                <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-saffron-700 stroke-[2.5px]' : 'text-surface-500 stroke-[1.5px]'}`} />
                <span className={`text-[10px] relative z-10 ${isActive ? 'font-semibold text-saffron-700' : 'font-medium text-surface-500'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Android nav gesture bar */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[100px] h-[3px] bg-surface-400 rounded-full" />
    </div>
  );
}

// ─── Screen Renderer ─────────────────────────────────────────────────────────

function ScreenContent({ activeTab }: { activeTab: string }) {
  switch (activeTab) {
    case 'home': return <HomeScreen />;
    case 'content': return <ContentScreen />;
    case 'profile': return <ProfileScreen />;
    case 'temples':
      return (
        <div className="bg-surface-50 px-5 pt-3">
          <h1 className="text-lg font-bold text-surface-900 mb-2">Temples</h1>
          <div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" /><input type="text" placeholder="Search temples..." className="w-full pl-9 pr-3 py-2 bg-surface-100 rounded-xl text-xs placeholder:text-surface-400 border-0" /></div>
          <div className="flex gap-1.5 mb-3">{['All','Jyotirlinga','Live'].map((f,i) => <span key={f} className={`text-[9px] font-semibold px-2.5 py-1 rounded-full ${i===0?'bg-saffron-600 text-white':'bg-surface-100 text-surface-500'}`}>{f}</span>)}</div>
          <div className="space-y-2.5 pb-2">
            {liveStreams.map((s) => (
              <div key={s.name} className="bg-white rounded-xl overflow-hidden border border-surface-200/60">
                <div className="relative aspect-[2.2/1]"><img src={s.img} alt={s.name} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" /><div className="absolute top-2 left-2 bg-red-600 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><span className="w-1 h-1 bg-white rounded-full animate-pulse" />LIVE</div></div>
                <div className="p-2.5"><h3 className="text-xs font-semibold text-surface-900">{s.name}</h3><p className="text-[9px] text-surface-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{s.city} &middot; {s.deity}</p></div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'darshan':
      return (
        <div className="bg-surface-900 min-h-full px-5 pt-3">
          <div className="flex items-center gap-1.5 mb-1"><div className="bg-red-600/20 text-red-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />LIVE</div><span className="text-[9px] text-surface-500">3 streams</span></div>
          <h1 className="text-lg font-bold text-white mb-3">Live Darshan</h1>
          <div className="grid grid-cols-2 gap-2 pb-4">
            {liveStreams.map((s) => (
              <div key={s.name} className="rounded-xl overflow-hidden bg-surface-800 border border-surface-700/50">
                <div className="relative aspect-square"><img src={s.img} alt={s.name} className="w-full h-full object-cover opacity-70" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"><Play className="w-3 h-3 text-white ml-px" /></div></div><div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[6px] font-bold px-1 py-px rounded-full">LIVE</div><div className="absolute bottom-1.5 left-1.5 right-1.5"><p className="text-white text-[9px] font-semibold truncate">{s.name}</p><p className="text-white/50 text-[7px]">{s.event}</p></div></div>
              </div>
            ))}
          </div>
        </div>
      );
    default: return <HomeScreen />;
  }
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function DemoShowcase() {
  const [iosTab, setIosTab] = useState('home');
  const [androidTab, setAndroidTab] = useState('home');

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-900 via-surface-800 to-surface-900">
      {/* Header */}
      <div className="text-center pt-12 pb-8 px-6">
        <div className="inline-flex items-center gap-2 bg-saffron-600/10 border border-saffron-600/20 rounded-full px-4 py-1.5 mb-4">
          <span className="w-2 h-2 bg-saffron-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-saffron-400">Mobile App Preview</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Bhakti<span className="text-saffron-400">setu</span> Mobile
        </h1>
        <p className="text-surface-400 mt-2 max-w-md mx-auto text-sm">
          Available on iOS and Android. One app for darshan, pujas, content, and spiritual guidance.
        </p>
      </div>

      {/* Device labels */}
      <div className="flex items-center justify-center gap-20 mb-4 px-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.99 2.97 12.5 4.7 9.56C5.55 8.1 7.13 7.2 8.82 7.17C10.1 7.15 11.32 8.04 12.11 8.04C12.89 8.04 14.37 6.96 15.92 7.14C16.57 7.17 18.39 7.4 19.56 9.12C19.47 9.17 17.29 10.45 17.31 13.11C17.34 16.28 20.05 17.29 20.09 17.3C20.06 17.38 19.67 18.76 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>
          </div>
          <span className="text-sm font-semibold text-white">iPhone 15 Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#3DDC84] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white"><path d="M17.6,9.48l1.84-3.18c0.16-0.31,0.04-0.69-0.26-0.85c-0.29-0.15-0.65-0.06-0.83,0.22l-1.88,3.24 c-2.86-1.21-6.08-1.21-8.94,0L5.65,5.67c-0.19-0.29-0.58-0.38-0.87-0.2C4.5,5.65,4.41,6.01,4.56,6.3L6.4,9.48 C3.3,11.25,1.28,14.44,1,18h22C22.72,14.44,20.7,11.25,17.6,9.48z M7,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25S8.25,13.31,8.25,14C8.25,14.69,7.69,15.25,7,15.25z M17,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25s1.25,0.56,1.25,1.25C18.25,14.69,17.69,15.25,17,15.25z"/></svg>
          </div>
          <span className="text-sm font-semibold text-white">Pixel 8 Pro</span>
        </div>
      </div>

      {/* Devices side by side */}
      <div className="flex items-start justify-center gap-10 px-6 pb-16 overflow-x-auto">
        <IPhoneFrame activeTab={iosTab} onTabChange={setIosTab}>
          <ScreenContent activeTab={iosTab} />
        </IPhoneFrame>

        <AndroidFrame activeTab={androidTab} onTabChange={setAndroidTab}>
          <ScreenContent activeTab={androidTab} />
        </AndroidFrame>
      </div>

      {/* Features */}
      <div className="max-w-2xl mx-auto px-6 pb-16 text-center">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Live Darshan', desc: 'HD streams from 200+ temples' },
            { label: 'AI Pandit', desc: 'Spiritual guidance powered by AI' },
            { label: 'Puja Booking', desc: 'Verified priests, video proof' },
          ].map((f) => (
            <div key={f.label} className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <h3 className="text-sm font-semibold text-white">{f.label}</h3>
              <p className="text-[11px] text-surface-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
