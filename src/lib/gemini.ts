import { GoogleGenAI } from "@google/genai";
import { FinancialInsights } from "./types";

const SYSTEM_PROMPT = `You are an elite, friendly, and witty financial analysis assistant for "fini." — a modern financial statement analyzer.
Your job is to read and understand bank statements provided as PDF documents (or statement extracts).

Extract all transactions accurately, categorize them, detect currency, and compute a comprehensive, delightful financial insight report.
You MUST return ONLY a valid JSON object matching this structure:

{
  "currencySymbol": string (e.g. "₹", "$", "€", "£", etc. AUTO-DETECT from currency markers like Rs., INR, ₹, USD, $, EUR. DEFAULT TO "₹" if in doubt or for Indian statements),
  "currencyCode": string (e.g. "INR", "USD", "EUR", "GBP". Default to "INR" if in doubt),
  "statementPeriod": string (e.g. "1 Sep 2026 - 28 Sep 2026" or the detected date range),
  "accountHolder": string (e.g. detected name or "Account Holder"),
  "totalSpent": number (total outflows/expenses, positive float),
  "totalIncome": number (total inflows/paychecks/deposits, positive float),
  "netSavings": number (totalIncome minus totalSpent),
  "savingsRate": number (percentage 0-100, e.g. 24.5),
  "averageDailySpend": number (totalSpent divided by active days in period),
  "healthScore": number (integer 1-100 evaluating financial health, cash flow, and savings cushion),
  "financialPersona": string (A playful, clever 3-5 word archetype with emoji, e.g. "The Weekend Gourmet 🍣", "The Disciplined Investor 📈", "Chai & Tech Enthusiast ☕💻"),
  "personaDescription": string (A fun, lighthearted 1-2 sentence description of their financial personality based on their transactions),
  "summary": string (A crisp, highly engaging 2-3 sentence executive breakdown of where their money went),
  "funnyObservation": string (A witty, humorous, but friendly observation pointing out a specific quirky spending habit seen in the statement),
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
      "date": string (e.g. "26 Sep 2026"),
      "isoDate": string (e.g. "2026-09-26"),
      "description": string,
      "amount": number,
      "category": string,
      "type": "expense"
    }
  ],
  "subscriptions": [
    {
      "name": string (e.g. "Netflix", "Spotify", "Cult.fit", "iCloud"),
      "amount": number,
      "frequency": "Monthly" | "Weekly" | "Annual",
      "category": string
    }
  ],
  "dailySpending": [
    {
      "date": string (e.g. "01 Sep"),
      "isoDate": string (e.g. "2026-09-01"),
      "total": number,
      "dayOfWeek": string (e.g. "Mon", "Tue")
    }
  ],
  "allTransactions": [
    {
      "date": string (e.g. "28 Sep 2026"),
      "isoDate": string (YYYY-MM-DD format e.g. "2026-09-28" for strict chronological sorting),
      "description": string,
      "amount": number,
      "category": string,
      "type": "expense" | "income"
    }
  ]
}

Important Guidelines:
1. Ensure currency is detected accurately. If the statement uses Indian Rupees (INR, Rs, ₹), set "currencySymbol": "₹" and "currencyCode": "INR". Default to "₹" if currency is ambiguous.
2. In "allTransactions", sort transactions in DESCENDING chronological order (LATEST / MOST RECENT TRANSACTION FIRST).
3. Ensure date formats are clean and consistent: for display use format like "DD MMM YYYY" (e.g. "24 Sep 2026") and always supply valid "isoDate" (e.g. "2026-09-24") so dates never get scrambled or corrupted.
4. Ensure all expense amounts are positive numbers. Group categories logically (e.g., Housing & Rent, Food & Dining, Shopping, Transportation, Subscriptions & Tech, Utilities, Entertainment, Healthcare).
5. Keep the tone friendly, smart, sleek, and playfully observant.`;

export async function analyzeStatement(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<FinancialInsights> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: "Analyze this bank statement PDF thoroughly. Detect the currency (defaulting to ₹ if ambiguous), extract all transactions sorted from newest to oldest with clean dates, compute key statistics, detect subscriptions, categorize spending, and provide insightful commentary according to the system instructions." },
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

    // Normalize currency: if contains '$' and user didn't have USD explicitly, default to ₹ if desired or keep detected
    const currencySymbol = parsed.currencySymbol || "₹";
    const currencyCode = parsed.currencyCode || "INR";

    // Ensure transactions are sorted newest first by isoDate or date
    const rawTransactions = Array.isArray(parsed.allTransactions) ? parsed.allTransactions : [];
    const sortedTransactions = [...rawTransactions].sort((a, b) => {
      if (a.isoDate && b.isoDate) {
        return b.isoDate.localeCompare(a.isoDate);
      }
      return 0;
    });

    return {
      currencySymbol,
      currencyCode,
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
      funnyObservation: parsed.funnyObservation || "Your local coffee & dining spots are definitely thankful for your business!",
      actionableTips: Array.isArray(parsed.actionableTips) ? parsed.actionableTips : ["Review recurring subscriptions to cancel unused services."],
      topCategories: Array.isArray(parsed.topCategories) ? parsed.topCategories : [],
      largestExpenses: Array.isArray(parsed.largestExpenses) ? parsed.largestExpenses : [],
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      dailySpending: Array.isArray(parsed.dailySpending) ? parsed.dailySpending : [],
      allTransactions: sortedTransactions
    };
  } catch (error) {
    console.error("Failed to parse Gemini response:", response.text);
    throw new Error("Unable to parse the financial statement data. Please ensure the document is a readable bank statement.");
  }
}
