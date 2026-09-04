// Home Puja + Marriage Ceremony — data module
//
// Ceremony categories, pricing tiers and marriage metadata. The header used to
// read "Verified pandit directory, ceremony categories, sample bookings for
// demo" — every clause of which was a problem:
//
//   - "Verified" is a vetting claim (TC-08) that nothing performs. The
//     `homePandits` / `weddingPandits` arrays carried
//     `verified: { aadhaar, background, vedicCert }` flags, star ratings and
//     weddingsPerformed counts for thirteen people who do not exist. They are
//     now DELETED, and the two booking steps that rendered them —
//     app/pujas/marriage/book/page.tsx (step 3) and
//     app/pujas/home-puja/book/BookHomePujaClient.tsx (step 2) — read the real
//     directory instead, `getPublicPriests()` in lib/pandit-api.ts, which is
//     what both LANDING pages already used.
//   - "sample bookings for demo" described `sampleBookings`, three fabricated
//     CONFIRMED bookings, deleted below.
//
// What is left is ceremony metadata: categories, rites, add-ons and price
// tiers. Nothing in this file is a claim about a person, and nothing in it
// should be read as a verification record.

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
 faq: { q: string; a: string }[];
};

// TC-05 / TC-08 — the `Pandit` type went with the roster it described. Its
// fields were the fabrication: `verified: { aadhaar, background, vedicCert }`,
// `rating`, `reviewCount`, `weddingsPerformed`, `credentials`. The real shape
// is `PriestSummary` in lib/pandit-api.ts, which carries only what
// `GET /priests` can source.

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

// TC-05 / TC-08 — THE PANDIT DIRECTORY, deleted.
//
// `homePandits` (8 rows) and `weddingPandits` (5) were thirteen hand-typed
// people who do not exist. Each carried a name, a title, a city, a service
// area, a bio, university credentials, a star rating to one decimal, a review
// count in the hundreds, a weddings-performed tally up to 620, a seven-day
// availability calendar, a per-tier price and a
// `verified: { aadhaar, background, vedicCert }` block — the vetting result
// TC-08 is about, asserted as a literal.
//
// Unlike the `reviews` and `sampleBookings` fixtures deleted above, these were
// RENDERED: the selectable roster in step 3 of the wedding checkout and step 2
// of the home-puja checkout, under "13 Vedic-certified officiants" and
// "N verified specialists". A couple chose a named officiant, with a rating,
// at a price, and the person was not real.
//
// Emptying the arrays was not an option — an empty roster leaves a required
// wizard step with nothing selectable. The real directory already exists and
// both LANDING pages already used it: `getPublicPriests()` in lib/pandit-api.ts
// over `GET /priests`, which serves only rows the platform has. Both wizards
// now read that, with an explicit no-preference option so the step still
// completes when the directory is empty.
//
// Traced before deleting, per the astrology-fixture precedent: nothing merges a
// live overlay onto these arrays. The only readers were the two wizards, both
// rewritten. `recommendedPanditIds` went with them — it mapped each category to
// four ids from p1..p8 and pointed at nothing once the rows were gone.

// TC-05 / precedent — SAMPLE BOOKINGS, deleted.
//
// `sampleBookings` was three hand-typed CONFIRMED bookings carrying
// real-format booking numbers (the `BS-YYYYMMDD-XXXXX` shape the API actually
// mints), amounts up to Rs 1,01,000, pandit ids, cities and customer names —
// one of them "Aanya & Kabir", the same invented couple that appeared in the
// deleted marriageTestimonials rows.
//
// Nothing in apps/web read it: the export had zero importers. It is deleted on
// the same precedent as the dead `trustScore: 90` fallback on /temples/[slug]
// and the per-pandit `reviews` arrays that lived on the deleted roster — a
// ready-made block of fabricated
// completed transactions sitting one `.map()` away from a render has no honest
// value to keep. Real booking rows come from the API; there is no fixture
// shape a page should ever fall back to for them.
//
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
// Kept as an EMPTY shape record with no reader. The predecessor emptied it while
// app/pujas/marriage/page.tsx still mapped over it; that <section> is now gone
// too, because a heading reading "Couples who said yes with Darshya" over an
// empty grid is still a claim. What survives is the type, the empty array, and
// the regression guard in __tests__/marriage-testimonials.tc05.test.tsx that
// throws if a row is ever added. Put rows back only from a rated booking that a
// devotee actually left, never by hand.
export type MarriageTestimonial = {
 couple: string;
 location: string;
 date: string;
 rating: number;
 panditName: string;
 text: string;
};

export const marriageTestimonials: MarriageTestimonial[] = [];
