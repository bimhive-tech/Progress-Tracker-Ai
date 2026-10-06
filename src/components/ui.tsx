import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { LoaderCircle, X, type LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent-button font-semibold text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.2)] hover:bg-accent-button-hover',
  secondary: 'border border-line-strong bg-white/[0.03] text-ink-soft hover:bg-white/[0.07] hover:text-ink',
  ghost: 'text-ink-soft hover:bg-white/[0.06] hover:text-ink',
  danger: 'border border-danger/30 text-danger hover:bg-danger-soft',
  'danger-solid': 'bg-danger-solid text-white hover:bg-[#d65547]',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-[14px] gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
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
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/35 disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className="size-[1.1em] animate-spin" />
      ) : Icon ? (
        <Icon className="size-[1.1em]" strokeWidth={1.9} />
      ) : null}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; tone?: 'default' | 'danger' | 'primary'; size?: 'sm' | 'md' }
>(function IconButton({ icon: Icon, label, tone = 'default', size = 'sm', className, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/35 disabled:opacity-35',
        size === 'sm' ? 'size-8' : 'size-9',
        tone === 'danger' && 'text-muted hover:bg-danger-soft hover:text-danger',
        tone === 'primary' && 'bg-accent-button text-accent-ink hover:bg-accent-button-hover',
        tone === 'default' && 'text-muted hover:bg-white/[0.07] hover:text-ink',
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
    <section id={id} className={clsx('border border-line bg-surface shadow-card', className)}>
      {children}
    </section>
  );
}

/** Title row used at the top of every dashboard panel. */
export function PanelHeader({
  title,
  icon: Icon,
  meta,
  actions,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex min-h-9 items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon className="size-[18px] shrink-0 text-accent" strokeWidth={1.8} />}
        <h2 className="truncate font-serif text-[19px] font-medium tracking-[-0.01em] text-ink">{title}</h2>
        {meta && <span className="shrink-0 text-[13px] text-muted max-xs:hidden">{meta}</span>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={clsx('animate-spin text-faint', className ?? 'size-5')} />;
}

export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center justify-center', className ?? 'min-h-[30vh]')}>
      <Spinner className="size-6" />
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
    <div className={clsx('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center bg-accent-soft text-accent">
        <Icon className="size-[22px]" strokeWidth={1.7} />
      </div>
      <h3 className="font-serif text-[18px] font-medium text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, className, complete }: { value: number; className?: string; complete?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  const done = complete ?? pct === 100;
  return (
    <div
      className={clsx('overflow-hidden', done ? 'bg-success-soft' : 'bg-accent-soft', className ?? 'h-1.5')}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx('h-full transition-[width] duration-500 ease-out', done ? 'bg-success-solid' : 'bg-accent')}
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
      <span className="mb-1.5 block text-[12.5px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={clsx('inline-flex border border-line bg-sidebar p-0.5', className)} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'flex flex-1 items-center justify-center gap-1.5 px-3 font-medium whitespace-nowrap transition',
            size === 'sm' ? 'h-7 text-[12.5px]' : 'h-8 text-[13px]',
            value === option.value ? 'bg-raised text-ink shadow-sm' : 'text-muted hover:text-ink-soft',
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
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-[3px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'animate-pop-in flex max-h-[min(92vh,900px)] w-full flex-col border border-line-strong/60 bg-surface shadow-pop',
          size === 'sm' && 'max-w-md',
          size === 'md' && 'max-w-xl',
          size === 'lg' && 'max-w-3xl',
        )}
      >
        <div className={clsx('flex items-start justify-between gap-4 px-6 pt-5', children ? 'pb-1' : 'pb-5')}>
          <div>
            <h2 id={titleId} className="font-serif text-[21px] font-medium tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-[14px] leading-relaxed text-muted">{description}</p>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} className="-mt-0.5 -mr-2" size="md" />
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>}
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ Menu */

const MenuContext = createContext<() => void>(() => {});

/**
 * Dropdown menu. The panel is portalled with fixed positioning so it never gets clipped by the
 * dashboard's independently scrolling columns.
 */
export function Menu({
  trigger,
  children,
  align = 'right',
  className,
  triggerClassName,
  panelClassName,
  label = 'Open menu',
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  label?: string;
}) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = position !== null;
  const close = useCallback(() => setPosition(null), []);

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      !!target && (panelRef.current?.contains(target as Node) || triggerRef.current?.contains(target as Node));
    const onDown = (event: MouseEvent) => {
      if (!inside(event.target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Capture-phase + stop, so an Escape inside a menu doesn't also close the modal around it.
      event.stopPropagation();
      close();
      triggerRef.current?.focus();
    };
    const onScroll = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  // Keep the panel inside the viewport horizontally.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const rect = panel.getBoundingClientRect();
    const overflowRight = rect.right - (window.innerWidth - 8);
    const overflowLeft = 8 - rect.left;
    if (overflowRight > 0) panel.style.transform = `translateX(${-overflowRight}px)`;
    else if (overflowLeft > 0) panel.style.transform = `translateX(${overflowLeft}px)`;
  }, [open]);

  const toggle = () => {
    if (open) return close();
    const rect = triggerRef.current!.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const dropUp = below < 300 && rect.top > below;
    const style: CSSProperties = {
      maxHeight: Math.max(160, (dropUp ? rect.top : below) - 16),
    };
    if (align === 'right') style.right = window.innerWidth - rect.right;
    else style.left = rect.left;
    if (dropUp) style.bottom = window.innerHeight - rect.top + 6;
    else style.top = rect.bottom + 6;
    setPosition(style);
  };

  return (
    <div className={clsx('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx('block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/35', triggerClassName)}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={position}
            className={clsx(
              'animate-pop-in fixed z-[70] min-w-52 overflow-y-auto border border-line-strong/70 bg-raised p-1.5 shadow-pop',
              panelClassName,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <MenuContext.Provider value={close}>{children}</MenuContext.Provider>
          </div>,
          document.body,
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
      onClick={() => {
        close();
        onSelect();
      }}
      className={clsx(
        'flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-[13.5px] transition',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-ink-soft hover:bg-white/[0.06] hover:text-ink',
        active && 'bg-white/[0.06] font-medium text-ink',
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" strokeWidth={1.8} />}
      <span className="min-w-0 flex-1">{children}</span>
      {hint && <span className="shrink-0 text-xs text-faint">{hint}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="eyebrow px-2.5 pt-2 pb-1">{children}</div>;
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-line" />;
}
