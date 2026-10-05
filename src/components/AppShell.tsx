import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import clsx from 'clsx';
import { ChevronDown, CircleHelp, Plus, Search } from 'lucide-react';
import { initials } from '../lib/format';
import { useAuthorName, useConfig, useProjects } from '../lib/hooks';
import { LogoMark, PlaceholderArt } from './art';
import { useNewProject } from './NewProjectModal';
import { StatusBadge } from './status';
import { Button, Menu, Modal, useCloseMenu } from './ui';

export function AppShell({ children }: { children: ReactNode }) {
  const { data: config } = useConfig();
  const openNewProject = useNewProject();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-[1640px] px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:gap-5">
          <Link
            to="/"
            className="flex h-13 items-center gap-2.5 rounded-full bg-gradient-to-b from-[#3b3a37] to-[#232220] pr-6 pl-4 text-white shadow-[0_8px_20px_-10px_rgb(0_0_0/0.6)] sm:h-14 sm:pr-7 sm:pl-5"
          >
            <LogoMark className="size-7 text-[#e3d1a7]" />
            <span className="text-lg font-semibold tracking-tight">{config?.appName ?? 'CAD2BIM'}</span>
          </Link>

          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-full border border-line/80 bg-white p-1.5 shadow-card scrollbar-none sm:w-auto lg:order-none lg:shrink-0">
            <TopLink to="/" match={(path) => path === '/' || path.startsWith('/projects')}>
              Projects
            </TopLink>
            <TopLink to="/templates">Templates</TopLink>
            <TopLink to="/activity">Activity</TopLink>
          </nav>

          <div className="order-4 w-full lg:order-none lg:ml-auto lg:w-auto lg:max-w-[380px] lg:min-w-[180px] lg:flex-1">
            <GlobalSearch />
          </div>

          <Button variant="primary" icon={Plus} onClick={openNewProject} className="ml-auto h-12 rounded-full px-5 lg:ml-0">
            New Project
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1640px] flex-1 px-4 py-5 sm:px-6">{children}</main>

      <footer className="mx-auto flex w-full max-w-[1640px] items-center justify-between px-4 pb-5 sm:px-6">
        <NameChip />
        <HelpButton />
      </footer>
    </div>
  );
}

function TopLink({ to, children, match }: { to: string; children: ReactNode; match?: (path: string) => boolean }) {
  const location = useLocation();
  return (
    <NavLink
      to={to}
      className={({ isActive }) => {
        const active = match ? match(location.pathname) : isActive;
        return clsx(
          'flex h-10 flex-1 items-center justify-center rounded-full px-5 text-[15px] whitespace-nowrap transition sm:h-11 sm:flex-none sm:px-7',
          active ? 'bg-sand font-medium text-ink' : 'text-ink-soft hover:bg-[#f6f4f0]',
        );
      }}
    >
      {children}
    </NavLink>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { data: projects } = useProjects();
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    if (location.pathname !== '/') setQuery('');
  }, [location.pathname]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !projects) return [];
    return projects
      .filter((p) => [p.name, p.code, p.client, p.location, p.category].some((v) => v?.toLowerCase().includes(q)))
      .slice(0, 7);
  }, [projects, query]);

  const submit = () => {
    const pick = results[active];
    if (pick) navigate(`/projects/${pick.id}`);
    else navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted" />
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          } else if (event.key === 'Escape') {
            setOpen(false);
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Search projects, clients, locations…"
        aria-label="Search projects"
        className="h-12 w-full rounded-full border border-line/80 bg-white pr-4 pl-11 text-[14.5px] shadow-card outline-none transition placeholder:text-faint focus:border-gold focus:ring-4 focus:ring-gold/15"
      />
      {open && query.trim() && (
        <div className="animate-pop-in absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-pop">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-[14px] text-muted">No projects match “{query.trim()}”</div>
          ) : (
            results.map((project, index) => (
              <button
                key={project.id}
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  navigate(`/projects/${project.id}`);
                  setOpen(false);
                }}
                className={clsx('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left', index === active && 'bg-[#f4f2ee]')}
              >
                <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-[#efede8]">
                  <PlaceholderArt seed={project.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-ink">{project.name}</span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {[project.code, project.client, project.location].filter(Boolean).join(' · ') || 'No details yet'}
                  </span>
                </span>
                <StatusBadge status={project.status} size="sm" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NameChip() {
  const [name, setName] = useAuthorName();
  return (
    <Menu
      align="left"
      label="Your name"
      panelClassName="w-72 p-3"
      trigger={
        <span className="flex items-center gap-3 rounded-full py-1 pr-2 transition hover:bg-black/[0.03]">
          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-b from-[#cdb98a] to-[#a68f58] text-sm font-semibold text-white shadow-sm">
            {name ? initials(name) : '?'}
          </span>
          <span className="text-[15px] font-medium text-ink-soft">{name || 'Set your name'}</span>
          <ChevronDown className="size-4 text-muted" />
        </span>
      }
    >
      <NameForm name={name} onSave={setName} />
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
      <p className="mb-2 text-[13px] text-muted">Your name is added to activity entries you log from this browser.</p>
      <input className="field" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Yousef" autoFocus maxLength={120} />
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
      <button
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-black/[0.04] hover:text-ink"
        aria-label="How this works"
        title="How this works"
      >
        <CircleHelp className="size-[22px]" strokeWidth={1.6} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="How the tracker works" size="md">
        <div className="space-y-4 text-[15px] leading-relaxed text-ink-soft">
          <HelpItem title="Checklist">
            Each project has a checklist of steps. Click a step’s circle to tick it off, or open it to mark it <em>in progress</em> with a
            percentage. Drag steps to reorder them. Templates let you start new projects with a ready-made checklist.
          </HelpItem>
          <HelpItem title="Automatic status">
            While a project is on <strong>Auto</strong>, its status follows the checklist: <em>Not started</em> until a step begins,{' '}
            <em>Processing</em> once work is underway, and <em>Completed</em> when every step is done. Pick any status from the badge to set
            it manually (e.g. <em>In review</em> or <em>On hold</em>), and switch back to Automatic whenever you like.
          </HelpItem>
          <HelpItem title="Activity log">
            Log what happened and when — data gathered, processed in Blender, sent for review. Entries are entered by you, can be back-dated,
            and show up in the project and on the dashboard.
          </HelpItem>
        </div>
      </Modal>
    </>
  );
}

function HelpItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-0.5 font-semibold text-ink">{title}</h3>
      <p>{children}</p>
    </div>
  );
}
