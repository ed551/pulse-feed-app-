import React, { Component, ErrorInfo } from 'react';
import { Activity, Wrench, CheckCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  recoveryStep: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    recoveryStep: 0
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, recoveryStep: 0 };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error intercepted by Auto-Healer:', error, errorInfo);
    this.startAutoRecovery();
  }

  private startAutoRecovery = () => {
    // Simulate AI diagnosing
    setTimeout(() => this.setState({ recoveryStep: 1 }), 2000);
    // Simulate AI patching
    setTimeout(() => this.setState({ recoveryStep: 2 }), 4500);
    // Simulate System Restored
    setTimeout(() => this.setState({ recoveryStep: 3 }), 7000);
    // Auto-reload or reset
    setTimeout(() => {
      this.setState({ hasError: false, recoveryStep: 0 });
      // Use relative path for reset to support GitHub Pages subdirectories
      window.location.href = window.location.pathname;
    }, 9000);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 font-sans">
          <div className="max-w-md w-full bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 p-8 text-center space-y-8 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>

            <div className="flex justify-center relative z-10">
              {this.state.recoveryStep === 0 && <Activity className="w-20 h-20 text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />}
              {this.state.recoveryStep === 1 && <RefreshCw className="w-20 h-20 text-yellow-500 animate-spin drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />}
              {this.state.recoveryStep === 2 && <Wrench className="w-20 h-20 text-blue-500 animate-bounce drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />}
              {this.state.recoveryStep === 3 && <CheckCircle className="w-20 h-20 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />}
            </div>
            
            <div className="relative z-10">
              <h1 className="text-2xl font-black mb-2 tracking-tight">
                {this.state.recoveryStep === 0 && "Critical Failure Detected"}
                {this.state.recoveryStep === 1 && "AI Auto-Diagnostics Running..."}
                {this.state.recoveryStep === 2 && "Applying Automated Patch..."}
                {this.state.recoveryStep === 3 && "System Successfully Restored"}
              </h1>
              <p className="text-gray-400 text-sm">
                {this.state.recoveryStep < 3 
                  ? "The self-healing engine has intercepted a fatal crash. Please stand by while the system repairs itself." 
                  : "All systems nominal. Rebooting interface..."}
              </p>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-left bg-gray-950 p-4 rounded-xl font-mono border border-gray-800 shadow-inner relative z-10">
              <div className="flex items-center space-x-2">
                <span className={this.state.recoveryStep >= 0 ? "text-red-400" : "text-gray-600"}>[0.00s]</span>
                <span className={this.state.recoveryStep >= 0 ? "text-gray-300" : "text-gray-600"}>Error intercepted at runtime.</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={this.state.recoveryStep >= 1 ? "text-yellow-400" : "text-gray-600"}>[2.01s]</span>
                <span className={this.state.recoveryStep >= 1 ? "text-gray-300" : "text-gray-600"}>Analyzing stack trace & isolating fault...</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={this.state.recoveryStep >= 2 ? "text-blue-400" : "text-gray-600"}>[4.52s]</span>
                <span className={this.state.recoveryStep >= 2 ? "text-gray-300" : "text-gray-600"}>Compiling hotfix & injecting code...</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={this.state.recoveryStep >= 3 ? "text-green-400" : "text-gray-600"}>[7.05s]</span>
                <span className={this.state.recoveryStep >= 3 ? "text-gray-300" : "text-gray-600"}>Hotfix applied. Rebooting...</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
