import { useMemo, type Ref } from 'react';
import clsx from 'clsx';
import { FolderPlus, SearchX } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { dueInfo } from '../lib/format';
import { useSelection } from '../lib/selection';
import type { Project } from '../lib/types';
import { PlaceholderArt } from '../components/art';
import { useNewProject } from '../components/NewProjectModal';
import { StatusIcon } from '../components/status';
import { Button, EmptyState, PageLoader, ProgressBar } from '../components/ui';
import { FilterMenu, SearchBox, SortMenu } from './controls';
import { filterCounts, matchesFilter, matchesQuery, sortProjects, type Filter, type Sort } from './filters';

export function ProjectSidebar({
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
  onPicked,
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
  /** Called after a project is picked (closes the mobile drawer). */
  onPicked?: () => void;
}) {
  const openNewProject = useNewProject();
  const { canEdit } = useAuth();
  const { select } = useSelection();
  const counts = useMemo(() => filterCounts(projects ?? []), [projects]);
  const visible = useMemo(
    () => sortProjects((projects ?? []).filter((p) => matchesFilter(p, filter) && matchesQuery(p, query)), sort),
    [projects, filter, query, sort],
  );
  const filtered = filter !== 'all' || !!query.trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2.5 px-3 pt-4 pb-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-serif text-[17px] font-medium text-ink">
            Projects <span className="ml-1 font-sans text-[13px] font-normal text-faint">{counts.all ?? 0}</span>
          </h2>
          <SortMenu sort={sort} onSort={onSort} className="-mr-2" />
        </div>
        <SearchBox
          value={query}
          onChange={onQuery}
          inputRef={searchRef}
          onEnter={() => {
            if (!visible[0]) return;
            select(visible[0].id);
            onPicked?.();
          }}
        />
        <FilterMenu filter={filter} onFilter={onFilter} counts={counts} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <PageLoader className="py-16" />
        ) : error ? (
          <EmptyState icon={SearchX} title="Couldn’t load projects">
            {error.message}
          </EmptyState>
        ) : !projects?.length ? (
          <EmptyState
            icon={FolderPlus}
            title="No projects yet"
            action={
              canEdit && (
                <Button variant="primary" size="sm" icon={FolderPlus} onClick={openNewProject}>
                  New project
                </Button>
              )
            }
          >
            {canEdit ? 'Create a project to start tracking it.' : 'Projects will show up here once an admin adds them.'}
          </EmptyState>
        ) : !visible.length ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[14px] font-medium text-ink-soft">No matching projects</p>
            <p className="mt-1 text-[13px] text-muted">{query.trim() ? `Nothing matches “${query.trim()}” in this view.` : 'Nothing in this view yet.'}</p>
            {filtered && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-3"
                onClick={() => {
                  onQuery('');
                  onFilter('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((project) => (
              <li key={project.id}>
                <ProjectListItem project={project} onPicked={onPicked} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProjectListItem({ project, onPicked }: { project: Project; onPicked?: () => void }) {
  const { selectedId, select } = useSelection();
  const selected = selectedId === project.id;
  const completed = project.status === 'completed';
  const due = dueInfo(project.due_date, completed);
  const subtitle = [project.code, project.client].filter(Boolean).join(' · ') || project.location || 'No details yet';

  return (
    <button
      onClick={() => {
        select(project.id);
        onPicked?.();
      }}
      aria-current={selected ? 'true' : undefined}
      className={clsx(
        'group relative flex w-full items-start gap-3 px-2.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/35',
        selected ? 'bg-raised' : 'hover:bg-white/[0.035]',
        project.archived && !selected && 'opacity-70',
      )}
    >
      {selected && <span className="absolute top-3 bottom-3 left-0 w-[3px] bg-accent" aria-hidden />}
      <span className="relative mt-0.5 size-10 shrink-0 overflow-hidden border border-line bg-canvas">
        <PlaceholderArt seed={project.id} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={clsx('truncate text-[13.5px] font-medium', selected ? 'text-ink' : 'text-ink-soft group-hover:text-ink')}>{project.name}</span>
          <StatusIcon status={project.status} className="ml-auto" />
        </span>
        <span className="block truncate text-[12px] text-muted">{subtitle}</span>
        <span className="mt-1.5 flex items-center gap-2">
          {project.items_total ? (
            <>
              <ProgressBar value={project.progress} className="h-1 flex-1" />
              <span className="w-8 text-right text-[11px] text-muted tabular-nums">{project.progress}%</span>
            </>
          ) : (
            <span className="flex-1 text-[11.5px] text-faint">No checklist</span>
          )}
        </span>
        {project.due_date && !completed && (
          <span
            className={clsx(
              'mt-1 block text-[11.5px]',
              due.tone === 'late' ? 'text-danger' : due.tone === 'warn' ? 'text-warn' : 'text-faint',
            )}
          >
            {due.label}
          </span>
        )}
      </span>
    </button>
  );
}
