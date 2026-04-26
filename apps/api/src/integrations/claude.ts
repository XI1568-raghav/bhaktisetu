import Anthropic from '@anthropic-ai/sdk';

// Provider selection: prefer Groq (OpenAI-compatible, free tier) when its key
// is present, else fall back to Anthropic. DEMO_MODE only when neither is set.
const HAS_GROQ = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'demo-key';
const HAS_ANTHROPIC =
 !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'demo-key';
const DEMO_MODE = !HAS_GROQ && !HAS_ANTHROPIC;

const anthropic = HAS_ANTHROPIC
 ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
 : (null as unknown as Anthropic);

const GROQ_BASE = 'https://api.groq.com/openai/v1';

// Model aliases. We keep the SONNET/HAIKU names (used by callers in
// ai.service.ts) but route them to whichever provider is active.
//
// SONNET tier — used for richer answers in /chat and /astrology
// HAIKU tier — used for fast/cheap calls (recommendations, summaries)
//
// Llama 3.3 70B (Groq) is the closest free analogue to Sonnet quality;
// Llama 3.1 8B Instant is the fast/cheap tier.
const GROQ_SONNET_MODEL = 'llama-3.3-70b-versatile';
const GROQ_HAIKU_MODEL = 'llama-3.1-8b-instant';
const ANTHROPIC_SONNET_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export const MODELS = {
 SONNET: HAS_GROQ ? GROQ_SONNET_MODEL : ANTHROPIC_SONNET_MODEL,
 HAIKU: HAS_GROQ ? GROQ_HAIKU_MODEL : ANTHROPIC_HAIKU_MODEL,
} as const;

// ─── Demo-mode static responses ────────────────────────────────────────────────

interface DemoTopic {
 keywords: string[];
 response: string;
}

