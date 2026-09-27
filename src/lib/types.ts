export interface Transaction {
  date: string; // Formatted date e.g. "28 Sep 2026" or "Sep 28"
  isoDate?: string; // YYYY-MM-DD for reliable sorting
  description: string;
  amount: number;
  category: string;
  type?: "expense" | "income";
}

export interface CategorySummary {
  category: string;
  total: number;
  percentage: number;
  count?: number;
  emoji?: string;
  color?: string;
}

export interface DailySpending {
  date: string;
  isoDate?: string;
  total: number;
  dayOfWeek?: string;
}

export interface SubscriptionItem {
  name: string;
  amount: number;
  frequency: string;
  category: string;
}

export interface FinancialInsights {
  currencySymbol?: string; // e.g. "₹", "$", "€", "£"
  currencyCode?: string; // e.g. "INR", "USD", "EUR"
  statementPeriod?: string;
  accountHolder?: string;
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  averageDailySpend: number;
  healthScore: number;
  financialPersona: string;
  personaDescription: string;
  topCategories: CategorySummary[];
  largestExpenses: Transaction[];
  dailySpending: DailySpending[];
  subscriptions: SubscriptionItem[];
  allTransactions?: Transaction[];
  summary: string;
  funnyObservation: string;
  actionableTips: string[];
}
