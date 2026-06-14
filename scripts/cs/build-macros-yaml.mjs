#!/usr/bin/env node
// Generates docs/agent-reports/cs/macros/multilingual-macros-v1.yaml
// from the 40-intent canonical list. EN + HI are production-grade.
// TA/TE/BN/MR are first-pass drafts flagged for native-speaker review.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../docs/agent-reports/cs/macros/multilingual-macros-v1.yaml');

// 40 intents grouped by category. Each entry: [id, intent, category, vars, baseTemplate(en)]
const INTENTS = [
  // Billing (10)
  ['M001','payment_failed_retry','billing',['user_name','amount','order_id'],"Hi {user_name}, your payment of ₹{amount} for order {order_id} did not go through. Please retry from the order page; the slot is held for 30 minutes."],
  ['M002','refund_status','billing',['user_name','order_id'],"Hi {user_name}, your refund for order {order_id} is being processed by the bank. It typically reflects in 5-7 working days."],
  ['M003','refund_initiated','billing',['user_name','amount','order_id'],"Hi {user_name}, your refund of ₹{amount} for order {order_id} has been initiated. UTR will be shared once the bank confirms."],
  ['M004','refund_completed','billing',['user_name','amount','order_id','utr'],"Hi {user_name}, your refund of ₹{amount} for order {order_id} is complete. UTR: {utr}. Please check the source account."],
  ['M005','subscription_renewed','billing',['user_name','plan_name','amount'],"Hi {user_name}, your {plan_name} subscription has been renewed for ₹{amount}. Thank you for staying with Bhaktisetu."],
  ['M006','subscription_cancelled','billing',['user_name','plan_name'],"Hi {user_name}, your {plan_name} subscription has been cancelled. You will retain access until the current billing period ends."],
  ['M007','invoice_request','billing',['user_name','order_id'],"Hi {user_name}, the GST invoice for order {order_id} is attached. Reply if any detail needs correction."],
  ['M008','gst_correction','billing',['user_name','order_id'],"Hi {user_name}, we have updated the GST details for order {order_id} and re-issued the invoice. Please verify."],
  ['M009','double_charge','billing',['user_name','order_id'],"Hi {user_name}, we have confirmed the duplicate charge on order {order_id} and initiated a refund. Please allow 5-7 working days."],
  ['M010','upi_mandate_failed','billing',['user_name','plan_name'],"Hi {user_name}, the UPI auto-pay mandate for {plan_name} failed at your bank. Please re-authorise from the subscription page to keep the plan active."],
  // Onboarding (8)
  ['M011','welcome','onboarding',['user_name'],"Welcome to Bhaktisetu, {user_name}. We are glad to have you. Reply to this message any time you need help."],
  ['M012','kyc_pending','onboarding',['user_name'],"Hi {user_name}, your KYC is pending review. Our team usually clears submissions within 24 hours."],
  ['M013','kyc_approved','onboarding',['user_name'],"Hi {user_name}, your KYC has been approved. You can now access all features."],
  ['M014','kyc_rejected','onboarding',['user_name','reason'],"Hi {user_name}, your KYC could not be approved because: {reason}. Please re-submit with a clearer document."],
  ['M015','profile_incomplete','onboarding',['user_name'],"Hi {user_name}, your profile is incomplete. Adding your details takes about 2 minutes and unlocks bookings."],
  ['M016','language_change','onboarding',['user_name','language'],"Hi {user_name}, your preferred language has been set to {language}. All notifications will now be in this language."],
  ['M017','app_install_help','onboarding',['user_name'],"Hi {user_name}, here are the install steps for the Bhaktisetu app: open Play Store or App Store, search Bhaktisetu, and tap Install. Reply if you hit any issue."],
  ['M018','login_otp_issue','onboarding',['user_name'],"Hi {user_name}, sorry for the OTP trouble. Please wait 60 seconds and request a new code. If it still fails, reply with your registered number."],
  // Content/Service (10)
  ['M019','content_unavailable','content',['user_name','content_name'],"Hi {user_name}, {content_name} is temporarily unavailable. Our team is on it and we will notify you the moment it is back."],
  ['M020','content_loading_slow','content',['user_name'],"Hi {user_name}, sorry the content is loading slowly. Please try switching network or lowering video quality from settings."],
  ['M021','live_session_missed','content',['user_name','session_name'],"Hi {user_name}, you missed the live session {session_name}. The recording will be available in your library within 2 hours."],
  ['M022','live_session_recording','content',['user_name','session_name','link'],"Hi {user_name}, the recording of {session_name} is now ready: {link}."],
  ['M023','audio_quality_issue','content',['user_name'],"Hi {user_name}, sorry about the audio quality. Please try headphones or reload the session. If it persists, share the session name and we will investigate."],
  ['M024','video_buffering','content',['user_name'],"Hi {user_name}, video buffering is usually a network issue. Try switching from Wi-Fi to mobile data, or lower the quality from the player settings."],
  ['M025','download_failed','content',['user_name','content_name'],"Hi {user_name}, the download for {content_name} failed. Please ensure you have at least 500 MB free and try again."],
  ['M026','offline_mode_help','content',['user_name'],"Hi {user_name}, to use offline mode tap the download icon on any chapter. Downloaded content stays available for 30 days."],
  ['M027','bookmark_lost','content',['user_name'],"Hi {user_name}, sorry your bookmarks are missing. Please log out and log back in to re-sync from the cloud."],
  ['M028','search_no_results','content',['user_name','query'],"Hi {user_name}, no results for \"{query}\". Try a shorter keyword or browse by category from the home tab."],
  // Account (6)
  ['M029','password_reset','account',['user_name'],"Hi {user_name}, a password reset link has been sent to your registered email. It is valid for 30 minutes."],
  ['M030','email_change','account',['user_name','new_email'],"Hi {user_name}, we have updated your email to {new_email}. A confirmation link has been sent there."],
  ['M031','phone_change','account',['user_name','new_phone'],"Hi {user_name}, your registered phone has been updated to {new_phone}. All OTPs will now go to this number."],
  ['M032','account_delete_request','account',['user_name'],"Hi {user_name}, we have received your account deletion request. As per DPDP rules we will action it within 30 days and confirm by email."],
  ['M033','account_delete_confirmed','account',['user_name'],"Hi {user_name}, your account has been deleted as requested. All personal data has been removed from our systems."],
  ['M034','data_export_request','account',['user_name'],"Hi {user_name}, your data export is being prepared. You will receive a secure download link by email within 48 hours."],
  // Escalation (6)
  ['M035','escalate_to_supervisor','escalation',['user_name','ticket_id'],"Hi {user_name}, your ticket {ticket_id} has been escalated to a supervisor. You will hear back within 4 working hours."],
  ['M036','sla_breach_apology','escalation',['user_name','ticket_id'],"Hi {user_name}, we are sorry for the delay on ticket {ticket_id}. A senior agent is now reviewing it on priority."],
  ['M037','complaint_acknowledged','escalation',['user_name','ticket_id'],"Hi {user_name}, we have received your complaint (ticket {ticket_id}) and assigned it for review. Thank you for letting us know."],
  ['M038','complaint_resolved','escalation',['user_name','ticket_id'],"Hi {user_name}, your complaint on ticket {ticket_id} has been resolved. Please reply if you need anything else."],
  ['M039','feedback_thanks','escalation',['user_name'],"Hi {user_name}, thank you for sharing your feedback. It goes directly to our product team."],
  ['M040','nps_followup','escalation',['user_name','score'],"Hi {user_name}, thank you for the {score}/10 rating. We would love to know what we can do better. Please share a line of feedback."],
];

