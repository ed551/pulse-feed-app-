import React, { useEffect, useState, useRef } from "react";
import { ShieldAlert, Power, RefreshCw, UploadCloud, DownloadCloud, AlertTriangle, Fingerprint, CheckCircle, XCircle, Smartphone, KeyRound, Lock, Settings, Plus, Trash2 } from "lucide-react";
import { admin_logic, integrity_audit_engine, global_kill_switch } from "../lib/engines";
import { cn } from "../lib/utils";
import { getModerationSettings, saveModerationSettings, ModerationSettings } from "../services/moderationService";

type AuthState = 'phone_input' | 'phone_verify' | 'fingerprint' | 'verified';

export default function Moderation() {
  const [authState, setAuthState] = useState<AuthState>('phone_input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const [modSettings, setModSettings] = useState<ModerationSettings>(getModerationSettings());
  const [newRule, setNewRule] = useState("");

  const handleSaveSettings = () => {
    saveModerationSettings(modSettings);
    alert("AI Moderation Settings Saved!");
  };

  const addRule = () => {
    if (newRule.trim()) {
      setModSettings({
        ...modSettings,
        customRules: [...modSettings.customRules, newRule.trim()]
      });
      setNewRule("");
    }
  };

  const removeRule = (index: number) => {
    const updatedRules = [...modSettings.customRules];
    updatedRules.splice(index, 1);
    setModSettings({ ...modSettings, customRules: updatedRules });
  };

  useEffect(() => {
    if (authState === 'verified') {
      admin_logic();
      integrity_audit_engine();
      global_kill_switch();
    }
  }, [authState]);

  // Fingerprint logic
  useEffect(() => {
    if (isPressing) {
      progressInterval.current = setInterval(() => {
        setFingerprintProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval.current!);
            setTimeout(() => setAuthState('verified'), 300);
            return 100;
          }
          return prev + 2; // 50 ticks = ~1.5 seconds at 30ms
        });
      }, 30);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (fingerprintProgress < 100) {
        setFingerprintProgress(0);
      }
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPressing, fingerprintProgress]);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length > 5) {
      setAuthState('phone_verify');
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length >= 4) {
      setAuthState('fingerprint');
    }
  };

  const reports = [
    { id: 1, user: 'Spammer123', reason: 'Inappropriate content', status: 'pending' },
    { id: 2, user: 'FakeBot99', reason: 'Spam links', status: 'pending' },
    { id: 3, user: 'AngryUser', reason: 'Harassment', status: 'resolved' },
  ];

  if (authState !== 'verified') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-700 relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-600 to-blue-500"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Restricted Access</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mt-2 text-sm">
              Moderation requires multi-factor authentication.
            </p>
          </div>

          {authState === 'phone_input' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Smartphone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              >
                Send Verification Code
              </button>
            </form>
          )}

          {authState === 'phone_verify' && (
            <form onSubmit={handleCodeSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verification Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all tracking-widest text-center font-mono text-lg"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Code sent to {phoneNumber}</p>
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              >
                Verify Phone
              </button>
            </form>
          )}

          {authState === 'fingerprint' && (
            <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 py-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Final Step</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Press and hold to verify identity</p>
              </div>
              
              <div className="relative">
                {/* Progress Ring */}
                <svg className="absolute inset-0 w-32 h-32 -m-4 transform -rotate-90 pointer-events-none">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * fingerprintProgress) / 100}
                    className="text-purple-500 transition-all duration-75 ease-linear"
                  />
                </svg>

                <button
                  onMouseDown={() => setIsPressing(true)}
                  onMouseUp={() => setIsPressing(false)}
                  onMouseLeave={() => setIsPressing(false)}
                  onTouchStart={() => setIsPressing(true)}
                  onTouchEnd={() => setIsPressing(false)}
                  onContextMenu={(e) => e.preventDefault()}
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative z-10",
                    isPressing 
                      ? "bg-purple-100 dark:bg-purple-900/40 scale-95 shadow-inner" 
                      : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg"
                  )}
                >
                  <Fingerprint 
                    className={cn(
                      "w-12 h-12 transition-colors duration-300",
                      isPressing ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500",
                      fingerprintProgress === 100 && "text-green-500 dark:text-green-400"
                    )} 
                  />
                </button>
              </div>
              
              <div className="h-4">
                {fingerprintProgress > 0 && fingerprintProgress < 100 && (
                  <span className="text-xs font-mono text-purple-600 dark:text-purple-400 animate-pulse">
                    Scanning... {fingerprintProgress}%
                  </span>
                )}
                {fingerprintProgress === 100 && (
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">
                    Identity Verified
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-600 flex items-center">
          <ShieldAlert className="w-8 h-8 mr-3 text-red-500" />
          Admin Dashboard
        </h1>
        <div className="flex items-center space-x-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-full font-bold text-sm animate-pulse">
          <Fingerprint className="w-4 h-4 mr-2" />
          AI at Work
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Settings className="w-5 h-5 mr-2 text-purple-500" />
            AI Moderation Settings (Gemini)
          </h2>
          <button 
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Settings
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sensitivity Level</label>
            <div className="flex space-x-4">
              {['low', 'medium', 'high'].map((level) => (
                <label key={level} className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="sensitivity" 
                    value={level} 
                    checked={modSettings.sensitivity === level}
                    onChange={(e) => setModSettings({...modSettings, sensitivity: e.target.value as any})}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300 capitalize">{level}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Low: Lenient. Medium: Balanced. High: Strict.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Rules</label>
            <div className="space-y-2 mb-4">
              {modSettings.customRules.map((rule, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{rule}</span>
                  <button onClick={() => removeRule(idx)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRule()}
                placeholder="Add a new custom rule..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button 
                onClick={addRule}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reports Queue</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {reports.map((report) => (
            <div key={report.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-lg mb-1">{report.user}</div>
                <div className="text-gray-500 dark:text-gray-400">{report.reason}</div>
              </div>
              <div className="flex items-center space-x-2">
                {report.status === 'pending' ? (
                  <>
                    <button className="p-2 bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg transition-colors" title="Approve/Ignore">
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors" title="Ban/Delete">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-sm font-medium uppercase tracking-wider">Resolved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
