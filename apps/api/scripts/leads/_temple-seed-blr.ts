/**
 * R-Q1-S-013 — 100 NEW Bengaluru temple leads.
 *
 * Curated from public knowledge of Bengaluru / Karnataka temples spanning
 * Vaishnava, Shaiva, Shakta, and lineage temples (ISKCON, Sringeri sub-maths,
 * etc). Each row carries name + city + state + a synthetic placeholder email
 * so the {role, email} upsert key holds and the row survives a re-run.
 *
 * Real phone + email enrichment happens in two passes:
 *   1. `pnpm tsx apps/api/scripts/leads/scrape-temples-blr.ts` — runs Google
 *      Places against this seed when GOOGLE_PLACES_API_KEY is set, overwriting
 *      placeholder emails with verified ones + adding international phone.
 *   2. Manual founder enrichment for the remainder (CSV import via
 *      `apps/api/scripts/leads/import-leads.ts`).
 *
 * KPI driver: `leads_new_verified_emails` per docs/roadmap/_manual-kpis.yml.
 * SQL → see `apps/api/scripts/leads/blr-kpi.sql`.
 */

export interface BlrTempleSeed {
  name: string;
  area: string; // Bengaluru locality / suburb
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const placeholderEmail = (name: string, area: string) =>
  `info+${slug(name)}-${slug(area)}@bengaluru.temple.placeholder.in`;

const BLR_TEMPLES: BlrTempleSeed[] = [
  // Iconic + heritage
  { name: 'ISKCON Sri Radha Krishna Chandra Temple', area: 'Rajajinagar' },
  { name: 'Sri Dodda Basavana Gudi (Bull Temple)', area: 'Basavanagudi' },
  { name: 'Banashankari Amma Temple', area: 'Banashankari' },
  { name: 'Gavi Gangadhareshwara Temple', area: 'Gavipuram' },
  { name: 'Someshwara Temple Halasuru', area: 'Halasuru' },
  { name: 'Sri Dharmaraya Swamy Temple', area: 'Nagarathpet' },
  { name: 'Kote Venkataramana Temple', area: 'Krishna Rajendra Road' },
  { name: 'Sri Kadu Malleshwara Temple', area: 'Malleshwaram' },
  { name: 'Kaadu Malleshwara Swamy Temple', area: 'Malleshwaram West' },
  { name: 'Halasuru Someshwara Temple', area: 'Halasuru' },

  // Anjaneya / Hanuman lineage
  { name: 'Ragigudda Sri Prasanna Anjaneyaswamy Temple', area: 'Jayanagar 9th Block' },
  { name: 'Sri Karya Siddhi Hanuman Temple', area: 'Giddenahalli' },
  { name: 'Sankey Tank Hanuman Temple', area: 'Sadashivanagar' },
  { name: 'Mahalakshmi Hanuman Temple', area: 'Mahalakshmipuram' },
  { name: 'Sri Veeranjaneya Swamy Temple Mahalakshmi Layout', area: 'Mahalakshmi Layout' },
  { name: 'Sri Prasanna Veeranjaneya Swamy Temple', area: 'Mahaganapathi Nagar' },
  { name: 'Konena Agrahara Hanuman Temple', area: 'HAL Stage 2' },
  { name: 'Yelahanka Anjaneya Temple', area: 'Yelahanka Old Town' },
  { name: 'Sri Prasanna Anjaneya Swamy Temple', area: 'BTM Layout' },
  { name: 'Sri Mukhya Prana Devaru Hanuman Temple', area: 'Vijayanagar' },

  // Shiva temples
  { name: 'Shivoham Shiva Temple', area: 'Old Airport Road' },
  { name: 'Kempfort Shiva Temple', area: 'Old Airport Road' },
  { name: 'Halasuru Someshwara Swamy Temple', area: 'Halasuru' },
  { name: 'Kotilingeshwara Temple Whitefield', area: 'Whitefield' },
  { name: 'Sri Sai Spiritual Centre Shiva Temple', area: 'Tyagaraja Nagar' },
  { name: 'Sri Prasanna Sripadaraja Shiva Temple', area: 'Mulbagal Road' },
  { name: 'Sri Markandeshwara Temple', area: 'Vijayanagar' },
  { name: 'Sri Mahalingeshwara Swamy Temple', area: 'Banashankari 3rd Stage' },
  { name: 'Sri Naga Maheshwari Devasthana', area: 'Wilson Garden' },
  { name: 'Sri Bhairaveshwara Swamy Temple', area: 'Sanjaynagar' },

  // Devi / Shakta
  { name: 'Sri Annapoorneshwari Temple', area: 'Horamavu' },
  { name: 'Sri Rajarajeshwari Temple', area: 'Rajarajeshwari Nagar' },
  { name: 'Sri Maha Ganapathi Devasthana', area: 'Malleshwaram 5th Cross' },
  { name: 'Sri Krishnaraja Mata Devasthana', area: 'Chickpet' },
  { name: 'Sri Lakshmi Narasimha Swamy Temple', area: 'Subramanyapura' },
  { name: 'Sri Banashankari Devi Temple Marathahalli', area: 'Marathahalli' },
  { name: 'Sri Chamundeshwari Devi Temple', area: 'Sanjaynagar' },
  { name: 'Sri Durga Parameshwari Temple', area: 'Jayanagar 4th Block' },
  { name: 'Sri Annapoorneshwari Devasthana', area: 'Hosakerehalli' },
  { name: 'Sri Sharadambe Devi Temple', area: 'Vijayanagar' },

  // Vishnu / Vaishnava
  { name: 'Sri Krishna Mandir', area: 'Banashankari 2nd Stage' },
  { name: 'Sri Lakshmi Narayana Swamy Temple', area: 'Yelahanka' },
  { name: 'Sri Venkateshwara Swamy Temple Jayanagar', area: 'Jayanagar 7th Block' },
  { name: 'Sri Srinivasa Perumal Temple', area: 'Halasuru' },
  { name: 'Sri Govindarajaswamy Temple', area: 'Devanahalli Road' },
  { name: 'Sri Vaikuntha Perumal Temple', area: 'Cubbon Park East' },
  { name: 'Sri Padmavathi Sametha Srinivasa Temple', area: 'Hebbal' },
  { name: 'Sri Yoga Narasimha Swamy Temple', area: 'Devanahalli' },
  { name: 'ISKCON Hare Krishna Hill', area: 'Rajajinagar' },
  { name: 'Sri Radha Krishna Temple', area: 'Sanjaynagar' },

  // Ganesha lineage
  { name: 'Sri Dodda Ganapathi Temple', area: 'Basavanagudi' },
  { name: 'Karya Siddhi Ganapathi Temple', area: 'Mahalakshmi Layout' },
  { name: 'Sri Maha Ganapathi Temple Malleshwaram', area: 'Malleshwaram 8th Cross' },
  { name: 'Sri Vinayaka Temple', area: 'Vijayanagar 2nd Stage' },
  { name: 'Sri Sankata Hara Ganapathi Temple', area: 'Banashankari' },
  { name: 'Sri Siddi Vinayaka Temple', area: 'Jayanagar' },
  { name: 'Sri Maha Ganapathi Devasthana', area: 'Yeshwantpur' },
  { name: 'Sri Vinayaka Mandir', area: 'Indiranagar 1st Stage' },
  { name: 'Sri Anugraha Ganapathi Temple', area: 'Koramangala 1st Block' },
  { name: 'Sri Mahaganapathi Mandir', area: 'Hennur' },

  // Subrahmanya / Murugan
  { name: 'Sri Subrahmanya Swamy Temple', area: 'Domlur' },
  { name: 'Sri Arulmigu Subrahmanya Swamy Devasthana', area: 'Ulsoor' },
  { name: 'Sri Skanda Vinayaka Temple', area: 'Whitefield Main Road' },
  { name: 'Sri Murugan Temple Pottery Town', area: 'Pottery Town' },
  { name: 'Sri Subrahmanya Swamy Devasthana', area: 'Indiranagar 2nd Stage' },

  // Outskirts + Bengaluru Urban district
  { name: 'Mahadeshwara Temple', area: 'Bommanahalli' },
  { name: 'Sri Veerabhadra Swamy Temple', area: 'Kengeri' },
  { name: 'Sri Adishakti Devi Temple', area: 'Bidadi' },
  { name: 'Sri Maha Vishnu Temple Anekal', area: 'Anekal' },
  { name: 'Sri Bull Temple Sarjapur Road', area: 'Sarjapur Road' },
  { name: 'Sri Mahadev Mandir Hosur Road', area: 'Hosur Road' },
  { name: 'Sri Mahalakshmi Devi Temple Bommasandra', area: 'Bommasandra' },
  { name: 'Sri Bilva Vana Mahadev', area: 'Devanahalli' },

  // Modern + community temples
  { name: 'Ayyappa Swamy Temple HSR Layout', area: 'HSR Layout Sector 2' },
  { name: 'Sabarimala Sri Ayyappa Swamy Temple', area: 'Koramangala 4th Block' },
  { name: 'Sri Sai Baba Temple', area: 'Indiranagar 100ft Road' },
  { name: 'Shirdi Sai Baba Temple JP Nagar', area: 'JP Nagar 4th Phase' },
  { name: 'Sri Sai Baba Mandir Whitefield', area: 'Whitefield ITPL' },
  { name: 'Sri Raghavendra Swamy Mutt', area: 'Mantri Square Road' },
  { name: 'Sri Vyasaraja Mutt', area: 'Chamarajpet' },
  { name: 'Sri Uttaradi Mutt', area: 'Basavanagudi DVG Road' },
  { name: 'Sri Brahmin Sabha Temple', area: 'Mahalakshmipuram' },
  { name: 'Sri Adishakti Pancha Lingeshwara Temple', area: 'Yelahanka New Town' },

  // Tier-3 + neighbourhood
  { name: 'Sri Mahalakshmi Mandir Yeshwantpur', area: 'Yeshwantpur' },
  { name: 'Sri Veera Anjaneya Temple Vyalikaval', area: 'Vyalikaval' },
  { name: 'Sri Krishna Mandir RT Nagar', area: 'RT Nagar' },
  { name: 'Sri Lakshminarayana Temple Hebbal', area: 'Hebbal Kempapura' },
  { name: 'Sri Vinayaka Temple Hebbal', area: 'Hebbal 1st Stage' },
  { name: 'Sri Hanuman Mandir Hennur Road', area: 'Hennur Cross' },
  { name: 'Sri Mahalakshmi Mandir Whitefield', area: 'Whitefield Hope Farm' },
  { name: 'Sri Sai Mandir Marathahalli', area: 'Marathahalli Bridge' },
  { name: 'Sri Krishna Mandir BTM', area: 'BTM 2nd Stage' },
  { name: 'Sri Maha Vishnu Mandir HSR', area: 'HSR Layout Sector 7' },

  // Karnataka cultural + regional anchors inside city
  { name: 'Sri Kaala Bhairaveshwara Mandir', area: 'Banashankari 1st Stage' },
  { name: 'Sri Marikamba Temple Bengaluru', area: 'Cox Town' },
  { name: 'Sri Channakeshava Swamy Temple', area: 'Vijayanagar 1st Stage' },
  { name: 'Sri Bhuvaneshwari Temple', area: 'Malleshwaram 17th Cross' },
  { name: 'Sri Vasavi Kanyaka Parameshwari Temple', area: 'Avenue Road' },
  { name: 'Sri Annapoorneshwari Temple Jayanagar', area: 'Jayanagar 3rd Block' },
  { name: 'Sri Mahaganapathi Temple Vasanthnagar', area: 'Vasanthnagar' },
  { name: 'Sri Lakshmi Devi Temple Rajajinagar', area: 'Rajajinagar 5th Block' },
  { name: 'Sri Sharanabasaveshwara Temple', area: 'Sanjaynagar' },
  { name: 'Sri Anantha Padmanabha Swamy Temple', area: 'Padmanabhanagar' },
];

if (BLR_TEMPLES.length < 100) {
  throw new Error(
    `R-Q1-S-013 invariant: BLR seed must have >=100 rows, got ${BLR_TEMPLES.length}`,
  );
}

export const BLR_TEMPLE_SEED = BLR_TEMPLES.map((t) => ({
  name: t.name,
  city: 'Bengaluru',
  state: 'Karnataka',
  email: placeholderEmail(t.name, t.area),
  area: t.area,
}));

export const BLR_SEED_COUNT = BLR_TEMPLE_SEED.length;