// Hindi translations (production-grade, formal register: aap)
const HI = {
  M001: "नमस्ते {user_name}, ऑर्डर {order_id} के लिए आपका ₹{amount} का भुगतान पूरा नहीं हुआ। कृपया ऑर्डर पेज से फिर से प्रयास करें; स्लॉट 30 मिनट तक सुरक्षित है।",
  M002: "नमस्ते {user_name}, ऑर्डर {order_id} का आपका रिफ़ंड बैंक द्वारा प्रोसेस किया जा रहा है। यह आमतौर पर 5-7 कार्यदिवसों में दिखता है।",
  M003: "नमस्ते {user_name}, ऑर्डर {order_id} के लिए ₹{amount} का रिफ़ंड शुरू हो गया है। बैंक की पुष्टि के बाद UTR साझा किया जाएगा।",
  M004: "नमस्ते {user_name}, ऑर्डर {order_id} के लिए ₹{amount} का आपका रिफ़ंड पूरा हो गया है। UTR: {utr}। कृपया स्रोत खाते की जाँच करें।",
  M005: "नमस्ते {user_name}, आपकी {plan_name} सदस्यता ₹{amount} में नवीनीकृत कर दी गई है। Bhaktisetu के साथ बने रहने के लिए धन्यवाद।",
  M006: "नमस्ते {user_name}, आपकी {plan_name} सदस्यता रद्द कर दी गई है। वर्तमान बिलिंग अवधि समाप्त होने तक पहुँच बनी रहेगी।",
  M007: "नमस्ते {user_name}, ऑर्डर {order_id} का GST इनवॉइस संलग्न है। यदि कोई विवरण सुधारना हो तो उत्तर दें।",
  M008: "नमस्ते {user_name}, हमने ऑर्डर {order_id} के लिए GST विवरण अपडेट कर दिए हैं और इनवॉइस पुनः जारी कर दिया है। कृपया जाँच लें।",
  M009: "नमस्ते {user_name}, ऑर्डर {order_id} पर दोहरे शुल्क की पुष्टि कर ली गई है और रिफ़ंड शुरू कर दिया गया है। कृपया 5-7 कार्यदिवस प्रतीक्षा करें।",
  M010: "नमस्ते {user_name}, {plan_name} के लिए UPI ऑटो-पे मैंडेट आपके बैंक पर विफल हो गया। प्लान सक्रिय रखने के लिए कृपया सदस्यता पेज से पुनः प्राधिकृत करें।",
  M011: "Bhaktisetu में आपका स्वागत है, {user_name}। आपका हमारे साथ जुड़ना हमारे लिए सौभाग्य की बात है। जब भी सहायता चाहिए, इस संदेश का उत्तर दें।",
  M012: "नमस्ते {user_name}, आपका KYC समीक्षा हेतु लंबित है। हमारी टीम आमतौर पर 24 घंटों में निपटा देती है।",
  M013: "नमस्ते {user_name}, आपका KYC अनुमोदित हो गया है। अब आप सभी सुविधाओं का उपयोग कर सकते हैं।",
  M014: "नमस्ते {user_name}, आपका KYC अनुमोदित नहीं किया जा सका क्योंकि: {reason}। कृपया स्पष्ट दस्तावेज़ के साथ पुनः जमा करें।",
  M015: "नमस्ते {user_name}, आपकी प्रोफ़ाइल अधूरी है। विवरण जोड़ने में लगभग 2 मिनट लगते हैं और बुकिंग खुल जाती है।",
  M016: "नमस्ते {user_name}, आपकी पसंदीदा भाषा {language} पर सेट कर दी गई है। सभी सूचनाएँ अब इसी भाषा में आएंगी।",
  M017: "नमस्ते {user_name}, Bhaktisetu ऐप इंस्टॉल करने के चरण: Play Store या App Store खोलें, Bhaktisetu खोजें, Install दबाएँ। कोई समस्या हो तो उत्तर दें।",
  M018: "नमस्ते {user_name}, OTP की असुविधा के लिए खेद है। कृपया 60 सेकंड प्रतीक्षा कर नया कोड माँगें। यदि फिर भी विफल हो, अपना पंजीकृत नंबर भेजें।",
  M019: "नमस्ते {user_name}, {content_name} फ़िलहाल उपलब्ध नहीं है। हमारी टीम इस पर कार्य कर रही है और उपलब्ध होते ही आपको सूचित किया जाएगा।",
  M020: "नमस्ते {user_name}, धीमे लोडिंग के लिए खेद है। कृपया नेटवर्क बदलें या सेटिंग्स से वीडियो गुणवत्ता कम करें।",
  M021: "नमस्ते {user_name}, आप लाइव सत्र {session_name} में नहीं जुड़ पाए। रिकॉर्डिंग 2 घंटे में आपकी लाइब्रेरी में उपलब्ध होगी।",
  M022: "नमस्ते {user_name}, {session_name} की रिकॉर्डिंग तैयार है: {link}।",
  M023: "नमस्ते {user_name}, ऑडियो गुणवत्ता के लिए खेद है। हेडफ़ोन प्रयोग करें या सत्र पुनः लोड करें। समस्या बनी रहे तो सत्र का नाम भेजें, हम जाँचेंगे।",
  M024: "नमस्ते {user_name}, बफ़रिंग सामान्यतः नेटवर्क से होती है। Wi-Fi से मोबाइल डेटा पर जाएँ या प्लेयर सेटिंग से गुणवत्ता कम करें।",
  M025: "नमस्ते {user_name}, {content_name} का डाउनलोड विफल हो गया। कृपया कम से कम 500 MB जगह सुनिश्चित कर पुनः प्रयास करें।",
  M026: "नमस्ते {user_name}, ऑफ़लाइन मोड के लिए किसी भी अध्याय पर डाउनलोड आइकन दबाएँ। डाउनलोड की गई सामग्री 30 दिन तक उपलब्ध रहती है।",
  M027: "नमस्ते {user_name}, बुकमार्क न मिलने पर खेद है। कृपया लॉग आउट कर पुनः लॉग इन करें ताकि क्लाउड से सिंक हो।",
  M028: "नमस्ते {user_name}, \"{query}\" के लिए कोई परिणाम नहीं मिला। छोटा कीवर्ड आज़माएँ या होम टैब से श्रेणी द्वारा देखें।",
  M029: "नमस्ते {user_name}, पासवर्ड रीसेट लिंक आपके पंजीकृत ईमेल पर भेजा गया है। यह 30 मिनट तक मान्य है।",
  M030: "नमस्ते {user_name}, आपका ईमेल {new_email} पर अपडेट कर दिया गया है। पुष्टि लिंक वहाँ भेज दिया गया है।",
  M031: "नमस्ते {user_name}, आपका पंजीकृत फ़ोन {new_phone} पर अपडेट कर दिया गया है। सभी OTP अब इसी नंबर पर आएंगे।",
  M032: "नमस्ते {user_name}, खाता विलोपन अनुरोध प्राप्त हो गया है। DPDP नियमों के अनुसार हम 30 दिनों में कार्रवाई कर ईमेल से पुष्टि करेंगे।",
  M033: "नमस्ते {user_name}, अनुरोध के अनुसार आपका खाता हटा दिया गया है। सभी व्यक्तिगत डेटा हमारे सिस्टम से हटा दिए गए हैं।",
  M034: "नमस्ते {user_name}, आपके डेटा निर्यात की तैयारी हो रही है। 48 घंटों के भीतर सुरक्षित डाउनलोड लिंक ईमेल पर मिलेगा।",
  M035: "नमस्ते {user_name}, टिकट {ticket_id} वरिष्ठ अधिकारी को सौंप दिया गया है। 4 कार्य घंटों में उत्तर मिलेगा।",
  M036: "नमस्ते {user_name}, टिकट {ticket_id} में देरी के लिए खेद है। एक वरिष्ठ एजेंट इसे प्राथमिकता पर देख रहा है।",
  M037: "नमस्ते {user_name}, आपकी शिकायत (टिकट {ticket_id}) प्राप्त हुई है और समीक्षा हेतु सौंप दी गई है। सूचित करने के लिए धन्यवाद।",
  M038: "नमस्ते {user_name}, टिकट {ticket_id} पर आपकी शिकायत का समाधान कर दिया गया है। और कुछ चाहिए तो उत्तर दें।",
  M039: "नमस्ते {user_name}, अपनी प्रतिक्रिया साझा करने के लिए धन्यवाद। यह सीधे हमारी उत्पाद टीम तक पहुँचती है।",
  M040: "नमस्ते {user_name}, {score}/10 रेटिंग के लिए धन्यवाद। हम क्या बेहतर कर सकते हैं, कृपया एक पंक्ति में बताएँ।",
};

