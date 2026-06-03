// Hindu Sacred Symbols catalog — 12 canonical pratika/chinha used across
// Sanatana Dharma ritual, iconography and altar practice. Each entry maps
// to its presiding deity (where one exists), category, traditional
// placement guidance, and the materials it is most commonly crafted in.
// Targets: "{symbol} meaning hinduism", "what is {symbol}", "how to use
// {symbol} in puja", "is {symbol} hindu".
//
// HISTORICAL NOTE on swastika: the swastika is an ancient Indo-Vedic
// auspiciousness symbol attested in Indus Valley seals (c. 2500 BCE) and
// continuously used in Hindu, Buddhist, and Jain ritual for ~4000 years.
// Its 20th-century appropriation by the German Nazi party (a 45° rotated
// hooked-cross, "Hakenkreuz") is a distinct, unrelated political symbol;
// scholarly consensus treats the two as separate. This file presents only
// the Hindu liturgical context.

export type HinduSymbolCategory = 'mantra' | 'yantra' | 'ritual-object' | 'natural' | 'mark';

export interface HinduSymbol {
  slug: string;
  name: string;
  sanskrit: string;
  category: HinduSymbolCategory;
  associatedDeity: string;
  deitySlug?: string;
  meaning: string;
  useInRituals: string[];
  placementGuidance: string;
  commonMaterials: string[];
  iconographyDescription: string;
  modernRelevance: string;
}