const DEMO_TOPICS: DemoTopic[] = [
 // ─── Marriage / Relationships ──────────────────────────────────────────
 {
 keywords: ['marriage', 'vivah', 'shaadi', 'wedding', 'wife', 'husband', 'spouse', 'partner', 'relationship', 'love', 'marry', 'rishta', 'match'],
 response: `Marriage is one of the 16 sacred samskaras (संस्कार) in Hindu tradition. The Vedas describe it as a divine union ordained by the cosmos.

**श्लोक (Shloka):**
*"धर्मेच अर्थेच कामेच नातिचरामि"*
*"In dharma, artha, and kama, I shall not transgress."*
— This is the sacred vow (Saptapadi) spoken during the wedding ceremony.

**Guidance for Marriage & Relationships:**
- **Worship Shiva-Parvati** together on Mondays for harmony in married life
- **Chant the Katyayani Mantra** "ॐ कात्यायन्यै नमः" 108 times daily for those seeking a life partner
- The **Swayamvara Parvati Mantra** is especially powerful for removing obstacles in marriage
- **Perform Vivah Puja** at a Shiva temple for divine blessings

**From the Bhagavad Gita (Chapter 7, Verse 11):**
*"धर्माविरुद्धो भूतेषु कामोऽस्मि भरतर्षभ"*
*"I am the desire that is not contrary to dharma."*

Love and companionship, when aligned with dharma, are among life's greatest blessings.

 **On Darshya:** Book a **Vivah Puja** or **Gauri Shankar Puja** with verified priests at renowned temples. Check your **rashi compatibility** in our Astrology section for astrological guidance.`,
 },

 // ─── Health & Healing ─────────────────────────────────────────────────
 {
 keywords: ['health', 'healing', 'disease', 'illness', 'sick', 'cure', 'recovery', 'hospital', 'medical', 'pain', 'body', 'swasthya', 'rog'],
 response: `The ancient tradition recognizes health as the foundation of all spiritual pursuit. Charaka Samhita declares:

**श्लोक (Shloka):**
*"शरीरमाद्यं खलु धर्मसाधनम्"*
*"The body is indeed the primary instrument of dharma."*
— Mahakavi Kalidasa

**Sacred Healing Mantras:**

1. **Mahamrityunjaya Mantra (महामृत्युञ्जय मंत्र)** — The most powerful healing mantra:
*"ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् |
उर्वारुकमिव बन्धनान् मृत्योर्मुक्षीय मामृतात् ||"*
"We worship the three-eyed Lord Shiva who nourishes all beings. May He liberate us from the bondage of death, as a ripe cucumber is freed from its vine."

2. **Dhanvantari Mantra** — For invoking the divine physician:
*"ॐ नमो भगवते वासुदेवाय धन्वन्तरये"*

**Recommended Practices:**
- Chant Mahamrityunjaya Mantra 108 times during Brahma Muhurta (4–6 AM)
- Light a diya with mustard oil before Lord Shiva on Mondays
- Donate medicines to the needy on Saturdays for planetary blessings
- Follow Ayurvedic daily routine (Dinacharya) aligned with your prakriti

*Note: Spiritual healing complements medical treatment. Always consult qualified doctors for health concerns.*

 **On Darshya:** Book a **Mahamrityunjaya Japa** (11,000 chants) or **Dhanvantari Puja** for healing blessings. Watch **Live Darshan** for daily peace.`,
 },

 // ─── Children & Blessings ─────────────────────────────────────────────
 {
 keywords: ['child', 'baby', 'son', 'daughter', 'santaan', 'santan', 'pregnancy', 'fertility', 'conceive', 'putra', 'putri', 'newborn', 'childbirth'],
 response: `Children are regarded as the greatest blessing in Hindu tradition. The scriptures call them the continuation of one's dharmic lineage.

**श्लोक (Shloka):**
*"पुत्रत्वे च पितृत्वे च सर्वभूतहिते रतः"*
*"In being a child and in being a parent, one should be devoted to the welfare of all beings."*

**Santana Gopala Mantra (सन्तान गोपाल मंत्र):**
*"ॐ श्रीं ह्रीं क्लीं ग्लौं देवकीसुत गोविन्द वासुदेव जगत्पते |
देहि मे तनयं कृष्ण त्वामहं शरणं गतः ||"*
"O Lord Krishna, son of Devaki, protector of the universe, grant me a child. I take refuge in You."

**Guidance for Child-related Blessings:**
- **Santana Gopala Puja** — performed for the blessing of progeny
- **Pumsavana Homa** — traditional ceremony for a healthy pregnancy
- **Garbaraksha Puja** — protection during pregnancy
- Worship **Lord Krishna as Bal Gopal** (infant form) for children's wellbeing
- Chant **Santoshi Mata Mantra** on Fridays for family harmony

**For Children's Education & Wellbeing:**
- **Saraswati Puja** — for wisdom and academic success
- **Aksharabhyasam** — the traditional learning initiation ceremony

 **On Darshya:** Book **Santana Gopala Puja** or **Naamkaran Sanskar** for newborns with verified priests across India.`,
 },

 // ─── Education & Career ───────────────────────────────────────────────
 {
 keywords: ['education', 'study', 'exam', 'school', 'college', 'university', 'student', 'learn', 'vidya', 'padhai', 'career', 'job', 'success', 'business', 'puja', 'promotion', 'work', 'interview', 'naukri'],
 response: `The Vedic tradition places immense value on knowledge (विद्या) and righteous action (कर्म). Both education and career flourish through divine grace and disciplined effort.

**श्लोक (Shloka):**
*"विद्या ददाति विनयं विनयाद्याति पात्रताम् |
पात्रत्वात् धनमाप्नोति धनात् धर्मं ततः सुखम् ||"*
*"Knowledge gives humility, from humility comes worthiness, from worthiness comes wealth, from wealth comes dharma, and from dharma comes happiness."*

**Gayatri Mantra (गायत्री मंत्र):**
*"ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्"*
"We meditate upon the divine light of the Creator. May it illuminate our intellect."

**Recommended Pujas & Practices:**
1. **Ganesha Puja** — Lord Ganesha is the remover of obstacles. Perform before any new venture or important exam.
2. **Saraswati Puja** — For wisdom, knowledge, and skill. Especially powerful on Vasant Panchami.
3. **Lakshmi Puja** — For financial prosperity. Perform on Fridays or during Diwali.
4. **Navagraha Puja** — To mitigate negative planetary influences on career.
5. **Vishnu Sahasranama** — Chanting 1000 names of Lord Vishnu brings stability and success.

**Daily Practices:**
- Chant Gayatri Mantra 108 times at sunrise for clarity
- Light a diya at your workspace or study table
- Place a Saraswati idol or image in the northeast corner of your room

 **On Darshya:** Book **Ganesh Puja**, **Saraswati Puja**, or **Navagraha Puja** with verified priests. Explore our **Content** section for mantras and study guidance.`,
 },

 // ─── Grief & Loss ─────────────────────────────────────────────────────
 {
 keywords: ['grief', 'loss', 'death', 'die', 'died', 'passed away', 'departed', 'shradh', 'shraddha', 'mourning', 'mrityu', 'pitru', 'ancestors', 'funeral'],
 response: `Loss and grief are among the deepest human experiences. Hindu philosophy offers profound comfort through the understanding of the eternal soul (आत्मा).

**श्लोक from Bhagavad Gita (Chapter 2, Verse 22):**
*"वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि |
तथा शरीराणि विहाय जीर्णान्यन्यानि संयाति नवानि देही ||"*
*"As a person puts on new garments, giving up old ones, the soul similarly accepts new material bodies, giving up the old and useless ones."*

**Bhagavad Gita (Chapter 2, Verse 20):**
*"न जायते म्रियते वा कदाचित्"*
*"The soul is never born, nor does it ever die."*

**Comforting Practices:**
- **Garuda Purana Path** — recitation for peace of the departed soul
- **Pind Daan** (पिण्डदान) — performed at holy places like Gaya for ancestors' salvation
- **Shraddha Ceremony** — annual remembrance and offering to ancestors
- **Narayan Bali Puja** — for liberation of the departed soul
- Light a diya daily and offer water (तर्पण) in the name of the departed

**Mantras for Peace:**
*"ॐ शान्तिः शान्तिः शान्तिः"*
*"Om Shantih, Shantih, Shantih" — Peace in body, mind, and spirit.*

The Gita teaches that the soul is eternal, indestructible, and transcendent. Your loved ones live on in the cosmic cycle.

 **On Darshya:** Book **Shraddha Puja**, **Pind Daan**, or **Narayan Bali Puja** at verified temples. Our priests perform with full Vedic rites and provide video proof.`,
 },

 // ─── Festivals & Celebrations ─────────────────────────────────────────
 {
 keywords: ['festival', 'diwali', 'holi', 'navratri', 'dussehra', 'ganesh chaturthi', 'janmashtami', 'maha shivratri', 'ram navami', 'celebration', 'utsav', 'tyohar', 'pongal', 'onam', 'makar sankranti'],
 response: `Hindu festivals connect us to the cosmic rhythm and remind us of our cultural heritage. Each festival has deep spiritual significance.

**श्लोक (Shloka):**
*"यदा यदा हि धर्मस्य ग्लानिर्भवति भारत |
अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम् ||"*
*"Whenever there is a decline of dharma, O Bharata, I manifest Myself."*
— Bhagavad Gita 4.7

**Major Festival Guide:**
1. **Diwali** — Festival of lights. Worship Lakshmi & Ganesha. Light diyas, perform Lakshmi Puja.
2. **Navratri** — 9 nights of Durga worship. Each day honors a different form of the Goddess.
3. **Maha Shivratri** — Night vigil for Lord Shiva. Fast, chant Om Namah Shivaya, perform Rudrabhishek.
4. **Ganesh Chaturthi** — Welcome Lord Ganesha. Perform Ganesh Puja, offer modak.
5. **Janmashtami** — Lord Krishna's birthday. Midnight celebration, fasting, bhajan-kirtan.
6. **Ram Navami** — Lord Rama's birthday. Recite Ramcharitmanas, perform puja.
7. **Makar Sankranti** — Sun's northward journey. Donate til-gur, fly kites.

**Festival Prayer:**
*"सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः"*
*"May all beings be happy, may all beings be free from disease."*

 **On Darshya:** Book **festival-specific pujas** at temples across India. Watch **Live Darshan** during festivals for special aartis and celebrations.`,
 },

 // ─── Daily Worship / Routine ──────────────────────────────────────────
 {
 keywords: ['daily', 'routine', 'worship', 'prayer', 'puja at home', 'aarti', 'archana', 'morning', 'evening', 'nitya', 'nityakarma', 'sandhya', 'pooja'],
 response: `A daily worship routine (नित्यकर्म) connects you with the divine and brings peace, discipline, and spiritual growth.

**श्लोक (Shloka):**
*"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन |
मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ||"*
*"You have the right to perform your duty, but you are not entitled to the fruits of your actions."*
— Bhagavad Gita 2.47

**Recommended Daily Worship Routine:**

**Morning (Brahma Muhurta — 4:00-6:00 AM):**
1. Wake up and offer gratitude — touch the ground before stepping down
2. Bath and purification
3. Light a diya (lamp) and incense at your home altar
4. Chant **Gayatri Mantra** 108 times for mental clarity
5. Read or recite a chapter from the Bhagavad Gita
6. Perform **Surya Namaskar** (Sun Salutation) facing east

**Evening (Sandhya — Sunset):**
1. Light the evening diya
2. Perform **evening aarti** — sing "Om Jai Jagdish Hare" or your family aarti
3. Chant **Om Namah Shivaya** 108 times
4. Read a spiritual text for 10-15 minutes
5. Practice gratitude — reflect on the day's blessings

**Weekly Observances:**
- Monday: Shiva Puja, fast for Shiva
- Tuesday: Hanuman Puja, recite Hanuman Chalisa
- Thursday: Guru/Brihaspati Puja, wear yellow
- Friday: Lakshmi/Santoshi Maa Puja
- Saturday: Shani Dev Puja, help the needy

 **On Darshya:** Explore our **Content** section for mantras, aartis, and chalisa. Watch **Live Darshan** from 50+ temples daily.`,
 },

 // ─── Meditation & Yoga ────────────────────────────────────────────────
 {
 keywords: ['meditation', 'meditate', 'dhyana', 'dhyan', 'yoga', 'pranayama', 'breathing', 'mindfulness', 'inner peace', 'spiritual practice', 'sadhana'],
 response: `Meditation (ध्यान) is the cornerstone of spiritual practice in Hindu tradition. The Gita describes it as the path to self-realization.

**श्लोक from Bhagavad Gita (Chapter 6, Verse 5):**
*"उद्धरेदात्मनात्मानं नात्मानमवसादयेत् |
आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ||"*
*"Elevate yourself through the power of your mind, and do not degrade yourself, for the mind can be the friend or the enemy of the self."*

**Types of Meditation (Dhyana):**
1. **Japa Dhyana** — Mantra repetition with mala beads. "Om Namah Shivaya" or "Om Namo Narayanaya"
2. **Trataka** — Candle-gazing meditation for focus and concentration
3. **Yoga Nidra** — Conscious sleep meditation for deep rest
4. **Vipassana** — Mindfulness of breath and body sensations
5. **Chakra Dhyana** — Meditation on the seven energy centers

**Simple Practice to Start:**
- Sit comfortably facing east or north
- Close your eyes, take 10 deep breaths
- Chant **"ॐ"** (Om) slowly, feeling the vibration in your body
- Focus on the space between your eyebrows (Ajna Chakra)
- Start with 10 minutes, gradually increase to 30 minutes

**Pranayama (Breathing) Techniques:**
- **Anulom Vilom** — Alternate nostril breathing for balance
- **Kapalabhati** — Skull-shining breath for energy
- **Bhramari** — Bee breath for calming the mind

**Patanjali's Yoga Sutra (1.2):**
*"योगश्चित्तवृत्तिनिरोधः"*
*"Yoga is the cessation of the fluctuations of the mind."*

 **On Darshya:** Join **Live Yoga & Meditation** sessions with certified instructors. Explore our **Wellness** section for guided practices.`,
 },

 // ─── Dreams & Interpretation ──────────────────────────────────────────
 {
 keywords: ['dream', 'dreams', 'sapna', 'swapna', 'nightmare', 'vision', 'sleep', 'dreaming'],
 response: `Dreams (स्वप्न) have been considered spiritually significant in Hindu tradition. The Mandukya Upanishad discusses the four states of consciousness, including the dream state.

**श्लोक from Mandukya Upanishad:**
*"स्वप्नस्थानोऽन्तःप्रज्ञः"*
*"The dream state is that in which consciousness is turned inward."*

**Dream Interpretation in Hindu Tradition:**
- **Temple or Deity** — Extremely auspicious. Divine blessings and protection.
- **River or Water** — Purification, new beginnings, emotional clarity
- **Fire/Light** — Transformation, spiritual awakening, success
- **Snake** — Kundalini energy awakening, or warning about hidden enemies
- **Flying** — Spiritual elevation, freedom from material bonds
- **Flowers** — Prosperity, good fortune, divine grace
- **Death in dreams** — Transformation, end of old patterns (not literal)

**Spiritual Practices for Dream Guidance:**
- Before sleep, chant "ॐ नमः शिवाय" 11 times
- Keep a Rudraksha mala near your pillow
- Practice **Yoga Nidra** (conscious sleep meditation)
- Write down dreams immediately upon waking

**Bhagavad Gita (Chapter 2, Verse 69):**
*"या निशा सर्वभूतानां तस्यां जागर्ति संयमी"*
*"What is night for all beings, the disciplined soul is awake in that."*

Dreams from the Brahma Muhurta period (4-6 AM) are considered most significant and prophetic.

 **On Darshya:** Consult an **Astrologer** for detailed dream analysis based on your birth chart. Book a **Navagraha Puja** if recurring disturbing dreams persist.`,
 },

 // ─── Vastu Shastra ────────────────────────────────────────────────────
 {
 keywords: ['vastu', 'house', 'home', 'direction', 'north', 'south', 'east', 'west', 'construction', 'griha', 'flat', 'apartment', 'office'],
 response: `Vastu Shastra (वास्तु शास्त्र) is the ancient Indian science of architecture and spatial harmony. It aligns your living space with cosmic energies.

**श्लोक (Shloka):**
*"वास्तु शास्त्रं प्रवक्ष्यामि लोकानां हितकाम्यया"*
*"I shall teach Vastu Shastra for the welfare of all people."*
— Vishwakarma Vastu Shastra

**Essential Vastu Guidelines:**

**Directions & Their Significance:**
- **North (Kubera)** — Wealth. Keep this area open and clean. Place money locker here.
- **East (Indra/Surya)** — Health & growth. Main entrance ideally faces east.
- **Northeast (Ishaan)** — Puja room. The most sacred direction.
- **South (Yama)** — Master bedroom. Avoid main entrance here.
- **Southwest** — Stability. Heavy furniture, master bedroom.
- **West (Varuna)** — Children's room, dining area.
- **Southeast (Agni)** — Kitchen. Fire element belongs here.
- **Northwest (Vayu)** — Guest room, bathroom.

**Quick Vastu Remedies (No Demolition):**
1. Place a **Vastu Pyramid** in the center of the house
2. Keep the **northeast corner** clutter-free and well-lit
3. Fix all **leaking taps** immediately (water = wealth draining)
4. Avoid **mirrors** in the bedroom facing the bed
5. Place a **Tulsi plant** at the entrance for positive energy

 **On Darshya:** Book a **Vastu Shanti Puja** or **Griha Pravesh Puja** for your new home. Consult our **Vastu expert astrologers** for personalized guidance.`,
 },

 // ─── Numerology ───────────────────────────────────────────────────────
 {
 keywords: ['numerology', 'number', 'ank', 'ankjyotish', 'lucky number', 'birth number', 'name number'],
 response: `Numerology (अंकज्योतिष) reveals the hidden meaning behind numbers and their influence on your life. Vedic numerology uses the 9-planet system.

**Key Numbers and Their Planetary Rulers:**
| Number | Planet | Qualities |
|--------|--------|-----------|
| 1 | Sun (Surya) | Leadership, authority, confidence |
| 2 | Moon (Chandra) | Emotions, intuition, creativity |
| 3 | Jupiter (Guru) | Wisdom, expansion, luck |
| 4 | Rahu | Unconventional, research, innovation |
| 5 | Mercury (Budh) | Communication, business, adaptability |
| 6 | Venus (Shukra) | Love, beauty, luxury, arts |
| 7 | Ketu | Spirituality, mysticism, research |
| 8 | Saturn (Shani) | Discipline, karma, hard work |
| 9 | Mars (Mangal) | Energy, courage, action |

**How to Calculate Your Numbers:**
- **Birth Number** — Day of birth reduced to single digit (e.g., born 15th = 1+5 = 6)
- **Life Path Number** — Full birth date reduced (e.g., 15/08/1990 = 1+5+0+8+1+9+9+0 = 33 = 6)
- **Name Number** — Each letter has a numerical value using Chaldean system

**Remedies Based on Numbers:**
- If your number is 8 (Saturn): Donate black sesame seeds on Saturdays
- If your number is 4 (Rahu): Worship Lord Ganesha, donate to the needy
- If your number is 7 (Ketu): Meditate daily, visit spiritual places

 **On Darshya:** Consult a **Numerologist** in our Astrology section for detailed analysis. Book a **Navagraha Puja** to strengthen weak planetary numbers.`,
 },

 // ─── Gemstones ────────────────────────────────────────────────────────
 {
 keywords: ['gemstone', 'gem', 'stone', 'ratna', 'neelam', 'ruby', 'manik', 'pearl', 'moti', 'emerald', 'panna', 'diamond', 'heera', 'coral', 'moonga', 'sapphire'],
 response: `Gemstones (रत्न) have been used in Vedic astrology for millennia to channel planetary energies and provide remedial benefits.

**श्लोक (Shloka):**
*"रत्नानां सर्वेषां मध्ये हीरकं प्रवरं भवेत्"*
*"Among all gems, the diamond holds the highest place."*

**Gemstone-Planet Associations:**
1. **Ruby (Manik/माणिक)** — Sun — Leadership, authority, vitality. Wear on ring finger, Sunday.
2. **Pearl (Moti/मोती)** — Moon — Emotional balance, peace. Wear on little finger, Monday.
3. **Red Coral (Moonga/मूंगा)** — Mars — Courage, energy, protection. Wear on ring finger, Tuesday.
4. **Emerald (Panna/पन्ना)** — Mercury — Intelligence, communication. Wear on little finger, Wednesday.
5. **Yellow Sapphire (Pukhraj/पुखराज)** — Jupiter — Wisdom, prosperity. Wear on index finger, Thursday.
6. **Diamond (Heera/हीरा)** — Venus — Love, luxury, creativity. Wear on ring finger, Friday.
7. **Blue Sapphire (Neelam/नीलम)** — Saturn — Discipline, career. Wear on middle finger, Saturday.
8. **Hessonite (Gomed/गोमेद)** — Rahu — Protection from negativity. Wear on middle finger.
9. **Cat's Eye (Lehsunia/लहसुनिया)** — Ketu — Spiritual growth. Wear on little finger.

**Important:** Never wear a gemstone without consulting your birth chart. A wrongly chosen gem can have adverse effects.

 **On Darshya:** Get a **personalized gemstone recommendation** from our verified astrologers. Each gem is energized with proper Vedic mantras before delivery.`,
 },

 // ─── Pilgrimage / Yatra ───────────────────────────────────────────────
 {
 keywords: ['pilgrimage', 'yatra', 'tirtha', 'temple', 'travel', 'kashi', 'varanasi', 'haridwar', 'rishikesh', 'tirupati', 'kedarnath', 'badrinath', 'char dham', 'jyotirlinga', 'mandir'],
 response: `Pilgrimage (तीर्थयात्रा) is one of the most sacred practices in Hindu tradition. The scriptures declare:

**श्लोक (Shloka):**
*"तीर्थस्नानफलं पुण्यं सन्तोषः सर्वसम्पदाम्"*
*"The merit of bathing in holy places (tirthas) is the foundation of all prosperity and contentment."*

**Sacred Pilgrimages:**

1. **Char Dham Yatra** — Badrinath, Kedarnath, Gangotri, Yamunotri (Uttarakhand)
2. **12 Jyotirlinga Circuit** — Somnath, Mallikarjun, Mahakaleshwar, Omkareshwar, Kedarnath, Bhimashankar, Kashi Vishwanath, Trimbakeshwar, Vaidyanath, Nageshwar, Rameshwaram, Grishneshwar
3. **Varanasi (Kashi)** — The oldest living city, Moksha-giving
4. **Tirupati** — Lord Venkateswara, the richest temple
5. **Puri Jagannath** — One of the Char Dhams
6. **Haridwar-Rishikesh** — Gateway to the Himalayas, yoga capital

**Pilgrimage Mantra:**
*"ॐ नमः शिवाय"* — Chant during travel for protection
*"हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे"* — For divine companionship on the journey

**Travel Tips from Tradition:**
- Visit temples during Brahma Muhurta for the most powerful darshan
- Take a sankalp (sacred intention) before beginning the yatra
- Offer prayers at each temple, donate to the needy along the way

 **On Darshya:** Plan your **Dharmic Yatra** with verified travel companions. Book **temple pujas in advance** for VIP darshan. Watch **Live Darshan** if you can't travel.`,
 },

 // ─── Family Harmony ───────────────────────────────────────────────────
 {
 keywords: ['family', 'parivar', 'parents', 'mother', 'father', 'siblings', 'brother', 'sister', 'in-laws', 'joint family', 'harmony', 'conflict', 'fight', 'argument', 'peace at home'],
 response: `Family is the cornerstone of Hindu dharma. The Vedas teach that serving one's family is equivalent to serving God.

**श्लोक (Shloka):**
*"मातृदेवो भव | पितृदेवो भव | आचार्यदेवो भव |"*
*"Regard your mother as God, your father as God, your teacher as God."*
— Taittiriya Upanishad

**For Family Harmony:**

**Mantras:**
- **Shanti Mantra**: *"ॐ शान्तिः शान्तिः शान्तिः"* — Chant together as a family
- **Ganesha Mantra**: *"ॐ गं गणपतये नमः"* — Removes obstacles in family relations

**Recommended Pujas:**
1. **Satyanarayan Katha** — Monthly. Brings prosperity and harmony to the entire family.
2. **Griha Shanti Puja** — Removes negative energies from the home
3. **Navagraha Puja** — Balances planetary influences affecting family members
4. **Pitru Tarpan** — Honoring ancestors brings their blessings for family wellbeing

**Daily Practices for Family Peace:**
- Light a diya together at the family altar every evening
- Eat at least one meal together daily (shared prasad concept)
- Respect elders — touch their feet (Charan Sparsh)
- Practice patience and forgiveness — *"क्षमा वीरस्य भूषणम्"* ("Forgiveness is the ornament of the brave")

**Bhagavad Gita (Chapter 6, Verse 9):**
*"सुहृन्मित्रार्युदासीनमध्यस्थद्वेष्यबन्धुषु"*
*"The wise see all with equanimity — friends, foes, and family alike."*

 **On Darshya:** Book a **Satyanarayan Katha** or **Griha Shanti Puja** for your family. Our verified priests perform pujas with full Vedic rites at your home or temple.`,
 },

 // ─── Wealth & Prosperity ──────────────────────────────────────────────
 {
 keywords: ['wealth', 'money', 'prosperity', 'dhan', 'lakshmi', 'rich', 'financial', 'income', 'samriddhi', 'fortune', 'paisa'],
 response: `Wealth (धन) is one of the four Purusharthas — the legitimate goals of life. The Vedas teach that prosperity achieved through dharma is divine.

**श्लोक (Shloka):**
*"श्रेयश्च प्रेयश्च मनुष्यमेतस्तौ सम्परीत्य विविनक्ति धीरः"*
*"Both the good and the pleasant approach a person. The wise examine both and choose the good."*
— Katha Upanishad

**Lakshmi Mantra (लक्ष्मी मंत्र):**
*"ॐ श्रीं महालक्ष्म्यै नमः"*
Chant 108 times on Fridays for prosperity.

**Sri Suktam — Hymn to Lakshmi:**
*"हिरण्यवर्णां हरिणीं सुवर्णरजतस्रजाम् |
चन्द्रां हिरण्मयीं लक्ष्मीं जातवेदो म आवह ||"*

**Kubera Mantra:**
*"ॐ यक्षाय कुबेराय वैश्रवणाय धनधान्याधिपतये
धनधान्यसमृद्धिं मे देहि दापय स्वाहा"*

**Wealth-Attracting Practices:**
1. **Lakshmi Puja** every Friday — offer lotus flowers, sweets
2. **Sri Suktam Homa** — powerful fire ritual for financial abundance
3. Keep the **north direction** clean and clutter-free (Kubera's direction)
4. Place a **Shri Yantra** in your puja room
5. Donate 10% of income (Dashaamsha) — giving opens channels of receiving
6. Never keep broken mirrors, clocks, or chipped items at home

 **On Darshya:** Book **Lakshmi Puja**, **Kubera Puja**, or **Sri Suktam Homa** with verified priests. Visit our **Store** for authentic Shri Yantras and Lakshmi idols.`,
 },

 // ─── Duty / Karma ─────────────────────────────────────────────────────
 {
 keywords: ['duty', 'karma', 'karm', 'action', 'deed', 'right', 'wrong'],
 response: `According to the Bhagavad Gita, duty (Dharma) is one of the most central teachings. In Chapter 2, Verse 47, Lord Krishna tells Arjuna:

**"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"**
*"You have the right to perform your duty, but you are not entitled to the fruits of your actions."*

This verse teaches us that we should focus on doing our best work without being attached to the outcome. When we act selflessly, guided by our dharma, we find inner peace and fulfillment.

**Key teachings on duty from the Gita:**
- Chapter 3, Verse 8: Perform your prescribed duty, for action is better than inaction.
- Chapter 18, Verse 47: It is better to perform one's own dharma imperfectly than another's dharma perfectly.
- Chapter 2, Verse 31: Considering your dharma as a Kshatriya, you should not waver.

The Gita teaches that every person has a unique role (svadharma) and fulfilling it with dedication and detachment is the path to spiritual growth.

 **On Darshya:** Explore our **Content** section for the complete Bhagavad Gita with translations. Book a **Gita Path** ceremony with verified priests.`,
 },

 // ─── Peace / Mantras ──────────────────────────────────────────────────
 {
 keywords: ['peace', 'shanti', 'mantra', 'calm', 'anxiety', 'stress', 'tension', 'worry', 'fear', 'depression', 'mental health', 'chant'],
 response: `For peace of mind, the ancient scriptures recommend several powerful mantras:

**1. Om Shanti Mantra (Most Popular)**
*"ॐ शान्तिः शान्तिः शान्तिः"*
"Om Shantih Shantih Shantih" — The threefold peace invocation addressing disturbances from the divine, the environment, and the self.

**2. Gayatri Mantra**
*"ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्"*
This mantra illuminates the mind and brings clarity and peace.

**3. Mahamrityunjaya Mantra**
*"ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्"*
This powerful Shiva mantra removes fear and anxiety, bringing deep peace.

**4. Asatoma Sadgamaya (Pavamana Mantra)**
*"ॐ असतो मा सद्गमय | तमसो मा ज्योतिर्गमय | मृत्योर्मामृतं गमय |"*
"Lead me from untruth to truth, from darkness to light, from death to immortality."

**Regular practice tip:** Chant any of these mantras 108 times using a mala (prayer beads) during Brahma Muhurta (4:00-6:00 AM) for maximum benefit.

 **On Darshya:** Listen to professionally chanted mantras in our **Content** section. Book a **Shanti Puja** for deep peace. Join our **Wellness** sessions for guided meditation.`,
 },

 // ─── Dharma / Purpose ─────────────────────────────────────────────────
 {
 keywords: ['dharma', 'righteousness', 'purpose', 'meaning', 'life purpose', 'truth', 'satya', 'moral'],
 response: `**Dharma** is one of the most profound concepts in Hindu philosophy. It encompasses:

**1. Universal Dharma (Sanatana Dharma)**
The eternal cosmic order that sustains the universe — truthfulness, non-violence, purity, self-control, and compassion.

**2. Personal Dharma (Svadharma)**
Your unique purpose based on your nature (svabhava), stage of life (ashrama), and responsibilities.

**3. Contextual Dharma (Yuga Dharma)**
Duties appropriate to the time and circumstance.

The Bhagavad Gita (Chapter 18, Verse 66) ultimately transcends all categories:
*"सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज"*
"Abandon all varieties of dharma and surrender unto Me alone."

The Mahabharata defines dharma beautifully:
*"धारणाद्धर्ममित्याहुः धर्मो धारयते प्रजाः"*
"That which sustains and holds together is dharma."

In practice, dharma means doing what is right, fulfilling your responsibilities, and living with integrity and compassion toward all beings.

 **On Darshya:** Explore our **Content** section for dharmic teachings from the Gita, Upanishads, and Ramayana. **Ask Pandit Ji** for personalized spiritual guidance.`,
 },
];

