import { GoogleGenAI } from "@google/genai";
import { FinancialInsights } from "./types";

const SYSTEM_PROMPT = `You are an elite, friendly, and witty financial analysis assistant for "fini." — a modern financial statement analyzer.
Your job is to read and understand bank statements provided as PDF documents (or statement extracts).

Extract all transactions accurately, categorize them, and compute a comprehensive, delightful financial insight report.
You MUST return ONLY a valid JSON object matching this structure:

{
  "statementPeriod": string (e.g. "Oct 1 - Oct 31, 2025" or the detected date range),
  "accountHolder": string (e.g. detected name or "Account Holder"),
  "totalSpent": number (total outflows/expenses, positive float),
  "totalIncome": number (total inflows/paychecks/deposits, positive float),
  "netSavings": number (totalIncome minus totalSpent),
  "savingsRate": number (percentage 0-100, e.g. 24.5),
  "averageDailySpend": number (totalSpent divided by active days in period),
  "healthScore": number (integer 1-100 evaluating financial health, cash flow, and savings cushion),
  "financialPersona": string (A playful, clever 3-5 word archetype with emoji, e.g. "The Weekend Gourmet 🍣", "The Disciplined Investor 📈", "Latte Legend ☕"),
  "personaDescription": string (A fun, lighthearted 1-2 sentence description of their financial personality based on their transactions),
  "summary": string (A crisp, highly engaging 2-3 sentence executive breakdown of where their money went),
  "funnyObservation": string (A witty, humorous, but friendly observation pointing out a specific quirky spending habit seen in the statement, e.g. coffee count, late-night rides, or delivery frequency),
  "actionableTips": [
    string,
    string,
    string
  ],
  "topCategories": [
    {
      "category": string,
      "total": number,
      "percentage": number,
      "count": number,
      "emoji": string (e.g. "🏠", "🍔", "🛍️", "🚗", "⚡", "🎟️", "💊", "📦"),
      "color": string (hex color: e.g. "#818CF8", "#F43F5E", "#F59E0B", "#06B6D4", "#10B981", "#EC4899", "#8B5CF6")
    }
  ],
  "largestExpenses": [
    {
      "date": string,
      "description": string,
      "amount": number,
      "category": string,
      "type": "expense"
    }
  ],
  "subscriptions": [
    {
      "name": string (e.g. "Netflix", "Spotify", "Gym", "Cloud Storage"),
      "amount": number,
      "frequency": "Monthly" | "Weekly" | "Annual",
      "category": string
    }
  ],
  "dailySpending": [
    {
      "date": string (e.g. "Oct 01"),
      "total": number,
      "dayOfWeek": string (e.g. "Mon", "Tue")
    }
  ],
  "allTransactions": [
    {
      "date": string,
      "description": string,
      "amount": number,
      "category": string,
      "type": "expense" | "income"
    }
  ]
}

Important Guidelines:
1. Ensure all numbers are calculated accurately from the statement. All expense amounts should be positive numbers.
2. Group categories logically (e.g., Housing, Food & Dining, Shopping, Transportation, Subscriptions & Tech, Entertainment, Utilities, Healthcare).
3. If some dates or names are unclear, make your best reasonable inference based on the text.
4. Keep the tone friendly, smart, sleek, and playfully observant.`;

export async function analyzeStatement(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<FinancialInsights> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: "Analyze this bank statement PDF thoroughly. Extract all transactions, compute key statistics, detect subscriptions, categorize spending, and provide insightful commentary according to the system instructions." },
          { inlineData: { data: base64Data, mimeType } }
        ]
      }
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.2,
    }
  });

  if (!response.text) {
    throw new Error("No response received from Gemini.");
  }

  try {
    const parsed = JSON.parse(response.text);
    
    // Provide safe defaults for any missing optional fields
    return {
      statementPeriod: parsed.statementPeriod || "Current Statement",
      accountHolder: parsed.accountHolder || "Account Holder",
      totalSpent: Number(parsed.totalSpent || 0),
      totalIncome: Number(parsed.totalIncome || 0),
      netSavings: Number(parsed.netSavings ?? ((parsed.totalIncome || 0) - (parsed.totalSpent || 0))),
      savingsRate: Number(parsed.savingsRate ?? (parsed.totalIncome > 0 ? Math.round((((parsed.totalIncome - parsed.totalSpent) / parsed.totalIncome) * 100) * 10) / 10 : 0)),
      averageDailySpend: Number(parsed.averageDailySpend || 0),
      healthScore: Number(parsed.healthScore || 75),
      financialPersona: parsed.financialPersona || "The Mindful Spender 🌿",
      personaDescription: parsed.personaDescription || "A balanced spender with varied monthly investments.",
      summary: parsed.summary || "Here is the breakdown of your spending across key categories.",
      funnyObservation: parsed.funnyObservation || "Your coffee and snack purchases are keeping local businesses thriving!",
      actionableTips: Array.isArray(parsed.actionableTips) ? parsed.actionableTips : ["Review recurring subscriptions to cancel unused services."],
      topCategories: Array.isArray(parsed.topCategories) ? parsed.topCategories : [],
      largestExpenses: Array.isArray(parsed.largestExpenses) ? parsed.largestExpenses : [],
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      dailySpending: Array.isArray(parsed.dailySpending) ? parsed.dailySpending : [],
      allTransactions: Array.isArray(parsed.allTransactions) ? parsed.allTransactions : []
    };
  } catch (error) {
    console.error("Failed to parse Gemini response:", response.text);
    throw new Error("Unable to parse the financial statement data. Please ensure the document is a readable bank statement.");
  }
}
