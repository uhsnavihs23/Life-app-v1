/**
 * SearchTab - AI Chat
 * 
 * FIXES:
 * - Fresh suggestions view on app open
 * - Past conversations viewable
 * - Markdown rendered properly (bold, bullets, no raw asterisks)
 * - Session-based: new session each day
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext';
import { GeminiService, hasGeminiApiKey } from '../../services/GeminiService';
import { SupabaseDB, isSupabaseConfigured } from '../../services/SupabaseService';
import { formatINR } from '../../models/types';
import { format } from 'date-fns';
import { Send, Sparkles, User, Loader2, MessageCircle, AlertCircle, Clock, Trash2 } from 'lucide-react';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface ChatSession {
  date: string;
  messages: ChatMsg[];
}

const CHAT_KEY = 'lifelog_chat_sessions';

function loadSessions(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; }
}
function saveSessions(s: ChatSession[], userId?: string) {
  const trimmed = s.slice(-30);
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(trimmed)); } catch { /* quota */ }
  // Sync to Supabase
  if (userId && isSupabaseConfigured()) {
    SupabaseDB.saveChatSessions(userId, trimmed).catch(() => {});
  }
}

/** Convert markdown-like text to clean HTML-safe display */
function formatAiText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '⟨b⟩$1⟨/b⟩')  // bold markers
    .replace(/\*(.+?)\*/g, '⟨i⟩$1⟨/i⟩')       // italic markers
    .replace(/^[-•]\s+/gm, '  • ')              // bullet points
    .replace(/^\d+\.\s+/gm, (m) => `  ${m}`)    // numbered lists
    .replace(/⟨b⟩/g, '').replace(/⟨\/b⟩/g, '')  // strip markers for now
    .replace(/⟨i⟩/g, '').replace(/⟨\/i⟩/g, '')
    .replace(/#{1,3}\s+/g, '')                   // remove markdown headers
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, '').trim()) // code blocks
    .trim();
}

