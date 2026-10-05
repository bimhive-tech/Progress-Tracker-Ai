import clsx from 'clsx';
import { Archive, Check, ChevronDown, Sparkles } from 'lucide-react';
import { STATUS_META, STATUS_ORDER } from '../lib/meta';
import type { Project, ProjectStatus } from '../lib/types';
import { Menu, MenuDivider, MenuItem, MenuLabel } from './ui';

export function StatusBadge({
  status,
  variant = 'tint',
  size = 'md',
  className,
}: {
  status: ProjectStatus;
  variant?: 'tint' | 'floating';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        size === 'sm' && 'h-7 px-2.5 text-[12.5px]',
        size === 'md' && 'h-8 px-3 text-[13.5px]',
        size === 'lg' && 'h-10 px-4 text-[15px]',
        variant === 'floating' && 'bg-white/95 shadow-[0_2px_10px_-2px_rgb(0_0_0/0.15)] backdrop-blur',
        className,
      )}
      style={{ color: meta.fg, backgroundColor: variant === 'tint' ? meta.bg : undefined }}
    >
      <Icon className={size === 'lg' ? 'size-[17px]' : 'size-[15px]'} strokeWidth={2} />
      {meta.label}
    </span>
  );
}

export function ArchivedBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center gap-1.5 rounded-full bg-[#2c2b29]/85 px-2.5 text-[12.5px] font-medium text-white backdrop-blur',
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
        <span className="group inline-flex items-center gap-1">
          <StatusBadge status={project.status} size="lg" className="pr-3" />
          <span className="inline-flex h-10 items-center gap-1 rounded-full px-2 text-[12.5px] font-medium text-muted transition group-hover:bg-black/[0.04]">
            {auto ? 'Auto' : 'Manual'}
            <ChevronDown className="size-3.5" />
          </span>
        </span>
      }
    >
      <MenuItem icon={Sparkles} onSelect={() => onChange({ status_mode: 'auto' })} active={auto} hint={auto ? <Check className="size-4 text-gold-strong" /> : undefined}>
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
            hint={selected ? <Check className="size-4 text-gold-strong" /> : undefined}
          >
            <span style={{ color: meta.fg }}>{meta.label}</span>
          </MenuItem>
        );
      })}
    </Menu>
  );
}
