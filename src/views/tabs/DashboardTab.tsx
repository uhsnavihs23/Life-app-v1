/**
 * DashboardTab - Life insights at a glance
 * 
 * Ported refinements:
 * - Dedicated Exercise Table (pushups, situps, etc.)
 * - Quota-optimized AI Insights (manual refresh)
 * - INR currency support
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
import { TrendingUp, IndianRupee, Utensils, Moon, Footprints, Brain, Heart, Zap, Loader2, Dumbbell } from 'lucide-react';

export default function DashboardTab() {
  const { state } = useApp();
  const today = new Date().toISOString().split('T')[0];
  const weekStart = startOfWeek(new Date());
  
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const expToday = state.expenses.filter(e => e.createdAt.startsWith(today));
    const foodToday = state.foodEntries.filter(f => f.createdAt.startsWith(today));
    const sleepToday = state.sleepEntries.filter(s => s.date === today);
    const actToday = state.activities.filter(a => a.date === today);
    const healthToday = state.healthMetrics.filter(h => h.date === today);

    // Exercise breakdown (extracted from logs or activities)
    const exercises: Record<string, number> = {};
    state.dailyLogs.filter(l => l.createdAt.startsWith(today)).forEach(l => {
      // Very basic extraction for UI demo - in real app, classifyLog handles this
      const pushups = l.text.match(/(\d+)\s*pushups/i);
      if (pushups) exercises['Pushups'] = (exercises['Pushups'] || 0) + parseInt(pushups[1]);
      const situps = l.text.match(/(\d+)\s*situps/i);
      if (situps) exercises['Situps'] = (exercises['Situps'] || 0) + parseInt(situps[1]);
    });

    return {
      expensesToday: expToday.reduce((s, e) => s + e.amount, 0),
      mealsToday: foodToday.length,
      caloriesToday: foodToday.reduce((s, f) => s + (f.calories || 0), 0),
      sleepToday: sleepToday.length > 0 ? sleepToday[0].hours : 0,
      stepsToday: actToday.reduce((s, a) => s + a.steps, 0),
      water: healthToday.length > 0 ? healthToday[0].waterIntake : 0,
      exercises,
    };
  }, [state.expenses, state.foodEntries, state.sleepEntries, state.activities, state.healthMetrics, state.dailyLogs, today]);

  // AI insights — manual refresh only
  const loadAiInsights = useCallback(async () => {
    if (!hasGeminiApiKey() || loadingInsights) return;
    
    // Only fetch if there is meaningful data to analyze
    if (stats.stepsToday === 0 && stats.expensesToday === 0 && stats.sleepToday === 0) {
      setAiInsights(["Log some activities first to get personalized AI insights! ✨"]);
      return;
    }

    setLoadingInsights(true);
    try {
      const insights = await GeminiService.generateInsights({
        sleepHours: stats.sleepToday,
        steps: stats.stepsToday,
        expenses: stats.expensesToday,
        meals: stats.mealsToday,
        calories: stats.caloriesToday,
      });
      setAiInsights(insights);
    } catch (err) {
      setAiInsights([`⚠️ Could not load insights. Check your connection.`]);
    } finally {
      setLoadingInsights(false);
    }
  }, [stats, loadingInsights]);

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Today's progress</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={IndianRupee} label="Spent" value={formatINR(stats.expensesToday)} color="#ef4444" />
        <StatCard icon={Footprints} label="Steps" value={stats.stepsToday.toLocaleString()} color="#10b981" />
        <StatCard icon={Utensils} label="Meals" value={stats.mealsToday.toString()} color="#f59e0b" />
        <StatCard icon={Moon} label="Sleep" value={`${stats.sleepToday}h`} color="#8b5cf6" />
      </div>

      {/* Exercise Table */}
      <div className="card p-4 mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Dumbbell className="w-4 h-4 text-indigo-500" /> Training & Reps
        </h3>
        {Object.keys(stats.exercises).length > 0 ? (
          <div className="divide-y divide-var(--color-border)">
            {Object.entries(stats.exercises).map(([name, count]) => (
              <div key={name} className="py-2.5 flex justify-between items-center">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{name}</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-600">{count} reps</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-4 opacity-50">No bodyweight exercises logged yet</p>
        )}
      </div>

      {/* AI Insights */}
      <div className="card p-4 mb-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Brain className="w-5 h-5 text-indigo-500" /> AI Insights
          </h3>
          <button 
            className="ios-btn ios-btn-primary text-xs py-1.5 px-3" 
            onClick={loadAiInsights}
            disabled={loadingInsights}
          >
            {loadingInsights ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : '✨'} Refresh
          </button>
        </div>
        <div className="space-y-2.5">
          {aiInsights.length > 0 ? (
            aiInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/50 dark:bg-black/20">
                <TrendingUp className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{insight}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
              Click refresh to get AI-powered coaching based on your activity.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string; value: string; color: string;
}) {
  return (
    <div className="card p-4 shadow-sm border-none bg-var(--color-surface)">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
    </div>
  );
}
