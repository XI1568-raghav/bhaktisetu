// Lal Kitab — graha-house dosha + Farman (traditional remedy) lookup.
// Pure data. No astronomy. Tradition: Pt. Roop Chand Joshi's Lal Kitab (1939-52).
// 9 grahas × 12 houses + 12 life-problem → afflicting-graha mapping.
// Upay are household items (water, jaggery, copper, silver, almonds, mustard
// oil, feeding crows/dogs/cows) — Lal Kitab's signature low-cost prescription.

export type GrahaCode =
 | 'surya' | 'chandra' | 'mangal' | 'budh' | 'guru'
 | 'shukra' | 'shani' | 'rahu' | 'ketu';

export type Graha = {
 code: GrahaCode;
 sanskrit: string;
 name: string;          // English
 western: string;       // Western equivalent
 nature: 'benefic' | 'malefic' | 'mixed';
 element: 'Fire' | 'Water' | 'Earth' | 'Air' | 'Ether';
 day: string;           // ruling weekday
 metal: string;
 color: string;
 gemstone: string;
 deity: string;
 generalUpay: string[]; // 3 universal Farman per graha
 significance: string;
};

export type LifeProblem =
 | 'career'
 | 'marriage'
 | 'health'
 | 'wealth'
 | 'legal-case'
 | 'family-discord'
 | 'education'
 | 'foreign-travel'
 | 'property'
 | 'progeny'
 | 'mental-peace'
 | 'enemy-trouble';

export type ProblemDef = {
 value: LifeProblem;
 label: string;
 sanskrit: string;
 grahas: GrahaCode[];   // most-commonly-afflicting grahas per Lal Kitab
 description: string;
};

export type HouseEffect = {
 house: number;          // 1..12
 sanskrit: string;       // bhava name
 verdict: 'auspicious' | 'neutral' | 'troubling';
 effect: string;         // short effect string
 upay: string;           // Lal Kitab specific Farman
};

