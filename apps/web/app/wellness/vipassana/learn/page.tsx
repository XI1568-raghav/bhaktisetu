import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Learn Vipassana — The Complete Guide to the 10-Day Course | Darshya',
  description:
    'A complete guide to Vipassana meditation in the S.N. Goenka tradition. The 10-day journey day by day, daily schedule, code of discipline, food rules, course variations, common concerns, and what comes after.',
  alternates: { canonical: `${BASE_URL}/wellness/vipassana/learn` },
  openGraph: {
    title: 'Learn Vipassana — Complete Guide',
    description: 'Day-by-day breakdown of the 10-day silent retreat, code of discipline, post-course practice.',
    url: `${BASE_URL}/wellness/vipassana/learn`,
    type: 'article',
  },
};

const SECTIONS = [
  { id: 'what-is', label: 'What is Vipassana' },
  { id: 'three-steps', label: 'Sila → Samadhi → Panna' },
  { id: 'ten-day-journey', label: 'The 10-day journey' },
  { id: 'daily-schedule', label: 'Daily schedule' },
  { id: 'code-of-discipline', label: 'Code of discipline' },
  { id: 'food', label: 'Food rules' },
  { id: 'variations', label: 'Course variations' },
  { id: 'concerns', label: 'Common concerns' },
  { id: 'after', label: 'After the course' },
];

