/**
 * SearchTab - AI Chat / Search Screen
 * 
 * Ported context-awareness and AppContext persistence for a professional experience.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { GeminiService } from '../../services/GeminiService';
import { format } from 'date-fns';
import { Send, Sparkles, User, Loader2, MessageCircle } from 'lucide-react';
import type { ChatMessage } from '../../models/types';

export default function SearchTab() {
  const { state, addChatMessage } = useApp();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages, isLoading]);

  // Generate context from recent data
  const dataContext = useMemo(() => {
    const recentLogs = state.dailyLogs.slice(0, 10).map(l => `- ${l.text} (${l.tag})`).join('\n');
    const recentExpenses = state.expenses.slice(0, 10).map(e => `- ₹${e.amount} on ${e.category}: ${e.note}`).join('\n');
    const recentFood = state.foodEntries.slice(0, 5).map(f => `- ${f.name} (${f.mealType})`).join('\n');
    
    return `
Recent Logs:
${recentLogs || 'No logs yet.'}

Recent Expenses:
${recentExpenses || 'No expenses yet.'}

Recent Food:
${recentFood || 'No food logged.'}
    `.trim();
  }, [state.dailyLogs, state.expenses, state.foodEntries]);

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;
    const q = query.trim();
    setQuery('');
    
    // Add user message to AppContext for persistence
    addChatMessage('user', q);
    setIsLoading(true);

    try {
      // Call Gemini with context
      const response = await GeminiService.search(q, dataContext);
      addChatMessage('assistant', response);
    } catch (err) {
      console.error('Search error:', err);
      addChatMessage('assistant', 'Sorry, I encountered an error connecting to the AI. Please check your API key in Profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    'What was my last expense?',
    'Summarize my recent logs',
    'How much have I spent on food?',
    'Give me a health insight',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] fade-in safe-area-top overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>AI Assistant</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Insights powered by Gemini
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1 custom-scrollbar">
        {state.chatMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center shadow-inner"
              style={{ background: 'rgba(99,102,241,0.05)' }}>
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-text)' }}>
              How can I help you?
            </h3>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--color-text-tertiary)' }}>
              I can analyze your logs, summarize spending, or offer health advice.
            </p>
            <div className="space-y-2 px-4">
              {suggestions.map(s => (
                <button
                  key={s}
                  className="block w-full card p-3 text-sm text-left transition-all active:scale-[0.98] hover:bg-opacity-80"
                  style={{ color: 'var(--color-primary)' }}
                  onClick={() => { setQuery(s); }}
                >
                  <MessageCircle className="w-4 h-4 inline-block mr-2 opacity-50" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          state.chatMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm"
                  style={{
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'rgba(99,102,241,0.1)',
                  }}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                  )}
                </div>
                <div className="rounded-2xl px-4 py-2.5 shadow-sm"
                  style={{
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: msg.role === 'user' ? 'white' : 'var(--color-text)',
                    border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                  }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] mt-1 opacity-50">
                    {format(new Date(msg.timestamp), 'h:mm a')}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-2 items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50 shadow-sm">
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="card px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t bg-transparent" style={{ borderColor: 'var(--color-border)' }}>
        <input
          className="ios-input flex-1 shadow-sm"
          placeholder="Ask about your data..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={isLoading}
        />
        <button
          className="ios-btn ios-btn-primary shadow-md"
          style={{ padding: '12px 16px', borderRadius: '16px' }}
          onClick={handleSend}
          disabled={!query.trim() || isLoading}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
