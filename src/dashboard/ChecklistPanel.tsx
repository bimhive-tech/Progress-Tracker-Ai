import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Check,
  CircleDot,
  Ellipsis,
  GripVertical,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { api, type ChecklistInput } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatStamp } from '../lib/format';
import { queryKeys, useRefreshProject, useTemplates } from '../lib/hooks';
import { stepIcon } from '../lib/meta';
import type { ChecklistItem, ChecklistState, Project, ProjectDetail } from '../lib/types';
import { useConfirm, useToast } from '../components/feedback';
import { IconPicker } from '../components/IconPicker';
import { Button, Card, Field, Menu, MenuDivider, MenuItem, MenuLabel, Modal, PanelHeader, Segmented } from '../components/ui';

function applyLocally(item: ChecklistItem, input: ChecklistInput): ChecklistItem {
  const next = { ...item, ...input } as ChecklistItem;
  if (input.state === 'done') {
    next.progress = 100;
    next.completed_at = item.completed_at ?? new Date().toISOString();
  } else if (input.state === 'pending') {
    next.progress = 0;
    next.completed_at = null;
  } else if (input.state === 'in_progress') {
    next.completed_at = null;
    if (input.progress === undefined && item.state === 'done') next.progress = 0;
  }
  return next;
}

export function ChecklistPanel({ project, items, className }: { project: Project; items: ChecklistItem[]; className?: string }) {
  const [order, setOrder] = useState(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const { canEdit } = useAuth();
  const dragId = useRef<string | null>(null);
  const qc = useQueryClient();
  const refresh = useRefreshProject();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: templates } = useTemplates();
  const key = queryKeys.project(project.id);

  useEffect(() => {
    if (!dragId.current) setOrder(items);
  }, [items]);

  const patchCache = (fn: (detail: ProjectDetail) => ProjectDetail) => {
    const previous = qc.getQueryData<ProjectDetail>(key);
    if (previous) qc.setQueryData(key, fn(previous));
    return previous;
  };

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ChecklistInput }) => api.updateChecklistItem(id, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = patchCache((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? applyLocally(i, input) : i)) }));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error(err);
    },
    onSettled: () => refresh(project.id),
  });

  const add = useMutation({
    mutationFn: (input: ChecklistInput) => api.addChecklistItem(project.id, input),
    onSuccess: () => refresh(project.id),
    onError: toast.error,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteChecklistItem(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = patchCache((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error(err);
    },
    onSettled: () => refresh(project.id),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.reorderChecklist(project.id, ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = patchCache((d) => {
        const byId = new Map(d.items.map((i) => [i.id, i]));
        return { ...d, items: ids.map((id, position) => ({ ...byId.get(id)!, position })).filter((i) => i.id) };
      });
      return { previous };
    },
    onError: (err, _ids, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error(err);
    },
    onSettled: () => refresh(project.id),
  });

  const applyTemplate = useMutation({
    mutationFn: (templateId: string) => api.applyTemplate(project.id, templateId),
    onSuccess: () => {
      toast.success('Template steps added');
      return refresh(project.id);
    },
    onError: toast.error,
  });

  const toggle = (item: ChecklistItem) => update.mutate({ id: item.id, input: { state: item.state === 'done' ? 'pending' : 'done' } });

  const move = (item: ChecklistItem, delta: number) => {
    const index = order.findIndex((i) => i.id === item.id);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    next.splice(index, 1);
    next.splice(target, 0, item);
    setOrder(next);
    reorder.mutate(next.map((i) => i.id));
  };

  const deleteItem = async (item: ChecklistItem) => {
    const ok = await confirm({
      title: 'Delete this step?',
      message: `“${item.title}” will be removed from the checklist.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) {
      setEditingId(null);
      remove.mutate(item.id);
    }
  };

  const done = items.filter((i) => i.state === 'done').length;

  return (
    <Card className={clsx('p-4 sm:p-5', className)}>
      <PanelHeader
        title="Checklist"
        icon={ListChecks}
        meta={items.length > 0 ? `${done} of ${items.length} done` : undefined}
        className="mb-2"
        actions={
          canEdit && (
            <>
              {order.length > 0 && !adding && (
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => setAdding(true)}>
                  Add step
                </Button>
              )}
              <Menu
                label="Checklist options"
                panelClassName="w-64"
                trigger={
                  <span className="grid size-8 place-items-center text-muted transition hover:bg-white/[0.07] hover:text-ink">
                    <Ellipsis className="size-[18px]" />
                  </span>
                }
              >
                <MenuLabel>Add steps from a template</MenuLabel>
                {templates?.length ? (
                  templates.map((t) => (
                    <MenuItem key={t.id} icon={ListChecks} onSelect={() => applyTemplate.mutate(t.id)} hint={`${t.items.length}`}>
                      {t.name}
                    </MenuItem>
                  ))
                ) : (
                  <div className="px-2.5 py-2 text-[13px] text-muted">No templates yet</div>
                )}
                {items.length > 0 && (
                  <>
                    <MenuDivider />
                    <MenuItem icon={BookmarkPlus} onSelect={() => setSaveAsOpen(true)}>
                      Save as template…
                    </MenuItem>
                  </>
                )}
              </Menu>
            </>
          )
        }
      />

      {order.length === 0 && !adding ? (
        <div className="mt-2 border border-dashed border-line-strong px-4 py-7 text-center">
          <p className="font-medium text-ink">No steps yet</p>
          <p className="mt-1 text-[13.5px] text-muted">
            {canEdit ? 'Start from a template or add your own steps.' : 'An admin can add a checklist to this project.'}
          </p>
          {canEdit && (
            <div className="mx-auto mt-4 flex max-w-xs flex-col gap-2">
              {templates?.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  icon={ListChecks}
                  onClick={() => applyTemplate.mutate(t.id)}
                  loading={applyTemplate.isPending && applyTemplate.variables === t.id}
                >
                  {t.name}
                </Button>
              ))}
              <Button size="sm" variant="ghost" icon={Plus} onClick={() => setAdding(true)}>
                Add a step
              </Button>
            </div>
          )}
        </div>
      ) : (
        <ol>
          {order.map((item, index) => {
            const next = order[index + 1];
            const editing = editingId === item.id;
            return (
              <li
                key={item.id}
                className="relative"
                draggable={canEdit && !editing}
                onDragStart={(event) => {
                  dragId.current = item.id;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', item.id);
                }}
                onDragOver={(event) => {
                  const dragging = dragId.current;
                  if (!dragging) return;
                  event.preventDefault();
                  if (dragging === item.id) return;
                  setOrder((list) => {
                    const from = list.findIndex((i) => i.id === dragging);
                    const to = list.findIndex((i) => i.id === item.id);
                    if (from < 0 || to < 0) return list;
                    const copy = [...list];
                    const [moved] = copy.splice(from, 1);
                    copy.splice(to, 0, moved!);
                    return copy;
                  });
                }}
                onDrop={(event) => event.preventDefault()}
                onDragEnd={() => {
                  dragId.current = null;
                  const ids = order.map((i) => i.id);
                  if (ids.join() !== items.map((i) => i.id).join()) reorder.mutate(ids);
                }}
              >
                {next && !editing && <Connector from={item.state} to={next.state} />}
                {editing ? (
                  <StepEditor
                    item={item}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => deleteItem(item)}
                    onSave={(input) => {
                      update.mutate({ id: item.id, input });
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <StepRow
                    item={item}
                    readOnly={!canEdit}
                    onToggle={() => toggle(item)}
                    onEdit={() => setEditingId(item.id)}
                    onSetState={(state) => update.mutate({ id: item.id, input: { state } })}
                    onMove={(delta) => move(item, delta)}
                    onDelete={() => deleteItem(item)}
                    canMoveUp={index > 0}
                    canMoveDown={!!next}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {adding && canEdit && (
        <AddStepForm
          onAdd={(title) =>
            add.mutateAsync({ title }).then(
              () => true,
              () => false,
            )
          }
          onClose={() => setAdding(false)}
        />
      )}

      <SaveAsTemplateModal open={saveAsOpen} onClose={() => setSaveAsOpen(false)} items={items} projectName={project.name} />
    </Card>
  );
}

function Connector({ from, to }: { from: ChecklistState; to: ChecklistState }) {
  const solid = from === 'done' && to !== 'pending';
  return (
    <span
      aria-hidden
      className={clsx(
        'pointer-events-none absolute top-[42px] bottom-[-10px] left-[27px] w-0 border-l-2',
        solid ? (to === 'done' ? 'border-success-solid/60' : 'border-accent/55') : 'border-dashed border-line-strong',
      )}
    />
  );
}

function StateCircle({ state, onClick }: { state: ChecklistState; onClick?: () => void }) {
  const label = state === 'done' ? 'Mark as not done' : 'Mark as done';
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      aria-label={onClick ? label : undefined}
      title={onClick ? label : undefined}
      className={clsx(
        'group/circle relative z-10 grid size-8 shrink-0 place-items-center rounded-full transition',
        state === 'done' && 'bg-success-soft',
        state === 'in_progress' && 'bg-accent-soft',
        state === 'pending' && 'bg-white/[0.05]',
        state === 'pending' && onClick && 'hover:bg-success-soft',
      )}
    >
      {state === 'done' ? (
        <span className="grid size-[22px] place-items-center rounded-full bg-success-solid text-white">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      ) : state === 'in_progress' ? (
        <span className="size-[16px] rounded-full bg-accent shadow-[0_0_0_4px_rgb(186_163_97/0.2)]" />
      ) : (
        <>
          <span className={clsx('size-[12px] rounded-full bg-line-strong transition', onClick && 'group-hover/circle:opacity-0')} />
          {onClick && <Check className="absolute size-4 text-success opacity-0 transition group-hover/circle:opacity-100" strokeWidth={2.6} />}
        </>
      )}
    </Tag>
  );
}

function StepRow({
  item,
  readOnly,
  onToggle,
  onEdit,
  onSetState,
  onMove,
  onDelete,
  canMoveUp,
  canMoveDown,
}: {
  item: ChecklistItem;
  readOnly: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSetState: (state: ChecklistState) => void;
  onMove: (delta: number) => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const Icon = stepIcon(item.icon);
  const Body = readOnly ? 'div' : 'button';
  const sub =
    item.state === 'done' ? (
      <span className="text-muted">Completed{item.completed_at ? ` · ${formatStamp(item.completed_at)}` : ''}</span>
    ) : item.state === 'in_progress' ? (
      <span className="font-medium text-accent-text">In progress · {item.progress}%</span>
    ) : (
      <span className="text-faint">Pending</span>
    );

  return (
    <div
      className={clsx(
        'group relative flex items-start gap-3.5 px-3 py-2.5 transition',
        item.state === 'in_progress' ? 'bg-accent-wash' : 'hover:bg-white/[0.03]',
      )}
    >
      {!readOnly && (
        <GripVertical className="absolute top-[18px] -left-1.5 size-4 cursor-grab text-faint opacity-0 transition group-hover:opacity-100" />
      )}
      <StateCircle state={item.state} onClick={readOnly ? undefined : onToggle} />
      <Body onClick={readOnly ? undefined : onEdit} className="min-h-8 min-w-0 flex-1 self-center text-left">
        <span className={clsx('block text-[14.5px] leading-snug font-medium', item.state === 'pending' ? 'text-ink-soft' : 'text-ink')}>
          {item.title}
        </span>
        <span className="mt-0.5 block text-[12.5px]">{sub}</span>
        {item.note && <span className="mt-0.5 block truncate text-[12.5px] text-faint">{item.note}</span>}
        {item.state === 'in_progress' && (
          <span className="mt-2 block h-1 max-w-48 overflow-hidden bg-accent-soft">
            <span className="block h-full bg-accent" style={{ width: `${item.progress}%` }} />
          </span>
        )}
      </Body>
      {readOnly ? (
        <Icon className="m-[7px] size-[18px] shrink-0 text-faint" strokeWidth={1.6} />
      ) : (
        <div className="relative size-8 shrink-0">
          <Icon
            className="absolute inset-0 m-auto size-[18px] text-faint transition group-focus-within:opacity-0 group-hover:opacity-0 [@media(hover:none)]:opacity-0"
            strokeWidth={1.6}
          />
          <div className="absolute inset-0 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            <Menu
              label="Step options"
              trigger={
                <span className="grid size-8 place-items-center text-muted hover:bg-white/[0.07] hover:text-ink">
                  <Ellipsis className="size-[18px]" />
                </span>
              }
            >
              <MenuItem icon={Pencil} onSelect={onEdit}>
                Edit step
              </MenuItem>
              {item.state !== 'done' && (
                <MenuItem icon={Check} onSelect={() => onSetState('done')}>
                  Mark done
                </MenuItem>
              )}
              {item.state !== 'in_progress' && (
                <MenuItem icon={CircleDot} onSelect={() => onSetState('in_progress')}>
                  Mark in progress
                </MenuItem>
              )}
              {item.state !== 'pending' && (
                <MenuItem icon={RotateCcw} onSelect={() => onSetState('pending')}>
                  Reset to pending
                </MenuItem>
              )}
              <MenuDivider />
              {canMoveUp && (
                <MenuItem icon={ArrowUp} onSelect={() => onMove(-1)}>
                  Move up
                </MenuItem>
              )}
              {canMoveDown && (
                <MenuItem icon={ArrowDown} onSelect={() => onMove(1)}>
                  Move down
                </MenuItem>
              )}
              <MenuItem icon={Trash2} danger onSelect={onDelete}>
                Delete
              </MenuItem>
            </Menu>
          </div>
        </div>
      )}
    </div>
  );
}

function StepEditor({
  item,
  onSave,
  onCancel,
  onDelete,
}: {
  item: ChecklistItem;
  onSave: (input: ChecklistInput) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note ?? '');
  const [icon, setIcon] = useState(item.icon);
  const [state, setState] = useState<ChecklistState>(item.state);
  const [progress, setProgress] = useState(item.state === 'in_progress' ? item.progress : 50);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      note: note.trim() || null,
      icon,
      state,
      ...(state === 'in_progress' ? { progress } : {}),
    });
  };

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      className="animate-pop-in my-1 space-y-3 border border-line-strong bg-raised/60 p-3.5"
    >
      <div className="flex gap-2">
        <IconPicker value={icon} onChange={setIcon} />
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Step title" autoFocus maxLength={200} />
      </div>
      <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={1000} />
      <Segmented
        value={state}
        onChange={setState}
        className="w-full"
        options={[
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In progress' },
          { value: 'done', label: 'Done' },
        ]}
      />
      {state === 'in_progress' && (
        <div className="flex items-center gap-3 px-1">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="flex-1 accent-[#baa361]"
            aria-label="Progress"
          />
          <span className="w-10 text-right text-sm font-medium tabular-nums">{progress}%</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button size="sm" variant="danger" icon={Trash2} onClick={onDelete}>
          Delete
        </Button>
        <div className="flex gap-2">
          <Button size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" type="submit" disabled={!title.trim()}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

function AddStepForm({ onAdd, onClose }: { onAdd: (title: string) => Promise<boolean>; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const ok = await onAdd(title.trim());
    setBusy(false);
    if (ok) setTitle('');
  };
  return (
    <form onSubmit={submit} className="mt-2 flex items-center gap-2 px-1">
      <input
        className="field"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        onBlur={() => !title.trim() && onClose()}
        placeholder="New step — press Enter to add"
        autoFocus
        maxLength={200}
      />
      <Button variant="primary" type="submit" loading={busy} disabled={!title.trim()} className="h-10">
        Add
      </Button>
    </form>
  );
}

function SaveAsTemplateModal({
  open,
  onClose,
  items,
  projectName,
}: {
  open: boolean;
  onClose: () => void;
  items: ChecklistItem[];
  projectName: string;
}) {
  const [name, setName] = useState('');
  const qc = useQueryClient();
  const toast = useToast();
  useEffect(() => {
    if (open) setName(`${projectName} checklist`);
  }, [open, projectName]);

  const save = useMutation({
    mutationFn: () =>
      api.createTemplate({
        name: name.trim(),
        items: items.map((i) => ({ title: i.title, note: i.note, icon: i.icon })),
      }),
    onSuccess: () => {
      toast.success('Template saved');
      qc.invalidateQueries({ queryKey: queryKeys.templates });
      onClose();
    },
    onError: toast.error,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save as template"
      description={`Reuse these ${items.length} steps on future projects.`}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => save.mutate()} loading={save.isPending} disabled={!name.trim()}>
            Save template
          </Button>
        </>
      }
    >
      <Field label="Template name">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={200} />
      </Field>
    </Modal>
  );
}
