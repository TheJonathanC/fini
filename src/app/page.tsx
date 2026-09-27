"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Settings,
  Upload,
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
  ChevronRight,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  X,
  Sun,
  Moon,
  ArrowUpDown,
  ChevronLeft,
  ChevronDown,
  Check,
  Coins
} from "lucide-react";
import { analyzeStatement } from "@/lib/gemini";
import { FinancialInsights, Transaction } from "@/lib/types";
import { SAMPLE_INSIGHTS } from "@/lib/mockData";
import { parseDateToTimestamp, formatDisplayDate } from "@/lib/dateUtils";
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

const CURRENCY_LIST = [
  { symbol: "₹", code: "INR", flag: "🇮🇳", name: "Rupee", label: "₹ Rupee (INR)" },
  { symbol: "$", code: "USD", flag: "🇺🇸", name: "Dollar", label: "$ Dollar (USD)" },
  { symbol: "€", code: "EUR", flag: "🇪🇺", name: "Euro", label: "€ Euro (EUR)" },
  { symbol: "£", code: "GBP", flag: "🇬🇧", name: "Pound", label: "£ Pound (GBP)" },
];

export default function Home() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Settings & API Key
  const [apiKey, setApiKey] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>("");
  const [currencySymbol, setCurrencySymbol] = useState<string>("₹");

  // App State
  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>("Reading PDF statement...");
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "categories" | "daily" | "subscriptions" | "transactions">("overview");

  // Transaction Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [transactionSort, setTransactionSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Currency Dropdown Popover State
  const [isCurrencyOpen, setIsCurrencyOpen] = useState<boolean>(false);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target as Node)) {
        setIsCurrencyOpen(false);
      }
    };
    if (isCurrencyOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isCurrencyOpen]);

  const currentCurrency = CURRENCY_LIST.find((c) => c.symbol === currencySymbol) || CURRENCY_LIST[0];

  // Initialize theme, api key, and previous data
  useEffect(() => {
    // Theme initialization
    const storedTheme = localStorage.getItem("fini_theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (storedTheme === "dark" || (!storedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    // Stored currency preference
    const storedCurrency = localStorage.getItem("fini_currency");
    if (storedCurrency) {
      setCurrencySymbol(storedCurrency);
    }

    // API Key
    const storedKey = localStorage.getItem("fini_gemini_api_key");
    if (storedKey) {
      setApiKey(storedKey);
      setTempKey(storedKey);
    }

    // Previous insights
    const storedInsights = localStorage.getItem("fini_insights");
    if (storedInsights) {
      try {
        const parsed = JSON.parse(storedInsights);
        setInsights(parsed);
        if (parsed.currencySymbol) {
          setCurrencySymbol(parsed.currencySymbol);
        }
      } catch (e) {
        console.error("Failed to parse stored insights", e);
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("fini_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("fini_theme", "light");
    }
  };

  const handleCurrencyChange = (newSymbol: string) => {
    setCurrencySymbol(newSymbol);
    localStorage.setItem("fini_currency", newSymbol);
  };

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
    setCurrencySymbol(SAMPLE_INSIGHTS.currencySymbol || "₹");
    setError(null);
    setCurrentPage(1);
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
      setAnalysisStep("Scanning transactions & detecting currency...");
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
      if (result.currencySymbol) {
        setCurrencySymbol(result.currencySymbol);
        localStorage.setItem("fini_currency", result.currencySymbol);
      }
      localStorage.setItem("fini_insights", JSON.stringify(result));
      setCurrentPage(1);
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
    setCurrentPage(1);
  };

  // Safe Currency Formatter
  const formatMoney = (amount: number, customSymbol?: string) => {
    const sym = customSymbol || currencySymbol || "₹";
    const num = Math.abs(Number(amount) || 0);
    // Use Indian numbering format for Rupee, or standard US for others
    const locale = sym === "₹" ? "en-IN" : "en-US";
    return `${sym}${num.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Robust date parser for reliable sorting
  const parseTransactionDate = (tx: Transaction): number => {
    return parseDateToTimestamp(tx.isoDate || tx.date);
  };

  // Filtered & Sorted Transactions
  const filteredAndSortedTransactions = useMemo(() => {
    const txs = insights?.allTransactions || insights?.largestExpenses || [];
    
    // 1. Filter
    const filtered = txs.filter((tx) => {
      const matchesSearch =
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategoryFilter === "all" || tx.category === selectedCategoryFilter;
      const matchesType =
        selectedTypeFilter === "all" || tx.type === selectedTypeFilter;
      return matchesSearch && matchesCategory && matchesType;
    });

    // 2. Sort (Default: Newest First)
    return filtered.sort((a, b) => {
      if (transactionSort === "newest") {
        return parseTransactionDate(b) - parseTransactionDate(a);
      }
      if (transactionSort === "oldest") {
        return parseTransactionDate(a) - parseTransactionDate(b);
      }
      if (transactionSort === "highest") {
        return b.amount - a.amount;
      }
      if (transactionSort === "lowest") {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [insights, searchQuery, selectedCategoryFilter, selectedTypeFilter, transactionSort]);

  // Paginated Transactions
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(start, start + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage]);

  // Unique categories for filter pills
  const availableCategories = useMemo(() => {
    if (!insights?.topCategories) return [];
    return insights.topCategories.map((c) => c.category);
  }, [insights]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 pb-20 transition-colors">
      {/* ============================================================ */}
      {/* TOP HEADER NAVIGATION                                        */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b-2 border-slate-900 dark:border-[#38455E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
          {/* Brand Logo (no v2 tag) */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FEF08A] dark:bg-amber-400 border-2 border-slate-900 dark:border-amber-300 shadow-[3px_3px_0px_0px_#0f172a] dark:shadow-[3px_3px_0px_0px_#020617] flex items-center justify-center text-2xl select-none transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              🐷
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  fini.
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:block">
                Clear & playful financial statement intelligence
              </p>
            </div>
          </div>

          {/* Header Action Badges & Toggles */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="tactile-btn p-2 sm:px-3 sm:py-2 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#27354E]"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <Sun size={18} className="text-amber-400 animate-spin-slow" />
              ) : (
                <Moon size={18} className="text-indigo-600" />
              )}
            </button>

            {/* Custom Tactile Currency Dropdown (Matches the Cartoony Vibe) */}
            <div className="relative" ref={currencyMenuRef}>
              <button
                type="button"
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className="tactile-btn px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 text-xs sm:text-sm gap-1.5 hover:bg-slate-50 dark:hover:bg-[#27354E]"
                aria-expanded={isCurrencyOpen}
                title="Change Currency"
              >
                <span className="w-5 h-5 rounded-lg bg-[#FEF08A] dark:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center border border-slate-900 dark:border-amber-300 shadow-[1px_1px_0px_0px_#0f172a]">
                  {currentCurrency.symbol}
                </span>
                <span className="font-extrabold hidden xs:inline">{currentCurrency.code}</span>
                <ChevronDown
                  size={14}
                  className={`text-slate-500 transition-transform duration-200 ${
                    isCurrencyOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Popover Dropdown */}
              {isCurrencyOpen && (
                <div className="absolute right-0 mt-2 w-52 p-2 rounded-2xl bg-white dark:bg-[#131B2E] border-2 border-slate-900 dark:border-[#38455E] shadow-[4px_4px_0px_0px_#0f172a] dark:shadow-[4px_4px_0px_0px_#020617] z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Currency
                    </span>
                    <Coins size={13} className="text-amber-500" />
                  </div>

                  <div className="space-y-1">
                    {CURRENCY_LIST.map((c) => {
                      const isSelected = currencySymbol === c.symbol;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            handleCurrencyChange(c.symbol);
                            setIsCurrencyOpen(false);
                          }}
                          className={`w-full p-2 rounded-xl text-left font-bold text-xs sm:text-sm flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-[#FEF08A] dark:bg-amber-400 text-slate-950 border-1.5 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
                              : "hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base select-none">{c.flag}</span>
                            <span className="w-5 h-5 rounded-md bg-white/90 dark:bg-black/20 flex items-center justify-center font-black text-xs border border-slate-900/30">
                              {c.symbol}
                            </span>
                            <span className="font-extrabold">{c.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black opacity-60 uppercase">
                              {c.code}
                            </span>
                            {isSelected && <Check size={14} className="stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {insights && (
              <button
                onClick={clearAllData}
                className="tactile-btn px-3 py-2 bg-white dark:bg-[#1E293B] text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#27354E] gap-1.5"
                title="Upload another statement"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Upload New</span>
              </button>
            )}

            {!insights && (
              <button
                onClick={loadDemoData}
                className="tactile-btn px-3 sm:px-3.5 py-2 bg-[#FEF08A] dark:bg-amber-400 text-xs sm:text-sm text-slate-900 hover:bg-[#FDE047] gap-1.5"
              >
                <Sparkles size={15} className="text-amber-800 animate-pulse" />
                <span>Try Demo</span>
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className={`tactile-btn px-3 sm:px-3.5 py-2 text-xs sm:text-sm gap-2 ${
                apiKey
                  ? "bg-[#DCFCE7] dark:bg-emerald-950 dark:text-emerald-300 text-slate-900 hover:bg-[#BBF7D0]"
                  : "bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              }`}
            >
              <Settings size={16} />
              <span className="hidden md:inline">
                {apiKey ? "API Connected ⚡" : "Add Key"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-[#FFE4E6] dark:bg-rose-950/70 border-2 border-slate-900 dark:border-rose-800 rounded-2xl shadow-[3px_3px_0px_0px_#0f172a] dark:shadow-[3px_3px_0px_0px_#020617] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0" size={24} />
              <p className="font-bold text-rose-950 dark:text-rose-200 text-sm sm:text-base">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-rose-200 dark:hover:bg-rose-900 rounded-lg text-rose-800 dark:text-rose-300 transition-colors"
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E0F2FE] dark:bg-sky-950 dark:text-sky-300 border-2 border-slate-900 dark:border-sky-800 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] mb-6">
              <span className="text-base">✨</span>
              <span className="text-xs sm:text-sm font-black tracking-wide uppercase">
                100% Private & Client-Side Bank Statement Analysis
              </span>
            </div>

            {/* Hero Heading */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-center max-w-3xl leading-[1.15] mb-6 text-slate-900 dark:text-white">
              Where did your money <br />
              <span className="inline-block relative mt-2 sm:mt-1">
                <span className="relative z-10 px-3 py-1 bg-[#FEF08A] dark:bg-amber-400 text-slate-900 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] dark:shadow-[4px_4px_0px_0px_#020617] -rotate-1 transform inline-block">
                  actually go?
                </span>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-lg font-bold text-slate-600 dark:text-slate-400 text-center max-w-2xl mb-8 sm:mb-10 leading-relaxed px-2">
              Drop any PDF bank statement. In seconds, Gemini AI categorizes every transaction, uncovers sneaky subscriptions, and reveals your real spending pulse in {currencySymbol}.
            </p>

            {/* Interactive Dropzone */}
            <div className="w-full max-w-2xl mb-8 sm:mb-10 px-2 sm:px-0">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative rounded-3xl border-3 border-dashed transition-all p-6 sm:p-12 text-center flex flex-col items-center justify-center ${
                  isDragging
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 scale-[1.01]"
                    : "border-slate-900/60 dark:border-slate-700 bg-white dark:bg-[#131B2E] hover:border-slate-900 dark:hover:border-slate-500 shadow-[4px_4px_0px_0px_#0f172a] dark:shadow-[4px_4px_0px_0px_#020617]"
                }`}
              >
                {/* Visual Icon */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#E0F2FE] dark:bg-sky-950 border-2 border-slate-900 dark:border-sky-800 shadow-[3px_3px_0px_0px_#0f172a] dark:shadow-[3px_3px_0px_0px_#020617] flex items-center justify-center text-3xl sm:text-4xl mb-4 sm:mb-5 transform hover:scale-110 transition-transform">
                  📂
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
                  Drop your PDF Bank Statement here
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                  Supports HDFC, SBI, ICICI, Axis, Chase, BoA, Revolut, or any standard bank PDF
                </p>

                {/* Upload Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
                  <label className="tactile-btn w-full sm:w-auto px-6 py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm sm:text-base gap-2 cursor-pointer">
                    <Upload size={18} />
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
                    className="tactile-btn w-full sm:w-auto px-6 py-3.5 bg-[#FEF08A] dark:bg-amber-400 hover:bg-[#FDE047] text-slate-900 text-sm sm:text-base gap-2"
                  >
                    <Sparkles size={18} className="text-amber-800" />
                    <span>Try Demo Statement ({currencySymbol})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Perks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-3xl px-2 sm:px-0">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#131B2E] border-2 border-slate-900 dark:border-[#38455E] shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950 border border-slate-900 dark:border-emerald-800 flex items-center justify-center text-lg shrink-0">
                  🔒
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">100% Private</h4>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Processed locally in browser</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#131B2E] border-2 border-slate-900 dark:border-[#38455E] shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF08A] dark:bg-amber-950 border border-slate-900 dark:border-amber-800 flex items-center justify-center text-lg shrink-0">
                  ⚡
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">Gemini 3.8 Flash</h4>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Auto-detects Rupee/Currency</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#131B2E] border-2 border-slate-900 dark:border-[#38455E] shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] dark:bg-purple-950 border border-slate-900 dark:border-purple-800 flex items-center justify-center text-lg shrink-0">
                  🕵️
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">Subscription Radar</h4>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Flags recurring drains</p>
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
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#FEF08A] dark:bg-amber-400 border-3 border-slate-900 dark:border-amber-300 shadow-[4px_4px_0px_0px_#0f172a] dark:shadow-[4px_4px_0px_0px_#020617] flex items-center justify-center text-4xl sm:text-5xl mb-6 sm:mb-8 animate-bounce">
              🐷
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
              Fini is crunching your numbers...
            </h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#131B2E] border-2 border-slate-900 dark:border-[#38455E] rounded-full shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">{analysisStep}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 max-w-md px-4">
              Gemini is transcribing transactions, detecting currency, aggregating categories, and sorting newest first.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: FULL FINANCIAL DASHBOARD                             */}
        {/* ============================================================ */}
        {insights && !isAnalyzing && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Dashboard Sub-Header / Statement Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131B2E] border-2 border-slate-900 dark:border-[#38455E] shadow-[3px_3px_0px_0px_#0f172a] dark:shadow-[3px_3px_0px_0px_#020617]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E0F2FE] dark:bg-sky-950 border-2 border-slate-900 dark:border-sky-800 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center justify-center text-xl sm:text-2xl shrink-0">
                  📄
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                      {insights.accountHolder || "Statement Overview"}
                    </h2>
                    {isDemoActive && (
                      <span className="px-2 py-0.5 text-xs font-black bg-[#FEF08A] dark:bg-amber-400 text-slate-900 border border-slate-900 rounded-full">
                        Demo
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-xs font-black bg-[#DCFCE7] dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-slate-900 dark:border-emerald-800 rounded-full">
                      {currencySymbol} {insights.currencyCode || "INR"}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                    <Calendar size={13} />
                    <span>{insights.statementPeriod || "Latest Analysis Period"}</span>
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="tactile-btn px-3 sm:px-4 py-2 bg-[#E0F2FE] dark:bg-sky-950 hover:bg-[#BAE6FD] dark:hover:bg-sky-900 text-slate-900 dark:text-sky-200 text-xs sm:text-sm gap-1.5 cursor-pointer">
                  <Upload size={14} />
                  <span>Upload PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </label>
                <button
                  onClick={clearAllData}
                  className="tactile-btn px-3 py-2 bg-[#FFE4E6] dark:bg-rose-950 hover:bg-[#FECDD3] dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200 text-xs sm:text-sm gap-1"
                  title="Clear insights"
                >
                  <RefreshCw size={14} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Vital Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Card 1: Total Spent */}
              <div className="tactile-card p-5 sm:p-6 bg-[#FFE4E6]/50 dark:bg-rose-950/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                      Total Outflows
                    </span>
                    <span className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-700 text-rose-600 dark:text-rose-400 shadow-[1px_1px_0px_0px_#0f172a] dark:shadow-[1px_1px_0px_0px_#020617]">
                      <TrendingDown size={18} />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white break-words">
                    {formatMoney(insights.totalSpent)}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900/10 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Daily Avg:</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    {formatMoney(insights.averageDailySpend || insights.totalSpent / 30)} / day
                  </span>
                </div>
              </div>

              {/* Card 2: Total Income */}
              <div className="tactile-card p-5 sm:p-6 bg-[#DCFCE7]/60 dark:bg-emerald-950/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      Total Inflows
                    </span>
                    <span className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 shadow-[1px_1px_0px_0px_#0f172a] dark:shadow-[1px_1px_0px_0px_#020617]">
                      <TrendingUp size={18} />
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white break-words">
                    {formatMoney(insights.totalIncome)}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900/10 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Inflows:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400">Salary & Deposits</span>
                </div>
              </div>

              {/* Card 3: Net Savings */}
              <div className="tactile-card p-5 sm:p-6 bg-[#E0F2FE]/60 dark:bg-sky-950/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-900 dark:text-sky-300">
                      Net Saved
                    </span>
                    <span className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-700 text-sky-600 dark:text-sky-400 shadow-[1px_1px_0px_0px_#0f172a] dark:shadow-[1px_1px_0px_0px_#020617]">
                      <Wallet size={18} />
                    </span>
                  </div>
                  <div className={`text-2xl sm:text-3xl lg:text-4xl font-black break-words ${insights.netSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {insights.netSavings >= 0 ? "+" : "-"}{formatMoney(Math.abs(insights.netSavings))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900/10 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">Savings Rate:</span>
                  <span className="px-2 py-0.5 bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-700 rounded-full font-black text-slate-900 dark:text-slate-100 shadow-[1px_1px_0px_0px_#0f172a] dark:shadow-[1px_1px_0px_0px_#020617]">
                    {insights.savingsRate}%
                  </span>
                </div>
              </div>

              {/* Card 4: Financial Health Score */}
              <div className="tactile-card p-5 sm:p-6 bg-[#FEF08A]/50 dark:bg-amber-950/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Fini Score
                    </span>
                    <span className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-900 dark:border-slate-700 text-amber-600 dark:text-amber-400 shadow-[1px_1px_0px_0px_#0f172a] dark:shadow-[1px_1px_0px_0px_#020617]">
                      <ShieldCheck size={18} />
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
                      {insights.healthScore || 80}
                    </span>
                    <span className="text-sm font-black text-slate-500 dark:text-slate-400">/ 100</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900/10 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">Health:</span>
                  <span className="font-black text-amber-950 dark:text-amber-300">
                    {insights.healthScore >= 80 ? "Healthy 🌟" : insights.healthScore >= 60 ? "Moderate ⚖️" : "Needs Care ⚠️"}
                  </span>
                </div>
              </div>
            </div>

            {/* Persona & Fun Insights Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Persona Archetype & AI Summary */}
              <div className="lg:col-span-2 tactile-card p-5 sm:p-8 bg-[#FEF9C3]/40 dark:bg-amber-950/20 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                    <span className="px-3 py-1 bg-[#FEF08A] dark:bg-amber-400 text-slate-900 border-2 border-slate-900 rounded-full font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_#0f172a]">
                      Your Money Archetype
                    </span>
                    <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                      {insights.financialPersona || "The Mindful Spender"}
                    </h3>
                  </div>

                  <p className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 mb-5 leading-relaxed">
                    {insights.personaDescription}
                  </p>

                  <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border-2 border-slate-900 dark:border-[#38455E] shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617]">
                    <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-1">
                      AI Executive Summary
                    </h4>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-normal">
                      {insights.summary}
                    </p>
                  </div>
                </div>

                {/* Actionable Tips */}
                {insights.actionableTips && insights.actionableTips.length > 0 && (
                  <div className="mt-6 pt-5 border-t-2 border-slate-900/10 dark:border-slate-700/60">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-500" />
                      <span>Smart Money Moves</span>
                    </h4>
                    <div className="space-y-2">
                      {insights.actionableTips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Funny Observation Callout */}
              <div className="tactile-card p-5 sm:p-8 bg-[#F3E8FF]/60 dark:bg-purple-950/20 flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E9D5FF] dark:bg-purple-900 border-2 border-slate-900 dark:border-purple-700 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center justify-center text-xl sm:text-2xl mb-4">
                    💡
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-3">
                    The Quirky Detail
                  </h3>
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border-2 border-slate-900 dark:border-[#38455E] shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold leading-relaxed">
                    "{insights.funnyObservation}"
                  </div>
                </div>

                <div className="mt-5 p-4 rounded-2xl bg-[#E0F2FE] dark:bg-sky-950/50 border-2 border-slate-900 dark:border-sky-800 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base sm:text-lg">🕵️</span>
                    <span className="text-xs font-black text-sky-950 dark:text-sky-300 uppercase tracking-wider">
                      Recurring Radar
                    </span>
                  </div>
                  <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                    Detected {insights.subscriptions?.length || 0} subscriptions totaling{" "}
                    {formatMoney(insights.subscriptions?.reduce((sum, s) => sum + s.amount, 0) || 0)}/mo
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Tab Navigation (Fully Responsive) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
              <button
                onClick={() => setActiveTab("overview")}
                className={`tactile-btn px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm gap-2 whitespace-nowrap snap-start ${
                  activeTab === "overview"
                    ? "bg-[#FEF08A] dark:bg-amber-400 text-slate-900"
                    : "bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#27354E]"
                }`}
              >
                <Layers size={16} />
                <span>Overview & Pulse</span>
              </button>

              <button
                onClick={() => setActiveTab("categories")}
                className={`tactile-btn px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm gap-2 whitespace-nowrap snap-start ${
                  activeTab === "categories"
                    ? "bg-[#DCFCE7] dark:bg-emerald-400 text-slate-900"
                    : "bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#27354E]"
                }`}
              >
                <PieIcon size={16} />
                <span>Where it Went</span>
              </button>

              <button
                onClick={() => setActiveTab("daily")}
                className={`tactile-btn px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm gap-2 whitespace-nowrap snap-start ${
                  activeTab === "daily"
                    ? "bg-[#E0F2FE] dark:bg-sky-400 text-slate-900"
                    : "bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#27354E]"
                }`}
              >
                <BarChart3 size={16} />
                <span>Daily Spending Pulse</span>
              </button>

              <button
                onClick={() => setActiveTab("subscriptions")}
                className={`tactile-btn px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm gap-2 whitespace-nowrap snap-start ${
                  activeTab === "subscriptions"
                    ? "bg-[#F3E8FF] dark:bg-purple-400 text-slate-900"
                    : "bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#27354E]"
                }`}
              >
                <CreditCard size={16} />
                <span>Subscriptions ({insights.subscriptions?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("transactions")}
                className={`tactile-btn px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm gap-2 whitespace-nowrap snap-start ${
                  activeTab === "transactions"
                    ? "bg-[#FFE4E6] dark:bg-rose-400 text-slate-900"
                    : "bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#27354E]"
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Donut Chart: Top Categories */}
                <div className="tactile-card p-5 sm:p-8 bg-white dark:bg-[#131B2E]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        Spending Breakdown
                      </h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Distribution by category</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("categories")}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
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
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="total"
                          nameKey="category"
                        >
                          {insights.topCategories.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                              stroke={isDarkMode ? "#0B0F19" : "#0F172A"}
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any, item: any) => [
                            `${formatMoney(Number(value))} (${item?.payload?.percentage || 0}%)`,
                            `${item?.payload?.emoji || "🏷️"} ${name || "Total"}`,
                          ]}
                          contentStyle={{
                            backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
                            borderRadius: "16px",
                            border: isDarkMode ? "2px solid #38455E" : "2px solid #0F172A",
                            boxShadow: "3px 3px 0px 0px rgba(0,0,0,0.5)",
                            color: isDarkMode ? "#F8FAFC" : "#0F172A",
                            fontWeight: "bold",
                            fontFamily: "var(--font-nunito)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Complete Category Color Index / Legend */}
                  <div className="mt-5 pt-4 border-t-2 border-slate-900/10 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span>Category Color Index</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {insights.topCategories.length} categories
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {insights.topCategories.map((cat, idx) => {
                        const sliceColor = cat.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                        return (
                          <div
                            key={idx}
                            className="p-2 sm:p-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-[#27354E] transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Color Swatch / Dot matching chart slice */}
                              <span
                                className="w-3.5 h-3.5 rounded-md border border-slate-900 dark:border-slate-400 shadow-[1px_1px_0px_0px_#0f172a] shrink-0"
                                style={{ backgroundColor: sliceColor }}
                                title={`${cat.category} color`}
                              />
                              <span className="text-base shrink-0">{cat.emoji || "🏷️"}</span>
                              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {cat.category}
                              </span>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                                {formatMoney(cat.total)}
                              </span>
                              <span
                                className="text-[10px] font-black px-1.5 py-0.5 rounded-md border border-slate-900 dark:border-slate-700"
                                style={{
                                  backgroundColor: isDarkMode ? `${sliceColor}30` : `${sliceColor}20`,
                                  color: isDarkMode ? "#F8FAFC" : "#0F172A",
                                }}
                              >
                                {cat.percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Top 5 Biggest Splurges */}
                <div className="tactile-card p-5 sm:p-8 bg-white dark:bg-[#131B2E] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                          Top Splurges
                        </h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Your largest single purchases</p>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 bg-[#FFE4E6] dark:bg-rose-950 text-rose-900 dark:text-rose-300 border border-slate-900 dark:border-rose-800 rounded-full">
                        Outflows
                      </span>
                    </div>

                    <div className="space-y-3">
                      {insights.largestExpenses.slice(0, 5).map((expense, idx) => (
                        <div
                          key={idx}
                          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1E293B] border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] hover:bg-slate-50 dark:hover:bg-[#27354E] transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-[#FEF08A] dark:bg-amber-400 text-slate-900 border border-slate-900 font-black text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {expense.description}
                              </p>
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                <span>{expense.date}</span>
                                <span>•</span>
                                <span className="text-indigo-600 dark:text-indigo-400 truncate">{expense.category}</span>
                              </p>
                            </div>
                          </div>
                          <span className="font-black text-sm sm:text-base text-rose-600 dark:text-rose-400 shrink-0">
                            -{formatMoney(expense.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-900/10 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Total top splurges:
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatMoney(
                        insights.largestExpenses
                          .slice(0, 5)
                          .reduce((sum, e) => sum + e.amount, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB CONTENT 2: CATEGORIES BREAKDOWN                          */}
            {/* ============================================================ */}
            {activeTab === "categories" && (
              <div className="tactile-card p-5 sm:p-8 bg-white dark:bg-[#131B2E]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      Where Your Money Went
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      Categorized breakdown sorted by highest expenditure
                    </p>
                  </div>
                  <div className="self-start sm:self-auto px-3.5 py-1.5 bg-[#FEF08A] dark:bg-amber-400 text-slate-900 border-2 border-slate-900 rounded-2xl shadow-[2px_2px_0px_0px_#0f172a] text-xs font-black">
                    {insights.topCategories.length} Categories Identified
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.topCategories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-[3px_3px_0px_0px_#0f172a] dark:shadow-[3px_3px_0px_0px_#020617] hover:bg-slate-50 dark:hover:bg-[#27354E] transition-colors flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E0F2FE] dark:bg-sky-950 border-2 border-slate-900 dark:border-sky-800 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center justify-center text-xl sm:text-2xl shrink-0">
                            {cat.emoji || "🏷️"}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                              {cat.category}
                            </h4>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              {cat.count ? `${cat.count} purchases` : "Multiple charges"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-base sm:text-xl text-slate-900 dark:text-white">
                            {formatMoney(cat.total)}
                          </div>
                          <span className="text-xs font-black px-2 py-0.5 bg-[#DCFCE7] dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-slate-900 dark:border-emerald-800 rounded-full">
                            {cat.percentage}% of spend
                          </span>
                        </div>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 border border-slate-900 dark:border-slate-700 overflow-hidden">
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
              <div className="tactile-card p-5 sm:p-8 bg-white dark:bg-[#131B2E]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      Daily Spending Pulse
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      Chronological day-by-day cash outlays
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-[#E0F2FE] dark:bg-sky-950 text-slate-900 dark:text-sky-300 border-2 border-slate-900 dark:border-sky-800 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617]">
                      Avg Daily: {formatMoney(insights.averageDailySpend || insights.totalSpent / 30)}
                    </span>
                  </div>
                </div>

                <div className="h-72 sm:h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.dailySpending} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#E2E8F0"} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 11, fill: isDarkMode ? "#94A3B8" : "#475569" }}
                        stroke={isDarkMode ? "#475569" : "#0F172A"}
                        strokeWidth={1.5}
                      />
                      <YAxis
                        tick={{ fontFamily: "var(--font-nunito)", fontWeight: 700, fontSize: 11, fill: isDarkMode ? "#94A3B8" : "#475569" }}
                        stroke={isDarkMode ? "#475569" : "#0F172A"}
                        strokeWidth={1.5}
                        tickFormatter={(val) => `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatMoney(Number(val)), "Daily Total"]}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
                          borderRadius: "16px",
                          border: isDarkMode ? "2px solid #38455E" : "2px solid #0F172A",
                          boxShadow: "3px 3px 0px 0px rgba(0,0,0,0.5)",
                          color: isDarkMode ? "#F8FAFC" : "#0F172A",
                          fontWeight: "bold",
                          fontFamily: "var(--font-nunito)",
                        }}
                      />
                      <Bar
                        dataKey="total"
                        fill="#2563EB"
                        stroke={isDarkMode ? "#1E3A8A" : "#0F172A"}
                        strokeWidth={1.5}
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-[#FEF9C3]/50 dark:bg-amber-950/30 border-2 border-slate-900 dark:border-amber-800/60 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-300">
                    Spikes indicate high-spend days like rent, bulk supermarket visits, or weekend activities. Hover over any bar to view the exact outlay.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB CONTENT 4: SUBSCRIPTIONS RADAR                           */}
            {/* ============================================================ */}
            {activeTab === "subscriptions" && (
              <div className="tactile-card p-5 sm:p-8 bg-white dark:bg-[#131B2E]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      Subscription Radar
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      Recurring monthly bills and memberships detected by AI
                    </p>
                  </div>
                  <div className="self-start sm:self-auto px-3.5 py-1.5 bg-[#F3E8FF] dark:bg-purple-950 text-slate-900 dark:text-purple-300 border-2 border-slate-900 dark:border-purple-800 rounded-2xl shadow-[2px_2px_0px_0px_#0f172a] text-xs font-black">
                    Monthly Drain:{" "}
                    {formatMoney(
                      insights.subscriptions?.reduce((sum, s) => sum + s.amount, 0) || 0
                    )}{" "}
                    / mo
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
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1E293B] border-2 border-slate-900 dark:border-slate-700 shadow-[3px_3px_0px_0px_#0f172a] dark:shadow-[3px_3px_0px_0px_#020617] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E0F2FE] dark:bg-sky-950 border-2 border-slate-900 dark:border-sky-800 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] flex items-center justify-center text-xl shrink-0">
                            💳
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                              {sub.name}
                            </h4>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate block">
                              {sub.category}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {formatMoney(sub.amount)}
                          </span>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">/ mo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* TAB CONTENT 5: ALL TRANSACTIONS (CLEAN, SORTED, FORMATTED)   */}
            {/* ============================================================ */}
            {activeTab === "transactions" && (
              <div className="tactile-card p-5 sm:p-8 bg-white dark:bg-[#131B2E]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      All Transactions
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      Cleanly sorted starting with your most recent transaction
                    </p>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 rounded-full text-xs font-black text-slate-800 dark:text-slate-300">
                    {filteredAndSortedTransactions.length} Total Items
                  </span>
                </div>

                {/* Search Bar, Category Filter, Type Filter & Sort Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type="text"
                      placeholder="Search description..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-3 py-2.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="relative">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => {
                        setSelectedCategoryFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 font-bold text-xs sm:text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617]"
                    >
                      <option value="all">All Categories</option>
                      {availableCategories.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                  </div>

                  {/* Type Filter */}
                  <div className="relative">
                    <select
                      value={selectedTypeFilter}
                      onChange={(e) => {
                        setSelectedTypeFilter(e.target.value as any);
                        setCurrentPage(1);
                      }}
                      className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 font-bold text-xs sm:text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617]"
                    >
                      <option value="all">All Flows (In & Out)</option>
                      <option value="expense">Expenses Only (-)</option>
                      <option value="income">Income Only (+)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                  </div>

                  {/* Sort Selector: Newest First by default */}
                  <div className="relative">
                    <select
                      value={transactionSort}
                      onChange={(e) => {
                        setTransactionSort(e.target.value as any);
                        setCurrentPage(1);
                      }}
                      className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-2xl border-2 border-slate-900 dark:border-slate-700 font-bold text-xs sm:text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617]"
                    >
                      <option value="newest">🕒 Newest First (Latest)</option>
                      <option value="oldest">📅 Oldest First</option>
                      <option value="highest">💰 Highest Amount</option>
                      <option value="lowest">🪙 Lowest Amount</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                  </div>
                </div>

                {/* Formatted Transaction Rows */}
                <div className="space-y-2.5">
                  {paginatedTransactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 font-bold">
                      No transactions match your search filter.
                    </div>
                  ) : (
                    paginatedTransactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] hover:bg-slate-50 dark:hover:bg-[#27354E] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Left: Date Badge + Merchant & Category */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Clean Date Pill */}
                          <div className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-700 text-center shrink-0 min-w-[76px]">
                            <span className="block text-xs font-black text-slate-800 dark:text-slate-200">
                              {formatDisplayDate(tx.isoDate || tx.date)}
                            </span>
                          </div>

                          {/* Merchant & Category */}
                          <div className="min-w-0">
                            <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {tx.description}
                            </p>
                            <span className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {tx.category}
                            </span>
                          </div>
                        </div>

                        {/* Right: Amount & Direction Tag */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black border ${
                              tx.type === "income"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {tx.type === "income" ? "Credit" : "Debit"}
                          </span>

                          <span
                            className={`font-black text-base sm:text-lg ${
                              tx.type === "income"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}{formatMoney(tx.amount)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-900/10 dark:border-slate-700/60">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="tactile-btn px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed gap-1"
                    >
                      <ChevronLeft size={15} />
                      <span>Previous</span>
                    </button>

                    <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="tactile-btn px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* SETTINGS MODAL                                               */}
      {/* ============================================================ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="tactile-card w-full max-w-lg p-6 sm:p-8 bg-white dark:bg-[#131B2E] relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF08A] dark:bg-amber-400 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center text-xl">
                ⚙️
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Settings</h2>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              Connect your Google Gemini API key to read and analyze real bank statement PDFs.
            </p>

            {/* Currency Preference in Settings */}
            <div className="mb-5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
                Currency Display
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCY_LIST.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleCurrencyChange(opt.symbol)}
                    className={`p-2.5 rounded-xl border-2 font-black text-xs text-left transition-all flex items-center justify-between ${
                      currencySymbol === opt.symbol
                        ? "border-slate-900 dark:border-amber-400 bg-[#FEF08A] dark:bg-amber-400 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base select-none">{opt.flag}</span>
                      <span>{opt.name}</span>
                    </div>
                    <span className="w-5 h-5 rounded-md bg-white/80 dark:bg-black/20 flex items-center justify-center font-black text-xs border border-slate-900/20">
                      {opt.symbol}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-4 rounded-2xl bg-[#DCFCE7]/70 dark:bg-emerald-950/40 border-2 border-slate-900 dark:border-emerald-800 shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_#020617] mb-6">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className="text-emerald-700 dark:text-emerald-400" />
                <span className="text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wide">
                  Zero Server Privacy
                </span>
              </div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 leading-relaxed">
                Your API key and bank statements never pass through any server. Everything runs 100% locally in your browser using the Gemini SDK.
              </p>
            </div>

            {/* Input field */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="w-full p-3.5 sm:p-4 rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Get free key from Google AI Studio</span>
                  <ExternalLink size={12} />
                </a>

                {apiKey && (
                  <button
                    onClick={handleClearApiKey}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
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
                className="tactile-btn px-4 sm:px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!tempKey.trim()}
                className="tactile-btn px-5 sm:px-6 py-2.5 bg-[#FEF08A] dark:bg-amber-400 hover:bg-[#FDE047] text-slate-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
