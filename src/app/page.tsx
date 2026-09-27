"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Settings,
  Upload,
  PiggyBank,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Zap,
  Calendar,
  CreditCard,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  ChevronRight,
  Filter,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Smile,
  X
} from "lucide-react";
import { analyzeStatement } from "@/lib/gemini";
import { FinancialInsights, Transaction } from "@/lib/types";
import { SAMPLE_INSIGHTS } from "@/lib/mockData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CATEGORY_COLORS = [
  "#6366F1", // Indigo
  "#F43F5E", // Rose
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#3B82F6", // Blue
];

export default function Home() {
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>("");
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>("Reading PDF statement...");
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "daily" | "subscriptions" | "transactions">("overview");

  // Transaction Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Check local storage for API Key and previous insights
    const storedKey = localStorage.getItem("fini_gemini_api_key");
    if (storedKey) {
      setApiKey(storedKey);
      setTempKey(storedKey);
    }

    const storedInsights = localStorage.getItem("fini_insights");
    if (storedInsights) {
      try {
        setInsights(JSON.parse(storedInsights));
      } catch (e) {
        console.error("Failed to parse stored insights", e);
      }
    }
  }, []);

  const handleSaveApiKey = () => {
    const trimmed = tempKey.trim();
    localStorage.setItem("fini_gemini_api_key", trimmed);
    setApiKey(trimmed);
    setShowSettings(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem("fini_gemini_api_key");
    setApiKey("");
    setTempKey("");
  };

  const loadDemoData = () => {
    setIsDemoActive(true);
    setInsights(SAMPLE_INSIGHTS);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProcessFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please select a PDF bank statement.");
      return;
    }

    if (!apiKey) {
      setShowSettings(true);
      setError("Please add your Gemini API key to process real statements.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setAnalysisStep("Reading bank statement document...");

    const stepTimer1 = setTimeout(() => {
      setAnalysisStep("Scanning & categorizing transactions with Gemini...");
    }, 2000);

    const stepTimer2 = setTimeout(() => {
      setAnalysisStep("Uncovering subscriptions & generating financial insights...");
    }, 5500);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await analyzeStatement(base64Data, file.type, apiKey);
      setIsDemoActive(false);
      setInsights(result);
      localStorage.setItem("fini_insights", JSON.stringify(result));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze the statement. Please verify your API key and file.");
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const clearAllData = () => {
    localStorage.removeItem("fini_insights");
    setInsights(null);
    setIsDemoActive(false);
    setError(null);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const txs = insights?.allTransactions || insights?.largestExpenses || [];
    return txs.filter((tx) => {
      const matchesSearch =
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategoryFilter === "all" || tx.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [insights, searchQuery, selectedCategoryFilter]);

  // Unique categories for filter pills
  const availableCategories = useMemo(() => {
    if (!insights?.topCategories) return [];
    return insights.topCategories.map((c) => c.category);
  }, [insights]);

  return (
    <div className="min-h-screen text-slate-900 pb-20 selection:bg-amber-200">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b-2 border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF08A] border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center text-2xl select-none transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              🐷
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black tracking-tight text-slate-900">fini.</span>
                <span className="text-xs font-black uppercase px-2 py-0.5 bg-[#DCFCE7] border border-slate-900 rounded-full shadow-[1px_1px_0px_0px_#0f172a]">
                  v2.0
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 hidden sm:block">
                Clear & playful financial statement intelligence
              </p>
            </div>
          </div>

          {/* Header Action Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {insights && (
              <button
                onClick={clearAllData}
                className="tactile-btn px-3 py-2 bg-white text-xs sm:text-sm text-slate-700 hover:bg-slate-50 gap-1.5"
                title="Upload another statement"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Upload New</span>
              </button>
            )}

            {!insights && (
              <button
                onClick={loadDemoData}
                className="tactile-btn px-3.5 py-2 bg-[#FEF08A] text-xs sm:text-sm text-slate-900 hover:bg-[#FDE047] gap-1.5"
              >
                <Sparkles size={15} className="text-amber-700 animate-pulse" />
                <span>Try Demo</span>
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className={`tactile-btn px-3.5 py-2 text-xs sm:text-sm gap-2 ${
                apiKey
                  ? "bg-[#DCFCE7] text-slate-900 hover:bg-[#BBF7D0]"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Settings size={16} />
              <span className="hidden sm:inline">
                {apiKey ? "API Connected ⚡" : "Add Gemini Key"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-8 p-4 bg-[#FFE4E6] border-2 border-slate-900 rounded-2xl shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-rose-600 shrink-0" size={24} />
              <p className="font-bold text-rose-950 text-sm sm:text-base">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-rose-200 rounded-lg text-rose-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: HERO & DROPZONE (WHEN NO INSIGHTS LOADED YET)        */}
        {/* ============================================================ */}
        {!insights && !isAnalyzing && (
          <div className="py-6 sm:py-12 flex flex-col items-center">
            {/* Playful Floating Hero Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E0F2FE] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] mb-6">
              <span className="text-base">✨</span>
              <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wide uppercase">
                100% Private & Client-Side Bank Statement Analysis
              </span>
            </div>

            {/* Hero Heading */}
            <h1 className="text-4xl sm:text-6xl font-black text-center max-w-3xl leading-[1.1] mb-6 text-slate-900">
              Where did your money <br />
              <span className="inline-block relative">
                <span className="relative z-10 px-3 py-1 bg-[#FEF08A] rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] -rotate-1 transform inline-block">
                  actually go?
                </span>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-xl font-bold text-slate-600 text-center max-w-2xl mb-10 leading-relaxed">
              Drop any PDF bank statement. In seconds, Gemini AI categorizes every transaction, uncovers sneaky subscriptions, and reveals your real spending pulse.
            </p>

            {/* Main Interactive Dropzone */}
            <div className="w-full max-w-2xl mb-10">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-3xl border-3 border-dashed transition-all p-8 sm:p-12 text-center flex flex-col items-center justify-center ${
                  isDragging
                    ? "border-emerald-600 bg-emerald-50 scale-[1.01]"
                    : "border-slate-900/60 bg-white hover:border-slate-900 hover:bg-[#FAF5FF]/40 shadow-[4px_4px_0px_0px_#0f172a]"
                }`}
              >
                {/* Visual Icon */}
                <div className="w-20 h-20 rounded-3xl bg-[#E0F2FE] border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center text-4xl mb-5 transform hover:scale-110 transition-transform">
                  📂
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  Drop your PDF Bank Statement here
                </h3>
                <p className="text-sm font-bold text-slate-500 mb-6 max-w-sm">
                  Supports Chase, Bank of America, Wells Fargo, Revolut, Monzo, or any standard bank PDF
                </p>

                {/* Upload Button */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <label className="tactile-btn px-6 py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-base gap-2 cursor-pointer">
                    <Upload size={20} />
                    <span>Select PDF File</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                  </label>

                  <button
                    onClick={loadDemoData}
                    className="tactile-btn px-6 py-3.5 bg-[#FEF08A] hover:bg-[#FDE047] text-slate-900 text-base gap-2"
                  >
                    <Sparkles size={18} className="text-amber-700" />
                    <span>See Demo Statement</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Perks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
              <div className="p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] border border-slate-900 flex items-center justify-center text-lg shrink-0">
                  🔒
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">100% Private</h4>
                  <p className="text-xs font-bold text-slate-500">Processed locally in browser</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF08A] border border-slate-900 flex items-center justify-center text-lg shrink-0">
                  ⚡
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Gemini 3.8 Flash</h4>
                  <p className="text-xs font-bold text-slate-500">Reads native PDF statements</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] border border-slate-900 flex items-center justify-center text-lg shrink-0">
                  🕵️
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Subscription Radar</h4>
                  <p className="text-xs font-bold text-slate-500">Flags recurring drains</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: LOADING & ANALYZING STATE                            */}
        {/* ============================================================ */}
        {isAnalyzing && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-[#FEF08A] border-3 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] flex items-center justify-center text-5xl mb-8 animate-bounce">
              🐷
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">
              Fini is crunching your numbers...
            </h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-900 rounded-full shadow-[2px_2px_0px_0px_#0f172a] mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-sm font-black text-slate-800">{analysisStep}</span>
            </div>
            <p className="text-sm font-bold text-slate-500 max-w-md">
              Gemini is transcribing transactions, aggregating category totals, and detecting spending trends. This usually takes 5-10 seconds.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: FULL FINANCIAL DASHBOARD                             */}
        {/* ============================================================ */}
        {insights && !isAnalyzing && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Dashboard Sub-Header / Statement Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center text-2xl">
                  📄
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      {insights.accountHolder || "Statement Overview"}
                    </h2>
                    {isDemoActive && (
                      <span className="px-2.5 py-0.5 text-xs font-black bg-[#FEF08A] text-slate-900 border border-slate-900 rounded-full">
                        Demo Statement
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Calendar size={13} />
                    <span>{insights.statementPeriod || "Latest Analysis Period"}</span>
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <label className="tactile-btn px-4 py-2 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-slate-900 text-xs sm:text-sm gap-1.5 cursor-pointer">
                  <Upload size={14} />
                  <span>Upload Another PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </label>
                <button
                  onClick={clearAllData}
                  className="tactile-btn px-3 py-2 bg-[#FFE4E6] hover:bg-[#FECDD3] text-rose-900 text-xs sm:text-sm gap-1"
                  title="Clear insights"
                >
                  <RefreshCw size={14} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Vital Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Total Spent */}
              <div className="tactile-card p-6 bg-[#FFE4E6]/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-900">
                      Total Outflows
                    </span>
                    <span className="p-2 rounded-xl bg-white border border-slate-900 text-rose-600 shadow-[1px_1px_0px_0px_#0f172a]">
                      <TrendingDown size={18} />
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900">
                    ${insights.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900/10 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Daily Avg:</span>
                  <span className="font-black text-slate-900">
                    ${(insights.averageDailySpend || insights.totalSpent / 30).toFixed(2)} / day
                  </span>
                </div>
              </div>

              {/* Card 2: Total Income */}
              <div className="tactile-card p-6 bg-[#DCFCE7]/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                      Total Inflows
                    </span>
                    <span className="p-2 rounded-xl bg-white border border-slate-900 text-emerald-600 shadow-[1px_1px_0px_0px_#0f172a]">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900">
                    ${insights.totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900/10 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Deposits:</span>
                  <span className="font-black text-emerald-800">Income & Transfers</span>
                </div>
              </div>

              {/* Card 3: Net Savings */}
              <div className="tactile-card p-6 bg-[#E0F2FE]/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-900">
                      Net Saved
                    </span>
                    <span className="p-2 rounded-xl bg-white border border-slate-900 text-sky-600 shadow-[1px_1px_0px_0px_#0f172a]">
                      <Wallet size={18} />
                    </span>
                  </div>
                  <div className={`text-3xl sm:text-4xl font-black ${insights.netSavings >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {insights.netSavings >= 0 ? "+" : ""}${insights.netSavings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900/10 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Savings Rate:</span>
                  <span className="px-2 py-0.5 bg-white border border-slate-900 rounded-full font-black text-slate-900 shadow-[1px_1px_0px_0px_#0f172a]">
                    {insights.savingsRate}%
                  </span>
                </div>
              </div>

              {/* Card 4: Financial Health Score */}
              <div className="tactile-card p-6 bg-[#FEF08A]/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Fini Score
                    </span>
                    <span className="p-2 rounded-xl bg-white border border-slate-900 text-amber-600 shadow-[1px_1px_0px_0px_#0f172a]">
                      <ShieldCheck size={18} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">
                      {insights.healthScore || 80}
                    </span>
                    <span className="text-sm font-black text-slate-500">/ 100</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900/10 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Rating:</span>
                  <span className="font-black text-amber-950">
                    {insights.healthScore >= 80 ? "Healthy 🌟" : insights.healthScore >= 60 ? "Moderate ⚖️" : "Needs Care ⚠️"}
                  </span>
                </div>
              </div>
            </div>

            {/* Persona & Fun Insights Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Persona Archetype & AI Summary */}
              <div className="lg:col-span-2 tactile-card p-6 sm:p-8 bg-[#FEF9C3]/40 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-[#FEF08A] border-2 border-slate-900 rounded-full font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_#0f172a]">
                      Your Money Archetype
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                      {insights.financialPersona || "The Mindful Spender"}
                    </h3>
                  </div>

                  <p className="text-base font-bold text-slate-700 mb-5 leading-relaxed">
                    {insights.personaDescription}
                  </p>

                  <div className="p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-1">
                      AI Executive Summary
                    </h4>
                    <p className="text-sm font-bold text-slate-800 leading-normal">
                      {insights.summary}
                    </p>
                  </div>
                </div>

                {/* Actionable Tips */}
                {insights.actionableTips && insights.actionableTips.length > 0 && (
                  <div className="mt-6 pt-5 border-t-2 border-slate-900/10">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-600" />
                      <span>Smart Money Moves</span>
                    </h4>
                    <div className="space-y-2">
                      {insights.actionableTips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm font-bold text-slate-700">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Funny Observation Callout */}
              <div className="tactile-card p-6 sm:p-8 bg-[#F3E8FF]/60 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#E9D5FF] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center text-2xl mb-4">
                    💡
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-3">
                    The Quirky Detail
                  </h3>
                  <div className="p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-800 text-sm font-bold leading-relaxed">
                    "{insights.funnyObservation}"
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-[#E0F2FE] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🕵️</span>
                    <span className="text-xs font-black text-sky-950 uppercase tracking-wider">
                      Recurring Radar
                    </span>
                  </div>
                  <p className="text-xs font-bold text-sky-900">
                    Detected {insights.subscriptions?.length || 0} subscriptions totaling $
                    {(insights.subscriptions?.reduce((sum, s) => sum + s.amount, 0) || 0).toFixed(2)}/mo
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Tab Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setActiveTab("overview")}
                className={`tactile-btn px-4 py-2.5 text-sm gap-2 whitespace-nowrap ${
                  activeTab === "overview"
                    ? "bg-[#FEF08A] text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Layers size={16} />
                <span>Overview & Pulse</span>
              </button>

              <button
                onClick={() => setActiveTab("categories")}
                className={`tactile-btn px-4 py-2.5 text-sm gap-2 whitespace-nowrap ${
                  activeTab === "categories"
                    ? "bg-[#DCFCE7] text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <PieIcon size={16} />
                <span>Where it Went</span>
              </button>

              <button
                onClick={() => setActiveTab("daily")}
                className={`tactile-btn px-4 py-2.5 text-sm gap-2 whitespace-nowrap ${
                  activeTab === "daily"
                    ? "bg-[#E0F2FE] text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <BarChart3 size={16} />
                <span>Daily Spending Pulse</span>
              </button>

              <button
                onClick={() => setActiveTab("subscriptions")}
                className={`tactile-btn px-4 py-2.5 text-sm gap-2 whitespace-nowrap ${
                  activeTab === "subscriptions"
                    ? "bg-[#F3E8FF] text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CreditCard size={16} />
                <span>Subscriptions ({insights.subscriptions?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("transactions")}
                className={`tactile-btn px-4 py-2.5 text-sm gap-2 whitespace-nowrap ${
                  activeTab === "transactions"
                    ? "bg-[#FFE4E6] text-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Search size={16} />
                <span>All Transactions</span>
              </button>
            </div>

            {/* ============================================================ */}
            {/* TAB CONTENT 1: OVERVIEW & PULSE                              */}
            {/* ============================================================ */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Donut Chart: Top Categories */}
                <div className="tactile-card p-6 sm:p-8 bg-white">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">Spending Breakdown</h3>
                      <p className="text-xs font-bold text-slate-500">Distribution by category</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("categories")}
                      className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      View All <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={insights.topCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="total"
                          nameKey="category"
                        >
                          {insights.topCategories.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                              stroke="#0F172A"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Total"]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "16px",
                            border: "2px solid #0F172A",
                            boxShadow: "3px 3px 0px 0px #0F172A",
                            fontWeight: "bold",
                            fontFamily: "var(--font-nunito)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top 4 Category List */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {insights.topCategories.slice(0, 4).map((cat, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border-2 border-slate-900 bg-slate-50 shadow-[2px_2px_0px_0px_#0f172a] flex items-center gap-2.5"
                      >
                        <span className="text-xl">{cat.emoji || "🏷️"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 truncate">{cat.category}</p>
                          <p className="text-xs font-bold text-slate-500">${cat.total.toFixed(0)} ({cat.percentage}%)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 5 Biggest Splurges */}
                <div className="tactile-card p-6 sm:p-8 bg-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900">Top Splurges</h3>
                        <p className="text-xs font-bold text-slate-500">Your largest single purchases</p>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 bg-[#FFE4E6] text-rose-900 border border-slate-900 rounded-full">
                        Outflows
                      </span>
                    </div>

                    <div className="space-y-3">
                      {insights.largestExpenses.slice(0, 5).map((expense, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-[#FEF08A] border border-slate-900 font-black text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-black text-sm text-slate-900 truncate">
                                {expense.description}
                              </p>
                              <p className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                <span>{expense.date}</span>
                                <span>•</span>
                                <span className="text-indigo-600">{expense.category}</span>
                              </p>
                            </div>
                          </div>
                          <span className="font-black text-base text-rose-600 shrink-0">
                            -${expense.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-900/10 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">
                      Total of top 5 splurges:
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      $
                      {insights.largestExpenses
                        .slice(0, 5)
                        .reduce((sum, e) => sum + e.amount, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB CONTENT 2: CATEGORIES BREAKDOWN                          */}
            {/* ============================================================ */}
            {activeTab === "categories" && (
              <div className="tactile-card p-6 sm:p-8 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900">Where Your Money Went</h3>
                    <p className="text-sm font-bold text-slate-500">
                      Categorized breakdown sorted by highest expenditure
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-[#FEF08A] border-2 border-slate-900 rounded-2xl shadow-[2px_2px_0px_0px_#0f172a] text-xs font-black">
                    {insights.topCategories.length} Categories Identified
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.topCategories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl border-2 border-slate-900 bg-white shadow-[3px_3px_0px_0px_#0f172a] hover:bg-slate-50 transition-colors flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center text-2xl">
                            {cat.emoji || "🏷️"}
                          </span>
                          <div>
                            <h4 className="font-black text-base text-slate-900">{cat.category}</h4>
                            <p className="text-xs font-bold text-slate-500">
                              {cat.count ? `${cat.count} purchases` : "Multiple charges"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-xl text-slate-900">
                            ${cat.total.toFixed(2)}
                          </div>
                          <span className="text-xs font-black px-2 py-0.5 bg-[#DCFCE7] border border-slate-900 rounded-full">
                            {cat.percentage}% of spend
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(cat.percentage, 100)}%`,
                            backgroundColor: cat.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB CONTENT 3: DAILY SPENDING PULSE                          */}
            {/* ============================================================ */}
            {activeTab === "daily" && (
              <div className="tactile-card p-6 sm:p-8 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900">Daily Spending Pulse</h3>
                    <p className="text-sm font-bold text-slate-500">
                      Chronological day-by-day cash outlays
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-[#E0F2FE] border-2 border-slate-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#0f172a]">
                      Avg Daily: ${(insights.averageDailySpend || insights.totalSpent / 30).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="h-80 sm:h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.dailySpending}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 12, fill: "#475569" }}
                        stroke="#0F172A"
                        strokeWidth={1.5}
                      />
                      <YAxis
                        tick={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 12, fill: "#475569" }}
                        stroke="#0F172A"
                        strokeWidth={1.5}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <Tooltip
                        formatter={(val: any) => [`$${Number(val).toFixed(2)}`, "Daily Total"]}
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: "16px",
                          border: "2px solid #0F172A",
                          boxShadow: "3px 3px 0px 0px #0F172A",
                          fontWeight: "bold",
                          fontFamily: "var(--font-nunito)",
                        }}
                      />
                      <Bar
                        dataKey="total"
                        fill="#2563EB"
                        stroke="#0F172A"
                        strokeWidth={1.5}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-[#FEF9C3]/50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Spikes usually correspond to rent payments, grocery bulk runs, or weekend activities. Hover over any bar to inspect specific day totals.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB CONTENT 4: SUBSCRIPTIONS RADAR                           */}
            {/* ============================================================ */}
            {activeTab === "subscriptions" && (
              <div className="tactile-card p-6 sm:p-8 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900">Subscription Radar</h3>
                    <p className="text-sm font-bold text-slate-500">
                      Recurring monthly bills and memberships detected by AI
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-[#F3E8FF] border-2 border-slate-900 rounded-2xl shadow-[2px_2px_0px_0px_#0f172a] text-xs font-black">
                    Monthly Drain: $
                    {(insights.subscriptions?.reduce((sum, s) => sum + s.amount, 0) || 0).toFixed(2)} / mo
                  </div>
                </div>

                {(!insights.subscriptions || insights.subscriptions.length === 0) ? (
                  <div className="py-12 text-center text-slate-500 font-bold">
                    No recurring subscriptions automatically detected in this period.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {insights.subscriptions.map((sub, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center text-xl">
                            💳
                          </div>
                          <div>
                            <h4 className="font-black text-base text-slate-900">{sub.name}</h4>
                            <span className="text-xs font-bold text-slate-500">{sub.category}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black text-slate-900">
                            ${sub.amount.toFixed(2)}
                          </span>
                          <p className="text-xs font-bold text-slate-500">/ mo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB CONTENT 5: ALL TRANSACTIONS LOG                          */}
            {/* ============================================================ */}
            {activeTab === "transactions" && (
              <div className="tactile-card p-6 sm:p-8 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900">All Transactions</h3>
                    <p className="text-sm font-bold text-slate-500">
                      Search and filter all extracted line items
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-900 rounded-full text-xs font-black">
                    {filteredTransactions.length} items shown
                  </span>
                </div>

                {/* Search Bar & Filter Chips */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search transactions (e.g. Coffee, Uber, Rent)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-4 py-3 rounded-2xl border-2 border-slate-900 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Transactions Table / List */}
                <div className="space-y-2.5">
                  {filteredTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 font-bold">
                      No transactions match your search filter.
                    </div>
                  ) : (
                    filteredTransactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_#0f172a] hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-900 flex items-center justify-center text-sm font-black text-slate-600 shrink-0">
                            {tx.date}
                          </span>
                          <div className="min-w-0">
                            <p className="font-black text-sm text-slate-900 truncate">{tx.description}</p>
                            <span className="text-xs font-bold text-indigo-600">{tx.category}</span>
                          </div>
                        </div>

                        <span
                          className={`font-black text-base shrink-0 ${
                            tx.type === "income" ? "text-emerald-600" : "text-slate-900"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* SETTINGS MODAL (CLEAN & NON-INTRUSIVE)                       */}
      {/* ============================================================ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="tactile-card w-full max-w-lg p-6 sm:p-8 bg-white relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF08A] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center text-xl">
                ⚙️
              </div>
              <h2 className="text-2xl font-black text-slate-900">Settings</h2>
            </div>

            <p className="text-sm font-bold text-slate-500 mb-6">
              Connect your Google Gemini API key to read and analyze real bank statement PDFs.
            </p>

            {/* Privacy Guarantee Note */}
            <div className="p-4 rounded-2xl bg-[#DCFCE7]/70 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] mb-6">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-emerald-700" />
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                  Zero Server Privacy
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-900 leading-relaxed">
                Your API key and bank statements never pass through our servers. Everything runs 100% locally in your browser using the official Gemini SDK.
              </p>
            </div>

            {/* Input field */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="w-full p-4 rounded-2xl border-2 border-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-black text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>Get a free key from Google AI Studio</span>
                  <ExternalLink size={12} />
                </a>

                {apiKey && (
                  <button
                    onClick={handleClearApiKey}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="tactile-btn px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!tempKey.trim()}
                className="tactile-btn px-6 py-2.5 bg-[#FEF08A] hover:bg-[#FDE047] text-slate-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
