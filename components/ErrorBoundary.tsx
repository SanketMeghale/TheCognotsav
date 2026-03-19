
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('permission')) {
            isPermissionError = true;
            errorMessage = `Security Access Denied: You do not have sufficient permissions to perform this ${parsed.operationType} operation on ${parsed.path}.`;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-red-500/20 p-8 rounded-[2.5rem] text-center shadow-2xl shadow-red-500/5">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              {isPermissionError ? (
                <ShieldAlert size={40} className="text-red-500" />
              ) : (
                <AlertTriangle size={40} className="text-red-500" />
              )}
            </div>
            
            <h2 className="font-orbitron text-xl font-black text-white uppercase mb-4 tracking-tight">
              {isPermissionError ? 'Access Restricted' : 'System Error'}
            </h2>
            
            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl mb-8">
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                {errorMessage}
              </p>
              {isPermissionError && (
                <p className="text-[10px] text-red-400/60 mt-3 uppercase tracking-widest font-black italic">
                  Check Firebase Security Rules
                </p>
              )}
            </div>

            <button 
              onClick={this.handleReset}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] border border-white/10"
            >
              <RefreshCcw size={16} /> Reboot Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
