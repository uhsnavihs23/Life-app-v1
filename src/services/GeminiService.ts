/**
 * GeminiService - Google Gemini API
 * 
 * Models: gemini-2.5-flash-lite (primary), gemini-2.5-flash (fallback)
 * Retired: gemini-1.5-flash, gemini-pro, gemini-2.0-flash
 */

import type { FoodEntry } from '../models/types';

const getApiKey = (): string | null => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.length > 10 && !envKey.includes('YOUR_')) return envKey;
  const localKey = localStorage.getItem('lifelog_gemini_api_key');
  if (localKey && localKey.length > 10) return localKey;
  return null;
};

export const setGeminiApiKey = (key: string): void => { localStorage.setItem('lifelog_gemini_api_key', key); };
export const hasGeminiApiKey = (): boolean => getApiKey() !== null;
export const isApiKeyFromEnv = (): boolean => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  return Boolean(envKey && envKey.length > 10 && !envKey.includes('YOUR_'));
};

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key not configured.');
  let lastError = '';
  for (const model of MODELS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 2048 } }),
      });
      clearTimeout(t);
      const data = await res.json();
      if (data.error) { lastError = `${model}: ${data.error.message}`; continue; }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastError = `${model}: empty response`;
    } catch (e) {
      lastError = e instanceof DOMException && e.name === 'AbortError' ? `${model}: timeout` : (e instanceof Error ? e.message : 'Network error');
    }
  }
  throw new Error(lastError || 'All models failed');
}

async function callGeminiVision(prompt: string, imageBase64: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key not configured.');
  const clean = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  for (const model of MODELS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: clean } }] }] }),
      });
      clearTimeout(t);
      const data = await res.json();
      if (data.error) continue;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch { continue; }
  }
  throw new Error('OCR failed');
}

/** Result from classifyLog — can contain MULTIPLE structured entries */
export interface ClassifyResult {
  entries: ClassifiedEntry[];
  summary: string;
}

export interface ClassifiedEntry {
  type: 'sleep' | 'exercise' | 'expense' | 'food' | 'activity' | 'general';
  // Sleep
  sleepHours?: number;
  sleepQuality?: string;
  bedTime?: string;
  wakeTime?: string;
  // Exercise
  exerciseDetails?: string;
  exercises?: { name: string; sets?: number; reps?: number; weight?: string }[];
  durationMinutes?: number;
  caloriesBurned?: number;
  // Activity/Steps
  steps?: number;
  distanceKm?: number;
  // Expense
  amount?: number;
  expenseCategory?: string;
  // Food
  foodItems?: { name: string; portion: string; calories: number; protein?: number; carbs?: number; fat?: number; fiber?: number }[];
  mealType?: string;
  totalCalories?: number;
  nutritionSummary?: string;
  // Date
  date?: string; // YYYY-MM-DD if mentioned
}

