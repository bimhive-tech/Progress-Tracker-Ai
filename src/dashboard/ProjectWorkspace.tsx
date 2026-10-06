import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Clock,
  Ellipsis,
  FileQuestion,
  FileStack,
  FolderPlus,
  Hourglass,
  MapPin,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { dueInfo, formatDateSmart, formatDay } from '../lib/format';
import { useAuth } from '../lib/auth';
import { useProject, useRefreshProject } from '../lib/hooks';
import { computeAutoStatus, computeProgress, currentStep } from '../lib/progress';
import type { ChecklistItem, Project, ProjectStatus } from '../lib/types';
import { PlaceholderArt } from '../components/art';
import { useToast } from '../components/feedback';
import { useNewProject } from '../components/NewProjectModal';
import { ArchivedBadge, StatusBadge, StatusPicker } from '../components/status';
import { Button, Card, EmptyState, Menu, MenuDivider, MenuItem, PageLoader } from '../components/ui';
import { useProjectActions } from './actions';
import { ChecklistPanel } from './ChecklistPanel';
import { DetailsPanel } from './DetailsPanel';

/** The middle of the dashboard: everything about the selected project. */
export function ProjectWorkspace({ projectId, hasProjects, listLoading }: { projectId: string | null; hasProjects: boolean; listLoading: boolean }) {
  const openNewProject = useNewProject();
  const { canEdit } = useAuth();

  if (!projectId) {
    if (listLoading) return <PageLoader className="min-h-[50vh]" />;
    return (
      <Card className="py-10">
        <EmptyState
          icon={FolderPlus}
          title={hasProjects ? 'Pick a project' : canEdit ? 'Create your first project' : 'No projects yet'}
          action={
            !hasProjects &&
            canEdit && (
              <Button variant="primary" icon={FolderPlus} onClick={openNewProject}>
                New project
              </Button>
            )
          }
        >
          {hasProjects
            ? 'Choose a project from the list to see its progress, checklist and details.'
            : canEdit
              ? 'Add a project, give it a checklist, then track every step and update from this dashboard.'
              : 'Projects will show up here once an admin adds them.'}
        </EmptyState>
      </Card>
    );
  }

  return <ProjectView key={projectId} projectId={projectId} />;
}

function ProjectView({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useProject(projectId);
  const [editingDetails, setEditingDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <PageLoader className="min-h-[50vh]" />;
  if (error || !data) {
    return (
      <Card className="py-10">
        <EmptyState icon={FileQuestion} title="Project not found">
          {error ? (error as Error).message : 'It may have been deleted.'}
        </EmptyState>
      </Card>
    );
  }

  const { project, items } = data;
  // Reflect checklist changes instantly while the server catches up.
  const status: ProjectStatus = project.status_mode === 'auto' ? computeAutoStatus(items.map((i) => i.state)) : project.status;
  const live = { ...project, status };

  return (
    <div className="@container space-y-4">
      <ProjectHeader
        project={live}
        onEdit={() => {
          setEditingDetails(true);
          requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }}
      />

      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <ProgressOverview project={live} items={items} />
        <SiteCard project={project} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ChecklistPanel project={project} items={items} />
        <DetailsPanel ref={detailsRef} project={project} editing={editingDetails} onEditingChange={setEditingDetails} />
      </div>
    </div>
  );
}

function ProjectHeader({ project, onEdit }: { project: Project; onEdit: () => void }) {
  const { canEdit } = useAuth();
  const refresh = useRefreshProject();
  const toast = useToast();
  const { toggleArchive, deleteProject } = useProjectActions();

  const setStatus = useMutation({
    mutationFn: (change: { status?: ProjectStatus; status_mode?: 'auto' }) => api.updateProject(project.id, change),
    onSuccess: () => refresh(project.id),
    onError: toast.error,
  });

  const eyebrow = [project.code, project.category].filter(Boolean).join(' · ');
  const subtitle = [project.client, project.location, project.lead && `Lead: ${project.lead}`].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pt-1">
      <div className="flex min-w-0 items-start gap-4">
        <span className="hidden size-14 shrink-0 overflow-hidden border border-line bg-sidebar sm:block">
          <PlaceholderArt seed={project.id} />
        </span>
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-serif text-[28px] leading-tight font-medium tracking-[-0.02em] break-words text-ink sm:text-[32px]">{project.name}</h1>
            {canEdit ? <StatusPicker project={project} onChange={(change) => setStatus.mutate(change)} /> : <StatusBadge status={project.status} />}
            {project.archived && <ArchivedBadge />}
          </div>
          {subtitle ? (
            <p className="mt-1 text-[14.5px] text-muted">{subtitle}</p>
          ) : canEdit ? (
            <button onClick={onEdit} className="mt-1 text-[14.5px] text-faint transition hover:text-accent-text">
              Add client, location and reference…
            </button>
          ) : null}
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-2">
          <Button icon={Pencil} onClick={onEdit}>
            Edit details
          </Button>
          <Menu
            label="More actions"
            trigger={
              <span className="grid size-9 place-items-center border border-line-strong bg-white/[0.03] text-ink-soft transition hover:bg-white/[0.07] hover:text-ink">
                <Ellipsis className="size-[18px]" />
              </span>
            }
          >
            <MenuItem icon={project.archived ? ArchiveRestore : Archive} onSelect={() => toggleArchive(project)}>
              {project.archived ? 'Restore from archive' : 'Archive project'}
            </MenuItem>
            <MenuDivider />
            <MenuItem icon={Trash2} danger onSelect={() => deleteProject(project)}>
              Delete project
            </MenuItem>
          </Menu>
        </div>
      )}
    </div>
  );
}

