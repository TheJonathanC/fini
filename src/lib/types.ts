export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export interface CategorySummary {
  category: string;
  total: number;
  percentage: number;
}

export interface DailySpending {
  date: string;
  total: number;
}

export interface FinancialInsights {
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
  topCategories: CategorySummary[];
  largestExpenses: Transaction[];
  dailySpending: DailySpending[];
  summary: string;
  funnyObservation: string;
}
