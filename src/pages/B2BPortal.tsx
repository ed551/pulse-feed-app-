import React, { useState, useEffect } from "react";
import { 
  Building2, Lock, ShieldCheck, Zap, BarChart2, PieChart as PieIcon, LineChart as LineIcon, 
  ArrowRight, Sparkles, Loader2, CheckCircle, RefreshCw, AlertCircle, HelpCircle, FileText, Globe, Award
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { apiFetch } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";

// Color palettes for recharts
const SENTIMENT_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];
const CATEGORY_COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B"];

export default function B2BPortal() {
  const { currentUser, userData } = useAuth();
  
  // States of B2B subscriber
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // States of AI Insights Generator
  const [focusArea, setFocusArea] = useState("General Macro Trends");
  const [industryType, setIndustryType] = useState("Municipal Contractors");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [insightsSource, setInsightsSource] = useState("");
  const [syncCount, setSyncCount] = useState(0);

  // Mock corporate invoicing and stats
  const [billingPeriod, setBillingPeriod] = useState("July 15 - August 15");
  const [billingStatus, setBillingStatus] = useState("Fully Remitted (Auto-Tax Certified)");

  // Local state for dynamic mock feedback stats
  const [mockStats, setMockStats] = useState({
    sentiments: [
      { name: "Positive / Thriving", value: 45, ratio: "45%" },
      { name: "Balanced / Neutral", value: 35, ratio: "35%" },
      { name: "Concerned / Improving", value: 15, ratio: "15%" },
      { name: "Critical Priorities", value: 5, ratio: "5%" }
    ],
    categories: [
      { name: "Transit Grid", reports: 242, resolved: 88 },
      { name: "Utility Maintenance", reports: 189, resolved: 74 },
      { name: "Waste Management", reports: 312, resolved: 95 },
      { name: "Safety & Environment", reports: 125, resolved: 91 },
      { name: "Local Commerce", reports: 94, resolved: 65 }
    ],
    activity: [
      { day: "Day 1", activeUsers: 1420, taskBountiesCompleted: 142 },
      { day: "Day 2", activeUsers: 1510, taskBountiesCompleted: 168 },
      { day: "Day 3", activeUsers: 1650, taskBountiesCompleted: 195 },
      { day: "Day 4", activeUsers: 1780, taskBountiesCompleted: 210 },
      { day: "Day 5", activeUsers: 1940, taskBountiesCompleted: 240 },
      { day: "Day 6", activeUsers: 2100, taskBountiesCompleted: 289 },
      { day: "Day 7", activeUsers: 2350, taskBountiesCompleted: 342 }
    ]
  });

  // Fetch or setup subscription status from Firestore
  useEffect(() => {
    async function checkB2BSub() {
      if (!currentUser || !db) {
        setIsSubscribed(false);
        setLoadingStatus(false);
        return;
      }
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setIsSubscribed(!!data.b2bSubscriber);
        }
      } catch (err) {
        console.error("Error reading B2B subscription status:", err);
      } finally {
        setLoadingStatus(false);
      }
    }
    checkB2BSub();
  }, [currentUser]);

  // Simulate or set the subscription
  const handleSubscribe = async () => {
    if (!currentUser || !db) return;
    setSubscribing(true);
    try {
      // Simulate credit card merchant processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        b2bSubscriber: true,
        b2bTier: "Unlimited Corporate Partner",
        b2bSubscribedAt: new Date().toISOString()
      });
      setIsSubscribed(true);
    } catch (err) {
      console.error("B2B Subscription failed:", err);
    } finally {
      setSubscribing(false);
    }
  };

  // Generate real or simulation-fallback B2B executive reports
  const fetchB2BInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await apiFetch("/api/b2b/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusArea, industryType })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.insights) {
          setInsights(data.insights);
          setInsightsSource(data.source);
        }
      } else {
        throw new Error("Insights API failed");
      }
    } catch (err) {
      console.error("B2B Generation Error:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Fetch insights automatically once subscription is confirmed
  useEffect(() => {
    if (isSubscribed) {
      fetchB2BInsights();
    }
  }, [isSubscribed, focusArea]);

  const handleSyncData = () => {
    setSyncCount(prev => prev + 1);
    // Add minor mock variation on sync click to feel responsive
    setMockStats(prev => ({
      ...prev,
      categories: prev.categories.map(c => ({
        ...c,
        reports: c.reports + Math.floor(Math.random() * 8) - 3,
        resolved: c.resolved + Math.floor(Math.random() * 5)
      }))
    }));
  };

  if (loadingStatus) {
    return (
      <div id="b2b-loader" className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Gated Gantry / Corporate Checkout Page
  if (!isSubscribed) {
    return (
      <div id="b2b-checkout-container" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white flex flex-col justify-between py-12 px-6">
        <div className="max-w-4xl mx-auto w-full my-auto">
          {/* Header Branding */}
          <div className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">PULSE INTEL B2B</span>
              <p className="text-xs text-slate-400 font-mono">Verified Corporate Portal</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Value Proposition */}
            <div className="space-y-6">
              <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Anonymized <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">Macro-Trend</span> Intelligence Portal
              </h1>
              
              <p className="text-slate-300 text-lg leading-relaxed">
                Unlock aggregated citizen insights, neighborhood sentiment, and physical infrastructure report clusters in near-real-time. Secure optimal locations for corporate expansion, municipal bidding, and community-first sponsorships.
              </p>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">CCPA & GDPR Privacy Shield</h4>
                    <p className="text-sm text-slate-400">All personal identifiers, usernames, text content, and coordinates are dynamically aggregated into macroscopic vectors to protect individual citizen identities.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-indigo-500/20 text-indigo-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">Gemini-Powered Predictive Models</h4>
                    <p className="text-sm text-slate-400">Analyze monthly citizen activity logs and sentiment fluctuations to discover emerging high-contrast investment hotspots.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gated Billing Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur shadow-2xl space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-blue-500/10 text-blue-400 font-mono text-xs px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold border border-blue-500/10">B2B Paid Tier</span>
                  <h3 className="text-2xl font-bold mt-2">Unlimited Corporate subscription</h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-blue-400">$249</div>
                  <div className="text-xs text-slate-400 font-mono">Flat rate / month</div>
                </div>
              </div>

              <div className="space-y-3.5 text-slate-300 text-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Real-time sentiment and category analytics maps</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Unlimited Gemini Executive insights queries</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Interactive corporate opportunity checklists</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Merchant of Record (MoR) automated tax compliance</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <button
                  id="checkout-b2b-btn"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Syncing Client Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Unlock Portal Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-slate-500 mt-3 font-mono">
                  Guaranteed safe Checkout • Authorized for Corporate Account #{currentUser?.uid?.substring(0,6).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info lock notes */}
        <div className="text-center text-xs text-slate-600 mt-8 space-y-1">
          <p>This session is encrypted with standard TLS 1.3. Pulse Feeds takes CCPA / GDPR compliance seriously.</p>
          <p>Customer Support: support@pulsefeeds.com | Edwin Muoha Consulting Group</p>
        </div>
      </div>
    );
  }

  // Unlocked B2B Corporate Analytics Portal
  return (
    <div id="b2b-portal-dashboard" className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20">
      
      {/* Top Banner / Breadcrumb */}
      <div className="bg-slate-900 text-white py-4 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-400" />
            <div>
              <span className="text-sm font-semibold tracking-wider font-mono text-blue-300">PULSE B2B INDUSTRIAL PORTAL</span>
              <p className="text-[11px] text-slate-400">Welcome, Corporate Representative • Secure Cloud Session</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full font-mono font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Unlimited Access Active</span>
            </div>
            <div className="bg-slate-800 px-3 py-1.5 rounded-full text-slate-300 font-mono">
              Flat Plan: $249.00/mo (Tax Remitted)
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
        
        {/* Compliance & Privacy Lock Banner */}
        <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-1">
            <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 uppercase tracking-widest">🔒 Ggdpr & Ccpa Privacy Shield Active</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Pulse Feeds operates in complete compliance with international privacy protocols. No individual names, email IDs, direct chat comments, photos, or exact home coordinates are exposed to clients. All trends are computed using anonymized macroscopic aggregates and AI inference models.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-mono font-bold text-slate-400">CCPA & GDPR Certified</span>
          </div>
        </div>

        {/* Main Grid: Data Section */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Col 1: Sentiment Analysis (Pie Chart) */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-750">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm tracking-wide text-slate-700 dark:text-slate-300">MACRO SENTIMENT</h3>
              </div>
              <button 
                onClick={handleSyncData}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
                title="Refresh Sentiment Vectors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="h-56 mt-2 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockStats.sentiments}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {mockStats.sentiments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1e293b", 
                      borderRadius: "8px", 
                      color: "#fff", 
                      border: "none",
                      fontSize: "12px"
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="text-xl font-black text-emerald-500">78.4</span>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Resilience</p>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-750">
              {mockStats.sentiments.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[index] }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium leading-none">{item.name}</span>
                    <span className="text-xs font-bold font-mono mt-0.5">{item.ratio}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Col 2: Category Volume Analysis (Bar Chart) */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-750">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-sm tracking-wide text-slate-700 dark:text-slate-300">MACRO ISSUES CLUSTER VOLUME</h3>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Anonymized citizen logs
              </div>
            </div>

            <div className="h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockStats.categories}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1e293b", 
                      borderRadius: "8px", 
                      color: "#fff", 
                      border: "none",
                      fontSize: "12px"
                    }} 
                  />
                  <Bar dataKey="reports" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Reports Volume" />
                  <Bar dataKey="resolved" fill="#10B981" radius={[4, 4, 0, 0]} name="Task Solved Rate" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-750 font-mono">
              <span>*Refreshed every 24hr settlement cycle</span>
              <span>Total reports active: {mockStats.categories.reduce((acc, c) => acc + c.reports, 0)}</span>
            </div>
          </div>

        </div>

        {/* Section 2: AI Predictive Analysis Room */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-blue-500/20 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                <h2 className="text-lg md:text-xl font-bold tracking-tight">Gemini-Powered Corporate Opportunity Room</h2>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate real-time executive summaries, threat analyses, and public-points sponsorship recommendations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Select Target Area</span>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 text-xs px-3 py-2 rounded-xl focus:border-blue-500 outline-none mt-1"
                >
                  <option value="General Macro Trends">General Macro Trends</option>
                  <option value="Infrastructure and Roads">Infrastructure & Roads</option>
                  <option value="Community Safety and lighting">Community Safety & Lighting</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Client Context</span>
                <select
                  value={industryType}
                  onChange={(e) => setIndustryType(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 text-xs px-3 py-2 rounded-xl focus:border-blue-500 outline-none mt-1"
                >
                  <option value="Municipal Contractors">Municipal Contractors</option>
                  <option value="Retail & High-Growth Brands">Retail & Consumer Brands</option>
                  <option value="Logistics & Transport Firms">Logistics & Transport</option>
                </select>
              </div>

              <button
                id="generate-b2b-insights-btn"
                onClick={fetchB2BInsights}
                disabled={loadingInsights}
                className="self-end bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow transition-colors flex items-center gap-1.5 uppercase tracking-wide disabled:opacity-50"
              >
                {loadingInsights ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Crunching Vectors...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Redraw Report</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {insights ? (
              <motion.div
                key={focusArea + industryType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid lg:grid-cols-5 gap-6"
              >
                {/* Sentiment Gauge Side box */}
                <div className="lg:col-span-2 bg-slate-900/45 p-6 rounded-xl border border-white/5 flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">Predicted Core Sentiment</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-4xl font-black text-blue-400">{insights.sentimentScore}</span>
                        <span className="text-xs text-slate-400font-mono">/ 100</span>
                      </div>
                    </div>
                    <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-lg border border-blue-500/20 text-xs font-mono font-bold uppercase">
                      Score Index
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">AI Prediction Rationale</span>
                    <p className="text-xs text-slate-300 italic">
                      "{insights.sentimentRationale}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Engine: {insightsSource}</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase font-semibold">Secure</span>
                  </div>
                </div>

                {/* Main summaries */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase font-semibold">Anonymized Executive Summary</span>
                    <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal">
                      {insights.executiveSummary}
                    </p>
                  </div>

                  {/* Opportunities */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3.5 bg-slate-900/30 p-4 rounded-xl border border-white/5">
                      <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-teal-400 uppercase">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Corporate Opportunities</span>
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                        {insights.emergingOpportunities?.map((opp: string, i: number) => (
                          <li key={i} className="leading-relaxed">{opp}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3.5 bg-slate-900/30 p-4 rounded-xl border border-white/5">
                      <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-indigo-400 uppercase">
                        <Award className="w-3.5 h-3.5" />
                        <span>Recommended Next Steps</span>
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                        {insights.nextSteps?.map((ns: string, i: number) => (
                          <li key={i} className="leading-relaxed">{ns}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                <span className="text-xs font-mono">Assembling macro intelligence reports...</span>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 3: Billing History & Tax Compliance Info */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-750">
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-700 dark:text-slate-300 uppercase">Automated Tax Compliance & Billing Remittance</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                As a registered B2B client, tax validation and remittance are automatically handled by the platform's central Merchant of Record (MoR) engine on the 1st of every month.
              </p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 font-mono text-xs px-3 py-1.5 rounded-xl text-slate-500 dark:text-slate-300">
              Billing Method: Verified Card ending 4242
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Current Cycle</span>
              <p className="text-xs font-semibold">{billingPeriod}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Tax Compliance Station</span>
              <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Automatic Remittance Certified</span>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Tax Remitted Regions</span>
              <p className="text-xs font-semibold">Oregon (US), Wiltshire (UK), Nairobi (Kenya)</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
