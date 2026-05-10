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
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }),
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

export const GeminiService = {
  /**
   * Classify free-text log and extract structured data.
   * This is the KEY function — it parses natural language into structured entries.
   */
  async classifyLog(text: string): Promise<{
    type: string; confidence: number;
    extractedData: Record<string, any>;
  }> {
    if (!hasGeminiApiKey()) return mockClassify(text);
    try {
      const prompt = `You are a personal life log classifier. Analyze this entry and extract ALL structured data.

Entry: "${text}"

Return ONLY valid JSON (no markdown, no backticks):
{
  "type": "sleep|exercise|expense|food|general|note",
  "confidence": 0.0-1.0,
  "extractedData": {
    // For sleep: "hours" (number), "bedTime" (string like "11:00 PM"), "wakeTime" (string like "7:00 AM"), "quality" ("good"/"fair"/"poor"/"excellent")
    // For exercise: "exercises" (array of {"name":"pushups","sets":3,"reps":10}), "durationMinutes" (number), "caloriesBurned" (estimated number)
    // For expense: "amount" (number), "currency" ("INR"), "category" (string)
    // For food: "items" (array of {"name":"rice","portion":"1 cup","calories":200}), "mealType" ("breakfast"/"lunch"/"dinner"/"snack")
  }
}

Be precise with numbers. Calculate sleep hours from bed/wake times. Estimate calories burned for exercises.`;
      const response = await callGemini(prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return { type: parsed.type || 'general', confidence: parsed.confidence || 0.5, extractedData: parsed.extractedData || {} };
      }
    } catch (e) { console.error('classify error:', e); }
    return mockClassify(text);
  },

  async analyzeFood(entries: FoodEntry[]) {
    if (!hasGeminiApiKey() || entries.length === 0) return mockFoodAnalysis(entries);
    try {
      const list = entries.map(e => `${e.name} (${e.portionSize})${e.calories ? ` ${e.calories}cal` : ''}`).join(', ');
      const prompt = `Analyze this food intake as a nutritionist. Return ONLY JSON:
{"estimatedCalories":0,"summary":"","suggestions":[]}
Items: ${list}`;
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
Answer the user's question using their data context. Be specific, actionable, and encouraging.
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
      return await callGeminiVision('Extract all text from this image. If it is a receipt/bill, identify total amount, date, and vendor name.', imageBase64);
    } catch (e) {
      return `OCR failed: ${e instanceof Error ? e.message : 'error'}`;
    }
  },

  /**
   * Generate professional health & productivity insights.
   * Acts like a health coach analyzing the user's day.
   */
  async generateInsights(data: {
    sleepHours: number; steps: number; expenses: number;
    meals: number; calories: number;
    exerciseLog?: string; foodLog?: string;
  }): Promise<string[]> {
    if (!hasGeminiApiKey()) return mockInsights(data);
    try {
      const prompt = `You are a professional health coach analyzing a user's daily data. Give 3-4 short, specific, actionable insights.

Today's data:
- Sleep: ${data.sleepHours}h
- Steps: ${data.steps}
- Meals: ${data.meals}, Calories: ${data.calories}
- Spending: ₹${data.expenses}
${data.exerciseLog ? `- Exercise: ${data.exerciseLog}` : '- Exercise: none logged'}
${data.foodLog ? `- Food details: ${data.foodLog}` : ''}

Rules:
- If data is 0 or empty, say "Not logged yet" instead of giving negative advice
- Estimate calories burned from exercise if logged
- Suggest what to eat next based on what was already eaten
- Be encouraging, not harsh
- Each insight should be 1-2 sentences max

Return ONLY a JSON array of strings. No markdown.`;
      const response = await callGemini(prompt);
      const match = response.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch (e) { console.error('insights error:', e); }
    return mockInsights(data);
  },
};

function mockClassify(text: string) {
  const l = text.toLowerCase();
  if (/spent|paid|₹|rs\s?\d|bought|cost|\d+\s*rupee/.test(l)) return { type: 'expense', confidence: 0.85, extractedData: {} };
  if (/ate|food|meal|breakfast|lunch|dinner|snack|drank|coffee|tea/.test(l)) return { type: 'food', confidence: 0.8, extractedData: {} };
  if (/slept|sleep|bed|woke|nap/.test(l)) return { type: 'sleep', confidence: 0.9, extractedData: {} };
  if (/walk|run|exercise|steps|gym|pushup|crunch|yoga|workout|jog/.test(l)) return { type: 'exercise', confidence: 0.88, extractedData: {} };
  return { type: 'general', confidence: 0.5, extractedData: {} };
}

function mockFoodAnalysis(entries: FoodEntry[]) {
  const cal = entries.reduce((s, e) => s + (e.calories || 0), 0);
  return { estimatedCalories: cal, summary: `${entries.length} items, ~${cal} cal.`, suggestions: ['Add more vegetables.', 'Drink 8 glasses of water.', 'Include protein each meal.'] };
}

function mockSearch(q: string): string {
  const l = q.toLowerCase();
  if (/expense|spent|money/.test(l)) return 'Track expenses in Today tab. See Dashboard for breakdown.';
  if (/sleep/.test(l)) return 'Log sleep daily for patterns. Aim for 7-9 hours.';
  if (/food|diet|cal/.test(l)) return 'Use Food quick-add for meals. Add calories for insights.';
  return 'I help with expenses, sleep, food, and fitness. Ask me anything about your data!';
}

function mockInsights(d: { sleepHours: number; steps: number; expenses: number; meals: number; calories: number }): string[] {
  const r: string[] = [];
  if (d.sleepHours > 0) r.push(d.sleepHours >= 7 ? `✅ ${d.sleepHours}h sleep — well rested!` : `💤 ${d.sleepHours}h sleep — try for 7-9h tonight.`);
  else r.push('😴 Sleep not logged yet. Add it to track your rest.');
  if (d.steps > 0) r.push(d.steps >= 10000 ? `🎉 ${d.steps.toLocaleString()} steps — goal hit!` : `🚶 ${d.steps.toLocaleString()} steps. ${(10000 - d.steps).toLocaleString()} to go!`);
  if (d.meals > 0) r.push(`🍽️ ${d.meals} meals, ~${d.calories} cal. ${d.calories < 1500 ? 'Might need more fuel.' : 'Looking good!'}`);
  if (d.expenses > 0) r.push(`💰 ₹${d.expenses.toLocaleString('en-IN')} spent today.`);
  if (r.length === 0) r.push('📝 Start logging to get personalized insights!');
  return r;
}
