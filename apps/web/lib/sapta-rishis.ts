export type Rishi = {
  number: number;
  slug: string;
  name: string;
  sanskrit: string;
  iast: string;
  gotra: string;
  associatedStar: string;
  associatedStarBayer: string;
  consort: string;
  principalSons: string[];
  presidingDeity: string;
  vedaContribution: string;
  hymnsCount?: string;
  rishiOfMandala?: string;
  associatedTirthas: string[];
  storySummary: string;
  keyTeaching: string;
  principalScriptures: string[];
  modernRelevance: string;
  bestKnownFor: string;
};

export const SAPTA_RISHIS: Rishi[] = [
  {
    number: 1,
    slug: 'atri',
    name: 'Atri',
    sanskrit: 'अत्रि',
    iast: 'Atri',
    gotra: 'Atreya',
    associatedStar: 'Megrez (delta Ursae Majoris)',
    associatedStarBayer: 'delta UMa',
    consort: 'Anasuya (one of the great pativratas)',
    principalSons: ['Dattatreya (incarnation of Brahma-Vishnu-Shiva)', 'Durvasa', 'Soma (the moon)'],
    presidingDeity: 'Soma + Agni + Indra (Atri family deities)',
    vedaContribution: 'Rishi of the 5th mandala of the Rigveda (Atri mandala), composer of ~87 sukta',
    hymnsCount: '~87 sukta',
    rishiOfMandala: 'Rigveda Mandala 5',
    associatedTirthas: ['Atri ashrama (Chitrakoot, U.P.)', 'Atri kund (Kurukshetra)', 'Mahur (Maharashtra)'],
    storySummary: 'Atri is one of the original mind-born sons of Brahma and one of the seven rishis seated in the constellation Ursa Major. With his wife Anasuya — celebrated as one of the supreme pativratas of dharma — he kept an ashrama at Chitrakoot, where Rama, Sita, and Lakshmana visited during their forest exile. The trimurti themselves came to test Anasuya; when she fulfilled their condition, they became her sons in the form of Dattatreya, Durvasa, and Soma. Atri is the rishi of Rigveda Mandala 5, the Atri mandala, and his descendants — the Atreyas — became one of the great gotras still active in present-day brahmana lineages.',
    keyTeaching: 'Dharma + pativrata. The Atri household demonstrates that the spiritual power of a household (grihastha) is no less than that of a renunciate — when sustained by truth and devotion.',
    principalScriptures: ['Rigveda Mandala 5', 'Atri Smriti', 'Atri Samhita', 'Ramayana Aranya Kanda 11'],
    modernRelevance: 'The Atreya gotra remains one of the most widespread brahmana gotras. Atri ashrama at Chitrakoot is still active as a pilgrim site associated with the Rama-vanavasa, and the Mahur shrine in Maharashtra is one of the principal Dattatreya kshetras.',
    bestKnownFor: 'Father of Dattatreya + rishi of Rigveda Mandala 5',
  },
  {
    number: 2,
    slug: 'bharadvaja',
    name: 'Bharadvaja',
    sanskrit: 'भरद्वाज',
    iast: 'Bharadvāja',
    gotra: 'Bharadvaja',
    associatedStar: 'Mizar (zeta Ursae Majoris)',
    associatedStarBayer: 'zeta UMa',
    consort: 'Susheela',
    principalSons: ['Dronacharya (guru of the Pandavas and Kauravas)', 'Garga'],
    presidingDeity: 'Agni + Indra + Brihaspati',
    vedaContribution: 'Rishi of the 6th mandala of the Rigveda (Bharadvaja mandala), composer of ~75 sukta',
    hymnsCount: '~75 sukta',
    rishiOfMandala: 'Rigveda Mandala 6',
    associatedTirthas: ['Bharadvaja ashrama (Prayagraj/Allahabad)', 'Bharadvaj-rishi cave (Almora)'],
    storySummary: 'Bharadvaja, son of Brihaspati, is the great rishi of medicine, statecraft, and the science of war. He kept his ashrama at the sangam of the Ganga and Yamuna at Prayagraj, where Bharata, returning from Ayodhya in search of Rama, was hosted with the splendour of all the celestial cooks. To Bharadvaja are credited the foundational works on Ayurveda (the Bharadvaja Samhita), on dhanurveda (the science of weapons), and the Yantra Sarvasva, a remarkable Sanskrit text on mechanical and aerial devices. His son Drona became the teacher of an entire generation of Kuru princes. Bharadvaja is the rishi of Rigveda Mandala 6, the Bharadvaja mandala.',
    keyTeaching: 'A rishi is not only a contemplative — he is the original physician, engineer, and strategist. The Vedic rishi is a complete man whose realisation extends to every applied science.',
    principalScriptures: ['Rigveda Mandala 6', 'Bharadvaja Samhita (Ayurveda)', 'Dhanurveda', 'Yantra Sarvasva', 'Ramayana Ayodhya Kanda 90-91'],
    modernRelevance: 'The Bharadvaja gotra is the largest brahmana gotra in India by population. His ashrama site at Prayagraj has been continuously occupied for at least 2,500 years and remains a key Kumbh Mela kshetra.',
    bestKnownFor: 'Father of Drona + rishi of Rigveda Mandala 6 + founder of Ayurveda + dhanurveda',
  },
  {
    number: 3,
    slug: 'gautama',
    name: 'Gautama',
    sanskrit: 'गौतम',
    iast: 'Gautama',
    gotra: 'Gautama',
    associatedStar: 'Phecda (gamma Ursae Majoris)',
    associatedStarBayer: 'gamma UMa',
    consort: 'Ahalya (first of the panch-kanya — the five archetypal women)',
    principalSons: ['Shatananda (royal priest of Janaka of Mithila)', 'Vamadeva', 'Nodhas'],
    presidingDeity: 'Indra + Mitra-Varuna',
    vedaContribution: 'Composer of many Rigvedic sukta; sons Vamadeva (Mandala 4) and Nodhas (Mandala 1) carry the lineage',
    associatedTirthas: ['Gautamashrama (Brahmagiri hill, Trimbakeshwar, Nashik)', 'Source of the Godavari river'],
    storySummary: 'Gautama, husband of Ahalya, is the rishi associated with the descent of the Godavari river — known as the Gautami in his honour — at Trimbakeshwar in Maharashtra. By tapas he obtained the holy waters in a time of twelve-year drought, releasing them to flow south as the great river of the Deccan. The most famous and tragic story of his household is that of Indra, who seduced Ahalya in the rishi\'s form; the curse Gautama placed and later lifted at Rama\'s touch is one of the foundational episodes of the Ramayana Bala Kanda. Gautama also gave to dharmashastra the Gautama Dharmasutra, the oldest of the surviving dharmasutras, and his descendants founded the influential Nyaya darshana.',
    keyTeaching: 'Truth + the moral law are uncompromising — but even the most severe consequence can be redeemed by the touch of the divine when the heart returns to dharma.',
    principalScriptures: ['Gautama Dharmasutra (oldest dharmasutra)', 'Ramayana Bala Kanda 47-48', 'Skanda Purana (Godavari mahatmya)'],
    modernRelevance: 'The Gautama gotra is one of the major brahmana gotras and the Buddha (Siddhartha Gautama) shared the lineage name. Trimbakeshwar — one of the 12 jyotirlingas — is identified with Gautama-rishi and his austerity.',
    bestKnownFor: 'Husband of Ahalya + rishi of the Godavari (Gautami) descent + author of the oldest dharmasutra',
  },
  {
    number: 4,
    slug: 'jamadagni',
    name: 'Jamadagni',
    sanskrit: 'जमदग्नि',
    iast: 'Jamadagni',
    gotra: 'Jamadagnya / Bhargava',
    associatedStar: 'Alkaid (eta Ursae Majoris)',
    associatedStarBayer: 'eta UMa',
    consort: 'Renuka',
    principalSons: ['Parashurama (the 6th avatara of Vishnu)', 'Rumanvan', 'Sushena', 'Vasu', 'Vishvavasu'],
    presidingDeity: 'Agni + Surya',
    vedaContribution: 'Composer of many sukta of Rigveda Mandala 9 (the Soma Mandala) and Mandala 10',
    associatedTirthas: ['Jamadagni ashrama (Chitrakoot)', 'Renuka Lake (Sirmour, H.P.)', 'Parashurama Kund (Arunachal Pradesh)'],
    storySummary: 'Jamadagni, descendant of the great Bhrigu, is the father of the avatara Parashurama. He kept a forest ashrama with the divine cow Kamadhenu, which the king Kartavirya Arjuna of the Haihayas coveted; when the king\'s men killed Jamadagni and stole the cow, Parashurama in fury vowed to destroy the kshatriya kings of the earth twenty-one times. Earlier, when Jamadagni\'s tapasic perception detected a momentary lapse in his wife Renuka\'s mind, he commanded each of his sons in turn to slay her; only Parashurama obeyed, and was then granted the boon to ask for her restoration — which he did. Jamadagni is one of the most uncompromising of the seven rishis, embodying tapasic fire in its most concentrated form.',
    keyTeaching: 'Tapas is the fire that admits no compromise. It can shatter the unjust order of kings — but it requires absolute mastery of the senses to wield without harm.',
    principalScriptures: ['Rigveda Mandalas 9, 10', 'Mahabharata Vana Parva 115-116', 'Bhagavata Purana 9.15-16'],
    modernRelevance: 'The Jamadagnya / Bhargava lineage gave the Parashurama tradition that founded the coastal Konkan and Kerala. Parashurama Kund in Arunachal Pradesh remains a major pilgrim site; the Renuka Lake in Himachal is one of the most sacred sarovars.',
    bestKnownFor: 'Father of Parashurama (6th avatara) + uncompromising tapasvi of the Bhargava lineage',
  },
  {
    number: 5,
    slug: 'kashyapa',
    name: 'Kashyapa',
    sanskrit: 'कश्यप',
    iast: 'Kaśyapa',
    gotra: 'Kashyapa',
    associatedStar: 'Dubhe (alpha Ursae Majoris)',
    associatedStarBayer: 'alpha UMa',
    consort: 'Aditi, Diti, Danu, Vinata, Kadru, and 8 more (the 13 daughters of Daksha)',
    principalSons: ['The Adityas (12 solar gods, including Vishnu as Vamana)', 'The Daityas, Danavas', 'Garuda + Aruna (sons of Vinata)', 'The Nagas (sons of Kadru)'],
    presidingDeity: 'Surya + Brahma',
    vedaContribution: 'Composer of sukta in Rigveda Mandala 9 (Soma); rishi of many later additions',
    associatedTirthas: ['Kashmir (named for Kashyapa-mira, the lake-of-Kashyapa)', 'Kashyapa kund (Anantnag)'],
    storySummary: 'Kashyapa is the great progenitor — the father, through his thirteen wives (the daughters of Daksha), of the entire created order of the present age: the gods (Adityas), the asuras (Daityas and Danavas), the birds (Garuda), the serpents (Nagas), the cattle, the wild beasts, and every plant. Of his sons, the most famous is Vishnu himself born to Aditi as Vamana, the 5th avatara. Kashmir is traditionally said to have been a vast lake that Kashyapa drained for habitation — the name Kashmira itself preserves his presence in the land. He is one of the universal rishis whose lineage every brahmana not assigned another gotra adopts; the Kashyapa gotra is therefore one of the most widely held.',
    keyTeaching: 'All differentiation — divine and demonic, bird and serpent, human and beast — proceeds from a single source. The rishi who sees this lineage knows that all beings are kin.',
    principalScriptures: ['Rigveda Mandala 9', 'Bhagavata Purana 6.6', 'Mahabharata Adi Parva 65-66', 'Atharvaveda Kashyapa-sukta'],
    modernRelevance: 'Kashyapa is the default gotra for any brahmana whose lineage gotra has been lost, making it the most populous gotra by adoption. Kashmir bears his name, and the Kashyapa kund at Anantnag is still in worship.',
    bestKnownFor: 'Universal progenitor of gods, asuras, nagas, birds, and beasts + father of Vamana avatara',
  },
  {
    number: 6,
    slug: 'vasishtha',
    name: 'Vasishtha',
    sanskrit: 'वसिष्ठ',
    iast: 'Vasiṣṭha',
    gotra: 'Vasishtha',
    associatedStar: 'Mizar + Alcor (zeta + 80 Ursae Majoris)',
    associatedStarBayer: 'zeta + 80 UMa',
    consort: 'Arundhati (the personification of marital fidelity — visible as the small star Alcor beside Mizar in Ursa Major)',
    principalSons: ['Shakti', 'Suyajna', 'and (in some accounts) 100 sons slain by Vishvamitra'],
    presidingDeity: 'Mitra-Varuna + Indra',
    vedaContribution: 'Rishi of the 7th mandala of the Rigveda (Vasishtha mandala), composer of ~104 sukta — one of the largest single contributions',
    hymnsCount: '~104 sukta',
    rishiOfMandala: 'Rigveda Mandala 7',
    associatedTirthas: ['Vasishtha ashrama (Mt. Abu)', 'Vasishtha Gufa (above Rishikesh on the Ganga)', 'Vasishtha temple (Guwahati)'],
    storySummary: 'Vasishtha, the kula-guru of the Suryavamsha (the solar dynasty of Ayodhya), was the rajaguru of Rama and of every king from Ikshvaku onward. His relationship with the king Vishvaratha — later the rishi Vishvamitra — produced one of the most enduring tapasic rivalries in the puranas: Vishvamitra, defeated when he tried to seize Vasishtha\'s divine cow Nandini by force, undertook the tapas that would eventually raise him from kshatriya to brahmarshi, equal at last to Vasishtha himself. Vasishtha is the rishi of Rigveda Mandala 7, the Vasishtha mandala. The Yoga-Vasishtha — a vast Advaita Vedanta dialogue between Vasishtha and the young Rama — is one of the great philosophical works of Sanskrit literature. His wife Arundhati, visible as the tiny star beside Mizar, is the pole-star of pativrata-dharma.',
    keyTeaching: 'Tapas earned through patience is greater than tapas seized through force. The brahmarshi is not made by ancestry but by the heart that has finally let go of every claim.',
    principalScriptures: ['Rigveda Mandala 7', 'Yoga Vasishtha', 'Vasishtha Dharmasutra', 'Ramayana Bala Kanda 51-65'],
    modernRelevance: 'The Vasishtha gotra is one of the principal brahmana gotras and Arundhati-darshana on the wedding night (sighting the tiny star Alcor) remains a ritual of every Hindu marriage. The Yoga-Vasishtha is widely studied as one of the supreme Advaita texts.',
    bestKnownFor: 'Kula-guru of the Suryavamsha + rishi of Rigveda Mandala 7 + author of the Yoga-Vasishtha + husband of Arundhati',
  },
  {
    number: 7,
    slug: 'vishvamitra',
    name: 'Vishvamitra',
    sanskrit: 'विश्वामित्र',
    iast: 'Viśvāmitra',
    gotra: 'Kaushika / Vishvamitra',
    associatedStar: 'Merak (beta Ursae Majoris)',
    associatedStarBayer: 'beta UMa',
    consort: 'Menaka (an apsara whose union produced the rishika Shakuntala)',
    principalSons: ['Madhuchchhandas', 'Devarata', '(and Shakuntala — adoptive)'],
    presidingDeity: 'Savitr (the solar deity of the Gayatri Mantra)',
    vedaContribution: 'Rishi of the 3rd mandala of the Rigveda (Vishvamitra mandala) and the seer of the Gayatri Mantra (RV 3.62.10) — the most famous mantra of Sanatana Dharma',
    hymnsCount: '~60 sukta',
    rishiOfMandala: 'Rigveda Mandala 3',
    associatedTirthas: ['Vishvamitra ashrama (Buxar, Bihar)', 'Siddhashrama (Bodh Gaya region)'],
    storySummary: 'Vishvamitra began as the king Vishvaratha of the Kaushika line — a mighty kshatriya emperor. When he attempted to seize the cow Nandini from the rishi Vasishtha by force and was repulsed by Vasishtha\'s tapasic power, he resolved that the brahmana state, won by realisation, was a greater thing than the kshatriya state, won by arms. He abandoned his throne and undertook a tapas so vast that it broke through every obstacle — the seductions of the apsara Menaka (which produced Shakuntala), the curses of his own pride, the rivalry with Vasishtha — until at last he won the title of brahmarshi from the gods themselves and the recognition of Vasishtha. To Vishvamitra is given the seer-ship of the Gayatri Mantra, the most chanted Vedic mantra in the world. He took Rama and Lakshmana as boys for their first martial training and led them to the breaking of Shiva\'s bow at Mithila.',
    keyTeaching: 'A man is what he becomes through tapas, not what he is born. The path from king to brahmarshi is open to anyone who is willing to pay the price in years of austerity.',
    principalScriptures: ['Rigveda Mandala 3', 'Gayatri Mantra (RV 3.62.10)', 'Ramayana Bala Kanda 19-65', 'Mahabharata Adi Parva 174'],
    modernRelevance: 'The Gayatri Mantra is recited daily by millions worldwide as part of sandhya-vandana. The Kaushika gotra remains a principal brahmana gotra. Vishvamitra\'s story is the foundational text of the Indian conviction that varna is by guna and karma, not by birth alone.',
    bestKnownFor: 'Seer of the Gayatri Mantra + king who became brahmarshi + rishi of Rigveda Mandala 3',
  },
];

export function rishiSlugs(): string[] {
  return SAPTA_RISHIS.map((r) => r.slug);
}

export function getRishi(slug: string): Rishi | undefined {
  return SAPTA_RISHIS.find((r) => r.slug === slug);
}
