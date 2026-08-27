'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, MessageSquare, Phone, Video } from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';

/**
 * One-click demo entry: pretends Razorpay charged ₹1, creates a real puja
 * booking, auto-assigns the demo pandit, opens a chat thread, and routes
 * the user straight into the inbox.
 *
 * Visible to any signed-in user. Calls the gated /api/v1/demo-pay/puja
 * endpoint which is itself protected by ENABLE_DEMO_PAY=true on the API.
 */
function DemoChatPageInner() {
  const { session, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = async (kind: 'puja' | 'astrology' | 'wellness' | 'temple' | 'gaushala' | 'store_order') => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      if (kind === 'puja') {
        const res = await fetch(`${API_BASE_URL}/demo-pay/puja`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Demo pay failed');
        router.push(`/messages`);
        return;
      }
      // Generic providers: just spin up a chat with the demo seeded user.
      const providerEmailMap: Record<string, string> = {
        astrology: 'astro@demo.com',
        wellness: 'wellness@demo.com',
        temple: 'temple@demo.com',
        gaushala: 'gaushala@demo.com',
        store_order: 'store@demo.com',
      };
      const res = await fetch(`${API_BASE_URL}/demo-pay/start-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          providerEmail: providerEmailMap[kind],
          kind,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not start chat');
      router.push(`/messages`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <Sparkles className="w-10 h-10 text-saffron-600 mx-auto mb-3" />
        <h1 className={H1.portal}>Demo: Chat with a provider</h1>
        <p className="prose-meta text-surface-500 mt-2 max-w-lg mx-auto">
          Skip payment, instantly open a conversation with one of our seeded demo providers.
          Then sign in as that provider in another browser to chat back.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DemoCard
          title="Book a puja with Demo Pandit"
          subtitle="Creates a real booking + auto-assigns priest"
          accent="saffron"
          loading={loading}
          onClick={() => trigger('puja')}
        />
        <DemoCard
          title="Astrology consultation"
          subtitle="Open chat with Demo Astrologer"
          accent="purple"
          loading={loading}
          onClick={() => trigger('astrology')}
        />
        <DemoCard
          title="Wellness session"
          subtitle="Open chat with Demo Wellness Instructor"
          accent="emerald"
          loading={loading}
          onClick={() => trigger('wellness')}
        />
        <DemoCard
          title="Ask a temple question"
          subtitle="Open chat with Demo Temple Manager"
          accent="amber"
          loading={loading}
          onClick={() => trigger('temple')}
        />
        <DemoCard
          title="Sponsor a cow"
          subtitle="Open chat with Demo Gaushala Manager"
          accent="green"
          loading={loading}
          onClick={() => trigger('gaushala')}
        />
        <DemoCard
          title="Question on a store order"
          subtitle="Open chat with Demo Store Owner"
          accent="blue"
          loading={loading}
          onClick={() => trigger('store_order')}
        />
      </div>

      <div className="mt-10 bg-saffron-50 rounded-xl p-5 border border-saffron-100">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-saffron-600 mt-0.5" />
          <div className="text-sm text-surface-700">
            <p className="font-semibold mb-1">How to test the two-sided chat</p>
            <ol className="list-decimal list-inside space-y-1 text-surface-600">
              <li>Click any tile above as <span className="font-medium">{user?.email ?? 'devotee@demo.com'}</span></li>
              <li>Open an incognito window, sign in as the matching provider account</li>
              <li>Both sides should see the conversation and can chat / start video calls</li>
            </ol>
            <div className="mt-3 flex gap-3 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1 text-surface-500"><MessageSquare className="w-3 h-3" /> Text chat</span>
              <span className="inline-flex items-center gap-1 text-surface-500"><Phone className="w-3 h-3" /> Voice call (Jitsi)</span>
              <span className="inline-flex items-center gap-1 text-surface-500"><Video className="w-3 h-3" /> Video call (Jitsi)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoCard({
  title,
  subtitle,
  accent,
  loading,
  onClick,
}: {
  title: string;
  subtitle: string;
  accent: string;
  loading: boolean;
  onClick: () => void;
}) {
  const accentMap: Record<string, string> = {
    saffron: 'border-saffron-200 hover:border-saffron-400 hover:bg-saffron-50',
    purple: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50',
    emerald: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
    amber: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50',
    green: 'border-green-200 hover:border-green-400 hover:bg-green-50',
    blue: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-left bg-white rounded-xl border-2 p-5 transition-all disabled:opacity-50 ${accentMap[accent] ?? ''}`}
    >
      <p className="text-sm font-semibold text-surface-800 mb-1">{title}</p>
      <p className="text-xs text-surface-500">{subtitle}</p>
      {loading && <Loader2 className="w-4 h-4 animate-spin text-surface-400 mt-2" />}
    </button>
  );
}

export default function DemoChatPage() {
  return (
    <AuthGuard>
      <DemoChatPageInner />
    </AuthGuard>
  );
}
