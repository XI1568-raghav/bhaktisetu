export type AvatarYuga = 'satya' | 'treta' | 'dvapara' | 'kali' | 'future-kali';

export const YUGA_LABELS: Record<AvatarYuga, string> = {
  satya: 'Satya Yuga',
  treta: 'Treta Yuga',
  dvapara: 'Dvapara Yuga',
  kali: 'Kali Yuga',
  'future-kali': 'End of Kali Yuga (future)',
};

export const YUGA_ORDER: AvatarYuga[] = ['satya', 'treta', 'dvapara', 'kali', 'future-kali'];

export type Avatar = {
  number: number;
  slug: string;
  name: string;
  sanskrit: string;
  iast: string;
  yuga: AvatarYuga;
  form: string;
  purpose: string;
  demonOrThreat: string;
  weapons: string[];
  consort?: string;
  associatedTirthas: string[];
  storySummary: string;
  keyTeaching: string;
  principalScripture: string;
  modernRelevance: string;
  bestKnownFor: string;
};

export const DASHAVATAR: Avatar[] = [
  {
    number: 1,
    slug: 'matsya',
    name: 'Matsya',
    sanskrit: 'मत्स्य',
    iast: 'Matsya',
    yuga: 'satya',
    form: 'Fish — small at first, eventually filling the cosmic ocean',
    purpose: 'To rescue the Vedas and the seed of all life from the pralaya (cosmic deluge), and to slay the asura Hayagriva who had stolen the Vedas from Brahma.',
    demonOrThreat: 'Hayagriva — the asura who stole the Vedas from a sleeping Brahma',
    weapons: ['Shankha (conch)', 'Chakra (discus)', 'Massive fish-tail'],
    associatedTirthas: ['Tirumala (Sapta-rishi origin)', 'Prabhas Patan'],
    storySummary: 'King Manu, washing his hands at dawn, finds a tiny fish in his palms who begs protection. Each time Manu transfers the fish to a larger vessel — a jar, a pond, a lake, a river — the fish outgrows it. Finally Manu releases it into the ocean, where it reveals itself as Vishnu and instructs Manu to build a great boat. When the deluge comes, Manu, the seven rishis, the Vedas, and the seed of every creature board the boat; Matsya, now cosmic in size, ties the boat by its horn to Vasuki the serpent and tows them through the pralaya until the new creation begins. Meanwhile he slays the asura Hayagriva and restores the Vedas to Brahma.',
    keyTeaching: 'Even at the moment of cosmic dissolution, the dharma and the Veda are preserved — civilisation is never lost so long as the seed is protected.',
    principalScripture: 'Matsya Purana, Bhagavata Purana 8.24, Mahabharata Vana Parva',
    modernRelevance: 'The flood-and-survivor narrative — a king, a vessel, seven sages, and the seed of life — predates and parallels the Mesopotamian Atrahasis and the Biblical Noah by centuries in oral transmission, and is one of the world\'s oldest preserved deluge stories.',
    bestKnownFor: 'Saving the Vedas + the cosmic flood',
  },
  {
    number: 2,
    slug: 'kurma',
    name: 'Kurma',
    sanskrit: 'कूर्म',
    iast: 'Kūrma',
    yuga: 'satya',
    form: 'Tortoise — vast enough to bear Mount Mandara on his back',
    purpose: 'To serve as the cosmic pivot for the churning of the ocean of milk (samudra manthana), so that amrita and the lost treasures of the devas could be recovered.',
    demonOrThreat: 'The devas had lost their strength and immortality to a curse of Durvasa; they needed amrita.',
    weapons: ['His own back as a pivot', 'Shankha', 'Chakra'],
    associatedTirthas: ['Kurmai (Andhra)', 'Sri Kurmam temple, Srikakulam'],
    storySummary: 'Cursed by Durvasa, the devas had lost their immortality and were being defeated by the asuras. Vishnu instructed them to churn the ksheer sagara (ocean of milk) with Mount Mandara as the churning rod and Vasuki the serpent as the rope, with devas pulling one end and asuras the other. But as the churning began, the mountain began to sink. Vishnu took the form of a vast tortoise and slid beneath it, bearing the entire mountain on his back. From the churning emerged fourteen great treasures, culminating in Dhanvantari rising from the waters with the pot of amrita, the elixir of immortality.',
    keyTeaching: 'The greatest cosmic transformations require an unmoving foundation. Without a still centre, the churning destroys everything; with one, it produces amrita.',
    principalScripture: 'Kurma Purana, Bhagavata Purana 8.7–8, Vishnu Purana 1.9',
    modernRelevance: 'The samudra-manthana imagery — gods and demons pulling opposite ends, the still tortoise at the centre — is one of the most enduring symbols of dharmic cooperation across opposing forces, depicted in the iconic bas-relief at Angkor Wat.',
    bestKnownFor: 'Bearing Mount Mandara at the churning of the cosmic ocean',
  },
  {
    number: 3,
    slug: 'varaha',
    name: 'Varaha',
    sanskrit: 'वराह',
    iast: 'Varāha',
    yuga: 'satya',
    form: 'Cosmic boar — tusks long enough to lift the Earth',
    purpose: 'To rescue Bhumi-devi (Goddess Earth) from the depths of the cosmic ocean, where she had been dragged by the asura Hiranyaksha.',
    demonOrThreat: 'Hiranyaksha — the asura who stole the Earth and hid her at the bottom of the cosmic ocean',
    weapons: ['Tusks', 'Gada (mace)', 'Chakra'],
    consort: 'Bhumi-devi (Earth) — whom he rescues and marries',
    associatedTirthas: ['Sri Mushnam (Tamil Nadu)', 'Pushkar (Varaha temple)', 'Khajuraho (Lakshmi-Varaha)'],
    storySummary: 'Hiranyaksha, a great asura, dragged the Earth into the cosmic ocean and hid her at the bottom. Vishnu took the form of a colossal boar, dove into the waters, fought Hiranyaksha for a thousand divine years, and finally slew him. Then, lifting Bhumi-devi gently on his curved tusks, he raised her out of the waters and re-established her in cosmic space. The image of the gigantic boar carrying the small, recovered Earth on his tusk is one of the most powerful icons in Hindu sculpture, found from the Udayagiri caves to Khajuraho.',
    keyTeaching: 'The Earth, the support of all life, is divine and worthy of being rescued at any cost. The dharma is, in part, the protection of the planet itself.',
    principalScripture: 'Varaha Purana, Bhagavata Purana 3.13, Vishnu Purana 1.4',
    modernRelevance: 'The Varaha avatara is often invoked in contemporary Hindu environmental thought — the rescue of Bhumi-devi from being dragged into darkness as a paradigm for ecological responsibility.',
    bestKnownFor: 'Rescuing the Earth from the cosmic ocean',
  },
  {
    number: 4,
    slug: 'narasimha',
    name: 'Narasimha',
    sanskrit: 'नरसिंह',
    iast: 'Narasiṃha',
    yuga: 'satya',
    form: 'Half-man, half-lion — neither man nor beast, neither inside nor outside',
    purpose: 'To slay the asura Hiranyakashipu, who had received a boon that he could not be killed by man or beast, indoors or outdoors, by day or by night, on the ground or in the air, by any weapon — and to protect his devotee son Prahlada.',
    demonOrThreat: 'Hiranyakashipu — the asura king who forbade worship of Vishnu and tortured his own son Prahlada for refusing to renounce his devotion',
    weapons: ['Claws (no weapon, fulfilling the boon)', 'Sudarshana Chakra', 'Gada'],
    associatedTirthas: ['Ahobilam (Andhra) — the nine Narasimha kshetras', 'Simhachalam', 'Mangalagiri', 'Yadagirigutta'],
    storySummary: 'Hiranyakashipu, brother of Hiranyaksha, had won from Brahma an apparently airtight boon: he could not be killed by man or beast, by day or by night, indoors or outdoors, on the ground or in the air, by any weapon. Convinced of his immortality, he forbade all worship of Vishnu and demanded worship of himself. His own son Prahlada refused, devotedly worshipping Vishnu instead. After repeated failed attempts to kill the boy — by poison, by elephants, by fire — Hiranyakashipu in fury demanded "Where is your Vishnu? Show him in this pillar!" and struck the pillar. Vishnu burst forth as Narasimha — half-man, half-lion — seized Hiranyakashipu at twilight (neither day nor night), placed him on his lap (neither ground nor sky), at the threshold (neither indoors nor outdoors), and tore him apart with his claws (no weapon). Then he turned, calm, and blessed Prahlada.',
    keyTeaching: 'No clever legal boundary can outwit dharma. The protection of a true devotee is absolute.',
    principalScripture: 'Bhagavata Purana 7.2–10, Vishnu Purana 1.16–20, Narasimha Purana',
    modernRelevance: 'Narasimha is the chosen deity (ishta-devata) of many living traditions in Andhra and Karnataka. The story of Prahlada is read every year at Holika Dahan / Holi as the protective triumph of bhakti over tyranny.',
    bestKnownFor: 'Slaying Hiranyakashipu + protecting Prahlada',
  },
  {
    number: 5,
    slug: 'vamana',
    name: 'Vamana',
    sanskrit: 'वामन',
    iast: 'Vāmana',
    yuga: 'treta',
    form: 'Dwarf brahmana boy — who grew to cosmic stature in three steps',
    purpose: 'To humble the otherwise-righteous asura king Bali, who had through penance conquered the three worlds, and to restore them to Indra.',
    demonOrThreat: 'Bali — grandson of Prahlada, an otherwise extraordinarily generous and dharmic asura king who had become emperor of the three worlds',
    weapons: ['No weapon — only a request for three steps of land'],
    associatedTirthas: ['Trivikrama temple, Tirukkoyilur (Tamil Nadu)', 'Thrikkakara (Kerala) — where Onam is celebrated', 'Mahabaleshwar'],
    storySummary: 'Bali, grandson of Prahlada, had through unmatched tapasya become emperor of all three worlds, displacing even Indra. He was wise, generous, and devoted — but the cosmic order required Indra\'s restoration. Vishnu appeared at Bali\'s great yajna as a small brahmana boy, Vamana, and asked for the trivial gift of three steps of land — measured by his own small feet. Despite his guru Shukracharya\'s warning, Bali, who never refused a brahmana, agreed. Vamana then expanded into Trivikrama, his cosmic three-step form: one step covered the Earth, the second the heavens, and with no place left for the third, Bali offered his own head. Vishnu placed his foot upon Bali\'s head, pushing him into the netherworld of Patala — but, moved by Bali\'s devotion, blessed him to be the king there, and promised to be his door-keeper, and granted him one annual visit to his people. That visit is celebrated every year in Kerala as Onam.',
    keyTeaching: 'Even the most apparently insignificant request, granted in true generosity, can become cosmic. The ego of even a righteous king must yield to dharma.',
    principalScripture: 'Bhagavata Purana 8.15–23, Vamana Purana, Rigveda 1.154 (the original Trivikrama hymn)',
    modernRelevance: 'Onam — Kerala\'s most beloved festival — celebrates Bali\'s annual visit to his subjects every Chingam (Aug-Sep). Trivikrama iconography (one foot on Earth, one in heaven) appears in temples across Tamil Nadu and Southeast Asia.',
    bestKnownFor: 'The three steps of Trivikrama + Onam',
  },
  {
    number: 6,
    slug: 'parashurama',
    name: 'Parashurama',
    sanskrit: 'परशुराम',
    iast: 'Paraśurāma',
    yuga: 'treta',
    form: 'Brahmana warrior wielding a battle-axe (parashu) given to him by Shiva',
    purpose: 'To re-establish dharma when the kshatriya kings of the earth had become tyrannical, and to restore the balance between varnas.',
    demonOrThreat: 'The thousand-armed king Kartavirya Arjuna and the corrupted kshatriya order that had grown oppressive',
    weapons: ['Parashu (battle-axe) given by Shiva', 'Bow', 'Sword'],
    associatedTirthas: ['Konkan coast (said to be reclaimed from the sea by him)', 'Udupi, Gokarna', 'Chiplun (Maharashtra) — Parashurama Bhumi'],
    storySummary: 'Born to the rishi Jamadagni and Renuka, Parashurama studied weapons under Shiva and received from him the parashu (battle-axe) that gave him his name. When King Kartavirya Arjuna stole his father\'s wish-fulfilling cow Kamadhenu and later killed Jamadagni, Parashurama vowed to rid the earth of unrighteous kshatriya rule. According to the Bhagavata Purana he circled the earth twenty-one times, defeating tyrannical kings each round. Finally he gave the conquered earth to Kashyapa rishi, retreated to the Mahendra mountains, and is one of the seven chiranjivis (immortals) said to be alive even today. He also appears as a teacher to Bhishma, Drona, and Karna in the Mahabharata.',
    keyTeaching: 'When governance turns oppressive, even the brahmana must take up arms to restore dharma — but only with detachment, not with personal ambition.',
    principalScripture: 'Bhagavata Purana 9.15–16, Mahabharata, Brahmanda Purana',
    modernRelevance: 'Parashurama is considered the founding figure of the Konkan and Malabar coasts in Hindu tradition; his temples ring the western coastline from Gokarna to Kerala. As a chiranjivi, his presence is invoked in many living martial-arts and gurukula lineages.',
    bestKnownFor: 'The warrior-brahmana with the axe of Shiva',
  },
  {
    number: 7,
    slug: 'rama',
    name: 'Rama',
    sanskrit: 'राम',
    iast: 'Rāma',
    yuga: 'treta',
    form: 'Maryada purushottama — the ideal man, prince of Ayodhya',
    purpose: 'To slay the rakshasa-king Ravana of Lanka, who had abducted Sita and terrorised the rishis, and to demonstrate maryada — the perfect adherence to dharma in every relation.',
    demonOrThreat: 'Ravana — the ten-headed king of Lanka who abducted Sita',
    weapons: ['Kodanda (his great bow)', 'Brahmastra', 'Arrows blessed by Agastya'],
    consort: 'Sita — Lakshmi incarnate, daughter of King Janaka of Mithila',
    associatedTirthas: ['Ayodhya Ram Mandir', 'Chitrakoot', 'Panchavati (Nashik)', 'Rameswaram', 'Hampi (Kishkindha)'],
    storySummary: 'Born as the eldest son of King Dasharatha of Ayodhya, Rama was the maryada purushottama — the perfect man in every role: son, brother, husband, king, friend. His life is told in the Valmiki Ramayana across seven kandas. Exiled for fourteen years through filial duty, he wandered the forests with Sita and his brother Lakshmana. When Ravana abducted Sita, Rama, with the help of Hanuman, Sugriva, and the vanara army, built the bridge of stones to Lanka, slew Ravana in single combat, and recovered Sita. He returned to Ayodhya to be crowned king, inaugurating Rama Rajya — the legendary reign of perfect dharma. Of all the avataras he is the one most fully lived as a human being, with every human relationship rendered exemplary.',
    keyTeaching: 'Dharma is lived in relation. The perfect being is not the one who transcends duty but the one who performs every duty perfectly.',
    principalScripture: 'Valmiki Ramayana, Adhyatma Ramayana, Tulsidas Ramcharitmanas',
    modernRelevance: 'Ram Mandir at Ayodhya was consecrated in January 2024. Diwali every autumn celebrates Rama\'s return to Ayodhya. Rama Navami in spring marks his birth. He remains the central deity of devotional life across north India.',
    bestKnownFor: 'Maryada purushottama + the Ramayana',
  },
  {
    number: 8,
    slug: 'krishna',
    name: 'Krishna',
    sanskrit: 'कृष्ण',
    iast: 'Kṛṣṇa',
    yuga: 'dvapara',
    form: 'Purna avatara — the complete incarnation, in whom every divine attribute is present',
    purpose: 'To uphold dharma at the close of Dvapara Yuga, to slay the asura kings led by Kamsa and Jarasandha, to teach the Bhagavad Gita to Arjuna on the battlefield of Kurukshetra, and to inaugurate the path of unconditional bhakti.',
    demonOrThreat: 'Kamsa of Mathura, Jarasandha of Magadha, Shishupala, Narakasura, and the Kaurava adharma led by Duryodhana',
    weapons: ['Sudarshana Chakra', 'Kaumodaki gada', 'Panchajanya shankha', 'Sharanga bow'],
    consort: 'Rukmini, Satyabhama, and eight queens at Dwarka; Radha as eternal beloved at Vrindavan',
    associatedTirthas: ['Mathura (birthplace)', 'Vrindavan (childhood)', 'Govardhan', 'Dwarka', 'Kurukshetra (Gita)', 'Jagannath Puri', 'Udupi'],
    storySummary: 'Born to Devaki and Vasudeva in a Mathura prison at midnight on Janmashtami, Krishna was smuggled to Gokul where he was raised as the son of Nanda and Yashoda. His childhood lila in Vrindavan — stealing butter, dancing with the gopis, lifting Mount Govardhan — is the textual centre of north-Indian bhakti. As a youth he returned to Mathura, slew his uncle Kamsa, established his kingdom at Dwarka, and at the close of Dvapara Yuga stood at Kurukshetra as Arjuna\'s charioteer and spoke the seven-hundred-verse Bhagavad Gita, the most important single discourse in living Hindu thought. Vaishnava tradition regards him not as one avatara among many but as svayam bhagavan — God himself.',
    keyTeaching: 'Surrender every action, every fruit, every relationship to me — sarva-dharman parityajya mam ekam sharanam vraja. Bhakti is the highest yoga.',
    principalScripture: 'Bhagavad Gita, Bhagavata Purana (especially books 10–11), Mahabharata, Harivamsa',
    modernRelevance: 'The Bhagavad Gita is the single most widely-read Hindu text in modern times. Janmashtami, Holi (Krishna lila), and the Jagannath Rath Yatra are pan-Indian festivals. ISKCON has carried Krishna-bhakti to every continent.',
    bestKnownFor: 'The Bhagavad Gita + Krishna lila',
  },
  {
    number: 9,
    slug: 'buddha',
    name: 'Buddha',
    sanskrit: 'बुद्ध',
    iast: 'Buddha',
    yuga: 'kali',
    form: 'The Enlightened One — born as Prince Siddhartha Gautama of the Shakya clan',
    purpose: 'According to most Vaishnava puranas, Vishnu took the form of Buddha to teach compassion and to redirect humanity away from the misuse of Vedic ritual for harm. (Some Vaishnava traditions identify a different Buddha as the avatara, distinct from the historical Gautama.)',
    demonOrThreat: 'The misuse of yajna for animal sacrifice and the spread of dharmic ignorance in the Kali age',
    weapons: ['No weapons — only the dharma'],
    associatedTirthas: ['Lumbini (birth)', 'Bodh Gaya (enlightenment)', 'Sarnath (first sermon)', 'Kushinagar (parinirvana)'],
    storySummary: 'The Bhagavata Purana lists Buddha as the ninth avatara of Vishnu, born to Anjana in the Kikata region to teach ahimsa and compassion. In most living Vaishnava tradition this is identified with Siddhartha Gautama (c. 6th–5th century BCE), prince of the Shakyas, who renounced his kingdom, attained enlightenment under the Bodhi tree at Bodh Gaya, and taught the Four Noble Truths and the Eightfold Path for the next 45 years. Buddhism shares with Hinduism the doctrines of karma, rebirth, and moksha; Hindu tradition includes the Buddha as Vishnu\'s avatara in recognition of this shared dharma — though Buddhist tradition itself does not accept the Vaishnava identification.',
    keyTeaching: 'Sarvam dukkham — all conditioned existence is suffering. The cause is craving; the cessation is the eightfold path. Ahimsa is the foundation of true dharma.',
    principalScripture: 'Bhagavata Purana 1.3.24, Vishnu Purana 3.17–18, Gita Govinda of Jayadeva',
    modernRelevance: 'Roughly 500 million Buddhists worldwide. India remains the birthplace of Buddhism, with Bodh Gaya, Sarnath, Kushinagar, and Lumbini (Nepal) on the global pilgrimage circuit. The doctrine of ahimsa, sharpened by Buddha and carried through Jainism and Gandhi, has shaped global non-violence movements.',
    bestKnownFor: 'Ahimsa + the dharma of compassion',
  },
  {
    number: 10,
    slug: 'kalki',
    name: 'Kalki',
    sanskrit: 'कल्कि',
    iast: 'Kalki',
    yuga: 'future-kali',
    form: 'A rider on a white horse, wielding a flaming sword — yet to come at the end of Kali Yuga',
    purpose: 'To end the Kali Yuga, destroy adharma in its most extreme form, slay the demon-king Kali (not to be confused with the goddess), and inaugurate the next cycle by ushering in the new Satya Yuga.',
    demonOrThreat: 'Kali — the demonic personification of the present age — and the rulers who serve him',
    weapons: ['Flaming sword (Nandaka)', 'White horse (Devadatta)', 'Bow + arrows'],
    consort: 'Padma and Rama-devi (foretold)',
    associatedTirthas: ['Sambhal (foretold birthplace in U.P.)', 'Jagannath Puri'],
    storySummary: 'The Kalki avatara is the only one still to come. According to the Kalki Purana and Bhagavata Purana, when the Kali Yuga has descended into its final extremity — when dharma has thinned to one quarter of its full extent, when rulers serve only their own appetite, when the worship of the divine has all but vanished — Vishnu will incarnate as Kalki, son of the brahmana Vishnuyasha, in the village of Sambhal. Riding the white horse Devadatta with the flaming sword Nandaka, he will sweep across the earth, destroy the demonic Kali and all who serve adharma, and end this Kali Yuga. From his work the new Satya Yuga will be born, beginning the cycle again.',
    keyTeaching: 'Dharma cycles. No age of darkness, however long, is final. The same protective hand that has appeared nine times will appear again.',
    principalScripture: 'Kalki Purana, Bhagavata Purana 12.2, Vishnu Purana 4.24',
    modernRelevance: 'The Kalki avatara has been a powerful symbol across modern Hindu thought of cyclical renewal, ecological and civilisational reset, and the conviction that adharma is never final. A temple at Sambhal preserves the foretold birthplace.',
    bestKnownFor: 'The future avatara who will end Kali Yuga',
  },
];

export function avatarSlugs(): string[] {
  return DASHAVATAR.map((a) => a.slug);
}

export function getAvatar(slug: string): Avatar | undefined {
  return DASHAVATAR.find((a) => a.slug === slug);
}
