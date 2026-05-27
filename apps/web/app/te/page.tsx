import type { Metadata } from 'next';
import { LangLanding } from '../../components/LangLanding';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'దర్శ్యా — భారతదేశం యొక్క ఆధ్యాత్మిక సూపర్ యాప్',
  description:
    'లైవ్ దర్శనం, పూజ బుకింగ్ (వీడియో రుజువుతో), పంచాంగం, సంస్కృతం, గురుకులం, గోసేవ — ఒకే చోట.',
  alternates: {
    canonical: 'https://darshya.online/te',
    languages: {
      en: 'https://darshya.online/',
      hi: 'https://darshya.online/hi',
      ta: 'https://darshya.online/ta',
      te: 'https://darshya.online/te',
      bn: 'https://darshya.online/bn',
      mr: 'https://darshya.online/mr',
    },
  },
  openGraph: {
    title: 'దర్శ్యా — ఆధ్యాత్మిక సూపర్ యాప్',
    description: 'లైవ్ దర్శనం, పూజ, పంచాంగం, గురుకులం, గోసేవ.',
    url: 'https://darshya.online/te',
    type: 'website',
    locale: 'te_IN',
    images: ['/og/default'],
  },
};

export default function TeluguLanding() {
  return (
    <LangLanding
      langCode="te"
      langTag="te_IN"
      pillText="సనాతన ధర్మం · దైనందిన తోడు"
      heroTitle="భారతదేశం యొక్క ఆధ్యాత్మిక సూపర్ యాప్"
      heroSubtitle="లైవ్ దర్శనం, పూజ బుకింగ్ (వీడియో రుజువుతో), పంచాంగం, సంస్కృతం, గురుకులం మరియు గోసేవ — ఒకే యాప్."
      ctaBookLabel="పూజ బుక్ చేయండి"
      ctaDarshanLabel="లైవ్ దర్శనం చూడండి"
      features={[
        { title: 'లైవ్ దర్శనం', body: 'కాశీ, తిరుపతి, సిద్ధివినాయక, సోమనాథ్ — ప్రముఖ ఆలయాల నుండి లైవ్ దర్శనం.', href: '/darshan' },
        { title: 'పూజ బుకింగ్', body: 'ధృవీకరించబడిన పండిత్, వీడియో రుజువు, 80G రసీదు. మీ పేరు మీద సంకల్పం.', href: '/pujas' },
        { title: 'రోజువారీ పంచాంగం', body: 'తిథి, నక్షత్రం, రాహుకాలం, చౌఘడియా — మీ నగరానికి అనుగుణంగా.', href: '/panchang' },
        { title: 'గోసేవ', body: 'గోదానం, మేత సేవ — ధృవీకరించబడిన గోశాలలకు నేరుగా విరాళం.', href: '/gaushala' },
        { title: 'గురుకులం', body: 'సాంప్రదాయ గురుకుల ప్రవేశం — సంస్కృతం, వేదం, తత్వశాస్త్రం.', href: '/gurukuls' },
        { title: 'AI పండిత్', body: 'మత ప్రశ్నలు, ముహూర్తం, శాస్త్ర సూచన — 24×7 అందుబాటులో.', href: '/ask-pandit' },
      ]}
      nriHeading="విదేశాల్లో నివసిస్తున్నారా?"
      nriBody="NRI ల కోసం ప్రత్యేక లేన్ — మీ పేరు మీద భారత ఆలయంలో పూజ, వీడియో రుజువు మీ WhatsApp లో. వార్షిక సభ్యత్వం ₹5000 / $60."
      nriCta="NRI ప్యాకేజీ చూడండి →"
      englishLink="English →"
      footerNote="పూర్తి తెలుగు అనువాదం పురోగతిలో ఉంది. చాలా పేజీలు ప్రస్తుతం ఆంగ్లంలో ఉన్నాయి."
      englishLinkFooter="ఆంగ్ల వెర్షన్ చూడండి →"
    />
  );
}
