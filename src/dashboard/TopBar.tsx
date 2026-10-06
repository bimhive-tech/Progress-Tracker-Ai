import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  ChevronDown,
  CircleCheck,
  CircleHelp,
  Clock,
  Eye,
  FolderKanban,
  FolderOpen,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  PanelLeft,
  Plus,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import { useAuthorName, useConfig } from '../lib/hooks';
import { STATUS_META } from '../lib/meta';
import { useSelection, type View } from '../lib/selection';
import { Brand } from '../components/brand';
import { useNewProject } from '../components/NewProjectModal';
import { Button, IconButton, Menu, MenuDivider, Modal, useCloseMenu } from '../components/ui';
import type { Filter, Stat, portfolioStats } from './filters';

type Stats = ReturnType<typeof portfolioStats>;

const VIEWS: { value: View; label: string; icon: LucideIcon }[] = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'project', label: 'Projects', icon: FolderKanban },
];

export function TopBar({ onOpenProjects }: { /** Shown on small screens, where the project list lives in a drawer. */ onOpenProjects?: () => void }) {
  const { data: config } = useConfig();
  const { canEdit } = useAuth();
  const { view, setView } = useSelection();
  const openNewProject = useNewProject();

  return (
    <header className="flex h-14 shrink-0 items-stretch gap-2 border-b border-line bg-sidebar px-3 sm:gap-4 sm:px-4">
      {onOpenProjects && <IconButton icon={PanelLeft} label="Show projects" size="md" onClick={onOpenProjects} className="self-center" />}
      <div className="flex min-w-0 items-center gap-3 lg:w-[268px] lg:shrink-0">
        <Brand className="max-sm:[&>span]:hidden" />
        <span className="hidden h-5 w-px bg-line-strong md:block" aria-hidden />
        <span className="hidden truncate text-[13px] text-muted md:inline">{config?.appName ?? 'CAD2BIM'} tracker</span>
      </div>

      <nav className="flex items-stretch" aria-label="Views">
        {VIEWS.map(({ value, label, icon: Icon }) => {
          const active = view === value;
          return (
            <button
              key={value}
              onClick={() => setView(value)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={clsx(
                'relative flex items-center gap-2 px-2.5 text-[13.5px] font-medium transition sm:px-3.5',
                active ? 'text-ink' : 'text-muted hover:text-ink-soft',
              )}
            >
              <Icon className={clsx('size-4', active && 'text-accent')} strokeWidth={1.9} />
              <span className="max-sm:hidden">{label}</span>
              {active && <span className="absolute inset-x-1.5 bottom-0 h-0.5 bg-accent" aria-hidden />}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        {canEdit && (
          <>
            <Button variant="primary" icon={Plus} onClick={openNewProject} className="max-sm:hidden">
              New project
            </Button>
            <IconButton icon={Plus} label="New project" size="md" tone="primary" onClick={openNewProject} className="sm:hidden" />
          </>
        )}
        <HelpButton />
        <AccountMenu />
      </div>
    </header>
  );
}

/** KPI chips. Each one doubles as a quick filter for the project list. */
export function StatStrip({
  stats,
  filter,
  onFilter,
  className,
}: {
  stats: Stats;
  filter: string;
  onFilter: (filter: Filter) => void;
  className?: string;
}) {
  const tiles: { key: Filter; label: string; icon: LucideIcon; color: string; stat: Stat; goodDelta?: boolean; deltaHint: string }[] = [
    { key: 'active', label: 'Active', icon: FolderOpen, color: 'var(--color-ink-soft)', stat: stats.active, deltaHint: 'created' },
    { key: 'processing', label: 'Processing', icon: LoaderCircle, color: STATUS_META.processing.fg, stat: stats.processing, deltaHint: 'moved to Processing' },
    { key: 'in_review', label: 'In review', icon: Clock, color: STATUS_META.in_review.fg, stat: stats.in_review, deltaHint: 'sent for review' },
    { key: 'completed', label: 'Completed', icon: CircleCheck, color: STATUS_META.completed.fg, stat: stats.completed, goodDelta: true, deltaHint: 'completed' },
    {
      key: 'overdue',
      label: 'Overdue',
      icon: TriangleAlert,
      color: stats.overdue.value ? 'var(--color-danger)' : 'var(--color-faint)',
      stat: stats.overdue,
      deltaHint: '',
    },
  ];

  return (
    <div className={clsx('flex items-center gap-1 overflow-x-auto scrollbar-none', className)} role="group" aria-label="Portfolio summary">
      {tiles.map((tile) => {
        const active = filter === tile.key;
        const Icon = tile.icon;
        return (
          <button
            key={tile.key}
            onClick={() => onFilter(active ? 'all' : tile.key)}
            aria-pressed={active}
            title={active ? 'Show all projects' : `Show ${tile.label.toLowerCase()} projects`}
            className={clsx(
              'flex h-9 shrink-0 items-center gap-2 border px-3 transition',
              active ? 'border-line-strong bg-white/[0.07]' : 'border-transparent hover:bg-white/[0.04]',
            )}
          >
            <Icon className="size-4 shrink-0" style={{ color: tile.color }} strokeWidth={1.9} aria-hidden />
            <span className="text-[15px] font-semibold text-ink">{tile.stat.value}</span>
            <span className="text-[13px] text-muted">{tile.label}</span>
            {tile.stat.delta > 0 && (
              <span
                className={clsx(
                 ' px-1.5 py-px text-[11px] font-medium',
                  tile.goodDelta ? 'bg-success-soft text-success' : 'bg-white/[0.06] text-muted',
                )}
                title={`${tile.stat.delta} ${tile.deltaHint} in the last 30 days`}
              >
                +{tile.stat.delta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function AccountMenu() {
  const { user, canEdit, signOut } = useAuth();
  const [name, setName] = useAuthorName();
  const display = name || user.username;
  return (
    <Menu
      align="right"
      label="Account"
      panelClassName="w-72 p-0"
      trigger={
        <span className="flex items-center gap-2 py-1 pr-1.5 pl-1 transition hover:bg-white/[0.05]">
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-b from-[#d3bd7f] to-[#9d8648] text-[12.5px] font-semibold text-accent-ink">
            {initials(display)}
          </span>
          <span className="hidden max-w-32 truncate text-[13.5px] font-medium text-ink-soft md:inline">{display}</span>
          <ChevronDown className="hidden size-3.5 text-muted md:block" />
        </span>
      }
    >
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-3">
        {canEdit ? <ShieldCheck className="size-5 shrink-0 text-accent" /> : <Eye className="size-5 shrink-0 text-muted" />}
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-ink">Signed in as {user.username}</div>
          <div className="text-[12.5px] text-muted">{canEdit ? 'Admin · can make changes' : 'Viewer · read-only'}</div>
        </div>
      </div>
      {canEdit && (
        <div className="border-t border-line px-3.5 py-3">
          <NameForm name={name} onSave={setName} />
        </div>
      )}
      <MenuDivider />
      <div className="p-1.5 pt-0">
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[13.5px] text-ink-soft transition hover:bg-white/[0.06] hover:text-ink"
        >
          <LogOut className="size-4" strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </Menu>
  );
}

function NameForm({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [value, setValue] = useState(name);
  const close = useCloseMenu();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value.trim());
        close();
      }}
    >
      <label className="mb-1.5 block text-[12.5px] font-medium text-muted" htmlFor="author-name">
        Your name on activity entries
      </label>
      <input id="author-name" className="field h-9" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Youssef" maxLength={120} />
      <Button type="submit" variant="primary" size="sm" className="mt-2 w-full">
        Save
      </Button>
    </form>
  );
}

function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon={CircleHelp} label="How this works" size="md" onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="How the tracker works" size="md">
        <div className="space-y-4 text-[14px] leading-relaxed text-ink-soft">
          <HelpItem title="Two views">
            <strong>Overview</strong> shows every project with its whole checklist, so you can see at a glance what’s done, what’s in progress and
            what’s still to do. <strong>Projects</strong> is the workspace: pick a project on the left to see its progress, checklist and details,
            with the activity log and checklist templates on the right. The numbers along the top are quick filters for both.
          </HelpItem>
          <HelpItem title="Accounts">
            Admin accounts can create and change projects, checklists, templates and activity. Viewer accounts see everything but can’t make changes.
          </HelpItem>
          <HelpItem title="Checklist">
            Click a step’s circle to tick it off, or open it to mark it <em>in progress</em> with a percentage. Drag steps to reorder them.
            Templates let you start projects with a ready-made checklist.
          </HelpItem>
          <HelpItem title="Automatic status">
            While a project is on <strong>Auto</strong>, its status follows the checklist: <em>Not started</em> until a step begins,{' '}
            <em>Processing</em> once work is underway, and <em>Completed</em> when every step is done. Pick any status from the badge to set it
            manually (e.g. <em>In review</em> or <em>On hold</em>), and switch back to Automatic whenever you like.
          </HelpItem>
          <HelpItem title="Activity log">
            Log what happened and when — data gathered, processed in Blender, sent for review. Entries can be back-dated and edited.
          </HelpItem>
          <HelpItem title="Shortcuts">
            <Kbd>/</Kbd> or <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> searches projects. <Kbd>Esc</Kbd> closes dialogs and menus.
          </HelpItem>
        </div>
      </Modal>
    </>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="border border-line-strong bg-sidebar px-1.5 py-px font-sans text-[12px] text-ink">{children}</kbd>;
}

function HelpItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-0.5 font-medium text-ink">{title}</h3>
      <p>{children}</p>
    </div>
  );
}
