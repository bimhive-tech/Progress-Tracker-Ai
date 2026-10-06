import clsx from 'clsx';
import { LogoMark } from './art';

/** BIM Hive mark + wordmark. `size="lg"` adds the "Construction technology" line. */
export function Brand({ size = 'sm', className }: { size?: 'sm' | 'lg'; className?: string }) {
  if (size === 'lg') {
    return (
      <div className={clsx('flex items-center gap-4', className)}>
        <LogoMark className="h-14 w-auto shrink-0 text-accent" />
        <div>
          <div className="text-[30px] leading-none font-bold tracking-[-0.02em] text-ink">BIM Hive</div>
          <div className="mt-1.5 text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">Construction technology</div>
        </div>
      </div>
    );
  }
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <LogoMark className="h-[22px] w-auto shrink-0 text-accent" />
      <span className="text-[17px] font-bold tracking-[-0.02em] whitespace-nowrap text-ink">BIM Hive</span>
    </div>
  );
}
