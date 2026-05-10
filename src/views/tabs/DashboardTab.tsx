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
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, IndianRupee, Utensils, Moon, Footprints, Brain, Heart, Droplets, Zap, Loader2 } from 'lucide-react';

export default function DashboardTab() {
  const { state } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const weekStart = startOfWeek(new Date());
  
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Calculate stats — depend on SPECIFIC arrays, not entire state
  const stats = useMemo(() => {
    const expToday = state.expenses.filter(e => e.createdAt.startsWith(today));
    const expWeek = state.expenses.filter(e => isAfter(new Date(e.createdAt), weekStart));
    const foodToday = state.foodEntries.filter(f => f.createdAt.startsWith(today));
    const sleepToday = state.sleepEntries.filter(s => s.date === today);
    const actToday = state.activities.filter(a => a.date === today);
    const healthToday = state.healthMetrics.filter(h => h.date === today);

    return {
      expensesToday: expToday.reduce((s, e) => s + e.amount, 0),
      expensesWeek: expWeek.reduce((s, e) => s + e.amount, 0),
      mealsToday: foodToday.length,
      caloriesToday: foodToday.reduce((s, f) => s + (f.calories || 0), 0),
      proteinToday: foodToday.reduce((s, f) => s + (f.protein || 0), 0),
      carbsToday: foodToday.reduce((s, f) => s + (f.carbs || 0), 0),
      fatToday: foodToday.reduce((s, f) => s + (f.fat || 0), 0),
      sleepToday: sleepToday.length > 0 ? sleepToday[0].hours : 0,
      sleepQuality: sleepToday.length > 0 ? sleepToday[0].quality : null,
      stepsToday: actToday.reduce((s, a) => s + a.steps, 0),
      entriesTotal: state.dailyLogs.length,
      mood: healthToday.length > 0 ? healthToday[0].mood : null,
      energy: healthToday.length > 0 ? healthToday[0].energyLevel : null,
      water: healthToday.length > 0 ? healthToday[0].waterIntake : 0,
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

  // Sleep data for chart (last 7 days)
  const sleepChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const entry = state.sleepEntries.find(s => s.date === d);
      days.push({
        day: format(subDays(new Date(), i), 'EEE'),
        hours: entry ? entry.hours : 0,
      });
    }
    return days;
  }, [state.sleepEntries]);

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

  // Steps data for chart (last 7 days)
  const stepsChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayActivities = state.activities.filter(a => a.date === d);
      days.push({
        day: format(subDays(new Date(), i), 'EEE'),
        steps: dayActivities.reduce((s, a) => s + a.steps, 0),
      });
    }
    return days;
  }, [state.activities]);

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
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Moon className="w-4 h-4 text-purple-500" /> Sleep (Last 7 Days)
        </h3>
        {sleepChartData.some(d => d.hours > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={sleepChartData}>
              <defs>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 12]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="hours" stroke="#8b5cf6" fill="url(#sleepGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No sleep data yet. Log your sleep to see trends!</p>
          </div>
        )}
      </div>

      {/* Steps Chart */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Footprints className="w-4 h-4 text-emerald-500" /> Steps (Last 7 Days)
        </h3>
        {stepsChartData.some(d => d.steps > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stepsChartData}>
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="steps" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No activity data yet. Log your steps!</p>
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
