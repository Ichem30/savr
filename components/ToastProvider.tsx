import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icons } from './Icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              layout
              className="pointer-events-auto"
            >
              <div 
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md min-w-[300px] max-w-sm
                  ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : ''}
                  ${toast.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : ''}
                  ${toast.type === 'info' ? 'bg-blue-50/90 border-blue-200 text-blue-800' : ''}
                  ${toast.type === 'warning' ? 'bg-orange-50/90 border-orange-200 text-orange-800' : ''}
                `}
              >
                <div className={`p-1.5 rounded-full shrink-0
                   ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : ''}
                   ${toast.type === 'error' ? 'bg-red-100 text-red-600' : ''}
                   ${toast.type === 'info' ? 'bg-blue-100 text-blue-600' : ''}
                   ${toast.type === 'warning' ? 'bg-orange-100 text-orange-600' : ''}
                `}>
                  {toast.type === 'success' && <Icons.Check size={16} strokeWidth={3} />}
                  {toast.type === 'error' && <Icons.AlertCircle size={16} strokeWidth={3} />}
                  {toast.type === 'info' && <Icons.Info size={16} strokeWidth={3} />}
                  {toast.type === 'warning' && <Icons.AlertTriangle size={16} strokeWidth={3} />}
                </div>
                
                <p className="text-sm font-semibold flex-1">{toast.message}</p>
                
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors opacity-60 hover:opacity-100"
                >
                  <Icons.X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

