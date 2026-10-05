import { Link, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Ellipsis, ExternalLink, ListChecks, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { dueInfo, formatDate, relativeTime } from '../lib/format';
import { useRefreshProject } from '../lib/hooks';
import type { Project } from '../lib/types';
import { PlaceholderArt } from './art';
import { useConfirm, useToast } from './feedback';
import { ArchivedBadge, StatusBadge } from './status';
import { Menu, MenuDivider, MenuItem, ProgressBar } from './ui';

export function useProjectActions() {
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefreshProject();
  const navigate = useNavigate();

  const archive = useMutation({
    mutationFn: (project: Project) => api.updateProject(project.id, { archived: !project.archived }),
    onSuccess: (project) => {
      toast.success(project.archived ? `Archived “${project.name}”` : `Restored “${project.name}”`);
      return refresh(project.id);
    },
    onError: toast.error,
  });

  const remove = useMutation({
    mutationFn: (project: Project) => api.deleteProject(project.id),
    onSuccess: (_data, project) => {
      toast.success(`Deleted “${project.name}”`);
      return refresh();
    },
    onError: toast.error,
  });

  return {
    toggleArchive: (project: Project) => archive.mutateAsync(project).catch(() => {}),
    deleteProject: async (project: Project, options: { redirect?: boolean } = {}) => {
      const ok = await confirm({
        title: `Delete “${project.name}”?`,
        message: 'This permanently removes the project with its checklist, activity log, images and files. This can’t be undone.',
        confirmLabel: 'Delete project',
        danger: true,
      });
      if (!ok) return;
      await remove.mutateAsync(project).catch(() => {});
      if (options.redirect) navigate('/');
    },
  };
}

function ProjectMenu({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { toggleArchive, deleteProject } = useProjectActions();
  return (
    <Menu
      label="Project actions"
      trigger={
        <span className="grid size-8 place-items-center rounded-xl text-ink-soft transition hover:bg-black/[0.05]">
          <Ellipsis className="size-5" />
        </span>
      }
    >
      <MenuItem icon={ExternalLink} onSelect={() => navigate(`/projects/${project.id}`)}>
        Open project
      </MenuItem>
      <MenuItem icon={project.archived ? ArchiveRestore : Archive} onSelect={() => toggleArchive(project)}>
        {project.archived ? 'Restore from archive' : 'Archive'}
      </MenuItem>
      <MenuDivider />
      <MenuItem icon={Trash2} danger onSelect={() => deleteProject(project)}>
        Delete
      </MenuItem>
    </Menu>
  );
}

function stepsLabel(project: Project) {
  if (!project.items_total) return 'No checklist';
  return `${project.items_done}/${project.items_total} steps`;
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group relative flex flex-col rounded-[20px] border border-line bg-white p-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card focus-visible:ring-4 focus-visible:ring-gold/25 focus-visible:outline-none"
    >
      <div className="relative aspect-[16/9.5] overflow-hidden rounded-[15px] bg-[#efede8]">
        <PlaceholderArt seed={project.id} className="transition duration-500 group-hover:scale-[1.03]" />
        <StatusBadge status={project.status} variant="floating" size="sm" className="absolute top-3 right-3" />
        {project.archived && <ArchivedBadge className="absolute top-3 left-3" />}
      </div>
      <div className="flex items-start gap-2 px-3 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{project.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[13.5px] text-muted">
            <ListChecks className="size-[15px] shrink-0" strokeWidth={1.8} />
            <span>{stepsLabel(project)}</span>
            <span className="text-faint">•</span>
            <span className="truncate">Updated {relativeTime(project.updated_at)}</span>
          </p>
        </div>
        <ProjectMenu project={project} />
      </div>
      {project.items_total > 0 && (
        <div className="flex items-center gap-3 px-3 pb-3">
          <ProgressBar value={project.progress} className="h-1.5 flex-1" tone={project.progress === 100 ? 'green' : 'gold'} />
          <span className="text-xs font-medium text-muted tabular-nums">{project.progress}%</span>
        </div>
      )}
    </Link>
  );
}

export function ProjectRow({ project }: { project: Project }) {
  const due = dueInfo(project.due_date, project.status === 'completed');
  return (
    <Link
      to={`/projects/${project.id}`}
      className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-2 py-2.5 transition hover:bg-subtle md:grid-cols-[56px_minmax(0,2fr)_150px_minmax(0,1.2fr)_130px_40px]"
    >
      <div className="relative size-14 overflow-hidden rounded-xl bg-[#efede8]">
        <PlaceholderArt seed={project.id} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-ink">{project.name}</span>
          {project.archived && <Archive className="size-3.5 shrink-0 text-faint" aria-label="Archived" />}
        </div>
        <div className="truncate text-[13.5px] text-muted">
          {[project.client, project.location].filter(Boolean).join(' · ') || `Updated ${relativeTime(project.updated_at)}`}
        </div>
      </div>
      <div className="hidden md:block">
        <StatusBadge status={project.status} size="sm" />
      </div>
      <div className="hidden items-center gap-3 md:flex">
        {project.items_total ? (
          <>
            <ProgressBar value={project.progress} className="h-1.5 flex-1" tone={project.progress === 100 ? 'green' : 'gold'} />
            <span className="w-9 text-right text-xs font-medium text-muted tabular-nums">{project.progress}%</span>
          </>
        ) : (
          <span className="text-[13px] text-faint">No checklist</span>
        )}
      </div>
      <div className="hidden text-[13.5px] md:block">
        <div className="text-ink-soft">{project.due_date ? formatDate(project.due_date) : '—'}</div>
        {project.due_date && (
          <div className={due.tone === 'late' ? 'text-danger' : due.tone === 'warn' ? 'text-[#b86e1f]' : 'text-faint'}>{due.label}</div>
        )}
      </div>
      <div className="flex justify-end">
        <ProjectMenu project={project} />
      </div>
    </Link>
  );
}
