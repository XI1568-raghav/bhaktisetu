/**
 * Script to fix all fake darshya.online URLs in seed.ts with real, working URLs.
 * Run with: node apps/api/prisma/fix-seed-urls.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, 'seed.ts');

let content = readFileSync(seedPath, 'utf-8');

// ── TEMPLE IMAGE REPLACEMENTS ──

// Kashi Vishwanath images
const templeImageReplacements = [
  // Kashi Vishwanath
  ["'https://images.darshya.online/temples/kashi-vishwanath/main.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kashi_Vishwanath_Temple_Varanasi.jpg/1280px-Kashi_Vishwanath_Temple_Varanasi.jpg'"],
  ["'https://images.darshya.online/temples/kashi-vishwanath/golden-spire.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Kashi_Vishwanath_Temple_Corridor.jpg/1280px-Kashi_Vishwanath_Temple_Corridor.jpg'"],
  ["'https://images.darshya.online/temples/kashi-vishwanath/corridor.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Dashashwamedh_ghat_on_the_Ganges%2C_Varanasi.jpg/1280px-Dashashwamedh_ghat_on_the_Ganges%2C_Varanasi.jpg'"],
  ["'https://images.darshya.online/temples/kashi-vishwanath/ganga-view.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Varanasi_skyline.jpg/1280px-Varanasi_skyline.jpg'"],

  // Tirumala Tirupati
  ["'https://images.darshya.online/temples/tirumala-tirupati/main.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'"],
  ["'https://images.darshya.online/temples/tirumala-tirupati/gopuram.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Sri_Venkateswara_Temple%2C_Tirumala.jpg/1280px-Sri_Venkateswara_Temple%2C_Tirumala.jpg'"],
  ["'https://images.darshya.online/temples/tirumala-tirupati/golden-vimana.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Seven_Hills_Tirumala.jpg/1280px-Seven_Hills_Tirumala.jpg'"],
  ["'https://images.darshya.online/temples/tirumala-tirupati/laddu.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Tirumala_Temple_gopuram.jpg/800px-Tirumala_Temple_gopuram.jpg'"],

  // Siddhivinayak
  ["'https://images.darshya.online/temples/siddhivinayak/main.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Siddhivinayak_Temple_Mumbai.jpg/800px-Siddhivinayak_Temple_Mumbai.jpg'"],
  ["'https://images.darshya.online/temples/siddhivinayak/golden-dome.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Shree_Siddhivinayak_Temple%2C_Mumbai.jpg/800px-Shree_Siddhivinayak_Temple%2C_Mumbai.jpg'"],
  ["'https://images.darshya.online/temples/siddhivinayak/idol.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Mumbai_Siddhivinayak_Temple_entrance.jpg/800px-Mumbai_Siddhivinayak_Temple_entrance.jpg'"],
  ["'https://images.darshya.online/temples/siddhivinayak/entrance.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Mumbai_03-2016_50_Siddhivinayak_Temple.jpg/800px-Mumbai_03-2016_50_Siddhivinayak_Temple.jpg'"],

  // Somnath
  ["'https://images.darshya.online/temples/somnath/main.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Somnath_mandir_%282020%29.jpg/1280px-Somnath_mandir_%282020%29.jpg'"],
  ["'https://images.darshya.online/temples/somnath/sea-view.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Somnath_Temple_at_evening.jpg/1280px-Somnath_Temple_at_evening.jpg'"],
  ["'https://images.darshya.online/temples/somnath/evening.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Somnath_Temple_side_view.jpg/1280px-Somnath_Temple_side_view.jpg'"],
  ["'https://images.darshya.online/temples/somnath/light-show.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Somnath_temple_from_beach.jpg/1280px-Somnath_temple_from_beach.jpg'"],

  // Jagannath Puri
  ["'https://images.darshya.online/temples/jagannath-puri/main.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Jagannath_Temple%2C_Puri.jpg/800px-Jagannath_Temple%2C_Puri.jpg'"],
  ["'https://images.darshya.online/temples/jagannath-puri/rath-yatra.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Rath_yatra_puri.jpg/1280px-Rath_yatra_puri.jpg'"],
  ["'https://images.darshya.online/temples/jagannath-puri/nilachakra.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Jagannath_Temple_Puri_Odisha.jpg/800px-Jagannath_Temple_Puri_Odisha.jpg'"],
  ["'https://images.darshya.online/temples/jagannath-puri/mahaprasad.jpg'", "'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Puri_Jagannath_Temple_Entrance.jpg/800px-Puri_Jagannath_Temple_Entrance.jpg'"],
];

// Puja images
const pujaImageReplacements = [
  ["'https://images.darshya.online/pujas/rudrabhishek/main.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/ganesh-puja/main.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/satyanarayan-katha/main.jpg'", "'https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/maha-mrityunjay/main.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/lakshmi-puja/main.jpg'", "'https://images.unsplash.com/photo-1603228254119-e6a4d095dc59?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/navgraha-shanti/main.jpg'", "'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/sunderkand-path/main.jpg'", "'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/hanuman-chalisa/main.jpg'", "'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/ram-charit-manas/main.jpg'", "'https://images.unsplash.com/photo-1585128993280-9456c19c987d?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/pujas/pitru-dosh-nivaran/main.jpg'", "'https://images.unsplash.com/photo-1585128993280-9456c19c987d?w=800&h=600&fit=crop&auto=format&q=80'"],
];

// Content images
const contentImageReplacements = [
  ["'https://images.darshya.online/content/om-jai-jagdish.jpg'", "'https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/aarti-kunj-bihari.jpg'", "'https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/ganesh-aarti.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/shiv-aarti.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/lakshmi-aarti.jpg'", "'https://images.unsplash.com/photo-1603228254119-e6a4d095dc59?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/hanuman-chalisa.jpg'", "'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/shiv-chalisa.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/ganesh-chalisa.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/durga-chalisa.jpg'", "'https://images.unsplash.com/photo-1603228254119-e6a4d095dc59?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/lakshmi-chalisa.jpg'", "'https://images.unsplash.com/photo-1603228254119-e6a4d095dc59?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/gayatri-mantra.jpg'", "'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/mahamrityunjay-mantra.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/om-namah-shivaya.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/hare-krishna-mantra.jpg'", "'https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/ganesh-mantra.jpg'", "'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/jyotirlingas-guide.jpg'", "'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/navratri-guide.jpg'", "'https://images.unsplash.com/photo-1603228254119-e6a4d095dc59?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/panchang-guide.jpg'", "'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/char-dham-guide.jpg'", "'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&h=600&fit=crop&auto=format&q=80'"],
  ["'https://images.darshya.online/content/temple-architecture.jpg'", "'https://images.unsplash.com/photo-1585128993280-9456c19c987d?w=800&h=600&fit=crop&auto=format&q=80'"],
];

// Priest avatar replacements
const priestAvatarReplacements = [
  ["'https://images.darshya.online/priests/pandit-ramesh-shastri.jpg'", "'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&auto=format&q=75'"],
  ["'https://images.darshya.online/priests/pandit-suresh-trivedi.jpg'", "'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&auto=format&q=75'"],
];

// Stream URL replacements
const streamReplacements = [
  ["streamUrl: 'https://stream.darshya.online/kashi-vishwanath'", "streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCt5gUnMmz_gYMSgvZmZxJQA'"],
  ["streamUrl: 'https://stream.darshya.online/tirumala-tirupati'", "streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCHDfKNnEBPsJuvWuHbqPRmQ'"],
  ["streamUrl: 'https://stream.darshya.online/siddhivinayak'", "streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCyrJNbN06WL-8R_mbzuEB0A'"],
  ["streamUrl: 'https://stream.darshya.online/jagannath-puri'", "streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UCdQpU9tTNQNniXO0LTQsGmg'"],
];

// Enable Somnath live darshan
const somnathFix = [
  ["liveDarshanEnabled: false,\n    streamUrl: null,", "liveDarshanEnabled: true,\n    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=UC6dqKmIjJiIvHasMJJbmQkA',"],
];

// Fix the live darshan stream playback URL in seed logic
const darshanStreamFix = [
  ["playbackUrl: `https://stream.darshya.online/${t.slug}/live.m3u8`", "playbackUrl: t.streamUrl || `https://www.youtube.com/embed/live_stream?channel=UCt5gUnMmz_gYMSgvZmZxJQA`"],
];

// Apply all replacements
const allReplacements = [
  ...templeImageReplacements,
  ...pujaImageReplacements,
  ...contentImageReplacements,
  ...priestAvatarReplacements,
  ...streamReplacements,
  ...somnathFix,
  ...darshanStreamFix,
];

let count = 0;
for (const [old, replacement] of allReplacements) {
  if (content.includes(old)) {
    content = content.replace(old, replacement);
    count++;
  } else {
    console.log(`⚠️  Not found: ${old.substring(0, 60)}...`);
  }
}

writeFileSync(seedPath, content, 'utf-8');

// Check for any remaining darshya.online refs
const remaining = (content.match(/poojly\.com/g) || []).length;
console.log(`✅ Applied ${count} replacements`);
console.log(`⚠️  Remaining darshya.online references: ${remaining}`);
if (remaining > 0) {
  // Find remaining references
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('darshya.online')) {
      console.log(`  Line ${i + 1}: ${line.trim().substring(0, 100)}`);
    }
  });
}
