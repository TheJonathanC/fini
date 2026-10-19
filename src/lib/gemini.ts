import { GoogleGenAI } from "@google/genai";
import { FinancialInsights, Transaction } from "./types";
import { parseDateToTimestamp, formatDisplayDate } from "./dateUtils";

export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  isLowerTier?: boolean;
}

export const AVAILABLE_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Recommended — High multimodal accuracy on PDF statements with stable rate limits",
    badge: "Recommended",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    isLowerTier: true
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Ultra-fast response times and generous request-per-minute quota",
    badge: "Fast & High Quota",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    isLowerTier: true
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Lightweight resource footprint — ideal during high peak traffic",
    badge: "Lite",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    isLowerTier: true
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Reliable fallback model with mature quota allocation",
    badge: "Fallback",
    badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600",
    isLowerTier: true
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    description: "High-capability preview model — frequently subject to high call volume & strict rate limits",
    badge: "High Calls / Peak Traffic",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    isLowerTier: false
  }
];

export const DEFAULT_MODEL = "gemini-2.5-flash";

export type GeminiErrorCode =
  | "RATE_LIMIT_EXCEEDED"
  | "MODEL_OVERLOADED"
  | "INVALID_API_KEY"
  | "PAYLOAD_TOO_LARGE"
  | "UNPARSEABLE_RESPONSE"
  | "SERVICE_ERROR";

export interface DescriptiveGeminiError {
  code: GeminiErrorCode;
  title: string;
  message: string;
  suggestion: string;
  model: string;
  fallbackAttempted?: boolean;
  fallbackModel?: string;
  technicalDetails?: string;
}

export class GeminiAnalysisError extends Error {
  descriptive: DescriptiveGeminiError;

  constructor(descriptive: DescriptiveGeminiError) {
    super(descriptive.message);
    this.name = "GeminiAnalysisError";
    this.descriptive = descriptive;
  }
}

export function parseGeminiError(
  error: unknown,
  model: string,
  fallbackAttempted = false,
  fallbackModel?: string
): DescriptiveGeminiError {
  const errObj = error as { message?: string; status?: number | string; statusCode?: number; code?: number | string };
  const rawMsg = errObj?.message || (typeof error === "string" ? error : JSON.stringify(error) || "Unknown error");
  const status = errObj?.status || errObj?.statusCode || errObj?.code;
  const msgLower = rawMsg.toLowerCase();

  // Check 1: Rate limit / Quota / High calls / Resource exhausted (HTTP 429)
  const isRateLimit =
    status === 429 ||
    status === "RESOURCE_EXHAUSTED" ||
    msgLower.includes("resource_exhausted") ||
    msgLower.includes("429") ||
    msgLower.includes("quota exceeded") ||
    msgLower.includes("rate limit") ||
    msgLower.includes("too many requests") ||
    msgLower.includes("queries per minute") ||
    msgLower.includes("queries per day") ||
    msgLower.includes("high calls") ||
    msgLower.includes("high call volume") ||
    msgLower.includes("exhausted");

  // Check 2: Model overloaded / Peak capacity / Service Unavailable (HTTP 503)
  const isOverloaded =
    status === 503 ||
    status === "UNAVAILABLE" ||
    msgLower.includes("overloaded") ||
    msgLower.includes("model_capacity_exhausted") ||
    msgLower.includes("unavailable") ||
    msgLower.includes("high demand") ||
    msgLower.includes("503");

  // Check 3: Invalid API Key / Auth (HTTP 400 / 401 / 403)
  const isAuthError =
    status === 401 ||
    status === 403 ||
    msgLower.includes("api_key_invalid") ||
    msgLower.includes("api key not valid") ||
    msgLower.includes("permission_denied") ||
    msgLower.includes("permission denied") ||
    msgLower.includes("unregistered callers");

  // Check 4: Payload / Token limit
  const isPayloadTooLarge =
    status === 413 ||
    msgLower.includes("payload too large") ||
    msgLower.includes("request entity too large") ||
    msgLower.includes("token limit") ||
    msgLower.includes("exceeds the maximum");

  if (isRateLimit) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      title: "Rate Limit / High Call Volume Reached",
      message: fallbackAttempted && fallbackModel
        ? `Gemini encountered high call traffic on "${model}" and also exhausted quota on fallback "${fallbackModel}". Google's free-tier rate limit (Queries Per Minute) was exceeded.`
        : `Gemini encountered a high call volume or exceeded your API key's rate limit on "${model}". Google's free-tier enforces limits on requests per minute (RPM) during peak periods.`,
      suggestion: "Please wait 30 to 60 seconds before retrying. You can also switch to a lower model like Gemini 2.0 Flash or Gemini 2.5 Flash Lite in Settings ⚙️, or check your quota in Google AI Studio.",
      model,
      fallbackAttempted,
      fallbackModel,
      technicalDetails: rawMsg
    };
  }

  if (isOverloaded) {
    return {
      code: "MODEL_OVERLOADED",
      title: "Gemini Model Temporarily Overloaded",
      message: fallbackAttempted && fallbackModel
        ? `Google Gemini servers are currently experiencing peak traffic and high demand on "${model}" and fallback model "${fallbackModel}".`
        : `Google Gemini servers are currently experiencing peak traffic and temporary overload on "${model}".`,
      suggestion: "Please wait 15–30 seconds and retry. Switching to a lighter model like Gemini 2.0 Flash or Gemini 2.5 Flash Lite in Settings ⚙️ can also bypass congestion.",
      model,
      fallbackAttempted,
      fallbackModel,
      technicalDetails: rawMsg
    };
  }

  if (isAuthError) {
    return {
      code: "INVALID_API_KEY",
      title: "Invalid or Unauthorized API Key",
      message: "Google Gemini rejected the provided API key. It may be mistyped, expired, or lack access to the Generative Language API.",
      suggestion: "Open Settings ⚙️ to verify your key or generate a new free API key at Google AI Studio (aistudio.google.com).",
      model,
      technicalDetails: rawMsg
    };
  }

  if (isPayloadTooLarge) {
    return {
      code: "PAYLOAD_TOO_LARGE",
      title: "Document Exceeds Processing Limits",
      message: "The bank statement PDF has too many pages or the file payload exceeds the Gemini document limit.",
      suggestion: "Try uploading an individual statement period or a compressed PDF document.",
      model,
      technicalDetails: rawMsg
    };
  }

  return {
    code: "SERVICE_ERROR",
    title: "Gemini Analysis Failed",
    message: rawMsg || "An unexpected error occurred while communicating with the Gemini API.",
    suggestion: "Check your internet connection, verify your API key in Settings, and try uploading your PDF again.",
    model,
    fallbackAttempted,
    fallbackModel,
    technicalDetails: rawMsg
  };
}

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

