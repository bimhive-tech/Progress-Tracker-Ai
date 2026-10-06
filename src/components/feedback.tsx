import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { Button, Modal } from './ui';

/* ------------------------------------------------------------------ Toasts */

type Toast = { id: number; tone: 'success' | 'error'; message: string };
type ToastApi = { success: (message: string) => void; error: (message: unknown) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Something went wrong';
}

/* ------------------------------------------------------------------ Confirm */

type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
};
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (tone: Toast['tone'], message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3200);
    },
    [dismiss],
  );
  const toast = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (e) => push('error', messageOf(e)) }),
    [push],
  );

  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise((resolve) => setPending({ ...options, resolve })),
    [],
  );
  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <Modal
          open={!!pending}
          onClose={() => settle(false)}
          title={pending?.title ?? ''}
          description={pending?.message}
          size="sm"
          footer={
            <>
              <Button onClick={() => settle(false)}>Cancel</Button>
              <Button variant={pending?.danger ? 'danger-solid' : 'primary'} onClick={() => settle(true)} autoFocus>
                {pending?.confirmLabel ?? 'Confirm'}
              </Button>
            </>
          }
        />
        {createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className={clsx(
                  'animate-pop-in pointer-events-auto flex max-w-md items-start gap-2.5 border px-4 py-3 text-[13.5px] text-ink shadow-pop',
                  t.tone === 'error' ? 'border-danger/30 bg-[#3a2420]' : 'border-line-strong/70 bg-raised',
                )}
              >
                {t.tone === 'error' ? (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                ) : (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                )}
                <span className="whitespace-pre-line">{t.message}</span>
                <button onClick={() => dismiss(t.id)} className="-mr-1 ml-1 text-faint hover:text-ink" aria-label="Dismiss">
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside FeedbackProvider');
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside FeedbackProvider');
  return ctx;
}
