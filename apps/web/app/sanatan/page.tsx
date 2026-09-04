import type { Metadata } from 'next';
import Link from 'next/link';
import VedicTimeline from '../../components/VedicTimeline';
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
  title: 'Sanatana Dharma — A Complete Evergreen Guide to the Eternal Way',
  description:
    'The definitive long-form overview of Sanatana Dharma: meaning, history from Vedic to modern times, the six darshanas, the Itihasa-Purana corpus, deities, festivals, and lived practice. A pillar reference for devotees, seekers and students.',
  alternates: { canonical: 'https://darshya.online/sanatan' },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Sanatana Dharma — Complete Evergreen Guide',
    description:
      'Long-form pillar reference: meaning, history, philosophy, deities, scriptures, festivals and lived practice of the eternal way.',
    url: 'https://darshya.online/sanatan',
    type: 'article',
  },
};

const TOC = [
  { id: 'what-is', label: '1. What "Sanatana Dharma" means' },
  { id: 'history', label: '2. A history in five movements' },
  { id: 'scriptures', label: '3. The textual corpus' },
  { id: 'darshanas', label: '4. The six classical darshanas' },
  { id: 'deities', label: '5. Deities, devas and the One' },
  { id: 'practice', label: '6. Practice — ritual, bhakti, yoga, seva' },
  { id: 'festivals', label: '7. The festival year' },
  { id: 'pilgrimage', label: '8. Tirtha — sacred geography' },
  { id: 'samskaras', label: '9. The sixteen samskaras' },
  { id: 'modern', label: '10. Sanatana Dharma in the modern world' },
  { id: 'misconceptions', label: '11. Common misconceptions, gently corrected' },
  { id: 'start', label: '12. Where to begin if you are new' },
];

