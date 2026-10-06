import type { Ref } from 'react';
import clsx from 'clsx';
import { ArrowUpDown, Check, ChevronDown, ListFilter, Search, X } from 'lucide-react';
import { Menu, MenuDivider, MenuItem, MenuLabel } from '../components/ui';
import { FILTERS, SORTS, filterLabel, type Filter, type Sort } from './filters';

/** Project search shared by the project list and the overview. */
export function SearchBox({
  value,
  onChange,
  onEnter,
  inputRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onChange('');
            e.currentTarget.blur();
          } else if (e.key === 'Enter') {
            onEnter?.();
          }
        }}
        placeholder="Search projects, clients…"
        aria-label="Search projects"
        className="field h-9 bg-canvas pr-12 pl-9 text-[13.5px]"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center text-muted hover:bg-white/[0.07] hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 border border-line-strong px-1.5 font-sans text-[11px] text-faint">
          /
        </kbd>
      )}
    </div>
  );
}

export function FilterMenu({
  filter,
  onFilter,
  counts,
  className,
}: {
  filter: string;
  onFilter: (filter: Filter) => void;
  counts: Record<string, number>;
  className?: string;
}) {
  return (
    <Menu
      align="left"
      label="Filter projects"
      className={className}
      triggerClassName="w-full"
      panelClassName="w-60"
      trigger={
        <span
          className={clsx(
            'flex h-9 w-full items-center gap-2 border px-2.5 text-[13px] transition',
            filter !== 'all' ? 'border-accent/45 bg-accent-wash text-ink' : 'border-line text-ink-soft hover:border-line-strong',
          )}
        >
          <ListFilter className="size-3.5 shrink-0 text-muted" strokeWidth={1.9} />
          <span className="flex-1 truncate text-left">{filterLabel(filter)}</span>
          <span className="text-[12px] text-faint tabular-nums">{counts[filter] ?? 0}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </span>
      }
    >
      <MenuLabel>Show</MenuLabel>
      {FILTERS.map((option) => (
        <div key={option.value}>
          {(option.value === 'not_started' || option.value === 'overdue') && <MenuDivider />}
          <MenuItem onSelect={() => onFilter(option.value)} active={filter === option.value} hint={<span className="tabular-nums">{counts[option.value] ?? 0}</span>}>
            {option.label}
          </MenuItem>
        </div>
      ))}
    </Menu>
  );
}

export function SortMenu({ sort, onSort, className }: { sort: string; onSort: (sort: Sort) => void; className?: string }) {
  return (
    <Menu
      label="Sort projects"
      className={className}
      panelClassName="w-52"
      trigger={
        <span className="flex h-9 items-center gap-1.5 px-2 text-[12.5px] text-muted transition hover:bg-white/[0.06] hover:text-ink">
          <ArrowUpDown className="size-3.5" strokeWidth={1.9} />
          {SORTS.find((s) => s.value === sort)?.label ?? 'Sort'}
        </span>
      }
    >
      <MenuLabel>Sort by</MenuLabel>
      {SORTS.map((option) => (
        <MenuItem
          key={option.value}
          onSelect={() => onSort(option.value)}
          active={sort === option.value}
          hint={sort === option.value ? <Check className="size-4 text-accent" /> : undefined}
        >
          {option.label}
        </MenuItem>
      ))}
    </Menu>
  );
}