function getDemoResponse(message: string): string {
 const lower = message.toLowerCase();

 for (const topic of DEMO_TOPICS) {
 if (topic.keywords.some((keyword) => lower.includes(keyword))) {
 return topic.response;
 }
 }

 // Default spiritual response
 return `Namaste! Thank you for your question about "${message.substring(0, 60)}..."

The Bhagavad Gita teaches us in Chapter 4, Verse 7-8:
*"यदा यदा हि धर्मस्य ग्लानिर्भवति भारत"*
"Whenever there is a decline of dharma and rise of adharma, I manifest Myself."

This reminds us that divine guidance is always available to those who seek it sincerely.

**Some guidance based on your question:**
- Turn to prayer and meditation for clarity
- Study the scriptures (Gita, Upanishads, Ramayana) for wisdom
- Consult with a learned pandit or guru for personalized guidance
- Practice selfless service (seva) to purify the heart

*"श्रद्धावान् लभते ज्ञानम्"* — "One who has faith attains wisdom." (Gita 4.39)

 **On Darshya:** Explore our **Content** section for mantras, aartis, and spiritual articles. **Book a Puja** with a verified priest for specific spiritual needs. Watch **Live Darshan** from 50+ temples for daily peace.`;
}

// ─── Helper: stream-shape adapter ─────────────────────────────────────────
// Both providers stream text but in different formats. We expose a single
// async iterable that yields Anthropic-shaped events { type, delta } so the
// route handler in ai.service.ts/routes/ai.ts doesn't need to branch.

