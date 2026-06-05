import type { Metadata } from "next";

export const metadata: Metadata = {
 title: "Image Credits",
 description:
 "Attribution for the photographs and artworks used on Darshya. Many images are sourced from Wikimedia Commons under Creative Commons licenses.",
};

interface Credit {
 subject: string;
 filename: string;
 sourcePage: string;
 license: string;
 author: string;
}

const wikimediaCredits: Credit[] = [
 // 12 Jyotirlingas
 { subject: "Somnath Temple", filename: "Somanath_mandir_(cropped).jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Somanath_mandir_(cropped).jpg", license: "CC BY-SA 4.0", author: "B. SurajPatro1997" },
 { subject: "Mallikarjuna Jyotirlinga", filename: "MKJNTemple.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:MKJNTemple.jpg", license: "CC0", author: "Unknown" },
 { subject: "Mahakaleshwar Temple, Ujjain", filename: "Mahakaleshwar_Temple,_Ujjain.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Mahakaleshwar_Temple,_Ujjain.jpg", license: "CC BY-SA 4.0", author: "Ashverse" },
 { subject: "Omkareshwar Jyotirlinga", filename: "Omkareswar_Jyotirlinga.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Omkareswar_Jyotirlinga.jpg", license: "CC BY 4.0", author: "Deveshc92" },
 { subject: "Kedarnath Temple", filename: "Kedarnath_Temple_in_Rainy_season.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Kedarnath_Temple_in_Rainy_season.jpg", license: "CC BY-SA 4.0", author: "Shivam Kumar 766" },
 { subject: "Bhimashankar Temple", filename: "Bhimashankar.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Bhimashankar.jpg", license: "Public domain", author: "SaurabhJain" },
 { subject: "Kashi Vishwanath", filename: "Kashi_Vishwanath.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Kashi_Vishwanath.jpg", license: "CC BY-SA 4.0", author: "Architkumar1234" },
 { subject: "Trimbakeshwar Temple", filename: "Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg", license: "CC BY-SA 4.0", author: "Abhideo21" },
 { subject: "Baidyanath (Vaidyanath) Temple, Deoghar", filename: "Baidyanath_temple_and_temple_complex,_Deoghar_04.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Baidyanath_temple_and_temple_complex,_Deoghar_04.jpg", license: "CC BY 4.0", author: "Pinakpani" },
 { subject: "Nageshwar Jyotirlinga", filename: "Nageshwar.JPG", sourcePage: "https://commons.wikimedia.org/wiki/File:Nageshwar.JPG", license: "CC BY-SA 4.0", author: "Bkjit" },
 { subject: "Ramanathaswamy (Rameshwaram) Temple", filename: "Ramanathaswamy_temple7.JPG", sourcePage: "https://commons.wikimedia.org/wiki/File:Ramanathaswamy_temple7.JPG", license: "CC BY-SA 4.0", author: "Ssriram mt" },
 { subject: "Grishneshwar Temple", filename: "Grishneshwar_temple_in_Aurangabad_district.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Grishneshwar_temple_in_Aurangabad_district.jpg", license: "CC BY-SA 3.0", author: "Rashmi.parab" },

 // Char Dham
 { subject: "Yamunotri Temple", filename: "Yamunotri_temple_and_ashram.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Yamunotri_temple_and_ashram.jpg", license: "CC BY-SA 3.0", author: "Atarax42" },
 { subject: "Gangotri Temple", filename: "Gangotri_Temple_2.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Gangotri_Temple_2.jpg", license: "CC BY-SA 4.0", author: "Arupamdas" },
 { subject: "Badrinath Temple", filename: "Badrinath_Temple_,_Uttarakhand.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Badrinath_Temple_,_Uttarakhand.jpg", license: "CC BY-SA 4.0", author: "Anubha khare" },

 // Other temples
 { subject: "Tirumala Tirupati Balaji", filename: "Tirumala_090615.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Tirumala_090615.jpg", license: "CC BY-SA 4.0", author: "Nikhilb239" },
 { subject: "Jagannath Temple, Puri", filename: "Shri_Jagannath_temple.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Shri_Jagannath_temple.jpg", license: "CC BY-SA 3.0", author: "Prachites" },
 { subject: "Siddhivinayak Temple, Mumbai", filename: "Shree_Siddhivinayak_Temple_Mumbai.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Shree_Siddhivinayak_Temple_Mumbai.jpg", license: "CC BY-SA 3.0", author: "Darwininan" },
 { subject: "Akshardham, Delhi", filename: "Swaminarayan_Akshardham,_Delhi.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Swaminarayan_Akshardham,_Delhi.jpg", license: "CC BY-SA 4.0", author: "sonani" },
 { subject: "Meenakshi Amman Temple, Madurai", filename: "An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg", license: "CC BY 3.0", author: "எஸ்ஸார்" },
 { subject: "Golden Temple, Amritsar", filename: "The_Golden_Temple_of_Amrithsar_7.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:The_Golden_Temple_of_Amrithsar_7.jpg", license: "CC BY-SA 4.0", author: "Shagil Kannur" },
 { subject: "Vrindavan", filename: "Vrindavan,_India_(21178969102).jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Vrindavan,_India_(21178969102).jpg", license: "CC BY-SA 2.0", author: "Aleksandr Zykov" },
 { subject: "Dwarakadheesh Temple", filename: "Dwarakadheesh_Temple,_2014.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Dwarakadheesh_Temple,_2014.jpg", license: "CC BY-SA 4.0", author: "Vishnupranay.k" },
 { subject: "Mata Vaishno Devi Bhawan", filename: "Vaishno_Devi_Bhawan.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Vaishno_Devi_Bhawan.jpg", license: "CC BY-SA 3.0", author: "Raulcaeser" },

 // Deities
 { subject: "Lord Shiva (Bangalore)", filename: "Bangalore_Shiva.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Bangalore_Shiva.jpg", license: "CC BY-SA 3.0", author: "Indianhilbilly" },
 { subject: "Lord Ganesha (Basohli miniature, c.1730)", filename: "Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg", license: "Public domain", author: "Anonymous" },
 { subject: "Lord Krishna lifts Mount Govardhan", filename: "Krishna_Holds_Up_Mount_Govardhan_(MET_70694)_cropped.png", sourcePage: "https://commons.wikimedia.org/wiki/File:Krishna_Holds_Up_Mount_Govardhan_(MET_70694)_cropped.png", license: "CC0", author: "Mughal artist (c.1590)" },
 { subject: "Lord Rama with arrows", filename: "Lord_Rama_with_arrows.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Lord_Rama_with_arrows.jpg", license: "Public domain", author: "Unknown" },
 { subject: "Standing Hanuman (Chola Dynasty, 11th century)", filename: "StandingHanumanCholaDynasty11thCentury.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:StandingHanumanCholaDynasty11thCentury.jpg", license: "CC BY-SA 3.0", author: "PHGCOM" },
 { subject: "Vishnu (Gita Govinda)", filename: "Vishnu_from_Gita_Govinda.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Vishnu_from_Gita_Govinda.jpg", license: "Public domain", author: "Manaku of Guler" },
 { subject: "Surya with Adityas", filename: "Surya_with_Adityas_and_attendants.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Surya_with_Adityas_and_attendants.jpg", license: "Public domain", author: "Unknown" },
 { subject: "Goddess Lakshmi (Raja Ravi Varma, 1896)", filename: "Raja_Ravi_Varma,_Goddess_Lakshmi,_1896.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Raja_Ravi_Varma,_Goddess_Lakshmi,_1896.jpg", license: "Public domain", author: "Raja Ravi Varma" },
 { subject: "Goddess Durga (Mahishasura-Mardini)", filename: "Mahishasura-Mardini_Durga.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Mahishasura-Mardini_Durga.jpg", license: "Public domain", author: "Sri Shilpi Siddanthi Siddalinga Swami" },
 { subject: "Goddess Saraswati", filename: "Saraswati.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Saraswati.jpg", license: "Public domain", author: "Raja Ravi Varma" },

 // Festivals
 { subject: "Diwali — Rangoli of Lights", filename: "The_Rangoli_of_Lights.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:The_Rangoli_of_Lights.jpg", license: "CC BY 2.0", author: "Subharnab Majumdar" },
 { subject: "Holi Festival of Colors", filename: "Holi_Festival_of_Colors.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Holi_Festival_of_Colors.jpg", license: "CC BY 2.0", author: "Ramesh Lalwani" },
 { subject: "Shardiya Navratri Festival, Pune 2020", filename: "Shardiya_Navratri_Festival_in_Pune_2020.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Shardiya_Navratri_Festival_in_Pune_2020.jpg", license: "CC BY-SA 4.0", author: "आर्या जोशी" },
 { subject: "Khairathabad Vinayakudu (Ganesh Chaturthi 2021)", filename: "Khairathabad_Vinayakudu_2021.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Khairathabad_Vinayakudu_2021.jpg", license: "CC BY-SA 4.0", author: "Batthini Vinay Kumar Goud" },
 { subject: "Mahashivratri Festival", filename: "02_Mahashivratree_festival.JPG", sourcePage: "https://commons.wikimedia.org/wiki/File:02_Mahashivratree_festival.JPG", license: "CC BY-SA 4.0", author: "Navneesh Ramessur" },
 { subject: "Yashoda and Krishna (Janmashtami)", filename: "Yesoda-krishna.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Yesoda-krishna.jpg", license: "Public domain", author: "Raja Ravi Varma" },
 { subject: "Rakhi (Raksha Bandhan)", filename: "Rakhi_1.JPG", sourcePage: "https://commons.wikimedia.org/wiki/File:Rakhi_1.JPG", license: "CC BY-SA 4.0", author: "ସରୋଜ କୁମାର ବେହେରା" },
 { subject: "Janakpur Chhath Parva Festival", filename: "JanakpurChhathParvaFestival.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:JanakpurChhathParvaFestival.jpg", license: "CC BY-SA 3.0", author: "Steffen Gauger" },

 // Pujas / rituals
 { subject: "Abhisheka (Rudrabhishek)", filename: "From_Abhisheka_To_Panchamrutha.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:From_Abhisheka_To_Panchamrutha.jpg", license: "CC BY-SA 2.0", author: "Harsha K R" },
 { subject: "Priest performing Homa (Havan)", filename: "Priest_performing_Homa.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Priest_performing_Homa.jpg", license: "GFDL", author: "Arumuga Manivelu" },
 { subject: "Aarti Thali (Prayer Plate)", filename: "(1)_Aarti_Thali,_Prayer_Plate_India.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:(1)_Aarti_Thali,_Prayer_Plate_India.jpg", license: "CC BY 2.0", author: "Pramal" },
 { subject: "Gayatri Japa (Mantra)", filename: "Gayatri_japa.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Gayatri_japa.jpg", license: "Public domain", author: "Mrs. S. C. Belnos" },
 { subject: "Navaratri Bhajan", filename: "Navaratri_Bajan.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Navaratri_Bajan.jpg", license: "CC BY-SA 3.0", author: "Bootervijay" },
 { subject: "Sannyasi in yoga meditation, Rishikesh", filename: "1_Sannyasi_in_yoga_meditation_on_the_Ganges,_Rishikesh_cropped.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:1_Sannyasi_in_yoga_meditation_on_the_Ganges,_Rishikesh_cropped.jpg", license: "CC BY-SA 2.0", author: "Ken Wieland" },

 // Gaushala / cows
 { subject: "Gir breed cow", filename: "Gir_cow.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Gir_cow.jpg", license: "CC BY-SA 4.0", author: "Jayan.thanal" },
 { subject: "Sahiwal breed cow", filename: "Sahiwala_01.JPG", sourcePage: "https://commons.wikimedia.org/wiki/File:Sahiwala_01.JPG", license: "CC BY-SA 3.0", author: "Pavanaja" },
 { subject: "Tharparkar breed cow", filename: "Tharparkar_01.JPG", sourcePage: "https://commons.wikimedia.org/wiki/File:Tharparkar_01.JPG", license: "CC BY-SA 3.0", author: "Pavanaja" },
 { subject: "Red Sindhi cow", filename: "Red_Sindhi_Cow_at_Pakistan.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Red_Sindhi_Cow_at_Pakistan.jpg", license: "CC BY-SA 4.0", author: "LunaticFringe97" },
 { subject: "Surabhi cow, Vrindavan", filename: "Surabhi_Cow_Vrindavan.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Surabhi_Cow_Vrindavan.jpg", license: "Public domain", author: "GourangaUK" },
 { subject: "Goshala at ISKCON Mayapur", filename: "Goshala-ISKCON.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:Goshala-ISKCON.jpg", license: "CC0", author: "Lakshmikanta Manna" },
 { subject: "Calf in Tripura", filename: "A_beautiful_gaze.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:A_beautiful_gaze.jpg", license: "CC BY-SA 4.0", author: "Cosmicsilverfox" },
 { subject: "Cows grazing in a field", filename: "A_beautiful_photo_of_cows_grazing_in_the_field.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:A_beautiful_photo_of_cows_grazing_in_the_field.jpg", license: "CC0", author: "Samir8609" },
 { subject: "Women washing a cow at a river in Rajasthan", filename: "ILRI,_Stevie_Mann_-_Women_washing_and_cow_drinking_at_a_river_in_Rajasthan,_India.jpg", sourcePage: "https://commons.wikimedia.org/wiki/File:ILRI,_Stevie_Mann_-_Women_washing_and_cow_drinking_at_a_river_in_Rajasthan,_India.jpg", license: "CC BY 2.0", author: "ILRI / Stevie Mann" },
];

