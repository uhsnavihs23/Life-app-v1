/**
 * GeminiService - AI Integration with Google Gemini API
 * 
 * Model Strategy:
 * 1. Primary: gemini-2.5-flash-lite (fast, efficient)
 * 2. Fallback: gemini-2.5-flash (more powerful, higher quota)
 */

import type { FoodEntry } from '../models/types';

// Check environment variable first, then localStorage
const getApiKey = (): string | null => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.length > 10 && !envKey.includes('YOUR_')) {
    return envKey;
  }
  
  const localKey = localStorage.getItem('lifelog_gemini_api_key');
  if (localKey && localKey.length > 10) {
    return localKey;
  }
  
  return null;
};

export const setGeminiApiKey = (key: string): void => {
  localStorage.setItem('lifelog_gemini_api_key', key);
};

export const clearGeminiApiKey = (): void => {
  localStorage.removeItem('lifelog_gemini_api_key');
};

export const hasGeminiApiKey = (): boolean => {
  return getApiKey() !== null;
};

export const isApiKeyFromEnv = (): boolean => {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  return Boolean(envKey && envKey.length > 10 && !envKey.includes('YOUR_'));
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { 
    message: string;
    code?: number;
    status?: string;
  };
}

/**
 * Professional wrapper for Gemini API with model fallback and quota detection
 */
async function callGemini(prompt: string, options: { vision?: boolean, imageBase64?: string } = {}): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  let lastError = '';
  let isQuotaExhausted = false;

  for (const model of MODELS) {
    try {
      const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
      
      const body: any = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      };

      if (options.vision && options.imageBase64) {
        body.contents[0].parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: options.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          }
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: GeminiResponse = await response.json();

      if (data.error) {
        // Detect 429 Resource Exhausted
        if (data.error.code === 429 || data.error.status === 'RESOURCE_EXHAUSTED') {
          isQuotaExhausted = true;
          throw new Error('QUOTA_EXHAUSTED');
        }
        throw new Error(data.error.message);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('NO_RESPONSE');

      return text;
    } catch (error: any) {
      lastError = error.message;
      if (error.message === 'QUOTA_EXHAUSTED') break; // Don't try other models if key quota is hit
      console.warn(`Model ${model} failed, trying next...`, error);
      continue;
    }
  }

  if (isQuotaExhausted) {
    throw new Error('QUOTA_EXHAUSTED');
  }

  throw new Error(lastError || 'GEMINI_ERROR');
}

export const GeminiService = {
  /**
   * Search/chat - Answer questions about user data
   */
  async search(query: string, context: string = ''): Promise<string> {
    if (!hasGeminiApiKey()) {
      return "Please configure your Gemini API key in the Profile tab to enable AI search.";
    }

    try {
      const prompt = `You are LifeLog AI, a professional personal assistant. 
Use the user's data context provided below to answer their question accurately. 
If the answer isn't in the data, answer based on general knowledge but mention it's not in their logs.

${context ? `USER DATA CONTEXT:\n${context}\n\n` : ''}
USER QUESTION: ${query}

Keep your response friendly, concise (2-4 sentences), and professional.`;

      return await callGemini(prompt);
    } catch (error: any) {
      if (error.message === 'QUOTA_EXHAUSTED') {
        return "I've hit the usage limit for this API key. To continue chatting, please provide a different Gemini API key in your Profile settings.";
      }
      return `I encountered an error: ${error.message}. Please verify your API key and connection.`;
    }
  },

  /**
   * Classify log entries
   */
  async classifyLog(text: string): Promise<any> {
    try {
      const prompt = `Analyze this log entry and return a JSON object with:
- type: "general", "expense", "food", "sleep", "exercise", "note"
- confidence: 0-1
- extractedData: key-value pairs of any data found.

Entry: "${text}"`;
      const response = await callGemini(prompt);
      const match = response.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { type: 'general', confidence: 0.5 };
    } catch {
      return { type: 'general', confidence: 0.5 };
    }
  },

  /**
   * OCR - Extract text from image
   */
  async extractText(imageBase64: string): Promise<string> {
    try {
      return await callGemini("Extract all text from this image clearly.", { vision: true, imageBase64 });
    } catch (error: any) {
      return `OCR Error: ${error.message}`;
    }
  }
};
