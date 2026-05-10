/**
 * GeminiService - Google Gemini API
 * 
 * Model: gemini-2.5-flash-lite (free, fast, stable as of July 2026)
 * Fallback: gemini-2.5-flash
 * 
 * RETIRED models (DO NOT USE):
 * - gemini-1.5-flash ❌ shutdown Sep 2025
 * - gemini-pro ❌ shutdown 2025
 * - gemini-2.0-flash ❌ deprecated 2026
 */

import type { FoodEntry } from '../models/types';

const getApiKey = (): string | null => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.length > 10 && !envKey.includes('YOUR_')) return envKey;
  const localKey = localStorage.getItem('lifelog_gemini_api_key');
  if (localKey && localKey.length > 10) return localKey;
  return null;
};

export const setGeminiApiKey = (key: string): void => {
  localStorage.setItem('lifelog_gemini_api_key', key);
};

export const hasGeminiApiKey = (): boolean => getApiKey() !== null;

export const isApiKeyFromEnv = (): boolean => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  return Boolean(envKey && envKey.length > 10 && !envKey.includes('YOUR_'));
};

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key not configured. Add it in Profile settings.');

  let lastError = '';

  for (const model of MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const res = await fetch(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (data.error) {
        lastError = `${model}: ${data.error.message}`;
        continue; // try next model
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;

      lastError = `${model}: empty response`;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        lastError = `${model}: request timed out (25s)`;
      } else {
        lastError = e instanceof Error ? e.message : 'Network error';
      }
    }
  }

  throw new Error(lastError || 'All Gemini models failed');
}

async function callGeminiVision(prompt: string, imageBase64: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key not configured');

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } },
            ],
          }],
        }),
      });

      const data = await res.json();
      if (data.error) continue;

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch {
      continue;
    }
  }

  throw new Error('OCR failed with all models');
}

export const GeminiService = {
  async classifyLog(text: string) {
    if (!hasGeminiApiKey()) return mockClassify(text);
    try {
      const now = new Date().toISOString();
      const prompt = `You are a data extraction expert for a life logging app. 
Analyze the user's log entry and extract structured data.

Log Entry: "${text}"
Current Time: ${now}

Return ONLY a JSON object (no markdown):
{
  "type": "expense" | "food" | "sleep" | "exercise" | "general" | "note",
  "confidence": 0.0-1.0,
  "extractedData": {
    // For sleep: MUST calculate "hours" (number) if start/end times are provided.
    // For expense: extract "amount" (number) and "category".
    // For exercise: extract "steps" (number), or bodyweight reps like "pushups": 20, "situps": 30.
    // For food: extract "name", "calories" (if mentioned).
  }
}

Important: If the user says "Slept at 4:30 am and woke at 11 am", calculate the duration and set "hours": 6.5.`;
      
      const response = await callGemini(prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return { 
          type: parsed.type || 'general', 
          confidence: parsed.confidence || 0.5, 
          extractedData: parsed.extractedData || {} 
        };
      }
    } catch (e) { console.error('classify error:', e); }
    return mockClassify(text);
  },

  async analyzeFood(entries: FoodEntry[]) {
    if (!hasGeminiApiKey() || entries.length === 0) return mockFoodAnalysis(entries);
    try {
      const list = entries.map(e => `${e.name} (${e.portionSize})${e.calories ? ` ${e.calories}cal` : ''}`).join(', ');
      const prompt = `Analyze food intake. Return ONLY JSON: {"estimatedCalories":0,"summary":"","suggestions":[]}

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
      const prompt = `You are LifeLog AI assistant. Be helpful, concise (2-4 sentences).
${context ? `User data:\n${context}\n\n` : ''}Question: ${query}`;
      return await callGemini(prompt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('search error:', msg);
      return `Sorry, AI is temporarily unavailable. Error: ${msg}`;
    }
  },

  async extractText(imageBase64: string): Promise<string> {
    if (!hasGeminiApiKey()) return 'OCR requires a Gemini API key. Add one in Settings.';
    try {
      return await callGeminiVision(
        'Extract all text from this image. If it is a receipt/bill, identify total amount, date, and vendor.',
        imageBase64
      );
    } catch (e) {
      return `OCR failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  },

  async generateInsights(data: { sleepHours: number; steps: number; expenses: number; meals: number; calories: number }): Promise<string[]> {
    if (!hasGeminiApiKey()) return mockInsights(data);
    try {
      const prompt = `Give 2-3 short health/productivity insights based on:
Sleep: ${data.sleepHours}h, Steps: ${data.steps}, Spent: ₹${data.expenses}, Meals: ${data.meals}, Calories: ${data.calories}
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
  if (/spent|paid|₹|rs|bought|cost/.test(l)) return { type: 'expense', confidence: 0.85, extractedData: {} };
  if (/ate|food|meal|breakfast|lunch|dinner/.test(l)) return { type: 'food', confidence: 0.8, extractedData: {} };
  if (/slept|sleep|bed|woke/.test(l)) return { type: 'sleep', confidence: 0.9, extractedData: {} };
  if (/walk|run|exercise|steps|gym/.test(l)) return { type: 'exercise', confidence: 0.88, extractedData: {} };
  return { type: 'general', confidence: 0.5, extractedData: {} };
}

function mockFoodAnalysis(entries: FoodEntry[]) {
  const cal = entries.reduce((s, e) => s + (e.calories || 0), 0);
  return { estimatedCalories: cal, summary: `${entries.length} items, ~${cal} cal tracked.`, suggestions: ['Add more vegetables.', 'Drink 8 glasses of water.', 'Include protein in each meal.'] };
}

function mockSearch(q: string): string {
  const l = q.toLowerCase();
  if (/expense|spent|money/.test(l)) return 'Track expenses using the Today tab. See Dashboard for breakdown.';
  if (/sleep/.test(l)) return 'Log sleep daily for pattern analysis. Aim for 7-9 hours.';
  if (/food|diet|cal/.test(l)) return 'Use the Food quick-add to track meals. Add calories for insights.';
  return 'I can help with expenses, sleep, food, and fitness tracking. Add your Gemini API key for full AI capabilities!';
}

function mockInsights(d: { sleepHours: number; steps: number; expenses: number; meals: number; calories: number }): string[] {
  const r: string[] = [];
  if (d.sleepHours > 0) r.push(d.sleepHours >= 7 ? `✅ ${d.sleepHours}h sleep — well rested!` : `⚠️ ${d.sleepHours}h sleep — aim for 7-9h.`);
  if (d.steps > 0) r.push(d.steps >= 10000 ? `🎉 ${d.steps.toLocaleString()} steps — goal achieved!` : `🚶 ${d.steps.toLocaleString()} steps — ${(10000 - d.steps).toLocaleString()} to 10k.`);
  if (d.expenses > 0) r.push(`💰 Spent ₹${d.expenses.toLocaleString('en-IN')} today.`);
  if (r.length === 0) r.push('Start logging to get insights! ✨');
  return r;
}