export default function CreditsPage() {
 return (
 <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Credits
 </p>
 <h1
 className="text-2xl sm:text-3xl font-bold mb-3"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 Image Credits & Attribution
 </h1>
 <p
 className="text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 Many photographs and artworks shown on Darshya are sourced from
 Wikimedia Commons under Creative Commons or public-domain licenses.
 Each image below links to its source page on Wikimedia Commons,
 where you can view the full license terms and original file.
 </p>
 </div>
 </section>

 <section className="py-12 sm:py-16">
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <h2
 className="text-lg font-semibold mb-6"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Wikimedia Commons sources
 </h2>

 <div
 className="rounded-lg overflow-hidden border"
 style={{
 borderColor: "var(--color-border)",
 background: "var(--color-surface)",
 }}
 >
 <table className="w-full text-sm">
 <thead style={{ background: "var(--color-bg)" }}>
 <tr>
 <th
 className="text-left px-4 py-3 font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 Subject
 </th>
 <th
 className="text-left px-4 py-3 font-semibold hidden sm:table-cell"
 style={{ color: "var(--color-text)" }}
 >
 Author
 </th>
 <th
 className="text-left px-4 py-3 font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 License
 </th>
 </tr>
 </thead>
 <tbody>
 {wikimediaCredits.map((c) => (
 <tr
 key={c.filename}
 className="border-t"
 style={{ borderColor: "var(--color-border)" }}
 >
 <td className="px-4 py-3" style={{ color: "var(--color-text)" }}>
 <a
 href={c.sourcePage}
 target="_blank"
 rel="noopener noreferrer"
 className="hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 {c.subject}
 </a>
 </td>
 <td
 className="px-4 py-3 hidden sm:table-cell"
 style={{ color: "var(--color-text-muted)" }}
 >
 {c.author}
 </td>
 <td
 className="px-4 py-3 text-xs"
 style={{ color: "var(--color-text-muted)" }}
 >
 {c.license}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <div
 className="mt-10 text-xs leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 <h3
 className="text-sm font-semibold mb-2"
 style={{ color: "var(--color-text)" }}
 >
 Other image sources
 </h3>
 <p className="mb-3">
 Stock photography for store products, profile portraits, and
 abstract backgrounds is sourced from{" "}
 <a
 href="https://unsplash.com/license"
 target="_blank"
 rel="noopener noreferrer"
 className="hover:underline"
 style={{ color: "var(--color-primary)" }}
 >
 Unsplash
 </a>
 , which is free to use for commercial and non-commercial purposes.
 </p>
 <p>
 The Darshya brand mark — the saffron shikhara enclosing a
 flame — is original artwork created for this project.
 </p>
 </div>

 <div
 className="mt-8 text-xs"
 style={{ color: "var(--color-text-muted)" }}
 >
 <p>
 Spotted an attribution that&apos;s wrong, or want to use one of
 these images yourself? Most Wikimedia Commons images can be
 freely used and re-used, provided you follow the original
 license. Click any subject above to see the full license text
 and downloadable original.
 </p>
 </div>
 </div>
 </section>
 </div>
 );
}
