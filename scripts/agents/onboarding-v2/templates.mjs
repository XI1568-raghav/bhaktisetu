// scripts/agents/onboarding-v2/templates.mjs
// Per-role per-touch templates. Founder reviews then sends.
// Vars: {{name}} {{city}} {{phone}} {{joinUrl}} {{aadhaarGateUrl}} {{videoProofTutUrl}}

export const TEMPLATES = {
  pundit: {
    day0_welcome: `Pranam {{name}} ji. Darshya pe register kar liye, dhanyavaad. Aapka onboarding 14 din ka hai. Kal Aadhaar KYC link aayega. Sawal ho to reply karein. — Darshya`,
    day1_aadhaar: `{{name}} ji, Aadhaar KYC link: {{aadhaarGateUrl}}. 5 min lagega. Iske baad payout enable hoga (business rule #4). — Darshya`,
    day3_first_puja_sim: `{{name}} ji, demo puja booking aapke profile pe assign kiya hai. Open: {{joinUrl}}/priest. Video proof workflow practice karein. — Darshya`,
    day7_video_proof_tut: `{{name}} ji, video proof MANDATORY hai every puja (business rule #1). Tutorial: {{videoProofTutUrl}}. 2 min ka video hai. — Darshya`,
    day14_nps: `{{name}} ji, 14 din ho gaye Darshya pe. Quick feedback: 1-10 mein kitna recommend karenge? Reply 1-10. — Darshya`,
  },
  temple: {
    day0_welcome: `Namaskar Temple Admin ({{name}}). Darshya pe registration approved. Aapka live darshan setup 3 din mein hoga. Setup guide: {{joinUrl}}/temple-portal/live-darshan. — Darshya`,
    day3_live_darshan_setup: `Live darshan setup link: {{joinUrl}}/temple-portal/live-darshan. YouTube Live ya IVS stream connect karein. Free tier OK. — Darshya`,
    day7_first_puja_invite: `Temple {{name}} live ho gaya. First Rudrabhishek booking aaye to confirm karein within 2h. Booking page: {{joinUrl}}/temple-portal/bookings. — Darshya`,
  },
  astrologer: {
    day0_welcome: `Namaste {{name}}. Darshya pe astrologer registration approved. First lead intro within 7 din. Profile: {{joinUrl}}/astrologer-portal. — Darshya`,
  },
  gaushala: {
    day0_welcome: `Namaskar {{name}} Gaushala. Darshya pe registration approved. Adopt-a-cow tier setup recommended (8% donor conversion). Setup: {{joinUrl}}/gaushala-portal. — Darshya`,
    day7_adopt_a_cow_setup: `{{name}} ji, adopt-a-cow tier setup link: {{joinUrl}}/gaushala-portal/cows. 5 cows photos + names = ready to monetize. — Darshya`,
  },
  gurukul: {
    day0_welcome: `Namaste {{name}} Gurukul. Darshya admissions portal: {{joinUrl}}/gurukul/admissions. First batch intake check 14 din mein. — Darshya`,
    day14_admissions_check: `{{name}} Gurukul: 14 din ho gaye. Admissions queries aayi? Check: {{joinUrl}}/gurukul/admissions/inbox. — Darshya`,
  },
  wellness: {
    day0_welcome: `Namaste {{name}}. Darshya wellness portal: {{joinUrl}}/wellness-portal. Class formats + pricing tiers setup karein. — Darshya`,
  },
  store: {
    day0_welcome: `Namaskar {{name}}. Darshya store portal: {{joinUrl}}/store-admin. 10 SKU starter recipe: {{joinUrl}}/docs/store-starter.md. — Darshya`,
  },
};
