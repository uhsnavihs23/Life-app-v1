/**
 * TodayTab - Main daily logging screen
 * 
 * Features:
 * - Free text log with AI auto-classification
 * - Quick-add buttons for expense, food, sleep, activity, health, lists
 * - Swipeable feed items (left=delete, right=edit)
 * - All amounts in ₹
 */

import { useState, useRef, useCallback } from 'react';
import { useApp } from '../../store/AppContext';
import { TAG_CONFIG, formatINR, formatTime, type EntryTag } from '../../models/types';
import { GeminiService, hasGeminiApiKey } from '../../services/GeminiService';
import { format } from 'date-fns';
import {
  Plus, IndianRupee, Utensils, Moon, Footprints,
  Send, ChevronDown, ChevronUp, X, Film, Heart, Droplets,
  Trash2, Loader2
} from 'lucide-react';

type QuickAddMode = null | 'expense' | 'food' | 'sleep' | 'activity' | 'health' | 'list';

export default function TodayTab() {
  const { state, addLog, addExpense, addFood, addSleep, addActivity, addHealthMetrics, addListItem, dispatch } = useApp();
  const [logText, setLogText] = useState('');
  const [selectedTag, setSelectedTag] = useState<EntryTag>('general');
  const [quickAdd, setQuickAdd] = useState<QuickAddMode>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);

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

  // Health form
  const [healthMood, setHealthMood] = useState<'great' | 'good' | 'okay' | 'low' | 'bad'>('good');
  const [healthEnergy, setHealthEnergy] = useState('7');
  const [healthWater, setHealthWater] = useState('');

  // List form
  const [listType, setListType] = useState<'movie' | 'music' | 'book'>('movie');
  const [listTitle, setListTitle] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = state.dailyLogs.filter(l => l.createdAt.startsWith(today));
  const todayExpenses = state.expenses.filter(e => e.createdAt.startsWith(today));
  const todayFood = state.foodEntries.filter(f => f.createdAt.startsWith(today));
  const todaySleep = state.sleepEntries.filter(s => s.date === today);
  const todayActivity = state.activities.filter(a => a.date === today);

  const allTodayItems = [
    ...todayLogs.map(l => ({ ...l, _type: 'log' as const })),
    ...todayExpenses.map(e => ({ ...e, _type: 'expense' as const, tag: 'expense' as EntryTag, text: `${formatINR(e.amount)} - ${e.category}${e.note ? ': ' + e.note : ''}` })),
    ...todayFood.map(f => ({ ...f, _type: 'food' as const, tag: 'food' as EntryTag, text: `${f.name} (${f.portionSize})${f.calories ? ' - ' + f.calories + ' cal' : ''}` })),
    ...todaySleep.map(s => ({ ...s, _type: 'sleep' as const, tag: 'sleep' as EntryTag, text: `${s.hours}h sleep - ${s.quality}` })),
    ...todayActivity.map(a => ({ ...a, _type: 'activity' as const, tag: 'exercise' as EntryTag, text: `${a.steps.toLocaleString()} steps${a.distanceKm ? ' - ' + a.distanceKm + ' km' : ''}` })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const displayItems = showAllEntries ? allTodayItems : allTodayItems.slice(0, 8);

  const handleSubmitLog = async () => {
    if (!logText.trim()) return;
    const text = logText.trim();
    setLogText('');

    // First, add immediately as a general log
    addLog(text, selectedTag);

    // Then, if AI is available, try to classify and auto-add structured data
    if (hasGeminiApiKey() && selectedTag === 'general') {
      setIsClassifying(true);
      try {
        const result = await GeminiService.classifyLog(text);
        // If AI detects specific type with high confidence, also add structured entry
        if (result.confidence > 0.7) {
          const data = result.extractedData as Record<string, any>;
          if (result.type === 'expense' && data.amount) {
            addExpense(Number(data.amount), data.category || 'Other', text);
          } else if (result.type === 'sleep' && data.hours) {
            addSleep(Number(data.hours), data.quality || 'good');
          } else if (result.type === 'exercise' && data.steps) {
            addActivity(Number(data.steps), data.distance ? Number(data.distance) : undefined);
          }
        }
      } catch { /* classification failed silently, log is already saved */ }
      setIsClassifying(false);
    }
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

  const handleSubmitHealth = () => {
    addHealthMetrics({
      mood: healthMood,
      energyLevel: parseInt(healthEnergy),
      waterIntake: healthWater ? parseInt(healthWater) : undefined,
    });
    setQuickAdd(null);
  };

  const handleSubmitList = () => {
    if (!listTitle.trim()) return;
    addListItem(listType, listTitle.trim());
    setListTitle('');
    setQuickAdd(null);
  };

  // Delete an entry by type
  const handleDeleteItem = useCallback((item: any) => {
    const type = item._type;
    if (type === 'log') dispatch({ type: 'DELETE_LOG', id: item.id } as any);
    else if (type === 'expense') dispatch({ type: 'DELETE_EXPENSE', id: item.id } as any);
    else if (type === 'food') dispatch({ type: 'DELETE_FOOD', id: item.id } as any);
    else if (type === 'sleep') dispatch({ type: 'DELETE_SLEEP', id: item.id } as any);
    else if (type === 'activity') dispatch({ type: 'DELETE_ACTIVITY', id: item.id } as any);
  }, [dispatch]);

  return (
    <div className="pb-4 fade-in safe-area-top">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Today</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {format(new Date(), 'EEEE, d MMMM yyyy')}
          {isClassifying && <span className="ml-2 text-indigo-500">✨ Classifying...</span>}
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
          <p className="text-lg font-bold text-red-500">{formatINR(todayExpenses.reduce((s, e) => s + e.amount, 0))}</p>
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
            placeholder="What's happening today? E.g. 'Slept at 11pm, woke at 7am' or 'Spent ₹300 on cab'"
            value={logText}
            onChange={e => setLogText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitLog(); } }}
          />
          <button
            className="ios-btn ios-btn-primary self-end"
            style={{ padding: '12px 14px' }}
            onClick={handleSubmitLog}
            disabled={!logText.trim() || isClassifying}
          >
            {isClassifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        {/* Tag selector */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TAG_CONFIG) as EntryTag[]).slice(0, 6).map(tag => (
            <button
              key={tag}
              className={`tag-chip ${selectedTag === tag ? 'selected' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {TAG_CONFIG[tag].emoji} {TAG_CONFIG[tag].label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {([
          { mode: 'expense' as const, icon: IndianRupee, label: 'Expense', color: '#ef4444' },
          { mode: 'food' as const, icon: Utensils, label: 'Food', color: '#f59e0b' },
          { mode: 'sleep' as const, icon: Moon, label: 'Sleep', color: '#8b5cf6' },
          { mode: 'activity' as const, icon: Footprints, label: 'Steps', color: '#10b981' },
        ]).map(({ mode, icon: Icon, label, color }) => (
          <button
            key={mode}
            className={`card p-3 text-center transition-all ${quickAdd === mode ? 'ring-2 ring-indigo-500' : ''}`}
            onClick={() => setQuickAdd(quickAdd === mode ? null : mode)}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {([
          { mode: 'health' as const, icon: Heart, label: 'Health', color: '#f43f5e' },
          { mode: 'list' as const, icon: Film, label: 'Lists', color: '#ec4899' },
        ]).map(({ mode, icon: Icon, label, color }) => (
          <button
            key={mode}
            className={`card p-3 text-center transition-all ${quickAdd === mode ? 'ring-2 ring-indigo-500' : ''}`}
            onClick={() => setQuickAdd(quickAdd === mode ? null : mode)}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
          </button>
        ))}
        <div className="col-span-2"></div>
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
              {quickAdd === 'health' && '❤️ Health Check'}
              {quickAdd === 'list' && '📝 Add to List'}
            </h3>
            <button onClick={() => setQuickAdd(null)}>
              <X className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </button>
          </div>

          {quickAdd === 'expense' && (
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-medium" style={{ color: 'var(--color-text-secondary)' }}>₹</span>
                <input className="ios-input" style={{ paddingLeft: 32 }} type="number" placeholder="Amount" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
              </div>
              <select className="ios-input" value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                {['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Education', 'Groceries', 'Travel', 'Other'].map(c => (
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
                    {m === 'breakfast' ? '🌅' : m === 'lunch' ? '☀️' : m === 'dinner' ? '🌙' : '🍿'} {m.charAt(0).toUpperCase() + m.slice(1)}
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

          {quickAdd === 'health' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>How are you feeling?</label>
                <div className="flex gap-2 flex-wrap">
                  {(['great', 'good', 'okay', 'low', 'bad'] as const).map(m => (
                    <button key={m} className={`tag-chip ${healthMood === m ? 'selected' : ''}`} onClick={() => setHealthMood(m)}>
                      {m === 'great' ? '🤩' : m === 'good' ? '😊' : m === 'okay' ? '😐' : m === 'low' ? '😔' : '😫'} {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Energy level: <strong>{healthEnergy}/10</strong>
                </label>
                <input type="range" min="1" max="10" value={healthEnergy}
                  onChange={e => setHealthEnergy(e.target.value)}
                  className="w-full accent-rose-500" />
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                <input className="ios-input flex-1" type="number" placeholder="Glasses of water" value={healthWater} onChange={e => setHealthWater(e.target.value)} />
              </div>
              <button className="ios-btn ios-btn-primary w-full" onClick={handleSubmitHealth}>
                <Heart className="w-4 h-4" /> Log Health
              </button>
            </div>
          )}

          {quickAdd === 'list' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['movie', 'music', 'book'] as const).map(t => (
                  <button key={t} className={`flex-1 py-2 rounded-xl text-sm font-medium ${listType === t ? 'bg-indigo-500 text-white' : ''}`}
                    style={listType !== t ? { background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' } : {}}
                    onClick={() => setListType(t)}>
                    {t === 'movie' ? '🎬' : t === 'music' ? '🎵' : '📚'} {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <input className="ios-input" placeholder={`${listType.charAt(0).toUpperCase() + listType.slice(1)} title...`} 
                value={listTitle} onChange={e => setListTitle(e.target.value)} />
              <button className="ios-btn ios-btn-primary w-full" onClick={handleSubmitList}>
                <Plus className="w-4 h-4" /> Add to {listType.charAt(0).toUpperCase() + listType.slice(1)}s
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
                <SwipeableCard
                  key={item.id}
                  onDelete={() => handleDeleteItem(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: config.bg }}>
                      <span className="text-sm">{config.emoji}</span>
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
                          {formatTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </SwipeableCard>
              );
            })}
            
            {allTodayItems.length > 8 && (
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

/** Swipeable card — swipe left to reveal delete button */
function SwipeableCard({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const [offsetX, setOffsetX] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientX - startX.current;
    // Only allow left swipe (negative)
    if (diff < 0 && diff > -100) {
      setOffsetX(diff);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (offsetX < -50) {
      setShowActions(true);
      setOffsetX(-80);
    } else {
      setShowActions(false);
      setOffsetX(0);
    }
  };

  const handleDelete = () => {
    if (confirm('Delete this entry?')) {
      onDelete();
      setShowActions(false);
      setOffsetX(0);
    }
  };

  const handleClose = () => {
    setShowActions(false);
    setOffsetX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ border: '1px solid var(--color-border)' }}>
      {/* Delete button revealed on swipe */}
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center"
        style={{ background: '#ef4444' }}>
        <button onClick={handleDelete} className="p-2 text-white">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      {/* Card content */}
      <div
        className="relative p-3 transition-transform"
        style={{ 
          transform: `translateX(${offsetX}px)`,
          background: 'var(--color-surface)',
          transitionDuration: isDragging.current ? '0ms' : '200ms',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (showActions) handleClose(); }}
      >
        {children}
      </div>
    </div>
  );
}
