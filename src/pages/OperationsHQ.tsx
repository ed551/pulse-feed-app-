import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Shield, Activity, Lock, Globe, Server, 
  Terminal, AlertTriangle, CheckCircle2, CloudLightning,
  Fingerprint, Smartphone, Key, Database, ChevronRight,
  Monitor, Cpu, Zap, Radio
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { cn } from '../lib/utils';

export default function OperationsHQ() {
  const [activeWing, setActiveWing] = useState<'security' | 'compliance' | 'network' | 'vault'>('security');
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const { convert } = useCurrencyConverter();
  const [healthStatus, setHealthStatus] = useState<any>({
    apiStatus: 'nominal',
    vaultIntegrity: 'verified',
    fraudSignal: 'low',
    ipAlignment: 'synchronized'
  });

  useEffect(() => {
    if (!db) return;

    // Listen for system logs
    const q = query(collection(db, 'system_alerts'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSystemLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for health data
    const monRef = doc(db, 'system', 'monitoring');
    const unsubMon = onSnapshot(monRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setHealthStatus(prev => ({
          ...prev,
          apiStatus: data.safetyLocked ? 'locked' : 'nominal',
          ipAlignment: data.lastKnownIp === '35.214.40.75' ? 'synchronized' : 'drift_detected'
        }));
      }
    });

    return () => {
      unsubscribe();
      unsubMon();
    };
  }, []);

  const WingIcon = {
    security: Shield,
    compliance: Lock,
    network: Globe,
    vault: Building2
  }[activeWing];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-300 font-sans selection:bg-blue-500/30">
      {/* Header / HUD */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-white uppercase">Operations HQ</h1>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">Pulse Feeds Technical Infrastructure</p>
            </div>
          </div>

          <div className="flex items-center gap-8 font-mono text-[10px] uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <div className="flex items-center gap-2">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", healthStatus.apiStatus === 'nominal' ? 'bg-green-500' : 'bg-red-500')} />
              <span>Gateway: {healthStatus.apiStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Sync: {healthStatus.ipAlignment}</span>
            </div>
            <div className="text-gray-500">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-6">
        
        {/* Left Sidebar - Wings */}
        <aside className="col-span-12 lg:col-span-1 space-y-4">
          {[
            { id: 'security', icon: Shield, label: 'Sec' },
            { id: 'compliance', icon: Lock, label: 'Comp' },
            { id: 'network', icon: Globe, label: 'Net' },
            { id: 'vault', icon: Building2, label: 'Vault' }
          ].map((wing) => (
            <button
              key={wing.id}
              onClick={() => setActiveWing(wing.id as any)}
              className={cn(
                "w-full aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all group",
                activeWing === wing.id 
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                  : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
              )}
            >
              <wing.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{wing.label}</span>
            </button>
          ))}
        </aside>

        {/* Center - Detailed View */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-8 relative overflow-hidden min-h-[500px]">
             {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeWing}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="relative z-10"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <WingIcon className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{activeWing} Command Center</h2>
                    <p className="text-gray-500 font-serif italic text-sm">Real-time status monitoring and protocol enforcement</p>
                  </div>
                </div>

                {activeWing === 'security' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1 p-6 bg-black/40 border border-white/5 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          Emergency Protocols
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <button 
                          onClick={async () => {
                            if (window.confirm("CRITICAL: This will freeze all financial transactions across the entire platform. PROCEED?")) {
                              if (!db) return;
                              const monRef = doc(db, 'system', 'monitoring');
                              const snap = await getDoc(monRef);
                              const current = snap.data()?.safetyLocked;
                              await updateDoc(monRef, { safetyLocked: !current });
                            }
                          }}
                          className={cn(
                            "w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all",
                            healthStatus.apiStatus === 'locked' 
                              ? "bg-green-600/20 text-green-500 border border-green-600/30 hover:bg-green-600/30"
                              : "bg-red-600 text-white border border-red-500 shadow-xl shadow-red-600/20 hover:bg-red-700"
                          )}
                        >
                          {healthStatus.apiStatus === 'locked' ? 'Disengage Safety Lock' : 'Engage Safety Lock'}
                        </button>
                        <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest font-mono">
                          Authorization level: ADMIN_DIRECTOR
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeWing === 'network' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-black/40 border border-white/5 rounded-xl">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">API Gateway Handshakes</h3>
                      <div className="space-y-2">
                         {[
                           { name: 'Equity Bank B2C', status: 'stable', ping: '142ms' },
                           { name: 'Crypto Gateway', status: 'stable', ping: '190ms' },
                           { name: 'M-Pesa Webhook', status: 'stable', ping: '88ms' },
                           { name: 'Gemini AI Logic', status: 'stable', ping: '450ms' }
                         ].map((node) => (
                           <div key={node.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                             <div className="flex items-center gap-3">
                               <Radio className={cn("w-3 h-3", node.status === 'stable' ? 'text-green-500' : 'text-blue-500')} />
                               <span className="text-xs font-mono">{node.name}</span>
                             </div>
                             <div className="flex items-center gap-4 text-[10px] font-mono">
                               <span className="text-gray-500">{node.ping}</span>
                               <span className={cn("uppercase", node.status === 'stable' ? 'text-green-500' : 'text-blue-500')}>{node.status}</span>
                             </div>
                           </div>
                         ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                         <h4 className="text-[10px] font-black text-blue-400 uppercase">Incoming Callbacks</h4>
                         <p className="text-2xl font-black text-white mt-1">1,240</p>
                      </div>
                      <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                         <h4 className="text-[10px] font-black text-purple-400 uppercase">Signatures Verified</h4>
                         <p className="text-2xl font-black text-white mt-1">99.8%</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeWing === 'vault' && (
                  <div className="space-y-6">
                     <div className="relative aspect-video bg-black/60 rounded-xl border border-white/10 flex items-center justify-center p-8">
                        <div className="text-center">
                          <Database className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-50" />
                          <h3 className="text-4xl font-black text-white tracking-widest font-mono">{convert(1248300.52)}</h3>
                          <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">Certified Ledger Balance</p>
                        </div>
                        
                        {/* Decorative HUD corners */}
                        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-blue-500 opacity-50" />
                        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-blue-500 opacity-50" />
                        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-blue-500 opacity-50" />
                        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-blue-500 opacity-50" />
                     </div>

                     <div className="p-6 bg-black/40 border border-white/5 rounded-xl">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Audit Checksums</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 uppercase">Daily In</span>
                            <p className="text-sm font-mono text-green-500">+{convert(12400)}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 uppercase">Daily Out</span>
                            <p className="text-sm font-mono text-red-500">-{convert(2100)}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 uppercase">Net Diff</span>
                            <p className="text-sm font-mono text-blue-500">+{convert(10300)}</p>
                          </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeWing === 'compliance' && (
                  <div className="space-y-6">
                     <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-4">
                        <AlertTriangle className="w-12 h-12 text-red-500" />
                        <div>
                          <h3 className="text-lg font-black text-white uppercase">KYC Monitoring Block</h3>
                          <p className="text-sm text-gray-500">3 withdrawals from accounts flagged with "Sanction Drift". Automated mitigation engaged.</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {[
                         { label: 'AML Scans', value: '100%', status: 'success' },
                         { label: 'Identity Proof', value: 'Verified', status: 'success' },
                         { label: 'Risk Score', value: '0.04', status: 'caution' }
                       ].map((item) => (
                         <div key={item.label} className="p-4 bg-black/40 border border-white/5 rounded-xl text-center">
                            <span className="text-[10px] text-gray-500 uppercase">{item.label}</span>
                            <p className="text-sm font-bold text-white mt-1">{item.value}</p>
                         </div>
                       ))}
                     </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Right Sidebar - Live Alerts */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          <div className="bg-[#121214] border border-white/5 rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-white">
                <Terminal className="w-4 h-4 text-blue-500" />
                Live SysLog
              </h3>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px]">
              {systemLogs.map((log, i) => (
                <div key={log.id || i} className="group border-l border-white/10 pl-3 py-1 hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className={cn(
                      "uppercase font-black px-1 rounded-[2px]",
                      log.type === 'ip_change' ? 'text-yellow-500 bg-yellow-500/10' :
                      log.type?.includes('error') ? 'text-red-500 bg-red-500/10' :
                      'text-blue-500 bg-blue-500/10'
                    )}>
                      {log.type?.replace('_', ' ')}
                    </span>
                    <span className="text-gray-600">{log.timestamp?.toDate?.()?.toLocaleTimeString() || 'LIVE'}</span>
                  </div>
                  <p className="text-gray-400 break-words leading-relaxed group-hover:text-white transition-colors">
                    {log.message || log.details || JSON.stringify(log)}
                  </p>
                </div>
              ))}
              {systemLogs.length === 0 && (
                <div className="text-gray-600 italic">No critical alerts detected in pulse.</div>
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Footer / Building Visualization Footer */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-black border-t border-white/5 px-6 flex items-center justify-between text-[10px] uppercase font-mono text-gray-600 z-[60]">
        <div className="flex gap-6">
          <span>Facility Scale: 1:1</span>
          <span>Security Layer: BRICK_VAULT_v4</span>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-1 h-3 bg-white/10" />
            ))}
          </div>
          <span>Core Temp: 42°C</span>
          <span className="text-white">Pulse Feeds Operational</span>
        </div>
      </footer>
    </div>
  );
}