type StreamEvent =
 | { type: 'content_block_delta'; delta: { type: 'text_delta'; text: string } }
 | { type: 'message_stop'; delta: undefined };

function makeWordStream(text: string): AsyncIterable<StreamEvent> {
 return {
 async *[Symbol.asyncIterator]() {
 const words = text.split(' ');
 for (let i = 0; i < words.length; i++) {
 const chunk = (i === 0 ? '' : ' ') + words[i];
 yield { type: 'content_block_delta', delta: { type: 'text_delta', text: chunk } };
 }
 yield { type: 'message_stop', delta: undefined };
 },
 };
}

async function* groqStreamToEvents(res: Response): AsyncIterable<StreamEvent> {
 if (!res.body) {
 yield { type: 'message_stop', delta: undefined };
 return;
 }
 const reader = res.body.getReader();
 const decoder = new TextDecoder();
 let buffer = '';
 while (true) {
 const { value, done } = await reader.read();
 if (done) break;
 buffer += decoder.decode(value, { stream: true });
 const lines = buffer.split('\n');
 buffer = lines.pop() ?? '';
 for (const line of lines) {
 const trimmed = line.trim();
 if (!trimmed.startsWith('data:')) continue;
 const payload = trimmed.slice(5).trim();
 if (payload === '[DONE]') {
 yield { type: 'message_stop', delta: undefined };
 return;
 }
 try {
 const j = JSON.parse(payload) as {
 choices?: { delta?: { content?: string } }[];
 };
 const text = j.choices?.[0]?.delta?.content;
 if (text) {
 yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
 }
 } catch {
 // skip malformed chunks
 }
 }
 }
 yield { type: 'message_stop', delta: undefined };
}

