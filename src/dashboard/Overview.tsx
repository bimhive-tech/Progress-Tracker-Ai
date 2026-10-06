import { useMemo, useState, type Ref } from 'react';
import clsx from 'clsx';
import { ArrowRight, Check, ChevronDown, LayoutDashboard, SearchX } from 'lucide-react';
import { dueInfo, formatDay } from '../lib/format';
import { useChecklists } from '../lib/hooks';
import { computeProgress, currentStep } from '../lib/progress';
import { useSelection } from '../lib/selection';
import type { ChecklistItem, ChecklistState, Project } from '../lib/types';
import { PlaceholderArt } from '../components/art';
import { StatusBadge } from '../components/status';
import { Button, EmptyState, PageLoader } from '../components/ui';
import { FilterMenu, SearchBox, SortMenu } from './controls';
import { filterCounts, matchesFilter, matchesQuery, sortProjects, type Filter, type Sort } from './filters';

const COLLAPSED_STEPS = 8;

/** Portfolio board: every project with its whole checklist, so you can see what's done and what's left. */
export function Overview({
  projects,
  isLoading,
  error,
  filter,
  onFilter,
  sort,
  onSort,
  query,
  onQuery,
  searchRef,
}: {
  projects: Project[] | undefined;
  isLoading: boolean;
  error: Error | null;
  filter: string;
  onFilter: (filter: Filter) => void;
  sort: string;
  onSort: (sort: Sort) => void;
  query: string;
  onQuery: (query: string) => void;
  searchRef: Ref<HTMLInputElement>;
}) {
  const checklists = useChecklists();
  const counts = useMemo(() => filterCounts(projects ?? []), [projects]);
  const visible = useMemo(
    () => sortProjects((projects ?? []).filter((p) => matchesFilter(p, filter) && matchesQuery(p, query)), sort),
    [projects, filter, query, sort],
  );
  const byProject = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of checklists.data ?? []) {
      const list = map.get(item.project_id);
      if (list) list.push(item);
      else map.set(item.project_id, [item]);
    }
    return map;
  }, [checklists.data]);

  const totals = useMemo(() => {
    let steps = 0;
    let done = 0;
    for (const project of visible) {
      const items = byProject.get(project.id) ?? [];
      steps += items.length;
      done += items.filter((i) => i.state === 'done').length;
    }
    return { steps, done };
  }, [visible, byProject]);

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-serif text-[28px] leading-tight font-medium tracking-[-0.02em] text-ink sm:text-[32px]">Overview</h1>
          <p className="mt-1 text-[14.5px] text-muted">Every project’s checklist at a glance: what’s done, what’s in progress and what’s still to do.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SearchBox value={query} onChange={onQuery} inputRef={searchRef} className="w-full sm:w-64" />
          <FilterMenu filter={filter} onFilter={onFilter} counts={counts} className="min-w-0 flex-1 sm:w-48 sm:flex-none" />
          <SortMenu sort={sort} onSort={onSort} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-line py-2.5 text-[12.5px] text-muted">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <span className="flex items-center gap-2">
            <StepMarker state="done" /> Done
          </span>
          <span className="flex items-center gap-2">
            <StepMarker state="in_progress" /> In progress
          </span>
          <span className="flex items-center gap-2">
            <StepMarker state="pending" /> To do
          </span>
        </div>
        {visible.length > 0 && (
          <span>
            {visible.length} project{visible.length === 1 ? '' : 's'} ·{' '}
            <span className="font-medium text-ink-soft">
              {totals.done} of {totals.steps}
            </span>{' '}
            steps done
          </span>
        )}
      </div>

      <div className="mt-5">
        {isLoading || checklists.isLoading ? (
          <PageLoader />
        ) : error ? (
          <EmptyState icon={SearchX} title="Couldn’t load projects">
            {error.message}
          </EmptyState>
        ) : !projects?.length ? (
          <EmptyState icon={LayoutDashboard} title="No projects yet">
            Projects and their checklists will show up here.
          </EmptyState>
        ) : !visible.length ? (
          <EmptyState
            icon={SearchX}
            title="No matching projects"
            action={
              <Button
                size="sm"
                onClick={() => {
                  onQuery('');
                  onFilter('all');
                }}
              >
                Clear filters
              </Button>
            }
          >
            {query.trim() ? `Nothing matches “${query.trim()}” in this view.` : 'Nothing in this view yet.'}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
            {visible.map((project) => (
              <ProjectBoard key={project.id} project={project} items={byProject.get(project.id) ?? []} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectBoard({ project, items }: { project: Project; items: ChecklistItem[] }) {
  const { openProject } = useSelection();
  const [expanded, setExpanded] = useState(false);
  const progress = computeProgress(items);
  const current = currentStep(items);
  const done = items.filter((i) => i.state === 'done').length;
  const active = items.filter((i) => i.state === 'in_progress').length;
  const completed = project.status === 'completed';
  const due = dueInfo(project.due_date, completed);
  const shown = expanded ? items : items.slice(0, COLLAPSED_STEPS);
  const subtitle = [project.code, project.client].filter(Boolean).join(' · ') || project.location || 'No details yet';

  return (
    <article className="flex flex-col border border-line bg-surface shadow-card">
      <button onClick={() => openProject(project.id)} className="group flex items-start gap-3 px-4 pt-4 pb-3 text-left" title={`Open ${project.name}`}>
        <span className="size-11 shrink-0 overflow-hidden border border-line bg-sidebar">
          <PlaceholderArt seed={project.id} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink group-hover:text-accent-text">{project.name}</span>
          <span className="block truncate text-[12.5px] text-muted">{subtitle}</span>
        </span>
        <StatusBadge status={project.status} size="sm" className="shrink-0" />
      </button>

      <div className="px-4">
        {items.length ? <StepBar items={items} /> : <div className="h-2 bg-white/[0.06]" />}
        <div className="mt-2 flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
          <span>
            {items.length ? (
              <>
                <span className="font-medium text-ink-soft">
                  {done} of {items.length}
                </span>{' '}
                done{active ? ` · ${active} in progress` : ''}
              </>
            ) : (
              'No checklist yet'
            )}
          </span>
          <span className="text-[15px] font-semibold text-ink">{progress}%</span>
        </div>
      </div>

      {items.length > 0 && (
        <ol className="mt-3 border-t border-line py-1.5">
          {shown.map((item) => {
            const isCurrent = item.id === current?.id;
            return (
              <li
                key={item.id}
                className={clsx(
                  'flex items-center gap-2.5 border-l-2 px-3.5 py-[5px] text-[13px]',
                  isCurrent ? 'border-accent bg-accent-wash' : 'border-transparent',
                )}
              >
                <StepMarker state={item.state} />
                <span
                  className={clsx(
                    'min-w-0 flex-1 truncate',
                    item.state === 'done' ? 'text-muted' : item.state === 'in_progress' ? 'font-medium text-ink' : 'text-ink-soft',
                  )}
                  title={item.note ? `${item.title} — ${item.note}` : item.title}
                >
                  {item.title}
                </span>
                {item.state === 'in_progress' ? (
                  <span className="shrink-0 font-medium text-accent-text tabular-nums">{item.progress}%</span>
                ) : isCurrent ? (
                  <span className="shrink-0 text-[11.5px] font-semibold tracking-wide text-accent-text uppercase">Next</span>
                ) : item.state === 'done' && item.completed_at ? (
                  <span className="shrink-0 text-[12px] text-faint">{formatDay(item.completed_at)}</span>
                ) : null}
              </li>
            );
          })}
          {items.length > COLLAPSED_STEPS && (
            <li>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center gap-1.5 px-4 py-1.5 text-[12.5px] font-medium text-muted transition hover:text-ink"
              >
                <ChevronDown className={clsx('size-3.5 transition', expanded && 'rotate-180')} />
                {expanded ? 'Show fewer steps' : `Show ${items.length - COLLAPSED_STEPS} more step${items.length - COLLAPSED_STEPS === 1 ? '' : 's'}`}
              </button>
            </li>
          )}
        </ol>
      )}

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[12.5px]">
        <span className={due.tone === 'late' ? 'text-danger' : due.tone === 'warn' ? 'text-warn' : 'text-faint'}>
          {project.due_date ? (completed ? `Was due ${formatDay(project.due_date)}` : `${due.label} · ${formatDay(project.due_date)}`) : 'No due date'}
        </span>
        <button onClick={() => openProject(project.id)} className="flex items-center gap-1 font-medium text-accent-text transition hover:text-ink">
          Open <ArrowRight className="size-3.5" />
        </button>
      </footer>
    </article>
  );
}

/** One segment per checklist step: green when done, gold (filled to its %) when in progress, empty when still to do. */
function StepBar({ items }: { items: ChecklistItem[] }) {
  return (
    <div className="flex h-2 gap-[2px]" role="img" aria-label={`${items.filter((i) => i.state === 'done').length} of ${items.length} steps done`}>
      {items.map((item) => (
        <span
          key={item.id}
          title={`${item.title} — ${item.state === 'done' ? 'done' : item.state === 'in_progress' ? `in progress (${item.progress}%)` : 'to do'}`}
          className={clsx('relative min-w-1 flex-1', item.state === 'done' ? 'bg-success-solid' : item.state === 'in_progress' ? 'bg-accent-soft' : 'bg-white/[0.08]')}
        >
          {item.state === 'in_progress' && <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${item.progress}%` }} />}
        </span>
      ))}
    </div>
  );
}

function StepMarker({ state }: { state: ChecklistState }) {
  if (state === 'done') {
    return (
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success-solid text-white">
        <Check className="size-2.5" strokeWidth={3.5} />
      </span>
    );
  }
  if (state === 'in_progress') {
    return (
      <span className="grid size-4 shrink-0 place-items-center rounded-full border-2 border-accent">
        <span className="size-1.5 rounded-full bg-accent" />
      </span>
    );
  }
  return <span className="size-4 shrink-0 rounded-full border-2 border-line-strong" />;
}
