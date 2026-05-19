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

DATE HANDLING:
- If user mentions ANY date like "10th May 2026", "on 8th May", "yesterday", "day before yesterday", set "date" as "YYYY-MM-DD".
- "yesterday" = calculate yesterday from today (${todayStr}).
- "day before yesterday" = today minus 2 days.
- If NO date mentioned, OMIT the date field (defaults to today).
- Examples: "139₹ jio recharge on 10th May 2026" → date: "2026-05-10"

SLEEP RULES:
- Calculate hours PRECISELY from times. "2 AM to 10 AM" = 8h. "3:50 PM to 5 PM" = 1.17h. "11 PM to 7 AM" = 8h.
- EVERY sleep entry is ADDITIVE. The app sums all sleep entries per day. So "slept 2 AM to 10 AM" = 8h entry, and later "nap 3:50 PM to 5 PM" = 1.17h entry. Total becomes 9.17h.
- NEVER try to "replace" a previous sleep entry. Just create a new one — the app adds them.
- Always include bedTime and wakeTime strings for display.
- Set sleepQuality: if hours >= 7 → "good", if >= 8.5 → "excellent", if < 5 → "poor", else "fair".

FOOD RULES:
- ALWAYS estimate calories, protein, carbs, fat, sugar, fiber for every item.
- Use accurate Indian food nutrition data.
- Each new food entry is ADDITIVE — the app sums calories/protein/etc across all meals.
- Set mealType from context: morning → breakfast, afternoon → lunch, evening → dinner, else → snack.
- nutritionSummary should compare against daily targets if known (e.g. "You've consumed 60% of daily protein target").

EXPENSE RULES:
- Each expense is ADDITIVE — the app sums all expenses per day.
- Extract amount in INR. "₹300 cab" → amount: 300.
- Guess category: food/cab/auto/uber → "Transportation", swiggy/zomato → "Food & Dining", jio/airtel/recharge → "Recharge", amazon/flipkart → "Shopping", electricity/gas/water → "Bills & Utilities".

ACTIVITY/STEPS RULES:
- Each entry is ADDITIVE — the app sums steps per day.
- "walked 0.5 km till 11 AM" = 650 steps, 0.5 km. Later "walked 1 km in evening" = 1300 steps, 1 km. App shows total 1950 steps.
- ALWAYS estimate steps from km: 1 km ≈ 1300 steps. NEVER return steps: 0 if distance given.
- If user says "total 5000 steps today" with no previous entry, just create one entry with 5000.

EXERCISE RULES:
- Each exercise entry is ADDITIVE.
- Include exercises array with name, sets, reps.
- Estimate calories burned: pushups 3x10 ≈ 15 cal, crunches 3x15 ≈ 20 cal, squats 3x15 ≈ 30 cal, running 30 min ≈ 300 cal, yoga 30 min ≈ 120 cal.
- Walking/running with distance → use "activity" type. Gym/bodyweight → use "exercise" type.

MULTI-ENTRY RULE:
- A single log can produce MULTIPLE entries. "ate biryani, walked 2 km, spent ₹350" → food + activity + expense.
- Parse ALL activities from the text. Do not ignore any.

GENERAL FALLBACK:
- If text doesn't match any category clearly, return type "general" with entries: [{"type":"general"}]
- NEVER return an empty entries array.`;

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
IMPORTANT: Do NOT use markdown formatting. No ** for bold, no # headers, no * for bullets. Use plain text with emoji and line breaks. Use "•" for bullet points.
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

  // Sleep: try to extract hours from "X hours" or "slept for Xh"
  if (/slept|sleep|bed|woke|nap/.test(l)) {
    const hoursMatch = l.match(/(\d+\.?\d*)\s*(?:hours?|hrs?|h\b)/);
    entries.push({ type: 'sleep', sleepHours: hoursMatch ? parseFloat(hoursMatch[1]) : undefined });
  }
  // Expense: extract amount
  if (/spent|paid|₹|rs\s?\d|bought|cost|\d+\s*rupee/.test(l)) {
    const amtMatch = l.match(/(?:₹|rs\.?\s*)(\d+)/);
    entries.push({ type: 'expense', amount: amtMatch ? parseInt(amtMatch[1]) : undefined });
  }
  // Food
  if (/ate|food|meal|breakfast|lunch|dinner|snack|drank|coffee|tea|chana|rice|roti/.test(l)) {
    entries.push({ type: 'food' });
  }
  // Activity: extract km or steps
  if (/walk|run|jog|km|steps/.test(l)) {
    const kmMatch = l.match(/(\d+\.?\d*)\s*km/);
    const stepsMatch = l.match(/(\d+)\s*steps/);
    const km = kmMatch ? parseFloat(kmMatch[1]) : undefined;
    const steps = stepsMatch ? parseInt(stepsMatch[1]) : (km ? Math.round(km * 1300) : undefined);
    entries.push({ type: 'activity', steps, distanceKm: km });
  }
  // Exercise
  if (/exercise|pushup|crunch|yoga|workout|situp|plank|squat|gym|sets|reps/.test(l)) {
    entries.push({ type: 'exercise' });
  }
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