export const GeminiService = {
  /**
   * THE CORE FUNCTION: Parse natural language into structured life data.
   * Can return MULTIPLE entries from a single log.
   * E.g. "walked 5km (7000 steps) then ate rice" → activity entry + food entry
   */
  async classifyLog(text: string): Promise<ClassifyResult> {
    if (!hasGeminiApiKey()) return mockClassify(text);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const prompt = `You are a personal life data parser. Parse this log entry into structured data.
IMPORTANT: A single entry can contain MULTIPLE activities. Extract ALL of them.

Entry: "${text}"
Today's date: ${todayStr}

Return ONLY valid JSON (no markdown, no backticks):
{
  "entries": [
    // Each distinct activity gets its own entry. Examples:
    // For sleep: {"type":"sleep","sleepHours":6.5,"sleepQuality":"good","bedTime":"4:30 AM","wakeTime":"11:00 AM"}
    // For steps/walking: {"type":"activity","steps":5022,"distanceKm":3.71,"date":"2026-05-08"}
    // For exercise: {"type":"exercise","exercises":[{"name":"pushups","sets":3,"reps":10},{"name":"crunches","sets":3,"reps":15}],"durationMinutes":45,"caloriesBurned":320,"exerciseDetails":"pushups 3x10, crunches 3x15"}
    // For expense: {"type":"expense","amount":300,"expenseCategory":"Transportation"}
    // For food: {"type":"food","mealType":"breakfast","totalCalories":650,"nutritionSummary":"High protein breakfast with complex carbs","foodItems":[{"name":"Kala chana","portion":"1 bowl","calories":250,"protein":15,"carbs":30,"fat":5},{"name":"Halwa","portion":"1 serving","calories":300,"protein":3,"carbs":45,"fat":12}]}
  ],
  "summary": "Brief one-line summary of what was logged"
}

CRITICAL RULES:
1. DATE: If user mentions ANY specific date like "10th May 2026", "on 8th May", "yesterday", set "date" field as "YYYY-MM-DD". This is CRITICAL — expenses/activities on past dates must have the correct date. If no date mentioned, omit the date field.
   Examples: "10th May 2026: 139₹ jio recharge" → date: "2026-05-10". "yesterday walked 3km" → calculate yesterday's date.
2. FOOD NUTRITION: You MUST estimate accurate calories, protein, carbs, fat for EVERY food item using standard Indian nutrition databases. Examples:
   - Kala chana (black chickpeas): 1 bowl ≈ 350 cal, 20g protein, 45g carbs, 6g fat
   - Halwa (suji): 1 serving ≈ 300 cal, 4g protein, 40g carbs, 15g fat  
   - Amul protein shake 200ml: ≈ 140 cal, 20g protein, 15g carbs, 2g fat
   - Roti: 1 piece ≈ 120 cal, 3g protein, 20g carbs, 3g fat
   Be ACCURATE. Don't underestimate. If "20g protein shake 200ml" is mentioned, that means 20g protein content.
3. FOOD: Provide nutritionSummary analyzing the MEAL as a whole (e.g. "High protein breakfast at ~790 cal. Good protein-to-carb ratio. Consider adding a fruit for vitamins.")
4. FOOD: Set mealType correctly based on context: breakfast/lunch/dinner/snack.
5. EXERCISE: Estimate calories burned accurately. 10 pushups burns ~3-5 cal. 3 sets of 10 pushups ≈ 15 cal. 15 crunches × 3 sets ≈ 20 cal. Be realistic, not inflated.
6. WALKING/STEPS: Use type "activity" with steps and distanceKm. ALWAYS estimate steps from distance: 1 km ≈ 1300 steps. "walked 0.5 km" → steps: 650, distanceKm: 0.5. NEVER return steps: 0 if distance is given.
7. GYM EXERCISE: Use type "exercise" with exercises array containing name, sets, reps.
8. SLEEP: Calculate hours precisely. "4:30 AM to 11 AM" = 6.5 hours. "11 PM to 7 AM" = 8 hours.
9. MULTI-TYPE: One log can contain multiple types. "ate then walked" → food + activity. Parse ALL.
10. EXPENSE: Extract amount in INR. "₹300 cab" → amount: 300, expenseCategory: "Transportation".`;

      const response = await callGemini(prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          entries: Array.isArray(parsed.entries) ? parsed.entries : [],
          summary: parsed.summary || '',
        };
      }
    } catch (e) { console.error('classify error:', e); }
    return mockClassify(text);
  },

  async analyzeFood(entries: FoodEntry[]) {
    if (!hasGeminiApiKey() || entries.length === 0) return mockFoodAnalysis(entries);
    try {
      const list = entries.map(e => `${e.name} (${e.portionSize})${e.calories ? ` ${e.calories}cal` : ''}`).join(', ');
      const prompt = `You are a nutritionist. Analyze this day's food intake:
${list}

Return ONLY JSON:
{
  "estimatedCalories": <total>,
  "protein": <total grams>,
  "carbs": <total grams>,
  "fat": <total grams>,
  "summary": "Brief nutritional assessment",
  "suggestions": ["2-3 specific suggestions for remaining meals today"]
}

Use standard Indian food nutrition data. Be specific about what to eat next.`;
      const response = await callGemini(prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (e) { console.error('food analysis error:', e); }
    return mockFoodAnalysis(entries);
  },

  async search(query: string, context = ''): Promise<string> {
    if (!hasGeminiApiKey()) return mockSearch(query);
    try {
      const prompt = `You are LifeLog AI — a personal health, fitness, and life tracking assistant.
Answer based on the user's actual data. Be specific, actionable, encouraging.
${context ? `\nUser's data:\n${context}\n` : ''}
Question: ${query}`;
      return await callGemini(prompt);
    } catch (e) {
      return `⚠️ AI unavailable: ${e instanceof Error ? e.message : 'error'}`;
    }
  },

  async extractText(imageBase64: string): Promise<string> {
    if (!hasGeminiApiKey()) return 'OCR requires a Gemini API key.';
    try {
      return await callGeminiVision('Extract all text from this image. If it is a receipt/bill, identify total amount, date, vendor name, and list all line items with prices.', imageBase64);
    } catch (e) {
      return `OCR failed: ${e instanceof Error ? e.message : 'error'}`;
    }
  },

  async generateInsights(data: {
    sleepHours: number; steps: number; expenses: number;
    meals: number; calories: number;
    exerciseLog?: string; foodLog?: string;
  }): Promise<string[]> {
    if (!hasGeminiApiKey()) return mockInsights(data);
    try {
      const prompt = `You are a professional health coach. Analyze this user's day and give 3-4 actionable insights.

Today's data:
- Sleep: ${data.sleepHours > 0 ? data.sleepHours + 'h' : 'not logged'}
- Steps: ${data.steps > 0 ? data.steps.toLocaleString() : 'not logged'}
- Meals: ${data.meals > 0 ? data.meals + ' meals, ' + data.calories + ' cal' : 'not logged'}
- Spending: ${data.expenses > 0 ? '₹' + data.expenses : 'none'}
${data.exerciseLog ? `- Exercise: ${data.exerciseLog}` : '- Exercise: not logged'}
${data.foodLog ? `- Food details: ${data.foodLog}` : ''}

RULES:
- If something is "not logged", say "Not tracked yet — log it for better insights" 
- Do NOT give negative/harsh advice for missing data
- For exercise: estimate total calories burned
- For food: assess if diet is balanced, suggest what to eat next
- For sleep: assess quality based on hours
- Each insight 1-2 sentences, with emoji prefix
- Be encouraging and specific

Return ONLY a JSON array of strings.`;
      const response = await callGemini(prompt);
      const match = response.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch (e) { console.error('insights error:', e); }
    return mockInsights(data);
  },
};

function mockClassify(text: string): ClassifyResult {
  const l = text.toLowerCase();
  const entries: ClassifiedEntry[] = [];
  if (/slept|sleep|bed|woke|nap/.test(l)) entries.push({ type: 'sleep' });
  if (/spent|paid|₹|rs\s?\d|bought|cost|\d+\s*rupee/.test(l)) entries.push({ type: 'expense' });
  if (/ate|food|meal|breakfast|lunch|dinner|snack|drank|coffee|tea|chana|rice|roti/.test(l)) entries.push({ type: 'food' });
  if (/walk|run|jog|km|steps/.test(l)) entries.push({ type: 'activity' });
  if (/exercise|pushup|crunch|yoga|workout|situp|plank|squat|gym|sets|reps/.test(l)) entries.push({ type: 'exercise' });
  if (entries.length === 0) entries.push({ type: 'general' });
  return { entries, summary: text.slice(0, 80) };
}

function mockFoodAnalysis(entries: FoodEntry[]) {
  const cal = entries.reduce((s, e) => s + (e.calories || 0), 0);
  return { estimatedCalories: cal, summary: `${entries.length} items, ~${cal} cal.`, suggestions: ['Add more vegetables.', 'Drink 8 glasses of water.', 'Include protein each meal.'] };
}

function mockSearch(q: string): string {
  if (/expense|spent|money/.test(q.toLowerCase())) return 'Track expenses in Today tab. See Dashboard for breakdown.';
  if (/sleep/.test(q.toLowerCase())) return 'Log sleep daily. Aim for 7-9 hours.';
  if (/food|diet|cal/.test(q.toLowerCase())) return 'Use Food quick-add for meals.';
  return 'Ask me about expenses, sleep, food, or fitness!';
}

function mockInsights(d: { sleepHours: number; steps: number; expenses: number; meals: number; calories: number }): string[] {
  const r: string[] = [];
  if (d.sleepHours > 0) r.push(d.sleepHours >= 7 ? `✅ ${d.sleepHours}h sleep — well rested!` : `💤 ${d.sleepHours}h — aim for 7-9h.`);
  else r.push('😴 Sleep not tracked yet — log it!');
  if (d.steps > 0) r.push(d.steps >= 10000 ? `🎉 ${d.steps.toLocaleString()} steps!` : `🚶 ${d.steps.toLocaleString()} steps. ${(10000 - d.steps).toLocaleString()} to 10k.`);
  if (d.meals > 0) r.push(`🍽️ ${d.meals} meals, ~${d.calories} cal.`);
  if (d.expenses > 0) r.push(`💰 ₹${d.expenses.toLocaleString('en-IN')} spent.`);
  if (r.length === 0) r.push('📝 Start logging to get insights!');
  return r;
}