// ─── Streaming Chat ────────────────────────────────────────────────────────────

export async function streamChat(params: {
 systemPrompt: string;
 messages: { role: 'user' | 'assistant'; content: string }[];
 maxTokens?: number;
 model?: string;
}) {
 const { systemPrompt, messages, maxTokens = 1024, model = MODELS.SONNET } = params;

 if (DEMO_MODE) {
 const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
 return makeWordStream(getDemoResponse(lastUserMsg?.content || ''));
 }

 if (HAS_GROQ) {
 const res = await fetch(`${GROQ_BASE}/chat/completions`, {
 method: 'POST',
 headers: {
 Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 model,
 max_tokens: maxTokens,
 stream: true,
 messages: [
 { role: 'system', content: systemPrompt },
 ...messages.map((m) => ({ role: m.role, content: m.content })),
 ],
 }),
 });
 if (!res.ok) {
 const errText = await res.text().catch(() => '');
 throw new Error(`Groq error ${res.status}: ${errText.slice(0, 200)}`);
 }
 return { [Symbol.asyncIterator]: () => groqStreamToEvents(res)[Symbol.asyncIterator]() };
 }

 // Anthropic fallback
 const stream = anthropic.messages.stream({
 model,
 max_tokens: maxTokens,
 system: systemPrompt,
 messages: messages.map((m) => ({ role: m.role, content: m.content })),
 });
 return stream;
}

