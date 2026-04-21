'use client';

import { useState } from 'react';
import { getContentImage, getDeityImage } from '../../../lib/images';
import { Play, Pause, Clock, Heart, SkipForward, SkipBack } from 'lucide-react';

const tabs = ['Aarti', 'Chalisa', 'Mantra', 'Bhajan'];

const contentItems = [
  { title: 'Om Jai Jagdish Hare', deity: 'Lord Vishnu', type: 'Aarti', duration: '6:18', plays: '8.3M', img: getContentImage('aarti', 'thumbnail') },
  { title: 'Ganesh Aarti', deity: 'Lord Ganesha', type: 'Aarti', duration: '4:32', plays: '5.1M', img: getDeityImage('lord-ganesha', 'square') },
  { title: 'Hanuman Chalisa', deity: 'Lord Hanuman', type: 'Chalisa', duration: '9:42', plays: '12.5M', img: getContentImage('chalisa', 'thumbnail') },
  { title: 'Gayatri Mantra (108x)', deity: 'Goddess Gayatri', type: 'Mantra', duration: '45:00', plays: '6.1M', img: getContentImage('mantra', 'thumbnail') },
  { title: 'Shiv Tandav Stotram', deity: 'Lord Shiva', type: 'Bhajan', duration: '11:30', plays: '5.8M', img: getContentImage('stotram', 'thumbnail') },
  { title: 'Mahamrityunjay Mantra', deity: 'Lord Shiva', type: 'Mantra', duration: '8:15', plays: '4.2M', img: getDeityImage('lord-shiva', 'square') },
];

export default function MobileContent() {
  const [activeTab, setActiveTab] = useState('Aarti');
  const [playing, setPlaying] = useState<string | null>(null);

  const filtered = activeTab === 'Aarti' ? contentItems : contentItems.filter(c => c.type === activeTab);

  return (
    <div className="bg-surface-50 min-h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-surface-900 tracking-tight">Content</h1>
        <p className="text-xs text-surface-400 mt-0.5">Aartis, mantras, chalisas & more</p>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
              activeTab === tab
                ? 'bg-saffron-600 text-white'
                : 'bg-surface-100 text-surface-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content list */}
      <div className="flex-1 px-5 space-y-2 pb-24">
        {(activeTab === 'Aarti' ? contentItems : filtered).map((item) => (
          <div
            key={item.title}
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
              playing === item.title
                ? 'bg-saffron-50 border-saffron-200'
                : 'bg-white border-surface-200/60'
            }`}
          >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
              <img src={item.img} alt={item.deity} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              <button
                onClick={() => setPlaying(playing === item.title ? null : item.title)}
                className="absolute inset-0 flex items-center justify-center bg-black/30"
              >
                {playing === item.title ? (
                  <Pause className="w-4 h-4 text-white fill-white" />
                ) : (
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                )}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-surface-900 truncate">{item.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-medium text-saffron-600 bg-saffron-50 px-1.5 py-0.5 rounded">{item.type}</span>
                <span className="text-[10px] text-surface-400">{item.deity}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-surface-400 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {item.duration}
              </p>
              <button className="mt-1">
                <Heart className="w-3.5 h-3.5 text-surface-300" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Mini Player */}
      {playing && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-[370px] bg-surface-900 rounded-2xl p-3 shadow-xl flex items-center gap-3 z-30">
          <div className="w-10 h-10 rounded-lg bg-saffron-600 flex items-center justify-center shrink-0">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{playing}</p>
            <div className="w-full h-1 bg-surface-700 rounded-full mt-1.5">
              <div className="w-1/3 h-full bg-saffron-500 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button className="p-1.5"><SkipBack className="w-3.5 h-3.5 text-surface-400" /></button>
            <button onClick={() => setPlaying(null)} className="p-1.5"><Pause className="w-4 h-4 text-white" /></button>
            <button className="p-1.5"><SkipForward className="w-3.5 h-3.5 text-surface-400" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
