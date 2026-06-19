import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ConfirmDialog, { ConfirmDialogOptions } from '../components/ui/ConfirmDialog';

type ConfirmContextValue = {
  confirm: (options: ConfirmDialogOptions | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((input: ConfirmDialogOptions | string) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(typeof input === 'string' ? { description: input } : input);
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={!!options}
        onClose={() => close(false)}
        onConfirm={() => close(true)}
        title={options?.title}
        description={options?.description}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        tone={options?.tone}
        iconClass={options?.iconClass}
        summaryItems={options?.summaryItems}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context.confirm;
};
