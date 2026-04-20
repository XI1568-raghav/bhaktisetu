'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  Briefcase,
  Heart,
  Activity,
  Calendar,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyHoroscope {
  rashi: string;
  rashiHindi: string;
  rashiEnglish: string;
  symbol: string;
  prediction: string;
  career: string;
  love: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
  overallRating: number;
}

// ─── Hardcoded Horoscope Data ─────────────────────────────────────────────────

const horoscopes: DailyHoroscope[] = [
  {
    rashi: 'aries',
    rashiHindi: '\u092E\u0947\u0937',
    rashiEnglish: 'Aries',
    symbol: '\u2648',
    prediction: 'A day of new beginnings and fresh energy. You will feel motivated to start new projects. Financial gains are indicated in the second half of the day. Trust your instincts when making important decisions.',
    career: 'Excellent day for career advancement. A promotion or new opportunity may come your way. Stay focused on your goals and avoid unnecessary conflicts with colleagues.',
    love: 'Singles may meet someone special today. Couples should plan a romantic evening. Communication is key to resolving any ongoing misunderstandings.',
    health: 'Good energy levels throughout the day. Avoid spicy food in the evening. A short walk or yoga session will boost your overall wellbeing.',
    luckyNumber: 9,
    luckyColor: 'Red',
    overallRating: 4,
  },
  {
    rashi: 'taurus',
    rashiHindi: '\u0935\u0943\u0937\u092D',
    rashiEnglish: 'Taurus',
    symbol: '\u2649',
    prediction: 'Financial matters take center stage today. A pending payment or investment will yield good results. Family relationships bring joy and comfort. Avoid lending money to acquaintances.',
    career: 'Steady progress at work. Focus on completing pending tasks rather than starting new ones. A business meeting may bring positive outcomes.',
    love: 'Stability in relationships. Show appreciation to your partner. Singles should focus on self-improvement before seeking a new relationship.',
    health: 'Watch your diet today. Digestive issues may arise if you overeat. Drink plenty of water and get adequate rest.',
    luckyNumber: 6,
    luckyColor: 'Green',
    overallRating: 3,
  },
  {
    rashi: 'gemini',
    rashiHindi: '\u092E\u093F\u0925\u0941\u0928',
    rashiEnglish: 'Gemini',
    symbol: '\u264A',
    prediction: 'Communication skills are at their peak today. Express yourself freely in meetings and conversations. Travel plans may finalize. Be careful with written agreements and contracts.',
    career: 'A great day for presentations and networking. Your ideas will be well-received. Collaborative projects will thrive today.',
    love: 'Express your feelings openly. A heartfelt conversation can deepen your bond. Singles might find connection through social events.',
    health: 'Mental energy is high but physical energy may dip. Take breaks between tasks. Avoid screen time before bed for better sleep.',
    luckyNumber: 5,
    luckyColor: 'Yellow',
    overallRating: 4,
  },
  {
    rashi: 'cancer',
    rashiHindi: '\u0915\u0930\u094D\u0915',
    rashiEnglish: 'Cancer',
    symbol: '\u264B',
    prediction: 'Home and family matters need attention today. A property-related decision may come up. Emotional sensitivity is heightened \u2014 channel it into creative pursuits. Ancestors\' blessings are with you.',
    career: 'Work from home will be more productive today. Avoid office politics. A creative solution to a long-standing problem will earn you recognition.',
    love: 'Family support strengthens your relationship. Plan a home-cooked meal with your partner. Nostalgia may bring past connections to mind.',
    health: 'Chest and stomach area need care. Avoid cold drinks and heavy meals. Evening meditation will bring peace and clarity.',
    luckyNumber: 2,
    luckyColor: 'White',
    overallRating: 3,
  },
  {
    rashi: 'leo',
    rashiHindi: '\u0938\u093F\u0902\u0939',
    rashiEnglish: 'Leo',
    symbol: '\u264C',
    prediction: 'Your leadership qualities shine bright today. People look up to you for guidance and direction. A celebration or social event brings happiness. Government-related work will be favourable.',
    career: 'Take charge of team projects. Your confidence and vision will inspire others. A raise or bonus may be announced soon.',
    love: 'Grand gestures in love will be appreciated. Plan something special for your loved one. Singles attract attention naturally today.',
    health: 'Heart health is in focus. Avoid excessive stress and anger. Regular exercise and a balanced diet will keep you energized.',
    luckyNumber: 1,
    luckyColor: 'Gold',
    overallRating: 5,
  },
  {
    rashi: 'virgo',
    rashiHindi: '\u0915\u0928\u094D\u092F\u093E',
    rashiEnglish: 'Virgo',
    symbol: '\u264D',
    prediction: 'Attention to detail pays off today. A complex problem at work finds resolution through your analytical skills. Health improvements are noticed. Be mindful of perfectionist tendencies.',
    career: 'Your meticulous approach impresses superiors. Documentation and analysis tasks go smoothly. Avoid micro-managing team members.',
    love: 'Small, thoughtful gestures mean more than grand ones. Listen actively to your partner\'s needs. Singles should lower their unrealistic expectations.',
    health: 'Digestive system needs attention. Eat fresh, home-cooked meals. An evening walk in nature will reduce stress significantly.',
    luckyNumber: 7,
    luckyColor: 'Green',
    overallRating: 4,
  },
  {
    rashi: 'libra',
    rashiHindi: '\u0924\u0941\u0932\u093E',
    rashiEnglish: 'Libra',
    symbol: '\u264E',
    prediction: 'Balance and harmony define your day. Partnerships \u2014 both business and personal \u2014 flourish. Legal matters resolve in your favour. Artistic pursuits bring satisfaction and possible recognition.',
    career: 'Negotiations and deals go smoothly. Your diplomatic skills help resolve team conflicts. A partnership opportunity may arise.',
    love: 'Harmony in relationships. A romantic surprise from your partner brightens your day. Singles should attend social gatherings.',
    health: 'Kidney and lower back need care. Stay hydrated and maintain good posture. Yoga will be especially beneficial today.',
    luckyNumber: 6,
    luckyColor: 'Pink',
    overallRating: 4,
  },
  {
    rashi: 'scorpio',
    rashiHindi: '\u0935\u0943\u0936\u094D\u091A\u093F\u0915',
    rashiEnglish: 'Scorpio',
    symbol: '\u264F',
    prediction: 'Transformation and deep insights mark this day. Hidden truths come to light. Financial matters related to inheritance or insurance get resolved. Your intuition is extremely strong \u2014 trust it.',
    career: 'Research and investigation tasks succeed. Uncovering hidden information gives you an advantage. Avoid sharing sensitive plans with colleagues.',
    love: 'Deep emotional connections strengthen. Have an honest conversation about your feelings. Avoid jealousy and possessiveness.',
    health: 'Reproductive health needs attention. Detox your body with herbal teas. Mental health improves through journaling or therapy.',
    luckyNumber: 8,
    luckyColor: 'Maroon',
    overallRating: 3,
  },
  {
    rashi: 'sagittarius',
    rashiHindi: '\u0927\u0928\u0941',
    rashiEnglish: 'Sagittarius',
    symbol: '\u2650',
    prediction: 'Adventure and learning are highlighted today. A spiritual journey or pilgrimage may be planned. Higher education or certification efforts succeed. Foreign connections bring good news.',
    career: 'International business opportunities arise. Teaching, publishing, or mentoring activities go well. Think big and aim high.',
    love: 'Long-distance relationships get a boost. Plan a trip together. Singles may find love through cultural or spiritual events.',
    health: 'Hips and thighs need attention. Stretching exercises are important. Outdoor activities boost both physical and mental health.',
    luckyNumber: 3,
    luckyColor: 'Purple',
    overallRating: 4,
  },
  {
    rashi: 'capricorn',
    rashiHindi: '\u092E\u0915\u0930',
    rashiEnglish: 'Capricorn',
    symbol: '\u2651',
    prediction: 'Career ambitions get a major boost today. Hard work pays off with recognition from superiors. Financial discipline leads to long-term gains. A mentor figure may offer valuable guidance.',
    career: 'Promotions, raises, or new responsibilities are indicated. Your dedication and reliability are noticed. Take on challenging projects confidently.',
    love: 'Work-life balance needs attention. Make time for your partner. Practical expressions of love (acts of service) work best today.',
    health: 'Bones and joints need care. Calcium-rich foods and supplements recommended. Avoid overworking \u2014 take regular breaks.',
    luckyNumber: 10,
    luckyColor: 'Brown',
    overallRating: 5,
  },
  {
    rashi: 'aquarius',
    rashiHindi: '\u0915\u0941\u092E\u094D\u092D',
    rashiEnglish: 'Aquarius',
    symbol: '\u2652',
    prediction: 'Innovation and social connections thrive today. A unique idea or solution impresses everyone. Group activities and community service bring fulfillment. Technology-related investments do well.',
    career: 'Think outside the box. Your innovative ideas get green-lit. Networking events open doors to unexpected opportunities.',
    love: 'Friendship-based love deepens. Shared social causes bring you closer to your partner. Singles may find love in community gatherings.',
    health: 'Ankles and circulation need attention. Regular movement throughout the day is essential. Try a new form of exercise.',
    luckyNumber: 11,
    luckyColor: 'Electric Blue',
    overallRating: 4,
  },
  {
    rashi: 'pisces',
    rashiHindi: '\u092E\u0940\u0928',
    rashiEnglish: 'Pisces',
    symbol: '\u2653',
    prediction: 'Spiritual awareness and creativity peak today. Dreams carry important messages \u2014 pay attention. Artistic projects receive appreciation. A charitable act brings unexpected blessings.',
    career: 'Creative fields like music, art, and writing flourish. Spiritual or healing professions bring deep satisfaction. Avoid making major financial decisions today.',
    love: 'Soulful connections deepen. Poetry, music, or art can express what words cannot. Singles may feel a karmic connection with someone new.',
    health: 'Feet and immune system need care. Rest is as important as activity today. Meditation and prayer will be deeply rejuvenating.',
    luckyNumber: 12,
    luckyColor: 'Sea Green',
    overallRating: 4,
  },
];