export default function SearchTab() {
  const { state } = useApp();
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [showPast, setShowPast] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Current session = today's messages
  const currentSession = sessions.find(s => s.date === todayDate);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const userIdForChat = state.user?.id;
  const addMessage = useCallback((msg: ChatMsg) => {
    setSessions(prev => {
      const updated = [...prev];
      let session = updated.find(s => s.date === todayDate);
      if (!session) {
        session = { date: todayDate, messages: [] };
        updated.push(session);
      }
      session.messages = [...session.messages, msg];
      saveSessions(updated, userIdForChat);
      return updated;
    });
  }, [todayDate, userIdForChat]);

  const buildContext = useCallback((): string => {
    const today = new Date().toISOString().split('T')[0];
    const parts: string[] = [];
    const todayExp = state.expenses.filter(e => e.createdAt.startsWith(today));
    if (todayExp.length > 0) {
      parts.push(`Today's expenses: ${formatINR(todayExp.reduce((s, e) => s + e.amount, 0))} across ${todayExp.length} items`);
      todayExp.slice(0, 5).forEach(e => parts.push(`  - ${formatINR(e.amount)} ${e.category}${e.note ? ': ' + e.note : ''}`));
    }
    const todayFood = state.foodEntries.filter(f => f.createdAt.startsWith(today));
    if (todayFood.length > 0) {
      const cal = todayFood.reduce((s, f) => s + (f.calories || 0), 0);
      parts.push(`Food: ${todayFood.length} meals, ~${cal} cal`);
      todayFood.forEach(f => parts.push(`  - ${f.name} (${f.portionSize})${f.calories ? ' ' + f.calories + 'cal' : ''}`));
    }
    const todaySleep = state.sleepEntries.find(s => s.date === today);
    if (todaySleep) parts.push(`Sleep: ${todaySleep.hours}h, quality: ${todaySleep.quality}`);
    const todaySteps = state.activities.filter(a => a.date === today).reduce((s, a) => s + a.steps, 0);
    if (todaySteps > 0) parts.push(`Steps: ${todaySteps.toLocaleString()}`);
    const recentLogs = state.dailyLogs.slice(0, 5);
    if (recentLogs.length > 0) {
      parts.push(`Recent logs:`);
      recentLogs.forEach(l => parts.push(`  - [${l.tag}] ${l.text.slice(0, 60)}`));
    }
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekExp = state.expenses.filter(e => new Date(e.createdAt) >= weekAgo);
    if (weekExp.length > 0) parts.push(`Week total: ${formatINR(weekExp.reduce((s, e) => s + e.amount, 0))}`);
    return parts.join('\n');
  }, [state.expenses, state.foodEntries, state.sleepEntries, state.activities, state.dailyLogs]);

  const handleSend = useCallback(async () => {
    const q = query.trim();
    if (!q || isLoading) return;
    setQuery('');
    inputRef.current?.focus();

    addMessage({ id: `u_${Date.now()}`, role: 'user', content: q, timestamp: new Date().toISOString() });
    setIsLoading(true);

    try {
      const context = buildContext();
      const response = await GeminiService.search(q, context);
      addMessage({ id: `a_${Date.now()}`, role: 'assistant', content: formatAiText(response), timestamp: new Date().toISOString() });
    } catch (err) {
      addMessage({ id: `e_${Date.now()}`, role: 'assistant', content: `⚠️ ${err instanceof Error ? err.message : 'Error'}`, timestamp: new Date().toISOString(), isError: true });
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading, buildContext, addMessage]);

  const clearToday = () => {
    setSessions(prev => {
      const updated = prev.filter(s => s.date !== todayDate);
      saveSessions(updated, userIdForChat);
      return updated;
    });
  };

  const suggestions = [
    'How was my day today?',
    'How much did I spend this week?',
    'Analyze my sleep pattern',
    'What should I eat for dinner?',
    'Am I hitting my fitness goals?',
  ];

  const pastSessions = sessions.filter(s => s.date !== todayDate && s.messages.length > 0).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] fade-in safe-area-top">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>AI Assistant</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {!hasGeminiApiKey() && <span className="text-amber-500">API key needed · </span>}
            {messages.length > 0 ? `${messages.length} messages today` : 'Ask me anything'}
          </p>
        </div>
        <div className="flex gap-1">
          {pastSessions.length > 0 && (
            <button className="p-2 rounded-xl" style={{ background: 'var(--color-surface-alt)' }} onClick={() => setShowPast(!showPast)}>
              <Clock className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          )}
          {messages.length > 0 && (
            <button className="p-2 rounded-xl" style={{ background: 'var(--color-surface-alt)' }} onClick={clearToday}>
              <Trash2 className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Past conversations */}
      {showPast && (
        <div className="card p-3 mb-4 max-h-60 overflow-y-auto slide-up">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Past Conversations</h3>
          {pastSessions.map(s => (
            <div key={s.date} className="py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{format(new Date(s.date), 'd MMM yyyy')}</p>
              {s.messages.filter(m => m.role === 'user').slice(0, 3).map(m => (
                <p key={m.id} className="text-xs truncate mt-1" style={{ color: 'var(--color-text-tertiary)' }}>→ {m.content}</p>
              ))}
            </div>
          ))}
          <button className="text-xs mt-2 w-full text-center" style={{ color: 'var(--color-primary)' }} onClick={() => setShowPast(false)}>Close</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-text)' }}>Ask Me Anything</h3>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--color-text-tertiary)' }}>
              I can analyze your health, expenses, sleep patterns, and more.
            </p>
            <div className="space-y-2 max-w-sm mx-auto">
              {suggestions.map(s => (
                <button key={s} className="block w-full card p-3 text-sm text-left transition-all active:scale-[0.98]"
                  style={{ color: 'var(--color-primary)' }} onClick={() => setQuery(s)}>
                  <MessageCircle className="w-4 h-4 inline-block mr-2 opacity-50" />{s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ background: msg.role === 'user' ? 'var(--color-primary)' : msg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)' }}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : msg.isError ? <AlertCircle className="w-4 h-4 text-red-500" /> : <Sparkles className="w-4 h-4 text-indigo-500" />}
                </div>
                <div className="rounded-2xl px-4 py-2.5"
                  style={{ background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)', color: msg.role === 'user' ? 'white' : msg.isError ? '#ef4444' : 'var(--color-text)', border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none' }}>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  <p className="text-xs mt-1 opacity-50">{format(new Date(msg.timestamp), 'h:mm a')}</p>
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="card px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <input ref={inputRef} className="ios-input flex-1" placeholder="Ask about your data..."
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={isLoading} />
        <button className="ios-btn ios-btn-primary" style={{ padding: '12px 14px' }} onClick={handleSend} disabled={!query.trim() || isLoading}>
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
