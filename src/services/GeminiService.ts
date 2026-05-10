/**
 * GeminiService - AI Integration with Google Gemini API
 * 
 * API Key Priority:
 * 1. Environment variable (VITE_GEMINI_API_KEY) - set in Vercel
 * 2. localStorage - user entered manually in app
 * 
 * This way, if you set the key in Vercel, users don't need to enter it.
 */

import type { FoodEntry } from '../models/types';

// Check environment variable first, then localStorage
const getApiKey = (): string | null => {
  // Priority 1: Environment variable (from Vercel)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.length > 10 && !envKey.includes('YOUR_')) {
    return envKey;
  }
  
  // Priority 2: localStorage (user entered in app)
  const localKey = localStorage.getItem('lifelog_gemini_api_key');
  if (localKey && localKey.length > 10) {
    return localKey;
  }
  
  return null;
};

export const setGeminiApiKey = (key: string): void => {
  localStorage.setItem('lifelog_gemini_api_key', key);
};

export const hasGeminiApiKey = (): boolean => {
  return getApiKey() !== null;
};

// Check if key is from environment (so we don't show "add key" UI)
export const isApiKeyFromEnv = (): boolean => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  return Boolean(envKey && envKey.length > 10 && !envKey.includes('YOUR_'));
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-3.1-flash'; // Updated to latest 2026 architecture

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string };
}

/**
 * Make a request to the Gemini API
 */
async function callGemini(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No response from Gemini');
  }

  return text;
}

/**
 * Make a vision request to Gemini (for OCR)
 */
async function callGeminiVision(prompt: string, imageBase64: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
          ],
        }],
      }),
    }
  );

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not extract text';
}

