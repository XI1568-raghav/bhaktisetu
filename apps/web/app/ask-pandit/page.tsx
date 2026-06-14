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
 Clock,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import AiChat from '../../components/AiChat';
import VoicePanditButton from '../../components/VoicePanditButton';
import {
 getAllConversations,
 deleteConversation,
 type StoredConversation,
} from '../../lib/conversation-store';

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AskPanditPage() {
 const { user, session, isAuthenticated, isLoading: authLoading } = useAuth();
 const [conversations, setConversations] = useState<StoredConversation[]>([]);
 const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
 const [language, setLanguage] = useState<'en' | 'hi'>('en');
 const [sidebarOpen, setSidebarOpen] = useState(false);
 // Increment to force AiChat remount on "New Conversation"
 const [chatKey, setChatKey] = useState(0);

 // ─── Load conversations from localStorage ──────────────────────────────

 const refreshConversations = useCallback(() => {
 setConversations(getAllConversations());
 }, []);

 useEffect(() => {
 refreshConversations();
 }, [refreshConversations]);

 // ─── Handlers ───────────────────────────────────────────────────────────

 function handleNewConversation() {
 setActiveConversationId(null);
 setChatKey((k) => k + 1);
 setSidebarOpen(false);
 }

 function handleSelectConversation(id: string) {
 if (id === activeConversationId) return;
 setActiveConversationId(id);
 setChatKey((k) => k + 1);
 setSidebarOpen(false);
 }

 function handleConversationCreated(id: string) {
 setActiveConversationId(id);
 refreshConversations();
 }

 function handleConversationUpdated() {
 refreshConversations();
 }

 function handleDeleteConversation(id: string, e: React.MouseEvent) {
 e.stopPropagation();
 deleteConversation(id);
 if (activeConversationId === id) {
 setActiveConversationId(null);
 setChatKey((k) => k + 1);
 }
 refreshConversations();
 }

 // ─── Helpers ────────────────────────────────────────────────────────────

 function formatTimeAgo(dateStr: string): string {
 const date = new Date(dateStr);
 const now = new Date();
 const diffMs = now.getTime() - date.getTime();
 const diffMins = Math.floor(diffMs / 60000);

 if (diffMins < 1) return 'Just now';
 if (diffMins < 60) return `${diffMins}m ago`;

 const diffHours = Math.floor(diffMins / 60);
 if (diffHours < 24) return `${diffHours}h ago`;

 const diffDays = Math.floor(diffHours / 24);
 if (diffDays < 7) return `${diffDays}d ago`;

 return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
 }

 // ─── Loading state ─────────────────────────────────────────────────────

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

 // Allow unauthenticated users — chat works with local demo fallback
 // No auth gate: anyone can use Ask Pandit for demo purposes

 // ─── Main Layout ────────────────────────────────────────────────────────

 return (
 <div className="flex h-full overflow-hidden" style={{ background: 'var(--color-bg, #fffbf5)' }}>
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
 fixed md:static inset-y-0 left-0 z-40 w-[280px] flex flex-col
 border-r transition-transform duration-200 ease-in-out
 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
 md:top-auto
 `}
 style={{
 background: 'var(--color-surface, #fff9f0)',
 borderColor: 'var(--color-border, #e8dcc8)',
 }}
 >
 {/* Sidebar Header */}
 <div className="p-4" style={{ borderBottom: '1px solid var(--color-border, #e8dcc8)' }}>
 <div className="flex items-center justify-between mb-3">
 <h2
 className="text-base font-semibold flex items-center gap-2"
 style={{ color: 'var(--color-text, #3d2e1f)' }}
 >
 <Sparkles className="w-4 h-4 text-saffron-600" />
 Conversations
 </h2>
 <button
 onClick={() => setSidebarOpen(false)}
 className="md:hidden p-1 text-surface-400 hover:text-surface-600 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <button
 onClick={handleNewConversation}
 className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
 style={{
 background: 'var(--color-primary, #c2410c)',
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.transform = 'translateY(-2px)';
 e.currentTarget.style.boxShadow = '0 4px 12px rgba(194,65,12,0.25)';
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.transform = 'translateY(0)';
 e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
 }}
 >
 <Plus className="w-4 h-4" />
 New Conversation
 </button>
 </div>

 {/* Conversation List */}
 <div className="flex-1 overflow-y-auto p-2">
 {conversations.length === 0 ? (
 <div className="text-center py-8 px-4">
 <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
 <p className="text-sm text-surface-400">
 No conversations yet. Start by asking a question!
 </p>
 </div>
 ) : (
 <div className="space-y-1">
 {conversations.map((conv) => {
 const isActive = activeConversationId === conv.id;
 return (
 <button
 key={conv.id}
 onClick={() => handleSelectConversation(conv.id)}
 className="w-full flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-all group"
 style={{
 background: isActive
 ? 'var(--color-primary, #c2410c)'
 : 'transparent',
 color: isActive ? '#fff' : 'var(--color-text, #3d2e1f)',
 }}
 onMouseEnter={(e) => {
 if (!isActive) {
 e.currentTarget.style.background = 'rgba(194,65,12,0.08)';
 e.currentTarget.style.transform = 'translateY(-1px)';
 }
 }}
 onMouseLeave={(e) => {
 if (!isActive) {
 e.currentTarget.style.background = 'transparent';
 e.currentTarget.style.transform = 'translateY(0)';
 }
 }}
 >
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5 mb-0.5">
 <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
 <span className="text-sm font-medium truncate">
 {conv.title || 'Untitled'}
 </span>
 </div>
 <div className="flex items-center gap-1 pl-5">
 <Clock className="w-3 h-3 opacity-40" />
 <span
 className="text-xs truncate"
 style={{ opacity: isActive ? 0.8 : 0.5 }}
 >
 {formatTimeAgo(conv.updatedAt)}
 </span>
 </div>
 </div>
 <button
 onClick={(e) => handleDeleteConversation(conv.id, e)}
 className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all shrink-0 mt-0.5"
 style={{
 color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--color-text, #3d2e1f)',
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.color = isActive ? '#fff' : '#dc2626';
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.color = isActive
 ? 'rgba(255,255,255,0.7)'
 : 'var(--color-text, #3d2e1f)';
 }}
 title="Delete conversation"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </button>
 );
 })}
 </div>
 )}
 </div>

 {/* User info */}
 {user && (
 <div className="p-4" style={{ borderTop: '1px solid var(--color-border, #e8dcc8)' }}>
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
 {!user && (
 <div className="p-4" style={{ borderTop: '1px solid var(--color-border, #e8dcc8)' }}>
 <a
 href="/auth"
 className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-saffron-600 border border-saffron-200 rounded-lg hover:bg-saffron-50 transition-colors"
 >
 Sign in for full experience
 </a>
 </div>
 )}
 </aside>

 {/* Main Chat Area */}
 <main className="flex-1 flex flex-col min-w-0">
 {/* Chat Header */}
 <header
 className="flex items-center justify-between px-4 py-3 shadow-sm"
 style={{
 background: 'var(--color-surface, #fff9f0)',
 borderBottom: '1px solid var(--color-border, #e8dcc8)',
 }}
 >
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
 {'ॐ'}
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
 {language === 'en' ? 'English' : 'हिन्दी'}
 </span>
 <span className="sm:hidden">
 {language === 'en' ? 'EN' : 'HI'}
 </span>
 </button>
 </div>
 </header>

 {/* Voice Pandit Push-to-Talk (R-Q3-E-001) */}
 <div className="px-4 pt-3">
 <VoicePanditButton language={language} />
 </div>

 {/* Chat Component */}
 <div className="flex-1 overflow-hidden">
 <AiChat
 key={chatKey}
 conversationId={activeConversationId}
 onConversationCreated={handleConversationCreated}
 onConversationUpdated={handleConversationUpdated}
 language={language}
 accessToken={session?.accessToken}
 />
 </div>
 </main>
 </div>
 );
}
