/**
 * SearchTab - AI Chat / Search
 * 
 * Chat state is LOCAL to this component to avoid full-app re-renders.
 * Messages persist to localStorage separately from main app state.
 * Each send is independent — errors don't block future messages.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../store/AppContext';
import { GeminiService, hasGeminiApiKey } from '../../services/GeminiService';
import { formatINR } from '../../models/types';
import { format } from 'date-fns';
import { Send, Sparkles, User, Loader2, MessageCircle, AlertCircle } from 'lucide-react';

interface LocalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

const CHAT_STORAGE_KEY = 'lifelog_chat_messages';

function loadChat(): LocalChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveChat(msgs: LocalChatMessage[]) {
  try {
    // Keep last 100 messages max
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-100)));
  } catch { /* quota exceeded, ignore */ }
}

export default function SearchTab() {
  const { state } = useApp();
  const [messages, setMessages] = useState<LocalChatMessage[]>(loadChat);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Save chat whenever messages change
  useEffect(() => { saveChat(messages); }, [messages]);

  // Build compact context from user's data
  const buildContext = useCallback((): string => {
    const today = new Date().toISOString().split('T')[0];
    const parts: string[] = [];

    // Today's expenses
    const todayExp = state.expenses.filter(e => e.createdAt.startsWith(today));
    if (todayExp.length > 0) {
      const total = todayExp.reduce((s, e) => s + e.amount, 0);
      parts.push(`Today's expenses: ${formatINR(total)} across ${todayExp.length} entries`);
      todayExp.slice(0, 5).forEach(e => parts.push(`  - ${formatINR(e.amount)} on ${e.category}${e.note ? ': ' + e.note : ''}`));
    }

    // Today's food
    const todayFood = state.foodEntries.filter(f => f.createdAt.startsWith(today));
    if (todayFood.length > 0) {
      const cal = todayFood.reduce((s, f) => s + (f.calories || 0), 0);
      parts.push(`Today's food: ${todayFood.length} meals, ~${cal} cal`);
      todayFood.forEach(f => parts.push(`  - ${f.name} (${f.portionSize})${f.calories ? ' ' + f.calories + 'cal' : ''}`));
    }

    // Sleep
    const todaySleep = state.sleepEntries.find(s => s.date === today);
    if (todaySleep) parts.push(`Sleep: ${todaySleep.hours}h, quality: ${todaySleep.quality}`);

    // Steps
    const todaySteps = state.activities.filter(a => a.date === today).reduce((s, a) => s + a.steps, 0);
    if (todaySteps > 0) parts.push(`Steps today: ${todaySteps.toLocaleString()}`);

    // Recent logs
    const recentLogs = state.dailyLogs.slice(0, 5);
    if (recentLogs.length > 0) {
      parts.push(`Recent logs:`);
      recentLogs.forEach(l => parts.push(`  - [${l.tag}] ${l.text.slice(0, 80)}`));
    }

    // Week expenses
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekExp = state.expenses.filter(e => new Date(e.createdAt) >= weekAgo);
    if (weekExp.length > 0) {
      parts.push(`This week's total spending: ${formatINR(weekExp.reduce((s, e) => s + e.amount, 0))}`);
    }

    return parts.join('\n');
  }, [state.expenses, state.foodEntries, state.sleepEntries, state.activities, state.dailyLogs]);

  const handleSend = useCallback(async () => {
    const q = query.trim();
    if (!q || isLoading) return;

    // Clear input immediately
    setQuery('');
    inputRef.current?.focus();

    // Add user message immediately
    const userMsg: LocalChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const context = buildContext();
      const response = await GeminiService.search(q, context);
      setMessages(prev => [...prev, {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, {
        id: `e_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${errorMsg}`,
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      // ALWAYS reset loading — this is critical
      setIsLoading(false);
    }
  }, [query, isLoading, buildContext]);

  const suggestions = [
    'How much did I spend this week?',
    'How is my sleep pattern?',
    'Summarize my food intake today',
    'How active have I been?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] fade-in safe-area-top">
      <div className="mb-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Search & AI</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Ask questions about your life data
          {!hasGeminiApiKey() && <span className="text-amber-500"> · API key needed</span>}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-text)' }}>
              Your AI Assistant
            </h3>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--color-text-tertiary)' }}>
              Ask me about your logs, expenses, health, or general questions.
            </p>
            <div className="space-y-2">
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
                  style={{
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: msg.role === 'user' ? 'white' : msg.isError ? '#ef4444' : 'var(--color-text)',
                    border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                  }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
        <button className="ios-btn ios-btn-primary" style={{ padding: '12px 14px' }}
          onClick={handleSend} disabled={!query.trim() || isLoading}>
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