export const HINDU_SYMBOLS: HinduSymbol[] = [
  {
    slug: 'om-aum',
    name: 'Om (Aum)',
    sanskrit: 'ॐ',
    category: 'mantra',
    associatedDeity: 'Parabrahman (the formless absolute) — invoked before any deity',
    meaning:
      'Om is the primordial sound (pranava) from which the universe is said to manifest, comprising three matras A-U-M corresponding to creation, sustenance, and dissolution. It is the seed-syllable that opens nearly every Vedic mantra and is treated in the Mandukya Upanishad as itself the Brahman.',
    useInRituals: [
      'Chanted three times at the start and end of any puja or japa',
      'Placed at the head of every written mantra and shloka',
      'Inscribed on the entry threshold and puja-room wall',
      'Used as the primary bija for pranayama and meditation',
      'Drawn on the first page of new account books on Diwali',
    ],
    placementGuidance:
      'Hung above the puja altar facing east, or on the main entrance door at eye level — never on the floor, footwear, or in bathrooms.',
    commonMaterials: ['Brass', 'Copper', 'Wood (sandalwood, teak)', 'Stone', 'Silver pendant', 'Vermilion paint on wall'],
    iconographyDescription:
      'A curved Devanagari glyph with a lower loop (waking state), upper loop (dream state), side loop (deep sleep), crescent (illusion/maya) and dot or bindu (turiya — the fourth, transcendent state).',
    modernRelevance:
      'Universally recognised as the visual identity of Hindu and Yogic traditions; opens every shanti-path and is the standard symbol on temple letterheads, wedding invitations, and prayer apps worldwide.',
  },
  {
    slug: 'swastika',
    name: 'Swastika (Hindu auspiciousness symbol)',
    sanskrit: 'स्वस्तिक',
    category: 'mark',
    associatedDeity: 'Lord Ganesha (as remover of obstacles) and Surya (as solar wheel)',
    deitySlug: 'ganesha',
    meaning:
      'The Sanskrit term svastika derives from su-asti-ka, meaning "that which is associated with well-being". In Hindu, Buddhist and Jain traditions it is an ancient symbol of auspiciousness, the four cardinal directions, the four Vedas, and the rotation of cosmic order. It is attested on Indus Valley seals from c. 2500 BCE and has been in continuous Indic ritual use ever since. The 20th-century Nazi Hakenkreuz is a separate, rotated hooked-cross adopted by a political party and is treated by scholars as unrelated to the dharmic symbol described here.',
    useInRituals: [
      'Drawn in vermilion (kumkum) or turmeric on the entrance threshold during Diwali, Griha Pravesh and weddings',
      'Inscribed on the first page of new business account books (chopda pujan)',
      'Placed on the kalash during any puja',
      'Drawn on the bridal palm and around the homa-kunda fire pit',
      'Marked on vehicles, shops and safes for prosperity',
    ],
    placementGuidance:
      'Drawn upright (arms bending clockwise) on thresholds, altars, and account books — always with arms running parallel to the floor and the central cross axis vertical.',
    commonMaterials: ['Kumkum (vermilion)', 'Turmeric paste', 'Rice flour rangoli', 'Sandalwood paste', 'Brass or silver wall plaque'],
    iconographyDescription:
      'An equilateral cross with four arms of equal length bent at 90° clockwise (right-facing), often with a dot in each of the four quadrants representing the four Vedas or the four ages (yugas).',
    modernRelevance:
      'Continues as the standard auspiciousness mark on Indian wedding cards, Diwali rangolis, temple entrances and business ledgers. Hindu organisations worldwide are working to communicate the symbol\'s distinct dharmic heritage to audiences unfamiliar with its pre-20th-century history.',
  },
  {
    slug: 'sri-yantra',
    name: 'Sri Yantra (Shri Chakra)',
    sanskrit: 'श्री यन्त्र',
    category: 'yantra',
    associatedDeity: 'Goddess Lalita Tripura Sundari (Mahalakshmi in her cosmic form)',
    deitySlug: 'lakshmi',
    meaning:
      'The Sri Yantra is the geometric form of the goddess Lalita Tripura Sundari, composed of nine interlocking triangles around a central bindu. In Shri Vidya tradition it is treated as a complete cosmogram, mapping the unfolding of the universe from the bindu outward and the path of return from the outer enclosures inward.',
    useInRituals: [
      'Installed and worshipped daily in Shri Vidya sadhana',
      'Energised in homes and businesses for sustained prosperity (after qualified prana-pratishtha)',
      'Drawn on copper plate (yantra-pata) and consecrated on a Friday during Shukla Paksha',
      'Used as the focal object during Lalita Sahasranama recitation',
      'Placed on the puja altar facing east during Navaratri and Diwali',
    ],
    placementGuidance:
      'Mounted at eye level on the east or north wall of the puja room, never below waist height — must be regularly offered kumkum, water and incense once installed.',
    commonMaterials: ['Copper plate (most common)', 'Gold or gold-plated metal', 'Silver', 'Crystal (sphatika)', 'Marble', 'Granite (for temple installations)'],
    iconographyDescription:
      'Four upward-pointing Shiva triangles interlocking with five downward-pointing Shakti triangles, generating 43 smaller triangles, surrounded by two lotus rings (eight and sixteen petals) and a square bhupura with four gates oriented to the cardinal directions.',
    modernRelevance:
      'One of the most studied sacred geometric figures in the world; remains the central object of Shri Vidya temples like Sringeri and Kanchi, and is widely installed in home altars and businesses for Lakshmi-blessing.',
  },
  {
    slug: 'kalash',
    name: 'Kalash (sacred pot)',
    sanskrit: 'कलश',
    category: 'ritual-object',
    associatedDeity: 'Varuna (presiding water deity) — with all 33 koti devatas invoked into the pot',
    meaning:
      'The kalash is a sacred pot filled with water, topped with mango leaves and a coconut, that is treated during puja as the temporary residence of all deities. Its rounded body is identified with the cosmic waters, the coconut with Brahma and the mango leaves with the five elements.',
    useInRituals: [
      'Established (kalash sthapana) at the start of any major puja, vrat or yajna',
      'Placed at the centre of the mandap during Hindu weddings',
      'Installed on Ghatasthapana day to begin Navaratri',
      'Used during Griha Pravesh (house warming) as the first object carried inside',
      'Worshipped as the form of Varuna on Akshaya Tritiya for prosperity',
    ],
    placementGuidance:
      'Sits on a bed of unbroken rice grains (akshat) on the puja altar, with the spout (if any) facing east — should not be moved or emptied until the puja sankalpa is formally concluded.',
    commonMaterials: ['Copper (most traditional)', 'Brass', 'Silver', 'Clay (for shraddha and short pujas)', 'Gold (temple use)'],
    iconographyDescription:
      'A rounded-belly pot with a narrow neck, filled with water, fitted with five or seven mango leaves around the rim, and crowned with a whole coconut (with the tuft facing up) often wrapped in red cloth and tied with raksha-sutra.',
    modernRelevance:
      'Remains the indispensable centrepiece of every Hindu puja, wedding mandap and house-warming, and is the standard logo motif for organisations associated with auspicious beginnings.',
  },
  {
    slug: 'lotus-padma',
    name: 'Lotus (Padma / Kamal)',
    sanskrit: 'पद्म',
    category: 'natural',
    associatedDeity: 'Goddess Lakshmi (seated and standing on the lotus) and Brahma (born from a lotus from Vishnu\'s navel)',
    deitySlug: 'lakshmi',
    meaning:
      'The lotus rises from muddy water yet remains unstained, and is therefore the standard symbol in Hindu thought for spiritual purity, dispassion (vairagya) and enlightenment unfolding from samsara. It is the seat (asana) of nearly every benevolent deity in iconography.',
    useInRituals: [
      'Offered fresh during Lakshmi Puja, Saraswati Puja and Vishnu archana',
      'Used as the asana on which deity murtis are seated for abhisheka',
      'Petals strewn during kanya-pujan, weddings and Diwali',
      'Lotus seeds (kamalgatta) strung as a mala for Lakshmi japa',
      'Drawn as the eight-petalled ashta-dala mandala on the puja altar',
    ],
    placementGuidance:
      'Fresh lotus offered with stem intact, placed at the deity\'s feet; lotus images installed facing the murti, never used as footwear or floor decor.',
    commonMaterials: ['Fresh lotus flower (preferred)', 'Brass or silver lotus base for murti asana', 'Stone-carved lotus pedestal', 'Lotus-seed mala (kamalgatta)', 'Painted clay lotus for rangoli'],
    iconographyDescription:
      'A multi-petalled flower most commonly shown with eight petals (ashta-dala) in either a fully open form (vikasita) or partially open bud (mukula), depicted in pink, white, or red depending on the deity it accompanies.',
    modernRelevance:
      'Adopted as the national flower of India; remains the standard iconographic seat for Lakshmi and Saraswati murtis in homes, weddings, government emblems and devotional art.',
  },
  {
    slug: 'conch-shankha',
    name: 'Conch (Shankha)',
    sanskrit: 'शङ्ख',
    category: 'ritual-object',
    associatedDeity: 'Lord Vishnu (the Panchajanya conch) — also Lakshmi as Shankha-Lakshmi',
    deitySlug: 'vishnu',
    meaning:
      'The shankha is the spiral marine shell sounded to announce the start of puja and arati. Its sound is identified with the primordial Om, and its spiral is read as the unwinding of cosmic time. Vishnu holds it in his upper-left hand as Panchajanya, the conch whose blast frightens away inauspicious forces.',
    useInRituals: [
      'Blown three times to open arati and at the end of puja',
      'Filled with water for abhisheka of Vishnu, Krishna and Lakshmi murtis',
      'Placed on a tripod (shankha-stand) on the puja altar facing the deity',
      'Carried in temple processions and blown at significant moments of Hindu weddings',
      'A naturally right-spiralled (dakshinavarti) shankha is worshipped as Lakshmi herself',
    ],
    placementGuidance:
      'Kept on a clean cloth or metal stand on the altar with the opening facing the deity; the right-spiralled (dakshinavarti) shankha is set on a separate decorated stand and never used for blowing.',
    commonMaterials: ['Natural marine conch shell (Turbinella pyrum)', 'Silver-mounted conch', 'Brass conch (decorative)', 'Sphatika (crystal) shankha for high-end altars'],
    iconographyDescription:
      'A spiral white shell with a wide opening at one end and a pointed apex at the other; the standard left-spiralled (vamavarti) form is used for blowing, while the rarer right-spiralled (dakshinavarti) form is treated as a deity in itself.',
    modernRelevance:
      'Remains in daily ritual use across temples and home altars; the conch-blast continues to mark the opening of weddings, foundation-stone ceremonies and Hindu state functions.',
  },
  {
    slug: 'trishul',
    name: 'Trishul (Trident)',
    sanskrit: 'त्रिशूल',
    category: 'ritual-object',
    associatedDeity: 'Lord Shiva — also wielded by Durga in her demon-slaying forms',
    deitySlug: 'shiva',
    meaning:
      'The trishul is the three-pronged spear of Shiva, with the three points read variously as the three gunas (sattva-rajas-tamas), the three times (past-present-future), the three states (waking-dream-sleep), and the three shaktis (iccha-jnana-kriya). Held by Durga, it is the weapon with which she beheads Mahishasura.',
    useInRituals: [
      'Installed at the entrance of Shiva and Devi temples',
      'Planted in the ground at akhara grounds and ascetic dhuni fires',
      'Carried in procession on Maha Shivaratri and during Navaratri',
      'Worshipped on the chariot of Devi during Durga Puja visarjan',
      'Small trishul placed on the home altar beside the Shiva lingam',
    ],
    placementGuidance:
      'Planted upright (prongs upward) — never laid flat — beside the Shiva lingam, at the temple gate, or at the dhuni; the centre prong should align with the deity\'s gaze.',
    commonMaterials: ['Iron (traditional, especially for sadhus)', 'Brass', 'Copper', 'Silver (home altars)', 'Stone (temple installations)', 'Damascened steel (decorative)'],
    iconographyDescription:
      'A long staff topped with three sharp prongs of equal length, often with a damaru drum tied at the join; the central prong is sometimes slightly longer or marked with a small flame.',
    modernRelevance:
      'Standard iconography on Shiva temple flags, sadhu staffs, akhara emblems and Devi processions; the trident continues to be installed at every new Shiva temple consecration.',
  },
  {
    slug: 'damaru',
    name: 'Damaru (Shiva\'s hourglass drum)',
    sanskrit: 'डमरु',
    category: 'ritual-object',
    associatedDeity: 'Lord Shiva (as Nataraja) — also Goddess Saraswati in some traditions',
    deitySlug: 'shiva',
    meaning:
      'The damaru is the small hourglass-shaped drum that Shiva sounds during his cosmic Tandava dance. Its two faces represent the union of Shiva (purusha) and Shakti (prakriti) at the narrow waist, and its rhythm is said to generate the fourteen Maheshvara Sutras from which Sanskrit grammar is derived.',
    useInRituals: [
      'Held in Shiva\'s upper-right hand in every Nataraja and Bhairava murti',
      'Sounded by sadhus and aghori practitioners during Shiva sadhana',
      'Tied to the trishul carried in Maha Shivaratri processions',
      'Played by snake-charmers and street performers as a form of folk Shiva-worship',
      'Used in some temple aratis to accompany the conch and bell',
    ],
    placementGuidance:
      'Stored vertically beside the Shiva murti on the altar or tied to the trishul; never placed on the floor when not in use.',
    commonMaterials: ['Wood (sandalwood, neem) with leather faces', 'Brass with leather', 'Copper miniature for altar', 'Human bone (rare, only in certain tantric lineages)'],
    iconographyDescription:
      'Two hollow hemispherical bowls joined at their narrow ends to form an hourglass, with leather membranes stretched across the two outer faces and two small beads on cords that strike the faces when the drum is twisted.',
    modernRelevance:
      'Remains a standard iconographic attribute in every Nataraja sculpture, including the bronze Chola Natarajas in major museums; sounded daily in many Shiva temples during arati.',
  },
  {
    slug: 'kamandalu',
    name: 'Kamandalu (ascetic water-pot)',
    sanskrit: 'कमण्डलु',
    category: 'ritual-object',
    associatedDeity: 'Lord Brahma — also held by sadhus, sannyasis, Lord Shiva and Saraswati',
    meaning:
      'The kamandalu is the long-spouted water-pot carried by Hindu ascetics and held by Brahma as one of his attributes. It holds water from a sacred river or tirtha, and is the practical instrument for achamana (ritual sipping), tarpana (water offering to ancestors), and minor abhisheka during travel.',
    useInRituals: [
      'Carried at all times by Dashanami sannyasis as one of their four required articles',
      'Held in Brahma\'s lower-left hand in every Brahma murti',
      'Used to perform achamana before sandhya-vandana three times daily',
      'Used for tarpana during Pitru Paksha and shraddha rites',
      'Filled at sacred tirthas (Kashi, Haridwar, Rameshwaram) and carried home for puja water',
    ],
    placementGuidance:
      'Kept on a clean cloth or low wooden stool beside the puja altar; the spout should not face north or be left uncovered overnight.',
    commonMaterials: ['Bottle-gourd shell (most traditional, called tumba)', 'Copper', 'Brass', 'Wood (for forest ascetics)', 'Coconut shell'],
    iconographyDescription:
      'An oval or pear-shaped water vessel with a long curved spout on one side and often a small handle on top; ascetic forms are typically carved from a dried bottle gourd, polished smooth and sometimes engraved with mantras.',
    modernRelevance:
      'Continues to be carried by sannyasis at Kumbh Mela and across Indian akharas; remains a standard prop in iconography of Brahma, Shiva-Bhikshatana and rishis.',
  },
  {
    slug: 'peacock-feather',
    name: 'Peacock Feather (Mor-pankh)',
    sanskrit: 'मयूर पिच्छ',
    category: 'natural',
    associatedDeity: 'Lord Krishna (worn in the crown) — also Kartikeya (whose vahana is the peacock)',
    deitySlug: 'krishna',
    meaning:
      'The peacock feather is the signature ornament in Krishna\'s crown and is read as a symbol of pure beauty, gentleness and the absorption of negativity (in Ayurveda the feather\'s "eye" is believed to neutralise the venom of snakes — the feather is therefore associated with overcoming poisons of the mind).',
    useInRituals: [
      'Placed on the puja altar beside Krishna and Kartikeya murtis',
      'Tied to the cradle (jhula) during Janmashtami',
      'Used in Vastu remedies, placed near the main entrance to deflect negativity',
      'Waved over the deity during summer arati as a soft chamara (fan)',
      'Inserted into the Bhagavata Gita or Bhagavata Purana as a bookmark',
    ],
    placementGuidance:
      'Stand the feather upright in a clean vase or tie it to the Krishna murti\'s crown; placed on the south or east wall in Vastu remedy, never on the floor or in the bathroom.',
    commonMaterials: ['Natural shed peacock feather (the peacock is protected — only naturally shed feathers are used)', 'Bunches tied with red thread', 'Mounted in glass frame for wall', 'Attached to chamara fans for arati'],
    iconographyDescription:
      'A long iridescent green-and-gold tail feather with a distinct blue, green and bronze concentric "eye" (ocellus) near the tip; typically shown crowning Krishna at a slight backward tilt.',
    modernRelevance:
      'Universally identified with Krishna across calendar art, ISKCON temples, Janmashtami decorations and Vrindavan tourism; widely used in Vastu and home-decor traditions for auspiciousness.',
  },
  {
    slug: 'rudraksha',
    name: 'Rudraksha (Rudra\'s tears)',
    sanskrit: 'रुद्राक्ष',
    category: 'natural',
    associatedDeity: 'Lord Shiva (as Rudra) — different mukhi map to different deities',
    deitySlug: 'shiva',
    meaning:
      'Rudraksha are the dried seeds of the Elaeocarpus ganitrus tree, said in the Shiva Purana to have grown from tears Shiva shed after a thousand-year meditation. Each natural "face" (mukhi) on the bead corresponds to a presiding deity and planet; the 5-mukhi is the universal default worn for general well-being and Shiva-bhakti.',
    useInRituals: [
      'Strung into a 108-bead mala for daily japa of any mantra',
      'Worn as a single-bead pendant after prana-pratishtha and beej-mantra recitation',
      'Soaked in raw cow milk and Ganga jal to energise before first wear',
      'Offered on the Shiva lingam during Rudrabhisheka',
      'Specific mukhi (e.g. 8-mukhi for Rahu) prescribed by Vedic astrologers for specific doshas',
    ],
    placementGuidance:
      'Worn as a mala around the neck or wrist; when not worn, kept in a clean cloth pouch on the puja altar — never placed on the floor, in the bathroom, or worn during cremation rites.',
    commonMaterials: ['Natural Nepali rudraksha seed (most prized)', 'Indonesian (Java) rudraksha', 'Silver-capped pendant', 'Gold-capped pendant', 'Red silk thread'],
    iconographyDescription:
      'A small (8-30 mm) brown spherical or oval seed with distinct natural ridges (faces or mukhi) running pole-to-pole, ranging from 1 to 14 mukhi; rare special varieties include the conjoined Gauri-Shankar and Trijuti.',
    modernRelevance:
      'See the detailed 18-variety guide at /rudraksha for benefits, beej mantras and wearing rules per Shiva Purana; widely worn by Shaiva devotees, sadhus and yoga practitioners worldwide.',
  },
  {
    slug: 'tilaka',
    name: 'Tilaka (forehead mark)',
    sanskrit: 'तिलक',
    category: 'mark',
    associatedDeity: 'Sampradaya-specific — Vishnu (urdhva-pundra), Shiva (tripundra), Devi (red bindu)',
    meaning:
      'The tilaka is the auspicious mark applied to the forehead between the eyebrows (the location of the ajna chakra) at the start of any puja, journey or auspicious undertaking. Its colour, shape and material vary by sampradaya — Vaishnavas wear a vertical urdhva-pundra in white clay (gopichandana), Shaivas wear three horizontal lines of vibhuti, and Devi worshippers wear a red kumkum bindu.',
    useInRituals: [
      'Applied by the priest or family elder at the start of every puja, yajna and arati',
      'Applied to the bride and groom and guests during Hindu weddings',
      'Applied to those departing on a journey or starting a new venture',
      'Re-applied daily after the morning bath as part of sandhya-vandana',
      'Applied with akshat (unbroken rice grain pressed into the wet tilaka) to invoke deity blessing',
    ],
    placementGuidance:
      'Applied at the bhrumadhya (between the eyebrows) — Vaishnava urdhva-pundra runs upward from the bridge of the nose to the hairline, Shaiva tripundra runs horizontally across the forehead, Devi bindu is a single round dot.',
    commonMaterials: ['Kumkum (vermilion-turmeric powder)', 'Sandalwood paste (chandan)', 'Vibhuti (sacred ash from yajna)', 'Gopichandana clay (Vaishnava)', 'Turmeric paste (haldi)', 'Saffron (kesar) paste'],
    iconographyDescription:
      'A small mark on the forehead between the eyebrows; shape and colour identifies the wearer\'s sampradaya — vertical U-shape with a red centre line for Vaishnavas, three horizontal white lines with a red bindu for Shaivas, single red dot for Devi-worshippers and married women.',
    modernRelevance:
      'Worn daily by millions of Hindus and applied at the start of every puja, wedding, school inauguration, and government function in India; the bindu form is also a widely-recognised cultural marker of Hindu women globally.',
  },
];

export function hinduSymbolSlugs(): string[] {
  return HINDU_SYMBOLS.map((s) => s.slug);
}

export function getHinduSymbol(slug: string): HinduSymbol | undefined {
  return HINDU_SYMBOLS.find((s) => s.slug === slug);
}
