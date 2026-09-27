export interface Transaction {
  date: string;
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
