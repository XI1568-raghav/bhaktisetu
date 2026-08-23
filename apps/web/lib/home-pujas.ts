// Home Puja + Marriage Ceremony — data module
// Verified pandit directory, ceremony categories, sample bookings for demo.

export type PricingTier = {
 basic: number;
 standard: number;
 premium: number;
};

export type HomePujaCategory = {
 slug: string;
 name: string;
 nameLocal?: string;
 tagline: string;
 icon: string; // lucide name
 accent: string; // css var
 duration: string;
 startingPrice: number;
 description: string;
 significance: string[];
 included: string[];
 prepareAtHome: string;
 muhurat: string;
 pricing: PricingTier;
 pricingDetails: {
 basic: string[];
 standard: string[];
 premium: string[];
 };
 recommendedPanditIds: string[];
 faq: { q: string; a: string }[];
};

export type Pandit = {
 id: string;
 name: string;
 title: string;
 initials: string;
 avatarBg: string;
 specialty: string[];
 experience: number;
 pujasPerformed: number;
 languages: string[];
 city: string;
 serviceArea: string[];
 verified: {
 aadhaar: boolean;
 background: boolean;
 vedicCert: boolean;
 };
 rating: number;
 reviewCount: number;
 pricing: {
 homePuja: PricingTier;
 marriage?: PricingTier;
 grihaPravesh?: PricingTier;
 };
 bio: string;
 credentials: string[];
 weddingsPerformed?: number;
 availability: { date: string; slots: string[] }[];
 // TC-05: `reviews: { author, city, rating, text, date }[]` used to sit here and
 // every one of the 13 pandits below carried five of them -- 65 invented
 // customer reviews, mostly `rating: 5`, signed with full names of people who do
 // not exist. Three of them repeated the marriageTestimonials rows verbatim
 // (Aanya & Kabir Malhotra, Divya & Karthik Iyer, Simran & Jaspreet Singh).
 //
 // NOTHING rendered them: the only two readers of these arrays,
 // app/pujas/marriage/book/page.tsx and app/pujas/home-puja/book/
 // BookHomePujaClient.tsx, read `rating`, `reviewCount` and `weddingsPerformed`
 // and never touch `reviews`. Deleted rather than left in place for the same
 // reason the dead `trustScore: 90` fallback on /temples/[slug] was deleted
 // under TC-07: a ready-made block of five-star testimonials sitting one
 // `.map()` away from a render has no honest value to fall back to.
};

// ──────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ──────────────────────────────────────────────────────────────────────────

