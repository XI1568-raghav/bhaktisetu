'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Sparkles,
  Globe,
  X,
  Menu,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/supabase';
import AiChat from '../../components/AiChat';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AskPanditPage() {
  const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // ─── Load conversations ─────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!session?.accessToken) return;

    setLoadingConversations(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/conversations?limit=50`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Failed to load conversations
    } finally {
      setLoadingConversations(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated, loadConversations]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleNewConversation() {
    setActiveConversationId(null);
    setSidebarOpen(false);
  }

  function handleSelectConversation(id: string) {
    setActiveConversationId(id);
    setSidebarOpen(false);
  }

  function handleNewConversationCreated(id: string) {
    setActiveConversationId(id);
    // Refresh the conversation list
    loadConversations();
  }

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();

    if (!session?.accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/ai/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
      }
    } catch {
      // Failed to delete
    }
  }

  // ─── Auth Guard ─────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 gradient-saffron rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-surface-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 gradient-saffron rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-4xl text-white font-bold font-devanagari font-[family-name:var(--font-noto-devanagari)]">
              {'\u0950'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-surface-800 mb-3">Ask a Pandit</h1>
          <p className="text-surface-500 mb-6">
            Get personalized spiritual guidance rooted in Hindu scriptures.
            Sign in to start your conversation with Pandit Ji.
          </p>
          <a
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 gradient-saffron text-white font-medium rounded-lg hover:opacity-90 transition-opacity shadow-md"
          >
            Sign In to Continue
          </a>
        </div>
      </div>
    );
  }

  // ─── Main Layout ────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-surface-50">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversation Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40 w-72 bg-white border-r border-surface-200 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:top-auto
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-surface-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-surface-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-saffron-600" />
              Ask a Pandit
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 text-surface-400 hover:text-surface-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-saffron-300 border-t-saffron-600 rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-sm text-surface-400">
                No conversations yet. Start by asking a question!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`
                    w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left
                    transition-colors group
                    ${
                      activeConversationId === conv.id
                        ? 'bg-saffron-100 text-saffron-800'
                        : 'hover:bg-surface-100 text-surface-600'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="text-sm truncate">
                      {conv.title || 'Untitled conversation'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-red-500 transition-all shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User info */}
        {user && (
          <div className="p-4 border-t border-surface-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-saffron-100 rounded-full flex items-center justify-center text-saffron-700 text-xs font-bold">
                {user.fullName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-700 truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-surface-400 truncate">{user.phone}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-surface-200 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 text-surface-500 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Back arrow on mobile when in conversation */}
            {activeConversationId && (
              <button
                onClick={handleNewConversation}
                className="md:hidden p-1.5 text-surface-500 hover:text-saffron-600 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-saffron rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm font-devanagari font-[family-name:var(--font-noto-devanagari)]">
                  {'\u0950'}
                </span>
              </div>
              <div>
                <h1 className="text-base font-semibold text-surface-800">
                  Pandit Ji
                </h1>
                <p className="text-xs text-surface-400 hidden sm:block">
                  Spiritual guidance from Hindu scriptures
                </p>
              </div>
            </div>
          </div>

          {/* Language toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-surface-600 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg border border-surface-200 transition-colors"
              title="Toggle language"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">
                {language === 'en' ? 'English' : '\u0939\u093F\u0928\u094D\u0926\u0940'}
              </span>
              <span className="sm:hidden">
                {language === 'en' ? 'EN' : 'HI'}
              </span>
            </button>
          </div>
        </header>

        {/* Chat Component */}
        <div className="flex-1 overflow-hidden">
          <AiChat
            conversationId={activeConversationId}
            onNewConversation={handleNewConversationCreated}
            language={language}
            accessToken={session?.accessToken}
          />
        </div>
      </main>
    </div>
  );
}
