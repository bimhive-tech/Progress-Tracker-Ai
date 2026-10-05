import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { LoaderCircle, X, type LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-gold text-white shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_6px_16px_-8px_rgb(152_130_73/0.8)] hover:bg-gold-strong',
  secondary: 'bg-white text-ink border border-line-strong/80 hover:border-line-strong hover:bg-subtle',
  ghost: 'text-ink-soft hover:bg-black/[0.04]',
  danger: 'bg-white text-danger border border-danger/30 hover:bg-danger-soft',
  'danger-solid': 'bg-danger text-white hover:bg-[#a93127]',
  dark: 'bg-ink text-white hover:bg-ink-soft',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4.5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-13 px-6 text-base gap-2.5 rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition select-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 disabled:opacity-55',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className="size-[1.1em] animate-spin" />
      ) : Icon ? (
        <Icon className="size-[1.15em]" strokeWidth={1.8} />
      ) : null}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; tone?: 'default' | 'danger'; size?: 'sm' | 'md' }
>(function IconButton({ icon: Icon, label, tone = 'default', size = 'sm', className, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25 disabled:opacity-40',
        size === 'sm' ? 'size-8' : 'size-10',
        tone === 'danger' ? 'text-muted hover:bg-danger-soft hover:text-danger' : 'text-muted hover:bg-black/[0.05] hover:text-ink',
        className,
      )}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={1.8} />
    </button>
  );
});

/* ------------------------------------------------------------------ Layout */

export function Card({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={clsx('rounded-[24px] border border-line/80 bg-surface shadow-card', className)}>
      {children}
    </section>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx('animate-spin text-faint', className ?? 'size-5')} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-7" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-gold-soft text-gold-strong">
        <Icon className="size-6" strokeWidth={1.7} />
      </div>
      <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-[15px] text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, className, tone = 'gold' }: { value: number; className?: string; tone?: 'gold' | 'green' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={clsx('overflow-hidden rounded-full bg-[#eeece7]', className ?? 'h-2')}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', tone === 'green' ? 'bg-success' : 'bg-gold')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Forms */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={clsx('inline-flex rounded-xl bg-[#f1efea] p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'h-8 flex-1 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition',
            value === option.value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Modal */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[#1b1a17]/35 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'animate-pop-in flex max-h-[min(92vh,900px)] w-full flex-col rounded-[26px] bg-white shadow-pop',
          size === 'sm' && 'max-w-md',
          size === 'md' && 'max-w-xl',
          size === 'lg' && 'max-w-3xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
          <div>
            <h2 id={titleId} className="text-xl font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mt-1 -mr-2" size="md" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2.5 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ Menu */

const MenuContext = createContext<() => void>(() => {});

export function Menu({
  trigger,
  children,
  align = 'right',
  className,
  panelClassName,
  label = 'Open menu',
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  panelClassName?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/25"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          setDropUp(window.innerHeight - rect.bottom < 280 && rect.top > 280);
          setOpen((value) => !value);
        }}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={clsx(
            'animate-pop-in absolute z-40 min-w-52 rounded-2xl border border-line bg-white p-1.5 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
            panelClassName,
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <MenuContext.Provider value={() => setOpen(false)}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  );
}

/** Closes the enclosing <Menu> — for custom content that isn't a MenuItem. */
export function useCloseMenu() {
  return useContext(MenuContext);
}

export function MenuItem({
  icon: Icon,
  children,
  onSelect,
  danger,
  active,
  hint,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  active?: boolean;
  hint?: ReactNode;
}) {
  const close = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
        onSelect();
      }}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] transition',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-ink-soft hover:bg-[#f4f2ee]',
        active && 'bg-[#f4f2ee] font-medium text-ink',
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" strokeWidth={1.8} />}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-faint uppercase">{children}</div>;
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-line" />;
}