// ─── Single-shot Text Generation ───────────────────────────────────────────────

export async function generateText(params: {
 systemPrompt: string;
 userMessage: string;
 maxTokens?: number;
 model?: string;
}): Promise<string> {
 const { systemPrompt, userMessage, maxTokens = 1024, model = MODELS.HAIKU } = params;

 if (DEMO_MODE) {
 return getDemoResponse(userMessage);
 }

 if (HAS_GROQ) {
 const res = await fetch(`${GROQ_BASE}/chat/completions`, {
 method: 'POST',
 headers: {
 Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 model,
 max_tokens: maxTokens,
 messages: [
 { role: 'system', content: systemPrompt },
 { role: 'user', content: userMessage },
 ],
 }),
 });
 if (!res.ok) {
 const errText = await res.text().catch(() => '');
 throw new Error(`Groq error ${res.status}: ${errText.slice(0, 200)}`);
 }
 const j = (await res.json()) as {
 choices?: { message?: { content?: string } }[];
 };
 return j.choices?.[0]?.message?.content ?? '';
 }

 const response = await anthropic.messages.create({
 model,
 max_tokens: maxTokens,
 system: systemPrompt,
 messages: [{ role: 'user', content: userMessage }],
 });
 const textBlock = response.content.find((block) => block.type === 'text');
 return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}

export { DEMO_MODE };