export const GRAHAS: Graha[] = [
 {
  code: 'surya', sanskrit: 'सूर्य', name: 'Surya', western: 'Sun',
  nature: 'mixed', element: 'Fire', day: 'Sunday', metal: 'Copper',
  color: 'Saffron / Red', gemstone: 'Ruby (Manik)', deity: 'Surya Narayan',
  generalUpay: [
   'Offer water (Arghya) to rising Surya at sunrise with copper lota — add red flower + roli',
   'Donate wheat + jaggery (gur) to temple or needy on Sunday',
   'Wear copper ring on ring finger; never accept anything free from father-in-law',
  ],
  significance: 'Father, authority, government, soul, vitality, eyesight, bones, leadership',
 },
 {
  code: 'chandra', sanskrit: 'चन्द्र', name: 'Chandra', western: 'Moon',
  nature: 'benefic', element: 'Water', day: 'Monday', metal: 'Silver',
  color: 'White', gemstone: 'Pearl (Moti)', deity: 'Chandra Dev',
  generalUpay: [
   'Offer milk + water to Lord Shiva every Monday — preferably at white-marble temple',
   'Keep silver coin / silver square in wallet; never refuse milk to anyone who asks',
   'Respect and serve mother — touch her feet daily; do not insult any elder woman',
  ],
  significance: 'Mother, mind, emotions, water, public, fluids, mental peace, fame',
 },
 {
  code: 'mangal', sanskrit: 'मंगल', name: 'Mangal', western: 'Mars',
  nature: 'malefic', element: 'Fire', day: 'Tuesday', metal: 'Copper / Bronze',
  color: 'Red', gemstone: 'Red Coral (Moonga)', deity: 'Hanuman / Kartikeya',
  generalUpay: [
   'Recite Hanuman Chalisa on Tuesday + offer sindoor + chameli oil to Hanuman ji',
   'Donate red lentils (masoor) + jaggery on Tuesday; sweet revdi to children',
   'Bury a sweet (gud / batasha) in the ground; plant a neem tree if possible',
  ],
  significance: 'Brother, courage, energy, land, surgery, accidents, blood, debt',
 },
 {
  code: 'budh', sanskrit: 'बुध', name: 'Budh', western: 'Mercury',
  nature: 'mixed', element: 'Earth', day: 'Wednesday', metal: 'Bronze',
  color: 'Green', gemstone: 'Emerald (Panna)', deity: 'Vishnu / Ganesh',
  generalUpay: [
   'Feed green grass / spinach to cow on Wednesday',
   'Donate green moong dal + green clothes to young girls; never insult sisters / daughters / nieces',
   'Pierce nose / wear green thread; keep brass utensils at home',
  ],
  significance: 'Sister, intellect, speech, trade, communication, skin, nervous system',
 },
 {
  code: 'guru', sanskrit: 'गुरु', name: 'Guru', western: 'Jupiter',
  nature: 'benefic', element: 'Ether', day: 'Thursday', metal: 'Gold',
  color: 'Yellow', gemstone: 'Yellow Sapphire (Pukhraj)', deity: 'Brihaspati / Vishnu',
  generalUpay: [
   'Apply saffron / kesar tilak on forehead daily; respect Guru + teachers + Brahmins',
   'Donate yellow items — turmeric, chana dal, gud, banana — on Thursday',
   'Plant a peepal tree; offer water to it on Thursday morning',
  ],
  significance: 'Wisdom, wealth, teacher, husband (for women), children, religion, liver',
 },
 {
  code: 'shukra', sanskrit: 'शुक्र', name: 'Shukra', western: 'Venus',
  nature: 'benefic', element: 'Water', day: 'Friday', metal: 'Silver / Platinum',
  color: 'White / Pink', gemstone: 'Diamond / White Sapphire', deity: 'Lakshmi / Mahalakshmi',
  generalUpay: [
   'Offer kheer / white sweets to Goddess Lakshmi on Friday',
   'Donate white clothes + curd + sugar; respect wife / partner; never insult any woman',
   'Keep your body + clothes clean; use perfume / itr; maintain bathroom in clean white tiles',
  ],
  significance: 'Wife, beauty, luxury, comforts, art, vehicles, semen, kidneys, marriage',
 },
 {
  code: 'shani', sanskrit: 'शनि', name: 'Shani', western: 'Saturn',
  nature: 'malefic', element: 'Air', day: 'Saturday', metal: 'Iron',
  color: 'Black / Dark Blue', gemstone: 'Blue Sapphire (Neelam)', deity: 'Shani Dev / Hanuman',
  generalUpay: [
   'Offer mustard oil to Shani Dev / Peepal tree on Saturday evening',
   'Feed crows + black dog + ant colony — black urad dal, roti with mustard oil',
   'Donate black items — black sesame (til), black cloth, iron, leather shoes — to a poor labourer',
  ],
  significance: 'Servants, sorrow, justice, longevity, labour, oil, iron, paralysis, joints',
 },
 {
  code: 'rahu', sanskrit: 'राहु', name: 'Rahu', western: 'North Node',
  nature: 'malefic', element: 'Air', day: 'Saturday (night) / no fixed day', metal: 'Lead / Mixed',
  color: 'Smoky / Grey', gemstone: 'Hessonite (Gomed)', deity: 'Durga / Saraswati',
  generalUpay: [
   'Flow 400 g coal / barley (jau) in running water (river) on Saturday',
   'Donate radish (mooli) + blue-black cloth + mustard oil at a temple of Goddess Durga',
   'Keep a solid silver square or elephant in pocket; never wear second-hand clothes',
  ],
  significance: 'Foreign lands, sudden gains, illusion, scandal, addictions, technology, occult, in-laws',
 },
 {
  code: 'ketu', sanskrit: 'केतु', name: 'Ketu', western: 'South Node',
  nature: 'malefic', element: 'Fire', day: 'Tuesday (night) / no fixed day', metal: 'Mixed Alloy',
  color: 'Multicolour / Smoke-grey', gemstone: "Cat's Eye (Lehsunia)", deity: 'Ganesh / Bhairava',
  generalUpay: [
   'Donate a black-and-white blanket to a sadhu or to a temple; feed stray dogs',
   'Keep a silver coin with a hole in your wallet; wear gold in ear (men) — pierce ear',
   'Worship Lord Ganesh daily — offer durva grass + modak; feed brown dog with sweet roti',
  ],
  significance: 'Moksha, detachment, son, hidden enemy, sudden loss, spirituality, accidents, skin',
 },
];