export const GeminiService = {
  /**
   * Classify a free-text log entry into structured data
   */
  async classifyLog(text: string): Promise<{
    type: string;
    confidence: number;
    extractedData: Record<string, unknown>;
  }> {
    if (!hasGeminiApiKey()) {
      return mockClassifyLog(text);
    }

    try {
      const prompt = `Analyze this personal log entry and classify it. Return ONLY a JSON object (no markdown, no code blocks) with:
- type: one of "general", "expense", "food", "sleep", "exercise", "note"
- confidence: a number between 0 and 1
- extractedData: any relevant structured data you can extract (amounts, categories, hours, etc)

Log entry: "${text}"`;

      const response = await callGemini(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: parsed.type || 'general',
          confidence: parsed.confidence || 0.5,
          extractedData: parsed.extractedData || {},
        };
      }
    } catch (error) {
      console.error('Gemini classifyLog error:', error);
    }

    return mockClassifyLog(text);
  },

  /**
   * Analyze food entries and provide nutritional insights
   */
  async analyzeFood(entries: FoodEntry[]): Promise<{
    totalCalories: number;
    summary: string;
    suggestions: string[];
  }> {
    if (!hasGeminiApiKey() || entries.length === 0) {
      return mockFoodAnalysis(entries);
    }

    try {
      const foodList = entries.map(e => 
        `${e.name} (${e.portionSize})${e.calories ? ` - ${e.calories} cal` : ''}`
      ).join('\n');

      const prompt = `Analyze these food items eaten today and provide nutritional insights. Return ONLY a JSON object (no markdown) with:
- estimatedCalories: total estimated calories (number)
- summary: a brief 1-2 sentence summary of the diet
- suggestions: array of 2-3 short health suggestions

Food items:
${foodList}`;

      const response = await callGemini(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          totalCalories: parsed.estimatedCalories || parsed.totalCalories || 0,
          summary: parsed.summary || '',
          suggestions: parsed.suggestions || [],
        };
      }
    } catch (error) {
      console.error('Gemini analyzeFood error:', error);
    }

    return mockFoodAnalysis(entries);
  },

  /**
   * Search/chat - answer questions about user data or general facts
   */
  async search(query: string, context: string = ''): Promise<string> {
    if (!hasGeminiApiKey()) {
      return mockSearch(query);
    }

    try {
      const prompt = `You are a helpful AI assistant for a personal life logging app called LifeLog AI.
The user is asking a question. Answer helpfully and concisely.

${context ? `User's data context:\n${context}\n\n` : ''}User's question: ${query}

Provide a helpful, friendly response in 2-4 sentences.`;

      return await callGemini(prompt);
    } catch (error) {
      console.error('Gemini search error:', error);
      return `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key.`;
    }
  },

  /**
   * Extract text from an image using OCR
   */
  async extractText(imageBase64: string): Promise<string> {
    if (!hasGeminiApiKey()) {
      return 'OCR requires a Gemini API key. Please add your API key in Settings or contact the admin.';
    }

    try {
      const prompt = `Extract all text from this image. If it's a receipt or bill, also identify:
- The total amount
- The date if visible
- The vendor/store name
Format the response clearly with the extracted text first, then any identified details.`;

      return await callGeminiVision(prompt, imageBase64);
    } catch (error) {
      console.error('Gemini OCR error:', error);
      return `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  /**
   * Generate daily insights based on user data
   */
  async generateInsights(data: {
    sleepHours: number;
    steps: number;
    expenses: number;
    meals: number;
    calories: number;
  }): Promise<string[]> {
    if (!hasGeminiApiKey()) {
      return mockInsights(data);
    }

    try {
      const prompt = `Based on this daily health/activity data, provide 2-3 short, personalized insights and suggestions:
- Sleep: ${data.sleepHours} hours
- Steps: ${data.steps}
- Expenses: ₹${data.expenses}
- Meals: ${data.meals}
- Calories: ${data.calories}

Return ONLY a JSON array of 2-3 short insight strings (1 sentence each). Be encouraging and practical. No markdown.`;

      const response = await callGemini(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Gemini insights error:', error);
    }

    return mockInsights(data);
  },
};

// Mock functions for when API key is not configured

function mockClassifyLog(text: string) {
  const lower = text.toLowerCase();
  
  if (lower.includes('spent') || lower.includes('paid') || lower.includes('₹') || lower.includes('rs') || lower.includes('bought') || lower.includes('cost')) {
    return { type: 'expense', confidence: 0.85, extractedData: { suggestedCategory: 'General' } };
  }
  if (lower.includes('ate') || lower.includes('food') || lower.includes('meal') || lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('snack')) {
    return { type: 'food', confidence: 0.80, extractedData: {} };
  }
  if (lower.includes('slept') || lower.includes('sleep') || lower.includes('bed') || lower.includes('woke') || lower.includes('tired')) {
    return { type: 'sleep', confidence: 0.90, extractedData: {} };
  }
  if (lower.includes('walk') || lower.includes('run') || lower.includes('exercise') || lower.includes('steps') || lower.includes('gym') || lower.includes('workout')) {
    return { type: 'exercise', confidence: 0.88, extractedData: {} };
  }
  
  return { type: 'general', confidence: 0.50, extractedData: {} };
}

function mockFoodAnalysis(entries: FoodEntry[]) {
  const totalCalories = entries.reduce((sum, e) => sum + (e.calories || 0), 0);
  return {
    totalCalories,
    summary: `You logged ${entries.length} food items today with approximately ${totalCalories} calories tracked.`,
    suggestions: [
      'Try to include more vegetables in your meals.',
      'Stay hydrated — aim for 8 glasses of water.',
      'Consider adding protein to each meal for sustained energy.',
    ],
  };
}

function mockSearch(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes('expense') || lower.includes('spent') || lower.includes('money')) {
    return "I can help you track expenses! Use the Today tab to log expenses and see totals in the Dashboard. AI insights work automatically with your data.";
  }
  if (lower.includes('sleep')) {
    return "Sleep tracking is important for health! Log your sleep hours daily using the quick-add button. I analyze your patterns and provide personalized advice.";
  }
  if (lower.includes('food') || lower.includes('diet') || lower.includes('calories')) {
    return "Track your meals using the Food quick-add button. Add calorie estimates for better insights. I can analyze your nutrition and suggest improvements!";
  }
  
  return `That's a great question! I'm analyzing your data to provide insights. Try asking about: expenses, sleep, food, or fitness. All your data is tracked and available in the History tab.`;
}

function mockInsights(data: { sleepHours: number; steps: number; expenses: number; meals: number; calories: number }): string[] {
  const insights: string[] = [];
  
  if (data.sleepHours > 0) {
    if (data.sleepHours >= 7) {
      insights.push(`Great sleep! ${data.sleepHours} hours is within the recommended 7-9 hours. 😊`);
    } else {
      insights.push(`You got ${data.sleepHours} hours of sleep. Try to aim for 7-9 hours for optimal health. 💤`);
    }
  }
  
  if (data.steps > 0) {
    if (data.steps >= 10000) {
      insights.push(`Amazing! You hit ${data.steps.toLocaleString()} steps today - goal achieved! 🎉`);
    } else {
      insights.push(`${data.steps.toLocaleString()} steps so far. ${(10000 - data.steps).toLocaleString()} more to reach 10k! 🚶`);
    }
  }
  
  if (data.expenses > 0) {
    insights.push(`You've spent ₹${data.expenses.toLocaleString('en-IN')} today. Check Dashboard for breakdown. 💰`);
  }
  
  if (insights.length === 0) {
    insights.push("Start logging your activities to get personalized insights! ✨");
  }
  
  return insights;
}
