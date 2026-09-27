"use client";

import { useState, useEffect } from "react";
import { Settings, Upload, PiggyBank, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { analyzeStatement } from "@/lib/gemini";
import { FinancialInsights } from "@/lib/types";
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

const COLORS = ['#2979FF', '#00E676', '#D500F9', '#F50057', '#FF9100', '#00B0FF'];

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState("");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem("fini_gemini_api_key");
    if (storedKey) {
      setApiKey(storedKey);
      setTempKey(storedKey);
    } else {
      setShowSettings(true);
    }

    const storedInsights = localStorage.getItem("fini_insights");
    if (storedInsights) {
      try {
        setInsights(JSON.parse(storedInsights));
      } catch (e) {
        console.error("Failed to parse stored insights");
      }
    }
  }, []);

  const saveApiKey = () => {
    localStorage.setItem("fini_gemini_api_key", tempKey);
    setApiKey(tempKey);
    setShowSettings(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }

    if (!apiKey) {
      setShowSettings(true);
      setError("Please provide an API key first.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 part
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await analyzeStatement(base64Data, file.type, apiKey);
      setInsights(result);
      localStorage.setItem("fini_insights", JSON.stringify(result));
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearData = () => {
    localStorage.removeItem("fini_insights");
    setInsights(null);
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#FFF9C4] p-3 rounded-2xl cartoony-shadow">
            <PiggyBank size={32} className="text-[#FF9100]" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[#0F172A]">fini.</h1>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 bg-white rounded-xl cartoony-shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Settings size={24} />
        </button>
      </header>

      {error && (
        <div className="bg-[#FCE4EC] border-2 border-[#F50057] p-4 rounded-xl text-[#F50057] font-bold">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {!insights && !isAnalyzing && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-5xl font-black mb-6 max-w-2xl leading-tight">
            See exactly where your <span className="text-[#00E676]">money</span> is going!
          </h2>
          <p className="text-xl font-semibold text-gray-500 mb-12 max-w-xl">
            Upload your bank statement and let AI figure out your spending habits, top expenses, and daily trends.
          </p>

          <label className="cursor-pointer bg-[#2979FF] text-white px-8 py-5 rounded-2xl font-black text-xl flex items-center gap-3 cartoony-shadow hover:bg-blue-600 transition-all">
            <Upload size={28} />
            Upload PDF Statement
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      )}

      {isAnalyzing && (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 size={64} className="text-[#2979FF] animate-spin mb-6" />
          <h3 className="text-2xl font-bold animate-pulse">Crunching the numbers...</h3>
          <p className="text-gray-500 font-semibold mt-2">Reading your statement & categorizing transactions.</p>
        </div>
      )}

      {insights && !isAnalyzing && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#E3F2FD] p-6 rounded-2xl cartoony-shadow flex flex-col">
              <span className="text-gray-600 font-bold mb-2">Total Spent</span>
              <span className="text-4xl font-black text-[#2979FF]">${insights.totalSpent.toFixed(2)}</span>
            </div>
            <div className="bg-[#E8F5E9] p-6 rounded-2xl cartoony-shadow flex flex-col">
              <span className="text-gray-600 font-bold mb-2">Total Income</span>
              <span className="text-4xl font-black text-[#00E676]">${insights.totalIncome.toFixed(2)}</span>
            </div>
            <div className="bg-[#F3E5F5] p-6 rounded-2xl cartoony-shadow flex flex-col">
              <span className="text-gray-600 font-bold mb-2">Net Savings</span>
              <span className="text-4xl font-black text-[#D500F9]">${insights.netSavings.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-[#FFF9C4] p-6 rounded-2xl cartoony-shadow">
            <h3 className="text-xl font-black mb-2">AI Summary</h3>
            <p className="text-lg font-semibold">{insights.summary}</p>
            <div className="mt-4 p-4 bg-white/50 rounded-xl border-2 border-dashed border-gray-400">
              <p className="font-bold text-[#FF9100]">💡 Funny Observation: {insights.funnyObservation}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Spending Bar Chart */}
            <div className="bg-white p-6 rounded-2xl cartoony-shadow">
              <h3 className="text-2xl font-black mb-6">Daily Spending</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontFamily: 'var(--font-nunito)', fontWeight: 'bold'}} />
                    <YAxis tick={{fontFamily: 'var(--font-nunito)', fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '12px', border: '2px solid #000', fontWeight: 'bold', fontFamily: 'var(--font-nunito)'}} />
                    <Bar dataKey="total" fill="#2979FF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Categories Pie Chart */}
            <div className="bg-white p-6 rounded-2xl cartoony-shadow">
              <h3 className="text-2xl font-black mb-6">Where it went</h3>
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insights.topCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="total"
                      nameKey="category"
                    >
                      {insights.topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px', border: '2px solid #000', fontWeight: 'bold', fontFamily: 'var(--font-nunito)'}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="ml-4 flex flex-col gap-2 max-h-72 overflow-y-auto w-1/2">
                  {insights.topCategories.map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-black" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                      <span className="font-bold flex-1 truncate">{cat.category}</span>
                      <span className="font-black text-sm">${cat.total.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Largest Expenses */}
          <div className="bg-white p-6 rounded-2xl cartoony-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black">Largest Expenses</h3>
              <button onClick={clearData} className="flex items-center gap-2 text-sm font-bold bg-[#FCE4EC] text-[#F50057] px-4 py-2 rounded-lg cartoony-shadow-sm hover:bg-[#F8BBD0]">
                <RefreshCw size={16} /> Start Over
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {insights.largestExpenses.map((expense, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-xl border-2 border-[#E2E8F0] hover:border-black transition-colors">
                  <div className="flex flex-col">
                    <span className="font-black text-lg">{expense.description}</span>
                    <span className="text-gray-500 font-bold text-sm">{expense.date} • {expense.category}</span>
                  </div>
                  <span className="text-2xl font-black text-[#F50057]">
                    ${expense.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl cartoony-shadow max-w-md w-full relative">
            <h2 className="text-3xl font-black mb-2">Settings</h2>
            <p className="font-bold text-gray-500 mb-6">Set your Gemini API key to power the analysis.</p>
            
            <div className="flex flex-col gap-2 mb-6">
              <label className="font-bold">Gemini API Key</label>
              <input 
                type="password"
                value={tempKey}
                onChange={e => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-4 border-2 border-black rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-[#E3F2FD]"
              />
              <p className="text-sm font-bold text-gray-500 mt-2">
                Your key is stored securely in your browser's local storage and never sent to our servers.
              </p>
            </div>

            <div className="flex justify-end gap-4">
              {apiKey && (
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 font-bold rounded-xl hover:bg-gray-100 border-2 border-transparent"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={saveApiKey}
                disabled={!tempKey}
                className="px-6 py-3 bg-[#00E676] text-black font-black rounded-xl cartoony-shadow hover:bg-[#00C853] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