export default function SanatanPillarPage() {
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Sanatana Dharma — A Complete Evergreen Guide to the Eternal Way',
    description:
      'Pillar reference to the meaning, history, philosophy, deities, scriptures, festivals and lived practice of Sanatana Dharma.',
    author: { '@type': 'Organization', name: 'Darshya' },
    publisher: {
      '@type': 'Organization',
      name: 'Darshya',
      url: 'https://darshya.online',
    },
    datePublished: '2026-06-15',
    dateModified: '2026-06-15',
    mainEntityOfPage: 'https://darshya.online/sanatan',
    inLanguage: 'en',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://darshya.online/' },
      { '@type': 'ListItem', position: 2, name: 'Sanatana Dharma', item: 'https://darshya.online/sanatan' },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <article className="max-w-3xl mx-auto px-4 py-12 prose-base">
        <header className="mb-10 border-b border-saffron-200 pb-8">
          <p className="text-sm font-medium text-saffron-700 uppercase tracking-wider">Pillar guide · Evergreen reference</p>
          <h1 className={`${H1.marketing} mt-3`}>
            Sanatana Dharma — A Complete Guide to the Eternal Way
          </h1>
          <p className="mt-4 prose-lead text-surface-700 leading-relaxed">
            Sanatana Dharma — सनातन धर्म, literally "the eternal order" — is the indigenous spiritual tradition of
            the Indian subcontinent. It is what most of the modern world calls "Hinduism," though the name itself is
            a colonial-era simplification of a far older, far more pluralistic family of paths. This guide walks
            slowly through its meaning, its history across five millennia, its texts, its philosophies, its deities,
            its festivals, and its lived daily practice. It is written for the curious newcomer, the second-generation
            devotee reconnecting with tradition, and the long-time seeker who wants a single coherent map of the
            terrain.
          </p>
          <p className="mt-2 text-sm text-surface-500">Roughly a 25-minute read · updated for 2026</p>
        </header>

        <nav aria-label="Contents" className="mb-12 rounded-lg border border-surface-200 bg-surface-50 p-5">
          <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider mb-3">Contents</p>
          <ol className="space-y-1.5 text-sm">
            {TOC.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-indigo-700 hover:text-indigo-900 hover:underline">
                  {t.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 1. What is */}
        <section id="what-is" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">1. What "Sanatana Dharma" actually means</h2>
          <p>
            The compound <em>sanatana dharma</em> joins two words that resist easy translation. <em>Sanatana</em> means
            eternal, perennial, without beginning. <em>Dharma</em> is harder: it points at the same time to cosmic
            order, individual duty, ethical conduct, the natural law of how things hold together, and the path
            appropriate to one's stage of life. The Mahabharata defines dharma as that which sustains — <em>dharanat
            dharmamityahuh</em>, "it is called dharma because it sustains." Sanatana dharma, then, names the eternal
            sustaining order — the way things actually work — and the human path of aligning with it.
          </p>
          <p>
            The phrase appears in the Bhagavata Purana, in the Mahabharata, and in later Upanishadic literature, but
            it was not used as a collective label for the religion until the nineteenth century. Before that, people
            simply referred to particular paths — Vaishnava, Shaiva, Shakta, Smarta, Tantric — or to one's own
            sampradaya (lineage), guru-parampara (teacher succession), or kuladevata (family deity). The word "Hindu"
            itself is geographic — derived from the Sindhu (Indus) river — and was first applied by Persians and
            later Greeks to the people living east of that river. The religion that arose from this soil never had,
            and arguably still does not have, a single founder, a single text, a single creed, or a single hierarchy.
            Its unity is not creedal but civilizational.
          </p>
          <p>
            This pluralism is a feature, not an accident. The Rigveda itself declares <em>ekam sat vipra bahudha
            vadanti</em> — "truth is one; the wise call it by many names." Sanatana Dharma is structured around the
            assumption that ultimate reality, being infinite, can be approached from many angles, with many practices,
            by many kinds of temperaments. It is therefore a family of paths sharing a common metaphysical grammar
            rather than a single doctrinal religion. To understand it, one must hold its diversity and its underlying
            unity in the same hand.
          </p>
        </section>

        {/* 2. History */}
        <section id="history" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">2. A history in five movements</h2>
          <p>
            The history of Sanatana Dharma is best read not as a single linear story but as a layered accumulation
            in which earlier strata are never fully discarded. Five rough movements help to organize the timeline.
          </p>

          <h3 className="text-xl font-semibold text-surface-900 mt-6 mb-2">Vedic era (c. 1500 BCE – 500 BCE)</h3>
          <p>
            The oldest surviving layer is the Vedic corpus, composed over many centuries in an archaic form of
            Sanskrit. The four Vedas — <Link href="/vedas" className="text-indigo-700 underline hover:text-indigo-900">Rigveda, Yajurveda, Samaveda, Atharvaveda</Link> — preserve the
            hymns, ritual formulae and incantations of a pastoral and gradually agricultural society. The early
            religion is centered on <em>yajna</em>, fire ritual, addressed to a pantheon of natural and cosmic devas:
            Agni (fire), Indra (rains and warrior protection), Varuna (cosmic order), Surya (sun), Soma (the ritual
            drink and the moon). Late in this period the Aranyakas and especially the {' '}
            <Link href="/upanishads" className="text-indigo-700 underline hover:text-indigo-900">Upanishads</Link> turn
            inward, away from external ritual toward inquiry into the self (<em>atman</em>) and the absolute (<em>brahman</em>).
            The mahavakyas — <em>tat tvam asi</em>, "that thou art"; <em>aham brahmasmi</em>, "I am brahman" — are
            distilled here.
          </p>

          <h3 className="text-xl font-semibold text-surface-900 mt-6 mb-2">Epic and classical age (c. 500 BCE – 500 CE)</h3>
          <p>
            The two great epics — the <Link href="/ramayana" className="text-indigo-700 underline hover:text-indigo-900">Ramayana</Link> of
            Valmiki and the <Link href="/mahabharata" className="text-indigo-700 underline hover:text-indigo-900">Mahabharata</Link> of
            Vyasa — were composed and stabilized during this period. They are not merely stories; they are dharma
            taught through narrative. Embedded in the Mahabharata, the {' '}
            <Link href="/gita" className="text-indigo-700 underline hover:text-indigo-900">Bhagavad Gita</Link> synthesises
            karma (action), jnana (knowledge) and bhakti (devotion) into a single coherent path. The Dharmashastras
            (Manusmriti, Yajnavalkya Smriti) codify social and personal conduct. The six darshanas crystallise as
            distinct philosophical schools. This is also the age that contributed Buddhism and Jainism — sibling
            sramanic movements that share many premises with the dharmic core while differing on the authority of
            the Vedas and the existence of an enduring self.
          </p>

          <h3 className="text-xl font-semibold text-surface-900 mt-6 mb-2">Puranic and temple age (c. 500 – 1200 CE)</h3>
          <p>
            The eighteen Mahapuranas and many Upapuranas weave the great mythic narratives that most Hindus today
            actually live with — the lila of Krishna, the avataras of Vishnu, the cosmic dance of Shiva, the great
            goddess in her many forms. Temple architecture flowers from Pallava and Chalukya beginnings into the
            grand stone universes of the Cholas, the Hoysalas, the Eastern Gangas, and the rock-cut shrines of
            Ellora. The bhakti movement, fed by Tamil Alvars and Nayanars, begins its long northward migration. The
            <Link href="/jyotirlinga" className="text-indigo-700 underline hover:text-indigo-900"> twelve Jyotirlingas</Link> and
            the <Link href="/shakti-peeth" className="text-indigo-700 underline hover:text-indigo-900">Shakta Peethas</Link> are
            mapped onto the subcontinent as a living sacred geography. Adi Shankara, in the early ninth century,
            consolidates Advaita Vedanta and establishes four mathas at the cardinal directions.
          </p>

          <h3 className="text-xl font-semibold text-surface-900 mt-6 mb-2">Bhakti renaissance and Sultanate-Mughal interaction (c. 1200 – 1800 CE)</h3>
          <p>
            Under successive Islamic polities, temple culture suffered iconoclasm in many regions yet also flourished
            in others, and the bhakti movement reached its full second flowering. Ramanuja (Vishishtadvaita), Madhva
            (Dvaita), and Chaitanya (Achintya Bheda-Abheda) articulated theistic Vedantas of devotion. The Sant
            tradition — Kabir, Ravidas, Mirabai, Tukaram, Namdev, Eknath, Tulsidas, Surdas — brought intimate,
            vernacular devotional poetry to ordinary households. The Sikh Gurus, beginning with Guru Nanak, founded
            a path that drew on both bhakti and Sufi influences. The Vijayanagara empire, the Marathas under
            Shivaji, and the Rajput courts patronised temple culture and Sanskrit learning even when political winds
            were unfavourable.
          </p>

          <h3 className="text-xl font-semibold text-surface-900 mt-6 mb-2">Modern renaissance (c. 1800 – present)</h3>
          <p>
            The colonial encounter forced Sanatana Dharma to reflect on itself in new ways. Ram Mohan Roy, Dayananda
            Saraswati, Ramakrishna and Vivekananda, Sri Aurobindo, Ramana Maharshi, the Theosophists, and many
            others reframed and presented the tradition to a global audience. Vivekananda's address at the 1893
            World's Parliament of Religions in Chicago is conventionally treated as the moment Sanatana Dharma
            entered modern global consciousness as a complete worldview rather than as an exoticism. In the
            twentieth century Gandhi's satyagraha, the founding of countless ashramas and Sanskrit colleges, the
            global spread of yoga and Vedanta, and the building of the diasporic temple — from Pittsburgh's Sri
            Venkateswara to London's Neasden Mandir — extended the tradition geographically. Today Sanatana Dharma is
            lived in every continent.
          </p>

          <div className="my-8">
            <VedicTimeline />
          </div>
        </section>

        {/* 3. Scriptures */}
        <section id="scriptures" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">3. The textual corpus</h2>
          <p>
            Sanatana Dharma's textual heritage is not a single canon but a layered library. Traditionally it is
            divided into <em>sruti</em> (that which was heard — directly revealed, primarily the Vedas) and {' '}
            <em>smriti</em> (that which was remembered — composed and transmitted by sages and later teachers, more
            adaptable across time).
          </p>
          <ul className="list-disc pl-6 space-y-2 my-4">
            <li>
              <strong>The four Vedas</strong> — each containing Samhitas (hymns), Brahmanas (ritual exegesis),
              Aranyakas (forest treatises), and <Link href="/upanishads" className="text-indigo-700 underline hover:text-indigo-900">Upanishads</Link> (philosophical
              dialogues).
            </li>
            <li>
              <strong>The six Vedangas</strong> — auxiliary disciplines: Shiksha (phonetics), Chandas (metre),
              Vyakarana (grammar), Nirukta (etymology), Kalpa (ritual), Jyotisha (astronomy and time-reckoning).
            </li>
            <li>
              <strong>The Itihasas</strong> — the Ramayana and Mahabharata.
            </li>
            <li>
              <strong>The eighteen Mahapuranas</strong> — encyclopedias of cosmology, theology, lineage and ritual,
              traditionally grouped by their primary devotional orientation (Vaishnava, Shaiva, Brahma).
            </li>
            <li>
              <strong>The Dharmashastras and Arthashastra</strong> — codes of social, ethical and political conduct.
            </li>
            <li>
              <strong>The Agamas and Tantras</strong> — ritual and theological manuals specific to particular
              deity-traditions; they govern temple construction, image consecration, and esoteric practice.
            </li>
            <li>
              <strong>The Bhakti corpus</strong> — devotional poetry of the Alvars, Nayanars, and northern sants,
              and later compositions like the Ramcharitmanas, the Sursagar, and the Abhangs of Tukaram.
            </li>
            <li>
              <strong>The Darshana-sutras</strong> — base aphoristic texts of each classical philosophical school,
              with their long commentarial traditions.
            </li>
          </ul>
          <p>
            Reading order matters less than depth: most traditional teachers recommend beginning with the {' '}
            <Link href="/gita" className="text-indigo-700 underline hover:text-indigo-900">Bhagavad Gita</Link>, then a
            principal Upanishad such as the Isha or Mundaka, then the Ramayana for narrative grounding, returning
            again and again rather than racing through the full library.
          </p>
        </section>

        {/* 4. Darshanas */}
        <section id="darshanas" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">4. The six classical darshanas</h2>
          <p>
            <em>Darshana</em> means "viewpoint" or, literally, "seeing." The six classical darshanas are six rigorous
            philosophical schools that emerged in the classical period and remain the backbone of formal Hindu
            philosophy. They are traditionally paired.
          </p>
          <ol className="list-decimal pl-6 space-y-3 my-4">
            <li>
              <strong>Nyaya</strong> — the school of logic and epistemology, founded by Gautama. It analyses how we
              know what we know, the structure of valid inference, and the means of removing error.
            </li>
            <li>
              <strong>Vaisheshika</strong> — the atomic and categorial school of Kanada, complementary to Nyaya. It
              maps reality into substances, qualities, actions, universals, particularities and inherence.
            </li>
            <li>
              <strong>Samkhya</strong> — the dualistic enumeration school of Kapila. It distinguishes purusha
              (consciousness, witness) from prakriti (nature, the unfolding field) and traces the evolution of
              experience through twenty-four tattvas.
            </li>
            <li>
              <strong>Yoga</strong> — the practical companion to Samkhya, codified by Patanjali in the Yoga Sutras.
              Its eight limbs — yama, niyama, asana, pranayama, pratyahara, dharana, dhyana, samadhi — describe a
              graduated discipline of liberation. (The asana-and-breath practice popular globally today is one
              fragment of this much larger architecture.)
            </li>
            <li>
              <strong>Purva Mimamsa</strong> — the school of ritual interpretation founded by Jaimini. It treats the
              Vedic karmakanda as primary and develops a rigorous hermeneutics of dharmic action.
            </li>
            <li>
              <strong>Vedanta (Uttara Mimamsa)</strong> — the school of the Upanishadic end. Three principal
              sub-schools dominate: Advaita (non-dualism) of Shankara, Vishishtadvaita (qualified non-dualism) of
              Ramanuja, and Dvaita (dualism) of Madhva. They differ on the precise relation between brahman, jiva
              and jagat — the absolute, the individual soul, and the world.
            </li>
          </ol>
          <p>
            These six are typically called <em>astika</em> ("affirming") because they accept the authority of the
            Vedas. Three further classical schools — Buddhism, Jainism, and the materialist Charvaka — are called {' '}
            <em>nastika</em> ("negating") because they do not. The exchange among all nine schools, sustained over
            two millennia of formal debate, is one of the richest philosophical conversations on earth.
          </p>
        </section>

        {/* 5. Deities */}
        <section id="deities" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">5. Deities, devas, and the One</h2>
          <p>
            One of the most common confusions outsiders bring to Sanatana Dharma is the question, "Are you
            polytheistic or monotheistic?" The honest answer is neither, and both. The tradition is sometimes
            described as <em>henotheistic</em> (worshipping one chosen deity while acknowledging others), sometimes
            as <em>panentheistic</em> (the divine pervades and exceeds all that exists), and at its philosophical
            apex as <em>non-dual</em>: there is only one reality, and the many forms of the divine are the play of
            that one.
          </p>
          <p>
            In lived practice, most Hindus worship a chosen <em>ishta-devata</em> — a personal form of the divine
            with whom one feels closest — within a household, regional or family tradition. The five great
            traditions of theistic worship are:
          </p>
          <ul className="list-disc pl-6 space-y-2 my-4">
            <li><strong>Vaishnavism</strong> — worship of Vishnu and his avataras, especially Rama and Krishna.</li>
            <li><strong>Shaivism</strong> — worship of Shiva, often through the linga and through the Jyotirlingas.</li>
            <li><strong>Shaktism</strong> — worship of the Devi, the goddess, in her many forms (Durga, Lakshmi, Saraswati, Kali, the Mahavidyas, the Shakta Peethas).</li>
            <li><strong>Smartism</strong> — the Smarta tradition, codified by Shankara, that worships Vishnu, Shiva, Devi, Ganesha and Surya as five equal expressions of the one brahman.</li>
            <li><strong>Ganapatya and Saura</strong> — older traditions centred on Ganesha and on Surya, today usually folded into the larger lineages.</li>
          </ul>
          <p>
            Devotees often hold several forms in their daily life: a kuladevata inherited from the family, an
            ishta-devata chosen by temperament, a guru's preferred form, and the local presiding deity of one's
            village or city. None of these is exclusive. The Smarta synthesis explicitly affirms their unity.
          </p>
          <p>
            Beyond the principal forms there are the lokapalas (guardians of the directions), the navagraha (the
            nine planetary influences), the nakshatras (twenty-seven lunar mansions), the kuladevatas (family
            deities) and gramadevatas (village deities), and countless tirtha-devatas (deities of particular
            sacred places). Each has its own ritual, mantra, and festival.
          </p>
        </section>

        {/* 6. Practice */}
        <section id="practice" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">6. Practice — ritual, bhakti, yoga, seva</h2>
          <p>
            Sanatana Dharma is decisively a practiced religion. Belief is secondary; what one actually does daily,
            in body and breath and offering, is primary. Traditionally the practitioner is offered four broad
            avenues, the <em>chatur yogas</em>, which can be combined in any proportion:
          </p>
          <ul className="list-disc pl-6 space-y-2 my-4">
            <li>
              <strong>Karma yoga</strong> — the path of action without attachment to its fruit, articulated most
              clearly in the Bhagavad Gita.
            </li>
            <li>
              <strong>Bhakti yoga</strong> — the path of loving devotion to a chosen form of the divine, expressed
              through kirtan, namasmarana, puja, pilgrimage and seva.
            </li>
            <li>
              <strong>Jnana yoga</strong> — the path of discriminating self-inquiry, sustained through study,
              reflection and meditation on the Upanishadic mahavakyas.
            </li>
            <li>
              <strong>Raja yoga</strong> — the royal path of meditative discipline through Patanjali's eight limbs,
              with samadhi as its summit.
            </li>
          </ul>
          <p>
            The daily ritual life of a traditional household includes <em>sandhya vandana</em> (twilight prayers at
            dawn and dusk), some form of personal puja before the home shrine, recitation or chanting of mantra,
            and a respectful relationship with the food, the fire of the kitchen, the household and the guests.
            Temple visits, weekly or on specific days associated with a chosen deity, anchor a wider rhythm. Major
            life events are marked by samskaras (sacraments), discussed further below.
          </p>
          <p>
            For most devotees today, the most consequential weekly act is the formal puja — at home or at a temple,
            sometimes commissioned through a pandit on behalf of a household for a specific intention. {' '}
            <Link href="/pujas" className="text-indigo-700 underline hover:text-indigo-900">Pujas can be booked</Link> for
            health, prosperity, the well-being of children, the resolution of family difficulty, the propitiation
            of ancestors, or simply gratitude. The orthopraxy is fluid; the inner orientation — sincerity, surrender,
            attention — is what matters.
          </p>
          <p>
            <em>Seva</em> — selfless service — is woven through all four yogas. Feeding pilgrims, sustaining
            gaushalas (cow shelters), caring for elders and orphans, supporting Vedic pathshalas, and the broader
            ethic of <em>atithi devo bhava</em> ("the guest is god") express dharma in concrete daily form.
          </p>
        </section>

        {/* 7. Festivals */}
        <section id="festivals" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">7. The festival year</h2>
          <p>
            The Hindu calendar is a lunisolar reckoning that produces a thick, layered festival year. Some festivals
            are pan-Indian; others belong to particular regions, deities, or sampradayas. A few of the great
            anchors:
          </p>
          <ul className="list-disc pl-6 space-y-2 my-4">
            <li><strong>Makar Sankranti / Pongal</strong> (mid-January) — the sun's northward turn, harvest gratitude.</li>
            <li><strong>Maha Shivaratri</strong> (Phalguna) — the great night of Shiva, kept with fasting and night-long worship.</li>
            <li><strong>Holi</strong> (Phalguna full moon) — the festival of colour and the play of Krishna.</li>
            <li><strong>Ram Navami</strong> (Chaitra) — the birth of Sri Rama.</li>
            <li><strong>Hanuman Jayanti</strong> (Chaitra full moon, regional variants) — the birth of Hanuman.</li>
            <li><strong>Guru Purnima</strong> (Ashadha full moon) — gratitude to the teacher.</li>
            <li><strong>Raksha Bandhan</strong> (Shravana full moon) — the brother-sister bond.</li>
            <li><strong>Krishna Janmashtami</strong> (Shravana) — the birth of Krishna.</li>
            <li><strong>Ganesh Chaturthi</strong> (Bhadrapada) — ten days of Ganesha.</li>
            <li><strong>Navaratri and Dussehra</strong> (Ashvin) — nine nights of the Devi, the victory of Rama over Ravana.</li>
            <li><strong>Diwali</strong> (Kartika new moon) — the festival of lights, Lakshmi puja, Rama's return.</li>
            <li><strong>Tulsi Vivah</strong> (Kartika) — the marriage of Tulsi to Krishna, opening the wedding season.</li>
            <li><strong>Vaikuntha Ekadashi</strong> (Margashirsha) — a great Vaishnava observance.</li>
          </ul>
          <p>
            Each fortnight has its <em>ekadashi</em>, each month its full moon and new moon observances, each day
            its presiding deity. A pandit consulted for a household's regional and family tradition will offer a
            calendar of observances appropriate to that lineage.
          </p>
        </section>

        {/* 8. Pilgrimage */}
        <section id="pilgrimage" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">8. Tirtha — sacred geography</h2>
          <p>
            A <em>tirtha</em> is a crossing — a place where the line between the human and the divine is felt to be
            thin. The subcontinent is mapped, in Sanatana Dharma's imagination, as a living body of sacred sites
            connected by pilgrimage routes that have been walked for millennia.
          </p>
          <ul className="list-disc pl-6 space-y-2 my-4">
            <li><strong>The Char Dham</strong> — Badrinath, Dwarka, Puri, Rameswaram — the four cardinal abodes.</li>
            <li><strong>The Chota Char Dham</strong> in Uttarakhand — Yamunotri, Gangotri, Kedarnath, Badrinath.</li>
            <li><Link href="/jyotirlinga" className="text-indigo-700 underline hover:text-indigo-900">The twelve Jyotirlingas</Link> of Shiva.</li>
            <li><Link href="/shakti-peeth" className="text-indigo-700 underline hover:text-indigo-900">The Shakti Peethas</Link> of the Devi.</li>
            <li>The Sapta Puri — Ayodhya, Mathura, Haridwar, Varanasi, Kanchipuram, Ujjain, Dwarka.</li>
            <li>The Panch Prayag of the Ganga's tributaries.</li>
            <li>The Panch Kedar and the Pancha Bhoota Sthalas of Shiva.</li>
            <li>The Ashta Vinayak around Pune.</li>
          </ul>
          <p>
            Beyond these famous circuits, every river, every grove, every hilltop with a story is a tirtha. The Ganga
            is herself a goddess. Mount Kailasa, Govardhan, Tirumala, Arunachala — each is at once geography and
            theology. A traditional pilgrimage involves walking when possible, fasting, daily bathing, listening to
            the local sthala-purana (the story of the place), and returning home altered. For those who cannot
            travel, the tradition has always allowed for <em>manasa tirtha</em> — pilgrimage in the mind — and for
            sponsored puja conducted at the tirtha on one's behalf.
          </p>
        </section>

        {/* 9. Samskaras */}
        <section id="samskaras" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">9. The sixteen samskaras</h2>
          <p>
            The <em>samskaras</em> are the sixteen sacraments that mark and sanctify the major transitions of a
            human life from conception to death. Not every household performs all sixteen today; many traditions
            preserve only the most important. The classical list includes:
          </p>
          <ol className="list-decimal pl-6 space-y-1 my-4">
            <li>Garbhadhana — conception.</li>
            <li>Pumsavana — invocation in the third month.</li>
            <li>Simantonnayana — parting of the hair, in the sixth or eighth month.</li>
            <li>Jatakarma — at birth.</li>
            <li>Namakarana — the naming, on the eleventh or twelfth day.</li>
            <li>Nishkramana — the first outing.</li>
            <li>Annaprashana — the first solid food.</li>
            <li>Chudakarana — the first hair-tonsuring.</li>
            <li>Karnavedha — ear-piercing.</li>
            <li>Vidyarambha — beginning of learning.</li>
            <li>Upanayana — the sacred-thread ceremony, traditionally inaugurating Vedic study.</li>
            <li>Vedarambha — beginning of Veda study.</li>
            <li>Keshanta and Samavartana — the close of formal studentship.</li>
            <li>Vivaha — marriage.</li>
            <li>Vanaprastha — the forest-dweller stage of life.</li>
            <li>Antyeshti — the final rite, cremation and shraddha.</li>
          </ol>
          <p>
            Underneath the list is a clear theology: human life is not raw biological succession but an arc of
            consecration, in which each transition is offered up and integrated into a larger order. Even the final
            samskara, antyeshti, is followed by the long ancestral commemoration of <em>shraddha</em> and the
            annual fortnight of Pitru Paksha when one's forebears are remembered and fed.
          </p>
        </section>

        {/* 10. Modern */}
        <section id="modern" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">10. Sanatana Dharma in the modern world</h2>
          <p>
            The last century and a half has been a period of extraordinary transformation. Sanatana Dharma has had
            to think about itself in dialogue with colonial scholarship, with global comparative religion, with the
            sciences, with secular law, with the rise of the modern nation-state, and with a worldwide diaspora.
            The result is neither a return to a purely premodern past nor an abandonment of tradition, but a
            renewal — much as previous renewals in the Bhakti and Vedanta movements transformed earlier inheritances.
          </p>
          <p>
            Several threads stand out. First, the global spread of yoga and meditation, in many cases stripped of
            theological context but in others (Iyengar, Krishnamacharya's lineage, Sivananda, the various Vedanta
            societies) preserving the full philosophical frame. Second, the construction of diasporic temples in
            North America, the UK, the Gulf, East Africa and Southeast Asia, sustaining ritual continuity for
            second- and third-generation devotees. Third, the digitisation of scripture: nearly every classical
            text is now accessible online in multiple translations, and remote puja, livestreamed darshan, and
            tele-jyotisha bring sacred services to families separated from their ancestral temples by oceans.
          </p>
          <p>
            For NRI families in particular, the recurring practical questions are: how do I keep the kuladevata
            tradition alive when I cannot visit the home temple; how do I conduct samskaras for my children when I
            do not have an extended family on hand; how do I make sure the next generation can read a basic
            Sanskrit shloka and recognise the basic stories. Each of these has working answers. Books, online
            classes, weekend balavihar groups, regional temples, and increasingly platforms that connect families
            with verified pandits in India have made it possible to live a recognisably traditional life almost
            anywhere on earth.
          </p>
        </section>

        {/* 11. Misconceptions */}
        <section id="misconceptions" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">11. Common misconceptions, gently corrected</h2>
          <p>
            A few stubborn misreadings recur in popular accounts, often in well-meaning ones, and it helps to name
            them plainly.
          </p>
          <ul className="list-disc pl-6 space-y-3 my-4">
            <li>
              <strong>"Hindus worship idols."</strong> The tradition worships the divine through consecrated images
              (<em>murti</em>), but the metaphysics is clear: the image is a focus, an invited presence; the
              divine itself is formless and infinite. The Yajurveda is explicit that the highest brahman has no
              shape.
            </li>
            <li>
              <strong>"There are 330 million gods."</strong> The number <em>tridasha koti</em> historically referred
              to classes or kinds of deities, not literal count. The point is that the divine has indefinitely many
              faces; it is not a census.
            </li>
            <li>
              <strong>"The caste system is the religion."</strong> Caste in its modern hierarchical form is a
              historical and social institution that has been criticised within the tradition for centuries by the
              Bhakti saints, the Sant tradition, and many reformers. The textual support sometimes adduced for it
              is contested even within classical sources.
            </li>
            <li>
              <strong>"Karma means fatalism."</strong> Karma is the law of action and consequence. It is the
              opposite of fatalism: it places responsibility for one's future squarely in the field of one's present
              action.
            </li>
            <li>
              <strong>"Yoga is exercise."</strong> Asana is one of the eight limbs of Patanjali's Yoga. The other
              seven are ethical, meditative and contemplative. The full discipline is a complete path of liberation.
            </li>
          </ul>
        </section>

        {/* 12. Where to start */}
        <section id="start" className="mb-12 scroll-mt-20">
          <h2 className="text-3xl font-bold text-surface-900 mb-4">12. Where to begin if you are new</h2>
          <p>
            For a newcomer, a sensible first pass through the tradition might look like this. Read the {' '}
            <Link href="/gita" className="text-indigo-700 underline hover:text-indigo-900">Bhagavad Gita</Link> with
            a respected translation and a short commentary; read it slowly, eighteen chapters over eighteen weeks.
            Listen daily, even briefly, to a chant you find moving — the Hanuman Chalisa, the Vishnu Sahasranama,
            the Mahishasura Mardini Stotra, or a simple Om Namah Shivaya. Visit a temple, sit quietly, and watch
            what happens. Mark the next major festival in the calendar, learn its story, and observe it in some
            small way at home. Find one teacher whose voice rings true and stay with them long enough to be
            taught, rather than skimming many.
          </p>
          <p>
            Above all, hold the tradition the way it has always asked to be held: as a living conversation, not a
            fixed creed. Sanatana Dharma is eternal not because it never changes, but because what it points to —
            the order that sustains, the consciousness in which all this arises — does not change. The forms are
            many and supple; the substance is one.
          </p>
        </section>

        <footer className="mt-16 border-t border-saffron-200 pt-8">
          <h3 className="text-lg font-semibold text-surface-900 mb-3">Continue exploring</h3>
          <ul className="space-y-1.5 text-sm">
            <li>· <Link href="/vedas" className="text-indigo-700 underline hover:text-indigo-900">The four Vedas</Link></li>
            <li>· <Link href="/upanishads" className="text-indigo-700 underline hover:text-indigo-900">The principal Upanishads</Link></li>
            <li>· <Link href="/gita" className="text-indigo-700 underline hover:text-indigo-900">Bhagavad Gita — chapter by chapter</Link></li>
            <li>· <Link href="/ramayana" className="text-indigo-700 underline hover:text-indigo-900">Ramayana</Link></li>
            <li>· <Link href="/mahabharata" className="text-indigo-700 underline hover:text-indigo-900">Mahabharata</Link></li>
            <li>· <Link href="/puranas" className="text-indigo-700 underline hover:text-indigo-900">The Puranas</Link></li>
            <li>· <Link href="/jyotirlinga" className="text-indigo-700 underline hover:text-indigo-900">Twelve Jyotirlingas</Link></li>
            <li>· <Link href="/shakti-peeth" className="text-indigo-700 underline hover:text-indigo-900">Shakta Peethas</Link></li>
            <li>· <Link href="/pujas" className="text-indigo-700 underline hover:text-indigo-900">Book a puja</Link> with a verified pandit</li>
            <li>· <Link href="/today" className="text-indigo-700 underline hover:text-indigo-900">Today's panchang and observances</Link></li>
          </ul>
          <p className="mt-6 text-xs text-surface-500">
            This pillar guide is an evergreen reference. It is reviewed and lightly updated as scholarship,
            interlinking and reader feedback warrant. Suggestions are welcome at content@darshya.online.
          </p>
        </footer>
      </article>
    </>
  );
}
