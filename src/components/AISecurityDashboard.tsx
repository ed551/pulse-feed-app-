import { useState } from "react";
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
  LockKeyhole
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../lib/i18n";
import { generateContentWithRetry } from "../lib/ai";
import Markdown from "react-markdown";
import { apiFetch } from "../lib/api";
import OTPModal from "./tools/OTPModal";
import FingerprintModal from "./tools/FingerprintModal";
import { cn } from "../lib/utils";

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
      <div className="p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-[2rem] border border-gray-100 dark:border-gray-800 text-left mb-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 pl-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            AI Sentinel Insights Hub
          </h5>
          <button onClick={() => { /* re-fetch logic */ }} className="text-gray-400 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="text-indigo-400">
            <Brain className="w-8 h-8" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">AI Security Advisor</h5>
            <p className="text-[10px] text-gray-400">Analysis: Your security posture is being reviewed.</p>
          </div>
        </div>
        
        {/* Real fetching logic would go here, updating state for insights */}
        <p className="text-gray-400 text-xs">Based on your activity, ensure 2FA is active and your PIN meets complexity requirements.</p>
      </div>

      {/* Manual Neural Audit Board */}
      <div className="p-6 bg-gray-50/50 dark:bg-gray-800/30 rounded-[2rem] border border-gray-100 dark:border-gray-800 text-left">
        {aiAuditResult ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-left text-xs bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-inner leading-relaxed text-gray-600 dark:text-gray-300 animate-in fade-in duration-300">
            <Markdown>{aiAuditResult}</Markdown>
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-white dark:bg-gray-950/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <Brain className="w-8 h-8 text-purple-300 dark:text-purple-900 mx-auto mb-3 animate-pulse" />
            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Telemetry Engine Ready</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[280px] mx-auto mt-1 leading-normal">
              Your local security and privacy metrics are clean. Click **Trigger Neural Audit** to summon deep diagnostic warnings.
            </p>
          </div>
        )}
      </div>

      {/* AI WITHDRAW PIN SETTING */}
      <div className="p-6 bg-purple-50/5 dark:bg-purple-950/5 rounded-[2rem] border border-purple-100 dark:border-purple-900/30 relative overflow-hidden text-left mb-6">
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
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">AI-Guarded Withdrawal Key</h4>
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
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">First-Time Security Boot</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                    No Withdrawal PIN exists for this profile. You must verify identity via authorized email key relay before committing a path.
                  </p>
                </div>
              </div>
              
              <button
                onClick={triggerEmailRelay}
                disabled={isSendingOtp}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                {isSendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                <span>{isSendingOtp ? "Sending token..." : "Authorize via Email Relay"}</span>
              </button>
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
                        type="password"
                        placeholder="Current PIN"
                        value={aiCurrentPin}
                        onChange={(e) => setAiCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-805 dark:border-gray-800 rounded-xl px-5 py-3 text-sm font-mono tracking-widest focus:ring-2 focus:ring-purple-500 outline-none shadow-inner transition-all h-[48px]"
                      />
                      <Lock className="w-4 h-4 text-gray-300 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                )}
                
                <div className={cn("space-y-2 text-left", (userData?.hasSetPin && !pinEmailVerified) ? "col-span-1" : "col-span-1 md:col-span-2")}>
                  <label className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 pl-1 tracking-widest">New Proposed Key</label>
                  <div className="relative group">
                    <input
                      type="password"
                      placeholder="New 4-8 Digits"
                      value={aiNewPin}
                      onChange={(e) => setAiNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-805 dark:border-gray-800 rounded-xl px-5 py-3 text-sm font-mono tracking-widest focus:ring-2 focus:ring-purple-500 outline-none shadow-inner transition-all h-[48px]"
                    />
                    <Key className="w-4 h-4 text-gray-300 absolute right-4 top-1/2 -translate-y-1/2" />
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
                        email: pinEmailVerified ? currentUser?.email : undefined 
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
      <div className="p-6 bg-emerald-50/5 dark:bg-emerald-950/5 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 mb-6">
        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase mb-4">Mobile Authority Number</h4>
         <input 
          type="text"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm"
          placeholder="+254..."
        />
        <button 
           onClick={async () => {
             setIsUpdatingPhone(true);
             try {
                const res = await apiFetch("/api/user/security/update-phone", { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ userId: currentUser?.uid, phoneNumber: phoneInput }) 
                });
                if (res.ok) alert("Phone number updated successfully.");
                else alert("Failed to update phone number.");
             } catch {
                alert("Error updating phone.");
             } finally {
                setIsUpdatingPhone(false);
             }
           }}
           disabled={isUpdatingPhone}
           className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
        >
          {isUpdatingPhone ? "Updating..." : "Update Phone Number"}
        </button>
      </div>

      {/* Passkey Management */}
      <div className="p-6 bg-indigo-50/5 dark:bg-indigo-950/5 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
         <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase mb-4">Passkey Verification</h4>
         <p className="text-xs text-gray-500 mb-4">{userData?.passkeyRegistered ? "Passkey is active." : "Register a passkey for secure authentication."}</p>
         {!userData?.passkeyRegistered && (
            <button 
                onClick={() => {
                   // This would trigger the same flow as Settings.handleRegisterPasskey
                   alert("Passkey registration requires navigation to Settings.");
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
            >
              Register Passkey
            </button>
         )}
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
