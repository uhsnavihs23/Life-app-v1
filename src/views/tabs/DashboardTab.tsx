/**
 * DashboardTab - Life insights at a glance
 * 
 * Updated with:
 * - INR currency (₹)
 * - Deep health insights
 * - AI-powered suggestions
 * - Safe area for Dynamic Island
 */

import { useMemo, useState, useCallback } from 'react';
import { useApp } from '../../store/AppContext';
import { formatINR } from '../../models/types';
import { GeminiService, hasGeminiApiKey } from '../../services/GeminiService';
import { format, subDays, startOfWeek, isAfter } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, IndianRupee, Utensils, Moon, Footprints, Brain, Heart, Droplets, Zap, Loader2 } from 'lucide-react';

export default function DashboardTab() {
  const { state } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const weekStart = startOfWeek(new Date());
  
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Calculate stats — SUM all entries per day, never just take first
  const stats = useMemo(() => {
    const expToday = state.expenses.filter(e => e.createdAt.startsWith(today));
    const expWeek = state.expenses.filter(e => isAfter(new Date(e.createdAt), weekStart));
    const foodToday = state.foodEntries.filter(f => f.createdAt.startsWith(today));
    const sleepToday = state.sleepEntries.filter(s => s.date === today);
    const actToday = state.activities.filter(a => a.date === today);
    const healthToday = state.healthMetrics.filter(h => h.date === today);

    // SUM all sleep entries for today (night sleep + naps)
    const totalSleepToday = sleepToday.reduce((s, e) => s + e.hours, 0);
    // Best quality from today's entries
    const qualityOrder = ['excellent', 'good', 'fair', 'poor'];
    const bestQuality = sleepToday.length > 0
      ? sleepToday.reduce((best, e) => qualityOrder.indexOf(e.quality) < qualityOrder.indexOf(best) ? e.quality : best, sleepToday[0].quality)
      : null;
    // SUM all water intake from health metrics today
    const totalWater = healthToday.reduce((s, h) => s + (h.waterIntake || 0), 0);

    return {
      expensesToday: expToday.reduce((s, e) => s + e.amount, 0),
      expensesWeek: expWeek.reduce((s, e) => s + e.amount, 0),
      mealsToday: foodToday.length,
      caloriesToday: foodToday.reduce((s, f) => s + (f.calories || 0), 0),
      proteinToday: foodToday.reduce((s, f) => s + (f.protein || 0), 0),
      carbsToday: foodToday.reduce((s, f) => s + (f.carbs || 0), 0),
      fatToday: foodToday.reduce((s, f) => s + (f.fat || 0), 0),
      sleepToday: Math.round(totalSleepToday * 10) / 10,
      sleepQuality: bestQuality,
      stepsToday: actToday.reduce((s, a) => s + a.steps, 0),
      entriesTotal: state.dailyLogs.length,
      mood: healthToday.length > 0 ? healthToday[healthToday.length - 1].mood : null,
      energy: healthToday.length > 0 ? healthToday[healthToday.length - 1].energyLevel : null,
      water: totalWater,
    };
  }, [state.expenses, state.foodEntries, state.sleepEntries, state.activities, state.healthMetrics, state.dailyLogs, today, weekStart]);

  // Build exercise and food summaries for AI context
  const exerciseSummary = useMemo(() => {
    const exerciseLogs = state.dailyLogs.filter(l => l.tag === 'exercise' && l.createdAt.startsWith(today));
    return exerciseLogs.map(l => l.text).join('; ') || '';
  }, [state.dailyLogs, today]);

  const foodSummary = useMemo(() => {
    return state.foodEntries.filter(f => f.createdAt.startsWith(today))
      .map(f => `${f.name} (${f.portionSize})${f.calories ? ' ' + f.calories + 'cal' : ''}`).join(', ') || '';
  }, [state.foodEntries, today]);

  // AI insights — manual refresh only
  const loadAiInsights = useCallback(() => {
    if (!hasGeminiApiKey() || loadingInsights) return;
    setLoadingInsights(true);
    GeminiService.generateInsights({
      sleepHours: stats.sleepToday,
      steps: stats.stepsToday,
      expenses: stats.expensesToday,
      meals: stats.mealsToday,
      calories: stats.caloriesToday,
      exerciseLog: exerciseSummary,
      foodLog: foodSummary,
    }).then(insights => {
      setAiInsights(insights);
    }).catch(err => {
      console.warn('AI insights error:', err);
      setAiInsights([`⚠️ ${err instanceof Error ? err.message : 'Could not load insights'}`]);
    }).finally(() => {
      setLoadingInsights(false);
    });
  }, [stats, loadingInsights, exerciseSummary, foodSummary]);

  // Chart range state
  const [sleepRange, setSleepRange] = useState(7);
  const [stepsRange, setStepsRange] = useState(7);

  // Sleep data for chart — SUM all entries per day
  const sleepChartData = useMemo(() => {
    const days = [];
    for (let i = sleepRange - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayEntries = state.sleepEntries.filter(s => s.date === d);
      const totalHours = dayEntries.reduce((s, e) => s + e.hours, 0);
      days.push({
        day: format(subDays(new Date(), i), 'd MMM'),
        hours: Math.round(totalHours * 10) / 10,
      });
    }
    return days;
  }, [state.sleepEntries, sleepRange]);

  // Expense category breakdown
  const expensePieData = useMemo(() => {
    const catMap: Record<string, number> = {};
    state.expenses
      .filter(e => isAfter(new Date(e.createdAt), weekStart))
      .forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [state.expenses, weekStart]);

  // Steps data for chart
  const stepsChartData = useMemo(() => {
    const days = [];
    for (let i = stepsRange - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayActivities = state.activities.filter(a => a.date === d);
      days.push({
        day: format(subDays(new Date(), i), 'd MMM'),
        steps: dayActivities.reduce((s, a) => s + a.steps, 0),
      });
    }
    return days;
  }, [state.activities, stepsRange]);

  const PIE_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  // Generate local insights if no API key
  const localInsights = useMemo(() => {
    const insights: string[] = [];
    
    if (stats.sleepToday > 0) {
      if (stats.sleepToday >= 7 && stats.sleepToday <= 9) {
        insights.push(`✅ Great sleep! ${stats.sleepToday}h is perfect for recovery and focus.`);
      } else if (stats.sleepToday < 6) {
        insights.push(`⚠️ Only ${stats.sleepToday}h sleep. Try to get 7-9 hours tonight for better health.`);
      } else if (stats.sleepToday > 9) {
        insights.push(`💤 ${stats.sleepToday}h sleep is above average. Check if you're oversleeping.`);
      }
    }

    if (stats.stepsToday > 0) {
      if (stats.stepsToday >= 10000) {
        insights.push(`🎉 Amazing! ${stats.stepsToday.toLocaleString()} steps - you've hit your daily goal!`);
      } else if (stats.stepsToday >= 7000) {
        insights.push(`👍 Good progress! ${stats.stepsToday.toLocaleString()} steps. ${(10000 - stats.stepsToday).toLocaleString()} more for 10k!`);
      } else if (stats.stepsToday > 0) {
        insights.push(`🚶 ${stats.stepsToday.toLocaleString()} steps so far. Try a short walk to boost your count!`);
      }
    }

    if (stats.mealsToday > 0) {
      if (stats.caloriesToday > 0) {
        if (stats.caloriesToday < 1200) {
          insights.push(`🍎 ${stats.caloriesToday} cal logged - might be low. Ensure you're eating enough.`);
        } else if (stats.caloriesToday > 2500) {
          insights.push(`🍔 ${stats.caloriesToday} cal today - consider balancing with more activity.`);
        } else {
          insights.push(`🥗 ${stats.caloriesToday} cal across ${stats.mealsToday} meals - looking balanced!`);
        }
      } else {
        insights.push(`📝 ${stats.mealsToday} meals logged. Add calories for better nutrition tracking!`);
      }
    }

    if (stats.water && stats.water > 0) {
      if (stats.water >= 8) {
        insights.push(`💧 Great hydration! ${stats.water} glasses of water today.`);
      } else {
        insights.push(`💧 ${stats.water} glasses so far. Aim for 8+ for optimal hydration.`);
      }
    }

    if (stats.expensesToday > 0) {
      insights.push(`💰 Spent ${formatINR(stats.expensesToday)} today (${formatINR(stats.expensesWeek)} this week).`);
    }

    if (stats.mood) {
      const moodEmoji = stats.mood === 'great' ? '🤩' : stats.mood === 'good' ? '😊' : stats.mood === 'okay' ? '😐' : stats.mood === 'low' ? '😔' : '😫';
      insights.push(`${moodEmoji} Your mood today: ${stats.mood}. ${stats.mood === 'great' || stats.mood === 'good' ? 'Keep it up!' : 'Hope it gets better!'}`);
    }

    return insights;
  }, [stats]);

  const displayInsights = aiInsights.length > 0 ? aiInsights : localInsights;

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Your life at a glance
        </p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={IndianRupee} label="Spent Today" value={formatINR(stats.expensesToday)} color="#ef4444" sub={`${formatINR(stats.expensesWeek)} this week`} />
        <StatCard icon={Utensils} label="Meals Today" value={stats.mealsToday.toString()} color="#f59e0b" sub={`~${stats.caloriesToday} cal`} />
        <StatCard icon={Moon} label="Sleep" value={`${stats.sleepToday}h`} color="#8b5cf6" sub={stats.sleepToday >= 7 ? 'Well rested 😊' : stats.sleepToday > 0 ? 'Could improve 😐' : 'Not logged'} />
        <StatCard icon={Footprints} label="Steps" value={stats.stepsToday.toLocaleString()} color="#10b981" sub={stats.stepsToday >= 10000 ? 'Goal reached! 🎉' : `${Math.max(0, 10000 - stats.stepsToday).toLocaleString()} to goal`} />
      </div>

      {/* Health Quick Stats */}
      {(stats.water || stats.mood || stats.energy) && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {stats.water !== undefined && stats.water > 0 && (
            <div className="card p-3 text-center">
              <Droplets className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{stats.water}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Glasses</p>
            </div>
          )}
          {stats.energy && (
            <div className="card p-3 text-center">
              <Zap className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{stats.energy}/10</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Energy</p>
            </div>
          )}
          {stats.mood && (
            <div className="card p-3 text-center">
              <Heart className="w-5 h-5 mx-auto text-rose-500 mb-1" />
              <p className="text-lg font-bold capitalize" style={{ color: 'var(--color-text)' }}>{stats.mood}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Mood</p>
            </div>
          )}
        </div>
      )}

      {/* AI Insights */}
      <div className="card p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.05) 100%)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Brain className="w-4 h-4 text-indigo-500" /> 
            {hasGeminiApiKey() ? 'AI Insights' : 'Daily Insights'}
            {loadingInsights && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
          </h3>
          {hasGeminiApiKey() && (
            <button 
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)' }}
              onClick={loadAiInsights}
              disabled={loadingInsights}
            >
              {loadingInsights ? 'Loading...' : '✨ Refresh'}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {displayInsights.length > 0 ? (
            displayInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'var(--color-surface-alt)' }}>
                <TrendingUp className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{insight}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
              Start logging your activities to get personalized insights! ✨
            </p>
          )}
        </div>
        {!hasGeminiApiKey() && displayInsights.length > 0 && (
          <p className="text-xs text-center mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Add Gemini API key in Profile for smarter AI insights ✨
          </p>
        )}
      </div>

      {/* Sleep Chart */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Moon className="w-4 h-4 text-purple-500" /> Sleep
            {stats.sleepToday > 0 && <span className="text-sm font-normal text-purple-500">{stats.sleepToday}h today</span>}
          </h3>
          <div className="flex gap-1">
            {[7, 15, 30].map(d => (
              <button key={d} className="text-xs px-2 py-1 rounded-lg" onClick={() => setSleepRange(d)}
                style={{ background: sleepRange === d ? 'var(--color-primary)' : 'var(--color-surface-alt)', color: sleepRange === d ? 'white' : 'var(--color-text-tertiary)' }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {sleepChartData.some(d => d.hours > 0) ? (
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={sleepChartData} barSize={sleepRange > 15 ? 8 : 16}>
              <XAxis dataKey="day" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} interval={sleepRange <= 7 ? 0 : sleepRange <= 15 ? 1 : 3} angle={sleepRange > 7 ? -35 : 0} textAnchor={sleepRange > 7 ? 'end' : 'middle'} height={sleepRange > 7 ? 40 : 25} />
              <YAxis hide domain={[0, 12]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                formatter={(value: any) => [`${value}h`, 'Sleep']} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
              <Bar dataKey="hours" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No sleep data yet</p>
          </div>
        )}
      </div>

      {/* Steps Chart */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Footprints className="w-4 h-4 text-emerald-500" /> Steps
            {stats.stepsToday > 0 && <span className="text-sm font-normal text-emerald-500">{stats.stepsToday.toLocaleString()} today</span>}
          </h3>
          <div className="flex gap-1">
            {[7, 15, 30].map(d => (
              <button key={d} className="text-xs px-2 py-1 rounded-lg" onClick={() => setStepsRange(d)}
                style={{ background: stepsRange === d ? '#10b981' : 'var(--color-surface-alt)', color: stepsRange === d ? 'white' : 'var(--color-text-tertiary)' }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {stepsChartData.some(d => d.steps > 0) ? (
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stepsChartData} barSize={stepsRange > 15 ? 8 : 16}>
              <XAxis dataKey="day" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} interval={stepsRange <= 7 ? 0 : stepsRange <= 15 ? 1 : 3} angle={stepsRange > 7 ? -35 : 0} textAnchor={stepsRange > 7 ? 'end' : 'middle'} height={stepsRange > 7 ? 40 : 25} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                formatter={(value: any) => [`${Number(value).toLocaleString()} steps`, 'Steps']} labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }} />
              <Bar dataKey="steps" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No steps data yet</p>
          </div>
        )}
      </div>

      {/* Expense Breakdown */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <IndianRupee className="w-4 h-4 text-red-500" /> Expenses This Week
        </h3>
        {expensePieData.length > 0 ? (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                  {expensePieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {expensePieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs flex-1" style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{formatINR(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-36 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No expenses logged this week.</p>
          </div>
        )}
      </div>

      {/* Week vs Week Comparison */}
      <WeekComparison state={state} />

      {/* Smart Spending Patterns */}
      <SmartCategories expenses={state.expenses} />
    </div>
  );
}

/** This Week vs Last Week comparison */
function WeekComparison({ state }: { state: any }) {
  const getWeekData = (offsetDays: number) => {
    const start = new Date();
    start.setDate(start.getDate() - offsetDays - 6);
    const end = new Date();
    end.setDate(end.getDate() - offsetDays);

    const inRange = (d: string) => {
      const dt = new Date(d);
      return dt >= start && dt <= end;
    };

    const expenses = state.expenses.filter((e: any) => inRange(e.createdAt)).reduce((s: number, e: any) => s + e.amount, 0);
    const meals = state.foodEntries.filter((f: any) => inRange(f.createdAt)).length;
    const calories = state.foodEntries.filter((f: any) => inRange(f.createdAt)).reduce((s: number, f: any) => s + (f.calories || 0), 0);
    
    let totalSleep = 0, sleepDays = 0;
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(new Date(), offsetDays + i), 'yyyy-MM-dd');
      const s = state.sleepEntries.find((e: any) => e.date === d);
      if (s) { totalSleep += s.hours; sleepDays++; }
    }

    const steps = state.activities.filter((a: any) => inRange(a.createdAt)).reduce((s: number, a: any) => s + a.steps, 0);

    return {
      expenses, meals, calories,
      avgSleep: sleepDays > 0 ? Math.round(totalSleep / sleepDays * 10) / 10 : 0,
      steps,
    };
  };

  const thisWeek = getWeekData(0);
  const lastWeek = getWeekData(7);

  const compareArrow = (current: number, previous: number, lowerIsBetter = false) => {
    if (previous === 0) return '';
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) return '→ same';
    const good = lowerIsBetter ? pct < 0 : pct > 0;
    return `${good ? '↑' : '↓'} ${Math.abs(pct)}%`;
  };

  const rows = [
    { label: '💰 Spent', thisW: `₹${thisWeek.expenses.toLocaleString('en-IN')}`, lastW: `₹${lastWeek.expenses.toLocaleString('en-IN')}`, change: compareArrow(thisWeek.expenses, lastWeek.expenses, true) },
    { label: '😴 Avg Sleep', thisW: `${thisWeek.avgSleep}h`, lastW: `${lastWeek.avgSleep}h`, change: compareArrow(thisWeek.avgSleep, lastWeek.avgSleep) },
    { label: '🚶 Steps', thisW: thisWeek.steps.toLocaleString(), lastW: lastWeek.steps.toLocaleString(), change: compareArrow(thisWeek.steps, lastWeek.steps) },
    { label: '🍽️ Meals', thisW: thisWeek.meals.toString(), lastW: lastWeek.meals.toString(), change: compareArrow(thisWeek.meals, lastWeek.meals) },
    { label: '🔥 Calories', thisW: thisWeek.calories.toLocaleString(), lastW: lastWeek.calories.toLocaleString(), change: '' },
  ];

  return (
    <div className="card p-4 mb-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        📊 This Week vs Last Week
      </h3>
      <div className="space-y-1">
        <div className="grid grid-cols-4 gap-2 pb-2 mb-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}></span>
          <span className="text-xs font-medium text-center" style={{ color: 'var(--color-text-secondary)' }}>This week</span>
          <span className="text-xs font-medium text-center" style={{ color: 'var(--color-text-tertiary)' }}>Last week</span>
          <span className="text-xs font-medium text-center" style={{ color: 'var(--color-text-tertiary)' }}>Change</span>
        </div>
        {rows.map(row => (
          <div key={row.label} className="grid grid-cols-4 gap-2 py-1.5">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
            <span className="text-xs font-semibold text-center" style={{ color: 'var(--color-text)' }}>{row.thisW}</span>
            <span className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>{row.lastW}</span>
            <span className={`text-xs font-medium text-center ${row.change.includes('↑') ? 'text-green-500' : row.change.includes('↓') ? 'text-red-500' : ''}`}>{row.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Smart spending patterns — learns from your expense history */
function SmartCategories({ expenses }: { expenses: any[] }) {
  const patterns = useMemo(() => {
    if (expenses.length < 3) return null;

    // Group by category
    const catMap: Record<string, { total: number; count: number; avgAmount: number; lastUsed: string }> = {};
    expenses.forEach(e => {
      if (!catMap[e.category]) catMap[e.category] = { total: 0, count: 0, avgAmount: 0, lastUsed: '' };
      catMap[e.category].total += e.amount;
      catMap[e.category].count += 1;
      if (!catMap[e.category].lastUsed || e.createdAt > catMap[e.category].lastUsed) {
        catMap[e.category].lastUsed = e.createdAt;
      }
    });

    Object.keys(catMap).forEach(k => {
      catMap[k].avgAmount = Math.round(catMap[k].total / catMap[k].count);
    });

    // Sort by frequency
    const sorted = Object.entries(catMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    // Monthly estimate
    const oldestDate = new Date(expenses[expenses.length - 1]?.createdAt || new Date());
    const daysDiff = Math.max(1, Math.round((Date.now() - oldestDate.getTime()) / 86400000));
    const dailyAvg = expenses.reduce((s, e) => s + e.amount, 0) / daysDiff;
    const monthlyEstimate = Math.round(dailyAvg * 30);

    return { topCategories: sorted, monthlyEstimate, dailyAvg: Math.round(dailyAvg) };
  }, [expenses]);

  if (!patterns) return null;

  return (
    <div className="card p-4 mb-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        🧠 Spending Patterns
      </h3>
      
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.06)' }}>
          <p className="text-lg font-bold text-red-500">₹{patterns.dailyAvg.toLocaleString('en-IN')}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>daily avg</p>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.06)' }}>
          <p className="text-lg font-bold text-amber-500">₹{patterns.monthlyEstimate.toLocaleString('en-IN')}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>est. monthly</p>
        </div>
      </div>

      <div className="space-y-2">
        {patterns.topCategories.map(([cat, data]) => (
          <div key={cat} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{cat}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{data.count}x · avg ₹{data.avgAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-alt)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(100, (data.total / patterns.topCategories[0][1].total) * 100)}%`,
                  background: 'var(--color-primary)',
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; value: string; color: string; sub: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{sub}</p>
    </div>
  );
}