export const PROBLEMS: ProblemDef[] = [
 { value: 'career',          label: 'Career / Job blocked',     sanskrit: 'कर्म बाधा',     grahas: ['shani', 'surya', 'rahu'],         description: 'Promotion stuck, boss trouble, transfers, repeated job loss, unfulfilling work' },
 { value: 'marriage',        label: 'Marriage delay / discord', sanskrit: 'विवाह दोष',     grahas: ['guru', 'shukra', 'mangal', 'rahu'], description: 'Delayed marriage, broken alliances, marital discord, separation, in-law trouble' },
 { value: 'health',          label: 'Chronic health issues',    sanskrit: 'रोग दोष',       grahas: ['shani', 'rahu', 'ketu', 'mangal'], description: 'Recurring illness, surgery, paralysis, joint pain, skin disorders, blood issues' },
 { value: 'wealth',          label: 'Money / debt trouble',     sanskrit: 'धन हानि',       grahas: ['guru', 'shukra', 'shani', 'rahu'], description: 'Money does not stay, mounting debt, business loss, sudden expenses, theft' },
 { value: 'legal-case',      label: 'Court case / legal',       sanskrit: 'न्यायालय दोष',   grahas: ['shani', 'mangal', 'rahu'],         description: 'Pending court case, property dispute, false accusations, criminal liability' },
 { value: 'family-discord',  label: 'Family conflict',          sanskrit: 'कुल कलह',       grahas: ['surya', 'chandra', 'mangal', 'rahu'], description: 'Father / mother / sibling discord, parental health, generational disputes' },
 { value: 'education',       label: 'Education / focus',        sanskrit: 'विद्या बाधा',    grahas: ['budh', 'guru', 'ketu'],            description: 'Cannot concentrate, exam failure, learning disability, dropped out, brain fog' },
 { value: 'foreign-travel',  label: 'Foreign travel / settle',  sanskrit: 'विदेश योग',      grahas: ['rahu', 'shukra', 'chandra'],       description: 'Visa rejection, settling abroad delayed, NRI relocation issues, homesickness' },
 { value: 'property',        label: 'Property / land',          sanskrit: 'भूमि दोष',       grahas: ['mangal', 'shani', 'surya'],        description: 'Property purchase stuck, registration delay, illegal encroachment, vastu dosha' },
 { value: 'progeny',         label: 'Children / progeny',       sanskrit: 'संतान बाधा',     grahas: ['guru', 'chandra', 'ketu'],         description: 'Childlessness, miscarriage, IVF failure, problematic children, son-issue' },
 { value: 'mental-peace',    label: 'Mental peace / anxiety',   sanskrit: 'मन शान्ति',      grahas: ['chandra', 'rahu', 'ketu'],         description: 'Anxiety, insomnia, depression, addictive habits, fearful dreams, scattered mind' },
 { value: 'enemy-trouble',   label: 'Enemies / hidden harm',    sanskrit: 'शत्रु बाधा',     grahas: ['mangal', 'shani', 'ketu', 'rahu'], description: 'Workplace enemies, evil eye (nazar), black magic suspicion, betrayal by trusted ally' },
];

// 9 grahas × 12 houses = 108 effect cells. Auspicious / neutral / troubling
// per Lal Kitab chapter Granthavali (Roop Chand Joshi, 1952 edn). Upay column
// lists the most-cited Farman for each placement.
const HOUSE_SANSKRIT = [
 'तनु (Self)', 'धन (Wealth)', 'सहज (Siblings)', 'सुख (Home)', 'पुत्र (Progeny)', 'रिपु (Enemies)',
 'जाया (Spouse)', 'आयु (Longevity)', 'भाग्य (Fortune)', 'कर्म (Career)', 'लाभ (Gains)', 'व्यय (Loss)',
];

function houseLabel(n: number): string { return HOUSE_SANSKRIT[n - 1] ?? ''; }

