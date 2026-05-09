/**
 * SearchTab - AI Chat / Search Screen
 * 
 * Users can:
 * - Ask questions about their logged data
 * - Ask general questions (future Gemini integration)
 * - See AI responses in a chat-like interface
 * 
 * Currently uses GeminiService placeholder that returns dummy responses.
 */

import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { GeminiService } from '../../services/GeminiService';
import { format } from 'date-fns';
import { Send, Sparkles, User, Loader2, MessageCircle } from 'lucide-react';

export default function SearchTab() {
  const { state, addChatMessage } = useApp();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;
    const q = query.trim();
    setQuery('');
    addChatMessage('user', q);
    setIsLoading(true);

    try {
      const response = await GeminiService.search(q);
      addChatMessage('assistant', response);
    } catch {
      addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    'How much did I spend this week?',
    'How is my sleep pattern?',
    'Summarize my food intake today',
    'How active have I been?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] fade-in safe-area-top">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Search & AI</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Ask questions about your life data
        </p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {state.chatMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-text)' }}>
              Your AI Assistant
            </h3>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--color-text-tertiary)' }}>
              Ask me anything about your logs, expenses, health data, or general questions.
            </p>
            <div className="space-y-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  className="block w-full card p-3 text-sm text-left transition-all active:scale-[0.98]"
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
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                  style={{
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'rgba(99,102,241,0.1)',
                  }}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                  )}
                </div>
                <div className="rounded-2xl px-4 py-2.5"
                  style={{
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: msg.role === 'user' ? 'white' : 'var(--color-text)',
                    border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                  }}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-50">
                    {format(new Date(msg.timestamp), 'h:mm a')}
                  </p>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <input
          className="ios-input flex-1"
          placeholder="Ask about your data..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={isLoading}
          aria-label="Search query"
        />
        <button
          className="ios-btn ios-btn-primary"
          style={{ padding: '12px 14px' }}
          onClick={handleSend}
          disabled={!query.trim() || isLoading}
          aria-label="Send"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
