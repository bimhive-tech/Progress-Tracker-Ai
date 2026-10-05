import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Archive, ArchiveRestore, ChevronLeft, Ellipsis, FileQuestion, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useProject, useRefreshProject } from '../lib/hooks';
import { computeAutoStatus } from '../lib/progress';
import type { Project, ProjectStatus } from '../lib/types';
import { useToast } from '../components/feedback';
import { useProjectActions } from '../components/ProjectCard';
import { ArchivedBadge, StatusPicker } from '../components/status';
import { Button, Card, EmptyState, Menu, MenuDivider, MenuItem, PageLoader } from '../components/ui';
import { ChecklistPanel } from '../components/project/ChecklistPanel';
import { OverviewPanel } from '../components/project/OverviewPanel';
import { ActivityPanel } from '../components/project/ActivityPanel';
import { DetailsCard } from '../components/project/DetailsCard';

export function ProjectPage() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useProject(id);
  const [editingDetails, setEditingDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (data) document.title = data.project.name;
  }, [data]);

  if (isLoading) return <PageLoader />;
  if (error || !data) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Project not found"
          action={
            <Button variant="primary" icon={ChevronLeft} onClick={() => navigate('/')}>
              Back to projects
            </Button>
          }
        >
          {error ? (error as Error).message : 'It may have been deleted.'}
        </EmptyState>
      </Card>
    );
  }

  const { project, items, activity } = data;
  // Reflect checklist changes instantly while the server catches up.
  const status: ProjectStatus = project.status_mode === 'auto' ? computeAutoStatus(items.map((i) => i.state)) : project.status;

  return (
    <div className="space-y-5">
      <ProjectHeader
        project={{ ...project, status }}
        onEdit={() => {
          setEditingDetails(true);
          requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] wide:grid-cols-[minmax(320px,370px)_minmax(0,1fr)_minmax(320px,370px)]">
        <ChecklistPanel project={project} items={items} className="lg:row-span-2 wide:row-span-1" />
        <OverviewPanel project={project} items={items} className="order-first lg:order-none" />
        <ActivityPanel projectId={project.id} entries={activity} />
      </div>

      <DetailsCard ref={detailsRef} project={project} editing={editingDetails} onEditingChange={setEditingDetails} />
    </div>
  );
}

function ProjectHeader({ project, onEdit }: { project: Project; onEdit: () => void }) {
  const refresh = useRefreshProject();
  const toast = useToast();
  const { toggleArchive, deleteProject } = useProjectActions();

  const setStatus = useMutation({
    mutationFn: (change: { status?: ProjectStatus; status_mode?: 'auto' }) => api.updateProject(project.id, change),
    onSuccess: () => refresh(project.id),
    onError: toast.error,
  });

  const subtitle = [project.code, project.location, project.client].filter(Boolean).join(' · ');

  return (
    <Card className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-5 sm:p-7">
      <div className="min-w-0">
        <Link to="/" className="inline-flex items-center gap-1 text-[14px] text-muted transition hover:text-ink">
          <ChevronLeft className="size-4" />
          All projects
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.035em] break-words text-ink sm:text-[44px]">{project.name}</h1>
          <StatusPicker project={project} onChange={(change) => setStatus.mutate(change)} />
          {project.archived && <ArchivedBadge />}
        </div>
        {subtitle ? (
          <p className="mt-1.5 text-lg text-muted sm:text-xl">{subtitle}</p>
        ) : (
          <button onClick={onEdit} className="mt-1.5 text-lg text-faint transition hover:text-muted sm:text-xl">
            Add client, location and reference…
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button icon={Pencil} onClick={onEdit} className="h-11 rounded-2xl px-4 sm:h-12 sm:px-5">
          Edit details
        </Button>
        <Menu
          label="More actions"
          trigger={
            <span className="grid size-11 place-items-center rounded-2xl border border-line-strong/80 sm:size-12 bg-white text-ink-soft transition hover:bg-subtle">
              <Ellipsis className="size-5" />
            </span>
          }
        >
          <MenuItem icon={project.archived ? ArchiveRestore : Archive} onSelect={() => toggleArchive(project)}>
            {project.archived ? 'Restore from archive' : 'Archive project'}
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={Trash2} danger onSelect={() => deleteProject(project, { redirect: true })}>
            Delete project
          </MenuItem>
        </Menu>
      </div>
    </Card>
  );
}