export default function VipassanaLearnPage() {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Wellness', item: `${BASE_URL}/wellness` },
      { '@type': 'ListItem', position: 3, name: 'Vipassana', item: `${BASE_URL}/wellness/vipassana` },
      { '@type': 'ListItem', position: 4, name: 'Learn', item: `${BASE_URL}/wellness/vipassana/learn` },
    ],
  };

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Learn Vipassana — The Complete Guide to the 10-Day Course',
    description: 'Day-by-day breakdown of the Vipassana 10-day silent retreat in the S.N. Goenka tradition.',
    mainEntityOfPage: `${BASE_URL}/wellness/vipassana/learn`,
    inLanguage: 'en',
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, article]) }}
      />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href="/wellness" className="hover:text-gray-800">Wellness</Link>
        <span className="mx-1.5">›</span>
        <Link href="/wellness/vipassana" className="hover:text-gray-800">Vipassana</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">Learn</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-emerald-600">Complete guide</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">
          Learn Vipassana — The 10-Day Course
        </h1>
        <p className="mt-3 text-base text-gray-700">
          A complete preparation guide for a 10-day silent meditation retreat in the
          tradition of S.N. Goenka. Read this before applying.
        </p>
      </header>

      <nav aria-label="Contents" className="mb-10 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">In this guide</p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-sm text-amber-700 hover:underline">
                · {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="what-is" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">What is Vipassana</h2>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-gray-800">
          <p>
            Vipassana literally means &ldquo;to see things as they really are.&rdquo; It is one of
            India&rsquo;s oldest meditation techniques, taught by Gotama the Buddha 2,500 years
            ago and preserved in its original form in Myanmar (Burma) by an unbroken chain
            of teachers until S.N. Goenka brought it back to India in 1969.
          </p>
          <p>
            The technique is non-sectarian and universal. It is not a religious practice
            and requires no conversion. Hindus, Muslims, Christians, Buddhists, Jains,
            atheists, and people of every background have sat the same course and reported
            the same kinds of benefits — sharper attention, emotional balance, freedom
            from compulsive reactions.
          </p>
          <p>
            <strong>Other major lineages:</strong> Goenka tradition is the largest worldwide,
            but Vipassana / Insight meditation is also taught in the Mahasi Sayadaw style
            (noting practice), the Thai Forest tradition (Ajahn Chah), and the Western
            Insight lineage at IMS Barre and Spirit Rock (Joseph Goldstein, Sharon
            Salzberg, Jack Kornfield). Each is valid; they differ in instruction style.
            Goenka centers are donation-based; Western centers are typically fee-based.
          </p>
        </div>
      </section>

      <section id="three-steps" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">Sila → Samadhi → Panna</h2>
        <p className="mt-3 text-base leading-relaxed text-gray-800">
          The course rests on three pillars practiced in order.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <p className="text-sm font-bold text-amber-900">Sila</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-amber-700">Moral conduct</p>
            <p className="mt-2 text-sm text-gray-700">
              Five precepts: no killing, stealing, sexual activity, lying, or
              intoxicants. Required for the duration. Without this base, the mind cannot
              settle.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-sm font-bold text-emerald-900">Samadhi</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-emerald-700">Concentration</p>
            <p className="mt-2 text-sm text-gray-700">
              Trained via Anapana — observation of the natural breath at the entrance
              of the nostrils. Days 1-3. Sharpens attention enough to do the deeper
              work.
            </p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <p className="text-sm font-bold text-indigo-900">Panna</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-indigo-700">Wisdom</p>
            <p className="mt-2 text-sm text-gray-700">
              Direct experiential insight into the changing nature of mind and matter,
              developed through Vipassana body-scanning from Day 4 onward.
            </p>
          </div>
        </div>
      </section>

      <section id="ten-day-journey" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">The 10-day journey</h2>
        <div className="mt-4 space-y-4">
          {[
            { day: 'Day 0', title: 'Arrival', body: 'Check in by afternoon. Surrender phones, books, writing materials, valuables at reception. Orientation in the evening. Noble silence begins at 9 PM.' },
            { day: 'Days 1-3', title: 'Anapana', body: 'Observe natural breath at the nostrils. No control. No counting. Just watching. The mind will wander hundreds of times — the practice is bringing it back, gently, again and again. Group sittings 3x daily. Discourse video in the evening.' },
            { day: 'Day 4', title: 'Vipassana introduction', body: 'In the afternoon the actual Vipassana technique begins. Body scanning — moving attention systematically from head to feet, observing whatever sensation arises (tingling, heat, pulsing, pressure, pain) with equanimity. No reaction. Just observation.' },
            { day: 'Days 5-9', title: 'Deepening', body: 'Practice intensifies. Sweeping the whole body in a single flow of awareness. Some sittings are designated Adhitthana — sittings of strong determination — where you commit not to move, not to open eyes, not to uncross legs for the full hour. Days 6-7 are often the hardest. By Day 8-9 the technique starts working in unmistakable ways.' },
            { day: 'Day 10', title: 'Metta + speech resumes', body: 'Metta meditation — sharing the loving-kindness generated by purified practice with all beings. Noble silence ends in the morning. The shock of speaking again after 10 days is itself a teaching. Final discourse on how to integrate practice into daily life.' },
            { day: 'Day 11', title: 'Departure', body: 'Morning sit. Donation collection (optional, anonymous). Clean the center as karma yoga. Depart by mid-morning.' },
          ].map((d) => (
            <div key={d.day} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{d.day}</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{d.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="daily-schedule" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">Daily schedule</h2>
        <p className="mt-3 text-base text-gray-700">
          The same schedule every day from Day 1 through Day 10. Approximately 10 hours
          of meditation.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-200">
              {[
                ['4:00 AM', 'Morning wake-up bell'],
                ['4:30 – 6:30 AM', 'Meditate in the hall or your room'],
                ['6:30 – 8:00 AM', 'Breakfast + rest'],
                ['8:00 – 9:00 AM', 'Group sitting in the hall'],
                ['9:00 – 11:00 AM', 'Meditate in the hall or your room per teacher instructions'],
                ['11:00 AM – 1:00 PM', 'Lunch + rest'],
                ['1:00 – 2:30 PM', 'Meditate'],
                ['2:30 – 3:30 PM', 'Group sitting'],
                ['3:30 – 5:00 PM', 'Meditate'],
                ['5:00 – 6:00 PM', 'Tea break (fruit for new students only)'],
                ['6:00 – 7:00 PM', 'Group sitting'],
                ['7:00 – 8:15 PM', 'Evening discourse video (S.N. Goenka)'],
                ['8:15 – 9:00 PM', 'Final group sit + Q&A'],
                ['9:30 PM', 'Lights out'],
              ].map(([time, what]) => (
                <tr key={time}>
                  <td className="bg-amber-50 px-4 py-2 font-mono text-xs text-amber-900">{time}</td>
                  <td className="px-4 py-2 text-gray-800">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="code-of-discipline" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">Code of discipline</h2>
        <p className="mt-3 text-base text-gray-700">
          Strict, deliberate, and the reason the course works. Anyone unwilling to follow
          this will be asked to leave.
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-800">
          <li>• <strong>Five precepts</strong> for the duration of the course: no killing (including insects), no stealing, no sexual activity, no lying, no intoxicants.</li>
          <li>• <strong>Noble silence</strong> from Day 0 evening through morning of Day 10: no talking, no gestures, no eye contact, no written notes. The teacher and management may be addressed for genuine logistical or technical questions.</li>
          <li>• <strong>Physical segregation</strong> of men and women throughout the course — separate dining, separate accommodation, separate walking paths.</li>
          <li>• <strong>No contact with the outside world</strong> — no phones, internet, mail, visitors. The center handles any genuine emergency on your behalf.</li>
          <li>• <strong>No other techniques</strong> — yoga, pranayama, mantra repetition, prayer, journaling, religious rites — are paused for the duration. Practice only what is taught.</li>
          <li>• <strong>No books, music, or writing materials.</strong> The mind quiets faster without input.</li>
          <li>• <strong>Modest dress</strong> — loose, comfortable, opaque. No tight or revealing clothing.</li>
        </ul>
      </section>

      <section id="food" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">Food rules</h2>
        <p className="mt-3 text-base text-gray-700">
          Simple vegetarian meals. Most centers can accommodate common dietary
          restrictions (vegan, gluten-free) on prior notice.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-gray-800">
          <li>• <strong>Breakfast</strong> (6:30 AM) — porridge, fruit, tea</li>
          <li>• <strong>Lunch</strong> (11 AM) — main meal: rice, dal, sabzi, salad</li>
          <li>• <strong>Tea break</strong> (5 PM) — fruit and tea for new students; old students fast from solid food entirely after 12 PM</li>
        </ul>
        <p className="mt-3 text-sm italic text-gray-600">
          The dinner restriction follows the Theravada monastic rule. Many students report
          better sleep and clearer morning meditation as a result.
        </p>
      </section>

      <section id="variations" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">Course variations</h2>
        <p className="mt-3 text-base text-gray-700">
          The 10-day course is the only entry point. Everything else requires you to have
          completed one first.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-800">
          <li>• <strong>10-day course</strong> — for everyone, including first-time (&ldquo;New&rdquo;) students.</li>
          <li>• <strong>3-day course</strong> — for Old Students who have completed at least one 10-day. Refresher.</li>
          <li>• <strong>Satipatthana course (8 days)</strong> — for Old Students who have completed at least three 10-day courses and observed the precepts in daily life. Studies the Satipatthana Sutta line by line.</li>
          <li>• <strong>Children&rsquo;s courses</strong> — separate streams for 8-12, 13-18, and 19-22 year olds. Shorter format. Run regularly at most centers.</li>
          <li>• <strong>Executive courses</strong> — modified format for working professionals at select centers (e.g., Dhamma Pattana).</li>
          <li>• <strong>Long courses (20-day, 30-day, 45-day, 60-day)</strong> — for serious old students with multiple 10-days under their belt and significant daily practice. Limited centers (Dhamma Giri, Dhamma Dhara, Dhamma Sota).</li>
        </ul>
      </section>

      <section id="concerns" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">Common concerns</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-semibold text-gray-900">Is this religious? Do I have to become Buddhist?</p>
            <p className="mt-1 text-sm text-gray-700">
              No. The technique is universal and non-sectarian. Goenka was explicit that
              Vipassana belongs to no religion — only to humanity. People of every faith
              and none sit the same course.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">How is this different from yoga or mindfulness apps?</p>
            <p className="mt-1 text-sm text-gray-700">
              Apps and casual mindfulness train relaxation. Vipassana trains direct
              insight into the impermanent nature of mental and physical phenomena
              through ten consecutive days of intensive practice. The result is
              qualitatively different — and the time investment is the point.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Can I attend if I have a mental health condition?</p>
            <p className="mt-1 text-sm text-gray-700">
              The application form asks about active mental health conditions, including
              severe depression, anxiety, psychiatric medication, and history of trauma
              or psychosis. Centers may decline or defer applicants. Consult your doctor
              before applying. The intensity of the course can surface buried material.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">I can&rsquo;t sit cross-legged for an hour. Will I cope?</p>
            <p className="mt-1 text-sm text-gray-700">
              Most first-timers can&rsquo;t. The Adhitthana sittings (strong determination)
              only start mid-course. You may use cushions, blocks, even a chair if
              medically needed. Start preparing two weeks before by sitting on the floor
              for 30+ minutes daily.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Will I really have to give up my phone?</p>
            <p className="mt-1 text-sm text-gray-700">
              Yes. Deposited at reception on Day 0, returned on Day 10. Centers handle
              any genuine family emergency for you. The phone surrender is a major part
              of why the course works.
            </p>
          </div>
        </div>
      </section>

      <section id="after" className="mb-10 scroll-mt-20">
        <h2 className="font-serif text-2xl text-amber-700">After the course</h2>
        <div className="mt-3 space-y-3 text-base leading-relaxed text-gray-800">
          <p>
            Goenka asks every student to sit two hours of meditation daily — one in the
            morning, one in the evening — for at least one year after their first course.
            Without this, the benefits fade quickly.
          </p>
          <p>
            Find a local <strong>group sitting</strong> in your city. Most major cities have
            weekly group sittings led by Assistant Teachers. Sitting in a group reinforces
            individual practice.
          </p>
          <p>
            Return for another 10-day course within a year. Many practitioners return
            annually for the rest of their lives. After three 10-day courses you become
            eligible for Satipatthana and other deeper formats.
          </p>
          <p>
            Practice the five precepts in daily life as best you can. The course works
            only when the discipline continues outside the meditation hall.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
        <h2 className="font-serif text-xl text-saffron-900">Ready to apply?</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Pick a center and apply directly. Darshya is a discovery resource — applications
          go to the center, not to us.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/wellness/vipassana/centers"
            className="inline-flex items-center gap-1 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-700"
          >
            See all centers →
          </Link>
          <Link
            href="/wellness/vipassana"
            className="inline-flex items-center gap-1 rounded-lg border border-saffron-400 bg-white px-4 py-2 text-sm font-semibold text-saffron-800 hover:bg-saffron-50"
          >
            Back to Vipassana overview
          </Link>
          <a
            href="https://www.dhamma.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Visit dhamma.org
          </a>
        </div>
      </section>
    </main>
  );
}
