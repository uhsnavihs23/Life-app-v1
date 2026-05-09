/**
 * GeminiService - AI Integration with Google Gemini API
 * 
 * This service handles all AI operations:
 * - Classifying free-text log entries
 * - Analyzing food intake
 * - OCR/text extraction from images
 * - Answering search queries
 * 
 * HOW TO GET YOUR FREE API KEY:
 * 1. Go to https://makersuite.google.com/app/apikey
 * 2. Sign in with Google
 * 3. Click "Create API Key"
 * 4. Copy the key and paste it in the Settings screen of this app
 * 
 * FREE TIER LIMITS:
 * - 15 requests per minute
 * - 1 million tokens per month
 * - Gemini 1.5 Flash model
 */

import type { FoodEntry } from '../models/types';

// API key is stored in localStorage for security
const getApiKey = (): string | null => {
  return localStorage.getItem('lifelog_gemini_api_key');
};

export const setGeminiApiKey = (key: string): void => {
  localStorage.setItem('lifelog_gemini_api_key', key);
};

export const hasGeminiApiKey = (): boolean => {
  const key = getApiKey();
  return key !== null && key.length > 10;
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-1.5-flash';

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
      
      // Try to parse JSON from response
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
      return `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key in Settings.`;
    }
  },

  /**
   * Extract text from an image using OCR
   */
  async extractText(imageBase64: string): Promise<string> {
    if (!hasGeminiApiKey()) {
      return 'OCR requires a Gemini API key. Go to Settings to add your free API key from makersuite.google.com';
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
      const prompt = `Based on this daily data, provide 2-3 short, personalized health/productivity insights:
- Sleep: ${data.sleepHours} hours
- Steps: ${data.steps}
- Expenses: $${data.expenses}
- Meals: ${data.meals}
- Calories: ${data.calories}

Return ONLY a JSON array of 2-3 short insight strings (1 sentence each). No markdown.`;

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
  
  if (lower.includes('spent') || lower.includes('paid') || lower.includes('$') || lower.includes('bought') || lower.includes('cost')) {
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
    return "I can help you track expenses! Add your API key in Settings to get personalized spending insights. For now, use the Today tab to log expenses and see totals in the Dashboard.";
  }
  if (lower.includes('sleep')) {
    return "Sleep tracking is important for health! Log your sleep hours daily using the quick-add button. Once you add your Gemini API key, I can analyze your sleep patterns and provide personalized advice.";
  }
  if (lower.includes('food') || lower.includes('diet') || lower.includes('calories')) {
    return "Track your meals using the Food quick-add button. Add calorie estimates for better insights. With the Gemini API connected, I can analyze your nutrition and suggest improvements!";
  }
  
  return `Great question! To unlock full AI capabilities:\n\n1. Get your free API key at makersuite.google.com\n2. Go to Profile → Settings → Add API Key\n3. Then I can answer questions about your data and provide personalized insights!\n\nFor now, try asking about: expenses, sleep, food, or fitness.`;
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
    insights.push(`You've spent $${data.expenses.toFixed(2)} today. Check Dashboard for category breakdown. 💰`);
  }
  
  if (insights.length === 0) {
    insights.push("Start logging your activities to get personalized insights! ✨");
  }
  
  return insights;
}