export const homePujaCategories: HomePujaCategory[] = [
 {
 slug: 'griha-pravesh',
 name: 'Griha Pravesh',
 nameLocal: 'गृह प्रवेश',
 tagline: 'Housewarming ceremony for your new home',
 icon: 'Home',
 accent: 'var(--color-saffron-500)',
 duration: '3 – 4 hours',
 startingPrice: 5100,
 description:
 'Griha Pravesh is the sacred Vedic housewarming ritual performed when entering a new home for the first time. It invokes Vastu Purusha, Lord Ganesha, and the nine planets to sanctify the space and remove negative energies.',
 significance: [
 'Griha Pravesh marks the formal entry of a family into a new dwelling after receiving blessings from the deities of the eight directions. The ceremony cleanses the space of any residual energies from prior construction or previous owners.',
 'Traditionally performed in three forms — Apoorva (for a newly built home), Sapoorva (re-entry after travel or renovation), and Dwandvah (after calamity). Each has distinct rituals but all center on inviting Lakshmi, prosperity, and peace into the new abode.',
 'The Vastu Shanti homam is the central rite, where offerings of ghee, rice, and nine grains are made to Agni to balance the five elements within the house.',
 'Milk is boiled on the new stove until it overflows — a symbol of abundance, believed to ensure the family never knows scarcity in the new home.',
 ],
 included: [
 'Ganesh Puja and Navagraha invocation',
 'Vastu Shanti Homam with 108 ahutis',
 'Kalash Sthapana at the main door',
 'Panchang reading and Sankalp with family gotra',
 'Milk boiling ceremony and Anna Prashan',
 'Prasadam for up to 15 family members',
 'All samagri including havan kund, samidha, ghee, grains',
 ],
 prepareAtHome:
 'Clean the home thoroughly the night before. Arrange a clear space in the north-east corner for the havan kund. Keep fresh flowers, mango leaves for toran, and a copper kalash ready. Family members should be bathed and in traditional attire before the muhurat.',
 muhurat:
 'Most auspicious in the months of Magha, Phalguna, Vaishakha, and Jyeshtha. Avoid Paush and Ashadha. Best tithis are Dwitiya, Tritiya, Panchami, Saptami, Dashami, Ekadashi, Trayodashi.',
 pricing: { basic: 5100, standard: 11000, premium: 21000 },
 pricingDetails: {
 basic: [
 '1 Pandit, 3-hour ceremony',
 'Standard samagri kit',
 'Vastu Shanti Homam',
 'Prasadam for 8 people',
 ],
 standard: [
 '1 Senior Pandit, 4-hour ceremony',
 'Premium samagri with organic ghee',
 'Vastu Shanti + Navagraha Homam',
 'Custom sankalp with gotra',
 'Prasadam for 15 people',
 ],
 premium: [
 '2 Pandits, 5-hour ceremony',
 'Organic premium samagri',
 'Full Vastu + Navagraha + Rudrabhishek',
 'Pre-consultation Vastu analysis',
 'Prasadam for 30 people',
 'Silver kalash included',
 ],
 },
 recommendedPanditIds: ['p1', 'p3', 'p5', 'p8'],
 faq: [
 {
 q: 'How far in advance should I book Griha Pravesh?',
 a: 'We recommend booking 2-3 weeks in advance so the pandit can check auspicious muhurat for your specific rashi and nakshatra.',
 },
 {
 q: 'Do you bring all the samagri?',
 a: 'Yes. Our pandit arrives with a complete samagri kit including havan kund, samidha, ghee, nine grains, kumkum, roli, akshat, flowers, and mango leaves. You only provide a clean space.',
 },
 {
 q: 'What if my new home is not yet fully furnished?',
 a: 'That is actually preferred. The Griha Pravesh should ideally be performed before moving in heavy furniture. Just ensure the kitchen has a stove for the milk boiling ritual.',
 },
 ],
 },
 {
 slug: 'satyanarayan-katha',
 name: 'Satyanarayan Katha',
 nameLocal: 'सत्यनारायण कथा',
 tagline: 'Narration of Lord Vishnu\u2019s glory',
 icon: 'Flame',
 accent: 'var(--color-ganga-blue)',
 duration: '2 – 3 hours',
 startingPrice: 2100,
 description:
 'Satyanarayan Katha is the recitation of the five-chapter story of Lord Vishnu in his Satyanarayan form. Performed on auspicious occasions, full moons, and for thanksgiving, it brings peace and prosperity to the household.',
 significance: [
 'The Satyanarayan Vrat Katha is drawn from the Skanda Purana, Reva Khanda. It narrates five stories that illustrate the fruits of devotion to Satya — truth — embodied as Narayana.',
 'The ceremony is performed on Purnima (full moon), Ekadashi, or Sankranti, but devotees may choose any day for a special occasion — a new job, childbirth, recovery from illness, or simply as thanksgiving.',
 'The central offering is panchamrit made of milk, honey, curd, ghee, and sugar, alongside banana, chooram (wheat flour pudding), and tulsi leaves. The katha must be listened to attentively by all family members.',
 'It is believed that regular performance of Satyanarayan Katha wards off Vastu dosha, brings marital harmony, and ensures the continuity of prosperity in the family.',
 ],
 included: [
 'Ganesh Puja and Kalash Sthapana',
 'Shodashopachara Puja of Lord Satyanarayan',
 'Full recitation of five chapters of the katha',
 'Aarti and distribution of prasad',
 'Chooram and panchamrit prasad',
 'All samagri and puja items',
 ],
 prepareAtHome:
 'Arrange a clean low table (chowki) facing east or north. Cover with a yellow cloth. Keep a picture or idol of Satyanarayan. Prepare banana, mishri, and a clay diya with ghee. Family should bathe and wear clean clothes before the katha begins.',
 muhurat:
 'Purnima (full moon) of any month, Ekadashi, Sankranti, or personal anniversaries. Evening slot (5–8 PM) is most traditional.',
 pricing: { basic: 2100, standard: 3500, premium: 5100 },
 pricingDetails: {
 basic: [
 '1 Pandit, 2-hour recitation',
 'Standard samagri',
 'Basic chooram prasad',
 'Prasadam for 6 people',
 ],
 standard: [
 '1 Senior Pandit, 2.5-hour recitation',
 'Premium samagri with pure ghee',
 'Fresh panchamrit and chooram',
 'Prasadam for 12 people',
 ],
 premium: [
 '2 Pandits with Sanskrit + English narration',
 'Organic samagri',
 'Elaborate chooram and fruit prasad',
 'Prasadam for 25 people',
 'Recorded audio of full katha',
 ],
 },
 recommendedPanditIds: ['p2', 'p4', 'p6', 'p7'],
 faq: [
 {
 q: 'Can the katha be done in English?',
 a: 'Yes. Premium tier includes a pandit who provides simultaneous English explanation after each Sanskrit chapter, ideal for younger family members or NRI families.',
 },
 {
 q: 'Is fasting required?',
 a: 'Traditionally the host family observes a light fast (fruits, milk) until the katha concludes. This is optional and not enforced — the puja is valid without it.',
 },
 {
 q: 'How long is the katha?',
 a: 'The standard recitation runs 2 to 2.5 hours including aarti. Premium includes bilingual narration and runs up to 3 hours.',
 },
 ],
 },
 {
 slug: 'navratri-puja',
 name: 'Navratri Puja',
 nameLocal: 'नवरात्रि पूजा',
 tagline: 'Nine nights of Devi worship',
 icon: 'Flame',
 accent: 'var(--color-lotus-pink)',
 duration: '1.5 – 2 hours per day',
 startingPrice: 3100,
 description:
 'Navratri Puja is the nine-night worship of the divine feminine in her nine forms — the Navadurgas. Pandits can perform a single consolidated puja or daily rituals across the nine days.',
 significance: [
 'Navratri marks the victory of Goddess Durga over the demon Mahishasura. Each of the nine nights is dedicated to one form of Devi, beginning with Shailaputri and culminating in Siddhidatri.',
 'Celebrated four times a year — Chaitra (spring), Sharada (autumn), and two lesser-known Gupta Navratris — the autumn festival in Ashwin month is the most widely observed.',
 'The ceremony includes Ghatasthapana on day one, daily Durga Saptashati paath, kanya pujan on Ashtami or Navami, and concluding Havan with visarjan.',
 'Navratri puja strengthens the spiritual immunity of the household, removes negative energies, and is particularly beneficial for health, relationships, and removal of enemies.',
 ],
 included: [
 'Ghatasthapana with Jau (barley) sowing',
 'Daily Durga Saptashati paath (selected chapters)',
 'Kanya Pujan arrangements for nine girls',
 'Ashtami/Navami Havan',
 'Visarjan on Dashami',
 'Red chunri, coconut, and all samagri',
 ],
 prepareAtHome:
 'Clean the home on pratipada (day one). Create a puja altar in the north-east with a clay pot for jau. Keep red flowers, kumkum, and a photo of Goddess Durga. Prepare simple satvik meals for the nine days.',
 muhurat: 'Sharad Navratri (Sep–Oct) and Chaitra Navratri (Mar–Apr) are the main slots. Ghatasthapana on Pratipada morning.',
 pricing: { basic: 3100, standard: 7100, premium: 15100 },
 pricingDetails: {
 basic: [
 'Consolidated 2-hour puja on Ashtami',
 'Ghatasthapana + Havan',
 'Standard samagri',
 'Prasadam for 8',
 ],
 standard: [
 'Daily 1-hour puja for all 9 days',
 'Ghatasthapana, daily paath, Ashtami Havan',
 'Kanya pujan arrangements',
 'Prasadam for 15',
 ],
 premium: [
 'Full 9-day Durga Saptashati recitation',
 '2 Pandits rotating, daily havan',
 'Kanya pujan with gifts for 9 girls',
 'Visarjan procession coordination',
 'Prasadam for 30',
 ],
 },
 recommendedPanditIds: ['p2', 'p5', 'p6', 'p8'],
 faq: [
 {
 q: 'Do I need to host the pandit for all nine days?',
 a: 'Only if you choose the Standard or Premium tier. Basic includes a single consolidated puja on Ashtami.',
 },
 {
 q: 'Who arranges the nine girls for Kanya Pujan?',
 a: 'Typically the host invites girls from the neighborhood or family. We can coordinate with a local trust on request.',
 },
 ],
 },
 {
 slug: 'ganesh-puja',
 name: 'Ganesh Puja',
 nameLocal: 'गणेश पूजा',
 tagline: 'Remover of obstacles, bestower of wisdom',
 icon: 'Flame',
 accent: 'var(--color-vermillion-500)',
 duration: '1.5 – 2.5 hours',
 startingPrice: 1100,
 description:
 'Ganesh Puja invokes Lord Ganesha — Vighnaharta — at the start of any new venture, festival, or life milestone. Performed for Ganesh Chaturthi or as a standalone blessing ceremony.',
 significance: [
 'Lord Ganesha is invoked at the beginning of every Hindu ritual. Worshipping him first ensures the removal of all obstacles in the path of a new endeavor.',
 'The Ganesh Atharvashirsha is among the most potent Vedic hymns, with each verse unlocking different faculties of intellect, wealth, and protection.',
 'During Ganesh Chaturthi — the 10-day festival in Bhadrapada month — families install a clay Ganesh murti, perform daily aarti, and immerse the murti in water on Anant Chaturdashi.',
 'Beyond festivals, Ganesh Puja is ideal before starting a new business, opening a shop, beginning studies, or moving into a new phase of life.',
 ],
 included: [
 'Pranapratishtha of Ganesh murti',
 'Shodashopachara Puja',
 'Ganesh Atharvashirsha paath (108 times)',
 'Modak prasad',
 'Aarti and 21 durva offering',
 'All samagri',
 ],
 prepareAtHome:
 'Place a clay or metal Ganesh idol on a clean chowki facing east. Arrange red flowers (especially hibiscus), durva grass, modaks, and 21 blades of durva. Light a ghee diya.',
 muhurat:
 'Ganesh Chaturthi (Aug–Sep) is the primary festival. Any Chaturthi tithi is auspicious; Wednesday is his weekday.',
 pricing: { basic: 1100, standard: 2500, premium: 5100 },
 pricingDetails: {
 basic: [
 '1 Pandit, 1.5-hour puja',
 'Standard samagri',
 'Modak prasad for 6',
 ],
 standard: [
 '1 Senior Pandit, 2-hour puja',
 'Atharvashirsha 108 paath',
 'Fresh ukdiche modak',
 'Prasadam for 12',
 ],
 premium: [
 '2 Pandits, 2.5-hour puja with Havan',
 'Atharvashirsha 1008 paath',
 'Brass/silver Ganesh idol included',
 'Prasadam for 25',
 ],
 },
 recommendedPanditIds: ['p1', 'p3', 'p4', 'p7'],
 faq: [
 {
 q: 'Can the pandit arrange the idol?',
 a: 'Premium tier includes a brass or silver Ganesh idol. Basic and Standard expect the host to provide a clay murti.',
 },
 {
 q: 'Do you help with visarjan?',
 a: 'We coordinate visarjan on Anant Chaturdashi for Ganesh Chaturthi bookings. The pandit will guide the family through the immersion ritual.',
 },
 ],
 },
 {
 slug: 'lakshmi-puja-diwali',
 name: 'Lakshmi Puja (Diwali)',
 nameLocal: 'लक्ष्मी पूजा',
 tagline: 'Diwali night worship of wealth goddess',
 icon: 'Flame',
 accent: 'var(--color-temple-gold)',
 duration: '2 – 3 hours',
 startingPrice: 2500,
 description:
 'Lakshmi Puja on Diwali night invokes Goddess Mahalakshmi along with Lord Ganesha and Saraswati. Performed in the Pradosh Kaal (evening twilight) for maximum auspiciousness.',
 significance: [
 'Diwali Lakshmi Puja is performed on Amavasya of Kartik month, the darkest night of the year. Lighting lamps and performing Lakshmi Puja symbolizes the triumph of light over darkness and prosperity over poverty.',
 'The triad worshipped is Ganesha (wisdom), Lakshmi (wealth), and Saraswati (knowledge) — together representing a balanced and flourishing life.',
 'Shri Sukta, Kanakdhara Stotra, and Mahalakshmi Ashtakam are the principal hymns recited. Kumkum archana is performed with 108 names of the goddess.',
 'Traditional offerings include kheel (puffed rice), batashe (sugar candies), lotus flowers, kamal gatta beads, and silver coins. Business families worship their account books (chopda pujan).',
 ],
 included: [
 'Ganesh, Lakshmi, Saraswati invocation',
 'Kubera Puja for wealth',
 'Shri Sukta paath',
 'Kumkum archana (108 names)',
 'Chopda pujan for business families',
 'All samagri including kheel, batashe, lotus',
 ],
 prepareAtHome:
 'Clean the entire home and decorate with rangoli at the entrance. Light diyas in every corner. Arrange a chowki facing east with idols or photos of Ganesh, Lakshmi, and Saraswati. Keep silver/gold coins, account books if business, and flowers.',
 muhurat:
 'Pradosh Kaal of Kartik Amavasya (evening after sunset, approximately 6–8 PM) is the most auspicious window.',
 pricing: { basic: 2500, standard: 5100, premium: 11000 },
 pricingDetails: {
 basic: [
 '1 Pandit, 2-hour puja',
 'Standard samagri',
 'Prasadam for 8',
 ],
 standard: [
 '1 Senior Pandit, 2.5-hour puja',
 'Shri Sukta + Kanakdhara paath',
 'Chopda pujan for business',
 'Prasadam for 15',
 ],
 premium: [
 '2 Pandits with Kubera Yagna',
 'Shri Sukta 108 paath',
 'Silver coins and kamal gatta mala included',
 'Prasadam for 30',
 ],
 },
 recommendedPanditIds: ['p2', 'p4', 'p6', 'p8'],
 faq: [
 {
 q: 'What time should I book the puja?',
 a: 'Pradosh Kaal — the twilight window after sunset — is most auspicious, typically 5:30 PM to 8:30 PM depending on your city.',
 },
 {
 q: 'Do you do chopda pujan for our shop?',
 a: 'Yes. Standard and Premium tiers include chopda pujan (account book worship) at the business premises or home.',
 },
 ],
 },
 {
 slug: 'rudrabhishek',
 name: 'Rudrabhishek',
 nameLocal: 'रुद्राभिषेक',
 tagline: 'Sacred bathing of the Shiva Lingam',
 icon: 'Flame',
 accent: 'var(--color-sacred-red)',
 duration: '2 – 3 hours',
 startingPrice: 2100,
 description:
 'Rudrabhishek is the abhishek (ritual bathing) of Lord Shiva in his Rudra form, performed with recitation of the Rudri or Rudra Namakam. One of the most powerful Shiva pujas, especially potent on Mondays and Shivratri.',
 significance: [
 'Rudrabhishek is described in the Yajurveda. The Rudri is a set of eleven chapters (Ekadashini) of which the Namakam and Chamakam are the heart. Their recitation during abhishek is said to dissolve karmic debts.',
 'Performed on a Shiva Lingam with offerings of milk, curd, honey, ghee, sugar (panchamrit), along with sandalwood paste, bilva leaves, and pure water from the Ganga if available.',
 'Particularly recommended for those facing health issues, planetary doshas, marriage delays, and for progeny. Shiva\u2019s blessings are said to grant both bhoga (worldly enjoyment) and moksha (liberation).',
 'Performing Rudrabhishek on 11, 21, or 108 Shiva Lingams in one sitting amplifies the potency manifold.',
 ],
 included: [
 'Ganesh Puja and Sankalp',
 'Kalash Sthapana',
 'Pranapratishtha of Shiva Lingam (if needed)',
 'Full Rudri paath',
 'Panchamrit abhishek',
 'Bilva leaf archana (1008)',
 'All samagri',
 ],
 prepareAtHome:
 'Arrange a metal or clay Shiva Lingam on a brass plate at the north-east corner. Keep milk, honey, curd, ghee, sugar, Ganga jal, bilva leaves, and white flowers ready. Family members should observe a light fast.',
 muhurat:
 'Mondays, Pradosh (13th tithi), Shivaratri (14th of Krishna Paksha every month), Maha Shivaratri (Phalgun), and Shravan month.',
 pricing: { basic: 2100, standard: 4100, premium: 8100 },
 pricingDetails: {
 basic: [
 '1 Pandit, 2-hour abhishek',
 'Ekadashini Rudri paath',
 'Standard samagri + bilva',
 'Prasadam for 8',
 ],
 standard: [
 '1 Senior Pandit, 2.5-hour abhishek',
 'Rudri + Mahamrityunjaya jaap',
 'Premium samagri with Gangajal',
 'Prasadam for 15',
 ],
 premium: [
 '2 Pandits, Laghu Rudra (11x Rudri)',
 'Mahamrityunjaya 1008 jaap',
 'Panchdhara abhishek',
 'Silver Shiva Lingam included',
 'Prasadam for 25',
 ],
 },
 recommendedPanditIds: ['p1', 'p5', 'p6', 'p7'],
 faq: [
 {
 q: 'Is Rudrabhishek suitable for health issues?',
 a: 'Yes. The Standard and Premium tiers include Mahamrityunjaya jaap, which is traditionally prescribed for longevity and recovery from illness.',
 },
 {
 q: 'Can this be done for a deceased family member?',
 a: 'Rudrabhishek is for the living. For the departed, we recommend Shraadh or Pitra Paksh puja.',
 },
 ],
 },
 {
 slug: 'birthday-janmadin-puja',
 name: 'Birthday / Janmadin Puja',
 nameLocal: 'जन्मदिन पूजा',
 tagline: 'Ayushya Homam for long life on your birthday',
 icon: 'Heart',
 accent: 'var(--color-saffron-500)',
 duration: '1.5 – 2 hours',
 startingPrice: 1500,
 description:
 'Janmadin Puja or Ayushya Homam is performed on the nakshatra-birthday (not English birthday) of a person. It invokes longevity, health, and wards off planetary afflictions for the coming year.',
 significance: [
 'In Vedic tradition, the true birthday is the return of one\u2019s birth nakshatra (janma nakshatra) each month, not the calendar date. The annual nakshatra return is a powerful day for spiritual renewal.',
 'Ayushya Homam is drawn from the Atharvaveda and involves offerings of milk, ghee, and rice to Agni with chants for longevity. Markandeya Puja is often combined for warding off untimely death.',
 'Children, especially, benefit from annual Ayushya Homam until age 12. It is said to strengthen life force (prana) and mental clarity.',
 'For adults, the puja clears any anticipated problems in the upcoming year based on planetary transits over the natal chart.',
 ],
 included: [
 'Ganesh Puja and Sankalp with nakshatra',
 'Ayushya Homam',
 'Markandeya Puja',
 'Navagraha shanti (for adults)',
 'Prasadam and birthday aarti',
 'All samagri',
 ],
 prepareAtHome:
 'The person celebrating should wear new clothes and be freshly bathed. Arrange a chowki facing east with a photo of Ishta Devta. Keep flowers, a small havan kund, and a garland ready.',
 muhurat: 'Morning of janma nakshatra day. Best slots: 7–10 AM local time.',
 pricing: { basic: 1500, standard: 3100, premium: 6100 },
 pricingDetails: {
 basic: [
 '1 Pandit, 1.5-hour puja',
 'Ayushya Homam',
 'Standard samagri',
 'Prasadam for 6',
 ],
 standard: [
 '1 Senior Pandit, 2-hour puja',
 'Ayushya + Markandeya',
 'Custom nakshatra sankalp',
 'Prasadam for 12',
 ],
 premium: [
 '2 Pandits, 2-hour puja with Navagraha',
 'Ayushya + Markandeya + Navagraha shanti',
 'Birth chart consultation (30 min)',
 'Prasadam for 20',
 ],
 },
 recommendedPanditIds: ['p3', 'p4', 'p7', 'p8'],
 faq: [
 {
 q: 'When should I schedule — English birthday or nakshatra birthday?',
 a: 'Traditionally the nakshatra birthday is preferred. Premium tier includes a consultation to calculate your exact nakshatra return date.',
 },
 {
 q: 'Is this suitable for children?',
 a: 'Absolutely. Ayushya Homam is especially recommended for children annually until age 12.',
 },
 ],
 },
 {
 slug: 'shraadh-pitra-paksh',
 name: 'Shraadh / Pitra Paksh',
 nameLocal: 'श्राद्ध / पितृ पक्ष',
 tagline: 'Offering to ancestors for their peace',
 icon: 'Flame',
 accent: 'var(--color-rudraksha-brown)',
 duration: '2 – 4 hours',
 startingPrice: 2100,
 description:
 'Shraadh is the ritual offering to departed ancestors (pitrs), performed annually on their death anniversary tithi or during the 16-day Pitra Paksha period. Releases the souls from any lingering karmic debts.',
 significance: [
 'Pitra Paksha is the 16-day period of the dark fortnight of Ashwin month, dedicated to honoring deceased ancestors. It is believed the pitrs descend from Pitra Loka during this time to receive offerings.',
 'The Shraadh ritual involves tarpan (water offerings with sesame and barley), pinda dan (rice ball offerings), and feeding of Brahmins and cows. Each pinda represents an ancestor for three generations.',
 'If Shraadh is not performed, it is believed that ancestors may remain unsettled, causing pitru dosha — obstacles in marriage, childbirth, and family prosperity.',
 'The ceremony also includes charity to the needy and donations to cows, crows, and dogs, who are considered messengers of the ancestors.',
 ],
 included: [
 'Sankalp with three generations of ancestors\u2019 names',
 'Tarpan at home (or Gaya/Varanasi coordination)',
 'Pinda Dan ceremony',
 'Brahmana bhojan coordination',
 'Donation arrangements',
 'All samagri',
 ],
 prepareAtHome:
 'The host should bathe and wear plain white or cream clothes. No onion, garlic, or non-vegetarian food in the home on that day. Arrange a clean area in the south (direction of pitrs) for the offerings. Prepare satvik food for the pandit and for donation.',
 muhurat:
 'Specific tithi of ancestor\u2019s passing during Pitra Paksha (Sep–Oct). Otherwise, any Amavasya, Ekadashi, or monthly tithi of passing.',
 pricing: { basic: 2100, standard: 4500, premium: 11000 },
 pricingDetails: {
 basic: [
 '1 Pandit, 2-hour tarpan + pinda dan',
 'Standard samagri',
 'Basic donation kit',
 ],
 standard: [
 '1 Senior Pandit, 3-hour ceremony',
 'Full tarpan for 3 generations',
 'Brahmin bhojan for 3',
 'Donation to gaushala coordinated',
 ],
 premium: [
 '2 Pandits, 4-hour ceremony',
 'Tripindi Shraadh included',
 'Brahmin bhojan for 7',
 'Coordination with Gaya/Trimbakeshwar for shila offering',
 'Full pitru dosha nivaran puja',
 ],
 },
 recommendedPanditIds: ['p1', 'p2', 'p5', 'p6'],
 faq: [
 {
 q: 'Is this appropriate if I don\u2019t know my ancestors\u2019 gotra?',
 a: 'Yes. The pandit can perform a general ancestor tarpan. If you know the gotra, the sankalp becomes more specific but it is not mandatory.',
 },
 {
 q: 'Can this replace a trip to Gaya?',
 a: 'A Gaya Shraadh at Vishnupad Mandir is considered the highest form. The Premium tier coordinates a proxy Gaya pind-dan with a pandit in Gaya on your behalf.',
 },
 ],
 },
];

