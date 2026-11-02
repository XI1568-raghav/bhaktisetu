import { redirect } from 'next/navigation';

// There is no consultation index: /consultation/[id] is a live room, and the astrologer
// directory is /astrology. Tester PDF 3 typed the bare path and got a 404.
export default function ConsultationIndexPage() {
  redirect('/astrology');
}