const RAW_EFFECTS: Record<GrahaCode, Array<Pick<HouseEffect, 'verdict' | 'effect' | 'upay'>>> = {
 surya: [
  { verdict: 'auspicious', effect: 'King-like authority, strong father, govt favour',                              upay: 'Daily Surya Arghya at sunrise; donate jaggery in temple' },
  { verdict: 'neutral',    effect: 'Wealth mixed with ego; father health needs care',                              upay: 'Wear copper kada; eat sweet before leaving home' },
  { verdict: 'auspicious', effect: 'Strong brothers, courage; benefits from elder siblings',                       upay: 'Respect elder brother; never accept free goods' },
  { verdict: 'troubling',  effect: 'Mother health hit, family discord, home unease',                               upay: 'Offer water to Surya facing East; donate wheat on Sunday' },
  { verdict: 'auspicious', effect: 'Son well-being, good education for progeny',                                   upay: 'Bury copper coin under tulsi root; recite Aditya Hridayam' },
  { verdict: 'auspicious', effect: 'Victory over enemies, govt support in disputes',                               upay: 'Donate red flowers + roli at Surya temple Sunday' },
  { verdict: 'troubling',  effect: 'Marital ego clash, spouse health concerns',                                    upay: 'Avoid alcohol; respect wife / husband; donate gud-chana' },
  { verdict: 'troubling',  effect: 'Health setbacks, eye / heart issues, accident risk',                           upay: 'Recite Surya Namaskar 12 sets; donate copper utensil Sunday' },
  { verdict: 'auspicious', effect: 'Strong fortune, govt job, father-like blessings from elders',                  upay: 'Carry red kerchief; offer water to peepal Thursday' },
  { verdict: 'auspicious', effect: 'Career peaks, govt / political success, leadership roles',                     upay: 'Surya Arghya daily; donate wheat to Brahmin Sunday' },
  { verdict: 'auspicious', effect: 'Big gains via govt / authority; honour from seniors',                          upay: 'Offer red flowers to rising sun; respect father / elders' },
  { verdict: 'troubling',  effect: 'Foreign isolation, hidden enemy from authority, eye issues',                   upay: 'Offer water to Surya; donate jaggery + copper on Sunday' },
 ],
 chandra: [
  { verdict: 'auspicious', effect: 'Beautiful face, popular, emotionally strong',                                  upay: 'Offer milk to Shivlinga Monday; wear pearl ring' },
  { verdict: 'auspicious', effect: 'Liquid wealth, smooth income, mother gives wealth',                            upay: 'Keep silver square in wallet; respect mother daily' },
  { verdict: 'troubling',  effect: 'Sibling distance, mind unsettled by relatives',                                upay: 'Donate rice + milk Monday; do not accept clothes from sister' },
  { verdict: 'auspicious', effect: 'Home full of comforts, mother well, public favour',                            upay: 'Plant white flowers at home; offer Kheer to mother first' },
  { verdict: 'neutral',    effect: 'Imaginative children but emotional; some delay in progeny',                    upay: 'Feed white cow with rice Monday; donate sugar' },
  { verdict: 'troubling',  effect: 'Cold + chest issues, hidden enemies, mood swings',                             upay: 'Drink water from silver glass; chant Om Namah Shivaya 108x' },
  { verdict: 'auspicious', effect: 'Loving spouse, marital peace, popularity through partner',                     upay: 'Gift silver to spouse; offer milk-rice at temple together' },
  { verdict: 'troubling',  effect: 'Mother health risk, sudden mental upset, water-borne illness',                 upay: 'Donate milk Monday; avoid drinking from broken / cracked vessel' },
  { verdict: 'auspicious', effect: 'Pilgrimage benefit, kind teachers, religious leanings',                        upay: 'Visit Shiva temple every Monday; donate white items' },
  { verdict: 'neutral',    effect: 'Career through public / fluids / women / media',                               upay: 'Wear white on Monday at work; donate milk to ashram' },
  { verdict: 'auspicious', effect: 'Strong female friend circle, gains via mother / public',                       upay: 'Respect elder women; offer sugar to ants daily' },
  { verdict: 'troubling',  effect: 'Foreign isolation, mind disturbed at night, insomnia',                         upay: 'Keep silver under pillow; chant Chandra mantra before sleep' },
 ],
 mangal: [
  { verdict: 'troubling',  effect: 'Hot temper, accidents, head injury, manglik dosha',                            upay: 'Recite Hanuman Chalisa Tuesday; offer sindoor to Hanuman' },
  { verdict: 'troubling',  effect: 'Family feud over money, harsh speech, tooth issues',                           upay: 'Donate sweet (gud) revdi to children Tuesday; bury sweet in earth' },
  { verdict: 'auspicious', effect: 'Brave brothers, leadership of siblings, athletic',                             upay: 'Plant neem tree; donate red lentil (masoor) Tuesday' },
  { verdict: 'troubling',  effect: 'Home tension, vehicle accident risk, mother-property quarrel',                 upay: 'Offer red roses to Hanuman; do not keep weapons / sharp items above bed' },
  { verdict: 'neutral',    effect: 'Bold but stubborn children; surgery for child possible',                       upay: 'Feed bananas to monkeys Tuesday; Hanuman Chalisa daily' },
  { verdict: 'auspicious', effect: 'Win lawsuits, defeat enemies, courageous in conflict',                         upay: 'Donate jaggery to temple Tuesday; wear red coral' },
  { verdict: 'troubling',  effect: 'Manglik — spouse temperament hot, marriage stress / delay',                    upay: 'Worship Hanuman pre-marriage; recite Sundara Kand Tuesday' },
  { verdict: 'troubling',  effect: 'Accident, surgery, blood disorder, sudden mishap risk',                        upay: 'Donate blood once a year; offer red flowers to Bhairav Tuesday' },
  { verdict: 'neutral',    effect: 'Travels for work / military / sports career',                                  upay: 'Carry red kerchief while travelling; touch Hanuman feet daily' },
  { verdict: 'auspicious', effect: 'Career in military / police / engineering / surgery / land',                   upay: 'Donate copper utensil Tuesday; offer ladoo to Ganesh' },
  { verdict: 'auspicious', effect: 'Gains from real estate, courage brings success',                               upay: 'Plant red roses; feed jaggery to cow Tuesday' },
  { verdict: 'troubling',  effect: 'Foreign accident risk, secret enemies, heavy expenses on health',              upay: 'Recite Bajrang Baan Tuesday; donate red cloth at Hanuman temple' },
 ],
 budh: [
  { verdict: 'auspicious', effect: 'Sharp intellect, eloquent speech, witty personality',                          upay: 'Feed green grass to cow Wednesday; recite Vishnu Sahasranama' },
  { verdict: 'auspicious', effect: 'Money through writing, trade, communication',                                  upay: 'Donate green moong dal Wednesday; respect sisters' },
  { verdict: 'auspicious', effect: 'Loving sisters, good with younger relatives',                                  upay: 'Wear green thread on right wrist; daily Ganesh aarti' },
  { verdict: 'auspicious', effect: 'Comfortable home, good vehicles, mother smart',                                upay: 'Keep emerald or green stone; offer durva to Ganesh Wednesday' },
  { verdict: 'auspicious', effect: 'Intelligent children, may be only son',                                        upay: 'Feed green grass to cow; donate books to students' },
  { verdict: 'neutral',    effect: 'Skill defeats enemies but skin trouble likely',                                upay: 'Apply chandan tilak; donate green clothes to young girls' },
  { verdict: 'auspicious', effect: 'Intellectual spouse, marriage through trade / business',                       upay: 'Pierce nose (women); wear green on Wednesday' },
  { verdict: 'troubling',  effect: 'Nerves + skin issues, sudden financial drop, speech impediment',               upay: 'Donate spinach + green moong to cow Wednesday; chant Vishnu mantra' },
  { verdict: 'auspicious', effect: 'Religious learning, fortune via teachers / writing',                           upay: 'Donate religious books; offer prayer at Vishnu temple Thursday' },
  { verdict: 'auspicious', effect: 'Career in writing / accounts / IT / trade / media',                            upay: 'Wear emerald; feed brown cow with green grass Wednesday' },
  { verdict: 'auspicious', effect: 'Gains through younger friends, business partners',                             upay: 'Donate green chana dal Wednesday; daily Vishnu mantra 11x' },
  { verdict: 'troubling',  effect: 'Loss via fraud, partner cheating in business, nervous breakdown',              upay: 'Avoid green clothes for self; offer green leaves to cow' },
 ],
 guru: [
  { verdict: 'auspicious', effect: 'Wise + religious + righteous personality, respected',                          upay: 'Saffron tilak daily; offer water to peepal Thursday' },
  { verdict: 'auspicious', effect: 'Family wealth, fortune in inheritance, gold accumulation',                     upay: 'Donate chana dal + gud Thursday; respect Guru daily' },
  { verdict: 'neutral',    effect: 'Religious siblings; brother in priest / teacher role',                         upay: 'Wear gold ring on index finger; donate yellow cloth to priest' },
  { verdict: 'auspicious', effect: 'Happiness in home, blessed by elders, mother healthy',                         upay: 'Keep haldi (turmeric) in puja; offer banana to Vishnu Thursday' },
  { verdict: 'auspicious', effect: 'Multiple children, intelligent + religious progeny',                           upay: 'Plant peepal sapling; recite Vishnu Sahasranama Thursday' },
  { verdict: 'neutral',    effect: 'Wisdom defeats enemies; some health concerns from over-eating',                upay: 'Donate chana dal Thursday; avoid sweets in excess' },
  { verdict: 'auspicious', effect: 'Loving + virtuous spouse, marriage brings fortune',                            upay: 'Offer yellow flowers to Lakshmi-Narayan Thursday' },
  { verdict: 'troubling',  effect: 'Hidden disease, mantra-bhang risk, liver issues, slow chronic decline',        upay: 'Recite Mahamrityunjaya 108x daily; donate yellow items Thursday' },
  { verdict: 'auspicious', effect: 'Pilgrimage, religious wealth, blessings from gurus and saints',                upay: 'Visit Vishnu temple Thursday; donate chana + gud to ashram' },
  { verdict: 'auspicious', effect: 'Career in teaching / law / religion / consulting / advisory',                  upay: 'Apply chandan tilak; donate yellow turmeric Thursday at temple' },
  { verdict: 'auspicious', effect: 'Big gains from teaching / consulting / religious career',                      upay: 'Donate gold (small piece) at temple; respect husband / wife / guru' },
  { verdict: 'auspicious', effect: 'Moksha karaka — final liberation indicated, foreign religious travel',         upay: 'Visit Char Dham / Jyotirlinga; donate books to ashram' },
 ],
 shukra: [
  { verdict: 'auspicious', effect: 'Beautiful, artistic, charming personality, magnetic',                          upay: 'Offer kheer to Lakshmi Friday; wear white-pink' },
  { verdict: 'auspicious', effect: 'Luxury wealth, fine clothes, perfume + jewellery',                             upay: 'Keep silver + diamond in wallet; respect wife / partner' },
  { verdict: 'neutral',    effect: 'Artistic sisters, female friends; possible affair',                            upay: 'Donate white sweets + rice to women on Friday' },
  { verdict: 'auspicious', effect: 'Beautiful home, vehicles, all comforts, loving mother',                        upay: 'Keep fresh white flowers at home; offer perfume / itr to Devi' },
  { verdict: 'auspicious', effect: 'Beautiful + artistic children; first child likely daughter',                   upay: 'Feed sugar to ants daily; offer kheer to Lakshmi Friday' },
  { verdict: 'troubling',  effect: 'Diabetes / kidney issues, female enemies, secret affair risk',                 upay: 'Donate curd + sugar Friday; avoid extramarital affairs' },
  { verdict: 'auspicious', effect: 'Beautiful loving spouse, marital bliss, romance, fertility',                   upay: 'Gift perfume / silver to spouse Friday; visit Lakshmi temple' },
  { verdict: 'troubling',  effect: 'Reproductive health issues, sudden financial drop via partner',                upay: 'Donate diamond (small) / white cloth Friday; respect spouse always' },
  { verdict: 'auspicious', effect: 'Lucky in art / film / fashion / luxury; foreign luxury travel',                upay: 'Wear silver chain; offer red roses to Devi Friday' },
  { verdict: 'auspicious', effect: 'Career in art / film / luxury / hospitality / cosmetics / fashion',            upay: 'Apply chandan; donate white sweets + sugar Friday' },
  { verdict: 'auspicious', effect: 'Gains via women / art / luxury goods; rich female friends',                    upay: 'Donate curd to Brahmin Friday; respect female elders' },
  { verdict: 'neutral',    effect: 'Bed comforts, luxury in foreign land, but expenses on women / pleasures',      upay: 'Limit pleasure-spending; donate kheer to women in temple Friday' },
 ],
 shani: [
  { verdict: 'troubling',  effect: 'Slow start in life, lonely childhood, serious personality, joint issues',     upay: 'Offer mustard oil to Shani Saturday; feed black dog' },
  { verdict: 'troubling',  effect: 'Speech impediment, harsh family, late wealth accumulation',                    upay: 'Donate black urad dal + sesame Saturday; visit Shani temple' },
  { verdict: 'auspicious', effect: 'Brothers stable + hardworking; gain from labour',                              upay: 'Feed crows roti with mustard oil Saturday; respect servants' },
  { verdict: 'troubling',  effect: 'Mother health, home delays, property dispute',                                 upay: 'Offer black sesame + iron at Shani temple Saturday' },
  { verdict: 'troubling',  effect: 'Delayed children, son trouble, miscarriage risk',                              upay: 'Recite Hanuman Chalisa Tuesday + Saturday; donate iron tools' },
  { verdict: 'auspicious', effect: 'Long-running enemies defeated, success in slow accumulation',                  upay: 'Feed black dog Saturday; donate black blanket to labourer' },
  { verdict: 'troubling',  effect: 'Marriage delay (~30 yrs+), older spouse, slow karmic union',                   upay: 'Donate black umbrella Saturday; visit Shani Shingnapur if possible' },
  { verdict: 'troubling',  effect: 'Chronic disease, paralysis risk, longevity blocks, slow decay',                upay: 'Offer mustard oil to Shani; recite Mahamrityunjaya 108x daily' },
  { verdict: 'troubling',  effect: 'Pilgrimage of suffering, slow fortune, foreign isolation',                     upay: 'Feed ants with sugar daily; donate black sesame Saturday' },
  { verdict: 'auspicious', effect: 'Steady late career, blue-collar success, govt service through perseverance',   upay: 'Donate iron horseshoe to temple Saturday; serve old / poor' },
  { verdict: 'auspicious', effect: 'Big gains in old age, slow wealth accumulation, retirement comfort',           upay: 'Donate to old age home Saturday; respect elders + labourers' },
  { verdict: 'neutral',    effect: 'Foreign settlement late in life, isolation but eventual peace',                upay: 'Feed crows + ants; visit Shani temple before any major foreign trip' },
 ],
 rahu: [
  { verdict: 'troubling',  effect: 'Sudden image trouble, confusion, scandal risk',                                upay: 'Flow barley (jau) in river Saturday; wear silver square' },
  { verdict: 'neutral',    effect: 'Sudden gains + sudden losses; family in foreign land',                         upay: 'Donate radish (mooli) Saturday; never take loan on Saturday' },
  { verdict: 'auspicious', effect: 'Courage, foreign travel via siblings, technology benefits',                    upay: 'Keep silver elephant; respect father-in-law / in-laws' },
  { verdict: 'troubling',  effect: 'Sudden home loss, vastu dosh, mother health risk, paranoia',                   upay: 'Donate blue-black cloth at Durga temple Saturday' },
  { verdict: 'troubling',  effect: 'Childlessness, IVF needed, adopted child possible, miscarriages',              upay: 'Recite Durga Saptashati; donate silver to female child' },
  { verdict: 'auspicious', effect: 'Defeats secret enemies, win court cases, hidden gains',                        upay: 'Flow coal in river Saturday; donate mustard oil at temple' },
  { verdict: 'troubling',  effect: 'Inter-caste / sudden marriage, spouse from foreign land, separation risk',     upay: 'Worship Goddess Durga before marriage; avoid intoxicants' },
  { verdict: 'troubling',  effect: 'Mysterious illness, addictions, sudden longevity threat, accidents',           upay: 'Donate Hessonite (Gomed) silver ring; recite Durga mantra' },
  { verdict: 'neutral',    effect: 'Foreign fortune, lucky travels, unconventional spiritual path',                upay: 'Visit Goddess Durga temple Friday; donate to NGO Saturday' },
  { verdict: 'auspicious', effect: 'Career in technology / film / aviation / foreign / unconventional',            upay: 'Wear Gomed in silver; donate blue cloth to poor Saturday' },
  { verdict: 'auspicious', effect: 'Sudden big windfalls, lottery, foreign income, NRI gains',                     upay: 'Donate radish + barley at temple Saturday; keep silver in wallet' },
  { verdict: 'troubling',  effect: 'Heavy unforeseen expenses, foreign isolation, addictions to control',          upay: 'Flow coconut in river Saturday; avoid drinking; meditate on Saraswati' },
 ],
 ketu: [
  { verdict: 'troubling',  effect: 'Detached personality, confused identity, skin trouble',                        upay: 'Donate black-white blanket to sadhu; feed dogs' },
  { verdict: 'troubling',  effect: 'Sudden financial loss, family dispute over speech',                            upay: 'Donate silver coin with hole; recite Ganesh mantra 11x daily' },
  { verdict: 'auspicious', effect: 'Brave siblings, gain via brothers, occult / yoga interest',                    upay: 'Pierce ear (men); feed brown dog with sweet roti' },
  { verdict: 'troubling',  effect: 'Home unrest, mother distant, sudden displacement',                             upay: 'Worship Ganesh + Bhairava; donate sesame oil at Bhairav temple' },
  { verdict: 'troubling',  effect: 'No / few children, son trouble, miscarriage, child health concerns',           upay: 'Offer durva grass + modak to Ganesh daily; feed dogs roti' },
  { verdict: 'auspicious', effect: 'Hidden victory over enemies, occult powers',                                   upay: 'Donate to Bhairav temple; recite Ketu beej mantra Tuesday night' },
  { verdict: 'troubling',  effect: 'Marriage detachment, spouse health, unusual partner type',                     upay: 'Worship Ardhanareeshwar form; donate to ashram before marriage' },
  { verdict: 'troubling',  effect: 'Sudden longevity threat, accidents, skin / spinal injury',                     upay: 'Recite Mrityunjaya 108x; donate brown blanket Saturday' },
  { verdict: 'auspicious', effect: 'Moksha indicator, spiritual fortune, foreign pilgrimage',                      upay: 'Visit Char Dham / Jyotirlinga; meditate daily' },
  { verdict: 'neutral',    effect: 'Career in occult / research / spiritual / pharma / hidden fields',             upay: 'Donate research books / mantras; wear cat-eye (Lehsunia)' },
  { verdict: 'auspicious', effect: 'Spiritual gains, sudden inheritance, foreign income via NGO / spirit',         upay: 'Donate to ashram Saturday; wear cat-eye in silver' },
  { verdict: 'auspicious', effect: 'Moksha at end of life, retreat to ashram, foreign moksha-yatra',               upay: 'Worship Ganesh daily; visit Kashi / Rameshwaram once in life' },
 ],
};

export function getHouseEffects(graha: GrahaCode): HouseEffect[] {
 return RAW_EFFECTS[graha].map((r, idx) => ({
  house: idx + 1,
  sanskrit: houseLabel(idx + 1),
  verdict: r.verdict,
  effect: r.effect,
  upay: r.upay,
 }));
}

export function getGraha(code: GrahaCode): Graha {
 const g = GRAHAS.find((x) => x.code === code);
 if (!g) throw new Error('Unknown graha: ' + code);
 return g;
}

export function getProblem(value: LifeProblem): ProblemDef {
 const p = PROBLEMS.find((x) => x.value === value);
 if (!p) throw new Error('Unknown problem: ' + value);
 return p;
}

export type ProblemResult = {
 problem: ProblemDef;
 grahas: Array<{ graha: Graha; troublingHouses: HouseEffect[] }>;
};

export function diagnoseByProblem(value: LifeProblem): ProblemResult {
 const problem = getProblem(value);
 return {
  problem,
  grahas: problem.grahas.map((code) => {
   const graha = getGraha(code);
   const troublingHouses = getHouseEffects(code).filter((h) => h.verdict === 'troubling');
   return { graha, troublingHouses };
  }),
 };
}