// ──────────────────────────────────────────────────────────────────────────
// PANDITS — Home Puja specialists
// ──────────────────────────────────────────────────────────────────────────

export const homePandits: Pandit[] = [
 {
 id: 'p1',
 name: 'Acharya Shashank Tripathi',
 title: 'Acharya in Yajurveda',
 initials: 'ST',
 avatarBg: 'var(--color-saffron-500)',
 specialty: ['Home Pujas', 'Griha Pravesh', 'Rudrabhishek', 'Shraadh'],
 experience: 22,
 pujasPerformed: 3200,
 languages: ['Hindi', 'Sanskrit', 'English', 'Bhojpuri'],
 city: 'Varanasi',
 serviceArea: ['Varanasi', 'Prayagraj', 'Lucknow', 'Kanpur'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.9,
 reviewCount: 412,
 pricing: {
 homePuja: { basic: 2100, standard: 4500, premium: 9100 },
 grihaPravesh: { basic: 5100, standard: 11000, premium: 21000 },
 },
 bio: 'Acharya Tripathi learnt Vedic traditions at Sampurnanand Sanskrit University, Varanasi. He has conducted over 3,200 pujas across North India and specializes in Rudrabhishek and Griha Pravesh. He speaks conversational English and explains rituals to NRI families.',
 credentials: ['Acharya, Sampurnanand Sanskrit University', 'Veda-Ratna from Kashi Vidvat Parishad'],
 availability: [
 { date: '2026-04-22', slots: ['Morning', 'Afternoon'] },
 { date: '2026-04-23', slots: ['Morning'] },
 { date: '2026-04-24', slots: ['Morning', 'Evening'] },
 { date: '2026-04-25', slots: ['Afternoon', 'Evening'] },
 { date: '2026-04-26', slots: ['Morning', 'Afternoon', 'Evening'] },
 { date: '2026-04-27', slots: ['Evening'] },
 { date: '2026-04-28', slots: ['Morning', 'Afternoon'] },
 ],
 },
 {
 id: 'p2',
 name: 'Pandit Yogesh Sharma',
 title: 'Vedic Scholar, Pitra Karma Specialist',
 initials: 'YS',
 avatarBg: 'var(--color-vermillion-500)',
 specialty: ['Satyanarayan Katha', 'Navratri', 'Shraadh', 'Lakshmi Puja'],
 experience: 18,
 pujasPerformed: 2600,
 languages: ['Hindi', 'Sanskrit', 'English', 'Marwari'],
 city: 'Jaipur',
 serviceArea: ['Jaipur', 'Ajmer', 'Jodhpur', 'Udaipur'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.8,
 reviewCount: 318,
 pricing: {
 homePuja: { basic: 1800, standard: 3500, premium: 7500 },
 },
 bio: 'Pandit Yogesh Sharma is a Vedic scholar from Jagadguru Ramanandacharya Sanskrit University, Jaipur. He is widely sought after for Satyanarayan Katha and Shraadh karma. His storytelling style makes rituals engaging for children and the elderly alike.',
 credentials: ['Shastri, Jagadguru Ramanandacharya Sanskrit University'],
 availability: [
 { date: '2026-04-22', slots: ['Morning'] },
 { date: '2026-04-23', slots: ['Afternoon', 'Evening'] },
 { date: '2026-04-24', slots: ['Morning', 'Afternoon'] },
 { date: '2026-04-25', slots: ['Morning'] },
 { date: '2026-04-26', slots: ['Evening'] },
 { date: '2026-04-27', slots: ['Morning', 'Afternoon', 'Evening'] },
 { date: '2026-04-28', slots: ['Morning'] },
 ],
 },
 {
 id: 'p3',
 name: 'Acharya Ramesh Iyer',
 title: 'Krishna Yajurveda Acharya',
 initials: 'RI',
 avatarBg: 'var(--color-tulsi-green)',
 specialty: ['Home Pujas', 'Griha Pravesh', 'Ganesh Puja', 'Ayushya Homam'],
 experience: 15,
 pujasPerformed: 1900,
 languages: ['Tamil', 'Sanskrit', 'English', 'Hindi', 'Kannada'],
 city: 'Chennai',
 serviceArea: ['Chennai', 'Coimbatore', 'Bangalore', 'Pondicherry'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.9,
 reviewCount: 267,
 pricing: {
 homePuja: { basic: 2500, standard: 5100, premium: 10100 },
 grihaPravesh: { basic: 6100, standard: 12100, premium: 22100 },
 },
 bio: 'Acharya Iyer belongs to a traditional Vadama family with seven generations of Vedic pandits. Trained at Sringeri Sharada Peetham, he performs all pujas in strict Krishna Yajurveda tradition with South Indian flavor.',
 credentials: ['Veda Abhyasa, Sringeri Sharada Peetham', 'Agama Shastra certification'],
 availability: [
 { date: '2026-04-22', slots: ['Morning', 'Evening'] },
 { date: '2026-04-23', slots: ['Morning'] },
 { date: '2026-04-24', slots: ['Afternoon', 'Evening'] },
 { date: '2026-04-25', slots: ['Morning', 'Afternoon'] },
 { date: '2026-04-26', slots: ['Morning'] },
 { date: '2026-04-27', slots: ['Afternoon'] },
 { date: '2026-04-28', slots: ['Morning', 'Evening'] },
 ],
 },
 {
 id: 'p4',
 name: 'Pandit Mukesh Shukla',
 title: 'Rigveda Scholar',
 initials: 'MS',
 avatarBg: 'var(--color-ganga-blue)',
 specialty: ['Satyanarayan', 'Lakshmi Puja', 'Birthday Puja', 'Ganesh Puja'],
 experience: 12,
 pujasPerformed: 1450,
 languages: ['Hindi', 'Sanskrit', 'English', 'Marathi'],
 city: 'Mumbai',
 serviceArea: ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.7,
 reviewCount: 198,
 pricing: {
 homePuja: { basic: 2500, standard: 4500, premium: 9500 },
 },
 bio: 'Pandit Mukesh Shukla is Mumbai\u2019s go-to pandit for corporate puja bookings, Ganpati festival rituals, and family Satyanarayan katha. Fluent in English with a modern, approachable style.',
 credentials: ['Shastri, Rashtriya Sanskrit Sansthan'],
 availability: [
 { date: '2026-04-22', slots: ['Afternoon', 'Evening'] },
 { date: '2026-04-23', slots: ['Morning', 'Evening'] },
 { date: '2026-04-24', slots: ['Morning'] },
 { date: '2026-04-25', slots: ['Afternoon'] },
 { date: '2026-04-26', slots: ['Morning', 'Afternoon', 'Evening'] },
 { date: '2026-04-27', slots: ['Evening'] },
 { date: '2026-04-28', slots: ['Morning', 'Afternoon'] },
 ],
 },
 {
 id: 'p5',
 name: 'Acharya Hardik Mehta',
 title: 'Atharvaveda Acharya',
 initials: 'HM',
 avatarBg: 'var(--color-temple-gold)',
 specialty: ['Griha Pravesh', 'Vastu Shanti', 'Rudrabhishek', 'Navratri'],
 experience: 20,
 pujasPerformed: 2800,
 languages: ['Gujarati', 'Hindi', 'Sanskrit', 'English'],
 city: 'Ahmedabad',
 serviceArea: ['Ahmedabad', 'Surat', 'Vadodara', 'Gandhinagar', 'Rajkot'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.9,
 reviewCount: 356,
 pricing: {
 homePuja: { basic: 2100, standard: 4100, premium: 8500 },
 grihaPravesh: { basic: 5500, standard: 11500, premium: 21500 },
 },
 bio: 'Acharya Hardik Mehta specializes in Vastu Shanti and Griha Pravesh ceremonies across Gujarat. A Vastu consultant for 15+ years, he combines ritual precision with practical home energy analysis.',
 credentials: ['Acharya, Somnath Sanskrit University', 'Certified Vastu Shastri'],
 availability: [
 { date: '2026-04-22', slots: ['Morning'] },
 { date: '2026-04-23', slots: ['Afternoon'] },
 { date: '2026-04-24', slots: ['Morning', 'Evening'] },
 { date: '2026-04-25', slots: ['Morning', 'Afternoon', 'Evening'] },
 { date: '2026-04-26', slots: ['Morning'] },
 { date: '2026-04-27', slots: ['Morning', 'Evening'] },
 { date: '2026-04-28', slots: ['Afternoon'] },
 ],
 },
 {
 id: 'p6',
 name: 'Pandit Debashish Chatterjee',
 title: 'Bengali Vedic Pandit',
 initials: 'DC',
 avatarBg: 'var(--color-lotus-pink)',
 specialty: ['Durga Puja', 'Satyanarayan', 'Rudrabhishek', 'Shraadh'],
 experience: 16,
 pujasPerformed: 2100,
 languages: ['Bengali', 'Hindi', 'Sanskrit', 'English'],
 city: 'Kolkata',
 serviceArea: ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.8,
 reviewCount: 243,
 pricing: {
 homePuja: { basic: 1900, standard: 3800, premium: 7800 },
 },
 bio: 'Pandit Chatterjee is known for authentic Bengali-style Durga Puja and Satyanarayan Katha. A graduate of Sanskrit College, Kolkata, he brings traditional Bongaon rituals to your home.',
 credentials: ['MA Sanskrit, Sanskrit College Kolkata'],
 availability: [
 { date: '2026-04-22', slots: ['Evening'] },
 { date: '2026-04-23', slots: ['Morning', 'Afternoon'] },
 { date: '2026-04-24', slots: ['Morning'] },
 { date: '2026-04-25', slots: ['Afternoon', 'Evening'] },
 { date: '2026-04-26', slots: ['Morning', 'Afternoon'] },
 { date: '2026-04-27', slots: ['Morning'] },
 { date: '2026-04-28', slots: ['Evening'] },
 ],
 },
 {
 id: 'p7',
 name: 'Pandit Kailash Trivedi',
 title: 'Karma Kanda Pandit',
 initials: 'KT',
 avatarBg: 'var(--color-saffron-600)',
 specialty: ['Rudrabhishek', 'Ganesh Puja', 'Birthday Puja', 'Satyanarayan'],
 experience: 14,
 pujasPerformed: 1700,
 languages: ['Hindi', 'Sanskrit', 'English', 'Punjabi'],
 city: 'Delhi',
 serviceArea: ['Delhi', 'Gurugram', 'Noida', 'Ghaziabad', 'Faridabad'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.7,
 reviewCount: 212,
 pricing: {
 homePuja: { basic: 2300, standard: 4300, premium: 8800 },
 },
 bio: 'Pandit Kailash Trivedi serves Delhi NCR families with a focus on urban-friendly scheduling and bilingual rituals. Known for his clarity in explaining ritual significance to first-time puja hosts.',
 credentials: ['Shastri, Lal Bahadur Shastri Sanskrit Vidyapeeth'],
 availability: [
 { date: '2026-04-22', slots: ['Afternoon', 'Evening'] },
 { date: '2026-04-23', slots: ['Morning'] },
 { date: '2026-04-24', slots: ['Afternoon'] },
 { date: '2026-04-25', slots: ['Morning', 'Evening'] },
 { date: '2026-04-26', slots: ['Afternoon', 'Evening'] },
 { date: '2026-04-27', slots: ['Morning', 'Afternoon'] },
 { date: '2026-04-28', slots: ['Morning', 'Evening'] },
 ],
 },
 {
 id: 'p8',
 name: 'Acharya Bhaskar Reddy',
 title: 'Agama Shastra Acharya',
 initials: 'BR',
 avatarBg: 'var(--color-rudraksha-brown)',
 specialty: ['Griha Pravesh', 'Ayushya Homam', 'Lakshmi Puja', 'Navratri'],
 experience: 17,
 pujasPerformed: 2200,
 languages: ['Telugu', 'Sanskrit', 'English', 'Hindi', 'Tamil'],
 city: 'Hyderabad',
 serviceArea: ['Hyderabad', 'Secunderabad', 'Vijayawada', 'Visakhapatnam'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.8,
 reviewCount: 289,
 pricing: {
 homePuja: { basic: 2400, standard: 4800, premium: 9800 },
 grihaPravesh: { basic: 5800, standard: 11800, premium: 22000 },
 },
 bio: 'Acharya Bhaskar Reddy performs pujas in Telugu Smartha and Vaikhanasa Agama traditions. Serves Hyderabad and coastal Andhra Pradesh for Griha Pravesh and Lakshmi Puja specifically.',
 credentials: ['Agama Shastra Acharya, Tirumala Tirupati Devasthanams'],
 availability: [
 { date: '2026-04-22', slots: ['Morning', 'Evening'] },
 { date: '2026-04-23', slots: ['Afternoon'] },
 { date: '2026-04-24', slots: ['Morning'] },
 { date: '2026-04-25', slots: ['Afternoon', 'Evening'] },
 { date: '2026-04-26', slots: ['Evening'] },
 { date: '2026-04-27', slots: ['Morning', 'Afternoon'] },
 { date: '2026-04-28', slots: ['Morning', 'Afternoon', 'Evening'] },
 ],
 },
];

// ──────────────────────────────────────────────────────────────────────────
// PANDITS — Marriage / Wedding specialists
// ──────────────────────────────────────────────────────────────────────────

export const weddingPandits: Pandit[] = [
 {
 id: 'w1',
 name: 'Acharya Vidyadhar Bhatt',
 title: 'Vivaha Sanskara Specialist, Kashi',
 initials: 'VB',
 avatarBg: 'var(--color-saffron-500)',
 specialty: ['Hindu Vivah', 'Vedic Weddings', 'Arya Samaj', 'Kanyadaan'],
 experience: 28,
 pujasPerformed: 4200,
 weddingsPerformed: 620,
 languages: ['Hindi', 'Sanskrit', 'English', 'Gujarati', 'Marwari'],
 city: 'Varanasi',
 serviceArea: ['Varanasi', 'Delhi', 'Mumbai', 'Jaipur', 'Lucknow'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 5.0,
 reviewCount: 584,
 pricing: {
 homePuja: { basic: 5100, standard: 11000, premium: 21000 },
 marriage: { basic: 25000, standard: 51000, premium: 101000 },
 },
 bio: 'Acharya Vidyadhar Bhatt is among India\u2019s most sought-after wedding pandits, having officiated 620+ weddings including several celebrity ceremonies. His Sanskrit chanting is pristine and he narrates each rite in English for guests.',
 credentials: ['Acharya, Sampurnanand Sanskrit University', 'Veda-Ratna, Kashi Vidvat Parishad', 'Sanskrit Sahitya Acharya'],
 availability: [
 { date: '2026-04-22', slots: ['Consultation'] },
 { date: '2026-04-23', slots: ['Consultation'] },
 { date: '2026-04-24', slots: ['Booked'] },
 { date: '2026-04-25', slots: ['Booked'] },
 { date: '2026-04-26', slots: ['Consultation', 'Muhurat check'] },
 { date: '2026-04-27', slots: ['Consultation'] },
 { date: '2026-04-28', slots: ['Consultation', 'Muhurat check'] },
 ],
 },
 {
 id: 'w2',
 name: 'Pandit Girish Joshi',
 title: 'Maharashtrian Vivaha Pandit',
 initials: 'GJ',
 avatarBg: 'var(--color-vermillion-500)',
 specialty: ['Marathi Lagna', 'Hindu Vivah', 'Court Marriage + Vedic', 'Simantonnayan'],
 experience: 22,
 pujasPerformed: 3100,
 weddingsPerformed: 410,
 languages: ['Marathi', 'Hindi', 'Sanskrit', 'English'],
 city: 'Pune',
 serviceArea: ['Pune', 'Mumbai', 'Nashik', 'Kolhapur', 'Nagpur'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.9,
 reviewCount: 362,
 pricing: {
 homePuja: { basic: 3500, standard: 7500, premium: 15500 },
 marriage: { basic: 18000, standard: 38000, premium: 75000 },
 },
 bio: 'Pandit Girish Joshi specializes in Maharashtrian weddings with their distinct rituals — Seemantpoojan, Mangalashtake, Saptapadi, and Lakshmi Pujan. He blends traditional Brahmin wedding etiquette with modern accessibility.',
 credentials: ['Veda-Shastra-Sampanna, Tilak Maharashtra Vidyapeeth'],
 availability: [
 { date: '2026-04-22', slots: ['Consultation'] },
 { date: '2026-04-23', slots: ['Booked'] },
 { date: '2026-04-24', slots: ['Consultation'] },
 { date: '2026-04-25', slots: ['Consultation', 'Muhurat check'] },
 { date: '2026-04-26', slots: ['Booked'] },
 { date: '2026-04-27', slots: ['Consultation'] },
 { date: '2026-04-28', slots: ['Consultation'] },
 ],
 },
 {
 id: 'w3',
 name: 'Acharya Sundaresan Shastri',
 title: 'Kalyanam Specialist, Thirumana Pandit',
 initials: 'SS',
 avatarBg: 'var(--color-tulsi-green)',
 specialty: ['South Indian Wedding', 'Kalyanam', 'Tamil Iyer Wedding', 'Telugu Pelli'],
 experience: 30,
 pujasPerformed: 4500,
 weddingsPerformed: 530,
 languages: ['Tamil', 'Telugu', 'Sanskrit', 'English', 'Malayalam', 'Kannada'],
 city: 'Chennai',
 serviceArea: ['Chennai', 'Bangalore', 'Hyderabad', 'Coimbatore', 'Madurai'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 5.0,
 reviewCount: 497,
 pricing: {
 homePuja: { basic: 4100, standard: 8100, premium: 16100 },
 marriage: { basic: 21000, standard: 45000, premium: 85000 },
 },
 bio: 'Acharya Sundaresan Shastri is a fourth-generation Vadhyar (priest) from a family that has served South Indian weddings for 120+ years. Known for his mastery of both Tamil Iyer and Telugu Smartha wedding traditions.',
 credentials: ['Ghanapathi, Veda Patashala Kanchipuram', 'Agama-Shastra-Ratna'],
 availability: [
 { date: '2026-04-22', slots: ['Consultation'] },
 { date: '2026-04-23', slots: ['Consultation'] },
 { date: '2026-04-24', slots: ['Consultation', 'Muhurat check'] },
 { date: '2026-04-25', slots: ['Booked'] },
 { date: '2026-04-26', slots: ['Booked'] },
 { date: '2026-04-27', slots: ['Consultation'] },
 { date: '2026-04-28', slots: ['Consultation'] },
 ],
 },
 {
 id: 'w4',
 name: 'Giani Harpreet Singh Ji',
 title: 'Anand Karaj Granthi',
 initials: 'HS',
 avatarBg: 'var(--color-ganga-blue)',
 specialty: ['Anand Karaj', 'Punjabi Wedding', 'Sikh Ceremonies', 'Blended Ceremonies'],
 experience: 20,
 pujasPerformed: 2600,
 weddingsPerformed: 340,
 languages: ['Punjabi', 'Gurmukhi', 'Hindi', 'English'],
 city: 'Amritsar',
 serviceArea: ['Amritsar', 'Delhi', 'Chandigarh', 'Ludhiana', 'Jalandhar'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.9,
 reviewCount: 298,
 pricing: {
 homePuja: { basic: 3500, standard: 7000, premium: 14000 },
 marriage: { basic: 21000, standard: 41000, premium: 78000 },
 },
 bio: 'Giani Harpreet Singh Ji is a Granthi from the Golden Temple community, officiating Anand Karaj ceremonies and blended Sikh-Hindu weddings. Respectful of both traditions when families request combined rites.',
 credentials: ['Granthi Certification, SGPC', 'Gurmat Sangeet Diploma'],
 availability: [
 { date: '2026-04-22', slots: ['Consultation'] },
 { date: '2026-04-23', slots: ['Consultation'] },
 { date: '2026-04-24', slots: ['Booked'] },
 { date: '2026-04-25', slots: ['Consultation'] },
 { date: '2026-04-26', slots: ['Consultation'] },
 { date: '2026-04-27', slots: ['Booked'] },
 { date: '2026-04-28', slots: ['Consultation'] },
 ],
 },
 {
 id: 'w5',
 name: 'Pandit Ashok Pandey',
 title: 'Arya Samaj Wedding Officiant',
 initials: 'AP',
 avatarBg: 'var(--color-temple-gold)',
 specialty: ['Arya Samaj Wedding', 'Court Marriage + Vedic', 'Inter-caste Weddings', 'Havan'],
 experience: 18,
 pujasPerformed: 2400,
 weddingsPerformed: 380,
 languages: ['Hindi', 'Sanskrit', 'English', 'Punjabi'],
 city: 'Delhi',
 serviceArea: ['Delhi', 'Gurugram', 'Noida', 'Ghaziabad', 'Faridabad', 'Jaipur'],
 verified: { aadhaar: true, background: true, vedicCert: true },
 rating: 4.8,
 reviewCount: 321,
 pricing: {
 homePuja: { basic: 2800, standard: 5800, premium: 11500 },
 marriage: { basic: 11000, standard: 25000, premium: 51000 },
 },
 bio: 'Pandit Ashok Pandey officiates Arya Samaj weddings which are legally recognized, affordable, and Vedic. He handles inter-caste and inter-faith weddings with sensitivity and all mandatory paperwork.',
 credentials: ['Arya Samaj Pratinidhi Sabha Certification', 'Vedic Sanskar Acharya'],
 availability: [
 { date: '2026-04-22', slots: ['Consultation', 'Booked'] },
 { date: '2026-04-23', slots: ['Consultation'] },
 { date: '2026-04-24', slots: ['Consultation'] },
 { date: '2026-04-25', slots: ['Booked'] },
 { date: '2026-04-26', slots: ['Consultation'] },
 { date: '2026-04-27', slots: ['Consultation'] },
 { date: '2026-04-28', slots: ['Consultation', 'Booked'] },
 ],
 },
];

// ──────────────────────────────────────────────────────────────────────────
// SAMPLE BOOKINGS
// ──────────────────────────────────────────────────────────────────────────

export const sampleBookings = [
 {
 id: 'BS-20260418-00142',
 category: 'griha-pravesh',
 categoryName: 'Griha Pravesh',
 panditId: 'p5',
 panditName: 'Acharya Hardik Mehta',
 date: '2026-04-24',
 slot: 'Morning',
 tier: 'standard',
 amount: 11500,
 customerName: 'Jignesh Patel',
 city: 'Ahmedabad',
 status: 'confirmed',
 },
 {
 id: 'BS-20260419-00158',
 category: 'marriage',
 categoryName: 'Hindu Vivah (Traditional)',
 panditId: 'w1',
 panditName: 'Acharya Vidyadhar Bhatt',
 date: '2026-05-12',
 slot: 'Evening',
 tier: 'premium',
 amount: 101000,
 customerName: 'Aanya & Kabir',
 city: 'Delhi',
 status: 'confirmed',
 },
 {
 id: 'BS-20260420-00189',
 category: 'satyanarayan-katha',
 categoryName: 'Satyanarayan Katha',
 panditId: 'p4',
 panditName: 'Pandit Mukesh Shukla',
 date: '2026-04-23',
 slot: 'Evening',
 tier: 'basic',
 amount: 2100,
 customerName: 'Deepika Kulkarni',
 city: 'Mumbai',
 status: 'confirmed',
 },
];

// ──────────────────────────────────────────────────────────────────────────
// MARRIAGE CEREMONY META
// ──────────────────────────────────────────────────────────────────────────

export type MarriageType = {
 slug: string;
 name: string;
 description: string;
 duration: string;
 startingPrice: number;
};

export const marriageTypes: MarriageType[] = [
 {
 slug: 'hindu-vivah',
 name: 'Hindu Vivah (Traditional)',
 description: 'Full Vedic wedding ceremony with all 16 sanskars, 7 pheras, kanyadaan, and Saptapadi. Duration: 4 hours.',
 duration: '4 hours',
 startingPrice: 25000,
 },
 {
 slug: 'court-vedic',
 name: 'Court Marriage + Vedic',
 description: 'Shorter Vedic rite performed alongside registered court marriage. Includes havan, saptapadi, and blessings.',
 duration: '1.5 – 2 hours',
 startingPrice: 11000,
 },
 {
 slug: 'arya-samaj',
 name: 'Arya Samaj Wedding',
 description: 'Legally recognized Vedic wedding as per Arya Samaj tradition. Same-day registration certificate.',
 duration: '2 hours',
 startingPrice: 11000,
 },
 {
 slug: 'south-indian',
 name: 'South Indian Wedding (Kalyanam)',
 description: 'Traditional Tamil Iyer, Telugu Smartha, or Kerala weddings with Mangal Snanam, Kashi Yatra, and Mangalya Dharanam.',
 duration: '5 – 6 hours',
 startingPrice: 21000,
 },
 {
 slug: 'punjabi-sikh',
 name: 'Punjabi / Sikh Blended',
 description: 'Anand Karaj with four laavaan, or blended Sikh-Hindu ceremony honoring both families\u2019 traditions.',
 duration: '3 – 4 hours',
 startingPrice: 21000,
 },
];

export const marriagePricingTiers = [
 {
 slug: 'simple',
 name: 'Simple',
 price: 11000,
 pandits: 1,
 duration: '2-hour ceremony',
 includes: [
 '1 Pandit',
 'Basic samagri',
 'All core rites (Kanyadaan, Saptapadi, Sindoor)',
 'Court marriage coordination (if needed)',
 ],
 },
 {
 slug: 'traditional',
 name: 'Traditional',
 price: 25000,
 pandits: 2,
 duration: '4-hour ceremony',
 includes: [
 '2 Pandits',
 'Full premium samagri',
 'All 16 sanskars',
 'Muhurtam consultation (pre-wedding)',
 'Mangalsutra, Sindoor, Vidai full ritual',
 'Live Sanskrit chanting',
 ],
 },
 {
 slug: 'grand',
 name: 'Grand',
 price: 51000,
 pandits: 3,
 duration: '6-hour ceremony',
 includes: [
 '3 Pandits',
 'Organic premium samagri',
 'All 16 sanskars + Engagement + Mehendi blessing',
 'Multilingual English narration for guests',
 'Pre-wedding consultations (3 sessions)',
 'Photography coordination',
 'Post-wedding Satyanarayan optional',
 ],
 },
];

export const marriageCoreRites = [
 'Kanyadaan',
 'Saptapadi (7 Pheras)',
 'Sindoor Daan',
 'Mangalsutra Dharanam',
 'Vidai',
 'Havan',
 'Ashirwad',
];

export const marriageAddOns = [
 'Live Sanskrit chanting by Vedic scholars',
 'Multilingual English explanation for guests',
 'Engagement (Roka / Sagai) ceremony',
 'Mehendi / Haldi blessings',
 'Post-wedding Satyanarayan Katha',
 'Griha Pravesh for newlyweds\u2019 new home',
 'Pre-wedding Ganesh Puja',
 'Destination wedding travel',
];

// TC-05 (P1, trust) -- THE THREE INVENTED WEDDING TESTIMONIALS ARE GONE.
//
// This array used to hold three entries, every one `rating: 5`, each naming a
// couple, a city, a month in early 2026 and an officiating pandit -- and every
// one of them was written by a developer. There have been no completed
// weddings: nothing in the product has ever recorded a rated wedding booking.
// app/pujas/marriage/page.tsx rendered them under "Couples who said yes with
// Darshya" / "Real stories from recent weddings", which made them the strongest
// social proof on a page that takes bookings from Rs 11,000 up. The pandit names
// were the worst part -- a real trade credential (Acharya, Giani) attached to a
// person who does not exist, credited with officiating a wedding that did not
// happen.
//
// The temple half of TC-05 had the identical defect and was closed by publishing
// the REAL reviews instead: GET /temples/:slug/reviews reads PujaBooking rows
// with a non-null rating, i.e. a devotee who actually paid for and received the
// puja (lib/reviews.ts). There is no wedding equivalent -- no endpoint serves
// rated wedding bookings -- so the honest replacement here is nothing, not
// different data.
//
// Emptied rather than deleted: app/pujas/marriage/page.tsx maps over this array,
// so the export and its shape must survive, and the shape is what a real source
// would have to fill. Put rows back only from a rated booking, never by hand.
export type MarriageTestimonial = {
 couple: string;
 location: string;
 date: string;
 rating: number;
 panditName: string;
 text: string;
};

export const marriageTestimonials: MarriageTestimonial[] = [];