function getFallbackModel(primaryModel: string): string | null {
  if (primaryModel === "gemini-3.8-flash") return "gemini-2.5-flash";
  if (primaryModel === "gemini-2.5-flash") return "gemini-2.0-flash";
  if (primaryModel === "gemini-2.0-flash") return "gemini-1.5-flash";
  return null;
}

async function requestGeminiContent(
  ai: GoogleGenAI,
  model: string,
  base64Data: string,
  mimeType: string
) {
  return await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
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
}

export async function analyzeStatement(
  base64Data: string,
  mimeType: string,
  apiKey: string,
  requestedModel: string = DEFAULT_MODEL
): Promise<FinancialInsights> {
  const ai = new GoogleGenAI({ apiKey });
  const modelToUse = requestedModel || DEFAULT_MODEL;

  let response: any;
  let activeModel = modelToUse;
  let fallbackAttempted = false;
  let fallbackModelUsed: string | undefined;

  try {
    response = await requestGeminiContent(ai, activeModel, base64Data, mimeType);
  } catch (primaryErr: unknown) {
    console.warn(`Gemini call failed with model "${activeModel}":`, primaryErr);

    const fallback = getFallbackModel(activeModel);
    const parsedErr = parseGeminiError(primaryErr, activeModel);

    // If error is high calls / rate limit (429) or overloaded (503), attempt fallback
    if (fallback && (parsedErr.code === "RATE_LIMIT_EXCEEDED" || parsedErr.code === "MODEL_OVERLOADED")) {
      console.info(`Attempting fallback to lower model "${fallback}"...`);
      fallbackAttempted = true;
      fallbackModelUsed = fallback;
      try {
        response = await requestGeminiContent(ai, fallback, base64Data, mimeType);
        activeModel = fallback;
      } catch (fallbackErr: unknown) {
        console.error(`Fallback to "${fallback}" also failed:`, fallbackErr);
        throw new GeminiAnalysisError(
          parseGeminiError(fallbackErr, modelToUse, true, fallback)
        );
      }
    } else {
      throw new GeminiAnalysisError(parsedErr);
    }
  }

  if (!response?.text) {
    throw new GeminiAnalysisError({
      code: "UNPARSEABLE_RESPONSE",
      title: "No Data Received From Gemini",
      message: `Gemini (${activeModel}) completed the request but returned an empty response.`,
      suggestion: "Please try uploading the document again, or select a different model in Settings ⚙️.",
      model: activeModel,
      fallbackAttempted,
      fallbackModel: fallbackModelUsed
    });
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
  } catch (_parseError) {
    console.error("Failed to parse Gemini JSON response:", response.text);
    throw new GeminiAnalysisError({
      code: "UNPARSEABLE_RESPONSE",
      title: "Statement Extraction Error",
      message: "Gemini analyzed the statement, but the response was not valid financial data.",
      suggestion: "Please verify that the PDF is a standard bank statement with clear transaction tables and readable text.",
      model: activeModel,
      fallbackAttempted,
      fallbackModel: fallbackModelUsed,
      technicalDetails: typeof response.text === "string" ? response.text.slice(0, 300) : undefined
    });
  }
}
