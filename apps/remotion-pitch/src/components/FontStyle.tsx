import { staticFile } from 'remotion';
import { FONT_FILES } from '../tokens';

// Loads the bundled brand typefaces (Cabinet Grotesk + Satoshi) via @font-face
// so Remotion's headless Chromium renders the real brand font, not a Helvetica
// fallback. Mount once at the composition root. Font files live in public/fonts/.
//
// Cabinet Grotesk + Satoshi are Fontshare families (not on Google Fonts), so we
// bundle the static-weight woff2 files locally — no network fetch at render time.
export const FontStyle: React.FC = () => {
  const css = `
    @font-face {
      font-family: 'Cabinet Grotesk';
      src: url('${staticFile(FONT_FILES.cabinetBold)}') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: 'Cabinet Grotesk';
      src: url('${staticFile(FONT_FILES.cabinetRegular)}') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: 'Satoshi';
      src: url('${staticFile(FONT_FILES.satoshiBold)}') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: 'Satoshi';
      src: url('${staticFile(FONT_FILES.satoshiMedium)}') format('woff2');
      font-weight: 600;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: 'Satoshi';
      src: url('${staticFile(FONT_FILES.satoshiRegular)}') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
  `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
