'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sun,
  Moon,
  Star,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Shield,
  Flame,
} from 'lucide-react';
import { calculateKundli, type KundliData } from '../../../lib/vedic-astrology';

// ─── Page Component ───────────────────────────────────────────────────────────

export default function KundliPage() {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    place: '',
  });
  const [kundli, setKundli] = useState<KundliData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'planets' | 'dasha' | 'dosha'>('chart');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.time || !formData.place) return;

    setIsLoading(true);
    // Small delay for UX
    setTimeout(() => {
      const result = calculateKundli(formData.name, formData.date, formData.time, formData.place);
      setKundli(result);
      setIsLoading(false);
    }, 800);
  }

  function handleReset() {
    setKundli(null);
    setFormData({ name: '', date: '', time: '', place: '' });
    setActiveTab('chart');
  }

  return (
    <div className="min-h-screen">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#ede9e3]">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pt-6 pb-8">
          <Link
            href="/astrology"
            className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Astrology
          </Link>

          <div className="text-center pb-4">
            <div className="inline-flex items-center gap-2 bg-saffron-100 border border-saffron-200 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-saffron-600" />
              <span className="text-xs font-bold text-saffron-700 uppercase tracking-wider">Free Tool</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-surface-800 mb-3">
              Free Kundli Generator
            </h1>
            <p className="text-surface-500 max-w-xl mx-auto">
              Generate your Janam Kundli with Vedic sidereal calculations (Lahiri ayanamsa).
              Get planetary positions, dasha periods, and dosha analysis instantly.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
        {!kundli ? (
          /* ── Form ────────────────────────────────────────────────────────── */
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-surface-200/80 shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-saffron-600/15 rounded-xl flex items-center justify-center">
                  <Sun className="w-5 h-5 text-saffron-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-surface-800">Birth Details</h2>
                  <p className="text-xs text-surface-500">Enter your birth information for accurate results</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                    <User className="w-4 h-4 inline mr-1.5 text-saffron-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                    <Calendar className="w-4 h-4 inline mr-1.5 text-saffron-400" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                    <Clock className="w-4 h-4 inline mr-1.5 text-saffron-400" />
                    Time of Birth
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                    <MapPin className="w-4 h-4 inline mr-1.5 text-saffron-400" />
                    Place of Birth
                  </label>
                  <input
                    type="text"
                    value={formData.place}
                    onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                    placeholder="e.g., New Delhi, Mumbai, Varanasi"
                    className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Calculating Kundli...
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4" />
                      Generate Kundli
                    </>
                  )}
                </button>
              </form>

              <p className="text-[10px] text-surface-400 mt-4 text-center">
                Uses Vedic sidereal zodiac with Lahiri ayanamsa. Planetary positions are approximate (+/- 1-2 degrees).
              </p>
            </div>
          </div>
        ) : (
          /* ── Results ─────────────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* User info bar */}
            <div className="bg-white rounded-xl border border-surface-200/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-surface-800 mb-1">
                  Janam Kundli &mdash; {kundli.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-surface-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {kundli.birthDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {kundli.birthTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {kundli.birthPlace}
                  </span>
                </div>
                <p className="text-xs text-surface-400 mt-1">Ayanamsa: {kundli.ayanamsa}° (Lahiri)</p>
              </div>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-sm text-saffron-600 font-semibold hover:text-saffron-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Generate Another
              </button>
            </div>

            {/* Key Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-5 text-center">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Moon Sign (Rashi)</p>
                <p className="text-2xl mb-0.5">{kundli.rashiSymbol}</p>
                <p className="text-base font-bold text-surface-800">{kundli.rashi}</p>
                <p className="text-xs text-surface-500">{kundli.rashiHindi}</p>
              </div>
              <div className="bg-saffron-50 border border-saffron-200/50 rounded-xl p-5 text-center">
                <p className="text-xs text-saffron-600 font-semibold uppercase tracking-wider mb-1">Nakshatra</p>
                <p className="text-2xl mb-0.5"><Star className="w-6 h-6 text-saffron-500 mx-auto" /></p>
                <p className="text-base font-bold text-surface-800">{kundli.nakshatra}</p>
                <p className="text-xs text-surface-500">{kundli.nakshatraHindi} (Pada {kundli.nakshatraPada})</p>
              </div>
              <div className="bg-orange-50 border border-orange-200/50 rounded-xl p-5 text-center">
                <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider mb-1">Ascendant (Lagna)</p>
                <p className="text-2xl mb-0.5">{kundli.ascendantSymbol}</p>
                <p className="text-base font-bold text-surface-800">{kundli.ascendant}</p>
                <p className="text-xs text-surface-500">{kundli.ascendantHindi}</p>
              </div>
              <div className="bg-amber-50/60 border border-amber-200/40 rounded-xl p-5 text-center">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Sun Sign</p>
                <p className="text-2xl mb-0.5"><Sun className="w-6 h-6 text-amber-500 mx-auto" /></p>
                <p className="text-base font-bold text-surface-800">{kundli.sunSign}</p>
                <p className="text-xs text-surface-500">{kundli.sunSignHindi}</p>
              </div>
            </div>

            {/* Current Dasha Banner */}
            {(() => {
              const currentDasha = kundli.dashas.find(d => d.isCurrent);
              if (!currentDasha) return null;
              return (
                <div className="bg-saffron-600 rounded-xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <h3 className="font-bold text-lg">Current Mahadasha</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-white/60">Planet</p>
                      <p className="text-lg font-bold">{currentDasha.planet} ({currentDasha.planetHindi})</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Period</p>
                      <p className="text-lg font-bold">{currentDasha.startDate} to {currentDasha.endDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Duration</p>
                      <p className="text-lg font-bold">{currentDasha.years} years</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-surface-100 p-1 rounded-xl">
              {[
                { key: 'chart' as const, label: 'Birth Chart', icon: Sun },
                { key: 'planets' as const, label: 'Planets', icon: Moon },
                { key: 'dasha' as const, label: 'Dasha', icon: Clock },
                { key: 'dosha' as const, label: 'Doshas', icon: Shield },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? 'bg-white text-saffron-700 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {activeTab === 'chart' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Birth Chart (North Indian Style) */}
                <div className="bg-white rounded-xl border border-surface-200/80 p-6">
                  <h3 className="text-lg font-bold text-surface-800 mb-5">Lagna Kundli (Birth Chart)</h3>
                  <div className="grid grid-cols-4 gap-px bg-saffron-200 border border-saffron-200 rounded-xl overflow-hidden">
                    {/* Row 1: houses 12, 1, 2, 3 */}
                    {[12, 1, 2, 3].map(houseNum => {
                      const house = kundli.houses.find(h => h.house === houseNum)!;
                      return (
                        <div key={houseNum} className="bg-white p-2 min-h-[70px]">
                          <p className="text-[9px] font-bold text-saffron-400 mb-0.5">{houseNum}</p>
                          <p className="text-[9px] text-surface-400">{house.signHindi}</p>
                          {house.planets.length > 0 && (
                            <p className={`text-[10px] font-semibold mt-0.5 ${houseNum === 1 ? 'text-red-600' : 'text-saffron-600'}`}>
                              {house.planets.join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {/* Row 2: house 11, center, -, house 4 */}
                    <div className="bg-white p-2 min-h-[70px]">
                      <p className="text-[9px] font-bold text-saffron-400 mb-0.5">11</p>
                      <p className="text-[9px] text-surface-400">{kundli.houses[10]!.signHindi}</p>
                      {kundli.houses[10]!.planets.length > 0 && (
                        <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{kundli.houses[10]!.planets.join(', ')}</p>
                      )}
                    </div>
                    <div className="bg-saffron-50 p-2 col-span-2 row-span-2 flex items-center justify-center min-h-[140px]">
                      <div className="text-center">
                        <p className="text-lg font-bold text-saffron-700">Lagna</p>
                        <p className="text-sm text-saffron-500">{kundli.ascendant}</p>
                        <p className="text-xs text-saffron-400 mt-1">{kundli.ascendantHindi} {kundli.ascendantSymbol}</p>
                      </div>
                    </div>
                    <div className="bg-white p-2 min-h-[70px]">
                      <p className="text-[9px] font-bold text-saffron-400 mb-0.5">4</p>
                      <p className="text-[9px] text-surface-400">{kundli.houses[3]!.signHindi}</p>
                      {kundli.houses[3]!.planets.length > 0 && (
                        <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{kundli.houses[3]!.planets.join(', ')}</p>
                      )}
                    </div>
                    {/* Row 3: house 10, -, -, house 5 */}
                    <div className="bg-white p-2 min-h-[70px]">
                      <p className="text-[9px] font-bold text-saffron-400 mb-0.5">10</p>
                      <p className="text-[9px] text-surface-400">{kundli.houses[9]!.signHindi}</p>
                      {kundli.houses[9]!.planets.length > 0 && (
                        <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{kundli.houses[9]!.planets.join(', ')}</p>
                      )}
                    </div>
                    <div className="bg-white p-2 min-h-[70px]">
                      <p className="text-[9px] font-bold text-saffron-400 mb-0.5">5</p>
                      <p className="text-[9px] text-surface-400">{kundli.houses[4]!.signHindi}</p>
                      {kundli.houses[4]!.planets.length > 0 && (
                        <p className="text-[10px] font-semibold text-amber-600 mt-0.5">{kundli.houses[4]!.planets.join(', ')}</p>
                      )}
                    </div>
                    {/* Row 4: houses 9, 8, 7, 6 */}
                    {[9, 8, 7, 6].map(houseNum => {
                      const house = kundli.houses.find(h => h.house === houseNum)!;
                      return (
                        <div key={houseNum} className="bg-white p-2 min-h-[70px]">
                          <p className="text-[9px] font-bold text-saffron-400 mb-0.5">{houseNum}</p>
                          <p className="text-[9px] text-surface-400">{house.signHindi}</p>
                          {house.planets.length > 0 && (
                            <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{house.planets.join(', ')}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* House Summary */}
                <div className="bg-white rounded-xl border border-surface-200/80 p-6">
                  <h3 className="text-lg font-bold text-surface-800 mb-5">House Summary</h3>
                  <div className="space-y-2">
                    {kundli.houses.map(house => (
                      <div
                        key={house.house}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-saffron-50/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-saffron-100 text-saffron-700 text-xs font-bold rounded-lg">
                            {house.house}
                          </span>
                          <div>
                            <span className="text-sm font-medium text-surface-700">{house.sign}</span>
                            <span className="text-xs text-surface-400 ml-1.5">{house.signHindi} {house.signSymbol}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          {house.planets.length > 0 ? (
                            <span className="text-xs font-semibold text-saffron-600">
                              {house.planets.join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-surface-300">Empty</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'planets' && (
              <div className="bg-white rounded-xl border border-surface-200/80 p-6">
                <h3 className="text-lg font-bold text-surface-800 mb-5">Planetary Positions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-100">
                        <th className="text-left py-2 px-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">Planet</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">Sign</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">House</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">Degree</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">Nakshatra</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kundli.planetaryPositions.map((p) => (
                        <tr key={p.planet} className="border-b border-surface-50 hover:bg-saffron-50/30 transition-colors">
                          <td className="py-2.5 px-2">
                            <div>
                              <span className="font-medium text-surface-700">{p.planet}</span>
                              {p.isRetrograde && (
                                <span className="ml-1 text-[10px] font-bold text-red-500">(R)</span>
                              )}
                            </div>
                            <span className="text-[10px] text-surface-400">{p.planetHindi}</span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="text-surface-600">{p.signSymbol} {p.sign}</span>
                            <span className="block text-[10px] text-surface-400">{p.signHindi}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-saffron-100 text-saffron-700 text-xs font-bold rounded-md">
                              {p.house}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-surface-600 font-mono text-xs">{p.degree}</td>
                          <td className="py-2.5 px-2">
                            <span className="text-xs text-surface-600">{p.nakshatra}</span>
                            <span className="block text-[10px] text-surface-400">{p.nakshatraHindi} (P{p.nakshatraPada})</span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                              p.status === 'Exalted'
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === 'Debilitated'
                                ? 'bg-red-50 text-red-700'
                                : p.status === 'Own Sign'
                                ? 'bg-blue-50 text-blue-700'
                                : p.status === 'Friendly'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-surface-50 text-surface-600'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'dasha' && (
              <div className="bg-white rounded-xl border border-surface-200/80 p-6">
                <h3 className="text-lg font-bold text-surface-800 mb-2">Vimshottari Dasha Periods</h3>
                <p className="text-xs text-surface-400 mb-5">Based on Moon&apos;s position in {kundli.nakshatra} nakshatra</p>
                <div className="space-y-3">
                  {kundli.dashas.map((d, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                        d.isCurrent
                          ? 'bg-saffron-50 border-2 border-saffron-300 shadow-sm'
                          : 'bg-surface-50 border border-surface-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        d.isCurrent ? 'bg-saffron-600 text-white' : 'bg-white text-surface-500 border border-surface-200'
                      }`}>
                        <Star className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-surface-800">{d.planet} Mahadasha</span>
                          <span className="text-xs text-surface-400">({d.planetHindi})</span>
                          {d.isCurrent && (
                            <span className="text-[10px] font-bold text-saffron-700 bg-saffron-200 px-2 py-0.5 rounded-full">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5">
                          {d.startDate} to {d.endDate} ({d.years} years)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'dosha' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-surface-200/80 p-6">
                  <h3 className="text-lg font-bold text-surface-800 mb-2">Dosha Analysis</h3>
                  <p className="text-xs text-surface-400 mb-5">Based on planetary positions in your birth chart</p>
                  <div className="space-y-4">
                    {kundli.doshas.map((d, idx) => (
                      <div
                        key={idx}
                        className={`p-5 rounded-xl border ${
                          d.present
                            ? d.severity === 'Strong'
                              ? 'bg-red-50 border-red-200'
                              : d.severity === 'Moderate'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-yellow-50 border-yellow-200'
                            : 'bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            d.present ? 'bg-amber-100' : 'bg-emerald-100'
                          }`}>
                            {d.present ? (
                              <AlertTriangle className={`w-4 h-4 ${
                                d.severity === 'Strong' ? 'text-red-600' : 'text-amber-600'
                              }`} />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-bold text-surface-800">{d.name}</h4>
                              <span className="text-xs text-surface-500">({d.nameHindi})</span>
                              {d.present && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  d.severity === 'Strong'
                                    ? 'bg-red-200 text-red-700'
                                    : d.severity === 'Moderate'
                                    ? 'bg-amber-200 text-amber-700'
                                    : 'bg-yellow-200 text-yellow-700'
                                }`}>
                                  {d.severity}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-surface-600 leading-relaxed">{d.description}</p>
                            {d.present && d.remedy && (
                              <div className="mt-2 p-2.5 bg-white/60 rounded-lg">
                                <p className="text-xs text-surface-500">
                                  <Flame className="w-3 h-3 inline mr-1 text-saffron-500" />
                                  <span className="font-semibold">Remedy:</span> {d.remedy}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Consult CTA */}
            <div className="bg-surface-800 rounded-xl p-8 text-center">
              <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">
                Want a Detailed Analysis?
              </h3>
              <p className="text-surface-400 max-w-md mx-auto mb-5">
                Connect with a verified astrologer for personalized interpretation, remedies, and life predictions.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/astrology"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-bold rounded-lg hover:bg-saffron-700 transition-all shadow-md"
                >
                  Consult an Astrologer <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/astrology/chat"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all"
                >
                  Ask AI Astrologer
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
