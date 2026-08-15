'use client';

import { useEffect, useState } from 'react';
import { Bot, FileText, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';

type AgentSummary = {
  agent: string;
  lastRun?: string;
  runCount: number;
  latestFile?: string;
};

type ReportFile = { file: string; date: string; agent: string; size: number; mtime: string };

export default function AgentsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [summary, setSummary] = useState<AgentSummary[]>([]);
  const [recent, setRecent] = useState<ReportFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/agents/runs`, { headers: { authorization: `Bearer ${token}` } }).then((x) => x.json()),
        fetch(`${API_BASE_URL}/admin/agents/recent`, { headers: { authorization: `Bearer ${token}` } }).then((x) => x.json()),
      ]);
      setSummary(s.agents || []);
      setRecent(r.recent || []);
    } finally {
      setLoading(false);
    }
  }

  async function openFile(file: string) {
    if (!token) return;
    setSelected(file);
    setContentLoading(true);
    try {
      const r = await fetch(`${API_BASE_URL}/admin/agents/runs/${encodeURIComponent(file)}`, {
        headers: { authorization: `Bearer ${token}` },
      }).then((x) => x.json());
      setContent(r.content || '(empty)');
    } finally {
      setContentLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${H1.portal} flex items-center gap-2`}>
            <Bot className="w-6 h-6 text-saffron-600" />
            Agent Fleet
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Automated employee agents that run on GitHub Actions and write reports here.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-saffron-600 text-white rounded-lg hover:bg-saffron-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4">
            <h2 className="text-sm font-semibold text-surface-700 mb-3">Agents ({summary.length})</h2>
            <div className="space-y-2">
              {summary.length === 0 && !loading && (
                <p className="text-xs text-surface-400">No agent reports yet. Trigger via Actions → Agent fleet → Run workflow.</p>
              )}
              {summary.map((a) => (
                <button
                  key={a.agent}
                  onClick={() => a.latestFile && openFile(a.latestFile)}
                  className="w-full text-left p-3 rounded-lg border border-surface-200 hover:border-saffron-400 hover:bg-saffron-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-900">{a.agent}</span>
                    <span className="text-xs text-surface-400">{a.runCount} runs</span>
                  </div>
                  {a.lastRun && (
                    <div className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.lastRun).toLocaleString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4">
            <h2 className="text-sm font-semibold text-surface-700 mb-3">Recent runs</h2>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {recent.map((r) => (
                <button
                  key={r.file}
                  onClick={() => openFile(r.file)}
                  className={`w-full text-left p-2 rounded text-xs hover:bg-saffron-50 ${selected === r.file ? 'bg-saffron-100 text-saffron-900' : 'text-surface-700'}`}
                >
                  <div className="font-mono">{r.file}</div>
                  <div className="text-surface-400 text-xs">{new Date(r.mtime).toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-surface-200 p-6 min-h-[600px]">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-96 text-surface-400">
                <FileText className="w-12 h-12 mb-3" />
                <p className="text-sm">Select an agent or report to view its output.</p>
              </div>
            ) : contentLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-6 h-6 animate-spin text-saffron-600" />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-surface-200">
                  <h3 className="text-sm font-mono text-surface-700">{selected}</h3>
                  <span className="text-xs text-surface-400">{content.length.toLocaleString()} bytes</span>
                </div>
                <pre className="text-xs text-surface-800 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{content}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
