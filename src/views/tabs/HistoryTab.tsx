/**
 * HistoryTab - View all past records and activities
 * 
 * Features:
 * - Calendar date picker
 * - Filter by category
 * - Search through records
 * - View by day or all-time
 */

import { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { TAG_CONFIG, formatDate, formatTime, formatINR } from '../../models/types';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import {
  Calendar, ChevronLeft, ChevronRight,
  Clock, Search, X, CalendarDays
} from 'lucide-react';

type FilterCategory = 'all' | 'expense' | 'food' | 'sleep' | 'exercise' | 'general' | 'list' | 'health' | 'reminder' | 'file';

export default function HistoryTab() {
  const { state } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'day' | 'all'>('day');
  const [showCalendar, setShowCalendar] = useState(false);

  // Get all activities for the selected date
  const dayActivities = useMemo(() => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    
    return state.activityTimeline
      .filter(item => {
        const itemDate = new Date(item.createdAt);
        const withinDate = isWithinInterval(itemDate, { start, end });
        const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
        const matchesSearch = !searchQuery || 
          item.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.action.toLowerCase().includes(searchQuery.toLowerCase());
        return withinDate && matchesCategory && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.activityTimeline, selectedDate, filterCategory, searchQuery]);

  // Get all activities (for 'all' view mode)
  const allActivities = useMemo(() => {
    return state.activityTimeline
      .filter(item => {
        const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
        const matchesSearch = !searchQuery || 
          item.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.action.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.activityTimeline, filterCategory, searchQuery]);

  // Group by date for all view
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof allActivities> = {};
    allActivities.forEach(item => {
      const date = item.createdAt.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [allActivities]);

  // Daily summary
  const daySummary = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const expenses = state.expenses.filter(e => e.createdAt.startsWith(dateStr));
    const food = state.foodEntries.filter(f => f.createdAt.startsWith(dateStr));
    const sleep = state.sleepEntries.filter(s => s.date === dateStr);
    const activity = state.activities.filter(a => a.date === dateStr);

    return {
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      totalCalories: food.reduce((sum, f) => sum + (f.calories || 0), 0),
      meals: food.length,
      sleepHours: sleep[0]?.hours || 0,
      steps: activity.reduce((sum, a) => sum + a.steps, 0),
      expenseCount: expenses.length,
    };
  }, [state, selectedDate]);

  const goToPrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    if (next <= new Date()) setSelectedDate(next);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseISO(e.target.value);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
      setShowCalendar(false);
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const categories: { id: FilterCategory; label: string; emoji: string }[] = [
    { id: 'all', label: 'All', emoji: '📋' },
    { id: 'expense', label: 'Expenses', emoji: '💰' },
    { id: 'food', label: 'Food', emoji: '🍽️' },
    { id: 'sleep', label: 'Sleep', emoji: '😴' },
    { id: 'exercise', label: 'Activity', emoji: '🏃' },
    { id: 'list', label: 'Lists', emoji: '📝' },
    { id: 'health', label: 'Health', emoji: '❤️' },
    { id: 'reminder', label: 'Reminders', emoji: '⏰' },
  ];

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="mb-4">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>History</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Your complete life record
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all ${viewMode === 'day' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
          style={viewMode !== 'day' ? { color: 'var(--color-text-secondary)' } : {}}
          onClick={() => setViewMode('day')}
        >
          <Calendar className="w-4 h-4 inline mr-1" /> By Day
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all ${viewMode === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
          style={viewMode !== 'all' ? { color: 'var(--color-text-secondary)' } : {}}
          onClick={() => setViewMode('all')}
        >
          <Clock className="w-4 h-4 inline mr-1" /> All Time
        </button>
      </div>

      {/* Date Selector (Day view only) */}
      {viewMode === 'day' && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between">
            <button onClick={goToPrevDay} className="p-2 rounded-xl" style={{ background: 'var(--color-surface-alt)' }}>
              <ChevronLeft className="w-5 h-5" style={{ color: 'var(--color-text)' }} />
            </button>
            
            {/* Clickable date with calendar */}
            <button 
              className="text-center flex-1 mx-2 p-2 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <div className="flex items-center justify-center gap-2">
                <CalendarDays className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                    {isToday ? 'Today' : format(selectedDate, 'EEEE')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {format(selectedDate, 'd MMMM yyyy')}
                  </p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={goToNextDay} 
              className="p-2 rounded-xl" 
              style={{ background: 'var(--color-surface-alt)' }}
              disabled={isToday}
            >
              <ChevronRight className="w-5 h-5" style={{ color: isToday ? 'var(--color-text-tertiary)' : 'var(--color-text)' }} />
            </button>
          </div>

          {/* Calendar Picker */}
          {showCalendar && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--color-surface-alt)' }}>
              <input
                type="date"
                className="w-full p-3 rounded-xl text-center font-medium"
                style={{ 
                  background: 'var(--color-surface)', 
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)'
                }}
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={handleDateChange}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
              <button 
                className="w-full mt-2 py-2 text-sm font-medium rounded-xl"
                style={{ color: 'var(--color-primary)' }}
                onClick={() => { setSelectedDate(new Date()); setShowCalendar(false); }}
              >
                Go to Today
              </button>
            </div>
          )}

          {/* Day Summary */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-surface-alt)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Spent</p>
              <p className="font-bold text-red-500 text-sm">{formatINR(daySummary.totalExpenses)}</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-surface-alt)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Calories</p>
              <p className="font-bold text-orange-500 text-sm">{daySummary.totalCalories || '-'}</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-surface-alt)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Sleep</p>
              <p className="font-bold text-purple-500 text-sm">{daySummary.sleepHours || '-'}h</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--color-surface-alt)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Steps</p>
              <p className="font-bold text-green-500 text-sm">{daySummary.steps.toLocaleString() || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search - Fixed icon overlap */}
      <div className="relative mb-4">
        <Search className="input-icon w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
        <input
          className="ios-input input-with-icon pr-10"
          placeholder="Search activities..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterCategory === cat.id 
                  ? 'bg-indigo-500 text-white' 
                  : ''
              }`}
              style={filterCategory !== cat.id ? { background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' } : {}}
              onClick={() => setFilterCategory(cat.id)}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      {viewMode === 'day' ? (
        dayActivities.length === 0 ? (
          <div className="card p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No activities recorded</p>
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              {isToday ? 'Start logging your day!' : 'Nothing was logged this day'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayActivities.map(item => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </div>
        )
      ) : (
        Object.keys(groupedByDate).length === 0 ? (
          <div className="card p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No history yet</p>
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Your activities will appear here</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="mb-6">
              <h3 className="text-sm font-semibold mb-2 sticky top-0 py-1 z-10" 
                style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}>
                {formatDate(date)}
              </h3>
              <div className="space-y-2">
                {items.map(item => (
                  <ActivityCard key={item.id} item={item} showDate={false} />
                ))}
              </div>
            </div>
          ))
        )
      )}
    </div>
  );
}

function ActivityCard({ item, showDate = true }: { item: any; showDate?: boolean }) {
  const config = TAG_CONFIG[item.category as keyof typeof TAG_CONFIG] || {
    label: item.category,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
    emoji: '📋',
  };

  return (
    <div className="card p-3 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: config.bg }}>
        <span className="text-lg">{config.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {item.action}
        </p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {item.details}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full" 
            style={{ background: config.bg, color: config.color }}>
            {config.label}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {formatTime(item.createdAt)}
            {showDate && ` · ${formatDate(item.createdAt)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
