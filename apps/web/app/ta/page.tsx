import type { Metadata } from 'next';
import { LangLanding } from '../../components/LangLanding';


export const metadata: Metadata = {
  title: 'தர்ஷ்யா — இந்தியாவின் ஆன்மீக சூப்பர் ஆப்',
  description:
    'நேரலை தரிசனம், பூஜை முன்பதிவு (வீடியோ ஆதாரத்துடன்), பஞ்சாங்கம், சம்ஸ்கிருதம், குருகுலம், கோ சேவை — ஒரே இடத்தில்.',
  alternates: {
    canonical: 'https://darshya.online/ta',
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
    title: 'தர்ஷ்யா — ஆன்மீக சூப்பர் ஆப்',
    description: 'நேரலை தரிசனம், பூஜை, பஞ்சாங்கம், குருகுலம், கோ சேவை.',
    url: 'https://darshya.online/ta',
    type: 'website',
    locale: 'ta_IN',
    images: ['/og/default'],
  },
};

export default function TamilLanding() {
  return (
    <LangLanding
      langCode="ta"
      langTag="ta_IN"
      pillText="சனாதன தர்மம் · தினசரி துணை"
      heroTitle="இந்தியாவின் ஆன்மீக சூப்பர் ஆப்"
      heroSubtitle="நேரலை தரிசனம், பூஜை முன்பதிவு (வீடியோ ஆதாரத்துடன்), பஞ்சாங்கம், சம்ஸ்கிருதம், குருகுலம் மற்றும் கோ சேவை — ஒரே ஆப்."
      ctaBookLabel="பூஜை முன்பதிவு செய்க"
      ctaDarshanLabel="நேரலை தரிசனம் காண்க"
      features={[
        { title: 'நேரலை தரிசனம்', body: 'காசி, திருப்பதி, ஸித்திவிநாயகர், சோமநாதர் — முக்கிய கோயில்களில் இருந்து நேரலை தரிசனம்.', href: '/darshan' },
        { title: 'பூஜை முன்பதிவு', body: 'சரிபார்க்கப்பட்ட பண்டிதர், வீடியோ ஆதாரம், 80G ரசீது. உங்கள் பெயரில் சங்கல்பம்.', href: '/pujas' },
        { title: 'தினசரி பஞ்சாங்கம்', body: 'திதி, நக்ஷத்திரம், ராகு காலம், சௌகடியா — உங்கள் நகரத்திற்கு ஏற்ப.', href: '/panchang' },
        { title: 'கோ சேவை', body: 'கோதானம், புல் சேவை — சரிபார்க்கப்பட்ட கோசாலைகளுக்கு நேரடி நன்கொடை.', href: '/gaushala' },
        { title: 'குருகுலம்', body: 'பாரம்பரிய குருகுல சேர்க்கை — சம்ஸ்கிருதம், வேதம், தத்துவம்.', href: '/gurukuls' },
        { title: 'AI பண்டிதர்', body: 'மத கேள்விகள், முகூர்த்தம், சாஸ்திர குறிப்பு — 24×7 கிடைக்கும்.', href: '/ask-pandit' },
      ]}
      nriHeading="வெளிநாட்டில் உள்ளீர்களா?"
      nriBody="NRI களுக்கான சிறப்பு லேன் — உங்கள் பெயரில் இந்திய கோயிலில் பூஜை, வீடியோ ஆதாரம் உங்கள் WhatsApp இல். ஆண்டு சந்தா ₹5000 / $60."
      nriCta="NRI தொகுப்பு காண்க →"
      englishLink="English →"
      footerNote="முழுமையான தமிழ் மொழிபெயர்ப்பு முன்னேற்றத்தில் உள்ளது. பெரும்பாலான பக்கங்கள் தற்போது ஆங்கிலத்தில் உள்ளன."
      englishLinkFooter="ஆங்கில பதிப்பு காண்க →"
    />
  );
}
