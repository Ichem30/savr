import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icons } from './Icons';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Icons.AlertCircle size={40} className="text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops, something went wrong</h1>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto">Don't worry, your data is safe. We just need to restart the kitchen.</p>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 text-left w-full max-w-md overflow-hidden relative group mb-8">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                <p className="text-xs font-mono text-red-500 break-words line-clamp-4 group-hover:line-clamp-none transition-all">
                    {this.state.error?.toString()}
                </p>
            </div>

            <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
                <Icons.Play size={18} /> Restart App
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}
