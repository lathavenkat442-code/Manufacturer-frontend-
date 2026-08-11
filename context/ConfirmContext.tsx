import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Trash2, Save, X, HelpCircle, ShieldAlert } from 'lucide-react';

export type ConfirmType = 'save' | 'delete' | 'warning' | 'info';

export interface ConfirmConfig {
  title?: string;
  message?: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
}

export interface NotificationModalConfig {
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmContextType {
  confirm: (config: ConfirmConfig) => Promise<boolean>;
  confirmSave: (message?: string, title?: string) => Promise<boolean>;
  confirmDelete: (message?: string, title?: string) => Promise<boolean>;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State for Confirmation Modal
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    config: ConfirmConfig;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    config: {},
  });

  // State for Success / Error Notification Modal
  const [notifyState, setNotifyState] = useState<{
    isOpen: boolean;
    config: NotificationModalConfig;
  }>({
    isOpen: false,
    config: { message: '', type: 'success' },
  });

  const confirm = useCallback((config: ConfirmConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        config,
        resolve,
      });
    });
  }, []);

  const confirmSave = useCallback(
    (message?: string, title?: string): Promise<boolean> => {
      return confirm({
        type: 'save',
        title: title || 'சேமிக்க விரும்புகிறீர்களா?',
        message: message || 'உள்ளிட்ட விவரங்களை சேமிக்க நிச்சயமாக விரும்புகிறீர்களா?',
        confirmText: 'ஆம், சேமிக்க',
        cancelText: 'ரத்து',
      });
    },
    [confirm]
  );

  const confirmDelete = useCallback(
    (message?: string, title?: string): Promise<boolean> => {
      return confirm({
        type: 'delete',
        title: title || 'நீக்க விரும்புகிறீர்களா?',
        message: message || 'இந்த விவரங்களை நிச்சயமாக நீக்க விரும்புகிறீர்களா? இந்த செயலை மீண்டும் பெற முடியாது.',
        confirmText: 'ஆம், நீக்குக',
        cancelText: 'ரத்து',
      });
    },
    [confirm]
  );

  const showSuccess = useCallback((message: string, title?: string) => {
    setNotifyState({
      isOpen: true,
      config: {
        title: title || 'வெற்றிகரமாக சேமிக்கப்பட்டது!',
        message,
        type: 'success',
      },
    });
  }, []);

  const showError = useCallback((message: string, title?: string) => {
    setNotifyState({
      isOpen: true,
      config: {
        title: title || 'சிக்கல் / பிழை ஏற்பட்டது!',
        message,
        type: 'error',
      },
    });
  }, []);

  const handleConfirmChoice = (choice: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(choice);
    }
    setConfirmState({ isOpen: false, config: {} });
  };

  const closeNotify = () => {
    setNotifyState({ isOpen: false, config: { message: '', type: 'success' } });
  };

  return (
    <ConfirmContext.Provider
      value={{
        confirm,
        confirmSave,
        confirmDelete,
        showSuccess,
        showError,
      }}
    >
      {children}

      {/* --- CONFIRMATION POPUP DIALOG --- */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Top Icon Badge */}
            <div className="mb-4">
              {confirmState.config.type === 'save' && (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50 shadow-inner">
                  <Save size={32} />
                </div>
              )}
              {confirmState.config.type === 'delete' && (
                <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center ring-8 ring-rose-50 shadow-inner">
                  <Trash2 size={32} />
                </div>
              )}
              {(confirmState.config.type === 'warning' || confirmState.config.type === 'info' || !confirmState.config.type) && (
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center ring-8 ring-amber-50 shadow-inner">
                  <HelpCircle size={32} />
                </div>
              )}
            </div>

            {/* Title & Message */}
            <h3 className="text-xl font-black text-gray-900 mb-2 tamil-font tracking-tight">
              {confirmState.config.title || (confirmState.config.type === 'delete' ? 'நீக்க விரும்புகிறீர்களா?' : 'சேமிக்க விரும்புகிறீர்களா?')}
            </h3>
            <p className="text-gray-600 text-sm font-medium mb-6 leading-relaxed tamil-font">
              {confirmState.config.message || (confirmState.config.type === 'delete' ? 'இந்த விவரங்களை நிச்சயமாக நீக்க விரும்புகிறீர்களா?' : 'உள்ளிட்ட விவரங்களை சேமிக்க விரும்புகிறீர்களா?')}
            </p>

            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="flex-1 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-sm transition-all active:scale-95"
              >
                {confirmState.config.cancelText || 'ரத்து (Cancel)'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`flex-1 py-3.5 px-4 text-white font-black rounded-2xl text-sm shadow-lg transition-all active:scale-95 ${
                  confirmState.config.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {confirmState.config.confirmText || (confirmState.config.type === 'delete' ? 'ஆம், நீக்குக' : 'ஆம், சேமிக்க')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS / ERROR POPUP DIALOG WITH TICK MARK OR WARNING --- */}
      {notifyState.isOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[100000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Top Close Button */}
            <button
              type="button"
              onClick={closeNotify}
              className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            {/* Icon Header */}
            <div className="mb-4">
              {notifyState.config.type === 'success' ? (
                <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-8 ring-emerald-100 shadow-lg shadow-emerald-200 animate-bounce">
                  <CheckCircle2 size={44} className="stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center ring-8 ring-rose-100 shadow-lg shadow-rose-200">
                  <AlertTriangle size={44} className="stroke-[2.5]" />
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className={`text-2xl font-black mb-2 tamil-font tracking-tight ${notifyState.config.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {notifyState.config.title || (notifyState.config.type === 'success' ? 'வெற்றிகரமாக முடிந்தது!' : 'பிழை / சிக்கல்')}
            </h3>

            {/* Message / Details of Issue */}
            <p className="text-gray-700 text-sm font-semibold mb-6 leading-relaxed tamil-font max-h-48 overflow-y-auto px-2">
              {notifyState.config.message}
            </p>

            {/* OK Button */}
            <button
              type="button"
              onClick={closeNotify}
              className={`w-full py-4 text-white font-black rounded-2xl text-base shadow-xl transition-all active:scale-95 ${
                notifyState.config.type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
              }`}
            >
              சரி (OK)
            </button>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
