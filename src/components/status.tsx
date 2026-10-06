import clsx from 'clsx';
import { Archive, Check, ChevronDown, Sparkles } from 'lucide-react';
import { STATUS_META, STATUS_ORDER } from '../lib/meta';
import type { Project, ProjectStatus } from '../lib/types';
import { Menu, MenuDivider, MenuItem, MenuLabel } from './ui';

export function StatusBadge({
  status,
  size = 'md',
  className,
}: {
  status: ProjectStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-2.5 text-[13px]',
        className,
      )}
      style={{ color: meta.fg, backgroundColor: meta.bg }}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-[15px]'} strokeWidth={2} />
      {meta.label}
    </span>
  );
}

/** Icon-only status marker for dense lists. The status name is exposed as a tooltip and to screen readers. */
export function StatusIcon({ status, className }: { status: ProjectStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span title={meta.label} className={clsx('inline-grid shrink-0 place-items-center', className)} style={{ color: meta.fg }}>
      <Icon className="size-[15px]" strokeWidth={2} aria-hidden />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

export function ArchivedBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center gap-1.5 border border-line-strong px-2.5 text-[12.5px] font-medium text-muted',
        className,
      )}
    >
      <Archive className="size-3.5" />
      Archived
    </span>
  );
}

/** Status badge that opens a picker: automatic (from checklist) or any manual status. */
export function StatusPicker({
  project,
  onChange,
}: {
  project: Pick<Project, 'status' | 'status_mode'>;
  onChange: (change: { status?: ProjectStatus; status_mode?: 'auto' }) => void;
}) {
  const auto = project.status_mode === 'auto';
  return (
    <Menu
      align="left"
      label="Change status"
      panelClassName="w-72"
      trigger={
        <span className="group inline-flex items-center gap-0.5 border border-line p-0.5 pr-1 transition hover:border-line-strong">
          <StatusBadge status={project.status} />
          <span className="inline-flex h-7 items-center gap-1 px-1.5 text-[12px] font-medium text-muted transition group-hover:text-ink-soft">
            {auto ? (
              <>
                <Sparkles className="size-3" /> Auto
              </>
            ) : (
              'Manual'
            )}
            <ChevronDown className="size-3.5" />
          </span>
        </span>
      }
    >
      <MenuItem
        icon={Sparkles}
        onSelect={() => onChange({ status_mode: 'auto' })}
        active={auto}
        hint={auto ? <Check className="size-4 text-accent" /> : undefined}
      >
        <span className="block">Automatic</span>
        <span className="block text-xs font-normal text-muted">Follows checklist progress</span>
      </MenuItem>
      <MenuDivider />
      <MenuLabel>Set manually</MenuLabel>
      {STATUS_ORDER.map((status) => {
        const meta = STATUS_META[status];
        const selected = !auto && project.status === status;
        return (
          <MenuItem
            key={status}
            icon={meta.icon}
            onSelect={() => onChange({ status })}
            active={selected}
            hint={selected ? <Check className="size-4 text-accent" /> : undefined}
          >
            <span style={{ color: meta.fg }}>{meta.label}</span>
          </MenuItem>
        );
      })}
    </Menu>
  );
}