// ─── Date-based rotation for dynamic feel ───────────────────────────────────

function getDateSeed(dateStr: string): number {
  // Create a deterministic seed from the date string
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function rotateHoroscopes(dateStr: string): DailyHoroscope[] {
  const seed = getDateSeed(dateStr);
  return horoscopes.map((h, idx) => {
    // Rotate lucky number based on date
    const numOffset = (seed + idx * 7) % 12 + 1;
    // Rotate rating based on date
    const ratingOffset = (seed + idx * 3) % 3;
    const newRating = Math.max(3, Math.min(5, h.overallRating + ratingOffset - 1));

    const colors = ['Red', 'Blue', 'Green', 'Gold', 'White', 'Yellow', 'Pink', 'Orange', 'Purple', 'Silver', 'Maroon', 'Saffron'];
    const colorIdx = (seed + idx * 5) % colors.length;

    return {
      ...h,
      luckyNumber: numOffset,
      luckyColor: colors[colorIdx]!,
      overallRating: newRating,
    };
  });
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function HoroscopePage() {
  const [expandedRashi, setExpandedRashi] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!);

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-surface-200 text-surface-200'
            }`}
          />
        ))}
      </div>
    );
  }

  // Color mapping for rashi cards
  const rashiColors: Record<string, string> = {
    aries: 'from-red-50 to-orange-50 border-red-200/50',
    taurus: 'from-emerald-50 to-green-50 border-emerald-200/50',
    gemini: 'from-yellow-50 to-amber-50 border-yellow-200/50',
    cancer: 'from-surface-50 to-amber-50/30 border-surface-200/50',
    leo: 'from-amber-50 to-orange-50 border-amber-200/50',
    virgo: 'from-green-50 to-emerald-50 border-green-200/50',
    libra: 'from-pink-50 to-rose-50 border-pink-200/50',
    scorpio: 'from-red-50 to-rose-50 border-red-200/50',
    sagittarius: 'from-saffron-50 to-violet-50 border-saffron-200/50',
    capricorn: 'from-surface-50 to-amber-50 border-surface-200/50',
    aquarius: 'from-blue-50 to-saffron-50 border-blue-200/50',
    pisces: 'from-teal-50 to-cyan-50 border-teal-200/50',
  };

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
            <h1 className="text-3xl md:text-4xl font-bold text-surface-800 mb-3">
              Daily Horoscope
            </h1>
            <p className="text-surface-500 max-w-xl mx-auto mb-6">
              Read today&apos;s predictions for all 12 rashis. Get insights on career, love, and health.
            </p>

            {/* Date Selector */}
            <div className="inline-flex items-center gap-2 bg-white border border-surface-200 rounded-xl px-4 py-2">
              <Calendar className="w-4 h-4 text-saffron-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm text-surface-800 border-none outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Rashi Grid ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rotateHoroscopes(selectedDate).map((h) => {
            const isExpanded = expandedRashi === h.rashi;
            return (
              <div
                key={h.rashi}
                className={`bg-gradient-to-br ${rashiColors[h.rashi] || 'from-surface-50 to-white border-surface-200/50'} border rounded-xl overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'sm:col-span-2 lg:col-span-2 xl:col-span-2 shadow-lg' : 'hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedRashi(isExpanded ? null : h.rashi)}
                >
                  {/* Rashi Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{h.symbol}</span>
                      <div>
                        <h3 className="text-base font-bold text-surface-800">
                          {h.rashiEnglish}
                        </h3>
                        <p className="text-xs text-surface-500 font-medium">{h.rashiHindi}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {renderStars(h.overallRating)}
                    </div>
                  </div>

                  {/* Brief Prediction */}
                  <p className={`text-sm text-surface-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {h.prediction}
                  </p>

                  {/* Lucky Info */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-surface-500">
                    <span>
                      Lucky #: <span className="font-bold text-surface-700">{h.luckyNumber}</span>
                    </span>
                    <span>
                      Color: <span className="font-bold text-surface-700">{h.luckyColor}</span>
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-surface-200/50 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Career */}
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-saffron-100 rounded-lg flex items-center justify-center">
                            <Briefcase className="w-3.5 h-3.5 text-saffron-600" />
                          </div>
                          <h4 className="text-sm font-bold text-surface-800">Career</h4>
                        </div>
                        <p className="text-xs text-surface-600 leading-relaxed">{h.career}</p>
                      </div>

                      {/* Love */}
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-pink-100 rounded-lg flex items-center justify-center">
                            <Heart className="w-3.5 h-3.5 text-pink-600" />
                          </div>
                          <h4 className="text-sm font-bold text-surface-800">Love</h4>
                        </div>
                        <p className="text-xs text-surface-600 leading-relaxed">{h.love}</p>
                      </div>

                      {/* Health */}
                      <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <h4 className="text-sm font-bold text-surface-800">Health</h4>
                        </div>
                        <p className="text-xs text-surface-600 leading-relaxed">{h.health}</p>
                      </div>
                    </div>

                    <div className="text-center pt-2">
                      <Link
                        href="/astrology/chat"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-600 hover:text-saffron-700 transition-colors"
                      >
                        Ask AI Astrologer for Detailed Reading <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 bg-surface-800 rounded-xl p-8 text-center">
          <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">
            Get Personalized Predictions
          </h3>
          <p className="text-surface-400 max-w-md mx-auto mb-5">
            Daily horoscopes are general. For predictions tailored to your birth chart, try our AI Astrologer or consult a verified astrologer.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/astrology/chat"
              className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-all shadow-md"
            >
              Ask AI Astrologer <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/astrology/kundli"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all"
            >
              Generate Free Kundli
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
