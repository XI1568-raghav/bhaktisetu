export interface SacredTree {
  slug: string;
  name: string;
  sanskrit: string;
  botanicalName: string;
  associatedDeity: string;
  deitySlug?: string;
  spiritualSignificance: string;
  uses: string[];
  legend: string;
  mantraIfAny?: string;
  plantingMuhurta: string;
  foundIn: string[];
}

export const SACRED_TREES: SacredTree[] = [
  {
    slug: 'peepal-ashvattha',
    name: 'Peepal',
    sanskrit: 'Ashvattha (अश्वत्थ)',
    botanicalName: 'Ficus religiosa',
    associatedDeity: 'Lord Vishnu',
    deitySlug: 'vishnu',
    spiritualSignificance:
      'The Bhagavad Gita (Chapter 10, verse 26) declares "Ashvatthah sarva-vrikshanam" — "Among all trees, I am the Ashvattha." Considered the most sacred tree in Sanatana Dharma, it is believed Brahma resides in its roots, Vishnu in the trunk, and Shiva in the leaves. Releases oxygen even at night, a trait long known to Vedic seers.',
    uses: [
      'Pradakshina (circumambulation) on Saturdays to relieve Shani dosha',
      'Bark and leaves used in traditional Ayurvedic preparations',
      'Leaves offered during Vishnu puja and shradh rituals',
      'Sacred thread tied around trunk for fulfillment of vows',
      'Branches used to kindle the homa-kunda fire in yajnas',
    ],
    legend:
      'Lord Krishna is said to have left His mortal body beneath a Peepal tree at Prabhasa Tirtha. The Skanda Purana narrates that Lakshmi resides in the Peepal on Saturdays, making Saturday parikrama especially auspicious.',
    mantraIfAny: 'मूलतो ब्रह्मरूपाय मध्यतो विष्णुरूपिणे। अग्रतः शिवरूपाय वृक्षराजाय ते नमः॥',
    plantingMuhurta: 'Akshaya Tritiya / Vat Savitri / Saturday during Pushya Nakshatra',
    foundIn: ['Across the Indian subcontinent', 'Nepal', 'Sri Lanka', 'Southeast Asia'],
  },
  {
    slug: 'banyan-vata',
    name: 'Banyan',
    sanskrit: 'Vata / Nyagrodha (वट)',
    botanicalName: 'Ficus benghalensis',
    associatedDeity: 'Lord Shiva (as Dakshinamurti) and Yama',
    deitySlug: 'shiva',
    spiritualSignificance:
      'The national tree of India, symbol of immortality and eternity due to its endless aerial roots. Lord Dakshinamurti — the silent teacher form of Shiva — is depicted seated under a Banyan imparting wisdom to the four Kumaras. The Vat Savitri vrata centers on married women circling the Banyan for their husbands\' longevity.',
    uses: [
      'Vat Savitri vrata — women tie sacred thread around trunk 108 times',
      'Aerial roots and bark used in traditional Ayurvedic formulations',
      'Shade and meditation seat for sadhus and ascetics',
      'Leaves used as natural plates (patravali) in temple bhojan',
      'Sacred grove (vana) at village centers for community gatherings',
    ],
    legend:
      'When the cosmic dissolution (pralaya) submerged the worlds, infant Krishna floated on a Banyan leaf across the cosmic ocean — Markandeya Rishi witnessed this vision. The tree is therefore called "Akshaya Vata" (imperishable Banyan), with a specimen at Prayagraj believed to be that very tree.',
    plantingMuhurta: 'Jyeshtha Purnima (Vat Savitri) / Margashirsha Shukla Pratipada',
    foundIn: ['India', 'Bangladesh', 'Pakistan', 'Sri Lanka', 'tropical Asia'],
  },
  {
    slug: 'bilva-bel',
    name: 'Bilva (Bel)',
    sanskrit: 'Bilva / Shriphala (बिल्व)',
    botanicalName: 'Aegle marmelos',
    associatedDeity: 'Lord Shiva',
    deitySlug: 'shiva',
    spiritualSignificance:
      'The trifoliate leaf of the Bilva represents the trinity — Brahma, Vishnu, Mahesh — and also the three eyes, three gunas, and trident of Shiva. No worship of Shiva is considered complete without offering Bilva patra. Goddess Lakshmi is said to reside in the Bilva tree, hence the name Shriphala ("fruit of Shri").',
    uses: [
      'Bilva patra offering during Shiva puja and Maha Shivaratri',
      'Fruit pulp used in traditional Ayurvedic digestive preparations',
      'Sacred bath water (abhisheka) collected from Bilva-shaded wells',
      'Wood used to carve Shiva linga and ritual implements',
      'Root paste used in Rudrabhishek samagri',
      'Leaves preserved between religious texts for sanctity',
    ],
    legend:
      'The Shiva Purana narrates that a hunter named Gurudruh, unknowingly fasting on Shivaratri, dropped Bilva leaves on a Shiva linga hidden beneath the tree while waiting for prey — earning instant moksha. This story is recited at every Shivaratri jagaran.',
    mantraIfAny: 'त्रिदलं त्रिगुणाकारं त्रिनेत्रं च त्रियायुधम्। त्रिजन्मपापसंहारं एकबिल्वं शिवार्पणम्॥',
    plantingMuhurta: 'Maha Shivaratri / Shravan Somvar / Pradosh Tithi',
    foundIn: ['Northern India', 'Nepal', 'Bangladesh', 'Myanmar', 'Sri Lanka'],
  },
  {
    slug: 'tulsi',
    name: 'Tulsi (Holy Basil)',
    sanskrit: 'Tulasi / Vrinda (तुलसी)',
    botanicalName: 'Ocimum sanctum',
    associatedDeity: 'Lord Vishnu (especially Krishna)',
    deitySlug: 'vishnu',
    spiritualSignificance:
      'Considered the earthly manifestation of the goddess Vrinda, eternal consort of Vishnu. Every Vaishnava household maintains a Tulsi vrindavan in the courtyard, worshipped daily at dusk with a ghee lamp. A single Tulsi leaf offered to Vishnu is said to outweigh gold in spiritual merit.',
    uses: [
      'Daily aarti and pradakshina around the Tulsi vrindavan',
      'Leaf placed in mouth of dying person to ensure peaceful passage',
      'Tulsi mala (108 beads) worn by Vaishnavas for japa',
      'Leaves added to charanamrita and panchamrita',
      'Traditional Ayurvedic immunity tonic preparations',
      'Tulsi Vivah ceremony marries Tulsi to Shaligram every Kartik Shukla Ekadashi',
    ],
    legend:
      'The Padma Purana relates that Vrinda, devoted wife of the asura Jalandhara, was deceived by Vishnu so that Shiva could slay her husband. In grief she immolated herself, and Vishnu transformed her ashes into the Tulsi plant, vowing she would forever stand beside Him in worship.',
    mantraIfAny: 'तुलसि श्रीसखि शुभे पापहारिणि पुण्यदे। नमस्ते नारदनुते नारायणमनःप्रिये॥',
    plantingMuhurta: 'Kartik Shukla Ekadashi (Tulsi Vivah) / Thursday morning',
    foundIn: ['Indian subcontinent', 'Southeast Asia', 'cultivated worldwide by Hindu households'],
  },
  {
    slug: 'neem-nimba',
    name: 'Neem',
    sanskrit: 'Nimba / Arishtha (निम्ब)',
    botanicalName: 'Azadirachta indica',
    associatedDeity: 'Goddess Durga (especially as Shitala and Mariamman)',
    spiritualSignificance:
      'Called "Arishtha" — the reliever of sickness. The Devi Mahatmya associates Neem with the cooling, protective aspect of the Mother Goddess. Temples of Shitala Devi and Mariamman are invariably shaded by a Neem, and the leaves are central to South Indian Ammavaru worship.',
    uses: [
      'Neem leaves hung at doorways during Chaitra Navratri and Ugadi',
      'Ugadi Pachadi mixes Neem flowers with jaggery (taste of life)',
      'Traditional Ayurvedic skin and oral health preparations',
      'Neem twigs used as natural datun (tooth-cleaning stick)',
      'Leaves placed under newborns and pox patients for protection',
      'Branches waved during Ammavaru processions in Tamil Nadu and Andhra',
    ],
    legend:
      'The goddess Mariamman is said to have manifested under a Neem tree at her primary shrine, and devotees believe the tree absorbs the heat of disease. The Skanda Purana narrates that when the asura Andhaka was slain, drops of his blood that fell beside a Neem became transformed into healing herbs.',
    plantingMuhurta: 'Chaitra Shukla Pratipada (Ugadi / Gudi Padwa) / Tuesday during Hasta Nakshatra',
    foundIn: ['Indian subcontinent', 'Africa', 'Caribbean', 'cultivated in tropical regions worldwide'],
  },
  {
    slug: 'ashoka',
    name: 'Ashoka',
    sanskrit: 'Ashoka (अशोक)',
    botanicalName: 'Saraca asoca',
    associatedDeity: 'Kamadeva and Goddess Sita',
    spiritualSignificance:
      'The name literally means "remover of sorrow" (a-shoka). One of the five arrows of Kamadeva, the god of love, is tipped with Ashoka blossoms. Sacred to Yakshinis in early Indian tradition — every Bharhut and Sanchi stupa depicts Yakshis embracing a flowering Ashoka.',
    uses: [
      'Flowers offered to Kamadeva on Vasant Panchami and Holi',
      'Traditional Ayurvedic preparations for womens wellness',
      'Bark decoction used in ritual purification baths',
      'Branches woven into wedding mandap toranas',
      'Flowers worn by brides during marriage ceremonies',
    ],
    legend:
      'The Ramayana narrates that Sita was held captive in the Ashoka Vatika of Lanka, where Hanuman first met her seated beneath the Ashoka tree. The tree is therefore considered a witness of devotion under duress, and its flowering in Chaitra symbolizes Sitas eventual reunion with Rama.',
    plantingMuhurta: 'Chaitra Shukla Navami (Ram Navami) / Vasant Panchami',
    foundIn: ['Western Ghats', 'Central India', 'Sri Lanka', 'Myanmar', 'Bangladesh'],
  },
  {
    slug: 'mango-amra',
    name: 'Mango',
    sanskrit: 'Amra / Chuta (आम्र)',
    botanicalName: 'Mangifera indica',
    associatedDeity: 'Lord Ganesha and Goddess Lakshmi',
    deitySlug: 'ganesha',
    spiritualSignificance:
      'Mango leaves (toranam) hung at every doorway are believed to invite Lakshmi and ward off negative energies. The fruit is the favorite of Lord Ganesha — depicted holding a mango in His lower right hand in many South Indian iconographies. Sacred fire pits (homa-kunda) are traditionally fuelled with mango wood for its sweet smoke.',
    uses: [
      'Mango-leaf toranam at doorways for festivals and weddings',
      'Wood used as samidha (sacrificial fuel) in homa and yajna',
      'Leaves placed on kalasha during sthapana rituals',
      'Five mango leaves arranged on coconut as Purnakumbha',
      'Fresh fruit offered to Ganesha during Ganesh Chaturthi',
      'Traditional Ayurvedic digestive preparations from raw fruit',
    ],
    legend:
      'The Skanda Purana narrates the famous contest between Ganesha and Kartikeya for a divine mango of immortality given by Narada to Parvati. Kartikeya circled the three worlds on his peacock, but Ganesha circumambulated his parents Shiva and Parvati, declaring them his universe — winning the mango and the wisdom-deity title.',
    plantingMuhurta: 'Akshaya Tritiya / Vaishakha Shukla Tritiya / Ashadha Purnima',
    foundIn: ['Indian subcontinent', 'Southeast Asia', 'cultivated across tropics worldwide'],
  },
  {
    slug: 'coconut-narikela',
    name: 'Coconut',
    sanskrit: 'Narikela / Shriphala (नारिकेल)',
    botanicalName: 'Cocos nucifera',
    associatedDeity: 'Goddess Lakshmi and Lord Vishnu',
    deitySlug: 'lakshmi',
    spiritualSignificance:
      'Called Shriphala ("fruit of Shri Lakshmi"). The three eyes of the coconut are said to represent the three eyes of Shiva. Offered to break before any auspicious beginning — its hard shell symbolizes the ego, the white kernel the purified mind, and the sweet water the bliss of self-realization.',
    uses: [
      'Broken before grihapravesh, vehicle puja, and business openings',
      'Placed atop kalasha with mango leaves as Purnakumbha',
      'Offered as naivedya to all deities during puja',
      'Coir used to weave sacred mats and ritual cords',
      'Oil pressed for diya lighting and traditional Ayurvedic abhyanga',
      'Half-shells used as cups for tarpana water offerings',
    ],
    legend:
      'When Vishvamitra wished to send King Trishanku bodily to heaven and Indra refused him entry, Vishvamitra began creating a new heaven and supporting it on a pole. To keep Trishanku from falling, he is said to have created the coconut palm as the substitute support — its tall straight trunk and triple-eyed fruit reflecting this celestial origin.',
    plantingMuhurta: 'Akshaya Tritiya / Karka Sankranti / Friday during Rohini Nakshatra',
    foundIn: ['Coastal India', 'Kerala', 'Karnataka', 'Goa', 'Andaman', 'Lakshadweep', 'Sri Lanka', 'Southeast Asia'],
  },
  {
    slug: 'banana-kadali',
    name: 'Banana (Plantain)',
    sanskrit: 'Kadali / Rambha (कदली)',
    botanicalName: 'Musa paradisiaca',
    associatedDeity: 'Lord Vishnu and Goddess Lakshmi',
    deitySlug: 'vishnu',
    spiritualSignificance:
      'Considered the most auspicious of cultivated plants. The Kadali stalk forms the central pillar of every wedding mandap. In Bengal, Kola Bou (the banana-bride) is wrapped in a red-bordered saree and worshipped alongside Ganesha during Durga Puja as Navapatrika — representing nine sacred plants embodying Durga.',
    uses: [
      'Stalks bound to mandap pillars at weddings and grihapravesh',
      'Leaves used as plates for prasad in South Indian temples',
      'Fruit offered as naivedya, especially on Thursdays to Vishnu',
      'Kola Bou worship on Maha Saptami of Durga Puja',
      'Stem fibres twisted into sacred cords (kaccha sutra)',
      'Pith used in traditional Ayurvedic urinary-system preparations',
    ],
    legend:
      'The Devi Bhagavata narrates that when goddess Parvati granted boons to ascetics, one rishi requested that she always remain near him in plant form. She manifested as the Kadali, whose every part — leaf, fruit, flower, stem, root — serves humanity, mirroring the all-giving nature of the Mother.',
    plantingMuhurta: 'Thursday during Pushya Nakshatra / Karthika Shukla Dwadashi',
    foundIn: ['Indian subcontinent', 'Southeast Asia', 'tropical Africa and Americas'],
  },
  {
    slug: 'sandalwood-chandana',
    name: 'Sandalwood',
    sanskrit: 'Chandana / Shrikhanda (चन्दन)',
    botanicalName: 'Santalum album',
    associatedDeity: 'All deities (universal tilak substance)',
    spiritualSignificance:
      'The fragrance of Chandana is said to be the only earthly scent that pleases all gods equally. Ground into paste with water on a stone slab, it forms the tilak applied at every puja. The cooling property of the wood is symbolic of the cooling of passions through bhakti — even when burnt, it perfumes the axe that fells it.',
    uses: [
      'Chandana tilak applied to deity and devotees during puja',
      'Paste smeared on the murti during abhisheka',
      'Incense and dhoop sticks made from heartwood',
      'Mala beads carved for japa, especially of Vishnu mantras',
      'Traditional Ayurvedic cooling preparations for skin',
      'Funeral pyre wood for the spiritually accomplished',
    ],
    legend:
      'The Mahabharata mentions Chandana as growing in abundance on the Malaya hills of South India, guarded by serpents whose cool bodies were drawn to the trees cooling sap. The Skanda Purana describes how the rishi Agastya carried Chandana saplings south from the Himalayas, planting them across the Western Ghats where they thrive to this day.',
    plantingMuhurta: 'Chaitra Shukla Pratipada / Akshaya Tritiya / Friday during Anuradha Nakshatra',
    foundIn: ['Karnataka (Mysuru)', 'Tamil Nadu (Nilgiris)', 'Kerala', 'Andhra Pradesh (Marayur)', 'parts of Australia'],
  },
  {
    slug: 'kadamba',
    name: 'Kadamba',
    sanskrit: 'Kadamba / Nipa (कदम्ब)',
    botanicalName: 'Neolamarckia cadamba',
    associatedDeity: 'Lord Krishna and Goddess Durga',
    deitySlug: 'krishna',
    spiritualSignificance:
      'The favorite tree of Lord Krishna — the Bhagavata Purana describes Him playing the flute beneath a Kadamba on the banks of the Yamuna, and stealing the clothes of the gopis from its branches. Goddess Meenakshi of Madurai is also called Kadambavanavasini ("She who dwells in the Kadamba forest"). The Sangam-era Pandya dynasty took the Kadamba as their emblem.',
    uses: [
      'Flowers offered to Krishna during Janmashtami and Radhashtami',
      'Wood used to carve flutes (venu) for Krishna worship',
      'Branches used in Madurai Meenakshi temple processions',
      'Leaves used as ritual seat (asana) during Vaishnava meditation',
      'Flowers strung into garlands for Durga during Navaratri',
    ],
    legend:
      'The Bhagavata describes the Kaliya-mardana lila — Krishna climbed a Kadamba overhanging the poisoned Yamuna pool and leapt into the water to subdue the serpent Kaliya. The very tree, though scorched by the venom, is said to have miraculously survived as a witness to the divine play, marking the site of Kaliya Daha at Vrindavan.',
    plantingMuhurta: 'Bhadrapada Krishna Ashtami (Janmashtami) / Shravan Purnima',
    foundIn: ['Indian subcontinent', 'Sri Lanka', 'Southeast Asia', 'southern China'],
  },
  {
    slug: 'palash',
    name: 'Palash (Flame of the Forest)',
    sanskrit: 'Palasha / Kimshuka (पलाश)',
    botanicalName: 'Butea monosperma',
    associatedDeity: 'Lord Brahma and Agni',
    deitySlug: 'brahma',
    spiritualSignificance:
      'The trifoliate leaf of the Palash is said to embody the trimurti — Brahma in the central leaflet, Vishnu in the left, Shiva in the right. The Atharva Veda mentions Palasha wood as the most potent samidha for yajna. The brilliant orange-red blossom that paints the forest in Phalguna gives it the name "Flame of the Forest" and ties it to Holi celebrations.',
    uses: [
      'Wood used as samidha in upanayana and other samskara homas',
      'Leaves stitched into pattal-donas (eco-plates and cups) for prasad',
      'Flowers ground into natural Holi gulal (saffron-orange pigment)',
      'Bark used in traditional Ayurvedic preparations',
      'Wood used for crafting Brahmacharin danda at thread ceremony',
      'Flowers offered to Saraswati during Vasant Panchami',
    ],
    legend:
      'The Matsya Purana narrates that when Brahma performed the first cosmic yajna, the gods needed sacred fuel that would carry oblations directly to the devas. Agni manifested the Palash from the cosmic waters, its flame-orange flowers being the visible form of fire itself — hence every Vedic homa to this day uses Palash samidha.',
    plantingMuhurta: 'Vasant Panchami / Phalguna Purnima (Holi) / Sunday during Magha Nakshatra',
    foundIn: ['Central India', 'Madhya Pradesh', 'Chhattisgarh', 'Jharkhand', 'Odisha', 'Nepal', 'Myanmar'],
  },
];

export function sacredTreeSlugs(): string[] {
  return SACRED_TREES.map((t) => t.slug);
}

export function getSacredTree(slug: string): SacredTree | undefined {
  return SACRED_TREES.find((t) => t.slug === slug);
}
