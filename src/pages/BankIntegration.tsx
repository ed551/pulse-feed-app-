import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  ArrowRightLeft, 
  Lock, 
  Code2, 
  ChevronRight, 
  Database, 
  Globe, 
  FileJson,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Terminal,
  Zap
} from 'lucide-react';

const BankingPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'disbursement' | 'revenue' | 'security'>('disbursement');
  const [testMode, setTestMode] = useState<'ift' | 'pesalink'>('ift');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const iftPayload = {
    MessageReference: "PULSE-IFT-001",
    Source: {
      AccountNumber: "011XXXXXXXXXXX",
      Amount: 5000.00,
      TransactionCurrency: "KES"
    },
    Destinations: [
      {
        Reference: "WDL-77283",
        AccountNumber: "01100XXXXXX100",
        Amount: 5000.00,
        TransactionCurrency: "KES",
        Narration: "Pulse Feeds Salary"
      }
    ]
  };

  const pesalinkPayload = {
    MessageReference: "PULSE-PSL-001",
    Source: {
      AccountNumber: "011XXXXXXXXXXX",
      Amount: 5000.00,
      TransactionCurrency: "KES"
    },
    Destinations: [
      {
        Reference: "WDL-77284",
        AccountNumber: "1234567890",
        BankCode: "01", // Example bank code
        Amount: 5000.00,
        TransactionCurrency: "KES",
        Narration: "Pulse Feeds Salary"
      }
    ]
  };

  const executeTest = async () => {
    setIsTestRunning(true);
    setTestResult(null);
    try {
      const payload = testMode === 'ift' ? iftPayload : pesalinkPayload;
      const response = await fetch('/api/bank/coop/disbursement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test_user',
          amount: 5000,
          accountNumber: payload.Destinations[0].AccountNumber,
          reference: payload.MessageReference,
          type: testMode
        })
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: "Connection Failed", details: error });
    } finally {
      setIsTestRunning(false);
    }
  };

  const revenuePayload = {
    userId: "user_123",
    totalAmount: 10.50,
    source: "education",
    reason: "Learn & Earn: Module 5 Completion"
  };

  const splitResult = {
    success: true,
    userAmount: 2.10, // 20%
    platformAmount: 8.40, // 80%
    pointsAdded: 210,
    split: "80/20"
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Banking & Integration <span className="text-indigo-600">Portal</span>
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Technical documentation and API payloads for commercial partners and banking regulators.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl mb-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'disbursement', label: 'Disbursement (Payouts)', icon: ArrowRightLeft },
              { id: 'revenue', label: 'Revenue Splitting', icon: Database },
              { id: 'security', label: 'Compliance & Security', icon: Lock }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl whitespace-nowrap transition-all duration-300 font-bold text-sm ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {activeTab === 'disbursement' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">
                        Co-op Bank Disbursement Protocol
                      </h2>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-bold uppercase">
                        <Globe className="w-3 h-3" />
                        Production Endpoint Ready
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[10px] text-slate-500">
                      POST /api/bank/coop/disbursement
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                    Pulse Feeds utilizes the <b>IFT (Internal Funds Transfer)</b> and <b>PESALINK</b> protocols for processing salary withdrawals. We have configured the following request structures for our outbound disbursement engine.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Payload Example */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest">
                          <FileJson className="w-4 h-4 text-indigo-600" />
                          Outbound Payload ({testMode.toUpperCase()})
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setTestMode('ift'); setTestResult(null); }}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${testMode === 'ift' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                          >IFT</button>
                          <button 
                            onClick={() => { setTestMode('pesalink'); setTestResult(null); }}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${testMode === 'pesalink' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                          >Pesalink</button>
                        </div>
                      </div>
                      
                      <div className="bg-slate-950 rounded-2xl p-6 font-mono text-[10px] text-slate-300 leading-relaxed overflow-x-auto min-h-[220px]">
                        <pre>{JSON.stringify(testMode === 'ift' ? iftPayload : pesalinkPayload, null, 2)}</pre>
                      </div>

                      <button 
                        onClick={executeTest}
                        disabled={isTestRunning}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                          isTestRunning 
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none'
                        }`}
                      >
                        {isTestRunning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            Executing Request...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Run Live Test Execution
                          </>
                        )}
                      </button>
                    </div>

                    {/* Response Terminal */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest">
                        <Terminal className="w-4 h-4 text-emerald-600" />
                        Response Output
                      </div>
                      <div className={`bg-slate-950 rounded-2xl p-6 font-mono text-[10px] leading-relaxed overflow-x-auto min-h-[300px] border-2 transition-all ${
                        testResult ? 'border-emerald-500/30' : 'border-slate-800'
                      }`}>
                        {testResult ? (
                          <motion.pre 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className="text-emerald-400"
                          >
                            {JSON.stringify(testResult, null, 2)}
                          </motion.pre>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-600 italic gap-3">
                            <ArrowRightLeft className="w-8 h-8 opacity-20" />
                            <span>Awaiting test execution...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-3xl p-8 text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white/20 rounded-2xl">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tighter">Compliance Notice</h3>
                      <p className="text-white/80 text-sm">All disbursements follow Central Bank of Kenya (CBK) reporting guidelines.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'revenue' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tighter">
                    Revenue Splitting Logic (Authoritative)
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                        <h4 className="font-black text-xs text-indigo-600 uppercase mb-4 tracking-widest">Education Model (80/20)</h4>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-600">Input Amount:</span>
                          <span className="text-sm font-black text-slate-900">$10.50</span>
                        </div>
                        <div className="flex justify-between items-center text-indigo-600">
                          <span className="text-sm font-bold">Platform Share:</span>
                          <span className="text-sm font-black">$8.40 (80%)</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600">
                          <span className="text-sm font-bold">User Salary:</span>
                          <span className="text-sm font-black">$2.10 (20%)</span>
                        </div>
                      </div>

                      <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <h4 className="font-black text-xs text-amber-600 uppercase mb-4 tracking-widest">Active Time / Ads (50/50)</h4>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-600">Input Amount:</span>
                          <span className="text-sm font-black text-slate-900">$10.50</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-600">
                          <span className="text-sm font-bold">Platform Share:</span>
                          <span className="text-sm font-black">$5.25 (50%)</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-600">
                          <span className="text-sm font-bold">User Salary:</span>
                          <span className="text-sm font-black">$5.25 (50%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest">
                        <ChevronRight className="w-4 h-4 text-indigo-600" />
                        Server-Side Processing Engine
                      </div>
                      <div className="bg-slate-950 rounded-2xl p-6 font-mono text-[10px] text-slate-400 overflow-x-auto">
                        <div className="text-indigo-400 mb-2">// Server Endpoint: /api/revenue/log</div>
                        <div className="text-emerald-400 mb-2">// Split Calculation Logic</div>
                        <pre>{JSON.stringify(revenuePayload, null, 2)}</pre>
                        <hr className="my-4 border-slate-800" />
                        <div className="text-amber-400 mb-2">// Response Payload</div>
                        <pre>{JSON.stringify(splitResult, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-8 uppercase tracking-tighter">
                  Security & Immutability Architecture
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      title: 'Role-Based Access',
                      desc: 'Only users with authenticated tokens can initiate disbursement calls.',
                      icon: Lock
                    },
                    {
                      title: 'Audit Immutability',
                      desc: 'The points_ledger is append-only. Adjusting balances requires full trail logging.',
                      icon: Database
                    },
                    {
                      title: 'Fraud Detection',
                      desc: 'Real-time velocity checks for outgoing disbursements to linked bank accounts.',
                      icon: ShieldCheck
                    }
                  ].map((feature, i) => (
                    <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <feature.icon className="w-8 h-8 text-indigo-600 mb-4" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        {feature.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
};

export default BankingPortal;
