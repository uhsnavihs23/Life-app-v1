/**
 * HistoryTab - View all past records and activities
 * 
 * Ported refinements:
 * - "Deleted" section for backup and recovery
 * - Consolidated history view
 * - Category filters
 */

import { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { TAG_CONFIG, formatDate, formatTime, formatINR } from '../../models/types';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import {
  Calendar, ChevronLeft, ChevronRight,
  Clock, Search, X, CalendarDays, Trash2, RefreshCcw
} from 'lucide-react';

type FilterCategory = 'all' | 'expense' | 'food' | 'sleep' | 'exercise' | 'general' | 'list' | 'deleted';

export default function HistoryTab() {
  const { state, restoreEntry } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'day' | 'all'>('day');

  // Build unified history
  const allEntries = useMemo(() => {
    const items: any[] = [];

    state.dailyLogs.forEach(l => items.push({ id: l.id, action: l.text, details: `Tagged: ${l.tag}`, category: l.tag, createdAt: l.createdAt, _type: 'log' }));
    state.expenses.forEach(e => items.push({ id: e.id, action: `${formatINR(e.amount)} - ${e.category}`, details: e.note || '', category: 'expense', createdAt: e.createdAt, _type: 'expense' }));
    state.foodEntries.forEach(f => items.push({ id: f.id, action: `${f.name} (${f.portionSize})`, details: `${f.mealType}`, category: 'food', createdAt: f.createdAt, _type: 'food' }));
    state.sleepEntries.forEach(s => items.push({ id: s.id, action: `${s.hours}h sleep - ${s.quality}`, details: '', category: 'sleep', createdAt: s.createdAt, _type: 'sleep' }));
    state.activities.forEach(a => items.push({ id: a.id, action: `${a.steps.toLocaleString()} steps`, details: '', category: 'exercise', createdAt: a.createdAt, _type: 'activity' }));
    state.listItems.forEach(l => items.push({ id: l.id, action: l.title, details: `${l.listType}`, category: 'list', createdAt: l.createdAt, _type: 'list' }));

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state]);

  const filteredEntries = useMemo(() => {
    // If filter is "deleted", ONLY show deleted entries
    if (filterCategory === 'deleted') {
      return state.deletedEntries.map(e => ({
        ...e,
        action: e.data.text || e.data.title || `${formatINR(e.data.amount)} - ${e.data.category}`,
        details: `Deleted at ${formatTime(e.deletedAt)}`,
        category: 'deleted',
        createdAt: e.data.createdAt
      })).filter(e => !searchQuery || e.action.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const source = viewMode === 'day' 
      ? allEntries.filter(item => isWithinInterval(new Date(item.createdAt), { start: startOfDay(selectedDate), end: endOfDay(selectedDate) }))
      : allEntries;

    return source.filter(item => {
      const matchesCat = filterCategory === 'all' || item.category === filterCategory;
      const matchesSearch = !searchQuery || item.action.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [allEntries, state.deletedEntries, selectedDate, filterCategory, searchQuery, viewMode]);

  const categories: { id: FilterCategory; label: string; emoji: string }[] = [
    { id: 'all', label: 'All', emoji: '📋' },
    { id: 'expense', label: 'Expenses', emoji: '💰' },
    { id: 'exercise', label: 'Activity', emoji: '🏃' },
    { id: 'deleted', label: 'Deleted', emoji: '🗑️' },
  ];

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="mb-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>History</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Your records</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button className={`flex-1 py-2 rounded-xl text-sm font-medium ${viewMode === 'day' ? 'bg-indigo-500 text-white' : 'card'}`} onClick={() => setViewMode('day')}>By Day</button>
        <button className={`flex-1 py-2 rounded-xl text-sm font-medium ${viewMode === 'all' ? 'bg-indigo-500 text-white' : 'card'}`} onClick={() => setViewMode('all')}>All Time</button>
      </div>

      {viewMode === 'day' && filterCategory !== 'deleted' && (
        <div className="card p-4 mb-4 flex items-center justify-between">
           <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 rounded-lg bg-var(--color-surface-alt)"><ChevronLeft className="w-5 h-5"/></button>
           <div className="text-center">
             <p className="font-bold">{format(selectedDate, 'EEEE')}</p>
             <p className="text-xs opacity-50">{format(selectedDate, 'd MMMM')}</p>
           </div>
           <button onClick={() => { const next = new Date(selectedDate); next.setDate(next.getDate()+1); if(next <= new Date()) setSelectedDate(next); }} className="p-2 rounded-lg bg-var(--color-surface-alt)"><ChevronRight className="w-5 h-5"/></button>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button key={cat.id} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${filterCategory === cat.id ? 'bg-indigo-500 text-white scale-105' : 'card'}`}
            onClick={() => setFilterCategory(cat.id)}>
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
        <input className="ios-input pl-10" placeholder="Search history..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="space-y-2.5">
        {filteredEntries.length === 0 ? (
          <p className="text-center py-12 opacity-30">No records found</p>
        ) : (
          filteredEntries.map(item => (
            <div key={item.id} className="card p-3.5 flex items-start gap-3.5 relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-surface-alt)' }}>
                <span className="text-lg">{(TAG_CONFIG[item.category as keyof typeof TAG_CONFIG] || {emoji: '📋'}).emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{item.action}</p>
                <p className="text-xs opacity-50 mt-0.5">{item.details}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] opacity-30 font-bold uppercase tracking-tighter">{formatTime(item.createdAt)}</span>
                  {filterCategory === 'all' && <span className="text-[10px] opacity-30">· {formatDate(item.createdAt)}</span>}
                </div>
              </div>
              {filterCategory === 'deleted' && (
                <button onClick={() => restoreEntry(item.id)} className="ios-btn ios-btn-primary p-2 h-auto rounded-xl">
                   <RefreshCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
