import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import clsx from 'clsx';
import {
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  File,
  FolderPlus,
  Layers,
  LayoutGrid,
  List,
  SearchX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { relativeTime } from '../lib/format';
import { useActivity, useLocalSetting, useProjects } from '../lib/hooks';
import { STATUS_META, STATUS_ORDER } from '../lib/meta';
import type { Project, ProjectStatus } from '../lib/types';
import { PlaceholderArt } from '../components/art';
import { ProjectCard, ProjectRow } from '../components/ProjectCard';
import { useNewProject } from '../components/NewProjectModal';
import { Button, Card, EmptyState, Menu, MenuItem, PageLoader } from '../components/ui';

type Filter = 'all' | ProjectStatus | 'archived';
type Sort = 'updated' | 'created' | 'name' | 'due' | 'progress';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'updated', label: 'Last updated' },
  { value: 'created', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'due', label: 'Due date' },
  { value: 'progress', label: 'Progress' },
];

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const recent = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < THIRTY_DAYS;

function sortProjects(projects: Project[], sort: Sort) {
  const list = [...projects];
  switch (sort) {
    case 'created':
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
    case 'due':
      return list.sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
    case 'progress':
      return list.sort((a, b) => b.progress - a.progress);
    default:
      return list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
}

export function HubPage() {
  const { data: projects, isLoading, error } = useProjects();
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const [filter, setFilter] = useLocalSetting('hub.filter', 'all');
  const [sort, setSort] = useLocalSetting('hub.sort', 'updated');
  const [view, setView] = useLocalSetting('hub.view', 'grid');
  const openNewProject = useNewProject();

  useEffect(() => {
    document.title = 'Project Hub';
  }, []);

  const live = useMemo(() => (projects ?? []).filter((p) => !p.archived), [projects]);

  const stats = useMemo(() => {
    const active = live.filter((p) => p.status !== 'completed');
    const byStatus = (status: ProjectStatus) => live.filter((p) => p.status === status);
    return {
      active: { value: active.length, delta: active.filter((p) => recent(p.created_at)).length },
      processing: { value: byStatus('processing').length, delta: byStatus('processing').filter((p) => recent(p.status_changed_at)).length },
      in_review: { value: byStatus('in_review').length, delta: byStatus('in_review').filter((p) => recent(p.status_changed_at)).length },
      completed: { value: byStatus('completed').length, delta: byStatus('completed').filter((p) => recent(p.completed_at)).length },
    };
  }, [live]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: live.length, archived: (projects ?? []).length - live.length };
    for (const status of STATUS_ORDER) result[status] = live.filter((p) => p.status === status).length;
    return result;
  }, [live, projects]);

  const visible = useMemo(() => {
    let list = projects ?? [];
    if (filter === 'archived') list = list.filter((p) => p.archived);
    else {
      list = list.filter((p) => !p.archived);
      if (filter !== 'all') list = list.filter((p) => p.status === filter);
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => [p.name, p.code, p.client, p.location, p.category, p.description].some((v) => v?.toLowerCase().includes(q)));
    }
    return sortProjects(list, sort as Sort);
  }, [projects, filter, sort, query]);

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All Projects' },
    ...STATUS_ORDER.map((status) => ({ value: status as Filter, label: STATUS_META[status].label })),
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
      <Card className="p-5 sm:p-7">
        <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-ink sm:text-[44px]">Project Hub</h1>
        <p className="mt-1 text-[16px] text-muted sm:text-lg">Manage your CAD-to-BIM projects, track progress, and keep every file in one place.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 2xl:grid-cols-4">
          <StatTile icon={File} label="Active Projects" stat={stats.active} onClick={() => setFilter('all')} />
          <StatTile icon={Layers} label="Processing" stat={stats.processing} onClick={() => setFilter('processing')} />
          <StatTile icon={Clock} label="In Review" stat={stats.in_review} onClick={() => setFilter('in_review')} />
          <StatTile icon={CircleCheck} label="Completed" stat={stats.completed} onClick={() => setFilter('completed')} />
        </div>

        <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">Projects</h2>
          <div className="flex items-center gap-2.5">
            <Menu
              label="Sort projects"
              trigger={
                <span className="flex h-11 items-center gap-2 rounded-xl border border-line-strong/70 bg-white px-3.5 text-[15px] text-ink-soft transition hover:border-line-strong">
                  <ArrowUpDown className="size-4" strokeWidth={1.8} />
                  <span className="hidden sm:inline">{SORTS.find((s) => s.value === sort)?.label ?? 'Sort'}</span>
                  <ChevronDown className="size-4 text-muted" />
                </span>
              }
            >
              {SORTS.map((option) => (
                <MenuItem
                  key={option.value}
                  onSelect={() => setSort(option.value)}
                  active={sort === option.value}
                  hint={sort === option.value ? <Check className="size-4 text-gold-strong" /> : undefined}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
            <div className="flex h-11 items-center rounded-xl border border-line-strong/70 bg-white p-1">
              <ViewButton icon={LayoutGrid} label="Grid view" active={view === 'grid'} onClick={() => setView('grid')} />
              <ViewButton icon={List} label="List view" active={view === 'list'} onClick={() => setView('list')} />
            </div>
          </div>
        </div>

        <div className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-none">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14.5px] transition',
                filter === f.value ? 'bg-sand font-medium text-ink' : 'text-muted hover:bg-[#f6f4f0] hover:text-ink-soft',
              )}
            >
              {f.label}
              {!!counts[f.value] && <span className="text-[12px] text-faint tabular-nums">{counts[f.value]}</span>}
            </button>
          ))}
        </div>

        {query && (
          <div className="mt-4 flex items-center gap-2 text-[14px] text-muted">
            Showing results for <strong className="font-medium text-ink">“{query}”</strong>
            <button onClick={() => setParams({})} className="inline-flex items-center gap-1 rounded-full bg-[#f3f1ec] px-2.5 py-1 text-[13px] hover:text-ink">
              <X className="size-3.5" /> Clear
            </button>
          </div>
        )}

        <div className="mt-5">
          {isLoading ? (
            <PageLoader />
          ) : error ? (
            <EmptyState icon={SearchX} title="Couldn’t load projects">
              {(error as Error).message}
            </EmptyState>
          ) : !projects?.length ? (
            <EmptyState
              icon={FolderPlus}
              title="Create your first project"
              action={
                <Button variant="primary" icon={FolderPlus} onClick={openNewProject}>
                  New Project
                </Button>
              }
            >
              Add a project, give it a checklist, then track every step, file and update in one place.
            </EmptyState>
          ) : !visible.length ? (
            <EmptyState icon={SearchX} title="Nothing here yet">
              {query ? 'No projects match your search in this view.' : 'No projects in this view.'}
            </EmptyState>
          ) : view === 'list' ? (
            <div className="divide-y divide-line">
              {visible.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-4">
              {visible.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <RecentActivity />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  stat,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  stat: { value: number; delta: number };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 rounded-[18px] border border-line bg-subtle/70 p-4 text-left transition hover:border-line-strong hover:bg-white sm:p-5"
    >
      <span className="hidden size-13 shrink-0 place-items-center rounded-full bg-gold-soft/80 text-gold-strong sm:grid">
        <Icon className="size-6" strokeWidth={1.6} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] text-ink-soft sm:text-[15px]">{label}</span>
        <span className="mt-1 flex items-end gap-3">
          <span className="text-[28px] leading-none font-semibold tracking-tight tabular-nums sm:text-[32px]">{stat.value}</span>
          <span className="pb-0.5 text-[11.5px] leading-tight text-muted">
            {stat.delta > 0 ? (
              <span className="flex items-center gap-0.5 font-medium text-success">
                <ArrowUp className="size-3" strokeWidth={2.4} />+{stat.delta}
              </span>
            ) : (
              <span className="block text-faint">no change</span>
            )}
            <span className="block">last 30 days</span>
          </span>
        </span>
      </span>
    </button>
  );
}

function ViewButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={clsx('grid h-full w-10 place-items-center rounded-lg transition', active ? 'bg-sand text-ink' : 'text-muted hover:text-ink')}
    >
      <Icon className="size-[18px]" strokeWidth={1.8} />
    </button>
  );
}

function RecentActivity() {
  const { data: entries, isLoading } = useActivity(9);
  return (
    <Card className="p-5 sm:p-6 xl:sticky xl:top-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[21px] font-semibold tracking-[-0.02em]">Recent Activity</h2>
        <Link to="/activity" className="text-[14px] text-muted transition hover:text-ink">
          View all
        </Link>
      </div>
      <div className="mt-3">
        {isLoading ? (
          <PageLoader />
        ) : !entries?.length ? (
          <p className="py-8 text-center text-[14.5px] text-muted">Activity you log on projects will show up here.</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((entry) => (
                <li key={entry.id}>
                  <Link to={`/projects/${entry.project_id}`} className="group flex items-center gap-4 py-3.5">
                    <span className="relative size-[60px] shrink-0 overflow-hidden rounded-2xl border border-line bg-subtle">
                      <PlaceholderArt seed={entry.project_id} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">
                        {entry.title}
                      </span>
                      <span className="block truncate text-[13.5px] text-muted">{entry.project_name}</span>
                      <span className="block text-[12.5px] text-faint">{relativeTime(entry.occurred_at)}</span>
                    </span>
                  </Link>
                </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
