import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, Edit3, Trash2, CheckCircle2, Send, X, Check, Save } from 'lucide-react';

export type ConfirmType = 'delete' | 'edit' | 'save' | 'send' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message?: string;
  description?: string;
  itemDetail?: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  const type = options?.type || 'save';

  const getHeaderStyles = () => {
    switch (type) {
      case 'delete':
        return {
          bg: 'bg-red-500/10 border-red-500/20',
          titleColor: 'text-red-500 dark:text-red-400',
          icon: <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />,
          btnClass: 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20',
          btnIcon: <Trash2 className="w-4 h-4 shrink-0" />,
          defaultConfirmText: 'ยืนยันการลบ'
        };
      case 'edit':
        return {
          bg: 'bg-amber-500/10 border-amber-500/20',
          titleColor: 'text-amber-600 dark:text-amber-400',
          icon: <Edit3 className="w-5 h-5 text-amber-500 shrink-0" />,
          btnClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20',
          btnIcon: <Edit3 className="w-4 h-4 shrink-0" />,
          defaultConfirmText: 'ยืนยันการแก้ไข'
        };
      case 'send':
        return {
          bg: 'bg-blue-500/10 border-blue-500/20',
          titleColor: 'text-blue-600 dark:text-blue-400',
          icon: <Send className="w-5 h-5 text-blue-500 shrink-0" />,
          btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20',
          btnIcon: <Send className="w-4 h-4 shrink-0" />,
          defaultConfirmText: 'ยืนยันการส่ง'
        };
      case 'warning':
        return {
          bg: 'bg-orange-500/10 border-orange-500/20',
          titleColor: 'text-orange-600 dark:text-orange-400',
          icon: <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />,
          btnClass: 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/20',
          btnIcon: <Check className="w-4 h-4 shrink-0" />,
          defaultConfirmText: 'ยืนยัน'
        };
      case 'save':
      default:
        return {
          bg: 'bg-[var(--primary-color)]/10 border-[var(--primary-color)]/20',
          titleColor: 'text-[var(--primary-color)]',
          icon: <CheckCircle2 className="w-5 h-5 text-[var(--primary-color)] shrink-0" />,
          btnClass: 'bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-white shadow-md shadow-[var(--primary-color)]/20',
          btnIcon: <Save className="w-4 h-4 shrink-0" />,
          defaultConfirmText: 'ยืนยันการบันทึก'
        };
    }
  };

  const style = getHeaderStyles();

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${style.bg}`}>
              <h3 className={`font-sans font-semibold text-base sm:text-lg flex items-center gap-2.5 ${style.titleColor}`}>
                {style.icon}
                <span>{options.title}</span>
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
                aria-label="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {options.message || 'คุณต้องการดำเนินการรายการนี้ใช่หรือไม่?'}
              </p>

              {options.description && (
                <p className="text-xs text-[var(--text-secondary)] leading-normal">
                  {options.description}
                </p>
              )}

              {options.itemDetail && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-xs text-[var(--text-primary)] font-medium">
                  {options.itemDetail}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--border-lighter)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-light)] cursor-pointer"
                >
                  {options.cancelText || 'ยกเลิก'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${style.btnClass}`}
                  autoFocus
                >
                  {style.btnIcon}
                  <span>{options.confirmText || style.defaultConfirmText}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
