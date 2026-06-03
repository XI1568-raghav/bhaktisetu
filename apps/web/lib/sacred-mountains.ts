// 10 sacred mountains of Hindu cosmology + geography. Distinct intent from /tirth
// (temple destinations) and /pilgrimage (multi-stop circuits). Targets long-tail
// "{mountain} parikrama", "{mountain} darshan", "{mountain} height", "{mountain} legend".

export type MountainAccess = 'vehicle' | 'trek' | 'spiritual-only';

export interface SacredMountain {
  slug: string;
  name: string;
  sanskrit: string;
  height: number | null;
  location: string;
  associatedDeity: string;
  deitySlug?: string;
  significance: string;
  pilgrimRoute: string;
  bestSeason: string;
  modernAccess: MountainAccess;
  legend: string;
  nearbyTirthas: string[];
  templeAtSummit?: string;
}

export const SACRED_MOUNTAINS: SacredMountain[] = [
  {
    slug: 'kailash',
    name: 'Mount Kailash',
    sanskrit: 'कैलाश',
    height: 6638,
    location: 'Kailash Range, Tibet Autonomous Region (China)',
    associatedDeity: 'Shiva (eternal abode)',
    deitySlug: 'shiva',
    significance:
      'Considered the eternal seat of Lord Shiva and Parvati per Shiva Purana and Skanda Purana. Also sacred to Buddhists (as Mount Meru), Jains (Ashtapada — site of Rishabhadeva\'s liberation), and Bon practitioners.',
    pilgrimRoute: 'Kailash Mansarovar Parikrama — 52 km outer kora over 3 days, starting at Darchen, crossing Dolma La pass at 5,650 m. No one climbs the peak.',
    bestSeason: 'May–September (Indian govt yatra batches via Lipulekh + Nathu La)',
    modernAccess: 'trek',
    legend:
      'Per Shiva Purana, Kailash is the cosmic axis where Shiva sits in eternal samadhi with Parvati. Ravana once attempted to lift the mountain — Shiva pressed it down with his toe, pinning him until he chanted the Shiva Tandava Stotram.',
    nearbyTirthas: ['mansarovar', 'rakshastal', 'gauri-kund-kailash'],
  },
  {
    slug: 'govardhan',
    name: 'Govardhan Hill',
    sanskrit: 'गोवर्धन',
    height: 80,
    location: 'Govardhan, Mathura district, Uttar Pradesh',
    associatedDeity: 'Krishna (Giriraj-ji — the hill itself is worshipped)',
    deitySlug: 'krishna',
    significance:
      'Lifted by 7-year-old Krishna on his little finger for seven days to shelter Vrindavan from Indra\'s rains, per Bhagavata Purana 10.25. The hill is itself a form of Krishna (Giriraj) and is circumambulated, never climbed.',
    pilgrimRoute: 'Govardhan Parikrama — 21 km barefoot circumambulation starting at Manasi Ganga; dandavat parikrama (full prostration every step) takes 7–14 days.',
    bestSeason: 'October–March; peak on Govardhan Puja (day after Diwali) and Guru Purnima',
    modernAccess: 'spiritual-only',
    legend:
      'When Indra unleashed seven days of torrential rain to punish Vraja for stopping his annual yajna, young Krishna lifted Govardhan as a giant umbrella, sheltering all of Vrindavan, its cows and people, until Indra surrendered.',
    nearbyTirthas: ['vrindavan-banke-bihari', 'mathura-krishna-janmabhoomi', 'radha-kund'],
    templeAtSummit: 'Mukharvind temple (Krishna\'s mouth) at Anyor village',
  },
  {
    slug: 'arunachala-thiruvannamalai',
    name: 'Arunachala',
    sanskrit: 'अरुणाचल',
    height: 814,
    location: 'Thiruvannamalai, Tamil Nadu',
    associatedDeity: 'Shiva (as the Agni Lingam — fire element of Pancha Bhoota)',
    deitySlug: 'shiva',
    significance:
      'Considered Shiva himself in the form of a hill — the Agni (fire) Lingam of the Pancha Bhoota Sthalams. Sri Ramana Maharshi declared it the most sacred of all sthalas; his samadhi sits at its foot.',
    pilgrimRoute: 'Giri Pradakshina — 14 km barefoot circumambulation, traditionally on full-moon nights (Pournami Giri Valam). Over a million devotees walk on Karthigai Deepam.',
    bestSeason: 'November–February; peak on Karthigai Deepam (Nov–Dec) when a massive flame is lit at the summit',
    modernAccess: 'spiritual-only',
    legend:
      'Brahma and Vishnu argued over supremacy; Shiva appeared as an infinite column of fire (Jyotirstambha) at Arunachala. Vishnu (as boar) dug downward and Brahma (as swan) flew upward — neither found the end, ending their dispute.',
    nearbyTirthas: ['arunachaleshwar-thiruvannamalai', 'ramana-ashram', 'sri-seshadri-swamigal-ashram'],
    templeAtSummit: 'Karthigai Deepam jyoti pit (lit annually); no permanent temple at summit — Arunachaleshwarar Temple sits at the foot',
  },
  {
    slug: 'tirumala-seven-hills',
    name: 'Tirumala (Seven Hills)',
    sanskrit: 'तिरुमला सप्तगिरी',
    height: 853,
    location: 'Chittoor district, Andhra Pradesh',
    associatedDeity: 'Venkateshwara (form of Vishnu — Balaji)',
    deitySlug: 'vishnu',
    significance:
      'The Sapta Giri (Seven Hills) — Seshachalam, Neeladri, Garudadri, Anjanadri, Vrishabhadri, Narayanadri, Venkatadri — are considered the seven hoods of Adisesha. Tirumala Tirupati Devasthanam (TTD) is the wealthiest temple trust in the world.',
    pilgrimRoute: 'Sopanam — traditional 11 km / 3,550-step ascent from Alipiri (now optional alongside bus / car ghat road). Devotees often climb barefoot as a vow.',
    bestSeason: 'September–March; peak during Brahmotsavam (September–October)',
    modernAccess: 'vehicle',
    legend:
      'Lord Venkateshwara is said to be repaying a loan taken from Kubera for his wedding to Padmavati — devotees offer hundi donations to help clear this eternal debt. The temple receives ₹3,000+ crore annually.',
    nearbyTirthas: ['tirumala-venkateshwara-temple', 'tiruchanur-padmavathi', 'kanipakam-vinayaka'],
    templeAtSummit: 'Sri Venkateshwara Swamy Temple — sits on Venkatadri, the 7th hill',
  },
  {
    slug: 'vindhya',
    name: 'Vindhya Range',
    sanskrit: 'विन्ध्य',
    height: 752,
    location: 'Spans Gujarat, Madhya Pradesh, Uttar Pradesh, Bihar (central India)',
    associatedDeity: 'Vindhyavasini Devi (Shakti — one of the 51 Shakti Peeths)',
    deitySlug: 'durga',
    significance:
      'Per Markandeya Purana, the Vindhyas are the natural divider between Aryavarta (north) and Dakshinapatha (south). The range is personified as a male deity who once challenged the Sun\'s circumambulation.',
    pilgrimRoute: 'Vindhyachal Trikon Parikrama — 8 km Mirzapur (UP) circuit covering Vindhyavasini, Ashtabhuja, and Kali Khoh temples. Peak during Navaratri.',
    bestSeason: 'October–March; peak during both Chaitra and Sharad Navaratri',
    modernAccess: 'vehicle',
    legend:
      'When Vindhya grew jealous of Meru and rose to block the Sun\'s path, Sage Agastya asked the mountain to bow until he returned from the south — Agastya never returned, and Vindhya remains bowed to this day.',
    nearbyTirthas: ['vindhyavasini-mirzapur', 'kashi-vishwanath', 'chitrakoot'],
  },
  {
    slug: 'nilgiri',
    name: 'Nilgiri Hills',
    sanskrit: 'नीलगिरि',
    height: 2637,
    location: 'Tamil Nadu / Karnataka / Kerala tri-junction (Western Ghats)',
    associatedDeity: 'Subrahmanya (Murugan) — particularly at Ooty\'s Elk Hill Murugan temple',
    deitySlug: 'kartikeya',
    significance:
      'Mentioned in the Ramayana as the abode where Hanuman searched for the Sanjivani herb. Home to the Toda tribe whose Mund temples preserve pre-Vedic pastoral religion. UNESCO Biosphere Reserve since 1986.',
    pilgrimRoute: 'No formal parikrama. Sacred sites circuit: Mukurthi Peak (Toda afterlife passage) → Doddabetta → Elk Hill Murugan → Karikkiyoor rock-art (3,000 BCE).',
    bestSeason: 'October–May; Kurinji flowering once every 12 years (next 2030) draws lakhs',
    modernAccess: 'vehicle',
    legend:
      'When Hanuman flew to fetch Sanjivani for Lakshmana, he could not identify the herb and lifted the entire Dronagiri peak — pieces are said to have fallen across the Nilgiris, accounting for its rare medicinal flora.',
    nearbyTirthas: ['mukurthi-peak', 'doddabetta', 'karikkiyoor-rock-art'],
  },
  {
    slug: 'mahendragiri',
    name: 'Mahendragiri',
    sanskrit: 'महेन्द्रगिरि',
    height: 1501,
    location: 'Gajapati district, Odisha (Eastern Ghats)',
    associatedDeity: 'Parashurama (6th avatar of Vishnu) — eternal abode',
    deitySlug: 'vishnu',
    significance:
      'Per Mahabharata and Brahma Purana, Parashurama retired here after annihilating 21 generations of kshatriyas. The summit holds a Parashurama temple and four Pandava-era shrines (Yudhishthira, Bhima, Arjuna, Sahadeva).',
    pilgrimRoute: 'Mahendragiri Yatra — 8 km trek from Burakhanda base village through dense Eastern Ghats forest. Peak on Chaitra Purnima (March–April).',
    bestSeason: 'October–March (monsoon makes trail dangerous)',
    modernAccess: 'trek',
    legend:
      'After exterminating the corrupt warrior class 21 times, Parashurama hurled his blood-soaked axe into the sea, creating the Konkan coast. Krishna, in the Mahabharata, sent the Pandavas here so Bhima could meet Hanuman (his elder brother by Vayu).',
    nearbyTirthas: ['gandhamardan-parvat', 'taptapani', 'chandragiri-tibetan-monastery'],
    templeAtSummit: 'Parashurama temple + four Pandava shrines (12th-century Eastern Ganga architecture)',
  },
  {
    slug: 'palani-hills',
    name: 'Palani Hills',
    sanskrit: 'पलनी मलै',
    height: 2069,
    location: 'Dindigul district, Tamil Nadu (Palani town at foothill)',
    associatedDeity: 'Murugan (Bala Dandayudhapani) — 3rd of the Arupadai Veedu (Six Abodes)',
    deitySlug: 'kartikeya',
    significance:
      'Per Kanda Puranam, Murugan stormed off here after Shiva gave the divine fruit of wisdom to his brother Ganesha. Took the form of a renunciate (Dandayudhapani — staff-bearer) atop Palani — one of the holiest Murugan sites in Tamil Shaivism.',
    pilgrimRoute: 'Sopanam — 670-step ascent (or rope-car / electric winch). Kavadi Attam during Thai Poosam: lakhs walk barefoot from across Tamil Nadu carrying decorated arches.',
    bestSeason: 'October–February; peak on Thai Poosam (January–February) when 2M+ devotees converge',
    modernAccess: 'vehicle',
    legend:
      'When Narada presented a divine mango to Shiva to give to whichever son first circled the world, Ganesha walked around his parents (his world) and won. Murugan, in protest, came to Palani and adopted the renunciate form — "Pazham Nee" (you are the fruit) — origin of the name Palani.',
    nearbyTirthas: ['palani-dandayudhapani-temple', 'kodaikanal', 'thirupparamkundram'],
    templeAtSummit: 'Arulmigu Dhandayuthapani Swamy Temple — Murugan as renunciate with staff',
  },
  {
    slug: 'parashuram-kund-mtn',
    name: 'Parashuram Kund Hills (Brahmakund)',
    sanskrit: 'परशुराम कुण्ड',
    height: 730,
    location: 'Lohit district, Arunachal Pradesh (Eastern Himalayas)',
    associatedDeity: 'Parashurama (6th avatar of Vishnu)',
    deitySlug: 'vishnu',
    significance:
      'Per Kalika Purana, Parashurama killed his mother Renuka at his father Jamadagni\'s command; the axe stuck to his hand in matricide-curse. He bathed at this kund formed where his axe finally fell, and the curse lifted — water washed the axe clean.',
    pilgrimRoute: 'Makar Sankranti Mela (14 January): 70,000+ pilgrims trek down 200 steps to bathe at the kund formed on the Lohit river. Bharali Tirtha 8 km circuit covers nearby cave shrines.',
    bestSeason: 'November–February (Makar Sankranti is the singular peak); monsoon closes road access',
    modernAccess: 'trek',
    legend:
      'Parashurama, having beheaded his mother on Jamadagni\'s order to test obedience, was rewarded any boon — he asked her resurrection. But his axe remained fused to his hand as karmic residue. Bathing at this kund finally dissolved the curse, marking the only tirtha where Parashurama himself was freed.',
    nearbyTirthas: ['tezu', 'wakro-tea-estates', 'glow-lake'],
  },
  {
    slug: 'mount-meru-cosmic',
    name: 'Mount Meru (Sumeru)',
    sanskrit: 'सुमेरु / मेरु',
    height: null,
    location: 'Cosmic axis at the centre of Jambudvipa (Puranic cosmology, not a geographic peak)',
    associatedDeity: 'Brahma (creator — seat atop summit), surrounded by lokas of all devas',
    significance:
      'Cosmological description from Puranas, not a single geographic peak. Per Vishnu Purana, Bhagavata Purana, and Surya Siddhanta, Meru is the axis mundi — 84,000 yojanas tall, with the Sun, Moon, and stars revolving around it. Its summit holds Brahmaloka; its four faces are gold, silver, sapphire, and ruby.',
    pilgrimRoute: 'Symbolic only — physical surrogates include Mount Kailash (Shaiva), Sumeru Parvat near Badrinath (Vaishnava), and Mahameru yantras used in tantric worship. Hindu, Jain, and Buddhist temple architecture (sikhara, stupa, pagoda) all model Meru.',
    bestSeason: 'N/A — meditative/symbolic worship year-round',
    modernAccess: 'spiritual-only',
    legend:
      'During Samudra Manthan, devas and asuras used Mount Mandara (a slope of Meru) as the churning rod and Vasuki the serpent as the rope — churning the Kshira Sagara to extract amrita. Vishnu took the Kurma (tortoise) avatar to support Mandara from sinking.',
    nearbyTirthas: ['mansarovar', 'badrinath', 'sumeru-parvat-uttarakhand'],
  },
];

export const sacredMountainSlugs = (): string[] => SACRED_MOUNTAINS.map((m) => m.slug);

export const getSacredMountain = (slug: string): SacredMountain | undefined =>
  SACRED_MOUNTAINS.find((m) => m.slug === slug);
