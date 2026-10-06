import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { History, ListChecks, ListPlus, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { queryKeys, useActivity, useLocalSetting, useProject, useProjects, useRefreshProject, useTemplates } from '../lib/hooks';
import { stepIcon } from '../lib/meta';
import { useSelection } from '../lib/selection';
import type { ActivityEntry, Template } from '../lib/types';
import { ActivityComposer } from '../components/ActivityComposer';
import { ActivityList } from '../components/ActivityList';
import { useConfirm, useToast } from '../components/feedback';
import { TemplateEditor } from '../components/TemplateEditor';
import { Button, Card, EmptyState, IconButton, PageLoader, PanelHeader, Segmented } from '../components/ui';

/**
 * Activity log + checklist templates.
 * `column`: the dashboard's right-hand column (tabbed, scrolls on its own).
 * `stacked`: two cards below the project on narrower screens.
 */
export function SideRail({ layout }: { layout: 'column' | 'stacked' }) {
  const [tab, setTab] = useLocalSetting('rail.tab', 'activity');
  const { data: templates } = useTemplates();

  if (layout === 'stacked') {
    return (
      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card className="p-4 sm:p-5">
            <PanelHeader title="Activity" icon={History} className="mb-3" />
            <ActivityFeed />
          </Card>
          <Card className="p-4 sm:p-5">
            <PanelHeader title="Templates" icon={ListChecks} meta={templates?.length ? templates.length : undefined} className="mb-3" />
            <TemplatesPanel />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-4 pb-3">
        <Segmented
          value={tab === 'templates' ? 'templates' : 'activity'}
          onChange={setTab}
          className="w-full"
          options={[
            {
              value: 'activity',
              label: (
                <>
                  <History className="size-3.5" strokeWidth={2} /> Activity
                </>
              ),
            },
            {
              value: 'templates',
              label: (
                <>
                  <ListChecks className="size-3.5" strokeWidth={2} /> Templates
                  {!!templates?.length && <span className="text-[11.5px] font-normal text-faint">{templates.length}</span>}
                </>
              ),
            },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{tab === 'templates' ? <TemplatesPanel /> : <ActivityFeed />}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ Activity */

const PROJECT_INITIAL = 12;
const PAGE = 30;

function ActivityFeed() {
  const { canEdit } = useAuth();
  const { selectedId } = useSelection();
  const { data: projects } = useProjects();
  const [scope, setScope] = useLocalSetting('rail.scope', 'project');
  const [composer, setComposer] = useState<{ entry: ActivityEntry | null } | null>(null);
  const effective = selectedId && scope !== 'all' ? 'project' : 'all';
  const selectedName = projects?.find((p) => p.id === selectedId)?.name;

  return (
    <>
      <div className="flex items-center gap-2">
        <Segmented
          size="sm"
          value={effective}
          onChange={(value) => selectedId && setScope(value)}
          className="min-w-0 flex-1"
          options={[
            { value: 'project', label: 'This project' },
            { value: 'all', label: 'All projects' },
          ]}
        />
        {canEdit && (
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setComposer({ entry: null })} disabled={!projects?.length}>
            Log
          </Button>
        )}
      </div>
      {effective === 'project' && selectedName && <p className="mt-2 truncate text-[12.5px] text-faint">Showing updates for {selectedName}</p>}

      <div className="mt-1">
        {effective === 'project' && selectedId ? (
          <ProjectActivity projectId={selectedId} onEdit={(entry) => setComposer({ entry })} onLog={() => setComposer({ entry: null })} />
        ) : (
          <AllActivity onEdit={(entry) => setComposer({ entry })} />
        )}
      </div>

      <ActivityComposer
        open={!!composer && canEdit}
        entry={composer?.entry}
        projectId={selectedId ?? ''}
        chooseProject
        onClose={() => setComposer(null)}
      />
    </>
  );
}

function ProjectActivity({ projectId, onEdit, onLog }: { projectId: string; onEdit: (entry: ActivityEntry) => void; onLog: () => void }) {
  const { canEdit } = useAuth();
  const { data, isLoading } = useProject(projectId);
  const [showAll, setShowAll] = useState(false);
  const entries = data?.activity ?? [];
  const shown = showAll ? entries : entries.slice(0, PROJECT_INITIAL);

  if (isLoading) return <PageLoader className="py-12" />;
  if (!entries.length && !canEdit) {
    return (
      <EmptyState icon={History} title="No activity yet" className="py-8">
        Updates logged on this project will show up here.
      </EmptyState>
    );
  }
  if (!entries.length) {
    return (
      <button
        onClick={onLog}
        className="mt-3 flex w-full flex-col items-center border border-dashed border-line-strong px-4 py-8 text-center transition hover:bg-white/[0.02]"
      >
        <NotebookPen className="size-6 text-accent" strokeWidth={1.6} />
        <span className="mt-2 font-medium text-ink">No activity yet</span>
        <span className="mt-1 text-[13px] text-muted">Log updates like “Data gathered” or “Processed in Blender”.</span>
      </button>
    );
  }
  return (
    <>
      <ActivityList entries={shown} onEdit={onEdit} />
      {entries.length > PROJECT_INITIAL && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 w-full py-2 text-[13px] font-medium text-muted transition hover:bg-white/[0.04] hover:text-ink"
        >
          {showAll ? 'Show less' : `Show all ${entries.length} entries`}
        </button>
      )}
    </>
  );
}

function AllActivity({ onEdit }: { onEdit: (entry: ActivityEntry) => void }) {
  const [limit, setLimit] = useState(PAGE);
  const { data: entries, isLoading, isFetching } = useActivity(limit);

  if (isLoading) return <PageLoader className="py-12" />;
  if (!entries?.length) {
    return (
      <EmptyState icon={History} title="No activity yet" className="py-8">
        Updates logged on any project show up here.
      </EmptyState>
    );
  }
  return (
    <>
      <ActivityList entries={entries} onEdit={onEdit} showProject />
      {entries.length >= limit && (
        <div className="mt-3 flex justify-center">
          <Button size="sm" onClick={() => setLimit((l) => l + PAGE)} loading={isFetching}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Templates */

function TemplatesPanel() {
  const { canEdit } = useAuth();
  const { data: templates, isLoading } = useTemplates();
  const { data: projects } = useProjects();
  const { selectedId } = useSelection();
  const selected = projects?.find((p) => p.id === selectedId);
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const qc = useQueryClient();
  const refresh = useRefreshProject();
  const toast = useToast();
  const confirm = useConfirm();

  const remove = useMutation({
    mutationFn: (template: Template) => api.deleteTemplate(template.id),
    onSuccess: (_d, template) => {
      toast.success(`Deleted “${template.name}”`);
      return qc.invalidateQueries({ queryKey: queryKeys.templates });
    },
    onError: toast.error,
  });

  const apply = useMutation({
    mutationFn: ({ template, projectId }: { template: Template; projectId: string }) => api.applyTemplate(projectId, template.id),
    onSuccess: (_checklist, { template, projectId }) => {
      const count = template.items.length;
      toast.success(`Added ${count} step${count === 1 ? '' : 's'} to “${projects?.find((p) => p.id === projectId)?.name ?? 'the project'}”`);
      return refresh(projectId);
    },
    onError: toast.error,
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] leading-snug text-muted">Reusable checklists for new or existing projects.</p>
        {canEdit && (
          <Button size="sm" icon={Plus} onClick={() => setEditing('new')}>
            New
          </Button>
        )}
      </div>

      <div className="mt-3">
        {isLoading ? (
          <PageLoader className="py-12" />
        ) : !templates?.length ? (
          <EmptyState
            icon={ListChecks}
            title="No templates yet"
            className="py-8"
            action={
              canEdit && (
                <Button variant="primary" size="sm" icon={Plus} onClick={() => setEditing('new')}>
                  Create a template
                </Button>
              )
            }
          >
            {canEdit
              ? 'Save the steps you repeat on every project, then start new projects from them in one click.'
              : 'Checklist templates added by an admin will show up here.'}
          </EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {templates.map((template) => (
              <li key={template.id} className="border border-line bg-surface p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-medium text-ink">{template.name}</h3>
                    <p className="text-[12.5px] text-muted">{template.items.length} steps</p>
                  </div>
                  {canEdit && (
                    <div className="-mt-1 -mr-1.5 flex shrink-0">
                      <IconButton icon={Pencil} label="Edit template" onClick={() => setEditing(template)} className="size-7" />
                      <IconButton
                        icon={Trash2}
                        label="Delete template"
                        tone="danger"
                        className="size-7"
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Delete “${template.name}”?`,
                            message: 'Projects that already used it keep their checklists.',
                            confirmLabel: 'Delete',
                            danger: true,
                          });
                          if (ok) remove.mutate(template);
                        }}
                      />
                    </div>
                  )}
                </div>
                {template.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{template.description}</p>}
                <ol className="mt-3 space-y-1.5">
                  {template.items.slice(0, 4).map((item, index) => {
                    const Icon = stepIcon(item.icon);
                    return (
                      <li key={index} className="flex items-center gap-2.5 text-[12.5px] text-ink-soft">
                        <span className="grid size-6 shrink-0 place-items-center border border-line bg-sidebar text-muted">
                          <Icon className="size-3.5" strokeWidth={1.8} />
                        </span>
                        <span className="truncate">{item.title}</span>
                      </li>
                    );
                  })}
                  {template.items.length > 4 && <li className="pl-[34px] text-[12px] text-faint">+{template.items.length - 4} more</li>}
                </ol>
                {canEdit && selected && !selected.archived && template.items.length > 0 && (
                  <Button
                    size="sm"
                    icon={ListPlus}
                    className="mt-3 w-full"
                    loading={apply.isPending && apply.variables?.template.id === template.id}
                    onClick={() => apply.mutate({ template, projectId: selected.id })}
                    title={`Append these steps to ${selected.name}’s checklist`}
                  >
                    <span className="min-w-0 truncate">Add to {selected.name}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canEdit && <TemplateEditor template={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />}
    </>
  );
}
