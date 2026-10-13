// R-Q3-M-014 — 10 hand-curated city+puja landing pages
// Founder action required: liturgical review esp. bhasma aarti timings, Ganga aarti slots
// before deploy. Hero images use placeholder /og fallback (see hero field).

export interface CityPuja {
  city: string; // slug e.g. "bengaluru"
  citydisplay: string; // "Bengaluru"
  puja: string; // slug e.g. "satyanarayan-puja"
  pujadisplay: string; // "Satyanarayan Puja"
  metaTitle: string; // <= 60 chars
  metaDescription: string; // 140-160 chars
  deity: string;
  templeName: string;
  templeContext: string; // 1-2 sentence local sthal significance
  scripturalBasis: string;
  intent: string;
  durationMinutes: number;
  samagri: string[];
  muhuratGuidance: string;
  priceInr: number;
  priceUsd: number;
  faqs: Array<{ q: string; a: string }>;
  relatedSlug: string; // cross-link to another city-puja from this set
  heroAlt: string;
  heroSrc: string; // placeholder until founder uploads
}

export const CITY_PUJAS: CityPuja[] = [
  {
    city: 'bengaluru',
    citydisplay: 'Bengaluru',
    puja: 'satyanarayan-puja',
    pujadisplay: 'Satyanarayan Puja',
    metaTitle: 'Satyanarayan Puja in Bengaluru — Pandit Booking',
    metaDescription:
      'Book pandits for Satyanarayan Puja in Bengaluru. Vedic ritual with samagri and video proof; prasad delivery is optional.',
    deity: 'Lord Vishnu (as Satyanarayan)',
    templeName: 'ISKCON Sri Radha Krishna Temple, Rajajinagar',
    templeContext:
      'Bengaluru is home to one of India\'s most architecturally celebrated Vishnu temples — the ISKCON Rajajinagar complex. Satyanarayan katha is a Purnima ritual long observed across South Indian Vaishnava households.',
    scripturalBasis:
      'Skanda Purana, Reva Khanda. The katha narrates how truthful worship of Satyanarayan delivers prosperity and family well-being.',
    intent:
      'Performed for fulfillment of vows, family harmony, removal of obstacles, and gratitude for blessings received.',
    durationMinutes: 90,
    samagri: [
      'Panchamrit (milk, curd, ghee, honey, sugar)',
      'Banana leaves and fresh fruits',
      'Rava (semolina) for prasad sheera',
      'Tulsi leaves, betel leaves, flowers',
      'Kalash, deepak, agarbatti, kapur',
    ],
    muhuratGuidance:
      'Best performed on Purnima (full moon) or any Sankranti. Morning brahma muhurat (4:00–6:00 AM) or evening pradosh kaal (sunset to 1.5 hours after) are ideal.',
    priceInr: 2100,
    priceUsd: 51,
    faqs: [
      {
        q: 'Do I need to be present in person?',
        a: 'No. Our pandit performs the puja at a temple or altar in Bengaluru and you receive video proof; prasad delivery is an optional add-on.',
      },
      {
        q: 'What language is the puja conducted in?',
        a: 'Sanskrit mantras with Hindi/Kannada/English explanation by the pandit on request.',
      },
      {
        q: 'When will I receive the prasad?',
        a: 'Prasad (sheera + tulsi + tilak) ships within 3–5 working days to any Indian address.',
      },
    ],
    relatedSlug: 'delhi/satyanarayan-puja',
    heroAlt: 'Satyanarayan Puja in Bengaluru — Vishnu altar with banana leaves',
    heroSrc: '/og/default.png',
  },
  {
    city: 'mumbai',
    citydisplay: 'Mumbai',
    puja: 'griha-pravesh',
    pujadisplay: 'Griha Pravesh',
    metaTitle: 'Griha Pravesh in Mumbai — Pandit Booking',
    metaDescription:
      'Book Griha Pravesh puja in Mumbai with Vedic pandits. Vastu shanti, navagraha, agni hotra. Authentic ritual with video proof.',
    deity: 'Ganesha, Vastu Purusha, Navagraha',
    templeName: 'Siddhivinayak Mandir, Prabhadevi',
    templeContext:
      'Mumbai\'s Siddhivinayak is among the most-visited Ganesha shrines in India. A Griha Pravesh begun under the auspices of Mumbai\'s Vighnaharta carries blessings of obstacle-free settling-in.',
    scripturalBasis:
      'Matsya Purana and Brihat Samhita. Griha Pravesh marks the transition of a structure from raw construction to a sanctified dwelling.',
    intent:
      'Performed before first occupancy of a new home to invoke Vastu Purusha, pacify navagraha, and consecrate the space for the family.',
    durationMinutes: 180,
    samagri: [
      'Coconuts (5–11), turmeric, kumkum',
      'Mango leaves toran, banana stems',
      'Kalash with sapta-dhanya (7 grains)',
      'Havan kund, samidha (palash wood), ghee',
      'Navagraha samidha bundles',
    ],
    muhuratGuidance:
      'Avoid Adhik maas, Chaturmas (devshayani to prabodhini ekadashi). Best months: Magha, Phalguna, Vaisakha, Jyestha. Consult /panchang for auspicious muhurat on your chosen date.',
    priceInr: 7500,
    priceUsd: 119,
    faqs: [
      {
        q: 'How long before move-in should Griha Pravesh be done?',
        a: 'Ideally on the morning of the first day of occupancy. The family enters the home for the first time as part of the ritual.',
      },
      {
        q: 'Is havan included?',
        a: 'Yes. Vastu shanti havan + navagraha havan are part of the standard package.',
      },
      {
        q: 'What about flats vs independent houses?',
        a: 'The ritual is identical. For flats, the puja is conducted in the living area with the main door as the sacred threshold.',
      },
    ],
    relatedSlug: 'ayodhya/ram-puja',
    heroAlt: 'Griha Pravesh ritual in Mumbai — kalash and toran at home entrance',
    heroSrc: '/og/default.png',
  },
  {
    city: 'delhi',
    citydisplay: 'Delhi',
    puja: 'satyanarayan-puja',
    pujadisplay: 'Satyanarayan Puja',
    metaTitle: 'Satyanarayan Puja in Delhi — Pandit Booking',
    metaDescription:
      'Book pandits for Satyanarayan Puja in Delhi NCR. Sanskrit-trained Vedic priests, samagri included, video proof, optional prasad delivery.',
    deity: 'Lord Vishnu (as Satyanarayan)',
    templeName: 'Akshardham / Birla Mandir',
    templeContext:
      'Delhi hosts two of North India\'s grandest Vaishnava complexes — Akshardham and the Lakshmi-Narayan Birla Mandir. Satyanarayan katha is observed widely across Punjabi, Marwari, and Bengali households of the NCR.',
    scripturalBasis:
      'Skanda Purana, Reva Khanda. Five chapters describe the merit of truthful worship of Vishnu as Satyanarayan.',
    intent:
      'Performed for fulfillment of vows, family harmony, removal of obstacles, and gratitude for blessings received.',
    durationMinutes: 90,
    samagri: [
      'Panchamrit (milk, curd, ghee, honey, sugar)',
      'Banana leaves and fresh fruits',
      'Rava (semolina) for prasad sheera',
      'Tulsi leaves, betel leaves, flowers',
      'Kalash, deepak, agarbatti, kapur',
    ],
    muhuratGuidance:
      'Best performed on Purnima (full moon) or any Sankranti. Morning brahma muhurat (4:00–6:00 AM) or evening pradosh kaal (sunset to 1.5 hours after) are ideal.',
    priceInr: 2100,
    priceUsd: 51,
    faqs: [
      {
        q: 'Do I need to be present in person?',
        a: 'No. Our pandit performs the puja at a temple or altar in Delhi and you receive video proof; prasad delivery is an optional add-on.',
      },
      {
        q: 'Can the puja be done at my home?',
        a: 'Yes — Delhi NCR home-visit pujas are available for an additional travel charge. Mention the address at checkout.',
      },
      {
        q: 'When will I receive the prasad?',
        a: 'Prasad (sheera + tulsi + tilak) ships within 3–5 working days to any Indian address.',
      },
    ],
    relatedSlug: 'bengaluru/satyanarayan-puja',
    heroAlt: 'Satyanarayan Puja in Delhi — Vishnu altar with panchamrit',
    heroSrc: '/og/default.png',
  },
  {
    city: 'varanasi',
    citydisplay: 'Varanasi',
    puja: 'rudrabhishek',
    pujadisplay: 'Rudrabhishek',
    metaTitle: 'Rudrabhishek in Varanasi — Pandit Booking',
    metaDescription:
      'Book Rudrabhishek at Kashi Vishwanath, Varanasi. Vedic pandits chant Rudra Suktam with abhishek of panchamrit on the Shivling. Video proof.',
    deity: 'Lord Shiva (as Rudra)',
    templeName: 'Kashi Vishwanath Mandir',
    templeContext:
      'Kashi Vishwanath is one of the 12 Jyotirlingas and the most sacred site in India for Shiva worship. A Rudrabhishek performed in Kashi is considered uniquely potent — Kashyam maranam muktih (release through death in Kashi, per Skanda Purana) and Kashi-darshan are central to the Shaivite tradition.',
    scripturalBasis:
      'Sri Rudram (Namakam-Chamakam) from the Krishna Yajurveda, Taittiriya Samhita 4.5 + 4.7. An Ekadasini Rudri consists of 11 recitations of the Namakam, each followed by one of the 11 Chamakam anuvakas in sequence.',
    intent:
      'Performed for liberation from chronic ailments, removal of pitra dosha, fulfillment of mahadasha periods, and moksha.',
    durationMinutes: 120,
    samagri: [
      'Panchamrit (milk, curd, ghee, honey, sugar) + Gangajal',
      'Bilva patra (108 minimum), white flowers',
      'Bhasma, vibhuti, chandan',
      'Black tila (sesame), akshat (unbroken rice)',
      'Dhatura (traditional offering, follow local laws), kapur, agarbatti',
    ],
    muhuratGuidance:
      'Best on Pradosh, Shivaratri, Sankranti, Somavati amavasya, or any Monday. Brahma muhurat (4:00–6:00 AM) at Kashi Vishwanath is most auspicious.',
    priceInr: 5100,
    priceUsd: 89,
    faqs: [
      {
        q: 'Is the puja performed inside the Kashi Vishwanath garbhagriha?',
        a: 'Sankalp is taken inside the sanctum where permitted by temple administration. Full abhishek is performed at an authorized altar nearby; video proof captures both.',
      },
      {
        q: 'How many recitations are included?',
        a: 'One full Rudri (Namakam + Chamakam). For Ekadasini (11x) or Laghu Rudra (121x), upgrade at checkout.',
      },
      {
        q: 'Will I get Gangajal back?',
        a: 'Yes — a small bottle of Gangajal from Dashashwamedh Ghat is included with the prasad parcel.',
      },
    ],
    relatedSlug: 'kashi/maha-mrityunjaya',
    heroAlt: 'Rudrabhishek at Kashi Vishwanath, Varanasi — Shivling with bilva patra',
    heroSrc: '/og/default.png',
  },
  {
    city: 'tirupati',
    citydisplay: 'Tirupati',
    puja: 'venkateswara-puja',
    pujadisplay: 'Venkateswara Puja',
    metaTitle: 'Venkateswara Puja in Tirupati — Pandit Booking',
    metaDescription:
      'Book Venkateswara puja with pandits in Tirupati. Govinda Govinda chanting, archana, laddu prasad. Authentic Tirumala ritual.',
    deity: 'Lord Venkateswara (Balaji)',
    templeName: 'Sri Venkateswara Swamy Temple, Tirumala',
    templeContext:
      'Tirumala Venkateswara Swamy Temple is the most-visited Hindu pilgrimage in the world, with daily darshan exceeding 50,000 devotees. The deity is a swayambhu (self-manifested) form of Vishnu.',
    scripturalBasis:
      'Venkatachala Mahatmyam (Skanda Purana) and the Venkateswara Suprabhatam composed by Sri Prativadi Bhayankaram Annan.',
    intent:
      'Performed for kuladevata blessings, debt repayment vows (Hundi seva tradition), business prosperity, marriage, and progeny.',
    durationMinutes: 60,
    samagri: [
      'Tulsi mala (108 beads), padmam (lotus)',
      'Sandalwood paste, akshat, kumkum',
      'Coconut, banana, ghee deepa',
      'Karpoor, dhoop, agarbatti',
      'Venkateswara Suprabhatam patha',
    ],
    muhuratGuidance:
      'Tirumala temple is open from 2:30 AM to 1:30 AM next day. Suprabhatam seva (3:00 AM) and Tomala seva (4:30 AM) are most auspicious; we book any seva slot on your behalf.',
    priceInr: 3100,
    priceUsd: 71,
    faqs: [
      {
        q: 'Will I receive Tirumala laddu?',
        a: 'Yes — two authentic Tirumala laddus (GI-tagged) ship with the prasad parcel within 5–7 days.',
      },
      {
        q: 'Can I sponsor a specific seva?',
        a: 'Yes. Archana, Sahasranamarchana, Kalyanotsavam, and Brahmotsavam slots can be requested; subject to TTD availability.',
      },
      {
        q: 'Is video proof allowed inside Tirumala?',
        a: 'Photography is restricted inside the garbhagriha. Our video proof covers sankalp, archana outside, and laddu offering.',
      },
    ],
    relatedSlug: 'vrindavan/krishna-puja',
    heroAlt: 'Venkateswara Puja at Tirumala, Tirupati — Balaji altar',
    heroSrc: '/og/default.png',
  },
  {
    city: 'haridwar',
    citydisplay: 'Haridwar',
    puja: 'ganga-aarti',
    pujadisplay: 'Ganga Aarti',
    metaTitle: 'Ganga Aarti in Haridwar — Pandit Sponsorship',
    metaDescription:
      'Sponsor Ganga Aarti at Har-ki-Pauri, Haridwar. Pandit chants Ganga Stotram, performs diya offering on your behalf. Video proof.',
    deity: 'Ganga Mata',
    templeName: 'Har-ki-Pauri Ghat',
    templeContext:
      'Har-ki-Pauri (literally "footstep of Hari/Vishnu") is the most sacred bathing ghat on the Ganga in Haridwar. The evening Ganga Aarti is performed at sunset daily and is one of India\'s most witnessed religious ceremonies.',
    scripturalBasis:
      'Ganga Stotram by Adi Shankaracharya, Ganga Sahasranama. The current-form Ganga Aarti at Har-ki-Pauri was instituted in 1916 by Pandit Madan Mohan Malaviya and has since been organised twice daily by Shri Ganga Sabha.',
    intent:
      'Performed for ancestral peace (pitra tarpan), self-purification, fulfillment of vows, and to honor the Ganga as mother.',
    durationMinutes: 45,
    samagri: [
      'Mahaaarti pradeep (multi-wick diya)',
      'Marigold and rose flowers',
      'Camphor, dhoop, agarbatti',
      'Akshat, kumkum, gangajal',
      'Tarpan vessels for ancestor offering',
    ],
    muhuratGuidance:
      'Evening aarti slot timings vary seasonally — approximately 6:00 PM (winter) to 7:00 PM (summer). Sponsorship slot is confirmed 48 hours in advance via Shri Ganga Sabha, the body that has governed the daily Mangala (sunrise) and Shringar (sunset) aartis at Har-ki-Pauri since 1916.',
    priceInr: 1100,
    priceUsd: 25,
    faqs: [
      {
        q: 'What exactly happens during sponsorship?',
        a: 'Your name and gotra are announced at sankalp before the aarti. Diya is offered to Ganga on your behalf with mantra recitation. Full video proof of the aarti is shared.',
      },
      {
        q: 'Can I do pitra tarpan as part of this?',
        a: 'Yes — add Pitra Tarpan at checkout. Pandit will perform tila-tarpan with your gotra and ancestor names before the evening aarti.',
      },
      {
        q: 'Will I receive Gangajal?',
        a: 'Yes — sealed Gangajal from Har-ki-Pauri ships with prasad within 5 working days.',
      },
    ],
    relatedSlug: 'ujjain/mahakaleshwar-bhasma-aarti',
    heroAlt: 'Ganga Aarti at Har-ki-Pauri Ghat, Haridwar — multi-wick diyas at sunset',
    heroSrc: '/og/default.png',
  },
  {
    city: 'ujjain',
    citydisplay: 'Ujjain',
    puja: 'mahakaleshwar-bhasma-aarti',
    pujadisplay: 'Mahakaleshwar Bhasma Aarti',
    metaTitle: 'Mahakaleshwar Bhasma Aarti, Ujjain — Booking',
    metaDescription:
      'Book Mahakaleshwar Bhasma Aarti seva in Ujjain. The pre-dawn 4 AM ritual where sacred ash is offered to the Jyotirlinga. Pandit coordination.',
    deity: 'Lord Mahakaleshwar (Shiva, Lord of Time)',
    templeName: 'Shri Mahakaleshwar Jyotirlinga',
    templeContext:
      'Mahakaleshwar at Ujjain is one of the 12 Jyotirlingas and is uniquely the only Shivling that faces south (Dakshinamukhi). The pre-dawn Bhasma Aarti — where consecrated ash is offered to the Lord — is performed only at this Jyotirlinga.',
    scripturalBasis:
      'Shiva Purana, Vidyeshwara Samhita. The Bhasma Aarti tradition is described in the Ujjayini Mahatmyam.',
    intent:
      'Performed for liberation from fear of time and death (Mahakala = Lord of Time), removal of grave doshas, and moksha.',
    durationMinutes: 120,
    samagri: [
      'Bhasma (sacred consecrated ash, provided by temple)',
      'Bilva patra (1008 minimum)',
      'Panchamrit + Gangajal + Kshipra jal',
      'Bhang, dhatura, akshat',
      'Vibhuti, rudraksha mala, kapur',
    ],
    muhuratGuidance:
      'Bhasma Aarti is performed daily at 4:00 AM (Brahma Muhurat). Slot booking requires advance reservation (typically 7–30 days ahead via temple administration). We coordinate the slot booking + on-ground pandit on your behalf.',
    priceInr: 8100,
    priceUsd: 149,
    faqs: [
      {
        q: 'Will I get the bhasma slot personally or remotely?',
        a: 'Both options. Sponsorship-only (pandit attends on your behalf with video) is the default. For in-person seating, mention dates at checkout and we attempt the slot via VIP seva booking.',
      },
      {
        q: 'What is the dress code for the inner sanctum?',
        a: 'Men: dhoti and sovala (no shirt). Women: traditional saree. For remote sponsorship, the pandit follows the dress code on your behalf.',
      },
      {
        q: 'Why is the timing 4 AM?',
        a: 'Brahma Muhurat (~96 minutes before sunrise) is considered the most spiritually potent window. Mahakaleshwar Bhasma Aarti is uniquely performed at this hour as per Vidyeshwara Samhita.',
      },
    ],
    relatedSlug: 'varanasi/rudrabhishek',
    heroAlt: 'Mahakaleshwar Bhasma Aarti at Ujjain Jyotirlinga at 4 AM',
    heroSrc: '/og/default.png',
  },
  {
    city: 'ayodhya',
    citydisplay: 'Ayodhya',
    puja: 'ram-puja',
    pujadisplay: 'Ram Puja',
    metaTitle: 'Ram Puja in Ayodhya — Pandit Booking',
    metaDescription:
      'Book Ram Puja at Ayodhya Ram Janmabhoomi with Vedic pandits. Sundarkand path, Ramraksha stotra, archana at Sri Ram Mandir. Video proof.',
    deity: 'Lord Sri Ram, Sita, Lakshman, Hanuman',
    templeName: 'Sri Ram Janmabhoomi Mandir',
    templeContext:
      'Ayodhya is the janmabhoomi of Sri Ram — one of the seven Mokshapuri (cities granting liberation) and central to the Ramayana tradition. The newly consecrated Ram Mandir (2024) makes Ayodhya among the most spiritually significant Vaishnava destinations in modern India.',
    scripturalBasis:
      'Valmiki Ramayana, Ramcharitmanas (Tulsidas), Ram Raksha Stotra (Budha Kaushika Rishi).',
    intent:
      'Performed for righteousness (dharma), family harmony, victory over adversity, and devotion (bhakti).',
    durationMinutes: 90,
    samagri: [
      'Tulsi mala, basil leaves',
      'Yellow flowers (gainda), banana',
      'Panchamrit, gangajal (Sarayu jal preferred)',
      'Akshat, kumkum, chandan',
      'Ramraksha and Sundarkand path books',
    ],
    muhuratGuidance:
      'Best on Ram Navami (Chaitra Shukla Navami), Vijayadashami, Diwali, or any Tuesday/Saturday (Hanuman days). Brahma muhurat or evening aarti time at the mandir.',
    priceInr: 3100,
    priceUsd: 71,
    faqs: [
      {
        q: 'Is the puja done inside the new Ram Mandir?',
        a: 'Archana is performed at an authorized altar in the mandir precincts. Full sankalp + path is done outside; both are captured in video proof.',
      },
      {
        q: 'Will Sundarkand be recited?',
        a: 'Yes — full Sundarkand (Tulsidas Ramcharitmanas, 60 dohas + chaupais) is included.',
      },
      {
        q: 'Sarayu jal in prasad?',
        a: 'Yes — sealed Sarayu river water + tulsi from Ayodhya temples included.',
      },
    ],
    relatedSlug: 'vrindavan/krishna-puja',
    heroAlt: 'Ram Puja at Sri Ram Janmabhoomi Mandir, Ayodhya',
    heroSrc: '/og/default.png',
  },
  {
    city: 'vrindavan',
    citydisplay: 'Vrindavan',
    puja: 'krishna-puja',
    pujadisplay: 'Krishna Puja',
    metaTitle: 'Krishna Puja in Vrindavan — Pandit Booking',
    metaDescription:
      'Book Krishna puja in Vrindavan at Banke Bihari, ISKCON, or Radha Raman. Pandits, abhishek with panchamrit, makhan-mishri prasad. Video proof.',
    deity: 'Lord Krishna (as Banke Bihari/Radha-Krishna)',
    templeName: 'Sri Banke Bihari Mandir',
    templeContext:
      'Vrindavan is the leela bhoomi of Sri Krishna — the woodland where the divine lila unfolded. Banke Bihari is the most visited Krishna shrine in Vrindavan, where Swami Haridas\'s ishta-deva self-manifested.',
    scripturalBasis:
      'Bhagavata Purana (Dashama Skanda), Brahma Samhita, Govinda Lilamrita, and Chaitanya Charitamrita.',
    intent:
      'Performed for bhakti, prema, removal of obstacles in marital harmony, progeny, and liberation through devotional surrender.',
    durationMinutes: 75,
    samagri: [
      'Makhan (white butter), mishri (rock sugar)',
      'Tulsi mala (108 beads minimum)',
      'Yamuna jal (or gangajal), panchamrit',
      'Peacock feather, flute (offerings)',
      'Yellow silk vastra, kumkum, akshat',
    ],
    muhuratGuidance:
      'Best on Janmashtami, Radha Ashtami, Govardhan Puja, Holi, any Wednesday, or shukla ekadashi. Mangla aarti at Banke Bihari is approximately 4:30 AM (summer) / 6:00 AM (winter); we book seva slots accordingly.',
    priceInr: 2100,
    priceUsd: 51,
    faqs: [
      {
        q: 'Will the puja be at Banke Bihari specifically?',
        a: 'Yes — by default at Banke Bihari. Radha Raman, ISKCON, and Prem Mandir are alternatives; mention at checkout.',
      },
      {
        q: 'Photography rules at Banke Bihari?',
        a: 'Photography of the deity is prohibited. Video proof covers sankalp, archana flow, and prasad offering outside the garbhagriha.',
      },
      {
        q: 'What\'s special about the makhan-mishri prasad?',
        a: 'It\'s Krishna\'s favorite naivedya per the Bhagavata. Authentic makhan-mishri ships with prasad parcel within 5 days.',
      },
    ],
    relatedSlug: 'tirupati/venkateswara-puja',
    heroAlt: 'Krishna Puja at Banke Bihari Mandir, Vrindavan',
    heroSrc: '/og/default.png',
  },
  {
    city: 'kashi',
    citydisplay: 'Kashi',
    puja: 'maha-mrityunjaya',
    pujadisplay: 'Maha Mrityunjaya Japa',
    metaTitle: 'Maha Mrityunjaya in Kashi — Pandit Booking',
    metaDescription:
      'Book Maha Mrityunjaya Mantra japa in Kashi. 1.25 lakh chants by Vedic pandits at Kashi Vishwanath. Healing, longevity, liberation. Video proof.',
    deity: 'Lord Shiva (as Mrityunjaya — Conqueror of Death)',
    templeName: 'Kashi Vishwanath Mandir',
    templeContext:
      'Kashi is the foremost Mokshapuri — where dying itself grants liberation. The Maha Mrityunjaya Mantra performed in Kashi is the most concentrated form of the ritual, traditionally counted in sava-lakh (1,25,000) japa for full effect.',
    scripturalBasis:
      'Rigveda 7.59.12 (Tryambakam Yajamahe sukta). Sage Markandeya is the traditional acharya of this mantra. Sapta-mahapuranas describe its potency in defeating Yama.',
    intent:
      'Performed for healing chronic and grave illness, longevity, removal of fear of death, akal mrityu nivaran, and moksha.',
    durationMinutes: 720, // 12 hours for sava-lakh by 11 pandits
    samagri: [
      'White flowers (jasmine, lotus)',
      'Bilva patra (1008+), tulsi',
      'Panchamrit + gangajal',
      'Black tila, akshat, vibhuti',
      'Mrityunjaya yantra, rudraksha kavach',
    ],
    muhuratGuidance:
      'Best on Maha Shivaratri, Pradosh, any Shravan Somvar, Sankashti Chaturthi. Japa typically begins at brahma muhurat and continues across the day; full sava-lakh requires 8–12 hours with 11 reciting pandits.',
    priceInr: 11000,
    priceUsd: 199,
    faqs: [
      {
        q: 'What does sava-lakh mean?',
        a: '1,25,000 (1.25 lakh) recitations of the Maha Mrityunjaya mantra. Traditional shastric prescription for serious health or longevity sankalp.',
      },
      {
        q: 'Can I customize the count?',
        a: 'Yes — 108, 1008, 10,000, 1,00,000, or sava-lakh tiers available. Mention at checkout. Default package is sava-lakh by 11 pandits.',
      },
      {
        q: 'Will the japa benefit a sick relative?',
        a: 'Yes — sankalp can be taken in the name of any person (sick relative, child, ancestor). Their gotra and full name are required.',
      },
    ],
    relatedSlug: 'varanasi/rudrabhishek',
    heroAlt: 'Maha Mrityunjaya Japa at Kashi Vishwanath — pandits with rudraksha mala',
    heroSrc: '/og/default.png',
  },
];

export const CITY_PUJA_SLUGS = CITY_PUJAS.map((p) => ({ city: p.city, puja: p.puja }));

export function getCityPuja(city: string, puja: string): CityPuja | undefined {
  return CITY_PUJAS.find((p) => p.city === city && p.puja === puja);
}
