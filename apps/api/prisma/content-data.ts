/**
 * Complete devotional content data for Darshya.
 * Each item has full body text in Hindi/Sanskrit with English transliteration,
 * proper deity attribution, duration, and tags.
 *
 * Audio URLs: We use placeholder URLs that the AudioPlayer handles gracefully
 * by showing "Audio coming soon" when the URL is null or unreachable.
 * When real audio hosting is set up, replace these with actual CDN URLs.
 */

export const contentData = [
  // ─── AARTIS ────────────────────────────────────────────────────────────────

  {
    type: 'aarti' as const,
    title: 'Om Jai Jagdish Hare',
    titleLocal: 'ॐ जय जगदीश हरे',
    slug: 'om-jai-jagdish-hare-aarti',
    body: `## ॐ जय जगदीश हरे (Om Jai Jagdish Hare)

### हिन्दी (Hindi)

ॐ जय जगदीश हरे, स्वामी जय जगदीश हरे ।
भक्त जनों के संकट, दास जनों के संकट,
क्षण में दूर करे ॥ ॐ जय जगदीश हरे ॥

जो ध्यावे फल पावे, दुख बिनसे मन का,
स्वामी दुख बिनसे मन का ।
सुख संपत्ति घर आवे, सुख संपत्ति घर आवे,
कष्ट मिटे तन का ॥ ॐ जय जगदीश हरे ॥

मात पिता तुम मेरे, शरण गहूँ मैं किसकी,
स्वामी शरण गहूँ मैं किसकी ।
तुम बिन और न दूजा, तुम बिन और न दूजा,
आस करूँ मैं जिसकी ॥ ॐ जय जगदीश हरे ॥

तुम पूरण परमात्मा, तुम अंतर्यामी,
स्वामी तुम अंतर्यामी ।
पारब्रह्म परमेश्वर, पारब्रह्म परमेश्वर,
तुम सबके स्वामी ॥ ॐ जय जगदीश हरे ॥

तुम करुणा के सागर, तुम पालनकर्ता,
स्वामी तुम पालनकर्ता ।
मैं मूरख खल कामी, मैं सेवक तुम स्वामी,
कृपा करो भर्ता ॥ ॐ जय जगदीश हरे ॥

तुम हो एक अगोचर, सबके प्राणपति,
स्वामी सबके प्राणपति ।
किस विध मिलूँ दयामय, किस विध मिलूँ दयामय,
तुमको मैं कुमति ॥ ॐ जय जगदीश हरे ॥

दीनबंधु दुखहर्ता, ठाकुर तुम मेरे,
स्वामी ठाकुर तुम मेरे ।
अपने हाथ उठाओ, अपने शरण लगाओ,
द्वार पड़ा तेरे ॥ ॐ जय जगदीश हरे ॥

विषय विकार मिटाओ, पाप हरो देवा,
स्वामी पाप हरो देवा ।
श्रद्धा भक्ति बढ़ाओ, श्रद्धा भक्ति बढ़ाओ,
संतन की सेवा ॥ ॐ जय जगदीश हरे ॥

### Transliteration

Om Jai Jagdish Hare, Swami Jai Jagdish Hare,
Bhakt janon ke sankat, daas janon ke sankat,
Kshan mein door kare. Om Jai Jagdish Hare.

Jo dhyaave phal paave, dukh binse man ka,
Swami dukh binse man ka.
Sukh sampatti ghar aave, sukh sampatti ghar aave,
Kasht mite tan ka. Om Jai Jagdish Hare.

Maat pita tum mere, sharan gahun main kiski,
Swami sharan gahun main kiski.
Tum bin aur na dooja, tum bin aur na dooja,
Aas karun main jiski. Om Jai Jagdish Hare.

Tum puran paramatma, tum antaryami,
Swami tum antaryami.
Parabrahm Parameshwar, Parabrahm Parameshwar,
Tum sabke swami. Om Jai Jagdish Hare.

Tum karuna ke sagar, tum palankarta,
Swami tum palankarta.
Main moorakh khal kami, main sevak tum swami,
Kripa karo bharta. Om Jai Jagdish Hare.

Tum ho ek agochar, sabke praanpati,
Swami sabke praanpati.
Kis vidh milun dayamay, kis vidh milun dayamay,
Tumko main kumati. Om Jai Jagdish Hare.

Deenbandhu dukhharta, Thakur tum mere,
Swami Thakur tum mere.
Apne haath uthao, apne sharan lagao,
Dwaar pada tere. Om Jai Jagdish Hare.

Vishay vikaar mitao, paap haro deva,
Swami paap haro deva.
Shraddha bhakti badhao, shraddha bhakti badhao,
Santan ki seva. Om Jai Jagdish Hare.

---
*This universal aarti is sung during evening prayers (Sandhya Aarti) across all Hindu traditions. Composed by Pandit Shardha Ram Phillauri in 1870.*`,
    deity: 'Lord Vishnu',
    language: 'hi' as const,
    durationSeconds: 378,
    tags: ['aarti', 'vishnu', 'evening', 'universal', 'sandhya'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/om-jai-jagdish.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=3ucCEjXS9n8',
    sortOrder: 1,
  },

  {
    type: 'aarti' as const,
    title: 'Aarti Kunj Bihari Ki',
    titleLocal: 'आरती कुंजबिहारी की',
    slug: 'aarti-kunj-bihari-ki',
    body: `## आरती कुंजबिहारी की (Aarti Kunj Bihari Ki)

### हिन्दी (Hindi)

आरती कुंजबिहारी की,
श्री गिरिधर कृष्ण मुरारी की ॥

गले में बैजंती माला, बजावे मुरली मधुर बाला ।
श्रवन में कुंडल झलकाला, नन्द के आनन्द नंदलाला ।
गगन सम अंग कांति काली, राधिका चमक रही आली ।
लतन में ठाढ़े बनमाली ॥ आरती कुंजबिहारी की ॥

कनकमय मोर मुकुट बिलसे, देवता दर्शन को तरसे ।
गगन सों सुमन रासि बरसे ।
हाथन में वेणु विराजे, और रसिकन की मन धुन पे साजे ।
मोर मुकुट शिर पर रहत राजे ॥ आरती कुंजबिहारी की ॥

जहाँ ते प्रगट भई गंगा, सकल मन हारिणि श्री गंगा ।
हरि चरणन अरविंद की गंगा ।
कहत राम प्रसाद की गंगा, निशदिन भाव से गावे गंगा ।
खेलत हैं अपने रंग रलियन में ॥ आरती कुंजबिहारी की ॥

### Transliteration

Aarti Kunj Bihari Ki,
Shri Giridhar Krishna Murari Ki.

Gale mein Baijanti Mala, bajave Murli madhur bala.
Shravan mein Kundal jhalakala, Nand ke Anand Nandlala.
Gagan sam ang kanti kali, Radhika chamak rahi aali.
Latan mein thaade Banmali. Aarti Kunj Bihari Ki.

Kanakmay Mor Mukut bilse, devta darshan ko tarse.
Gagan son suman raasi barse.
Hathan mein Venu viraje, aur rasikan ki man dhun pe saje.
Mor Mukut shir par rahat raje. Aarti Kunj Bihari Ki.

---
*This aarti is dedicated to Lord Krishna as Kunj Bihari — the one who plays in the groves of Vrindavan.*`,
    deity: 'Lord Krishna',
    language: 'hi' as const,
    durationSeconds: 328,
    tags: ['aarti', 'krishna', 'evening', 'vrindavan'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/aarti-kunj-bihari.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=EMO1AT1UQf0',
    sortOrder: 2,
  },

  {
    type: 'aarti' as const,
    title: 'Ganesh Aarti - Jai Ganesh Deva',
    titleLocal: 'जय गणेश जय गणेश देवा',
    slug: 'jai-ganesh-deva-aarti',
    body: `## जय गणेश जय गणेश देवा (Jai Ganesh Deva)

### हिन्दी (Hindi)

जय गणेश जय गणेश जय गणेश देवा ।
माता जाकी पार्वती पिता महादेवा ॥ जय गणेश ॥

एक दंत दयावंत, चार भुजा धारी ।
माथे सिंदूर सोहे, मूसे की सवारी ॥ जय गणेश ॥

पान चढ़े फूल चढ़े, और चढ़े मेवा ।
लड्डुअन का भोग लगे, संत करें सेवा ॥ जय गणेश ॥

अंधन को आँख देत, कोढ़िन को काया ।
बांझन को पुत्र देत, निर्धन को माया ॥ जय गणेश ॥

'सूर' श्याम शरण आये, सफल कीजे सेवा ।
माता जाकी पार्वती, पिता महादेवा ॥ जय गणेश ॥

दीनन की लाज रखो, शम्भु सुतवारी ।
कामना को पूर्ण करो, जग बलिहारी ॥ जय गणेश ॥

### Transliteration

Jai Ganesh Jai Ganesh Jai Ganesh Deva,
Mata Jaki Parvati, Pita Mahadeva. Jai Ganesh.

Ek dant dayavant, char bhuja dhari,
Mathe sindoor sohe, moose ki sawari. Jai Ganesh.

Paan chadhe phool chadhe, aur chadhe mewa,
Ladduan ka bhog lage, sant kare seva. Jai Ganesh.

Andhan ko aankh det, kodhin ko kaya,
Baanjhan ko putra det, nirdhan ko maya. Jai Ganesh.

'Soor' Shyam sharan aaye, safal kije seva,
Mata Jaki Parvati, Pita Mahadeva. Jai Ganesh.

Deenan ki laaj rakho, Shambhu sutvari,
Kamna ko poorn karo, jag balihari. Jai Ganesh.

---
*This is the most popular Ganesh Aarti, sung at the beginning of any prayer or puja ceremony. Lord Ganesha is the remover of obstacles and the god of new beginnings.*`,
    deity: 'Lord Ganesha',
    language: 'hi' as const,
    durationSeconds: 310,
    tags: ['aarti', 'ganesha', 'evening', 'universal', 'wednesday'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/ganesh-aarti.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=Yuex2EnsGiY',
    sortOrder: 3,
  },

  {
    type: 'aarti' as const,
    title: 'Om Jai Shiv Omkara - Shiv Aarti',
    titleLocal: 'ॐ जय शिव ओमकारा',
    slug: 'om-jai-shiv-omkara-aarti',
    body: `## ॐ जय शिव ओमकारा (Om Jai Shiv Omkara)

### हिन्दी (Hindi)

ॐ जय शिव ओमकारा, स्वामी जय शिव ओमकारा ।
ब्रह्मा विष्णु सदाशिव, अर्द्धांगी धारा ॥ ॐ जय शिव ओमकारा ॥

एकानन चतुरानन पंचानन राजे ।
हंसानन गरुड़ासन वृषवाहन साजे ॥ ॐ जय शिव ओमकारा ॥

दो भुज चार चतुर्भुज दश भुज अति सोहे ।
तीनों रूप निरखता त्रिभुवन जन मोहे ॥ ॐ जय शिव ओमकारा ॥

अक्षमाला वनमाला मुंडमाला धारी ।
त्रिपुरारी कंसारी कर माला धारी ॥ ॐ जय शिव ओमकारा ॥

श्वेताम्बर पीताम्बर बाघम्बर अंगे ।
सनकादिक गरुणादिक भूतादिक संगे ॥ ॐ जय शिव ओमकारा ॥

कर मध्ये कमंडलु चक्र त्रिशूल धारी ।
सुखकारी दुखहारी जगपालन करता ॥ ॐ जय शिव ओमकारा ॥

ब्रह्मा विष्णु सदाशिव जानत अविवेका ।
प्रणवाक्षर मध्ये ये तीनों एका ॥ ॐ जय शिव ओमकारा ॥

त्रिगुण शिवजी की आरती जो कोई नर गावे ।
कहत शिवानंद स्वामी मनवांछित फल पावे ॥ ॐ जय शिव ओमकारा ॥

### Transliteration

Om Jai Shiv Omkara, Swami Jai Shiv Omkara,
Brahma Vishnu Sadashiv, Ardhangi Dhara. Om Jai Shiv Omkara.

Ekanana Chaturanana Panchanana Raje,
Hansasana Garudasana Vrishavahana Saje. Om Jai Shiv Omkara.

Do bhuja char chaturbhuj das bhuj ati sohe,
Teeno roop nirakhata tribhuvan jan mohe. Om Jai Shiv Omkara.

Akshmala vanmala mundmala dhari,
Tripurari Kansari kar mala dhari. Om Jai Shiv Omkara.

---
*This aarti is dedicated to Lord Shiva (Omkara), describing the trinity of Brahma, Vishnu, and Shiva. Best recited on Mondays and during Pradosh Kaal.*`,
    deity: 'Lord Shiva',
    language: 'hi' as const,
    durationSeconds: 300,
    tags: ['aarti', 'shiva', 'evening', 'mahadev', 'monday'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/shiv-aarti.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=BhwOproElxU',
    sortOrder: 4,
  },

  {
    type: 'aarti' as const,
    title: 'Om Jai Lakshmi Mata - Lakshmi Aarti',
    titleLocal: 'ॐ जय लक्ष्मी माता',
    slug: 'om-jai-lakshmi-mata-aarti',
    body: `## ॐ जय लक्ष्मी माता (Om Jai Lakshmi Mata)

### हिन्दी (Hindi)

ॐ जय लक्ष्मी माता, मैया जय लक्ष्मी माता ।
तुमको निशदिन सेवत, हरि विष्णु विधाता ॥ ॐ जय लक्ष्मी माता ॥

उमा रमा ब्रह्माणी, तुम ही जग माता ।
सूर्य चन्द्रमा ध्यावत, नारद ऋषि गाता ॥ ॐ जय लक्ष्मी माता ॥

दुर्गा रूप निरंजनी, सुख सम्पत्ति दाता ।
जो कोई तुमको ध्यावे, ऋद्धि सिद्धि धन पाता ॥ ॐ जय लक्ष्मी माता ॥

तुम ही पाताल निवासिनी, तुम ही शुभ दाता ।
कर्म प्रभाव प्रकाशिनी, भवनिधि की त्राता ॥ ॐ जय लक्ष्मी माता ॥

जिस घर में तुम रहती, सब सद्गुण आता ।
सब संभव हो जाता, मन नहीं घबराता ॥ ॐ जय लक्ष्मी माता ॥

तुम बिन यज्ञ न होते, वस्त्र न कोई पाता ।
खान पान का वैभव, सब तुमसे आता ॥ ॐ जय लक्ष्मी माता ॥

शुभ गुण मंदिर सुंदर, क्षीरोदधि जाता ।
रत्न चतुर्दश तुम बिन, कोई नहीं पाता ॥ ॐ जय लक्ष्मी माता ॥

महालक्ष्मीजी की आरती, जो कोई जन गाता ।
उर आनन्द समाता, पाप उतर जाता ॥ ॐ जय लक्ष्मी माता ॥

### Transliteration

Om Jai Lakshmi Mata, Maiya Jai Lakshmi Mata,
Tumko nishdin sevat, Hari Vishnu Vidhata. Om Jai Lakshmi Mata.

Uma Rama Brahmani, tum hi jag mata,
Surya Chandrama dhyavat, Narad Rishi gata. Om Jai Lakshmi Mata.

Durga roop niranjani, sukh sampatti data,
Jo koi tumko dhyave, riddhi siddhi dhan pata. Om Jai Lakshmi Mata.

Tum hi Patal nivasini, tum hi shubh data,
Karm prabhav prakashini, bhavnidhi ki trata. Om Jai Lakshmi Mata.

Jis ghar mein tum rehti, sab sadgun aata,
Sab sambhav ho jata, man nahin ghabrata. Om Jai Lakshmi Mata.

---
*This aarti is dedicated to Goddess Lakshmi, the goddess of wealth, fortune, and prosperity. Best recited on Fridays, during Diwali, and Lakshmi Puja.*`,
    deity: 'Goddess Lakshmi',
    language: 'hi' as const,
    durationSeconds: 280,
    tags: ['aarti', 'lakshmi', 'evening', 'diwali', 'prosperity', 'friday'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/lakshmi-aarti.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=oec7CXRAfeE',
    sortOrder: 5,
  },

  // ─── CHALISAS ──────────────────────────────────────────────────────────────

  {
    type: 'chalisa' as const,
    title: 'Hanuman Chalisa',
    titleLocal: 'हनुमान चालीसा',
    slug: 'hanuman-chalisa',
    body: `## हनुमान चालीसा (Hanuman Chalisa)
*श्री गोस्वामी तुलसीदास जी द्वारा रचित (By Goswami Tulsidas)*

### दोहा (Doha)

**श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि ।
बरनउँ रघुबर बिमल जसु, जो दायकु फल चारि ॥**

*Shri Guru Charan Saroj Raj, Nij Manu Mukuru Sudhari,
Barnau Raghubar Bimal Jasu, Jo Dayaku Phal Chari.*

**बुद्धिहीन तनु जानिके, सुमिरौं पवन-कुमार ।
बल बुद्धि विद्या देहु मोहिं, हरहु कलेस विकार ॥**

*Buddhiheen Tanu Janike, Sumirau Pavan Kumar,
Bal Buddhi Vidya Dehu Mohi, Harahu Kalesh Vikar.*

### चौपाई (Chaupai)

**जय हनुमान ज्ञान गुन सागर । जय कपीस तिहुँ लोक उजागर ॥१॥**
*Jai Hanuman Gyan Gun Sagar. Jai Kapis Tihun Lok Ujagar.*

**राम दूत अतुलित बल धामा । अंजनि-पुत्र पवनसुत नामा ॥२॥**
*Ram Doot Atulit Bal Dhama. Anjani Putra Pavansut Nama.*

**महाबीर बिक्रम बजरंगी । कुमति निवार सुमति के संगी ॥३॥**
*Mahabir Bikram Bajrangi. Kumati Nivar Sumati Ke Sangi.*

**कंचन बरन बिराज सुबेसा । कानन कुंडल कुंचित केसा ॥४॥**
*Kanchan Baran Biraj Subesa. Kanan Kundal Kunchit Kesa.*

**हाथ बज्र औ ध्वजा बिराजे । काँधे मूँज जनेऊ साजे ॥५॥**
*Hath Bajra Au Dhwaja Biraje. Kandhe Moonj Janeu Saje.*

**शंकर सुवन केसरीनंदन । तेज प्रताप महा जग बन्दन ॥६॥**
*Shankar Suvan Kesarinandan. Tej Pratap Maha Jag Bandan.*

**विद्यावान गुनी अति चातुर । राम काज करिबे को आतुर ॥७॥**
*Vidyavan Guni Ati Chatur. Ram Kaj Karibe Ko Atur.*

**प्रभु चरित्र सुनिबे को रसिया । राम लखन सीता मन बसिया ॥८॥**
*Prabhu Charitra Sunibe Ko Rasiya. Ram Lakhan Sita Man Basiya.*

**सूक्ष्म रूप धरि सियहिं दिखावा । बिकट रूप धरि लंक जरावा ॥९॥**
*Sukshma Roop Dhari Siyahi Dikhava. Bikat Roop Dhari Lanka Jarava.*

**भीम रूप धरि असुर सँहारे । रामचंद्र के काज सँवारे ॥१०॥**
*Bheem Roop Dhari Asur Sanhare. Ramchandra Ke Kaj Sanvare.*

**लाय सजीवन लखन जियाये । श्रीरघुबीर हरषि उर लाये ॥११॥**
*Lay Sajivan Lakhan Jiyaye. Shri Raghubir Harashi Ur Laye.*

**रघुपति कीन्ही बहुत बड़ाई । तुम मम प्रिय भरतहि सम भाई ॥१२॥**
*Raghupati Kinhi Bahut Badai. Tum Mam Priya Bharatahi Sam Bhai.*

**सहस बदन तुम्हरो जस गावैं । अस कहि श्रीपति कंठ लगावैं ॥१३॥**
*Sahas Badan Tumhro Jas Gavain. As Kahi Shripati Kanth Lagavain.*

**सनकादिक ब्रह्मादि मुनीसा । नारद सारद सहित अहीसा ॥१४॥**
*Sanakadik Brahmadi Munisa. Narad Sharad Sahit Ahisa.*

**जम कुबेर दिगपाल जहाँ ते । कवि कोविद कहि सके कहाँ ते ॥१५॥**
*Jam Kuber Digpal Jahan Te. Kavi Kovid Kahi Sake Kahan Te.*

**तुम उपकार सुग्रीवहिं कीन्हा । राम मिलाय राजपद दीन्हा ॥१६॥**
*Tum Upkar Sugrivahi Kinha. Ram Milay Rajpad Dinha.*

**तुम्हरो मंत्र विभीषन माना । लंकेश्वर भए सब जग जाना ॥१७॥**
*Tumhro Mantra Vibhishan Mana. Lankeshwar Bhaye Sab Jag Jana.*

**जुग सहस्र जोजन पर भानू । लील्यो ताहि मधुर फल जानू ॥१८॥**
*Jug Sahasra Jojan Par Bhanu. Lilyo Tahi Madhur Phal Janu.*

**प्रभु मुद्रिका मेलि मुख माहीं । जलधि लांघि गये अचरज नाहीं ॥१९॥**
*Prabhu Mudrika Meli Mukh Mahin. Jaladhi Langhi Gaye Acharaj Nahin.*

**दुर्गम काज जगत के जेते । सुगम अनुग्रह तुम्हरे तेते ॥२०॥**
*Durgam Kaj Jagat Ke Jete. Sugam Anugrah Tumhre Tete.*

**राम दुआरे तुम रखवारे । होत न आज्ञा बिनु पैसारे ॥२१॥**
*Ram Duare Tum Rakhvare. Hot Na Aagya Binu Paisare.*

**सब सुख लहै तुम्हारी सरना । तुम रक्षक काहू को डर ना ॥२२॥**
*Sab Sukh Lahai Tumhari Sarna. Tum Rakshak Kahu Ko Dar Na.*

**आपन तेज सम्हारो आपै । तीनों लोक हांक तें कांपै ॥२३॥**
*Aapan Tej Samharo Aapai. Teenon Lok Hank Te Kanpai.*

**भूत पिसाच निकट नहिं आवै । महाबीर जब नाम सुनावै ॥२४॥**
*Bhoot Pisach Nikat Nahi Aavai. Mahabir Jab Naam Sunavai.*

**नासै रोग हरै सब पीरा । जपत निरंतर हनुमत बीरा ॥२५॥**
*Nasai Rog Harai Sab Peera. Japat Nirantar Hanumat Beera.*

**संकट तें हनुमान छुड़ावै । मन क्रम बचन ध्यान जो लावै ॥२६॥**
*Sankat Te Hanuman Chhudavai. Man Kram Bachan Dhyan Jo Lavai.*

**सब पर राम तपस्वी राजा । तिन के काज सकल तुम साजा ॥२७॥**
*Sab Par Ram Tapasvi Raja. Tin Ke Kaj Sakal Tum Saja.*

**और मनोरथ जो कोई लावै । सोइ अमित जीवन फल पावै ॥२८॥**
*Aur Manorath Jo Koi Lavai. Soi Amit Jeevan Phal Pavai.*

**चारों जुग परताप तुम्हारा । है परसिद्ध जगत उजियारा ॥२९॥**
*Charon Jug Partap Tumhara. Hai Parsiddh Jagat Ujiyara.*

**साधु संत के तुम रखवारे । असुर निकंदन राम दुलारे ॥३०॥**
*Sadhu Sant Ke Tum Rakhvare. Asur Nikandan Ram Dulare.*

**अष्ट सिद्धि नौ निधि के दाता । अस बर दीन जानकी माता ॥३१॥**
*Ashta Siddhi Nau Nidhi Ke Data. As Bar Deen Janaki Mata.*

**राम रसायन तुम्हरे पासा । सदा रहो रघुपति के दासा ॥३२॥**
*Ram Rasayan Tumhre Pasa. Sada Raho Raghupati Ke Dasa.*

**तुम्हरे भजन राम को पावै । जनम जनम के दुख बिसरावै ॥३३॥**
*Tumhre Bhajan Ram Ko Pavai. Janam Janam Ke Dukh Bisravai.*

**अंत काल रघुबर पुर जाई । जहाँ जन्म हरि-भक्त कहाई ॥३४॥**
*Ant Kaal Raghubar Pur Jai. Jahan Janma Hari Bhakt Kahai.*

**और देवता चित्त न धरई । हनुमत सेइ सर्ब सुख करई ॥३५॥**
*Aur Devta Chitt Na Dharai. Hanumat Sei Sarb Sukh Karai.*

**संकट कटै मिटै सब पीरा । जो सुमिरै हनुमत बलबीरा ॥३६॥**
*Sankat Katai Mitai Sab Peera. Jo Sumirai Hanumat Balbeera.*

**जय जय जय हनुमान गोसाईं । कृपा करहु गुरुदेव की नाईं ॥३७॥**
*Jai Jai Jai Hanuman Gosain. Kripa Karahu Gurudev Ki Nain.*

**जो सत बार पाठ कर कोई । छूटहि बंदि महा सुख होई ॥३८॥**
*Jo Sat Bar Path Kar Koi. Chhutahi Bandi Maha Sukh Hoi.*

**जो यह पढ़ै हनुमान चालीसा । होय सिद्धि साखी गौरीसा ॥३९॥**
*Jo Yeh Padhai Hanuman Chalisa. Hoy Siddhi Sakhi Gaurisa.*

**तुलसीदास सदा हरि चेरा । कीजै नाथ हृदय महँ डेरा ॥४०॥**
*Tulsidas Sada Hari Chera. Kijai Nath Hriday Mah Dera.*

### दोहा (Concluding Doha)

**पवन तनय संकट हरन, मंगल मूरति रूप ।
राम लखन सीता सहित, हृदय बसहु सुर भूप ॥**

*Pavan Tanay Sankat Haran, Mangal Moorti Roop.
Ram Lakhan Sita Sahit, Hriday Basahu Sur Bhoop.*

---
*The Hanuman Chalisa, composed by Goswami Tulsidas in the 16th century, is the most widely recited Hindu devotional hymn. It contains 40 verses (chaupais) praising Lord Hanuman. Best recited on Tuesdays and Saturdays.*`,
    deity: 'Lord Hanuman',
    language: 'hi' as const,
    durationSeconds: 582,
    tags: ['chalisa', 'hanuman', 'tuesday', 'saturday', 'protection', 'tulsidas'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/hanuman-chalisa.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=AETFvQonfV8',
    sortOrder: 10,
  },

  {
    type: 'chalisa' as const,
    title: 'Shiv Chalisa',
    titleLocal: 'शिव चालीसा',
    slug: 'shiv-chalisa',
    body: `## शिव चालीसा (Shiv Chalisa)

### दोहा (Doha)

**जय गणेश गिरिजा सुवन, मंगल मूल सुजान ।
कहत अयोध्यादास तुम, देहु अभय वरदान ॥**

*Jai Ganesh Girija Suvan, Mangal Mool Sujan,
Kahat Ayodhyadas Tum, Dehu Abhay Vardaan.*

### चौपाई (Chaupai)

**जय गिरिजा पति दीनदयाला । सदा करत संतन प्रतिपाला ॥१॥**
*Jai Girija Pati Deendayala. Sada Karat Santan Pratipala.*

**भाल चंद्रमा सोहत नीके । कानन कुंडल नागफनी के ॥२॥**
*Bhal Chandrama Sohat Nike. Kanan Kundal Nagphani Ke.*

**अंग गौर शिर गंग बहाये । मुंडमाल तन छार लगाये ॥३॥**
*Ang Gaur Shir Gang Bahaye. Mundmal Tan Chhar Lagaye.*

**वस्त्र खाल बाघम्बर सोहे । छवि को देख नाग मुनि मोहे ॥४॥**
*Vastra Khal Baghambhar Sohe. Chhavi Ko Dekh Nag Muni Mohe.*

**मैना मातु की हवे दुलारी । बाम अंग सोहत छवि न्यारी ॥५॥**
*Maina Matu Ki Have Dulari. Baam Ang Sohat Chhavi Nyari.*

**कर त्रिशूल सोहत छवि भारी । करत सदा शत्रुन क्षयकारी ॥६॥**
*Kar Trishul Sohat Chhavi Bhari. Karat Sada Shatrun Kshayakari.*

**नंदि गणेश सोहैं तहँ कैसे । सागर मध्य कमल हैं जैसे ॥७॥**
*Nandi Ganesh Sohain Tahan Kaise. Sagar Madhya Kamal Hain Jaise.*

**कार्तिक श्याम और गणराऊ । या छवि को कहि जात न काऊ ॥८॥**
*Kartik Shyam Aur Ganrau. Ya Chhavi Ko Kahi Jaat Na Kau.*

**देवन जबहीं जाय पुकारा । तबहीं दुख प्रभु आप निवारा ॥९॥**
*Devan Jabhi Jaay Pukara. Tabhi Dukh Prabhu Aap Nivara.*

**किया उपद्रव तारक भारी । देवन सब मिलि तुमहिं जुहारी ॥१०॥**
*Kiya Upadrav Tarak Bhari. Devan Sab Mili Tumhin Juhari.*

**तुरत षडानन आप पठायऊ । लवनिमेष महँ मारि गिरायऊ ॥११॥**
*Turat Shadanan Aap Pathayau. Lav-Nimesh Mahan Maari Girayau.*

**आप जलंधर असुर संहारा । सुयश तुम्हार विदित संसारा ॥१२॥**
*Aap Jalandhar Asur Sanhara. Suyash Tumhar Vidit Sansara.*

**त्रिपुरासुर सन युद्ध मचाई । सबहिं कृपा करि लीन बचाई ॥१३॥**
*Tripurasur San Yuddh Machai. Sabhi Kripa Kari Leen Bachai.*

**किया तपहिं भागीरथ भारी । पुरब प्रतिज्ञा तासु पुरारी ॥१४॥**
*Kiya Taphi Bhagirath Bhari. Purab Pratigya Tasu Purari.*

**दानिन महँ तुम सम कोउ नाहीं । सेवक स्तुति करत सदाहीं ॥१५॥**
*Danin Mahan Tum Sam Kou Nahin. Sevak Stuti Karat Sadahin.*

**वेद नाम महिमा तब गाई । अकथ अनादि भेद नहिं पाई ॥१६॥**
*Ved Naam Mahima Tab Gai. Akath Anadi Bhed Nahin Pai.*

**प्रगट उदधि मंथन में ज्वाला । जरत सुरासुर भए विहाला ॥१७॥**
*Pragat Udadhi Manthan Mein Jwala. Jarat Surasur Bhaye Vihala.*

**कीन्ह दया तहँ करी सहाई । नीलकंठ तब नाम कहाई ॥१८॥**
*Kinh Daya Tahan Kari Sahai. Neelkanth Tab Naam Kahai.*

**पूजन रामचंद्र जब कीन्हा । जीत के लंक विभीषण दीन्हा ॥१९॥**
*Pujan Ramchandra Jab Kinha. Jeet Ke Lanka Vibhishan Dinha.*

**सहस कमल में हो रहे धारी । कीन्ह परीक्षा तबहिं पुरारी ॥२०॥**
*Sahas Kamal Mein Ho Rahe Dhari. Kinh Pariksha Tabhi Purari.*

**एक कमल प्रभु राखेउ जोई । कमल नयन पूजन चहँ सोई ॥२१॥**
*Ek Kamal Prabhu Rakheu Joi. Kamal Nayan Pujan Chahan Soi.*

**कठिन भक्ति देखी प्रभु शंकर । भये प्रसन्न दिए इच्छित वर ॥२२॥**
*Kathin Bhakti Dekhi Prabhu Shankar. Bhaye Prasann Diye Ichchhit Var.*

**जय जय जय अनंत अविनाशी । करत कृपा सब के घट वासी ॥२३॥**
*Jai Jai Jai Anant Avinashi. Karat Kripa Sab Ke Ghat Vasi.*

**दुष्ट सकल मोहि नित सतावैं । भ्रमत रहौं मोहि चैन न आवैं ॥२४॥**
*Dusht Sakal Mohi Nit Satavain. Bhramat Rahaun Mohi Chain Na Aavain.*

**त्राहि त्राहि मैं नाथ पुकारो । यहि अवसर मोहि आन उबारो ॥२५॥**
*Trahi Trahi Main Nath Pukaro. Yahi Avasar Mohi Aan Ubaro.*

**लै त्रिशूल शत्रुन को मारो । संकट से मोहि आन उबारो ॥२६॥**
*Lai Trishul Shatrun Ko Maro. Sankat Se Mohi Aan Ubaro.*

**माता पिता न भाई बंधु कोई । स्वामी बिना मोय कोउ न होई ॥२७॥**
*Mata Pita Na Bhai Bandhu Koi. Swami Bina Moy Kou Na Hoi.*

**स्वामी तुम्हारा बालक भोला । कहै शिवानंद गुरु देव दोला ॥२८॥**
*Swami Tumhara Balak Bhola. Kahai Shivanand Guru Dev Dola.*

**चंद्र छबि मुख निर्मल नैना । जटा मुकुट शिर सोहैं स्वैना ॥२९॥**
*Chandra Chhabi Mukh Nirmal Naina. Jata Mukut Shir Sohain Swaina.*

**कंठ कुंडली सर्प लपेटा । कर दमरू कमंडलु कैसा ॥३०॥**
*Kanth Kundali Sarp Lapeta. Kar Damru Kamandalu Kaisa.*

**सदा विराजे श्मशान विहारी । सुर असुर आवत जटधारी ॥३१॥**
*Sada Viraje Shmashan Vihari. Sur Asur Aavat Jatadhari.*

**रावण जबहिं तपहिं कर भारी । देवन काज कियो त्रिपुरारी ॥३२॥**
*Ravan Jabhi Taphi Kar Bhari. Devan Kaj Kiyo Tripurari.*

**जब जब जग में धर्म की हानी । तब तब शक्ति धरो भगवानी ॥३३॥**
*Jab Jab Jag Mein Dharm Ki Hani. Tab Tab Shakti Dharo Bhagvani.*

**नित नेम करि प्रातः ही, पाठ करौं चालीसा ।
तुम मेरी मनोकामना, पूर्ण करो जगदीशा ॥३४॥**
*Nit Nem Kari Pratah Hi, Path Karaun Chalisa.
Tum Meri Manokamna, Poorn Karo Jagdisha.*

**मग्न भये रस इसमें शंकर, जो पढ़े शिव चालीसा ।
होय शिवजी की कृपा, नित उतरे बीसा ॥**

### दोहा (Concluding Doha)

**नित नेम करि प्रातः ही, पाठ करौं चालीसा ।
तुम मेरी मनोकामना, पूर्ण करो जगदीशा ॥**

*Nit Nem Kari Pratah Hi, Path Karun Chalisa.
Tum Meri Manokamna, Poorn Karo Jagdisha.*

---
*The Shiv Chalisa is a devotional hymn dedicated to Lord Shiva. Best recited on Mondays and during Shravan month.*`,
    deity: 'Lord Shiva',
    language: 'hi' as const,
    durationSeconds: 540,
    tags: ['chalisa', 'shiva', 'monday', 'mahadev', 'shravan'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/shiv-chalisa.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=kYFriF5zHMM',
    sortOrder: 11,
  },

  {
    type: 'chalisa' as const,
    title: 'Durga Chalisa',
    titleLocal: 'दुर्गा चालीसा',
    slug: 'durga-chalisa',
    body: `## दुर्गा चालीसा (Durga Chalisa)

### दोहा (Doha)

**नमो नमो दुर्गे सुख करनी । नमो नमो अम्बे दुख हरनी ॥**

*Namo Namo Durge Sukh Karni. Namo Namo Ambe Dukh Harni.*

### चौपाई (Chaupai)

**निरंकार है ज्योति तुम्हारी । तिहूँ लोक फैली उजियारी ॥१॥**
*Nirankar Hai Jyoti Tumhari. Tihun Lok Phaili Ujiyari.*

**शशि ललाट मुख महाविशाला । नेत्र लाल भृकुटि विकराला ॥२॥**
*Shashi Lalat Mukh Mahavishala. Netra Lal Bhrikuti Vikrala.*

**रूप मातु को अधिक सुहावे । दरश करत जन अति सुख पावे ॥३॥**
*Roop Matu Ko Adhik Suhave. Darash Karat Jan Ati Sukh Pave.*

**तुम संसार शक्ति लय कीना । तिहूँ लोक में तू ही है बीना ॥४॥**
*Tum Sansar Shakti Lay Kina. Tihun Lok Mein Tu Hi Hai Bina.*

**तुम्हीं जगतमाता विश्वधात्री । तुम्हीं सकल जगकी सुख कर्त्री ॥५॥**
*Tumhi Jagatmata Vishwadhatri. Tumhi Sakal Jag Ki Sukh Kartri.*

**रतन मुकुट शिर ऊपर राजे । तेज छटा जग मगन कर साजे ॥६॥**
*Ratan Mukut Shir Upar Raje. Tej Chhata Jag Magan Kar Saje.*

**तुम ही ताप तोष निवारिणी । तुम ही नाश विलम्ब निवारिणी ॥७॥**
*Tum Hi Tap Tosh Nivarini. Tum Hi Nash Vilamb Nivarini.*

**संत मनीषिन जो शरण आई । कबहुँ न निष्फल उनको जाई ॥८॥**
*Sant Manishin Jo Sharan Aai. Kabahun Na Nishphal Unko Jai.*

**तीन लोक में तू ही व्यापी । महा काली महा लक्ष्मी महा शक्ति तापी ॥९॥**
*Teen Lok Mein Tu Hi Vyapi. Maha Kali Maha Lakshmi Maha Shakti Tapi.*

**ब्रह्मा विष्णु शिवजी मिल आई । पूजत सदा उन्हें शिर नाई ॥१०॥**
*Brahma Vishnu Shivji Mil Aai. Poojat Sada Unhe Shir Nai.*

**रक्तबीज एक असुर अपारा । जिसने तिहूँ लोक अत्याचारा ॥११॥**
*Raktbeej Ek Asur Apara. Jisne Tihun Lok Atyachara.*

**उसके रक्त बूँद से भारी । उपजत असुर सहस्र विचारी ॥१२॥**
*Uske Rakt Boond Se Bhari. Upjat Asur Sahastra Vichari.*

**सबके प्राण उसने भी हारी । तब माता ने ली अवतारी ॥१३॥**
*Sabke Pran Usne Bhi Hari. Tab Mata Ne Li Avtari.*

**रक्तबीज को मार गिराया । फिर से संसार सुख पाया ॥१४॥**
*Raktbeej Ko Mar Giraya. Phir Se Sansar Sukh Paya.*

**महिषासुर अतिशय बलवाना । तिहूँ लोक में मचा उत्पाता ॥१५॥**
*Mahishasur Atishay Balvana. Tihun Lok Mein Macha Utpata.*

**ब्रह्मा विष्णु शंकर की शक्ति । तीनों की मिल बनी भगवती ॥१६॥**
*Brahma Vishnu Shankar Ki Shakti. Teenon Ki Mil Bani Bhagvati.*

**देवन की तब मैया काम सँवारी । दुष्ट महिषासुर असुर मारी ॥१७॥**
*Devan Ki Tab Maiya Kam Sanvari. Dusht Mahishasur Asur Mari.*

**शुम्भ निशुम्भ दैत्य उन मारे । सकल शत्रु दुर्गा संहारे ॥१८॥**
*Shumbh Nishumbh Daitya Un Mare. Sakal Shatru Durga Sanhare.*

**सृष्टि रूप तू ही है माता । गौरी रूप धार तप कीन्हा ॥१९॥**
*Srishti Roop Tu Hi Hai Mata. Gauri Roop Dhar Tap Kinha.*

**शिव शंकर से ब्याह रचाया । जग में सृष्टि बीज बोवाया ॥२०॥**
*Shiv Shankar Se Byah Rachaya. Jag Mein Srishti Beej Bovaya.*

### दोहा (Concluding Doha)

**अम्बे तेरी आरती, जो कोई नित गावे ।
कहत शिवानंद स्वामी, मनवांछित फल पावे ॥**

*Ambe Teri Aarti, Jo Koi Nit Gave.
Kahat Shivanand Swami, Manvanchit Phal Pave.*

---
*The Durga Chalisa is dedicated to Goddess Durga, the divine mother and warrior goddess. Best recited during Navratri and on Fridays.*`,
    deity: 'Goddess Durga',
    language: 'hi' as const,
    durationSeconds: 520,
    tags: ['chalisa', 'durga', 'navratri', 'shakti', 'friday'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/durga-chalisa.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=AXvmt88JLWg',
    sortOrder: 13,
  },

  // ─── MANTRAS ───────────────────────────────────────────────────────────────

  {
    type: 'mantra' as const,
    title: 'Gayatri Mantra',
    titleLocal: 'गायत्री मंत्र',
    slug: 'gayatri-mantra',
    body: `## गायत्री मंत्र (Gayatri Mantra)

### मंत्र (Mantra)

**ॐ भूर्भुवः स्वः**
**तत्सवितुर्वरेण्यं**
**भर्गो देवस्य धीमहि**
**धियो यो नः प्रचोदयात् ॥**

### Transliteration

**Om Bhur Bhuvah Svah**
**Tat Savitur Varenyam**
**Bhargo Devasya Dhimahi**
**Dhiyo Yo Nah Prachodayat**

### Word-by-Word Meaning

- **ॐ (Om)** — The primordial sound, the essence of the universe
- **भूः (Bhur)** — The physical world (earth)
- **भुवः (Bhuvah)** — The mental world (atmosphere)
- **स्वः (Svah)** — The spiritual world (heaven)
- **तत् (Tat)** — That (referring to the Supreme)
- **सवितुः (Savitur)** — Of the Sun (the Creator, Savitar)
- **वरेण्यम् (Varenyam)** — The most excellent, worthy of worship
- **भर्गो (Bhargo)** — Divine light, splendor, radiance
- **देवस्य (Devasya)** — Of the Supreme Lord
- **धीमहि (Dhimahi)** — We meditate upon
- **धियो (Dhiyo)** — Our intellect, understanding
- **यो (Yo)** — Who, which
- **नः (Nah)** — Our
- **प्रचोदयात् (Prachodayat)** — May inspire, illuminate, guide

### Complete Meaning

*"We meditate on the glory of that Being (the Sun/Creator) who has produced this universe; may He enlighten our minds and guide our intellect."*

### Significance

The Gayatri Mantra is one of the most universal and oldest mantras from the **Rig Veda (Mandala 3, Sukta 62, Mantra 10)**. It is attributed to the sage Vishwamitra.

- It is considered the **essence of all Vedic wisdom**
- The mantra is dedicated to **Savitar**, the Sun deity, representing the divine light of consciousness
- Regular recitation is believed to **enhance intellect, remove ignorance, and bring spiritual illumination**
- It is traditionally chanted during the three Sandhya Vandana times: **sunrise, noon, and sunset**
- The mantra is also called the **"Mother of the Vedas" (Veda Mata)**

### Practice

- **Best Time:** Sandhya Vandana (sunrise, noon, sunset)
- **Recommended:** 108 times daily on a mala
- **Direction:** Face east during sunrise, north during noon, west during sunset
- **Ideal Posture:** Padmasana or Sukhasana with spine erect`,
    deity: 'Savitar (Sun)',
    language: 'hi' as const,
    durationSeconds: 30,
    tags: ['mantra', 'vedic', 'gayatri', 'daily', 'universal', 'sunrise', 'rigveda'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/gayatri-mantra.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=nwRoHC83wx0',
    sortOrder: 20,
  },

  {
    type: 'mantra' as const,
    title: 'Mahamrityunjay Mantra',
    titleLocal: 'महामृत्युंजय मंत्र',
    slug: 'mahamrityunjay-mantra',
    body: `## महामृत्युंजय मंत्र (Mahamrityunjaya Mantra)

### मंत्र (Mantra)

**ॐ त्र्यम्बकं यजामहे**
**सुगन्धिं पुष्टिवर्धनम् ।**
**उर्वारुकमिव बन्धनान्**
**मृत्योर्मुक्षीय मामृतात् ॥**

### Transliteration

**Om Tryambakam Yajamahe**
**Sugandhim Pushtivardhanam**
**Urvarukamiva Bandhanan**
**Mrityor Mukshiya Maamritat**

### Word-by-Word Meaning

- **ॐ (Om)** — The primordial sacred syllable
- **त्र्यम्बकं (Tryambakam)** — The three-eyed one (Lord Shiva)
- **यजामहे (Yajamahe)** — We worship, we honor
- **सुगन्धिं (Sugandhim)** — The fragrant one, the essence of life
- **पुष्टिवर्धनम् (Pushtivardhanam)** — The one who nourishes and strengthens all beings
- **उर्वारुकम् (Urvarukam)** — Like a cucumber (or watermelon)
- **इव (Iva)** — Like, as if
- **बन्धनात् (Bandhanan)** — From bondage, from the stem
- **मृत्योः (Mrityor)** — From death
- **मुक्षीय (Mukshiya)** — May I be liberated, set free
- **मा (Ma)** — Not
- **अमृतात् (Amritat)** — From immortality (do not deny me the nectar of immortality)

### Complete Meaning

*"We worship the three-eyed Lord Shiva, who is fragrant and who nourishes all beings. As the cucumber is severed from its bondage to the creeper, may He liberate us from death for the sake of immortality."*

### Significance

This mantra is from the **Rig Veda (Mandala 7, Sukta 59, Mantra 12)**, attributed to the sage Markandeya, who himself conquered death through devotion to Lord Shiva.

- It is one of the **most powerful healing mantras** in Hinduism
- The mantra is dedicated to **Lord Shiva as Mrityunjaya** — the conqueror of death
- It is chanted for **health, longevity, protection from untimely death, and spiritual liberation**
- The beautiful metaphor of the cucumber naturally detaching from the vine represents the soul's **effortless liberation from the body at the destined time**

### Practice

- **Best Time:** Early morning (Brahma Muhurta) or during Pradosh Kaal (1.5 hours before sunset)
- **Recommended:** 108 times daily on a Rudraksha mala
- **For Complete Jaap:** 1,25,000 recitations over 40 days
- **Special Occasions:** During illness, eclipses, and for protection during travel
- **Offering:** Bilva (Bel) leaves to a Shiva Lingam while chanting`,
    deity: 'Lord Shiva',
    language: 'hi' as const,
    durationSeconds: 25,
    tags: ['mantra', 'shiva', 'health', 'protection', 'longevity', 'rigveda', 'healing'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/mahamrityunjay-mantra.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=BMDLRW1iDpI',
    sortOrder: 21,
  },

  {
    type: 'mantra' as const,
    title: 'Vishnu Sahasranama',
    titleLocal: 'विष्णु सहस्रनाम',
    slug: 'vishnu-sahasranamam',
    body: `## विष्णु सहस्रनाम (Vishnu Sahasranama)
*From the Anushasana Parva of the Mahabharata*

The Vishnu Sahasranama is a list of 1,000 names of Lord Vishnu, narrated by Bhishma Pitamah to Yudhishthira on the battlefield of Kurukshetra.

### ध्यान श्लोक (Dhyana Shloka)

**शान्ताकारं भुजगशयनं पद्मनाभं सुरेशम्**
**विश्वाधारं गगनसदृशं मेघवर्णं शुभांगम् ।**
**लक्ष्मीकान्तं कमलनयनं योगिभिर्ध्यानगम्यम्**
**वन्दे विष्णुं भवभयहरं सर्वलोकैकनाथम् ॥**

*Shantakaram Bhujagashayanam Padmanabham Suresham,
Vishvadharam Gaganasadrisham Meghavarnam Shubhangam.
Lakshmikantam Kamalanayanam Yogibhir Dhyanagamyam,
Vande Vishnum Bhavabhayaharam Sarvalokaikanatham.*

### First 20 Names with Meanings

**1. विश्वम् (Vishvam)** — The Universe itself; He who is everything
*He is the entire cosmos and all that exists within it.*

**2. विष्णुः (Vishnuh)** — The All-Pervading One
*He who pervades everything, present everywhere at all times.*

**3. वषट्कारः (Vashatkaarah)** — He for whom the sacrificial fire is lit
*The one who is invoked in Vedic rituals with the exclamation "Vashat!"*

**4. भूतभव्यभवत्प्रभुः (Bhuta-bhavya-bhavat-prabhuh)** — The Lord of past, present, and future
*He who is the master of all three periods of time.*

**5. भूतकृत् (Bhutakrit)** — The Creator of all beings
*He who creates all living entities.*

**6. भूतभृत् (Bhutabhrit)** — The Sustainer of all beings
*He who nourishes and supports all creatures.*

**7. भावः (Bhavah)** — Existence itself
*He who is pure existence, the source of all being.*

**8. भूतात्मा (Bhutatma)** — The Soul of all beings
*He who is the inner self (Atman) of every creature.*

**9. भूतभावनः (Bhutabhavanah)** — The Cause of the growth of all beings
*He who causes all beings to flourish.*

**10. पूतात्मा (Putatma)** — The Pure Self
*He whose nature is eternally pure and untainted.*

**11. परमात्मा (Paramatma)** — The Supreme Self
*The highest Self, the universal consciousness.*

**12. मुक्तानां परमा गतिः (Muktanam Parama Gatih)** — The Supreme Goal of the liberated
*The ultimate destination for those who attain Moksha.*

**13. अव्ययः (Avyayah)** — The Imperishable
*He who never diminishes or changes.*

**14. पुरुषः (Purushah)** — The Supreme Being
*The cosmic person who fills the universe.*

**15. साक्षी (Sakshi)** — The Witness
*He who observes everything without being affected.*

**16. क्षेत्रज्ञः (Kshetrajnah)** — The Knower of the Field
*He who knows every body (field) and every soul.*

**17. अक्षरः (Aksharah)** — The Indestructible
*He who can never be destroyed.*

**18. योगः (Yogah)** — The Means of Union
*He who is the path to spiritual union and liberation.*

**19. योगविदां नेता (Yogavidam Neta)** — The Guide of the Knowers of Yoga
*He who leads the great yogis on the path of realization.*

**20. प्रधानपुरुषेश्वरः (Pradhana-purushesvara)** — The Lord of Pradhana and Purusha
*He who is the master of both matter (Prakriti) and spirit (Purusha).*

---

### फलश्रुति (Phalashruti — Benefits)

The Vishnu Sahasranama states that reciting these 1,000 names:
- **Removes all sins** and purifies the mind
- **Grants liberation** (Moksha) from the cycle of birth and death
- **Bestows wealth, health, and prosperity**
- **Protects from all dangers** and negative influences
- The one name **"Rama"** is equivalent to chanting all 1,000 names

### Practice

- **Best Time:** Early morning after bath, or during Ekadashi
- **Duration:** Full recitation takes approximately 28-30 minutes
- **Recommended:** Daily recitation or at minimum on Thursdays and Ekadashi
- **Mala:** Use a Tulsi mala for Vaishnavas`,
    deity: 'Lord Vishnu',
    language: 'hi' as const,
    durationSeconds: 1725,
    tags: ['mantra', 'vishnu', 'sahasranama', 'mahabharata', 'moksha', 'thursday'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/vishnu-sahasranamam.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=ATflA6WOy0I',
    sortOrder: 22,
  },

  {
    type: 'mantra' as const,
    title: 'Om Namah Shivaya',
    titleLocal: 'ॐ नमः शिवाय',
    slug: 'om-namah-shivaya-mantra',
    body: `## ॐ नमः शिवाय (Om Namah Shivaya)

### मंत्र (Mantra)

**ॐ नमः शिवाय**

### Transliteration

**Om Namah Shivaya**

### Meaning

*"I bow to Lord Shiva"* — Salutations to the auspicious one, the supreme consciousness.

### The Five Sacred Syllables (Panchakshari)

The five syllables — **Na, Ma, Shi, Va, Ya** — represent the five elements that make up the universe:

| Syllable | Element | Meaning |
|----------|---------|---------|
| **न (Na)** | Earth (Prithvi) | The foundation of physical existence |
| **म (Ma)** | Water (Jal) | The flow of life and consciousness |
| **शि (Shi)** | Fire (Agni) | Transformation and purification |
| **वा (Va)** | Air (Vayu) | Movement and prana (life force) |
| **य (Ya)** | Ether (Akasha) | Infinite space and possibility |

### Significance

Om Namah Shivaya is the **Panchakshari** (five-syllable) mantra dedicated to Lord Shiva. It is one of the most popular and widely chanted mantras in Hinduism.

- This mantra is the **core of the Shaiva tradition**
- It appears in the **Sri Rudram** hymn of the **Yajurveda**
- It is believed to **purify the mind, destroy negative karma, and lead to liberation (Moksha)**
- The mantra can be chanted by **anyone, at any time**, without any ritual requirements
- It is also known as the **Aghoramantra** and the **Mahamantra of the Shaiva path**

### Practice

- **Best Time:** Anytime, especially Monday mornings and Pradosh Kaal
- **Recommended:** 108 times on a Rudraksha mala
- **Method:** Can be chanted aloud, whispered, or silently in the mind
- **Posture:** Any comfortable seated position`,
    deity: 'Lord Shiva',
    language: 'hi' as const,
    durationSeconds: 10,
    tags: ['mantra', 'shiva', 'panchakshari', 'daily', 'universal', 'yajurveda'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/om-namah-shivaya.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=ccBcAWE_lIY',
    sortOrder: 23,
  },

  {
    type: 'mantra' as const,
    title: 'Hare Krishna Maha Mantra',
    titleLocal: 'हरे कृष्ण महामंत्र',
    slug: 'hare-krishna-maha-mantra',
    body: `## हरे कृष्ण महामंत्र (Hare Krishna Maha Mantra)

### मंत्र (Mantra)

**हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे ।**
**हरे राम हरे राम, राम राम हरे हरे ॥**

### Transliteration

**Hare Krishna Hare Krishna, Krishna Krishna Hare Hare**
**Hare Rama Hare Rama, Rama Rama Hare Hare**

### Meaning

*"O Lord Krishna, O energy of the Lord (Hare/Radha), O Lord Rama — please engage me in your devotional service."*

### The Three Divine Names

- **हरे (Hare)** — The divine energy of the Lord; also refers to Radha, the eternal consort of Krishna
- **कृष्ण (Krishna)** — "The All-Attractive" — the Supreme Personality of Godhead
- **राम (Rama)** — "The Source of All Pleasure" — also refers to Lord Rama

### Significance

The Hare Krishna Maha Mantra is the **supreme mantra for this age (Kali Yuga)** as mentioned in the **Kali-Santarana Upanishad**.

- It contains **16 words and 32 syllables**
- Chanting cleanses the heart, awakens dormant love for God, and brings peace
- Popularized worldwide by **A.C. Bhaktivedanta Swami Prabhupada** and ISKCON
- No initiation or ritual qualification needed — **anyone can chant**

### Practice

- **Best Time:** Brahma Muhurta (4:00 AM - 6:00 AM)
- **Recommended:** 16 rounds on a Tulsi mala (1,728 times daily for serious practitioners)
- **Method:** Chant on 108-bead Tulsi mala, moving one bead per complete mantra
- **Key Principle:** Chant clearly and listen attentively to the sound`,
    deity: 'Lord Krishna',
    language: 'hi' as const,
    durationSeconds: 20,
    tags: ['mantra', 'krishna', 'rama', 'vaishnava', 'daily', 'iskcon'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/hare-krishna-mantra.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=Zdcth9NndEA',
    sortOrder: 24,
  },

  {
    type: 'mantra' as const,
    title: 'Ganesh Mantra - Om Gam Ganapataye Namaha',
    titleLocal: 'ॐ गं गणपतये नमः',
    slug: 'ganesh-mantra-om-gam',
    body: `## ॐ गं गणपतये नमः (Om Gam Ganapataye Namaha)

### मंत्र (Mantra)

**ॐ गं गणपतये नमः**

### Transliteration

**Om Gam Ganapataye Namaha**

### Meaning

*"Salutations to Lord Ganesha, the remover of obstacles."*

- **ॐ (Om)** — The primordial sound
- **गं (Gam)** — The seed (beej) syllable of Lord Ganesha
- **गणपतये (Ganapataye)** — To the Lord of all Ganas (celestial attendants)
- **नमः (Namaha)** — I bow, I offer salutations

### Additional Ganesha Mantras

**वक्रतुण्ड महाकाय:**
**वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।**
**निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥**

*Vakratunda Mahakaya, Suryakoti Samaprabha,*
*Nirvighnam Kuru Me Deva, Sarva Kaaryeshu Sarvada.*

*"O Lord with the curved trunk and massive body, whose brilliance equals a billion suns, please make all my endeavors free of obstacles, always."*

**गणेश गायत्री:**
**ॐ एकदंताय विद्महे वक्रतुण्डाय धीमहि ।**
**तन्नो दंती प्रचोदयात् ॥**

*Om Ekadantaya Vidmahe, Vakratundaya Dhimahi,*
*Tanno Danti Prachodayat.*

### Practice

- **Best Time:** Early morning, especially on Wednesdays and Chaturthi
- **Recommended:** 108 times daily for 21 days for wish fulfillment
- **Offering:** Modak, Durva grass, Red flowers
- **Always chant before:** Starting any new project, exam, journey, or worship`,
    deity: 'Lord Ganesha',
    language: 'hi' as const,
    durationSeconds: 15,
    tags: ['mantra', 'ganesha', 'beej-mantra', 'new-beginnings', 'wednesday'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/ganesh-mantra.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=AEN5Gx-mLGc',
    sortOrder: 25,
  },

  // ─── BAJRANG BAAN ──────────────────────────────────────────────────────────

  {
    type: 'chalisa' as const,
    title: 'Bajrang Baan',
    titleLocal: 'बजरंग बाण',
    slug: 'bajrang-baan',
    body: `## बजरंग बाण (Bajrang Baan)

### दोहा (Doha)

**निश्चय प्रेम प्रतीति ते, विनय करें सनमान ।
तेहि के कारज सकल शुभ, सिद्ध करें हनुमान ॥**

*Nishchay Prem Pratiti Te, Vinay Karein Sanman,
Tehi Ke Karaj Sakal Shubh, Siddh Karein Hanuman.*

### बजरंग बाण (Bajrang Baan)

**जय हनुमंत संत हितकारी । सुन लीजे प्रभु अरज हमारी ॥**
*Jai Hanumant Sant Hitkari. Sun Lije Prabhu Araj Hamari.*

**जन के काज विलम्ब न कीजै । आतुर दौरि महा सुख दीजै ॥**
*Jan Ke Kaj Vilamb Na Kijai. Atur Dauri Maha Sukh Dijai.*

**जैसे कूदि सिंधु महि पारा । सुरसा बदन पैठि बिस्तारा ॥**
*Jaise Kudi Sindhu Mahi Para. Sursa Badan Paithi Bistara.*

**आगे जाय लंकिनी रोका । मारेहु लात गई सुर लोका ॥**
*Aage Jay Lankini Roka. Marehu Lat Gai Sur Loka.*

**जाय विभीषण को सुख दीन्हा । सीता निरखि परम पद लीन्हा ॥**
*Jay Vibhishan Ko Sukh Dinha. Sita Nirakhi Param Pad Linha.*

**बाग उजारि सिंधु महँ बोरा । अति आतुर जमकातर तोरा ॥**
*Bag Ujari Sindhu Mahan Bora. Ati Atur Jamkatar Tora.*

**अक्षय कुमार को मार संहारा । लूम लपेटि लंक को जारा ॥**
*Akshay Kumar Ko Mar Sanhara. Loom Lapeti Lanka Ko Jara.*

**लाह समान लंका जरि गई । जय जय धुनि सुर पुर नभ भई ॥**
*Lah Saman Lanka Jari Gai. Jai Jai Dhuni Sur Pur Nabh Bhai.*

**अब विलम्ब केहि कारन स्वामी । कृपा करहु उर अंतरयामी ॥**
*Ab Vilamb Kehi Karan Swami. Kripa Karahu Ur Antaryami.*

**जय जय लखन प्रान के दाता । आतुर ह्वै दुख करहु निपाता ॥**
*Jai Jai Lakhan Pran Ke Data. Atur Hvai Dukh Karahu Nipata.*

**जय हनुमान जय जय हनुमाना । मम अरज सुनो आज बजरंग बाना ॥**
*Jai Hanuman Jai Jai Hanumana. Mam Araj Suno Aaj Bajrang Bana.*

**ॐ हनु हनु हनु हनुमंत हठीले ।**
**बैरिहि मारु बज्र की किले ॥**
*Om Hanu Hanu Hanu Hanumant Hathile.*
*Bairihi Maru Bajra Ki Kile.*

**ॐ ह्नीं ह्नीं ह्नीं हनुमंत कपीसा ।**
**ॐ हुं हुं हुं हनु अरि उर शीसा ॥**
*Om Hrim Hrim Hrim Hanumant Kapisa.*
*Om Hum Hum Hum Hanu Ari Ur Shisa.*

**सत्य होहु हरि शपथ पाई के ।**
**राम दूत धरु मारु धाई के ॥**
*Satya Hohu Hari Shapath Pai Ke.*
*Ram Doot Dharu Maru Dhai Ke.*

**जय जय जय हनुमंत अगाधा ।**
**दुख पावत जन केहि अपराधा ॥**
*Jai Jai Jai Hanumant Agadha.*
*Dukh Pavat Jan Kehi Apradha.*

**पूजा जप तप नेम अचारा ।**
**नहिं जानत कछु दास तुम्हारा ॥**
*Puja Jap Tap Nem Achara.*
*Nahin Janat Kachhu Das Tumhara.*

**बन उपबन मग गिरि गृह माहीं ।**
**तुम्हरे बल हम डरपत नाहीं ॥**
*Ban Upban Mag Giri Grih Mahin.*
*Tumhre Bal Ham Darpat Nahin.*

**पांय परौं कर जोरि मनावौं ।**
**यहि अवसर अब केहि गोहरावौं ॥**
*Paay Paraun Kar Jori Manavau.*
*Yahi Avasar Ab Kehi Goharavau.*

**उठु उठु चलु तोहि राम दुहाई ।**
**पांय परौं कर जोरि मनाई ॥**
*Uthu Uthu Chalu Tohi Ram Duhai.*
*Paay Paraun Kar Jori Manai.*

### दोहा (Concluding Doha)

**ॐ श्री हनुमान जी की पूजा को,**
**यह बजरंग बाण प्रतिदिन पढ़ने से,**
**सभी मनोकामनाएं पूर्ण होती हैं ॥**

---
*Bajrang Baan is a powerful prayer to Lord Hanuman, literally meaning "The Arrow of Bajrang (Hanuman)". It is recited for protection against evil forces, fear, and obstacles. Best recited on Tuesdays and Saturdays.*`,
    deity: 'Lord Hanuman',
    language: 'hi' as const,
    durationSeconds: 720,
    tags: ['chalisa', 'hanuman', 'protection', 'tuesday', 'saturday', 'bajrang-baan'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/bajrang-baan.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=h1lT6cxwsPw',
    sortOrder: 15,
  },

  // ─── ARTICLES ──────────────────────────────────────────────────────────────

  {
    type: 'article' as const,
    title: 'The Twelve Jyotirlingas: A Complete Pilgrimage Guide',
    titleLocal: 'बारह ज्योतिर्लिंग: संपूर्ण तीर्थयात्रा गाइड',
    slug: 'twelve-jyotirlingas-pilgrimage-guide',
    body: `The twelve Jyotirlingas are the most sacred abodes of Lord Shiva, where he is worshipped in the form of a "lingam of light." These temples are spread across India and are considered the holiest Shiva temples. Visiting all twelve Jyotirlingas is believed to free a devotee from the cycle of birth and death.

**1. Somnath (Gujarat)** — The first Jyotirlinga, located on the shores of the Arabian Sea. Destroyed and rebuilt multiple times, it stands as a symbol of resilience.

**2. Mallikarjuna (Andhra Pradesh)** — Located on Shrisailam hill on the banks of River Krishna. Also called the "Kailash of the South."

**3. Mahakaleshwar (Madhya Pradesh)** — The only south-facing Jyotirlinga, located in Ujjain. Famous for the Bhasma Aarti performed with sacred ash.

**4. Omkareshwar (Madhya Pradesh)** — Situated on an island in the Narmada River that naturally forms the shape of Om.

**5. Kedarnath (Uttarakhand)** — The highest Jyotirlinga at 11,755 feet in the Himalayas. Accessible only 6 months a year.

**6. Bhimashankar (Maharashtra)** — Set amidst the lush Western Ghats, also a wildlife sanctuary.

**7. Kashi Vishwanath (Uttar Pradesh)** — Located in the holy city of Varanasi, the spiritual capital of India.

**8. Trimbakeshwar (Maharashtra)** — Near the origin of the Godavari River in Nashik. Unique for its three-faced lingam.

**9. Vaidyanath (Jharkhand)** — Also known as Baidyanath Dham, located in Deoghar.

**10. Nageshwar (Gujarat)** — Located near Dwarka, associated with the legend of Daruka demon.

**11. Ramanathaswamy (Tamil Nadu)** — Located on Rameswaram Island, one of the Char Dham sites established by Lord Rama.

**12. Grishneshwar (Maharashtra)** — The last Jyotirlinga, located near the Ellora Caves in Aurangabad.

Each Jyotirlinga has a unique legend and significance. Pilgrims traditionally visit them in a specific order, though modern devotees may visit in any sequence they find convenient.`,
    deity: 'Lord Shiva',
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'jyotirlinga', 'shiva', 'pilgrimage', 'guide'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/jyotirlingas-guide.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=UO39dgB8gYo',
    sortOrder: 30,
  },

  {
    type: 'article' as const,
    title: 'Navratri: Nine Nights of Divine Feminine Power',
    titleLocal: 'नवरात्रि: देवी शक्ति की नौ रातें',
    slug: 'navratri-festival-guide',
    body: `Navratri, meaning "nine nights," is one of the most significant Hindu festivals celebrating the divine feminine energy (Shakti). Observed twice a year — Chaitra Navratri (March/April) and Sharad Navratri (September/October) — this festival honors the nine forms of Goddess Durga.

**Day 1 - Shailputri**: The daughter of the mountains, riding a bull with a trident and lotus.
**Day 2 - Brahmacharini**: The ascetic form, carrying a rosary and water vessel.
**Day 3 - Chandraghanta**: The fierce protector, with a half-moon on her forehead.
**Day 4 - Kushmanda**: Creator of the universe, riding a lion with eight arms.
**Day 5 - Skandamata**: Mother of Kartikeya, sitting on a lotus.
**Day 6 - Katyayani**: The warrior goddess who destroyed Mahishasura.
**Day 7 - Kaalratri**: The fierce dark form that destroys ignorance and evil.
**Day 8 - Mahagauri**: The fair and radiant form symbolizing purity and peace.
**Day 9 - Siddhidatri**: The granter of supernatural powers and wisdom.

**Navratri Colors**: Each day is associated with a specific color that devotees wear.

**Fasting Traditions**: Many devotees observe a strict fast during Navratri, consuming only fruits, milk, and specific foods like Kuttu ka Atta (buckwheat flour) and Singhara Atta (water chestnut flour).

**Regional Celebrations**: Gujarat is famous for Garba and Dandiya Raas dances. West Bengal celebrates Durga Puja with elaborate pandals. South India observes Golu (display of dolls).`,
    deity: 'Goddess Durga',
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'navratri', 'durga', 'festival', 'guide', 'shakti'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/navratri-guide.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=lZtMMNt_Mnk',
    sortOrder: 31,
  },

  {
    type: 'article' as const,
    title: 'Understanding Panchang: The Hindu Almanac Explained',
    titleLocal: 'पंचांग को समझें: हिंदू कैलेंडर की पूरी जानकारी',
    slug: 'understanding-panchang-hindu-almanac',
    body: `The Panchang (literally "five limbs") is the Hindu calendar and almanac that provides essential information for determining auspicious times, festivals, and daily spiritual activities.

**The Five Elements (Panch-Ang):**

1. **Tithi (Lunar Day)**: 30 tithis in a lunar month — 15 in waxing (Shukla Paksha), 15 in waning (Krishna Paksha).

2. **Nakshatra (Lunar Mansion)**: 27 nakshatras through which the Moon passes.

3. **Yoga**: 27 yogas formed by the combined motion of Sun and Moon.

4. **Karana**: Half of a tithi; there are 11 Karanas.

5. **Var (Weekday)**: Each day ruled by a planet.

**Important Daily Timings:**
- **Rahu Kaal**: Inauspicious period (~1.5 hours daily)
- **Brahma Muhurta**: Most auspicious time, 1hr 36min before sunrise
- **Abhijit Muhurat**: Universally auspicious time around midday`,
    deity: null,
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'panchang', 'guide', 'almanac', 'astrology', 'education'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/panchang-guide.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=sxDI6ze1ejs',
    sortOrder: 32,
  },

  {
    type: 'article' as const,
    title: 'Char Dham Yatra: The Ultimate Hindu Pilgrimage',
    titleLocal: 'चार धाम यात्रा: सम्पूर्ण मार्गदर्शिका',
    slug: 'char-dham-yatra-guide',
    body: `The Char Dham (Four Abodes) pilgrimage is considered the most sacred journey in Hinduism. Established by Adi Shankaracharya in the 8th century, these four temples are located at the four cardinal points of India.

**1. Badrinath (North) — Uttarakhand**
Dedicated to Lord Vishnu, at 10,279 feet in the Garhwal Himalayas. Open May to November.

**2. Jagannath Puri (East) — Odisha**
Home to Lord Jagannath. Famous for Rath Yatra and the world's largest kitchen.

**3. Rameswaram (South) — Tamil Nadu**
Where Lord Rama worshipped Lord Shiva. Famous for 22 sacred wells.

**4. Dwarka (West) — Gujarat**
Dwarkadhish Temple marks Lord Krishna's ancient kingdom.

**Planning Your Yatra:** Traditional circuit: Puri → Rameswaram → Dwarka → Badrinath. Best time: October-November.`,
    deity: 'Lord Vishnu',
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'char-dham', 'pilgrimage', 'guide'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/char-dham-guide.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=dR1FV---j2g',
    sortOrder: 33,
  },

  {
    type: 'article' as const,
    title: 'The Science and Spirituality Behind Temple Architecture',
    titleLocal: 'मंदिर वास्तुकला का विज्ञान और आध्यात्म',
    slug: 'temple-architecture-science-spirituality',
    body: `Hindu temple architecture is a profound science combining sacred geometry, astronomy, Vastu Shastra, and spiritual symbolism.

**The Temple as a Cosmic Body:**
A Hindu temple (Mandir) is designed as a representation of the cosmic being (Purusha). The Garbhagriha represents the head, the Mandapa the body, and the Gopuram connects earth to heaven.

**Key Elements:**
1. **Garbhagriha**: Innermost sanctum, dark and enclosed
2. **Shikhara/Vimana**: Tower channeling cosmic energy
3. **Mandapa**: Pillared hall for worship
4. **Pradakshina Path**: Circumambulatory path

**Scientific Principles:**
- Temples built over underground water streams for electromagnetic fields
- Copper Kalasha atop temples as energy conductors
- Bell vibrations activate both brain hemispheres`,
    deity: null,
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'architecture', 'temple', 'vastu', 'science', 'education'],
    isPremium: true,
    status: 'published' as const,
    imageUrl: 'https://images.darshya.online/content/temple-architecture.jpg',
    audioUrl: null,
    videoUrl: 'https://www.youtube.com/watch?v=C7Hr8tKiDRk',
    sortOrder: 34,
  },
];
