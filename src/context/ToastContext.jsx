import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const value = {
        toast: {
            success: (msg, dur) => addToast(msg, 'success', dur),
            error: (msg, dur) => addToast(msg, 'error', dur),
            warning: (msg, dur) => addToast(msg, 'warning', dur),
            info: (msg, dur) => addToast(msg, 'info', dur),
        }
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context.toast;
};

function ToastItem({ toast, onRemove }) {
    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckCircle size={20} color="#34a853" />;
            case 'error': return <XCircle size={20} color="#ea4335" />;
            case 'warning': return <AlertCircle size={20} color="#fbbc05" />;
            default: return <Info size={20} color="#4285f4" />;
        }
    };

    return (
        <div className={`toast toast--${toast.type} fade-in-up`}>
            <div className="toast__icon">{getIcon()}</div>
            <div className="toast__message">{toast.message}</div>
            <button className="toast__close" onClick={onRemove}><X size={16} /></button>
        </div>
    );
}
