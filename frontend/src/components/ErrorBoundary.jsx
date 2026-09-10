import React from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-950 text-red-400 border border-red-800 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-white">Application Exception Caught</h2>
            
            <p className="text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono overflow-x-auto">
              {this.state.error?.toString() || "Unknown error encountered"}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-emerald-950"
            >
              <RefreshCw className="w-4 h-4" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