function ProgressOverview({ project, items }: { project: Project; items: ChecklistItem[] }) {
  const progress = computeProgress(items);
  const step = currentStep(items);
  const allDone = items.length > 0 && !step;
  const doneCount = items.filter((i) => i.state === 'done').length;
  const lastDone = allDone
    ? items.reduce<string | null>((latest, i) => (i.completed_at && (!latest || i.completed_at > latest) ? i.completed_at : latest), null)
    : null;

  const eyebrow = !items.length ? 'No checklist yet' : allDone ? 'All steps complete' : step!.state === 'in_progress' ? 'Current step' : 'Up next';
  const headline = !items.length ? 'Nothing to track yet' : allDone ? 'Every step is done' : step!.title;
  const subline = !items.length
    ? 'Add steps to the checklist below to start tracking this project’s progress.'
    : allDone
      ? `The checklist is complete${lastDone ? ` — the last step finished ${formatDateSmart(lastDone)}` : ''}.`
      : step!.note || project.description || 'Work through the checklist to move this project forward.';

  const due = dueInfo(project.due_date, project.status === 'completed');

  return (
    <Card className="@container flex flex-col p-5 sm:p-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1.5 font-serif text-[23px] leading-snug font-medium tracking-[-0.015em] text-ink sm:text-[26px]">{headline}</h2>
      <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted">{subline}</p>

      <div className="mt-5 flex items-center gap-4">
        <div className={clsx('h-2.5 flex-1 overflow-hidden', allDone ? 'bg-success-soft' : 'bg-accent-soft')}>
          <div
            className={clsx('h-full transition-[width] duration-700 ease-out', allDone ? 'bg-success-solid' : 'bg-accent')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[28px] leading-none font-semibold tracking-tight text-ink">{progress}%</span>
      </div>
      <p className="mt-2 text-[13px] text-muted">
        {items.length ? (
          <>
            <span className="font-medium text-ink-soft">
              {doneCount} of {items.length}
            </span>{' '}
            steps done
            {items.some((i) => i.state === 'in_progress') && ` · ${items.filter((i) => i.state === 'in_progress').length} in progress`}
          </>
        ) : (
          'Progress is calculated from the checklist.'
        )}
      </p>

      <div className="mt-auto grid grid-cols-1 pt-4 @sm:grid-cols-3 @sm:gap-2.5 @sm:pt-5">
        <InfoTile icon={Clock} label={project.start_date ? 'Started' : 'Created'} value={formatDay(project.start_date ?? project.created_at)} />
        {project.due_date ? (
          <InfoTile
            icon={Hourglass}
            label={`Due ${formatDay(project.due_date)}`}
            value={due.label}
            tone={due.tone === 'late' ? 'text-danger' : due.tone === 'warn' ? 'text-warn' : undefined}
          />
        ) : (
          <InfoTile icon={CalendarClock} label="Due date" value="Not set" muted />
        )}
        <InfoTile icon={FileStack} label="Output types" value={project.output_types || 'Not set'} muted={!project.output_types} />
      </div>
    </Card>
  );
}

function InfoTile({ icon: Icon, label, value, tone, muted }: { icon: LucideIcon; label: string; value: string; tone?: string; muted?: boolean }) {
  return (
    // Compact label/value rows on narrow cards, boxed tiles once there's room for three across.
    <div className="flex min-w-0 items-center gap-3 border-t border-line py-2.5 @sm:border @sm:bg-sidebar/60 @sm:px-3.5 @sm:py-3">
      <Icon className="hidden size-5 shrink-0 text-faint @xl:block" strokeWidth={1.6} />
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 @sm:block">
        <div className="text-[12px] text-muted">{label}</div>
        <div className={clsx('text-right text-[14px] font-medium break-words @sm:text-left', tone ?? (muted ? 'text-faint' : 'text-ink'))}>{value}</div>
      </div>
    </div>
  );
}

/** Generated massing thumbnail with the project's key tags. */
function SiteCard({ project }: { project: Project }) {
  const tags = [project.category, project.levels, project.area].filter(Boolean) as string[];
  return (
    <Card className="relative hidden min-h-[240px] overflow-hidden @2xl:block">
      <PlaceholderArt seed={project.id} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
      {tags.length > 0 && (
        <div className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <span
              key={tag}
              className={clsx(
               ' px-2.5 py-1 text-[12px] whitespace-nowrap backdrop-blur-md',
                index === 0 ? 'bg-black/55 font-medium text-ink' : 'bg-black/40 text-ink-soft',
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {project.location && (
        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 bg-black/50 px-2.5 py-1.5 text-[12.5px] text-ink-soft backdrop-blur-md">
          <MapPin className="size-3.5 shrink-0 text-accent" strokeWidth={1.9} />
          <span className="truncate">{project.location}</span>
        </div>
      )}
    </Card>
  );
}
