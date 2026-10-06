import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type View = 'overview' | 'project';

type Navigation = {
  view: View;
  selectedId: string | null;
  /** Selects a project without changing the view. `replace` swaps the history entry instead of adding one (for automatic picks). */
  select: (id: string | null, options?: { replace?: boolean }) => void;
  /** Opens a project in the project workspace. */
  openProject: (id: string) => void;
  setView: (view: View) => void;
};

const NavigationContext = createContext<Navigation | null>(null);
const VIEW_KEY = 'tracker.view';

function readFromUrl(): { view: View; selectedId: string | null } {
  const params = new URLSearchParams(window.location.search);
  const selectedId = params.get('project');
  let view: View;
  if (params.get('view') === 'overview') view = 'overview';
  else if (selectedId) view = 'project';
  else {
    try {
      view = localStorage.getItem(VIEW_KEY) === 'project' ? 'project' : 'overview';
    } catch {
      view = 'overview';
    }
  }
  return { view, selectedId };
}

function writeToUrl(state: { view: View; selectedId: string | null }, replace?: boolean) {
  const url = new URL(window.location.href);
  if (state.view === 'overview') url.searchParams.set('view', 'overview');
  else url.searchParams.delete('view');
  if (state.selectedId) url.searchParams.set('project', state.selectedId);
  else url.searchParams.delete('project');
  if (url.href === window.location.href) return;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

/** Links from the old multi-page app (/projects/:id, /templates, /activity) all land on the dashboard. */
function migrateLegacyUrl() {
  const { pathname } = window.location;
  if (pathname === '/') return;
  const legacyId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const url = new URL(window.location.href);
  url.pathname = '/';
  if (legacyId && !url.searchParams.has('project')) url.searchParams.set('project', decodeURIComponent(legacyId));
  window.history.replaceState(null, '', url);
}

/**
 * The current view and selected project live in the URL (`?view=overview`, `?project=<id>`),
 * so they survive reloads, can be shared, and work with Back/Forward.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    migrateLegacyUrl();
    return readFromUrl();
  });

  const stateRef = useRef(state);

  useEffect(() => {
    const onPop = () => {
      stateRef.current = readFromUrl();
      setState(stateRef.current);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, state.view);
    } catch {
      /* storage unavailable */
    }
  }, [state.view]);

  const navigate = useCallback((patch: Partial<typeof state>, replace?: boolean) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    writeToUrl(next, replace);
    setState(next);
  }, []);

  const value = useMemo<Navigation>(
    () => ({
      ...state,
      select: (id, options = {}) => navigate({ selectedId: id }, options.replace),
      openProject: (id) => navigate({ selectedId: id, view: 'project' }),
      setView: (view) => navigate({ view }),
    }),
    [state, navigate],
  );
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useSelection() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useSelection must be used inside SelectionProvider');
  return ctx;
}
