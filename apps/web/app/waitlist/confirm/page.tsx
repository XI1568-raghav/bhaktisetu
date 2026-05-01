import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';

interface ConfirmPageProps {
  searchParams: Promise<{ code?: string }>;
}

// Confirm landing — passes the user's pending row id to the API which
// flips status=CONFIRMED then 302s back to /waitlist/welcome with the
// referralCode. We do the redirect here on the server so the API call
// happens immediately on link click without flashing client UI.
export default async function WaitlistConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const code = typeof params?.code === 'string' ? params.code : '';

  if (!code) {
    redirect('/waitlist');
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/waitlist/confirm?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
    });
    const location = res.headers.get('location');
    if (location) {
      redirect(location);
    }
  } catch {
    // Fall through to a safe default below.
  }

  redirect('/waitlist');
}
