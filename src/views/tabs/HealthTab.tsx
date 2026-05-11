/**
 * HealthTab - Dedicated health tracking dashboard
 * 
 * Features:
 * - Body profile (height, weight, BMI, age, medical conditions)
 * - Daily check-in (mood, energy, water, symptoms)
 * - AI-powered health insights and recommendations
 * - Nutrition targets vs actual
 * - Exercise summary
 * - Sleep analysis
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { GeminiService, hasGeminiApiKey } from '../../services/GeminiService';
// import { formatINR } from '../../models/types';
import type { HealthProfile } from '../../models/types';
import {
  Heart, Droplets, Zap, Scale, Ruler,
  Brain, Loader2, Save, AlertCircle, Utensils, Flame, Target,
  Activity, RefreshCw
} from 'lucide-react';

export default function HealthTab() {
  const { state, addHealthMetrics, setHealthProfile } = useApp();
  const today = new Date().toISOString().split('T')[0];

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<HealthProfile>>({});
  
  // Daily check-in
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinMood, setCheckinMood] = useState<'great' | 'good' | 'okay' | 'low' | 'bad'>('good');
  const [checkinEnergy, setCheckinEnergy] = useState('7');
  const [checkinWater, setCheckinWater] = useState('');
  const [checkinSymptoms, setCheckinSymptoms] = useState('');
  const [checkinStress, setCheckinStress] = useState('5');

  // AI insights
  const [aiAdvice, setAiAdvice] = useState<string[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const profile = state.healthProfile;
  const todayMetrics = state.healthMetrics.find(h => h.date === today);
  const todayFood = state.foodEntries.filter(f => f.createdAt.startsWith(today));
  const todaySleep = state.sleepEntries.find(s => s.date === today);
  const todayActivity = state.activities.filter(a => a.date === today);
  const todayExercise = state.dailyLogs.filter(l => l.tag === 'exercise' && l.createdAt.startsWith(today));

  // Calculate nutrition totals
  const nutrition = useMemo(() => ({
    calories: todayFood.reduce((s, f) => s + (f.calories || 0), 0),
    protein: todayFood.reduce((s, f) => s + (f.protein || 0), 0),
    carbs: todayFood.reduce((s, f) => s + (f.carbs || 0), 0),
    fat: todayFood.reduce((s, f) => s + (f.fat || 0), 0),
    meals: todayFood.length,
  }), [todayFood]);

  const steps = todayActivity.reduce((s, a) => s + a.steps, 0);
  const sleepHours = todaySleep?.hours || 0;

  // BMI calculation
  const bmi = useMemo(() => {
    if (!profile?.heightCm || !profile?.weightKg) return null;
    const heightM = profile.heightCm / 100;
    return profile.weightKg / (heightM * heightM);
  }, [profile]);

  const bmiCategory = bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : '';

  // Initialize profile form
  useEffect(() => {
    if (profile) setProfileForm(profile);
  }, [profile]);

  const handleSaveProfile = () => {
    const p: HealthProfile = {
      userId: state.user?.id || '',
      heightCm: Number(profileForm.heightCm) || 170,
      weightKg: Number(profileForm.weightKg) || 70,
      age: Number(profileForm.age) || 25,
      gender: profileForm.gender || 'male',
      activityLevel: profileForm.activityLevel || 'moderate',
      medicalConditions: profileForm.medicalConditions || '',
      allergies: profileForm.allergies || '',
      dietPreference: profileForm.dietPreference || 'non-veg',
      fitnessGoal: profileForm.fitnessGoal || 'general_fitness',
      dailyCalorieTarget: Number(profileForm.dailyCalorieTarget) || 2000,
      dailyProteinTarget: Number(profileForm.dailyProteinTarget) || 60,
      dailyStepsTarget: Number(profileForm.dailyStepsTarget) || 10000,
      dailyWaterTarget: Number(profileForm.dailyWaterTarget) || 8,
      dailySleepTarget: Number(profileForm.dailySleepTarget) || 7,
      updatedAt: new Date().toISOString(),
    };
    setHealthProfile(p);
    setEditingProfile(false);
  };

  const handleCheckin = () => {
    addHealthMetrics({
      mood: checkinMood,
      energyLevel: parseInt(checkinEnergy),
      waterIntake: checkinWater ? parseInt(checkinWater) : undefined,
      stressLevel: parseInt(checkinStress),
      symptoms: checkinSymptoms || undefined,
    });
    setShowCheckin(false);
    setCheckinSymptoms('');
  };

  // AI health assessment
  const getAiAdvice = useCallback(async () => {
    if (!hasGeminiApiKey()) {
      setAiAdvice(['Add Gemini API key in Profile for personalized health advice.']);
      return;
    }
    setLoadingAi(true);
    try {
      const prompt = `You are a professional nutritionist and fitness coach. Give personalized health advice.

User Profile:
${profile ? `- Height: ${profile.heightCm}cm, Weight: ${profile.weightKg}kg, BMI: ${bmi?.toFixed(1)} (${bmiCategory})
- Age: ${profile.age}, Gender: ${profile.gender}
- Activity Level: ${profile.activityLevel}
- Diet: ${profile.dietPreference}
- Goal: ${profile.fitnessGoal?.replace('_', ' ')}
- Medical conditions: ${profile.medicalConditions || 'None'}
- Allergies: ${profile.allergies || 'None'}
- Daily targets: ${profile.dailyCalorieTarget} cal, ${profile.dailyProteinTarget}g protein, ${profile.dailyStepsTarget} steps, ${profile.dailyWaterTarget} glasses water, ${profile.dailySleepTarget}h sleep` : 'No profile set up yet'}

Today's Data:
- Food: ${nutrition.meals} meals, ${nutrition.calories} cal, ${nutrition.protein}g protein, ${nutrition.carbs}g carbs, ${nutrition.fat}g fat
- Food items: ${todayFood.map(f => f.name).join(', ') || 'none'}
- Sleep: ${sleepHours > 0 ? sleepHours + 'h' : 'not logged'}
- Steps: ${steps > 0 ? steps : 'not logged'}
- Exercise: ${todayExercise.map(e => e.text).join('; ') || 'none logged'}
- Mood: ${todayMetrics?.mood || 'not checked in'}
- Water: ${todayMetrics?.waterIntake || 0} glasses
- Symptoms: ${todayMetrics?.symptoms || 'none'}

Give 4-5 specific, actionable insights. Include:
1. Nutrition analysis - what to eat next based on what's eaten vs targets
2. Exercise recommendation for today
3. Hydration status
4. Sleep assessment
5. Any concern based on symptoms or medical conditions

Return ONLY a JSON array of strings. Be encouraging but specific. Use numbers.`;
      
      const response = await GeminiService.search(prompt);
      try {
        const match = response.match(/\[[\s\S]*\]/);
        if (match) setAiAdvice(JSON.parse(match[0]));
        else setAiAdvice([response]);
      } catch {
        setAiAdvice([response]);
      }
    } catch (err) {
      setAiAdvice([`⚠️ ${err instanceof Error ? err.message : 'Could not get advice'}`]);
    }
    setLoadingAi(false);
  }, [profile, bmi, bmiCategory, nutrition, todayFood, sleepHours, steps, todayExercise, todayMetrics]);

  // Progress bar helper
  const ProgressBar = ({ value, target, color, label }: { value: number; target: number; color: string; label: string }) => {
    const pct = Math.min((value / target) * 100, 100);
    return (
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
          <span style={{ color: 'var(--color-text)' }}>{value} / {target}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-alt)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="pb-4 fade-in safe-area-top">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Health</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Your wellness dashboard</p>
        </div>
        <button className="ios-btn ios-btn-primary text-sm py-2 px-3" onClick={() => setShowCheckin(true)}>
          <Heart className="w-4 h-4" /> Check-in
        </button>
      </div>

      {/* Body Profile Card */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Scale className="w-4 h-4 text-indigo-500" /> Body Profile
          </h3>
          <button className="text-xs font-medium px-3 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)' }}
            onClick={() => setEditingProfile(!editingProfile)}>
            {editingProfile ? 'Cancel' : profile ? 'Edit' : 'Set Up'}
          </button>
        </div>

        {editingProfile ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Height (cm)</label>
                <input className="ios-input text-sm" type="number" placeholder="170" value={profileForm.heightCm || ''} onChange={e => setProfileForm(p => ({ ...p, heightCm: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Weight (kg)</label>
                <input className="ios-input text-sm" type="number" placeholder="70" value={profileForm.weightKg || ''} onChange={e => setProfileForm(p => ({ ...p, weightKg: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Age</label>
                <input className="ios-input text-sm" type="number" placeholder="25" value={profileForm.age || ''} onChange={e => setProfileForm(p => ({ ...p, age: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Gender</label>
                <select className="ios-input text-sm" value={profileForm.gender || 'male'} onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value as any }))}>
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Diet</label>
                <select className="ios-input text-sm" value={profileForm.dietPreference || 'non-veg'} onChange={e => setProfileForm(p => ({ ...p, dietPreference: e.target.value as any }))}>
                  <option value="veg">Vegetarian</option><option value="non-veg">Non-Veg</option><option value="vegan">Vegan</option><option value="eggetarian">Eggetarian</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Activity Level</label>
                <select className="ios-input text-sm" value={profileForm.activityLevel || 'moderate'} onChange={e => setProfileForm(p => ({ ...p, activityLevel: e.target.value as any }))}>
                  <option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very Active</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Goal</label>
                <select className="ios-input text-sm" value={profileForm.fitnessGoal || 'general_fitness'} onChange={e => setProfileForm(p => ({ ...p, fitnessGoal: e.target.value as any }))}>
                  <option value="lose_weight">Lose Weight</option><option value="maintain">Maintain</option><option value="gain_muscle">Gain Muscle</option><option value="general_fitness">General Fitness</option>
                </select>
              </div>
            </div>
            <input className="ios-input text-sm" placeholder="Medical conditions (e.g. diabetes, BP)" value={profileForm.medicalConditions || ''} onChange={e => setProfileForm(p => ({ ...p, medicalConditions: e.target.value }))} />
            <input className="ios-input text-sm" placeholder="Food allergies (e.g. lactose, gluten)" value={profileForm.allergies || ''} onChange={e => setProfileForm(p => ({ ...p, allergies: e.target.value }))} />
            
            <h4 className="text-sm font-medium mt-2" style={{ color: 'var(--color-text)' }}>Daily Targets</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Calories</label>
                <input className="ios-input text-sm" type="number" placeholder="2000" value={profileForm.dailyCalorieTarget || ''} onChange={e => setProfileForm(p => ({ ...p, dailyCalorieTarget: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Protein (g)</label>
                <input className="ios-input text-sm" type="number" placeholder="60" value={profileForm.dailyProteinTarget || ''} onChange={e => setProfileForm(p => ({ ...p, dailyProteinTarget: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Steps</label>
                <input className="ios-input text-sm" type="number" placeholder="10000" value={profileForm.dailyStepsTarget || ''} onChange={e => setProfileForm(p => ({ ...p, dailyStepsTarget: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Water (glasses)</label>
                <input className="ios-input text-sm" type="number" placeholder="8" value={profileForm.dailyWaterTarget || ''} onChange={e => setProfileForm(p => ({ ...p, dailyWaterTarget: Number(e.target.value) }))} />
              </div>
            </div>
            <button className="ios-btn ios-btn-primary w-full" onClick={handleSaveProfile}><Save className="w-4 h-4" /> Save Profile</button>
          </div>
        ) : profile ? (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-2 rounded-xl" style={{ background: 'var(--color-surface-alt)' }}>
                <Ruler className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{profile.heightCm}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>cm</p>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ background: 'var(--color-surface-alt)' }}>
                <Scale className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{profile.weightKg}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>kg</p>
              </div>
              <div className="text-center p-2 rounded-xl" style={{ background: bmi && bmi < 25 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
                <Activity className="w-4 h-4 mx-auto mb-1" style={{ color: bmi && bmi < 25 ? '#10b981' : '#f59e0b' }} />
                <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{bmi?.toFixed(1)}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>BMI · {bmiCategory}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.dietPreference && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{profile.dietPreference}</span>}
              {profile.fitnessGoal && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{profile.fitnessGoal.replace('_', ' ')}</span>}
              {profile.medicalConditions && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{profile.medicalConditions}</span>}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Scale className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Set up your body profile for personalized health insights</p>
            <button className="ios-btn ios-btn-primary text-sm mt-3" onClick={() => setEditingProfile(true)}>Set Up Profile</button>
          </div>
        )}
      </div>

      {/* Today's Progress */}
      {profile && (
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Target className="w-4 h-4 text-indigo-500" /> Today's Progress
          </h3>
          <ProgressBar value={nutrition.calories} target={profile.dailyCalorieTarget || 2000} color="#f59e0b" label={`🔥 Calories`} />
          <ProgressBar value={nutrition.protein} target={profile.dailyProteinTarget || 60} color="#ef4444" label={`💪 Protein (g)`} />
          <ProgressBar value={steps} target={profile.dailyStepsTarget || 10000} color="#10b981" label={`🚶 Steps`} />
          <ProgressBar value={todayMetrics?.waterIntake || 0} target={profile.dailyWaterTarget || 8} color="#3b82f6" label={`💧 Water (glasses)`} />
          <ProgressBar value={sleepHours} target={profile.dailySleepTarget || 7} color="#8b5cf6" label={`😴 Sleep (hours)`} />
        </div>
      )}

      {/* Today's Nutrition Breakdown */}
      {nutrition.meals > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Utensils className="w-4 h-4 text-amber-500" /> Nutrition Today
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <Flame className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{nutrition.calories}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>cal</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{nutrition.protein}g</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>protein</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{nutrition.carbs}g</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>carbs</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{nutrition.fat}g</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>fat</p>
            </div>
          </div>
          {todayFood.length > 0 && (
            <div className="mt-3 space-y-1">
              {todayFood.map(f => (
                <div key={f.id} className="flex items-center justify-between text-xs py-1">
                  <span style={{ color: 'var(--color-text-secondary)' }}>{f.mealType === 'breakfast' ? '🌅' : f.mealType === 'lunch' ? '☀️' : f.mealType === 'dinner' ? '🌙' : '🍿'} {f.name}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{f.calories ? f.calories + ' cal' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Daily Check-in Modal */}
      {showCheckin && (
        <div className="card p-4 mb-4 slide-up" style={{ border: '2px solid var(--color-primary)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>❤️ Daily Check-in</h3>
            <button onClick={() => setShowCheckin(false)} className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>✕</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>How are you feeling?</label>
              <div className="flex gap-2 flex-wrap">
                {(['great', 'good', 'okay', 'low', 'bad'] as const).map(m => (
                  <button key={m} className={`tag-chip ${checkinMood === m ? 'selected' : ''}`} onClick={() => setCheckinMood(m)}>
                    {m === 'great' ? '🤩' : m === 'good' ? '😊' : m === 'okay' ? '😐' : m === 'low' ? '😔' : '😫'} {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Energy: <strong>{checkinEnergy}/10</strong></label>
              <input type="range" min="1" max="10" value={checkinEnergy} onChange={e => setCheckinEnergy(e.target.value)} className="w-full accent-rose-500" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Stress: <strong>{checkinStress}/10</strong></label>
              <input type="range" min="1" max="10" value={checkinStress} onChange={e => setCheckinStress(e.target.value)} className="w-full accent-amber-500" />
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <input className="ios-input flex-1 text-sm" type="number" placeholder="Glasses of water today" value={checkinWater} onChange={e => setCheckinWater(e.target.value)} />
            </div>
            <input className="ios-input text-sm" placeholder="Any symptoms? (headache, bloating, etc.)" value={checkinSymptoms} onChange={e => setCheckinSymptoms(e.target.value)} />
            <button className="ios-btn ios-btn-primary w-full" onClick={handleCheckin}><Heart className="w-4 h-4" /> Save Check-in</button>
          </div>
        </div>
      )}

      {/* Mood & Status */}
      {todayMetrics && (
        <div className="card p-4 mb-4">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Today's Status</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-xl" style={{ background: 'var(--color-surface-alt)' }}>
              <p className="text-xl">{todayMetrics.mood === 'great' ? '🤩' : todayMetrics.mood === 'good' ? '😊' : todayMetrics.mood === 'okay' ? '😐' : todayMetrics.mood === 'low' ? '😔' : '😫'}</p>
              <p className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>{todayMetrics.mood}</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ background: 'var(--color-surface-alt)' }}>
              <Zap className="w-4 h-4 mx-auto text-amber-500" />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{todayMetrics.energyLevel}/10</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>energy</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ background: 'var(--color-surface-alt)' }}>
              <AlertCircle className="w-4 h-4 mx-auto text-rose-500" />
              <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{todayMetrics.stressLevel}/10</p>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>stress</p>
            </div>
          </div>
          {todayMetrics.symptoms && (
            <p className="text-xs mt-2 px-2 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
              ⚠️ Symptoms: {todayMetrics.symptoms}
            </p>
          )}
        </div>
      )}

      {/* AI Health Coach */}
      <div className="card p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.05), rgba(99,102,241,0.05))' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Brain className="w-4 h-4 text-rose-500" /> AI Health Coach
          </h3>
          <button className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
            style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}
            onClick={getAiAdvice} disabled={loadingAi}>
            {loadingAi ? <Loader2 className="w-3 h-3 animate-spin inline" /> : <RefreshCw className="w-3 h-3 inline" />}
            {loadingAi ? ' Analyzing...' : ' Get Advice'}
          </button>
        </div>
        {aiAdvice.length > 0 ? (
          <div className="space-y-2">
            {aiAdvice.map((a, i) => (
              <div key={i} className="p-3 rounded-xl text-sm" style={{ background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}>
                {a}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
            {profile ? 'Tap "Get Advice" for personalized health recommendations' : 'Set up your body profile first, then get AI-powered advice'}
          </p>
        )}
      </div>
    </div>
  );
}
