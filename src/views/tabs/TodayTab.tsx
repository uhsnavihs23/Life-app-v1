/**
 * TodayTab - Main daily logging screen
 * 
 * This is the home screen where users can:
 * - Add free-text journal entries
 * - Tag entries by type (general, expense, food, sleep, exercise, note)
 * - Quick-add expenses, food, sleep, or activity
 * - See today's entries in a feed
 */

import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { TAG_CONFIG, type EntryTag } from '../../models/types';
import { format } from 'date-fns';
import {
  Plus, DollarSign, Utensils, Moon, Footprints,
  Send, ChevronDown, ChevronUp, X
} from 'lucide-react';

type QuickAddMode = null | 'expense' | 'food' | 'sleep' | 'activity';

export default function TodayTab() {
  const { state, addLog, addExpense, addFood, addSleep, addActivity } = useApp();
  const [logText, setLogText] = useState('');
  const [selectedTag, setSelectedTag] = useState<EntryTag>('general');
  const [quickAdd, setQuickAdd] = useState<QuickAddMode>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);

  // Expense form
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Food & Dining');
  const [expNote, setExpNote] = useState('');

  // Food form
  const [foodName, setFoodName] = useState('');
  const [foodPortion, setFoodPortion] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodMeal, setFoodMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');

  // Sleep form
  const [sleepHours, setSleepHours] = useState('7');
  const [sleepQuality, setSleepQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');

  // Activity form
  const [actSteps, setActSteps] = useState('');
  const [actDistance, setActDistance] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = state.dailyLogs.filter(l => l.createdAt.startsWith(today));
  const todayExpenses = state.expenses.filter(e => e.createdAt.startsWith(today));
  const todayFood = state.foodEntries.filter(f => f.createdAt.startsWith(today));
  const todaySleep = state.sleepEntries.filter(s => s.date === today);
  const todayActivity = state.activities.filter(a => a.date === today);

  const allTodayItems = [
    ...todayLogs.map(l => ({ ...l, _type: 'log' as const })),
    ...todayExpenses.map(e => ({ ...e, _type: 'expense' as const, tag: 'expense' as EntryTag, text: `$${e.amount} - ${e.category}${e.note ? ': ' + e.note : ''}` })),
    ...todayFood.map(f => ({ ...f, _type: 'food' as const, tag: 'food' as EntryTag, text: `${f.name} (${f.portionSize})${f.calories ? ' - ' + f.calories + ' cal' : ''}` })),
    ...todaySleep.map(s => ({ ...s, _type: 'sleep' as const, tag: 'sleep' as EntryTag, text: `${s.hours}h sleep - ${s.quality}` })),
    ...todayActivity.map(a => ({ ...a, _type: 'activity' as const, tag: 'exercise' as EntryTag, text: `${a.steps.toLocaleString()} steps${a.distanceKm ? ' - ' + a.distanceKm + ' km' : ''}` })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayItems = showAllEntries ? allTodayItems : allTodayItems.slice(0, 5);

  const handleSubmitLog = () => {
    if (!logText.trim()) return;
    addLog(logText.trim(), selectedTag);
    setLogText('');
  };

  const handleSubmitExpense = () => {
    const amt = parseFloat(expAmount);
    if (isNaN(amt) || amt <= 0) return;
    addExpense(amt, expCategory, expNote);
    setExpAmount(''); setExpNote('');
    setQuickAdd(null);
  };

  const handleSubmitFood = () => {
    if (!foodName.trim()) return;
    addFood(foodName.trim(), foodPortion || '1 serving', foodCalories ? parseInt(foodCalories) : undefined, foodMeal);
    setFoodName(''); setFoodPortion(''); setFoodCalories('');
    setQuickAdd(null);
  };

  const handleSubmitSleep = () => {
    const h = parseFloat(sleepHours);
    if (isNaN(h) || h <= 0) return;
    addSleep(h, sleepQuality);
    setQuickAdd(null);
  };

  const handleSubmitActivity = () => {
    const s = parseInt(actSteps);
    if (isNaN(s) || s <= 0) return;
    addActivity(s, actDistance ? parseFloat(actDistance) : undefined);
    setActSteps(''); setActDistance('');
    setQuickAdd(null);
  };

  return (
    <div className="pb-4 fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Today</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="card p-3 text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Entries</p>
          <p className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{allTodayItems.length}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Spent</p>
          <p className="text-lg font-bold text-red-500">${todayExpenses.reduce((s, e) => s + e.amount, 0).toFixed(0)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Meals</p>
          <p className="text-lg font-bold text-amber-500">{todayFood.length}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Steps</p>
          <p className="text-lg font-bold text-emerald-500">
            {todayActivity.reduce((s, a) => s + a.steps, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Log Entry Input */}
      <div className="card p-4 mb-4">
        <div className="flex gap-2 mb-3">
          <textarea
            className="ios-input flex-1 resize-none"
            style={{ minHeight: 56 }}
            placeholder="What's happening today? Write anything..."
            value={logText}
            onChange={e => setLogText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitLog(); } }}
            aria-label="Log entry text"
          />
          <button
            className="ios-btn ios-btn-primary self-end"
            style={{ padding: '12px 14px' }}
            onClick={handleSubmitLog}
            disabled={!logText.trim()}
            aria-label="Submit log entry"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Tag selector */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TAG_CONFIG) as EntryTag[]).map(tag => (
            <button
              key={tag}
              className={`tag-chip ${selectedTag === tag ? 'selected' : ''}`}
              onClick={() => setSelectedTag(tag)}
              aria-label={`Tag: ${TAG_CONFIG[tag].label}`}
            >
              {TAG_CONFIG[tag].label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {([
          { mode: 'expense' as const, icon: DollarSign, label: 'Expense', color: '#ef4444' },
          { mode: 'food' as const, icon: Utensils, label: 'Food', color: '#f59e0b' },
          { mode: 'sleep' as const, icon: Moon, label: 'Sleep', color: '#8b5cf6' },
          { mode: 'activity' as const, icon: Footprints, label: 'Activity', color: '#10b981' },
        ]).map(({ mode, icon: Icon, label, color }) => (
          <button
            key={mode}
            className={`card p-3 text-center transition-all ${quickAdd === mode ? 'ring-2' : ''}`}
            style={quickAdd === mode ? { borderColor: color } : {}}
            onClick={() => setQuickAdd(quickAdd === mode ? null : mode)}
            aria-label={`Quick add ${label}`}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Quick Add Forms */}
      {quickAdd && (
        <div className="card p-4 mb-4 slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>
              {quickAdd === 'expense' && '💰 Add Expense'}
              {quickAdd === 'food' && '🍽️ Add Food'}
              {quickAdd === 'sleep' && '😴 Add Sleep'}
              {quickAdd === 'activity' && '🏃 Add Activity'}
            </h3>
            <button onClick={() => setQuickAdd(null)} aria-label="Close form">
              <X className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          </div>

          {quickAdd === 'expense' && (
            <div className="space-y-3">
              <input className="ios-input" type="number" placeholder="Amount ($)" value={expAmount} onChange={e => setExpAmount(e.target.value)} step="0.01" />
              <select className="ios-input" value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                {['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Education', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input className="ios-input" placeholder="Note (optional)" value={expNote} onChange={e => setExpNote(e.target.value)} />
              <button className="ios-btn ios-btn-primary w-full" onClick={handleSubmitExpense}>
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </div>
          )}

          {quickAdd === 'food' && (
            <div className="space-y-3">
              <input className="ios-input" placeholder="Food name" value={foodName} onChange={e => setFoodName(e.target.value)} />
              <input className="ios-input" placeholder="Portion size (e.g., 1 cup)" value={foodPortion} onChange={e => setFoodPortion(e.target.value)} />
              <input className="ios-input" type="number" placeholder="Calories (optional)" value={foodCalories} onChange={e => setFoodCalories(e.target.value)} />
              <div className="flex gap-2 flex-wrap">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(m => (
                  <button key={m} className={`tag-chip ${foodMeal === m ? 'selected' : ''}`} onClick={() => setFoodMeal(m)}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <button className="ios-btn ios-btn-primary w-full" onClick={handleSubmitFood}>
                <Plus className="w-4 h-4" /> Add Food
              </button>
            </div>
          )}

          {quickAdd === 'sleep' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Hours slept: <strong>{sleepHours}h</strong>
                </label>
                <input type="range" min="1" max="14" step="0.5" value={sleepHours}
                  onChange={e => setSleepHours(e.target.value)}
                  className="w-full accent-purple-500" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['poor', 'fair', 'good', 'excellent'] as const).map(q => (
                  <button key={q} className={`tag-chip ${sleepQuality === q ? 'selected' : ''}`} onClick={() => setSleepQuality(q)}>
                    {q === 'poor' ? '😫' : q === 'fair' ? '😐' : q === 'good' ? '😊' : '🤩'} {q.charAt(0).toUpperCase() + q.slice(1)}
                  </button>
                ))}
              </div>
              <button className="ios-btn ios-btn-primary w-full" onClick={handleSubmitSleep}>
                <Plus className="w-4 h-4" /> Add Sleep
              </button>
            </div>
          )}

          {quickAdd === 'activity' && (
            <div className="space-y-3">
              <input className="ios-input" type="number" placeholder="Number of steps" value={actSteps} onChange={e => setActSteps(e.target.value)} />
              <input className="ios-input" type="number" placeholder="Distance in km (optional)" value={actDistance} onChange={e => setActDistance(e.target.value)} step="0.1" />
              <button className="ios-btn ios-btn-primary w-full" onClick={handleSubmitActivity}>
                <Plus className="w-4 h-4" /> Add Activity
              </button>
            </div>
          )}
        </div>
      )}

      {/* Today's Feed */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Today's Feed ({allTodayItems.length})
        </h2>
        
        {allTodayItems.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-4xl mb-2">📝</p>
            <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No entries yet today</p>
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Start logging your day above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item) => {
              const tag = 'tag' in item ? item.tag as EntryTag : 'general';
              const config = TAG_CONFIG[tag];
              return (
                <div key={item.id} className="card p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: config.bg }}>
                    <span className="text-sm">
                      {tag === 'general' ? '📋' : tag === 'expense' ? '💰' : tag === 'food' ? '🍽️' : tag === 'sleep' ? '😴' : tag === 'exercise' ? '🏃' : '📌'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                      {'text' in item ? item.text : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: config.bg, color: config.color }}>
                        {config.label}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        {format(new Date(item.createdAt), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {allTodayItems.length > 5 && (
              <button
                className="w-full py-2 text-sm font-medium flex items-center justify-center gap-1"
                style={{ color: 'var(--color-primary)' }}
                onClick={() => setShowAllEntries(!showAllEntries)}
              >
                {showAllEntries ? (
                  <><ChevronUp className="w-4 h-4" /> Show Less</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Show All ({allTodayItems.length})</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
