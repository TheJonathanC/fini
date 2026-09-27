import { GoogleGenAI } from "@google/genai";
import { FinancialInsights, Transaction } from "./types";
import { parseDateToTimestamp, formatDisplayDate } from "./dateUtils";

const SYSTEM_PROMPT = `You are an elite, thorough, and witty financial analysis assistant for "fini." — a modern financial statement analyzer.
Your job is to read and understand bank statements provided as PDF documents (or statement extracts).

CRITICAL EXTRACTION REQUIREMENTS:
1. MULTI-PAGE COMPLETENESS:
   - Bank statements routinely span multiple pages (Page 1, 2, 3, 4, etc.).
   - You MUST inspect, read, and extract transactions from EVERY SINGLE PAGE of the PDF document from the first page to the very last page.
   - Do NOT stop after page 1. Do NOT stop after 10 or 20 transactions.
   - Every single transaction line item up to the final date in the statement (e.g. 27th, 28th, 30th of the month) MUST be included in "allTransactions".

2. DATE FORMAT & ACCURACY:
   - In most countries (including India, the UK, Europe, Australia, etc.), bank statement dates are printed in DD/MM/YYYY or DD-MM-YYYY format (for example: "27/09/2026" or "27-09-2026" means 27 September 2026).
   - For every transaction, you MUST generate a valid "isoDate" in YYYY-MM-DD format (e.g. "2026-09-27") and a display "date" like "27 Sep 2026".
   - Never confuse the day and month (e.g. 12/09 is 12 September, and 27/09 is 27 September).

3. CURRENCY AUTO-DETECTION:
   - Detect the currency from symbols or text (₹, INR, Rs, Rs., $, USD, €, EUR, £, GBP).
   - Default to "₹" (INR) if in doubt or for Indian bank statements.

4. TRANSACTION SORTING:
   - In "allTransactions", sort transactions chronologically from NEWEST / MOST RECENT to OLDEST.

You MUST return ONLY a valid JSON object matching this structure:
{
  "currencySymbol": string (e.g. "₹", "$", "€", "£"),
  "currencyCode": string (e.g. "INR", "USD", "EUR", "GBP"),
  "statementPeriod": string (e.g. "01 Sep 2026 - 28 Sep 2026"),
  "accountHolder": string (e.g. detected name or "Account Holder"),
  "totalSpent": number (total outflows/expenses, positive float),
  "totalIncome": number (total inflows/paychecks/deposits, positive float),
  "netSavings": number (totalIncome minus totalSpent),
  "savingsRate": number (percentage 0-100),
  "averageDailySpend": number (totalSpent divided by active days in period),
  "healthScore": number (integer 1-100),
  "financialPersona": string (A playful archetype with emoji, e.g. "The Weekend Gourmet 🍣"),
  "personaDescription": string (A fun 1-2 sentence description),
  "summary": string (A crisp 2-3 sentence executive breakdown),
  "funnyObservation": string (A witty observation pointing out a specific habit),
  "actionableTips": [string, string, string],
  "topCategories": [
    {
      "category": string,
      "total": number,
      "percentage": number,
      "count": number,
      "emoji": string,
      "color": string
    }
  ],
  "largestExpenses": [
    {
      "date": string,
      "isoDate": string,
      "description": string,
      "amount": number,
      "category": string,
      "type": "expense"
    }
  ],
  "subscriptions": [
    {
      "name": string,
      "amount": number,
      "frequency": "Monthly" | "Weekly" | "Annual",
      "category": string
    }
  ],
  "dailySpending": [
    {
      "date": string,
      "isoDate": string,
      "total": number,
      "dayOfWeek": string
    }
  ],
  "allTransactions": [
    {
      "date": string,
      "isoDate": string,
      "description": string,
      "amount": number,
      "category": string,
      "type": "expense" | "income"
    }
  ]
}`;

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
          {
            text: `Please read and analyze this bank statement PDF thoroughly across ALL pages.
CRITICAL:
1. Examine EVERY page from first to last — do NOT stop at page 1.
2. Extract all transactions up through the final date of the statement into 'allTransactions'.
3. Correctly parse DD/MM/YYYY dates so late-month transactions (e.g. 13th to 31st of the month) are preserved with accurate YYYY-MM-DD isoDate.
4. Auto-detect currency (default to ₹ if ambiguous).`
          },
          { inlineData: { data: base64Data, mimeType } }
        ]
      }
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 32768,
    }
  });

  if (!response.text) {
    throw new Error("No response received from Gemini.");
  }

  try {
    const parsed = JSON.parse(response.text);

    const currencySymbol = parsed.currencySymbol || "₹";
    const currencyCode = parsed.currencyCode || "INR";

    // Clean, normalize and sort transactions newest first using robust parser
    const rawTransactions: Transaction[] = Array.isArray(parsed.allTransactions) ? parsed.allTransactions : [];
    const formattedTransactions: Transaction[] = rawTransactions.map((tx) => {
      const cleanDate = formatDisplayDate(tx.isoDate || tx.date);
      return {
        ...tx,
        date: cleanDate || tx.date,
        isoDate: tx.isoDate || cleanDate,
        amount: Math.abs(Number(tx.amount) || 0)
      };
    });

    const sortedTransactions = formattedTransactions.sort((a, b) => {
      return parseDateToTimestamp(b.isoDate || b.date) - parseDateToTimestamp(a.isoDate || a.date);
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
