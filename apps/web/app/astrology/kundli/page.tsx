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
} from 'lucide-react';

// ─── Hardcoded Kundli Result ──────────────────────────────────────────────────

const sampleKundli = {
  rashi: 'Simha (Leo)',
  rashiSymbol: '\u264C',
  rashiHindi: '\u0938\u093F\u0902\u0939',
  nakshatra: 'Magha',
  nakshatraHindi: '\u092E\u0918\u093E',
  nakshatraPada: 2,
  ascendant: 'Mesha (Aries)',
  ascendantHindi: '\u092E\u0947\u0937',
  moonSign: 'Simha (Leo)',
  sunSign: 'Leo',
  currentDasha: 'Shukra Mahadasha',
  dashaPeriod: '2023 - 2043',
  dashaBalance: '17 years remaining',
  planetaryPositions: [
    { planet: 'Sun (Surya)', sign: 'Leo', house: 5, degree: '15\u00B0 23\'', status: 'Own Sign' },
    { planet: 'Moon (Chandra)', sign: 'Leo', house: 5, degree: '22\u00B0 10\'', status: 'Friendly' },
    { planet: 'Mars (Mangal)', sign: 'Aries', house: 1, degree: '8\u00B0 45\'', status: 'Own Sign' },
    { planet: 'Mercury (Budh)', sign: 'Virgo', house: 6, degree: '3\u00B0 18\'', status: 'Exalted' },
    { planet: 'Jupiter (Guru)', sign: 'Sagittarius', house: 9, degree: '19\u00B0 56\'', status: 'Own Sign' },
    { planet: 'Venus (Shukra)', sign: 'Libra', house: 7, degree: '11\u00B0 32\'', status: 'Own Sign' },
    { planet: 'Saturn (Shani)', sign: 'Capricorn', house: 10, degree: '27\u00B0 05\'', status: 'Own Sign' },
    { planet: 'Rahu', sign: 'Gemini', house: 3, degree: '14\u00B0 41\'', status: 'Neutral' },
    { planet: 'Ketu', sign: 'Sagittarius', house: 9, degree: '14\u00B0 41\'', status: 'Neutral' },
  ],
  houses: [
    { house: 1, sign: 'Aries', signHindi: '\u092E\u0947\u0937', planets: ['Mars'] },
    { house: 2, sign: 'Taurus', signHindi: '\u0935\u0943\u0937\u092D', planets: [] },
    { house: 3, sign: 'Gemini', signHindi: '\u092E\u093F\u0925\u0941\u0928', planets: ['Rahu'] },
    { house: 4, sign: 'Cancer', signHindi: '\u0915\u0930\u094D\u0915', planets: [] },
    { house: 5, sign: 'Leo', signHindi: '\u0938\u093F\u0902\u0939', planets: ['Sun', 'Moon'] },
    { house: 6, sign: 'Virgo', signHindi: '\u0915\u0928\u094D\u092F\u093E', planets: ['Mercury'] },
    { house: 7, sign: 'Libra', signHindi: '\u0924\u0941\u0932\u093E', planets: ['Venus'] },
    { house: 8, sign: 'Scorpio', signHindi: '\u0935\u0943\u0936\u094D\u091A\u093F\u0915', planets: [] },
    { house: 9, sign: 'Sagittarius', signHindi: '\u0927\u0928\u0941', planets: ['Jupiter', 'Ketu'] },
    { house: 10, sign: 'Capricorn', signHindi: '\u092E\u0915\u0930', planets: ['Saturn'] },
    { house: 11, sign: 'Aquarius', signHindi: '\u0915\u0941\u092E\u094D\u092D', planets: [] },
    { house: 12, sign: 'Pisces', signHindi: '\u092E\u0940\u0928', planets: [] },
  ],
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function KundliPage() {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    place: '',
  });
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.time || !formData.place) return;

    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setShowResult(true);
      setIsLoading(false);
    }, 1500);
  }

  function handleReset() {
    setShowResult(false);
    setFormData({ name: '', date: '', time: '', place: '' });
  }

  return (
    <div className="min-h-screen">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-surface-900 via-surface-800 to-surface-800 pb-8">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pt-6">
          <Link
            href="/astrology"
            className="inline-flex items-center gap-1.5 text-sm text-saffron-300/70 hover:text-white transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Astrology
          </Link>

          <div className="text-center pb-4">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Free Tool</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Free Kundli Generator
            </h1>
            <p className="text-saffron-200/70 max-w-xl mx-auto">
              Generate your birth chart (Janam Kundli) instantly. Get insights into your planetary positions,
              rashi, nakshatra, and current dasha period.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
        {!showResult ? (
          /* ── Form ────────────────────────────────────────────────────────── */
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-surface-200/80 shadow-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Sun className="w-5 h-5 text-white" />
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
                    placeholder="e.g., New Delhi, India"
                    className="w-full px-4 py-3 border border-surface-200 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500 outline-none transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-saffron-600 to-saffron-600 text-white font-medium text-sm rounded-lg hover:from-saffron-700 hover:to-saffron-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating Kundli...
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4" />
                      Generate Kundli
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ── Results ─────────────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* User info bar */}
            <div className="bg-white rounded-xl border border-surface-200/80 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-surface-800 mb-1">
                  Janam Kundli for {formData.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-surface-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {formData.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {formData.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {formData.place}
                  </span>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-saffron-600 font-semibold hover:text-saffron-700 transition-colors"
              >
                Generate Another
              </button>
            </div>

            {/* Key Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl p-5 text-center">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Rashi</p>
                <p className="text-2xl mb-0.5">{sampleKundli.rashiSymbol}</p>
                <p className="text-base font-bold text-surface-800">{sampleKundli.rashi}</p>
                <p className="text-xs text-surface-500">{sampleKundli.rashiHindi}</p>
              </div>
              <div className="bg-gradient-to-br from-saffron-50 to-saffron-50 border border-saffron-200/50 rounded-xl p-5 text-center">
                <p className="text-xs text-saffron-600 font-semibold uppercase tracking-wider mb-1">Nakshatra</p>
                <p className="text-2xl mb-0.5"><Star className="w-6 h-6 text-saffron-500 mx-auto" /></p>
                <p className="text-base font-bold text-surface-800">{sampleKundli.nakshatra}</p>
                <p className="text-xs text-surface-500">{sampleKundli.nakshatraHindi} (Pada {sampleKundli.nakshatraPada})</p>
              </div>
              <div className="bg-gradient-to-br from-saffron-50 to-blue-50 border border-saffron-200/50 rounded-xl p-5 text-center">
                <p className="text-xs text-saffron-600 font-semibold uppercase tracking-wider mb-1">Ascendant (Lagna)</p>
                <p className="text-2xl mb-0.5"><Sun className="w-6 h-6 text-saffron-500 mx-auto" /></p>
                <p className="text-base font-bold text-surface-800">{sampleKundli.ascendant}</p>
                <p className="text-xs text-surface-500">{sampleKundli.ascendantHindi}</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/50 rounded-xl p-5 text-center">
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-1">Moon Sign</p>
                <p className="text-2xl mb-0.5"><Moon className="w-6 h-6 text-teal-500 mx-auto" /></p>
                <p className="text-base font-bold text-surface-800">{sampleKundli.moonSign}</p>
                <p className="text-xs text-surface-500">{sampleKundli.rashiHindi}</p>
              </div>
            </div>

            {/* Current Dasha */}
            <div className="bg-gradient-to-r from-saffron-600 to-saffron-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-lg">Current Dasha Period</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="text-xs text-saffron-200/70">Mahadasha</p>
                  <p className="text-lg font-bold">{sampleKundli.currentDasha}</p>
                </div>
                <div>
                  <p className="text-xs text-saffron-200/70">Period</p>
                  <p className="text-lg font-bold">{sampleKundli.dashaPeriod}</p>
                </div>
                <div>
                  <p className="text-xs text-saffron-200/70">Balance</p>
                  <p className="text-lg font-bold">{sampleKundli.dashaBalance}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Birth Chart (12-house grid) */}
              <div className="bg-white rounded-xl border border-surface-200/80 p-6">
                <h3 className="text-lg font-bold text-surface-800 mb-5">Birth Chart (Lagna Kundli)</h3>
                {/* Diamond-style Vedic chart represented as a 4x4 grid */}
                <div className="grid grid-cols-4 gap-px bg-saffron-200 border border-saffron-200 rounded-xl overflow-hidden">
                  {/* Row 1 */}
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">12</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[11]!.signHindi}</p>
                    {sampleKundli.houses[11]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[11]!.planets.join(', ')}</p>
                    )}
                  </div>
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">1</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[0]!.signHindi}</p>
                    {sampleKundli.houses[0]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-red-600 mt-0.5">{sampleKundli.houses[0]!.planets.join(', ')}</p>
                    )}
                  </div>
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">2</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[1]!.signHindi}</p>
                    {sampleKundli.houses[1]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[1]!.planets.join(', ')}</p>
                    )}
                  </div>
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">3</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[2]!.signHindi}</p>
                    {sampleKundli.houses[2]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[2]!.planets.join(', ')}</p>
                    )}
                  </div>

                  {/* Row 2 */}
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">11</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[10]!.signHindi}</p>
                    {sampleKundli.houses[10]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[10]!.planets.join(', ')}</p>
                    )}
                  </div>
                  <div className="bg-saffron-50 p-2 col-span-2 row-span-2 flex items-center justify-center min-h-[140px]">
                    <div className="text-center">
                      <p className="text-lg font-bold text-saffron-700">Lagna</p>
                      <p className="text-sm text-saffron-500">{sampleKundli.ascendant}</p>
                      <p className="text-xs text-saffron-400 mt-1">{sampleKundli.ascendantHindi}</p>
                    </div>
                  </div>
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">4</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[3]!.signHindi}</p>
                    {sampleKundli.houses[3]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[3]!.planets.join(', ')}</p>
                    )}
                  </div>

                  {/* Row 3 */}
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">10</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[9]!.signHindi}</p>
                    {sampleKundli.houses[9]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[9]!.planets.join(', ')}</p>
                    )}
                  </div>
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">5</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[4]!.signHindi}</p>
                    {sampleKundli.houses[4]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-amber-600 mt-0.5">{sampleKundli.houses[4]!.planets.join(', ')}</p>
                    )}
                  </div>

                  {/* Row 4 */}
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">9</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[8]!.signHindi}</p>
                    {sampleKundli.houses[8]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[8]!.planets.join(', ')}</p>
                    )}
                  </div>
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">8</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[7]!.signHindi}</p>
                    {sampleKundli.houses[7]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[7]!.planets.join(', ')}</p>
                    )}
                  </div>
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">7</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[6]!.signHindi}</p>
                    {sampleKundli.houses[6]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[6]!.planets.join(', ')}</p>
                    )}
                  </div>
                  <div className="bg-white p-2 min-h-[70px]">
                    <p className="text-[9px] font-bold text-saffron-400 mb-0.5">6</p>
                    <p className="text-[9px] text-surface-400">{sampleKundli.houses[5]!.signHindi}</p>
                    {sampleKundli.houses[5]!.planets.length > 0 && (
                      <p className="text-[10px] font-semibold text-saffron-600 mt-0.5">{sampleKundli.houses[5]!.planets.join(', ')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Planetary Positions Table */}
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
                        <th className="text-left py-2 px-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleKundli.planetaryPositions.map((p) => (
                        <tr key={p.planet} className="border-b border-surface-50 hover:bg-saffron-50/30 transition-colors">
                          <td className="py-2.5 px-2 font-medium text-surface-700">{p.planet}</td>
                          <td className="py-2.5 px-2 text-surface-600">{p.sign}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-saffron-100 text-saffron-700 text-xs font-bold rounded-md">
                              {p.house}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-surface-600">{p.degree}</td>
                          <td className="py-2.5 px-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                              p.status === 'Exalted'
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === 'Own Sign'
                                ? 'bg-blue-50 text-blue-700'
                                : p.status === 'Friendly'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-gray-50 text-gray-600'
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
            </div>

            {/* Consult CTA */}
            <div className="bg-gradient-to-br from-surface-900 via-surface-800 to-surface-800 rounded-xl p-8 text-center">
              <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white mb-2">
                Want a Detailed Analysis?
              </h3>
              <p className="text-saffron-200/70 max-w-md mx-auto mb-5">
                Connect with a verified astrologer for personalized interpretation of your
                kundli, remedies, and life predictions.
              </p>
              <Link
                href="/astrology"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all shadow-md"
              >
                Consult an Astrologer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
