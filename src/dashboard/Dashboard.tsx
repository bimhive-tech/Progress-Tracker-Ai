import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useConfig, useLocalSetting, useMediaQuery, useProjects } from '../lib/hooks';
import { useSelection } from '../lib/selection';
import { IconButton } from '../components/ui';
import { portfolioStats, sortProjects, type Filter } from './filters';
import { Overview } from './Overview';
import { ProjectSidebar } from './ProjectSidebar';
import { ProjectWorkspace } from './ProjectWorkspace';
import { SideRail } from './SideRail';
import { StatStrip, TopBar } from './TopBar';

/**
 * Top bar and portfolio numbers, then one of two views:
 *   Overview — every project with its whole checklist.
 *   Projects — project list | selected project | activity & templates.
 *     Narrower screens fold the right column under the project and move the list into a drawer.
 */
export function Dashboard() {
  const { data: projects, isLoading, error } = useProjects();
  const { data: config } = useConfig();
  const { view, selectedId, select } = useSelection();
  const [filter, setFilter] = useLocalSetting('hub.filter', 'all');
  const [sort, setSort] = useLocalSetting('hub.sort', 'updated');
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isXl = useMediaQuery('(min-width: 1280px)');

  const stats = useMemo(() => (projects ? portfolioStats(projects) : null), [projects]);
  const selected = projects?.find((p) => p.id === selectedId) ?? null;

  // Always have a project open: keep the current one, or fall back to the most recently updated.
  useEffect(() => {
    if (!projects) return;
    if (selectedId && projects.some((p) => p.id === selectedId)) return;
    const fallback = sortProjects(projects.filter((p) => !p.archived), 'updated')[0] ?? projects[0];
    select(fallback?.id ?? null, { replace: true });
  }, [projects, selectedId, select]);

  useEffect(() => {
    const appName = config?.appName ?? 'CAD2BIM';
    document.title = view === 'overview' ? `Overview · ${appName}` : selected ? `${selected.name} · ${appName}` : `${appName} · Projects`;
  }, [view, selected, config]);

  useEffect(() => {
    if (isLg || view !== 'project') setDrawerOpen(false);
  }, [isLg, view]);

  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [selectedId, view]);

  const usesDrawer = view === 'project' && !isLg;

  const focusSearch = () => {
    if (usesDrawer) setDrawerOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  // "/" or Ctrl/⌘+K jumps to project search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName);
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        if (document.querySelector('[role="dialog"]')) return;
        event.preventDefault();
        focusSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const applyFilter = (next: Filter) => {
    setFilter(next);
    if (usesDrawer && next !== 'all') setDrawerOpen(true);
  };

  const sidebar = (
    <ProjectSidebar
      projects={projects}
      isLoading={isLoading}
      error={error as Error | null}
      filter={filter}
      onFilter={setFilter}
      sort={sort}
      onSort={setSort}
      query={query}
      onQuery={setQuery}
      searchRef={searchRef}
      onPicked={isLg ? undefined : () => setDrawerOpen(false)}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-sidebar">
      <TopBar onOpenProjects={usesDrawer ? () => setDrawerOpen(true) : undefined} />
      {stats && (
        <div className="shrink-0 border-b border-line px-2 py-1.5 sm:px-3">
          <StatStrip stats={stats} filter={filter} onFilter={applyFilter} />
        </div>
      )}

      {view === 'overview' ? (
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto bg-canvas">
          <Overview
            projects={projects}
            isLoading={isLoading}
            error={error as Error | null}
            filter={filter}
            onFilter={setFilter}
            sort={sort}
            onSort={setSort}
            query={query}
            onQuery={setQuery}
            searchRef={searchRef}
          />
        </main>
      ) : (
        <div className="flex min-h-0 flex-1">
          {isLg && <aside className="flex w-[292px] shrink-0 flex-col border-r border-line">{sidebar}</aside>}

          <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto bg-canvas" id="workspace">
            <div className="mx-auto max-w-[1360px] space-y-4 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
              <ProjectWorkspace projectId={selected?.id ?? null} hasProjects={!!projects?.length} listLoading={isLoading} />
              {!isXl && <SideRail layout="stacked" />}
            </div>
          </main>

          {isXl && (
            <aside className="flex w-[372px] shrink-0 flex-col border-l border-line" aria-label="Activity and templates">
              <SideRail layout="column" />
            </aside>
          )}
        </div>
      )}

      {usesDrawer && drawerOpen && <Drawer onClose={() => setDrawerOpen(false)}>{sidebar}</Drawer>}
    </div>
  );
}

function Drawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="animate-fade-in fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="animate-slide-in flex h-full w-[86%] max-w-[320px] flex-col border-r border-line bg-sidebar shadow-pop" role="navigation" aria-label="Projects">
        <div className="flex justify-end px-2 pt-2">
          <IconButton icon={X} label="Close projects" size="md" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
