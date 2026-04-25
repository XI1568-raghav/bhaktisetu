import { readFileSync, writeFileSync } from 'node:fs';

// Map: handle → new image URL (full URL string)
const HANDLE_TO_URL = {
  'premium-brass-puja-thali-set': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Hindu_pooja_thali.jpg',
  'handcrafted-brass-diya-pair': 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Indian_Arati_diya.jpg',
  'pure-sandalwood-incense-sticks': 'photo-1541795083-1b160cf4f3d7',
  'organic-camphor-250g': 'photo-1551690935-a9e6f0a7e788',
  'premium-kumkum-haldi-set': 'photo-1577563717655-919fc57789b4',
  '5-mukhi-rudraksha-mala': 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Rudraksha_mala.jpg',
  'tulsi-mala-silver-cap': 'https://upload.wikimedia.org/wikipedia/commons/2/20/Japa_mala_%28prayer_beads%29_of_Tulasi_wood_with_108_beads_-_20040101-01.jpg',
  'sphatik-crystal-mala': 'photo-1601824096525-954268b9eb72',
  'white-marble-ganesh-murti': 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Marble_Dagadusheth_Halwai_Ganapati_Statue_from_Maliyas.com_Jaipur_India.jpg',
  'brass-krishna-playing-flute': 'https://upload.wikimedia.org/wikipedia/commons/3/38/Brass_standing_figure_***REMOVED***._Wellcome_M0012566.jpg',
  'brass-lakshmi-idol-seated': 'https://upload.wikimedia.org/wikipedia/commons/9/98/The_Hindu_Goddess_Shri_Lakshmi_LACMA_M.87.210_%281_of_2%29.jpg',
  'complete-navratri-puja-kit': 'photo-1605292356183-a77d0a9c9d1d',
  'satyanarayan-puja-samagri': 'photo-1633368516165-f7b04d6428d1',
  'copper-kalash-coconut-set': 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Navratri_Kalash_Puja.jpg',
  'bhagavad-gita-deluxe-edition': 'https://upload.wikimedia.org/wikipedia/commons/3/34/Bhagavad_Gita_book_%28small%29_01.jpg',
  'hanuman-chalisa-deluxe': 'https://upload.wikimedia.org/wikipedia/commons/d/da/Hanuman_Chalisa_4x3.jpg',
  'sunderkand-with-commentary': 'https://upload.wikimedia.org/wikipedia/commons/d/da/Hanuman_Chalisa_4x3.jpg',
  'rudraksha-bracelet-silver': 'photo-1622993361118-b6365d859ab6',
  'om-pendant-gold-plated': 'photo-1747576129956-d8124fab8668',
  'a2-desi-cow-ghee-500ml': 'https://upload.wikimedia.org/wikipedia/commons/6/65/Pure_Ghee-Homemade-Maharashtra.jpg',
  'havan-samagri-premium-500g': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/%28A%29_puja_fire%2C_Havanam.jpg',
  'pure-chandan-paste-50g': 'photo-1595414902678-862fe51c9f27',
  'sheesham-wood-home-mandir': 'photo-1618897033742-4ad61a660b11',
  'electric-led-diya-set': 'photo-1513625047154-f390b1b0df20',
};

const filePath = 'apps/api/src/services/store.service.ts';
let content = readFileSync(filePath, 'utf8');
let replaced = 0;

for (const [handle, newImg] of Object.entries(HANDLE_TO_URL)) {
  // Find the product entry by handle, then replace its `images: [img('...', 'alt')]` line.
  const handleIdx = content.indexOf(`handle: '${handle}',`);
  if (handleIdx < 0) {
    console.warn(`! handle not found: ${handle}`);
    continue;
  }
  // Find the next `images: [img(` after this handle
  const imgRegex = /images:\s*\[img\('([^']+)',\s*'([^']+)'\)\]/g;
  imgRegex.lastIndex = handleIdx;
  const m = imgRegex.exec(content);
  if (!m) {
    console.warn(`! no images line after handle: ${handle}`);
    continue;
  }
  const alt = m[2];
  const replacement = `images: [img('${newImg}', '${alt}')]`;
  content = content.slice(0, m.index) + replacement + content.slice(m.index + m[0].length);
  replaced += 1;
}

writeFileSync(filePath, content);
console.log(`Replaced ${replaced}/${Object.keys(HANDLE_TO_URL).length} image refs.`);
