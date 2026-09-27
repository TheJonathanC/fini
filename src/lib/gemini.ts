import { GoogleGenAI } from "@google/genai";
import { FinancialInsights } from "./types";

const SYSTEM_PROMPT = `You are a financial analysis assistant. Your job is to analyze bank statements provided as PDF documents.
You will extract the transactions and provide a comprehensive financial insight report.
You must return the response as a JSON object matching the following structure:
{
  "totalSpent": number,
  "totalIncome": number,
  "netSavings": number,
  "topCategories": [
    { "category": string, "total": number, "percentage": number }
  ],
  "largestExpenses": [
    { "date": string, "description": string, "amount": number, "category": string }
  ],
  "dailySpending": [
    { "date": string, "total": number }
  ],
  "summary": string (A helpful, 2-3 sentence summary of the spending habits),
  "funnyObservation": string (A lighthearted, witty observation about their spending, appropriate for a fun app)
}

Make sure to aggregate transactions correctly. For categories, use high-level categories like "Housing", "Food & Dining", "Transportation", "Shopping", "Entertainment", "Bills & Utilities", "Fees", "Transfers", etc.
All monetary values should be positive numbers. For daily spending, aggregate spending by date and sort chronologically.`;

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
          { text: "Please analyze this bank statement." },
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
    throw new Error("No response from Gemini");
  }

  try {
    const parsed = JSON.parse(response.text);
    return parsed as FinancialInsights;
  } catch (error) {
    console.error("Failed to parse JSON:", response.text);
    throw new Error("Failed to parse the analysis results.");
  }
}
