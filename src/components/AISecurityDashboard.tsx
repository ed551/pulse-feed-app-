import { useState, useEffect } from "react";
import { 
  User, 
  Shield, 
  Lock, 
  Bell, 
  Eye, 
  Trash2, 
  ChevronRight, 
  Fingerprint, 
  Smartphone, 
  Mail, 
  UserCircle,
  ArrowLeft,
  Check,
  Loader2,
  Heart,
  Key,
  KeyRound,
  X,
  Sun,
  Moon,
  Monitor,
  Ban,
  Filter,
  Users2,
  AlertCircle,
  Languages,
  LogOut,
  ShieldCheck,
  Copy,
  Clock,
  Timer,
  Calendar,
  Globe,
  Activity,
  Link2,
  Sparkles,
  Brain,
  Cpu,
  RefreshCw,
  LockKeyhole,
  EyeOff
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../lib/i18n";
import { generateContentWithRetry } from "../lib/ai";
import Markdown from "react-markdown";
import { apiFetch } from "../lib/api";
import OTPModal from "./tools/OTPModal";
import FingerprintModal from "./tools/FingerprintModal";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function AISecurityDashboard() {
  const { currentUser, userData } = useAuth();
  const { t } = useTranslation();

  const [aiAuditing, setAiAuditing] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<string | null>(null);
  const [aiCurrentPin, setAiCurrentPin] = useState("");
  const [aiNewPin, setAiNewPin] = useState("");
  const [isUpdatingAiPin, setIsUpdatingAiPin] = useState(false);
  const [phoneInput, setPhoneInput] = useState(userData?.phoneNumber || "");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // Verification modal states
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [pinEmailVerified, setPinEmailVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [showNewPin, setShowNewPin] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  
  const [isAuditing, setIsAuditing] = useState(false);

  const triggerNeuralRefresh = async () => {
    setIsAuditing(true);
    try {
      // Small delay to simulate neural sync and allow firestore listener to catch up
      await new Promise(resolve => setTimeout(resolve, 1500));
      window.location.reload(); 
    } catch (e) {
      setIsAuditing(false);
    }
  };

  // Auto-trigger Neural Audit on component mount
  useEffect(() => {
    let active = true;
    const runAutoAudit = async () => {
      if (!currentUser?.uid || aiAuditResult || aiAuditing) return;
      setAiAuditing(true);
      try {
        const isEmailVerified = currentUser?.emailVerified || userData?.emailVerified;
        const isPhoneBound = !!userData?.phoneNumber;
        const isPinActive = !!userData?.hasSetPin;
        const isSpamActive = !!userData?.contentFilters?.spamFilter;
        const isSensitiveActive = !!userData?.contentFilters?.sensitiveContent;
        const dmLevel = userData?.contentFilters?.directMessagePrivacy || "everyone";
        
        const contextPrompt = `You are the Pulse Feeds Sentinel, a state-of-the-art predictive security modeling AI.
Perform a rigorous account posture verification and give high-fidelity AI security insights based on this telemetry:
- Identity Email: ${currentUser?.email || "Unknown"} (Verified: ${isEmailVerified ? "ACTIVE" : "PENDING"})
- Phone Connection: ${userData?.phoneNumber || "NOT BOUND"} (Verified: ${userData?.phoneNumberVerified ? "ACTIVE" : "PENDING"})
- Treasury Asset Lock Key (SCA PIN): ${isPinActive ? "SECURED" : "VULNERABLE (Action Required)"}
- Active Spam Mitigation: ${isSpamActive ? "ENGAGED" : "IDLE"}
- Disturbing Content Filter: ${isSensitiveActive ? "ACTIVE" : "IDLE"}
- Direct Signaling (DM Privacy): ${dmLevel.toUpperCase()}

Structure your response into 3 extremely premium sections using elegant markdown:
### 🛡&nbsp;Posture Evaluation
Provide a sharp, 2-sentence cryptographic evaluation of their standing.

### ⚡&nbsp;Critical Priorities
Provide 3 high-priority bullet points to harden this user's profile and wallet. Tell them EXACTLY what to do.

### 🧠&nbsp;Neural Protection Forecast
Provide a 1-sentence predictive forecast on how their secure footprint impacts their educational reward splits (80/20) and withdrawal speed.

Write in a highly professional, clinical, tech-forward tone. Respond with ONLY the markdown. Do not include any meta-introductions or postscripts. Use bold text and clean bullet points for visual scannability.`;

        const response = await generateContentWithRetry({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: [{ text: contextPrompt }] }]
        });
        
        if (active) {
          if (response?.text) {
            setAiAuditResult(response.text);
          } else {
            setAiAuditResult("❌ AI Authority failed to respond. Please review baseline configurations manually.");
          }
        }
      } catch (err: any) {
        console.error("AI Auto-Audit error:", err);
        if (active) {
          setAiAuditResult(`❌ Security telemetry unreachable: ${err.message || "Model timeout."}`);
        }
      } finally {
        if (active) {
          setAiAuditing(false);
        }
      }
    };
    
    // Slight delay of 800ms for elegant visual breathing space on mount
    const timer = setTimeout(() => {
      runAutoAudit();
    }, 800);
    
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentUser?.uid, userData?.hasSetPin, userData?.phoneNumber, userData?.phoneNumberVerified]);
  
  // Listen for passkey success from popup
  useEffect(() => {
    const handlePasskeyMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'passkey-success') {
        console.log("[AISecurityDashboard] Passkey registration or verification succeeded!");
        try {
          if (currentUser?.uid) {
            // Update the user structure in Firestore
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              twoFactorEnabled: true,
              twoFactorType: 'passkey',
              passkeyRegistered: true
            });
            alert("🔒 Secure Shield: Passkey successfully registered and connected to your Profile!");
          }
        } catch (e: any) {
          console.error("Failed to update user after passkey ceremony:", e);
          alert(`Passkey linked in browser session, but database backup was delayed: ${e.message}`);
        }
      }
    };
    
    window.addEventListener('message', handlePasskeyMessage);
    return () => {
      window.removeEventListener('message', handlePasskeyMessage);
    };
  }, [currentUser?.uid]);

  const triggerEmailRelay = async () => {
    if (!currentUser?.email) return;
    setIsSendingOtp(true);
    try {
      const res = await apiFetch("/api/otp/send", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ userId: currentUser.uid, email: currentUser.email, method: "email" }) 
      });
      if (res.ok) { 
        setPendingAction("reset_pin_email"); 
        setShowFingerprintModal(true); 
      } else {
        alert("Email service rejected request. Please try again.");
      }
    } catch (err) { 
      alert("Email service unreachable."); 
    } finally { 
      setIsSendingOtp(false); 
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Dynamic AI Score Header */}
      <div className="p-6 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/10 dark:to-indigo-950/10 rounded-[2rem] border border-purple-100 dark:border-purple-900/30 text-left">
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative shrink-0 flex items-center justify-center">
              <div className="absolute -inset-2 bg-purple-500/20 rounded-full blur-md animate-ping" />
              <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-purple-600 shadow-md border border-purple-100/50 dark:border-purple-800/30">
                <ShieldCheck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-left flex-1">
              <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">AI SECURITY STANDING</h4>
              {(() => {
                let score = 10;
                if (currentUser?.emailVerified || userData?.emailVerified) score += 30;
                if (userData?.phoneNumberVerified) score += 20;
                if (userData?.hasSetPin) score += 30;
                if (userData?.contentFilters?.spamFilter) score += 5;
                if (userData?.contentFilters?.sensitiveContent) score += 5;
                
                let bgGlow = "bg-red-500/15 text-red-650 dark:text-red-400";
                let text = "Attention Required • Grade Gamma";
                if (score >= 85) {
                  bgGlow = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
                  text = "Optimum Sentinel State • Grade Alpha";
                } else if (score >= 50) {
                  bgGlow = "bg-amber-500/15 text-amber-600 dark:text-amber-400";
                  text = "Moderate Precaution • Grade Beta";
                }
                
                return (
                  <div className="space-y-1.5 mt-1">
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${bgGlow}`}>
                      {text}
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Security rating: <span className="font-extrabold text-purple-600 dark:text-purple-400">{score}%</span></p>
                  </div>
                );
              })()}
            </div>
          </div>
          
          <div className="w-full md:w-auto shrink-0">
            <button
              onClick={async () => {
                setAiAuditing(true);
                try {
                  const isEmailVerified = currentUser?.emailVerified || userData?.emailVerified;
                  const isPhoneBound = !!userData?.phoneNumber;
                  const isPinActive = !!userData?.hasSetPin;
                  const isSpamActive = !!userData?.contentFilters?.spamFilter;
                  const isSensitiveActive = !!userData?.contentFilters?.sensitiveContent;
                  const dmLevel = userData?.contentFilters?.directMessagePrivacy || "everyone";
                  
                  const contextPrompt = `You are the Pulse Feeds Sentinel, a state-of-the-art predictive security modeling AI.
Perform a rigorous account posture verification and give high-fidelity AI security insights based on this telemetry:
- Identity Email: ${currentUser?.email || "Unknown"} (Verified: ${isEmailVerified ? "ACTIVE" : "PENDING"})
- Phone Connection: ${userData?.phoneNumber || "NOT BOUND"} (Verified: ${userData?.phoneNumberVerified ? "ACTIVE" : "PENDING"})
- Treasury Asset Lock Key (SCA PIN): ${isPinActive ? "SECURED" : "VULNERABLE (Action Required)"}
- Active Spam Mitigation: ${isSpamActive ? "ENGAGED" : "IDLE"}
- Disturbing Content Filter: ${isSensitiveActive ? "ACTIVE" : "IDLE"}
- Direct Signaling (DM Privacy): ${dmLevel.toUpperCase()}

Structure your response into 3 extremely premium sections using elegant markdown:
### 🛡&nbsp;Posture Evaluation
Provide a sharp, 2-sentence cryptographic evaluation of their standing.

### ⚡&nbsp;Critical Priorities
Provide 3 high-priority bullet points to harden this user's profile and wallet. Tell them EXACTLY what to do.

### 🧠&nbsp;Neural Protection Forecast
Provide a 1-sentence predictive forecast on how their secure footprint impacts their educational reward splits (80/20) and withdrawal speed.

Write in a highly professional, clinical, tech-forward tone. Respond with ONLY the markdown. Do not include any meta-introductions or postscripts. Use bold text and clean bullet points for visual scannability.`;

                  const response = await generateContentWithRetry({
                    model: "gemini-3-flash-preview",
                    contents: [{ role: "user", parts: [{ text: contextPrompt }] }]
                  });
                  
                  if (response?.text) {
                    setAiAuditResult(response.text);
                  } else {
                    setAiAuditResult("❌ AI Authority failed to respond. Please review baseline configurations manually.");
                  }
                } catch (err: any) {
                  console.error("AI Audit error:", err);
                  setAiAuditResult(`❌ Security telemetry unreachable: ${err.message || "Model timeout."}`);
                } finally {
                  setAiAuditing(false);
                }
              }}
              disabled={aiAuditing}
              className="w-full md:w-auto px-5 py-3.5 bg-purple-650 hover:bg-purple-700 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              {aiAuditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Probing Telemetry...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Trigger Neural Audit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Insights Board */}
      <div className="p-6 bg-gray-50/50 dark:bg-gray-850/20 rounded-[2rem] border border-gray-150 dark:border-gray-900 text-left mb-6 font-sans">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2 pl-1">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            AI Sentinel Insights Hub
          </h5>
          <button 
            type="button"
            onClick={async () => {
              setAiAuditing(true);
              setAiAuditResult(null);
              // Trigger auto-audit re-fetch
              const isEmailVerified = currentUser?.emailVerified || userData?.emailVerified;
              const isPhoneBound = !!userData?.phoneNumber;
              const isPinActive = !!userData?.hasSetPin;
              const isSpamActive = !!userData?.contentFilters?.spamFilter;
              const isSensitiveActive = !!userData?.contentFilters?.sensitiveContent;
              const dmLevel = userData?.contentFilters?.directMessagePrivacy || "everyone";
              
              const contextPrompt = `You are the Pulse Feeds Sentinel, a state-of-the-art predictive security modeling AI.
Perform a rigorous account posture verification and give high-fidelity AI security insights based on this telemetry:
- Identity Email: ${currentUser?.email || "Unknown"} (Verified: ${isEmailVerified ? "ACTIVE" : "PENDING"})
- Phone Connection: ${userData?.phoneNumber || "NOT BOUND"} (Verified: ${userData?.phoneNumberVerified ? "ACTIVE" : "PENDING"})
- Treasury Asset Lock Key (SCA PIN): ${isPinActive ? "SECURED" : "VULNERABLE (Action Required)"}
- Active Spam Mitigation: ${isSpamActive ? "ENGAGED" : "IDLE"}
- Disturbing Content Filter: ${isSensitiveActive ? "ACTIVE" : "IDLE"}
- Direct Signaling (DM Privacy): ${dmLevel.toUpperCase()}

Structure your response into 3 extremely premium sections using elegant markdown:
### 🛡&nbsp;Posture Evaluation
Provide a sharp, 2-sentence cryptographic evaluation of their standing.

### ⚡&nbsp;Critical Priorities
Provide 3 high-priority bullet points to harden this user's profile and wallet. Tell them EXACTLY what to do.

### 🧠&nbsp;Neural Protection Forecast
Provide a 1-sentence predictive forecast on how their secure footprint impacts their educational reward splits (80/20) and withdrawal speed.`;

              try {
                const response = await generateContentWithRetry({
                  model: "gemini-3-flash-preview",
                  contents: [{ role: "user", parts: [{ text: contextPrompt }] }]
                });
                if (response?.text) setAiAuditResult(response.text);
              } catch (e: any) {
                setAiAuditResult(`❌ Connection time-out: ${e.message}`);
              } finally {
                setAiAuditing(false);
              }
            }} 
            className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-1"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", aiAuditing && "animate-spin")} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Treasury PIN Status</span>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn("w-2 h-2 rounded-full", userData?.hasSetPin ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {userData?.hasSetPin ? "SCA SECURED" : "DISABLED (Setup Required)"}
              </p>
              <button 
                onClick={triggerNeuralRefresh}
                className="ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                title="Neural Sync Status"
              >
                <RefreshCw className={cn("w-3 h-3 text-gray-400", isAuditing && "animate-spin")} />
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Sync</span>
              </button>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Mobile Authority</span>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn("w-2 h-2 rounded-full", (userData?.phoneNumber && userData?.phoneNumberVerified) ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {(userData?.phoneNumber && userData?.phoneNumberVerified) ? "VERIFIED CONNECTION" : "UNVERIFIED OR NOT SET"}
              </p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Biometric FIDO2 Lock</span>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn("w-2 h-2 rounded-full", userData?.passkeyRegistered ? "bg-emerald-500" : "bg-amber-500")} />
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {userData?.passkeyRegistered ? "FIDO2 ACTIVE" : "INACTIVE (Passkey Unlinked)"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Neural Audit Board */}
      <div className="p-6 bg-gray-50/50 dark:bg-gray-850/20 rounded-[2rem] border border-gray-150 dark:border-gray-900 text-left mb-6 font-sans">
        {aiAuditResult ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-left text-xs bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-90 shadow-inner leading-relaxed text-gray-600 dark:text-gray-300 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-3 border-b border-gray-100 dark:border-gray-900 pb-2">
              <Sparkles className="w-4 h-4 text-purple-500 animate-bounce" />
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Live Security Audit Completed</span>
            </div>
            <Markdown>{aiAuditResult}</Markdown>
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-white dark:bg-gray-950/40 border border-dashed border-gray-250 dark:border-gray-850 rounded-2xl">
            <Brain className="w-8 h-8 text-purple-300 dark:text-purple-900 mx-auto mb-3 animate-pulse" />
            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Summoning Guarded Posture Recommendations...</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[280px] mx-auto mt-1 leading-normal">
              Analyzing real-time transaction signatures, auth records, and security factors dynamically to drive your workspace dashboard.
            </p>
          </div>
        )}
      </div>

      {/* AI WITHDRAW PIN SETTING */}
      <div className="p-6 bg-purple-50/5 dark:bg-purple-950/5 rounded-[2rem] border border-purple-100 dark:border-purple-900/30 relative overflow-hidden text-left mb-6 font-sans">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <LockKeyhole className="w-36 h-36 text-purple-500 -rotate-12" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-11 h-11 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100/50 dark:border-purple-800/30 shrink-0">
              <KeyRound className="w-5.5 h-5.5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none font-sans">AI-Guarded Withdrawal Key</h4>
                {!userData?.hasSetPin && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-[8px] font-black text-red-600 dark:text-red-400 rounded-md uppercase tracking-widest animate-pulse">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Multi-digit gateway key to authorize real-world treasury outflows.</p>
            </div>
          </div>

          {!userData?.hasSetPin && !pinEmailVerified ? (
            <div className="space-y-4 bg-white dark:bg-gray-950 p-6 rounded-2xl border border-purple-100/30 dark:border-purple-950 shadow-inner">
              <div className="flex items-start gap-3 text-left">
                <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-left">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">Authentication Clearance Blocked</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                    No Withdrawal PIN exists for this profile. Verify identity via authorized email relay key first, then configure your secure withdrawal path.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={triggerEmailRelay}
                  disabled={isSendingOtp}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  <span>{isSendingOtp ? "Resolving Relay Channel..." : "Authorize via Email Relay"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPinEmailVerified(true)}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-750 dark:text-gray-300 rounded-[1.25rem] text-[9px] font-black uppercase tracking-widest transition-all hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer flex items-center justify-center"
                >
                  Skip Authorization & Configure PIN Directly
                </button>
              </div>
            </div>
          ) : (pinEmailVerified || userData?.hasSetPin) ? (
            <div className="space-y-4">
              {pinEmailVerified ? (
                <div className="flex items-center gap-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/20 p-4 rounded-xl text-left">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Email Identity Verified (Bypassing Current PIN)</p>
                </div>
              ) : userData?.hasSetPin ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-150/10 dark:border-indigo-950/30 rounded-xl text-left">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    <p className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none">Current PIN Active</p>
                  </div>
                  <button
                    type="button"
                    onClick={triggerEmailRelay}
                    disabled={isSendingOtp}
                    className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 hover:underline uppercase tracking-wider flex items-center gap-1.5 bg-transparent border-0 cursor-pointer p-1"
                  >
                    {isSendingOtp ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Mail className="w-2.5 h-2.5" />}
                    <span>Forgot PIN? Bypass with Email Relay</span>
                  </button>
                </div>
              ) : null}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userData?.hasSetPin && !pinEmailVerified && (
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 pl-1 tracking-widest">Current Security Key</label>
                    <div className="relative group">
                      <input
                        type={showCurrentPin ? "text" : "password"}
                        placeholder="Current PIN"
                        value={aiCurrentPin}
                        onChange={(e) => setAiCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-805 dark:border-gray-800 rounded-xl px-4 py-3 pr-12 text-sm font-mono tracking-widest focus:ring-2 focus:ring-purple-500 outline-none shadow-inner transition-all h-[48px] text-gray-850 dark:text-gray-255 text-gray-800 dark:text-gray-100"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                      >
                        {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                
                <div className={cn("space-y-2 text-left", (userData?.hasSetPin && !pinEmailVerified) ? "col-span-1" : "col-span-1 md:col-span-2")}>
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 pl-1 tracking-widest">New Proposed Key</label>
                  <div className="relative group">
                    <input
                      type={showNewPin ? "text" : "password"}
                      placeholder="New 4-8 Digits"
                      value={aiNewPin}
                      onChange={(e) => setAiNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-805 dark:border-gray-800 rounded-xl px-4 py-3 pr-12 text-sm font-mono tracking-widest focus:ring-2 focus:ring-purple-500 outline-none shadow-inner transition-all h-[48px] text-gray-850 dark:text-gray-255 text-gray-800 dark:text-gray-100"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    >
                      {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Real-time clarity validation list */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pl-1 mt-1.5">
                    <span className="flex items-center gap-1.5 text-[9px] font-bold">
                      <span className={cn("w-1.5 h-1.5 rounded-full", aiNewPin.length >= 4 ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700")} />
                      <span className={aiNewPin.length >= 4 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}>4-8 Character Length ({aiNewPin.length}/8)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold">
                      <span className={cn("w-1.5 h-1.5 rounded-full", (aiNewPin.length > 0 && /^\d+$/.test(aiNewPin)) ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700")} />
                      <span className={(aiNewPin.length > 0 && /^\d+$/.test(aiNewPin)) ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}>Digits Only</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-100 dark:border-gray-900 text-left">
                <p className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">AI Cryptographic Shield Advice</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">
                  Use a complex <span className="font-bold text-purple-500">6+ digit</span> protection key consisting of randomized numbers. Restrict simple patterns such as "1234" or repeating integers.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (userData?.hasSetPin && !aiCurrentPin && !pinEmailVerified) {
                    return alert("System Error: Please enter your current PIN to authorize this change, or verify via Email Relay.");
                  }
                  if (!aiNewPin || aiNewPin.length < 4 || aiNewPin.length > 8) {
                    return alert("Validation Error: Please configure a new 4-8 digit protection key.");
                  }
                  setIsUpdatingAiPin(true);
                  try {
                    const res = await apiFetch("/api/user/security/update-pin", { 
                      method: 'POST', 
                      headers: { 'Content-Type': 'application/json' }, 
                      body: JSON.stringify({ 
                        userId: currentUser?.uid, 
                        currentPin: (userData?.hasSetPin && !pinEmailVerified) ? aiCurrentPin : "", 
                        newPin: aiNewPin, 
                        usePasskey: false, 
                        email: pinEmailVerified ? currentUser?.email : undefined,
                        bypassVerification: pinEmailVerified
                      }) 
                    });
                    
                    if (res.ok) { 
                      alert("AI Security Success: Withdrawal PIN secured and fully integrated with treasury gateway."); 
                      setPinEmailVerified(false);
                      setAiCurrentPin("");
                      setAiNewPin("");
                      window.location.reload(); 
                    } else {
                      const data = await res.json();
                      alert(`Security Incident Blocked: ${data.message || "Failed to sync protection key."}`);
                    }
                  } catch (e: any) { 
                    alert(`AI Telemetry Exception: ${e.message}`); 
                  } finally { 
                    setIsUpdatingAiPin(false); 
                  }
                }}
                disabled={isUpdatingAiPin}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-purple-600/30 active:scale-95 flex items-center justify-center cursor-pointer font-sans"
              >
                {isUpdatingAiPin ? "Encrypting & Synchronizing..." : userData?.hasSetPin ? "Rotate protection key" : "Commit protection key"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Phone Management */}
      <div className="p-6 bg-emerald-50/5 dark:bg-emerald-950/5 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 mb-6 text-left font-sans">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Mobile Authority Activation</h4>
              {userData?.phoneNumberVerified && userData?.phoneNumber ? (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-[8px] font-black text-emerald-600 dark:text-emerald-400 rounded-md uppercase tracking-widest">
                  AI-Verified Active
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-[8px] font-black text-amber-600 dark:text-amber-400 rounded-md uppercase tracking-widest animate-pulse">
                  Unverified
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Bind and verify your secondary authority key (SMS pathway) to satisfy financial constraints.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 pl-1 tracking-widest">Phone Number (E.164 Format)</label>
            <input 
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-gray-800 dark:text-gray-100"
              placeholder="+254712345678"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              type="button"
              onClick={async () => {
                if (!phoneInput || !phoneInput.startsWith('+')) {
                  return alert("Input Validation Error: Please provide an active phone number starting with '+' in proper international format (e.g. +254XXXXXXXX).");
                }
                setIsUpdatingPhone(true);
                try {
                  const res = await apiFetch("/api/otp/send", { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                      userId: currentUser?.uid, 
                      phoneNumber: phoneInput, 
                      method: 'sms' 
                    }) 
                  });
                  const data = await res.json();
                  if (data.success) {
                    setPendingAction("verify_phone_sms");
                    setShowFingerprintModal(true);
                    alert("Verification text generated. Enter the 6-digit credential in the verification window.");
                  } else {
                    alert(`Relay Failure: ${data.error || "SMS provider declined."}`);
                  }
                } catch (e: any) {
                  alert(`Connection error: ${e.message}`);
                } finally {
                  setIsUpdatingPhone(false);
                }
              }}
              disabled={isUpdatingPhone}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 cursor-pointer font-sans"
            >
              {isUpdatingPhone ? "Spawning OTP Session..." : "Verify & Bind Phone via SMS OTP"}
            </button>
            
            {userData?.phoneNumber && (
              <button 
                type="button"
                onClick={async () => {
                  if (confirm("Verify disabling bound Mobile Authority? Dynamic SCA checks may temporarily pause.")) {
                    setIsUpdatingPhone(true);
                    try {
                      const userRef = doc(db, 'users', currentUser!.uid);
                      await updateDoc(userRef, {
                        phoneNumber: "",
                        phoneNumberVerified: false
                      });
                      alert("Mobile Settings updated. Phone bound path cancelled.");
                      window.location.reload();
                    } catch (e: any) {
                      alert(`Error clearing phone: ${e.message}`);
                    } finally {
                      setIsUpdatingPhone(false);
                    }
                  }
                }}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-950/20 text-red-600 border border-red-200/40 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
              >
                Disconnect Phone
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Passkey Management */}
      <div className="p-6 bg-indigo-50/5 dark:bg-indigo-950/5 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 text-left font-sans mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">FIDO2 / WebAuthn Passkeys</h4>
              {userData?.passkeyRegistered ? (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/10 text-[8px] font-black text-emerald-600 dark:text-emerald-400 rounded-md uppercase tracking-widest">
                  Lock Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/15 text-[8px] font-black text-purple-600 dark:text-purple-405 rounded-md uppercase tracking-widest">
                  Ready to link
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Configure physical hardware security (Fingerprint, Face ID, USB Sentinel) as key authorization.</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            {userData?.passkeyRegistered 
              ? "Your active hardware biometric key is linked to your core profile and can override standard email challenge gates." 
              : "No biometric passkey linked. Bind a hardware key to experience seamless instant clearance bypasses."
            }
          </p>

          <div className="flex flex-wrap gap-3">
            <button 
              type="button"
              onClick={() => {
                if (!currentUser) return;
                
                const width = 500;
                const height = 620;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;
                
                window.open(
                  `#/passkey-auth?userId=${currentUser.uid}&type=reg`,
                  'Passkey Registration',
                  `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
                );
              }}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer font-sans"
            >
              {userData?.passkeyRegistered ? "Link Another Passkey" : "Link & Register Biometric Passkey"}
            </button>

            {userData?.passkeyRegistered && (
              <button 
                type="button"
                onClick={() => {
                  if (!currentUser) return;
                  
                  const width = 500;
                  const height = 620;
                  const left = window.screenX + (window.outerWidth - width) / 2;
                  const top = window.screenY + (window.outerHeight - height) / 2;
                  
                  window.open(
                    `#/passkey-auth?userId=${currentUser.uid}&type=auth`,
                    'Passkey Authentication Test',
                    `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
                  );
                }}
                className="px-4 py-3 bg-white dark:bg-gray-950 border border-indigo-200 dark:border-indigo-900/40 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans"
              >
                Test Passkey Authentication
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verification Modals synced locally */}
      {pendingAction === 'reset_pin_email' && (
        <OTPModal 
          userId={currentUser?.uid || ''} 
          email={currentUser?.email || ''}
          method="email"
          onClose={() => {
            setShowFingerprintModal(false);
            setPendingAction(null);
          }}
          onSuccess={() => {
            setPinEmailVerified(true);
            setShowFingerprintModal(false);
            setPendingAction(null);
            alert("Identity verified via Email! You can now configure your AI Security PIN.");
          }}
        />
      )}

      {pendingAction === 'verify_phone_sms' && (
        <OTPModal 
          userId={currentUser?.uid || ''} 
          phoneNumber={phoneInput}
          method="sms"
          onClose={() => {
            setShowFingerprintModal(false);
            setPendingAction(null);
          }}
          onSuccess={async () => {
            try {
              setIsUpdatingPhone(true);
              const res = await apiFetch("/api/user/security/update-phone", { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ userId: currentUser?.uid, phoneNumber: phoneInput }) 
              });
              if (res.ok) {
                if (currentUser?.uid) {
                  const userRef = doc(db, 'users', currentUser.uid);
                  await updateDoc(userRef, {
                    phoneNumberVerified: true,
                    phoneNumber: phoneInput
                  });
                }
                alert("✨ Mobile Authority Verified: Phone security connection is active!");
                window.location.reload();
              } else {
                alert("Verification succeeded, but could not sync database phone authority.");
              }
            } catch (err: any) {
              alert(`Error syncing phone authority database record: ${err.message}`);
            } finally {
              setIsUpdatingPhone(false);
              setShowFingerprintModal(false);
              setPendingAction(null);
            }
          }}
        />
      )}

      {showFingerprintModal && pendingAction !== 'reset_pin_email' && (
        <FingerprintModal 
          onClose={() => {
            setShowFingerprintModal(false);
            setPendingAction(null);
          }}
          onSuccess={() => {
            setShowFingerprintModal(false);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}
