// Free pandit advice topics — programmatic SEO for "free pandit kundli astrology advice"
// long-tail family. Each topic page renders 5 FAQs eligible for Google rich snippets via
// FAQPage JSON-LD. Answers stay 100-180 words, follow E-E-A-T (cite shastra + practical).

export interface FreePanditFAQ {
 question: string;
 answer: string;
}

export interface FreePanditTopic {
 slug: string;
 title: string;
 hindiTitle: string;
 metaDescription: string;
 intro: string;
 commonProblems: string[];
 freeRemedies: string[];
 whenToConsultPaid: string;
 faqs: FreePanditFAQ[];
 relatedKundliField: string;
 cta: string;
}

export const FREE_PANDIT_TOPICS: FreePanditTopic[] = [
 {
 slug: 'marriage',
 title: 'Free Pandit Advice on Marriage & Kundli Matching',
 hindiTitle: 'विवाह व कुंडली मिलान — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on marriage — Guna Milan, Manglik dosh, delayed marriage remedies. Authentic Vedic guidance from verified pandits.',
 intro: 'Marriage in Vedic astrology is governed by the 7th house (spouse), Venus (love & harmony), Jupiter (for women — spouse karma), and Mars (for men — initiative). Before fixing a match, a pandit reviews Guna Milan (36-point Ashtakoot compatibility), Manglik status of both charts, Navamsa (D9) divisional chart, and dasha periods of bride & groom. A minimum of 18 Guna match is traditionally recommended; Manglik–non-Manglik mismatches need shanti remedies. Free advice covers chart-reading basics; nuanced compatibility & remedies need a live consultation.',
 commonProblems: [
 'Delayed marriage despite multiple proposals',
 'Manglik dosh in one partner',
 'Low Guna Milan score (below 18)',
 'Repeated breakups before engagement',
 'Family opposition to the match',
 ],
 freeRemedies: [
 'Chant Katyayani mantra (108 times daily) for marriage delays',
 'Fast on 16 consecutive Mondays (Shravan Somvar) for compatible spouse',
 'Offer yellow flowers to Vishnu on Thursdays (for women)',
 'Donate red lentils on Tuesdays if Mars-afflicted',
 'Place a south-east Venus yantra in the home',
 ],
 whenToConsultPaid: 'Final match-fix decisions, kumbh-vivah for severe Manglik, dasha-sandhi delays, second-marriage timing — all need detailed birth-time analysis & live pandit guidance.',
 faqs: [
 {
 question: 'Is free pandit advice on marriage Kundli matching reliable?',
 answer: 'Free pandit advice is excellent for understanding the basics — what Guna Milan means, whether you are Manglik, which dasha period is favorable. A genuine pandit will tell you the general direction (favorable / delayed / cautious) for free. However, the final go/no-go decision on a specific match should always involve a paid live consultation where the pandit can compare both Kundlis side-by-side, check Navamsa overlays, dasha-bhukti running on both partners, and provide tailored remedies. Beware of any free service that promises a final yes/no without seeing both charts.',
 },
 {
 question: 'What is the minimum Guna Milan score for marriage?',
 answer: 'Traditional Vedic shastra recommends a minimum of 18 out of 36 Gunas for a viable match. 24–30 is considered very good, 31–36 is rare and excellent. Below 18 indicates significant mismatch in temperament, longevity, progeny, or sexual compatibility — and pandits will recommend either reconsidering the match or performing specific remedies (homas, Navagraha shanti) before proceeding. However, a low Guna score alone is not a deal-breaker; the Navamsa, 7th-house lord placement, and dasha period at the time of marriage all matter equally.',
 },
 {
 question: 'I am Manglik — can I marry a non-Manglik?',
 answer: 'Yes, with caveats. Manglik dosh from Mars in 1st, 4th, 7th, 8th, or 12th house can be cancelled (Mangal-bhanga) if your partner also has certain placements — Mars in same houses, Saturn aspecting Mars, or Mars in own/exalted sign. Severe Manglik (both Mars and Rahu in 7th) may require a kumbh-vivah (symbolic marriage to a tree or pot) before the real marriage. A pandit will tell you for free whether your Manglik is mild, moderate, or severe, but the specific remedy choice requires a live consultation.',
 },
 {
 question: 'Why is my marriage getting delayed?',
 answer: 'Common Vedic reasons: weak 7th house lord (debilitated, combust, or retrograde), Saturn-Mars aspect on 7th house, Venus in 6th/8th/12th, Rahu or Ketu in 7th house, or running the dasha of a malefic without 7th-house connection. Free pandit advice can identify which of these factors is active in your chart. The remedy direction (Saturn shanti for delays, Venus strengthening for love marriage, Guru pooja for marriage in 30s) is also commonly shared free. Specific homas, gemstones, and date-fixing need paid consultation.',
 },
 {
 question: 'Which day should I do Kundli matching on?',
 answer: 'There is no specific "auspicious" day to do Kundli matching itself — it is a chart analysis, not a ritual. However, pandits typically avoid sharing major results on Amavasya (new moon) or eclipse days. Best days to receive marriage advice are Thursdays (Guru — wisdom & spouse karma) and Fridays (Venus — love & harmony). For the actual marriage ceremony, the pandit will check Vivah Muhurat from a Panchang — typically avoiding Holashtak, Chaturmas, malmas (adhik maas), and the bride/groom\'s Tara Bhakti yogas.',
 },
 ],
 relatedKundliField: 'guna-milan',
 cta: 'Free Guna Milan Report',
 },
 {
 slug: 'career',
 title: 'Free Pandit Advice on Career & Job Astrology',
 hindiTitle: 'करियर व नौकरी — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on career, job change, promotion, business vs job decisions. Verified Vedic remedies — no credit card required.',
 intro: 'Career in Vedic astrology is read from the 10th house (profession), 2nd house (income), 6th house (job & service), 11th house (gains), and the planet Saturn (work karma) along with the dasha lord running. A pandit examines whether your chart suits service (job) or independent venture (business), which industry (10th-house planet decides — Sun: govt, Moon: hospitality, Mars: engineering/police, Mercury: trade/IT, Jupiter: teaching/law, Venus: arts/luxury, Saturn: labor/oil/research), and the timing of breakthrough via dasha-bhukti. Free advice gives the broad direction; specific role/company decisions need full consultation.',
 commonProblems: [
 'Stuck in same role for 5+ years, no promotion',
 'Repeated job loss or layoffs',
 'Conflict between job vs business calling',
 'Frequent transfers or unstable workplace',
 'Salary not matching qualifications',
 ],
 freeRemedies: [
 'Chant Aditya Hridayam stotra on Sundays for career growth',
 'Offer water (arghya) to the rising Sun every morning',
 'Donate black sesame seeds on Saturdays (Saturn shanti)',
 'Wear copper bracelet on right wrist if Sun is weak',
 'Keep workspace facing north (Kuber — wealth direction)',
 ],
 whenToConsultPaid: 'Job-change muhurat fixing, gemstone prescription, business-launch dates, foreign-job opportunities (12th house + Rahu), career-pivot timing in late 30s.',
 faqs: [
 {
 question: 'Can a pandit tell my career path for free?',
 answer: 'Yes — most reputable pandits will read your 10th-house lord, identify your natural career direction (service/business/creative/research), and indicate broad timelines (early-life success vs late bloom) free of charge. What requires a paid consultation is specific role recommendations (e.g., "join this company on this date"), gemstone prescriptions, and remedial homas. Free advice gives the map; paid consultation gives the turn-by-turn directions. A 15-minute free pandit chat on Darshya can clarify whether you are in a favorable or challenging dasha for career.',
 },
 {
 question: 'Should I do a job or start a business?',
 answer: 'Vedic astrology checks the strength of the 10th house (profession) vs the 7th house (partnerships & business). Strong 10th with weak 11th + benefic Saturn = stable job suits you. Strong 7th + 11th with Mars-Jupiter combination = business will thrive. Rahu in 10th often indicates unconventional or self-employed work. A pandit will also check whether your current dasha favors stability (Saturn, Jupiter) or risk-taking (Mars, Rahu). Free pandit advice can give you a clear job-vs-business inclination based on your birth chart.',
 },
 {
 question: 'Why am I not getting a promotion despite hard work?',
 answer: 'Common Vedic causes: weak Sun (low authority/recognition), Saturn dasha without 10th-house benefic support (delayed rewards), 6th-lord stronger than 10th-lord (stuck in execution roles), or running an antardasha of a malefic. Free pandit advice can identify which of these is active. Common free remedies include Surya Namaskar at sunrise, donating wheat on Sundays, and offering water with red flowers to the Sun. For specific gemstone advice (ruby for Sun, blue sapphire for Saturn) always consult a live pandit — wrong gemstones can backfire significantly.',
 },
 {
 question: 'Is it a good time to change my job?',
 answer: 'Vedic timing for job change considers: dasha-bhukti of 10th-lord or 2nd-lord (income), transit of Jupiter through your 10th or 11th house, and avoidance of Saturn sade-sati peak phase. Generally, Jupiter transit through favorable houses (3rd, 6th, 10th, 11th from Moon) is a green flag. Avoid changing during Mercury retrograde or eclipse weeks. A pandit can give you a free yes/no on timing direction; the specific muhurat (joining date) needs a paid consultation with your exact birth details.',
 },
 {
 question: 'Which planet rules my career?',
 answer: 'Your 10th-house lord (the planet ruling the sign on your 10th-house cusp) is the primary career significator. Any planet placed in the 10th house also strongly influences career. Additionally, Saturn is the universal karma significator for work, Sun for authority, and the Atmakaraka (highest-degree planet in your chart) for soul-purpose. A free pandit reading will identify all four — your 10th-lord, 10th-house planet, your Saturn condition, and your Atmakaraka — and explain how each shapes your career trajectory.',
 },
 ],
 relatedKundliField: 'career-house',
 cta: 'Free Career Kundli Reading',
 },
 {
 slug: 'health',
 title: 'Free Pandit Advice on Health & Astrology Remedies',
 hindiTitle: 'स्वास्थ्य व आरोग्य — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on health concerns, chronic illness remedies, planetary doshas affecting wellbeing. Vedic guidance from verified pandits.',
 intro: 'Health in Vedic astrology is read from the 1st house (body & vitality), 6th house (disease & recovery), 8th house (chronic & surgery), and 12th house (hospitalization & sleep). The Ascendant lord shows constitution, the Moon shows mind, Sun shows vitality, and Mars rules blood. Specific body parts map to specific houses (head — 1st, throat — 2nd, chest — 4th, heart — 5th, stomach — 6th, reproductive — 7th, legs — 11th, feet — 12th). A pandit identifies vulnerability windows during malefic dasha and recommends shanti, fasting, mantra, or shastra-approved donations — never as substitutes for medical care, but as karmic complements.',
 commonProblems: [
 'Chronic illness without medical resolution',
 'Recurring accidents or injuries',
 'Mental health struggles — anxiety, insomnia',
 'Repeated surgeries or hospitalizations',
 'Family member\'s sudden health crisis',
 ],
 freeRemedies: [
 'Chant Maha-Mrityunjaya mantra 108 times daily for healing',
 'Offer water with sandalwood to Shiva linga on Mondays',
 'Donate green moong on Wednesdays if Mercury-afflicted',
 'Wear silver chain (Moon strengthening) for mental peace',
 'Recite Hanuman Chalisa on Tuesdays & Saturdays for blood/Mars issues',
 ],
 whenToConsultPaid: 'Severe chronic conditions, surgery muhurat, gemstone-based healing prescription, dasha-sandhi vulnerability planning. Always combine with qualified medical care.',
 faqs: [
 {
 question: 'Can astrology predict health problems?',
 answer: 'Vedic astrology can identify periods of health vulnerability (malefic dasha-bhukti, transits of Saturn/Mars/Rahu through 6th, 8th, 12th houses) and broad areas of risk (cardiovascular, digestive, mental, accidents). It is not a diagnostic tool — it cannot tell you which specific disease you will get or when exactly. A pandit\'s free reading will flag vulnerability windows so you can take precautions, schedule checkups, and start preventive remedies. NEVER substitute astrology for medical diagnosis — Vedic shastra itself recommends Ayurveda + allopathy alongside spiritual remedies.',
 },
 {
 question: 'What is the Maha-Mrityunjaya mantra and how does it help?',
 answer: 'Maha-Mrityunjaya is the most powerful Vedic healing mantra: "Om Tryambakam Yajamahe Sugandhim Pushtivardhanam, Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat." It invokes Shiva (Tryambaka — three-eyed) for liberation from disease, fear of death, and karmic illness. Recommended recitation: 108 times daily during a serious health crisis, or 11 times daily as preventive practice. Best done at sunrise or sunset, facing east or north, ideally with a Rudraksha mala. Free to learn, free to chant — no pandit needed for personal recitation. For serious illness, a pandit can perform a Maha-Mrityunjaya Homa (paid) which amplifies the effect.',
 },
 {
 question: 'Which planet causes my chronic illness?',
 answer: 'Chronic illness is typically tied to the 6th-house lord (the disease karaka), the planet placed in the 6th house, and the dasha lord running. Common patterns: Saturn = arthritis, joints, chronic fatigue; Mars = blood, surgery, accidents; Rahu = mysterious, undiagnosed, autoimmune; Ketu = wasting, mental confusion; Sun = bones, heart, vitality; Moon = mental, fluid retention; Mercury = nervous system; Jupiter = liver, weight; Venus = reproductive, urinary. A pandit\'s free reading will identify your primary disease karaka and recommend appropriate shanti remedies.',
 },
 {
 question: 'Are gemstones safe for healing?',
 answer: 'Gemstones (ratnas) work by amplifying a specific planet\'s vibration — but if that planet is already malefic in your chart, the gemstone will amplify the negative effect. Wearing the wrong gemstone (e.g., a blue sapphire when Saturn is debilitated) can cause severe loss, illness, or relationship damage. NEVER buy a gemstone based on free generic advice or based on your Sun-sign. Always consult a qualified pandit with your full birth chart, run a 3-day trial (sleep with the stone under your pillow), and only then wear it set in the correct metal on the correct finger. Free advice can suggest the direction; the actual prescription requires paid consultation.',
 },
 {
 question: 'Can I get free mental health guidance from a pandit?',
 answer: 'Pandits can identify Moon afflictions, Saturn-Rahu mental pressure, and dasha-related stress windows in your chart for free. They can recommend free practices: Brahmi pranayama, chanting Om Namah Shivaya, fasting on Mondays, drinking water from a silver vessel. These complement — never replace — psychiatric care. If you are in mental crisis, please contact iCall (India: 9152987821) or your nearest mental health professional immediately. Astrology is a complement to medical care, not a substitute.',
 },
 ],
 relatedKundliField: 'health-house',
 cta: 'Free Health Kundli Analysis',
 },
 {
 slug: 'finance',
 title: 'Free Pandit Advice on Money, Wealth & Finance',
 hindiTitle: 'धन, समृद्धि व वित्त — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on wealth, income, debt, investments. Vedic remedies for financial stability. No payment required for initial guidance.',
 intro: 'Wealth in Vedic astrology comes from the 2nd house (accumulated money), 11th house (income gains), 5th house (speculative gains — stocks/lottery), and 9th house (luck-based wealth). Jupiter is the universal wealth karaka; Venus rules luxury; Mercury rules trade & commerce. A pandit checks Dhana Yoga (wealth combinations like 2nd-11th lord exchange, Lakshmi Yoga, Chandra-Mangala Yoga), debt patterns (6th-house afflictions), and investment timing via dasha. Free advice gives broad financial direction; specific investment dates and gemstone for wealth need paid consultation.',
 commonProblems: [
 'Money comes in but doesn\'t stay (kharcha problem)',
 'Repeated business losses or debt cycles',
 'Inability to save despite good income',
 'Lottery/speculation losses',
 'Family financial drain (siblings/parents)',
 ],
 freeRemedies: [
 'Chant Shri Lakshmi mantra (Om Shreem Mahalakshmiyei Namaha) 108 times Fridays',
 'Offer kheer to Lakshmi on Diwali & Akshaya Tritiya',
 'Donate yellow items (turmeric, dal) on Thursdays for Jupiter',
 'Keep cash box in south-east (Lakshmi direction) facing north',
 'Recite Kanakdhara Stotram on Friday mornings',
 ],
 whenToConsultPaid: 'Major investment decisions, business launch capital allocation, debt-clearance shanti, gemstone for sustained wealth (yellow sapphire for Jupiter, emerald for Mercury).',
 faqs: [
 {
 question: 'Why is money not staying in my hands?',
 answer: 'Common Vedic causes: weak 2nd house (no accumulation), 12th-lord aspecting 2nd house (expenditure dominates income), Saturn-Rahu in 2nd or 11th (constant outflow), or running the dasha of a 12th-lord. Free pandit advice can identify which factor is active. Common free remedies: stop keeping the cash box open at night, avoid spending money on Tuesdays (Mars — impulse expenses), recite Mahalakshmi mantra daily, donate to a temple on Fridays. For sustained results, a Lakshmi Kuber Homa (paid) is recommended every Diwali season.',
 },
 {
 question: 'Will I get sudden wealth — lottery or inheritance?',
 answer: 'Sudden wealth is governed by the 5th house (lottery, speculation), 8th house (inheritance, in-laws\' money), Rahu (sudden gains), and the dasha-bhukti of these factors. Specific combinations like Lakshmi Yoga, Maha-Bhagya Yoga, Chandra-Mangala Yoga indicate windfalls. However, the same houses also rule sudden losses. A pandit\'s free reading will tell you whether sudden wealth is possible in your chart — but specific timing requires detailed dasha analysis (paid consultation). Avoid lottery/speculation if a malefic dasha is running.',
 },
 {
 question: 'How can I clear my debt fast — Vedic remedies?',
 answer: 'Debt is linked to the 6th house (rin — debt, in Sanskrit). Strong 6th-lord = good at managing debt; afflicted 6th = chronic debt traps. Free remedies: chant Hanuman Chalisa on Tuesdays & Saturdays (Hanuman is the debt-remover deity), fast on 16 Tuesdays continuously, donate red items (lentils, cloth) to a Hanuman temple, recite Rinmochan Mangal Stotram. Avoid taking new loans on Saturdays or during Mercury retrograde. For severe debt cycles, a Rin-mochan Mangal homa (paid) is the traditional remedy.',
 },
 {
 question: 'Is yellow sapphire (Pukhraj) good for wealth?',
 answer: 'Yellow sapphire strengthens Jupiter — the universal wealth karaka. It is recommended ONLY if your Jupiter is weak, well-placed (in own/exalted sign), and you are running a Jupiter dasha or sub-dasha. Wearing pukhraj when Jupiter is debilitated, combust, or retrograde can backfire badly — causing financial loss, weight gain, liver issues, and arrogance. NEVER buy yellow sapphire based on Sun-sign or general advice. Always get a pandit to verify with your birth chart, do a 3-day trial under your pillow first, and wear minimum 4.25 carats in yellow gold on the right index finger.',
 },
 {
 question: 'Which day is best to start a new business?',
 answer: 'Best days: Thursday (Jupiter — expansion, wisdom, wealth) and Friday (Venus — partnerships, luxury). Avoid: Saturday (Saturn — delays), Tuesday (Mars — conflict), and any Amavasya (no-moon). Best time of day: Abhijit Muhurat (~11:48 AM to 12:36 PM local solar time). Best lunar phases: Shukla Paksha (waxing moon, Pratipada to Purnima) — avoid Krishna Paksha for launches. The exact muhurat for your specific business needs your birth chart + the chart of any partner (paid consultation). Free advice can give you the broad direction.',
 },
 ],
 relatedKundliField: 'wealth-house',
 cta: 'Free Wealth Kundli Report',
 },
 {
 slug: 'education',
 title: 'Free Pandit Advice on Education & Children\'s Studies',
 hindiTitle: 'शिक्षा व विद्या — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on education, exam success, concentration, foreign studies. Vedic remedies for students from verified pandits.',
 intro: 'Education in Vedic astrology is read from the 2nd house (basic learning), 4th house (formal schooling), 5th house (intelligence & creative learning), and 9th house (higher education & dharma). Mercury is the karaka for intellect, Jupiter for wisdom, and the Moon for memory. Foreign education is indicated by the 9th house + 12th house combination. A pandit identifies your natural learning style (memorization vs analysis vs intuition), favorable career-aligned subjects, and exam-window dashas. Free advice helps parents understand the child\'s academic direction; specific subject/college guidance needs detailed consultation.',
 commonProblems: [
 'Child not interested in studies despite intelligence',
 'Repeated exam failures or low marks',
 'Concentration issues, ADHD-like symptoms',
 'Confusion between subjects (science vs commerce vs arts)',
 'Foreign-study decision (yes/no/which country)',
 ],
 freeRemedies: [
 'Chant Saraswati mantra (Om Aim Saraswatyei Namaha) 108 times Wednesdays',
 'Offer white flowers to Saraswati on Vasant Panchami',
 'Donate green moong + green cloth on Wednesdays (Mercury strengthening)',
 'Keep study table facing east or north (Saraswati directions)',
 'Recite Gayatri mantra at sunrise — supreme mantra for intelligence',
 ],
 whenToConsultPaid: 'Career-stream decision in Class 10, university selection, foreign-study muhurat, competitive-exam timing analysis (UPSC, JEE, NEET, CAT).',
 faqs: [
 {
 question: 'Why is my child not interested in studies?',
 answer: 'Common Vedic causes: afflicted Mercury (poor focus), debilitated 5th-lord (no interest), weak Moon (low concentration), Saturn in 5th house (slow learner — needs patience), or Rahu in 5th (distractions, gaming, scattered mind). Free pandit advice can identify which factor is active. Common free remedies: ensure the child chants Saraswati mantra before opening textbooks, keep a Saraswati picture on the study table, study only during favorable hours (avoid Rahu Kaal), and donate green moong on Wednesdays. For severe cases, a Mercury shanti puja (paid) is recommended.',
 },
 {
 question: 'How can my child pass competitive exams (JEE/NEET/UPSC)?',
 answer: 'Competitive exam success is governed by Mercury (intellect), Jupiter (wisdom & luck), 5th house (mantra & creative intelligence), 9th house (higher learning & guru), and the dasha-bhukti running on exam date. A pandit can check whether the exam-year dasha is favorable. Free remedies: 40-day Saraswati Yantra worship before exams, fasting on Thursdays (Guru — wisdom), reciting Hayagriva mantra (Om Hayagrivay Vidmahe) for divine intelligence, and ensuring the exam is attempted during a favorable transit window. Specific date/time gemstone advice requires paid consultation.',
 },
 {
 question: 'Will my child go abroad for studies?',
 answer: 'Foreign education is indicated by: 9th-house (higher education) with 12th-house (foreign lands) connection, Rahu in 9th or 12th house, Moon in watery sign (Cancer/Scorpio/Pisces) showing willingness to travel, and benefic transits during the application year. A pandit can check this for free and give you a yes/no direction. Specific country recommendations (which culture suits the child) require detailed chart analysis. Best universities-direction is identified by which planet is strongest in 9th house — Jupiter favors UK/Germany (wisdom traditions), Mercury favors US/Singapore (tech), Venus favors France/Italy (arts).',
 },
 {
 question: 'Which stream should my child choose — science, commerce, or arts?',
 answer: 'Vedic indicators by stream: Science/Engineering — strong Mars + Mercury + Saturn (logical, technical); Medicine — strong Sun + Jupiter + Mars + Ketu in 6th/8th (healing karma); Commerce — strong Mercury + Venus + 2nd/11th houses (trade, money); Arts/Humanities — strong Moon + Venus + Jupiter + 5th house (creativity, emotions); Law — strong Mercury + Jupiter + Saturn (debate, justice); Civil Services — strong Sun + Saturn + 10th house. A free pandit reading at the Class 10 decision point can give parents a clear primary + secondary direction. The final career choice should also consider the child\'s own interest and aptitude.',
 },
 {
 question: 'When is Saraswati puja best for students?',
 answer: 'Vasant Panchami (5th day of Magha Shukla Paksha — usually late January or early February) is the supreme day for Saraswati puja. Other excellent times: Navaratri (especially Saraswati Avahan on Saptami, Puja on Ashtami, Visarjan on Navami), Guru Purnima (for blessing one\'s teachers), and any Wednesday (Mercury\'s day) for ongoing weekly puja. Students should perform a simple home puja: clean the study area, place books at Saraswati\'s feet, offer white flowers and yellow saffron rice, chant Saraswati Vandana, and avoid opening the books for that one day (a sign of respect for the goddess).',
 },
 ],
 relatedKundliField: 'education-house',
 cta: 'Free Student Kundli Reading',
 },
 {
 slug: 'manglik-dosh',
 title: 'Free Pandit Advice on Manglik Dosh & Remedies',
 hindiTitle: 'मांगलिक दोष — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on Manglik dosh — check Manglik status, severity, remedies, marriage compatibility. Verified Vedic guidance.',
 intro: 'Manglik dosh (also called Mangal dosh, Bhauma dosh, Kuja dosh) occurs when Mars is placed in the 1st, 4th, 7th, 8th, or 12th house from the Ascendant (Lagna), Moon, or Venus. It is considered a marriage-affecting yoga because Mars in these positions can create aggression, accidents, conflict, or in severe cases — early widowhood/widowerhood of the partner. However, modern Vedic interpretation has nuanced this significantly: many "Manglik" cases are actually cancelled (Mangal-bhanga yoga), and the severity matters far more than the label. A free pandit reading can tell you exact Manglik status; specific remedies need paid consultation.',
 commonProblems: [
 'Just discovered I am Manglik — am I doomed?',
 'Partner is Manglik but I am not — should I marry?',
 'Both Manglik — is this a good match?',
 'Severe Manglik — what is kumbh vivah?',
 'Manglik dosh from Moon vs Lagna — what\'s the difference?',
 ],
 freeRemedies: [
 'Recite Mangal Stotram (or Hanuman Chalisa) on Tuesdays',
 'Fast on 16 consecutive Tuesdays for Manglik pacification',
 'Offer red flowers + red cloth at a Hanuman temple',
 'Donate red lentils (masoor dal) on Tuesdays',
 'Visit Mangalnath Mandir in Ujjain (Mars\'s birthplace — supreme Manglik shanti)',
 ],
 whenToConsultPaid: 'Severe Manglik with malefic combinations, kumbh-vivah arrangement, Manglik-Manglik compatibility matching, gemstone prescription (red coral / Moonga).',
 faqs: [
 {
 question: 'How do I check if I am Manglik for free?',
 answer: 'You can check Manglik status for free in two ways: (1) Free Manglik calculator on Darshya — enter your birth date/time/place, the algorithm checks if Mars is in 1st, 4th, 7th, 8th, or 12th house from Lagna, Moon, AND Venus. (2) Free pandit chat — share your basic birth details, the pandit will tell you Manglik status + severity (mild/moderate/severe) within minutes. Severity matters more than the label — many Manglik cases have Mangal-bhanga yoga (cancellation) which neutralizes the dosh entirely. Don\'t panic on the "Manglik" tag alone.',
 },
 {
 question: 'Is my Manglik dosh cancelled (Mangal-bhanga)?',
 answer: 'Yes — Manglik dosh can be cancelled (Mangal-bhanga yoga) if any of these apply: (1) Mars is in its own sign (Aries/Scorpio) or exalted (Capricorn); (2) Mars is aspected by Jupiter or Venus; (3) The 7th house has a benefic (Jupiter/Venus); (4) Mars is in the 2nd/4th/7th/8th/12th house in the partner\'s chart too (mutual cancellation); (5) You were born on Tuesday (Mars\'s day — partial cancellation); (6) Mars is conjunct or aspected by Saturn (Saturn neutralizes Mars). A free pandit reading will tell you which of these cancellations apply in your chart.',
 },
 {
 question: 'Can a Manglik marry a non-Manglik?',
 answer: 'Generally, traditional shastra recommends Manglik-Manglik or post-remedy matching. However, modern Vedic practice (and most senior pandits) accept Manglik–non-Manglik marriage IF: (1) The Manglik dosh is mild/moderate (not severe); (2) Mangal-bhanga yoga exists in either chart; (3) The non-Manglik partner has compensating benefic placements in the 7th house; (4) Both Navamsa charts are compatible; (5) The marriage muhurat is chosen carefully to avoid Mars-related afflictions. Free pandit advice gives the direction; the final go/no-go should always involve full Kundli comparison.',
 },
 {
 question: 'What is kumbh vivah for severe Manglik?',
 answer: 'Kumbh vivah is a symbolic marriage performed for severely Manglik individuals before their real marriage, to "absorb" the malefic effects of Mars. The Manglik person symbolically marries a kumbh (clay pot), a banana tree (Vat-Vivah), a peepal tree (Peepal-Vivah), or in extreme cases, a Vishnu idol (Vishnu-Vivah). The ritual involves a full Vedic marriage ceremony with priests, mantras, and saptapadi (seven steps). After kumbh vivah, the person is considered "previously married" — the Mars dosh is transferred to the symbolic spouse, and the actual human partner is protected. This is a paid ritual requiring a qualified pandit.',
 },
 {
 question: 'Which Manglik dosh is most severe?',
 answer: 'Mars in the 7th house (the house of marriage itself) is the most severe Manglik placement. Mars in the 8th house is the second-most-severe (longevity of partner). Mars in the 1st, 4th, and 12th houses are progressively milder. Additional aggravating factors: Mars in malefic sign (Cancer = debilitation = severely afflictive), Mars aspected by Saturn or Rahu (amplifies aggression), Mars conjunct Ketu (sudden conflicts), or Mars in dasha-bhukti during marriage age. A free pandit reading will identify the exact severity and recommend appropriate-level remedies.',
 },
 ],
 relatedKundliField: 'manglik',
 cta: 'Free Manglik Check',
 },
 {
 slug: 'kundli-milan',
 title: 'Free Pandit Advice on Kundli Milan (Ashtakoot)',
 hindiTitle: 'कुंडली मिलान (अष्टकूट) — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli milan — Ashtakoot 36-point Guna match for marriage compatibility. Verified Vedic guidance with detailed Gana, Nadi, Bhakoot analysis.',
 intro: 'Kundli Milan (also called Ashtakoot Milan or Guna Milan) is the 8-fold compatibility analysis used in Vedic marriage matching. It scores 36 points across 8 categories: Varna (1pt — work compatibility), Vashya (2pts — mutual attraction), Tara (3pts — destiny), Yoni (4pts — sexual compatibility), Graha Maitri (5pts — mental compatibility), Gana (6pts — temperament), Bhakoot (7pts — family welfare), Nadi (8pts — health & progeny). Minimum 18/36 is recommended for marriage. However, Ashtakoot is just one filter — Manglik check, Navamsa overlay, dasha timing, and 7th-house analysis are equally critical. Free pandit Kundli milan covers the Ashtakoot score; full compatibility analysis needs detailed consultation.',
 commonProblems: [
 'Low Guna score (below 18) — should I still marry?',
 'Nadi dosh — most feared 8-point loss',
 'Bhakoot dosh — family financial disruption fear',
 'Gana mismatch — Manushya/Deva/Rakshasa conflict',
 'Score is high but family is opposed — what to do?',
 ],
 freeRemedies: [
 'Recite Vishnu Sahasranama on Thursdays for marriage protection',
 'Perform Navagraha shanti homa before low-score marriage',
 'Offer 16 Sundays sun-arghya for marriage harmony',
 'Wear matching gemstones — pandit-prescribed only',
 'Visit Tirumala together before marriage (Vishnu shanti)',
 ],
 whenToConsultPaid: 'Low-Guna match remediation, Nadi dosh / Bhakoot dosh shanti homas, Navamsa overlay analysis, marriage date muhurat selection.',
 faqs: [
 {
 question: 'What is the minimum Guna match for marriage?',
 answer: '18 out of 36 is the traditional minimum threshold for a viable marriage. Below 18 = significant incompatibility, typically not recommended without remedial measures. 18-24 = acceptable with attention to remedies. 24-30 = very good match. 30-36 = excellent (rare). However, the Guna score alone is NOT the final verdict. Even a 28-point match can fail if: Nadi or Bhakoot dosh is unresolved, Manglik mismatch is severe, dasha-sandhi falls at the marriage date, or Navamsa charts show conflict. A free Kundli milan tool gives you the score; full interpretation needs a pandit.',
 },
 {
 question: 'What is Nadi dosh and how serious is it?',
 answer: 'Nadi dosh is the most-feared Ashtakoot loss because it carries the highest weight (8 points) and traditionally indicates risks to progeny and health of the spouse. Three Nadis (Aadi/Madhya/Antya) are assigned by nakshatra; same-Nadi marriage = 0 points = full Nadi dosh. However, Nadi dosh CAN be cancelled (Nadi-bhanga) if: (1) Both partners have same Rashi but different nakshatras; (2) Both have same nakshatra but different padas; (3) The nakshatra falls in the same Rashi for both. Many traditional pandits also accept Nadi dosh marriages when other factors (Manglik, dasha, 7th-house) are all favorable. Free pandit advice can clarify whether your specific Nadi dosh is cancellable.',
 },
 {
 question: 'Can I marry if our Guna match is only 14?',
 answer: '14/36 is below the 18-point threshold — traditionally not recommended. However, before deciding "no": (1) Check which specific Gunas are scoring zero (Nadi, Bhakoot, Gana, Yoni are the most critical); (2) Check if Mangal-bhanga or Nadi-bhanga applies; (3) Run Navamsa compatibility — even with low Guna, strong Navamsa can override; (4) Check both partners\' dashas at marriage age; (5) Consult a senior pandit. If multiple critical Gunas are zero AND no cancellation applies AND Navamsa is also poor — pandits will recommend reconsidering the match or performing major shanti homas before proceeding.',
 },
 {
 question: 'What is Bhakoot dosh? Should I worry?',
 answer: 'Bhakoot dosh occurs when the Rashi (Moon sign) of the bride and groom fall in certain unfavorable house relationships: 2nd-12th (Dvi-Dvadasha — financial loss), 5th-9th (Nava-Pancham — fertility issues), or 6th-8th (Shashtashtak — mutual harm). Each scores 0 out of 7 Bhakoot points. The severity depends on which Rashis: certain combinations have Bhakoot-bhanga (cancellation), like both Rashis having same Lord, or being in the same Tattva (element). Free pandit advice can tell you if your Bhakoot dosh applies and if it\'s cancellable. For active Bhakoot dosh, a Vishnu-Lakshmi puja or Rin-mochan homa (paid) is the typical remedy.',
 },
 {
 question: 'Is online Kundli milan accurate?',
 answer: 'Online Kundli milan calculators (including Darshya\'s free tool) accurately calculate Ashtakoot Gunas based on the Vedic algorithm — IF you enter correct birth time, date, and place for both partners. The math itself is precise. However, online tools cannot interpret nuances: cancellations (Mangal-bhanga, Nadi-bhanga), Navamsa overlay, dasha timing, 7th-house lord analysis, or familial karma. The Guna score is reliable; the YES/NO verdict an online tool gives at the bottom should NEVER be the final word. Always cross-check borderline cases (15-22 points) or any dosh with a real pandit — Darshya\'s free 15-min consultation is sufficient for most.',
 },
 ],
 relatedKundliField: 'kundli-milan',
 cta: 'Free Kundli Milan',
 },
 {
 slug: 'family',
 title: 'Free Pandit Advice on Family & Relationships',
 hindiTitle: 'परिवार व रिश्ते — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on family disputes, parent-child relations, sibling conflicts, in-law issues. Vedic remedies for harmony.',
 intro: 'Family relationships in Vedic astrology are read from multiple houses: 4th house (mother, home, emotional security), 9th house (father, dharma, guru), 3rd house (siblings, courage, neighbors), 5th house (children), 7th house (spouse), and 11th house (elder siblings, social circle). Each planet placed in these houses or aspecting them colors the relationship — Saturn brings delays/responsibility, Mars brings conflict, Jupiter brings harmony/wisdom, Rahu brings illusion/distance. A pandit identifies which relationships are karmically challenging in your chart and recommends appropriate shanti, vrata, or charitable acts. Free advice covers general direction; specific family-feud resolution often needs full consultation.',
 commonProblems: [
 'Constant mother-in-law / daughter-in-law conflict',
 'Sibling property disputes',
 'Distance from parents — emotional or geographical',
 'Child not listening / rebellious behavior',
 'Family member with addiction or chronic problem',
 ],
 freeRemedies: [
 'Recite Shree Suktam on Fridays for family Lakshmi & harmony',
 'Offer water + flowers to family deity (kuldevi/kuldevta) on Amavasya',
 'Fast on Pradosh (13th lunar day) for Shiva-Parvati blessings on home',
 'Donate cooked food to elderly on Saturdays (Shani — for father karma)',
 'Light a ghee diya at home temple every evening at dusk',
 ],
 whenToConsultPaid: 'Severe family disputes with property/legal angles, child-rearing decisions, ancestral curse (Pitru dosh) remediation, kuldevi/kuldevta identification.',
 faqs: [
 {
 question: 'Is there a Pitru dosh in my chart?',
 answer: 'Pitru dosh (ancestral curse) is indicated when: (1) Sun is in the 9th house weakened or afflicted (father karma issue); (2) Rahu or Ketu is in the 9th house; (3) The 9th-lord is in the 6th, 8th, or 12th house; (4) Sun-Saturn or Sun-Rahu conjunction in any house. Symptoms include: family with no male children for generations, repeated unexplained obstacles, ancestor-related dreams, family fragmentation. A free pandit reading can identify Pitru dosh presence. Common free remedies: offer water with black sesame on Amavasya, donate food to crows/cows on Pitru Paksha, recite Pitru Sukta. For severe cases, Tripindi Shraddha at Gaya/Triyambakeshwar (paid) is the traditional resolution.',
 },
 {
 question: 'Why am I distant from my mother / mother-in-law?',
 answer: 'Mother relationship (4th house): afflictions to Moon or 4th-lord, especially by Saturn (emotional distance), Rahu (misunderstanding), or Mars (open conflict) indicate strained mother bond. Mother-in-law is read from the 10th house (4th from 7th — your mother-in-law\'s mothering of your spouse) and 7th-lord. Free pandit advice can identify the planetary cause. Free remedies: respect and serve your mother regardless of feelings (karma-clearing), recite Mahalakshmi mantra (Moon is also Lakshmi karaka), offer milk + white flowers on Mondays, fast on full moon (Purnima) days. Specific reconciliation rituals need paid consultation.',
 },
 {
 question: 'How can I improve my relationship with my father?',
 answer: 'Father in Vedic astrology = Sun + 9th house + 10th house (his profession). Strong Sun = good father relationship; afflicted Sun (debilitated, combust, aspected by Saturn-Rahu) = strained. Common pattern: father absent emotionally despite being physically present. Free remedies: offer water (Surya arghya) every sunrise facing east, recite Aditya Hridayam Stotram on Sundays, donate wheat or jaggery on Sundays, never criticize your father in public (Sun amplifies the karma both ways), and visit him on his birthday and Sundays. Karmic clearing through service to elderly men also helps.',
 },
 {
 question: 'What is kuldevi/kuldevta puja and why is it important?',
 answer: 'Kuldevi (family goddess) and kuldevta (family god) are the specific deities worshipped by your paternal lineage for generations. Worshipping the kuldevi/kuldevta protects the family from generational karma, ensures progeny welfare, and removes ancestral obstacles. Each family has a specific kuldevi/kuldevta — usually known to grandparents or elders. If unknown, a pandit can identify it through: family origin region, gotra, family temple history, and chart analysis. Common practice: visit the kuldevi/kuldevta temple at least once a year (especially on Navaratri, kuldevi\'s festival, or major family events like weddings/childbirth/house-warming).',
 },
 {
 question: 'My child does not listen to me — astrological remedy?',
 answer: 'Child rebellion in Vedic astrology = afflicted 5th house (progeny karma), Rahu in 5th house (rebellious child), Mars in 5th house (aggressive child), or weak Jupiter (child not connecting with parental wisdom). Also check the dasha period — children entering Saturn dasha at age 8-10 often become argumentative. Free remedies: parents recite Santan Gopal mantra (Devakisuta Govinda Vasudeva Jagatpate, Dehi Me Tanayam Krishna Tvamaham Sharanam Gatah) daily, offer water-mixed-with-saffron to Krishna idol, fast on Bhadrapad Shukla Ashtami (Krishna Janmashtami), and create a peaceful home environment. Most child-parent conflicts resolve naturally after the child\'s dasha shifts; patience is the supreme remedy.',
 },
 ],
 relatedKundliField: 'family-houses',
 cta: 'Free Family Kundli Reading',
 },
 {
 slug: 'love',
 title: 'Free Pandit Advice on Love & Relationships',
 hindiTitle: 'प्रेम व रिश्ते — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on love, romance, love marriage, relationship compatibility. Vedic guidance — no payment for initial consultation.',
 intro: 'Love and romance in Vedic astrology are governed by Venus (love, attraction, harmony), the Moon (emotional connection), the 5th house (romance, dating, courtship), and the 7th house (long-term partnership, marriage). Love marriage (as opposed to arranged) is indicated by: Venus-Mars conjunction or aspect, Rahu in 5th or 7th (unconventional partner), 5th-lord and 7th-lord in mutual aspect, or strong benefic in the 5th house. A pandit can identify whether love marriage is karmically indicated, the type of partner you will attract, and whether your current relationship has long-term potential. Free advice gives broad direction; specific compatibility needs full consultation.',
 commonProblems: [
 'No romance happening — feel invisible to opposite sex',
 'Family will not accept my love marriage',
 'In love with someone of different caste/religion',
 'Toxic relationship pattern repeating',
 'Crush is not reciprocating — should I move on?',
 ],
 freeRemedies: [
 'Recite Shri Sukta on Fridays for Venus strengthening',
 'Offer white flowers and curd to Venus on Friday mornings',
 'Wear white or light pink on Fridays to amplify Venus energy',
 'Fast on Friday and avoid arguments with loved ones',
 'Visit a Krishna temple (Krishna = supreme romantic deity) on Janmashtami',
 ],
 whenToConsultPaid: 'Love marriage muhurat against family wishes, inter-caste/inter-religion compatibility shanti, severe Venus-Rahu/Ketu afflictions, breakup karma analysis.',
 faqs: [
 {
 question: 'Will I have a love marriage or arranged marriage?',
 answer: 'Love marriage is indicated by: (1) Venus-Mars conjunction/aspect (passion + initiative); (2) Rahu in 5th house (unconventional choices) or 7th house (unconventional partner); (3) 5th-lord and 7th-lord in mutual aspect or conjunction (romance leads to marriage); (4) Moon-Venus exchange or conjunction (emotional + romantic alignment); (5) Strong benefic (Jupiter/Venus) in 5th house. Arranged marriage is indicated by: 7th-lord in 9th house (parental involvement), strong Jupiter without 5th-house benefics (traditional path), or weak Venus. Most modern charts show a hybrid pattern — "arranged-cum-love" where families know the love interest. A free pandit reading can give clear direction.',
 },
 {
 question: 'My family does not accept my love — what to do?',
 answer: 'Family opposition to love marriage is often indicated by: Saturn aspecting 7th-house (familial restriction), 9th-lord in 12th (parents emotionally distant from your choices), or Mars-Rahu conflict yogas. Free remedies for family-acceptance: (1) Both partners chant Vishnu Sahasranama together on Thursdays; (2) Perform Lakshmi-Narayan vrata (Friday) for marriage blessings; (3) Visit Tirumala Balaji or Vrindavan together; (4) Recite Sundarkand of Hanuman Chalisa for removing obstacles; (5) Show patience — parental opposition often dissolves after a Jupiter transit to favorable houses (check transit timing with a pandit). For severe cases, a Mangal-Vishnu homa is recommended.',
 },
 {
 question: 'Why does my crush not respond to me?',
 answer: 'Vedic causes: (1) Weak Venus in your chart (you don\'t naturally attract); (2) Mars dominating Venus (you come across as too aggressive); (3) Saturn aspecting your 5th house (rejection karma to clear); (4) Karmic incompatibility — the relationship is not in your destiny. Free pandit advice can check whether the specific person is karmically aligned with you. If yes — patience and Venus-strengthening work. If no — better to release and focus on the right karmic partner. Free remedies: amplify your Venus through self-care (white clothes, music, art, kindness to women), avoid obsessing (Saturn karma amplifier), and recite Shri Sukta daily.',
 },
 {
 question: 'Can love marriage between different castes work?',
 answer: 'Yes — Vedic astrology does NOT prohibit inter-caste marriage. The shastra-based compatibility is Ashtakoot Guna Milan, Manglik check, Navamsa overlay, and dasha timing — none of which use caste as a variable. The Varna (1st Guna of Ashtakoot) is a temperament classification (Brahmin = intellectual, Kshatriya = warrior, Vaishya = trader, Shudra = service-oriented) based on Moon sign, NOT social caste. Many highly compatible matches are inter-caste in modern terms. Family opposition is a social/cultural issue, not a Vedic-compatibility issue. A free pandit reading can confirm shastra-based compatibility regardless of caste/religion.',
 },
 {
 question: 'I keep attracting toxic partners — why?',
 answer: 'Repeated toxic relationships in Vedic chart = afflicted 7th house (especially by Mars-Rahu, Mars-Saturn, or Mars-Ketu), Venus in 6th/8th/12th house (love brings suffering karma), or Moon-Rahu in 4th/7th house (emotional manipulation pattern). Free pandit reading can identify the specific affliction. Free remedies: (1) Stop blaming "bad luck" — recognize the pattern is karmic and within your power to break; (2) 16-week Lakshmi-Narayan vrata (Friday fast) to clear partnership karma; (3) Avoid relationships during malefic dashas; (4) Strengthen your own Venus (self-love, art, beauty); (5) Therapy + astrology together — both required for deep pattern-breaking. Pandits routinely recommend therapy alongside Vedic remedies for relationship trauma.',
 },
 ],
 relatedKundliField: 'love-houses',
 cta: 'Free Love Kundli Reading',
 },
 {
 slug: 'business',
 title: 'Free Pandit Advice on Business & Entrepreneurship',
 hindiTitle: 'व्यापार व उद्यम — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on starting business, business muhurat, partnership compatibility, business losses. Verified Vedic guidance.',
 intro: 'Business success in Vedic astrology is read from the 7th house (partnerships, public dealings), 10th house (profession & reputation), 11th house (gains & profits), and 2nd house (capital & accumulated wealth). Mars provides drive, Mercury rules trade & negotiation, Jupiter brings expansion & wisdom, Venus rules luxury businesses, Saturn rules manufacturing/labor, Sun rules leadership/govt-contracts. Rahu in business houses can indicate big breakthroughs (or sudden crashes); Ketu can mean spiritual/niche businesses. A pandit identifies whether business is karmically favored over job, your industry direction, partner compatibility, and launch timing.',
 commonProblems: [
 'Business idea is good but not getting investors/customers',
 'Partnership disputes destroying the venture',
 'Cash flow issues despite profitable orders',
 'Inability to scale beyond a certain size',
 'Repeated business failures across multiple attempts',
 ],
 freeRemedies: [
 'Place Kuber Yantra in north (wealth direction) of office',
 'Recite Lakshmi-Ganesh Stotram before opening business daily',
 'Offer kheer to Ganesh on Wednesdays for obstacle removal',
 'Donate yellow items + sweets on Thursdays for Jupiter (expansion)',
 'Light a diya in north-east corner of office at sunrise',
 ],
 whenToConsultPaid: 'Business launch muhurat, partner compatibility full analysis, expansion timing, Vastu of office, branding-direction shanti (logo color/business name).',
 faqs: [
 {
 question: 'Is my chart suited for business or job?',
 answer: 'Business-favorable charts have: strong 7th house (partnerships, public dealings), strong 11th house (gains), Mars-Mercury or Mars-Jupiter conjunction (drive + intelligence), Rahu in 10th house (unconventional path), or 7th-lord in 10th house (business is your career). Job-favorable charts have: strong 6th house (service, employment), strong 10th house with weak 7th, Saturn-Mercury in 10th (steady employment), or 10th-lord in 6th house. Most charts have a mix — modern reality is "salaried + side business" works for many. Free pandit reading can give clear primary direction. Specific business-line recommendation needs paid consultation.',
 },
 {
 question: 'What is the best muhurat to start a business?',
 answer: 'Universally favorable business-launch muhurats: Akshaya Tritiya (third day of Vaishakh Shukla Paksha — supreme wealth muhurat), Dhanteras (two days before Diwali — wealth attraction), Vasant Panchami (Saraswati blessings for new ventures), and Vijaya Dashami (victory over obstacles). On any week: Thursday (Jupiter — expansion) and Wednesday (Mercury — commerce) are universally good. Specific time of day: Abhijit Muhurat (~11:48 AM to 12:36 PM local). For YOUR specific chart, the best muhurat needs your birth chart + the business chart (paid consultation). Free pandit advice can confirm broad favorable windows.',
 },
 {
 question: 'My business partner and I are clashing — should we split?',
 answer: 'Partner compatibility for business is a separate analysis from marriage compatibility. Key factors: (1) 7th-house lords of both charts should be in mutual aspect or trine; (2) Jupiter-Saturn relationship (strategic compatibility); (3) Mars-Mercury compatibility (execution + ideas); (4) Both charts should share at least one strong wealth yoga; (5) Running dashas should align. Free pandit reading can give a yes/no on continuing together. Common pattern: short-term conflict during one partner\'s Saturn-Rahu transit is recoverable; long-term incompatibility (Mars-Rahu mutual aspect, 6-8 house relationship) usually means a clean split serves both better.',
 },
 {
 question: 'Why is my business not growing despite good ideas?',
 answer: 'Common Vedic blockers: (1) Weak 11th house (gains do not materialize); (2) Saturn delaying scale-up phase (Saturn karma — slow but eventual); (3) Rahu causing scattered attention (multiple ideas, no execution); (4) Ketu in 10th house (spiritual calling pulling you away from material expansion); (5) Bad Vastu of office (entrance in south-west = wealth leak). Free pandit advice can identify which factor is active. Free remedies: focus your attention (Ketu shanti through meditation), do not over-expand during Saturn dasha (patience), perform a Lakshmi-Kuber Homa during Diwali season (paid for max effect; can do simplified version free at home).',
 },
 {
 question: 'Should I name my business with my own name or astrology-based name?',
 answer: 'Vedic business naming (Nama-Kundli) uses numerology + Nakshatra of the business start-date. The total numerological value of the business name should be compatible with the founder\'s birth date (Mulanka) and life path number (Bhagyanka). Names ending in numbers 1, 3, 5, 6 are generally auspicious for business; 4, 8 require careful checking. The first letter of the business name traditionally relates to the founder\'s Nakshatra pada. A free pandit reading can give 2-3 name-direction suggestions. For final brand name + logo color shanti, paid consultation is recommended — naming is a permanent decision and worth getting right.',
 },
 ],
 relatedKundliField: 'business-house',
 cta: 'Free Business Kundli Reading',
 },
 {
 slug: 'foreign-travel',
 title: 'Free Pandit Advice on Foreign Travel & Settlement',
 hindiTitle: 'विदेश यात्रा व निवास — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on foreign travel, visa, settlement abroad, NRI life. Vedic guidance for global Indian families.',
 intro: 'Foreign travel and settlement in Vedic astrology are indicated by: the 12th house (foreign lands, isolation, distant places), Rahu (sudden travel, unconventional paths abroad), the 9th house (higher learning, long journeys), the 3rd house (short journeys), Moon in watery signs (Cancer/Scorpio/Pisces — natural traveler), and Mercury (movement, frequent travel). A strong combination of these factors during a favorable dasha-bhukti indicates successful foreign settlement. Free pandit advice can tell you broad direction (yes/no/uncertain) and approximate timing window; specific country direction and visa muhurat need detailed consultation.',
 commonProblems: [
 'Multiple visa rejections despite strong application',
 'Confusion which country to migrate to',
 'Already abroad but want to return — should I?',
 'Stuck without PR/Green Card despite years of effort',
 'Family wants me to come back but I am settled abroad',
 ],
 freeRemedies: [
 'Recite Hanuman Chalisa on Tuesdays before visa interviews',
 'Offer water to peepal tree (Vishnu) on Saturdays for travel blessings',
 'Carry a small Ganesh murti during international travel',
 'Donate to a temple before any long-distance flight',
 'Fast on Ekadashi to clear travel karma',
 ],
 whenToConsultPaid: 'Visa interview muhurat, country-selection analysis for migration, PR/Green Card timing prediction, NRI marriage compatibility, return-to-India karma analysis.',
 faqs: [
 {
 question: 'Will I settle abroad permanently?',
 answer: 'Permanent foreign settlement is indicated by: (1) Strong 12th house with benefic placement (Jupiter, Venus, or strong 12th-lord); (2) Rahu in 7th, 9th, or 12th house; (3) Moon in watery sign with affliction at home (pulls away from birthplace); (4) 9th-lord in 12th house OR 12th-lord in 9th house (mutual exchange — strongest foreign yoga); (5) Saturn-Rahu conjunction (long-term separation from origin). A free pandit reading can give you a strong yes/no on permanent settlement. If yes — country direction (which 12th-house sign is involved indicates the cultural region). If uncertain — likely you will live abroad for periods but return eventually.',
 },
 {
 question: 'My visa keeps getting rejected — astrological reason?',
 answer: 'Common Vedic causes: (1) Running Ketu or Saturn dasha-bhukti that blocks travel houses; (2) Rahu-Ketu axis affecting 9th-12th house at the time of interview; (3) Mars-Saturn aspect on 12th house (delays + obstacles); (4) Bad transit during interview date (Mercury retrograde + Mars-Rahu transit). Free pandit advice can check whether the current period is favorable for visa attempts. Free remedies: Recite Hanuman Chalisa for 40 consecutive days before next interview, attempt visa on Wednesday or Thursday (avoid Tuesday/Saturday), avoid Mercury retrograde periods entirely, donate to a temple the day before interview, wear yellow on interview day.',
 },
 {
 question: 'Which country should I migrate to?',
 answer: 'Country direction in Vedic astrology is read from: (1) Which sign is in the 12th house (Aries = Middle East, Taurus = New Zealand/Europe, Gemini = USA/Singapore, Cancer = UK/Canada, Leo = Italy/France, Virgo = Switzerland/Germany, Libra = Japan, Scorpio = Russia/Eastern Europe, Sagittarius = Australia/Africa, Capricorn = India itself/SE Asia, Aquarius = Nordic/Northern Europe, Pisces = Caribbean/island nations); (2) Which planet is in the 12th house and its natural country associations; (3) Which Nakshatra falls on the 12th-house cusp. Free pandit reading can give you 2-3 broad regional directions; specific country choice should align with both Vedic indication AND your career/family pragmatics.',
 },
 {
 question: 'I am NRI — when should I return to India?',
 answer: 'Return-to-India is indicated by: (1) Running dasha-bhukti of 4th-lord (home, motherland) or 9th-lord (dharma, roots) — pulls back to origin; (2) Saturn transit through your 4th house from Moon (re-evaluation of home base); (3) Jupiter transit through 4th house (auspicious for family-home decisions); (4) Major life events in India (parent\'s illness, child\'s education, ancestral property). Free pandit advice can identify when the karmic pull will shift. Free remedies before deciding: visit India twice in 12 months to "test" alignment, perform Pitru Tarpana on next India visit (clears ancestral pull), and pray at family kuldevi/kuldevta temple. Often the return happens around age 45-55 naturally.',
 },
 {
 question: 'Will my NRI marriage be successful?',
 answer: 'NRI marriage compatibility involves all standard checks (Ashtakoot, Manglik, Navamsa, dashas) PLUS some specific NRI-particular factors: (1) Both partners\' 12th house should be compatible (shared foreign-life karma); (2) The partner staying in India needs strong 4th-house (home base) and 7th-lord in benefic placement; (3) Long-distance phase compatibility (Moon-Mercury harmony for daily communication); (4) Visa-timing alignment (no Saturn-Rahu transit during PR/spouse-visa application). Free Kundli milan tool handles the basic 36-point match; NRI-specific overlay requires a pandit. Darshya specifically serves NRI families and has pandits experienced in NRI Kundli milan — free consultation available.',
 },
 ],
 relatedKundliField: 'foreign-house',
 cta: 'Free NRI Kundli Reading',
 },
 {
 slug: 'court-case',
 title: 'Free Pandit Advice on Court Cases & Legal Matters',
 hindiTitle: 'न्यायालय व कानूनी मामले — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on court cases, legal disputes, property litigation, judgment timing. Vedic remedies for justice.',
 intro: 'Court cases and legal matters in Vedic astrology are read from: the 6th house (litigation, enemies, disputes), 8th house (hidden matters, sudden judgments), 9th house (justice, dharma, judges), and 12th house (loss, imprisonment). Mars rules direct conflict, Saturn rules delayed/long-running cases, Rahu rules manipulation, and Jupiter rules favorable judgments (he is the karaka of justice). A pandit identifies whether you have the upper hand or the disadvantage, likely duration of the case, settlement vs trial recommendation, and timing of favorable judgment. Free advice gives broad direction; specific case-strategy needs full consultation with both party charts.',
 commonProblems: [
 'Property dispute with relatives',
 'False criminal case filed against me',
 'Divorce / custody battle dragging for years',
 'Loan recovery legal action',
 'Defamation / civil case',
 ],
 freeRemedies: [
 'Recite Hanuman Chalisa 11 times daily during active case',
 'Offer water + red flowers to Mars (Mangal) on Tuesdays',
 'Donate red items + lentils on Tuesdays for Mars strengthening',
 'Recite Bajrang Baan stotra for protection from enemies',
 'Visit a Hanuman temple before every court hearing',
 ],
 whenToConsultPaid: 'Judgment-date prediction, settlement vs trial decision, opposite-party chart analysis, witness-credibility shanti, immediate-relief mantra prescription.',
 faqs: [
 {
 question: 'Will I win my court case?',
 answer: 'Vedic indicators for winning a court case: (1) Strong 6th-house lord (you defeat enemies); (2) Strong 9th house (justice flows toward you); (3) Mars in benefic placement (direct strength); (4) Jupiter in 1st, 5th, 9th, or 10th house (divine support); (5) Running dasha-bhukti of these benefic factors. Losing indicators: weak 6th-lord, 12th-house lord aspecting 6th, malefic in 9th house (justice goes against you), or Saturn-Rahu in 6th-12th axis during the trial. A free pandit reading can give you a probability assessment — usually 70-30 type prediction. For high-stakes cases, paid consultation with both party charts (opposite party) gives the most accurate result.',
 },
 {
 question: 'How long will my case take to resolve?',
 answer: 'Case duration is indicated by: (1) Saturn\'s position relative to 6th house (Saturn = delays — Saturn aspect on 6th = years-long case); (2) Number of malefics in 6th-8th houses (more = longer); (3) Running dasha duration (cases often resolve at the end of a major dasha or at dasha-change point); (4) Jupiter\'s transit (favorable Jupiter transit through 9th or 11th house from Moon = good time for resolution). A free pandit reading can give an approximate window (months/years). Free remedies during long cases: weekly Hanuman Chalisa, monthly Sundarkand recitation, fasting on Saturdays (Saturn pacification), and patience — most malefic dashas eventually end.',
 },
 {
 question: 'Should I settle out of court or fight?',
 answer: 'Vedic advice on settle vs fight: (1) If your 6th-house is stronger than your opponent\'s 6th-house = fight, you will win; (2) If both 6th-houses are weak = settle, both will lose energy; (3) If Saturn dasha is running for you = settle (Saturn brings unfavorable rulings); (4) If running Jupiter dasha or Jupiter-Mars in benefic position = fight (divine support backs you); (5) If running Rahu dasha = unpredictable — better to settle than risk unexpected reversal. Free pandit reading can give a clear settle/fight recommendation. For most family/property disputes, settlement is usually karmically lighter than prolonged courtroom war — Vedic shastra prefers peace over technical victory.',
 },
 {
 question: 'Astrological remedies for false criminal cases?',
 answer: 'False criminal accusations are particularly painful because the karmic pattern is often from past-life — someone you wronged in a previous birth returning the karma. Indicators: Rahu-Saturn conjunction in 6th or 12th, Mars-Rahu yoga, or running Rahu-Saturn antardasha. Free remedies: (1) Daily Hanuman Chalisa + Bajrang Baan (Hanuman is the protector from false enemies); (2) Pancha-Mukhi Hanuman puja (five-faced Hanuman protects from five-directional attacks); (3) Wear a Hanuman locket (silver, blessed at Salasar/Mehndipur Balaji); (4) Visit Mehndipur Balaji (Rajasthan) — supreme remedial site for false-case karma; (5) Sundar Kand path every Saturday. For severe cases, a paid Hanuman Mool Mantra Anushthaan (108,000 chants over 40 days) by a qualified pandit is the traditional resolution.',
 },
 {
 question: 'Which planet rules justice in Vedic astrology?',
 answer: 'Jupiter (Guru / Brihaspati) is the supreme karaka of justice, dharma, law, and favorable judgments. A strong Jupiter in your chart means courts and authority generally favor you. Mars rules direct combat (winning fights through strength). Saturn rules patience-based victory (winning long cases by outlasting opponent). Rahu rules unconventional/manipulative wins. Mercury rules legal argumentation skill (good for lawyers themselves). For a strong court case, you want Jupiter and Mars working together — Jupiter brings the favorable judge/jury, Mars brings your confident testimony. Free remedies for Jupiter strengthening: yellow clothes on Thursdays, donation of turmeric/jaggery to temples, recitation of Guru Stotram, and consultation with a knowledgeable Brahmin pandit before each hearing.',
 },
 ],
 relatedKundliField: 'litigation-house',
 cta: 'Free Legal Kundli Reading',
 },
 {
 slug: 'child-birth',
 title: 'Free Pandit Advice on Childbirth & Progeny',
 hindiTitle: 'संतान सुख व प्रसव — मुफ्त पंडित सलाह',
 metaDescription: 'Free pandit kundli astrology advice on childbirth, Santan dosh, fertility remedies, child-naming. Verified Vedic guidance for couples planning family.',
 intro: 'Children and progeny in Vedic astrology are read from the 5th house (Putra Bhava — son/progeny in general), the 9th house (overall family-line continuation), Jupiter (universal progeny karaka, especially for first child), and Mars/Mercury for the timing of conception. The 5th-lord\'s strength, planetary aspects on 5th, and dasha of 5th-lord all indicate progeny success. Santan dosh (progeny affliction) is indicated by: Saturn/Rahu/Ketu in 5th, malefic in 5th from Jupiter, or 5th-lord in 6th/8th/12th. A pandit identifies progeny direction, suggests conception-favorable windows, and recommends Santan-prapti rituals.',
 commonProblems: [
 'Trying for child for 3+ years without success',
 'Multiple miscarriages',
 'Doctors found no issue but no conception',
 'Confusion about IVF — astrological perspective',
 'Naming the newborn — Nakshatra-based suggestions',
 ],
 freeRemedies: [
 'Recite Santan Gopal mantra (108 times daily) for conception',
 'Couples fast on 16 consecutive Mondays for Shiva-Parvati blessings',
 'Offer kheer to Krishna on Bhadrapad Ashtami (Janmashtami)',
 'Visit Gokul / Vrindavan together (Krishna = child-blessing deity)',
 'Read Putra Prapti Stotram on Thursdays (Jupiter\'s day)',
 ],
 whenToConsultPaid: 'Detailed Santan dosh analysis, IVF muhurat timing, paid Santan Gopal Homa, child Nakshatra calculation + naming, post-birth karma analysis.',
 faqs: [
 {
 question: 'Why are we not conceiving despite trying for years?',
 answer: 'Common Vedic causes: (1) Afflicted 5th house in either spouse\'s chart (Saturn-Rahu, Mars-Ketu, malefic in 5th); (2) Weak Jupiter (universal progeny karaka); (3) 5th-lord in 6th/8th/12th house (delayed/difficult progeny); (4) Running dasha of malefic 5th-bhukti; (5) Pitru dosh (ancestor obstruction); (6) Inadvertent past-life karma (vow not to have child, harming a child, etc). A free pandit reading on BOTH spouses\' charts identifies which factor is active. Common free remedies: 41-day Santan Gopal mantra recitation by both, Pitru Tarpana on next Amavasya, visiting Garbharakshambika temple (Tamil Nadu — supreme progeny deity), and stopping the obsessive timing-focused approach (Rahu-energy works against natural conception). Combine with fertility medicine — both pathways simultaneously.',
 },
 {
 question: 'Is IVF okay astrologically?',
 answer: 'Yes — Vedic astrology has no objection to assisted reproduction (IVF, IUI, surrogacy). Many ancient yogis advised "use available means to fulfill dharma" (gruhastha dharma includes responsible procreation). However, astrology CAN improve IVF success rates by: (1) Choosing embryo-transfer date during favorable Moon-Jupiter transit; (2) Avoiding Saturn-Rahu transit on 5th-house; (3) Performing Santan Gopal Homa on the embryo-transfer day; (4) Couples wearing prescribed gemstones (pukhraj for Jupiter, moonga for Mars if both verified safe for individual charts). Free pandit advice can identify favorable months in the next 12-month window. Specific transfer-date muhurat selection requires paid consultation.',
 },
 {
 question: 'How to name my newborn baby astrologically?',
 answer: 'Vedic baby-naming uses the Nakshatra (lunar mansion) of birth + the pada (quarter) within that Nakshatra. Each Nakshatra has 4 padas, and each pada is associated with specific Sanskrit syllables (akshara). The baby\'s name traditionally starts with the syllable of their birth-Nakshatra-pada. For example, baby born in Ashwini Pada 1 = name starts with "Chu" (चु). This ensures the name vibrates with the baby\'s natal Moon energy. Free Naamkaran tools on Darshya calculate this from birth time/date/place. Additional considerations: total numerological value of full name, family kuldevi-aligned syllable, and modern pronunciation ease. Pandits typically suggest 5-10 options per Nakshatra-pada.',
 },
 {
 question: 'What is Santan dosh and how to remove it?',
 answer: 'Santan dosh = afflictions to the 5th house that delay or prevent progeny. Specific patterns: (1) Saturn in 5th house = delayed children, child after age 35; (2) Rahu in 5th house = unconventional conception (IVF, adoption, late-life children); (3) Ketu in 5th house = spiritual children, sometimes only one child; (4) Mars in 5th house = miscarriage risk or pregnancy complications; (5) Sun in 5th house weakly placed = single child, often male; (6) 5th-lord in 6th house = obstacles in conception. Free pandit reading can identify your specific dosh. Free remedies: 41-day Santan Gopal japa, Lalita Sahasranama recitation by wife, visiting Garbharakshambika temple. For severe cases, Putrakameshti Yagna (the puja Dasharatha did for Rama\'s birth) is recommended — this is a 3-day paid puja by a qualified pandit.',
 },
 {
 question: 'When is the best time to plan pregnancy?',
 answer: 'Best Vedic conception windows: (1) During Shukla Paksha (waxing moon, especially around Purnima — full moon — for healthy mind-baby); (2) Avoid Krishna Chaturdashi and Amavasya (no-moon — believed to produce restless/sensitive children); (3) Avoid Rahu Kaal (each day has 90 minutes of Rahu Kaal — check Panchang); (4) Favorable days: Wednesday (Mercury — intelligent child), Thursday (Jupiter — wise child), Friday (Venus — beautiful child); (5) Favorable nakshatras for conception: Rohini, Pushya, Anuradha, Uttara Phalguni, Uttara Bhadrapada, Mrigashira. Free Panchang on Darshya shows daily Rahu Kaal + nakshatra. For specific month-window timing based on your chart, free pandit consultation works for most couples.',
 },
 ],
 relatedKundliField: 'progeny-house',
 cta: 'Free Progeny Kundli Reading',
 },
];

export function topicSlugs(): string[] {
 return FREE_PANDIT_TOPICS.map((t) => t.slug);
}

export function getTopicBySlug(slug: string): FreePanditTopic | undefined {
 return FREE_PANDIT_TOPICS.find((t) => t.slug === slug);
}