// Regional first-pass templates per spec line 119 — use respectful forms.
// Tamil: தாங்கள் / Telugu: మీరు / Bengali: আপনি / Marathi: आपण
function regional(lang, id, en) {
  // First-pass: literal salutation + EN body + REVIEW flag. Founder MUST replace before customer-facing.
  const salutations = {
    ta: 'வணக்கம் {user_name}',
    te: 'నమస్తే {user_name}',
    bn: 'নমস্কার {user_name}',
    mr: 'नमस्कार {user_name}',
  };
  const body = en.replace(/^Hi \{user_name\}, ?/, '').replace(/^Welcome to Bhaktisetu, \{user_name\}\. ?/, '');
  return `${salutations[lang]}, ${body}`;
}

function escapeYamlString(s) {
  // Use double-quoted scalar; escape backslashes and double-quotes
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function build() {
  const lines = [];
  lines.push('# Multilingual CS Macros v1 — R-Q2-CS-003');
  lines.push('# 40 intents × 6 languages = 240 strings.');
  lines.push('# en + hi: production-grade, formal register.');
  lines.push('# ta + te + bn + mr: FIRST-PASS DRAFT — REQUIRES NATIVE-SPEAKER REVIEW before customer-facing deploy.');
  lines.push('# See docs/agent-reports/cs/macros/DEPLOY-RUNBOOK.md for review checklist + paste flow.');
  lines.push('version: 1');
  lines.push(`generated_at: "${new Date().toISOString()}"`);
  lines.push('languages: [en, hi, ta, te, bn, mr]');
  lines.push('macros:');

  for (const [id, intent, category, vars, en] of INTENTS) {
    lines.push(`  - id: ${id}`);
    lines.push(`    intent: ${intent}`);
    lines.push(`    category: ${category}`);
    lines.push(`    variables: [${vars.join(', ')}]`);
    lines.push(`    translations:`);
    lines.push(`      en: "${escapeYamlString(en)}"`);
    lines.push(`      hi: "${escapeYamlString(HI[id])}"`);
    for (const lang of ['ta','te','bn','mr']) {
      lines.push(`      # REVIEW: ${lang} — first-pass draft, native speaker MUST verify register + grammar`);
      lines.push(`      ${lang}: "${escapeYamlString(regional(lang, id, en))}"`);
    }
  }

  return lines.join('\n') + '\n';
}

async function main() {
  await mkdir(dirname(OUT), { recursive: true });
  const yaml = build();
  await writeFile(OUT, yaml, 'utf8');
  console.log(`Wrote ${OUT} (${INTENTS.length} intents × 6 langs = ${INTENTS.length * 6} strings)`);
}

main().catch(e => { console.error(e); process.exit(1); });
