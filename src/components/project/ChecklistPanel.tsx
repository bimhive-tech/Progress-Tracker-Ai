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
import { api, type ChecklistInput } from '../../lib/api';
import { formatStamp } from '../../lib/format';
import { queryKeys, useRefreshProject, useTemplates } from '../../lib/hooks';
import { stepIcon } from '../../lib/meta';
import type { ChecklistItem, ChecklistState, Project, ProjectDetail } from '../../lib/types';
import { useConfirm, useToast } from '../feedback';
import { IconPicker } from '../IconPicker';
import { Button, Card, Field, Menu, MenuDivider, MenuItem, MenuLabel, Modal, Segmented } from '../ui';

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

  const toggle = (item: ChecklistItem) =>
    update.mutate({ id: item.id, input: { state: item.state === 'done' ? 'pending' : 'done' } });

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
    const ok = await confirm({ title: 'Delete this step?', message: `“${item.title}” will be removed from the checklist.`, confirmLabel: 'Delete', danger: true });
    if (ok) {
      setEditingId(null);
      remove.mutate(item.id);
    }
  };

  const done = items.filter((i) => i.state === 'done').length;

  return (
    <Card className={clsx('p-5 sm:p-6', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[21px] font-semibold tracking-[-0.02em]">Checklist</h2>
          {items.length > 0 && (
            <span className="text-[14px] text-muted tabular-nums">
              {done}/{items.length}
            </span>
          )}
        </div>
        <Menu
          label="Checklist options"
          panelClassName="w-64"
          trigger={
            <span className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-black/[0.04] hover:text-ink">
              <Ellipsis className="size-5" />
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
            <div className="px-3 py-2 text-[13px] text-muted">No templates yet</div>
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
      </div>

      {order.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-line-strong px-4 py-7 text-center">
          <p className="font-medium text-ink">No steps yet</p>
          <p className="mt-1 text-[14px] text-muted">Start from a template or add your own steps.</p>
          <div className="mt-4 flex flex-col gap-2">
            {templates?.map((t) => (
              <Button key={t.id} size="sm" icon={ListChecks} onClick={() => applyTemplate.mutate(t.id)} loading={applyTemplate.isPending && applyTemplate.variables === t.id}>
                {t.name}
              </Button>
            ))}
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => setAdding(true)}>
              Add a step
            </Button>
          </div>
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
                draggable={!editing}
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
                    last={!next}
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

      {adding ? (
        <AddStepForm
          onAdd={(title) => add.mutateAsync({ title }).then(() => true, () => false)}
          onClose={() => setAdding(false)}
        />
      ) : (
        order.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="mt-1 flex w-full items-center gap-4 rounded-2xl px-3 py-2.5 text-[15px] text-muted transition hover:bg-subtle hover:text-ink"
          >
            <span className="grid size-[34px] place-items-center rounded-full border border-dashed border-line-strong">
              <Plus className="size-4" />
            </span>
            Add step
          </button>
        )
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
        'pointer-events-none absolute top-[46px] bottom-[-14px] left-[29px] w-0',
        solid ? 'border-l-2' : 'border-l-2 border-dashed border-[#dcd8d0]',
        solid && (to === 'done' ? 'border-[#9cc29e]' : 'border-[#cdb987]'),
      )}
    />
  );
}

function StateCircle({ state, onClick }: { state: ChecklistState; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={state === 'done' ? 'Mark as not done' : 'Mark as done'}
      title={state === 'done' ? 'Mark as not done' : 'Mark as done'}
      className={clsx(
        'group/circle relative z-10 grid size-[36px] shrink-0 place-items-center rounded-full transition',
        state === 'done' && 'bg-[#e3eee2]',
        state === 'in_progress' && 'bg-[#efe6cf]',
        state === 'pending' && 'bg-[#f1f0ec] hover:bg-[#e9f1e8]',
      )}
    >
      {state === 'done' ? (
        <span className="grid size-[24px] place-items-center rounded-full bg-success text-white shadow-[0_2px_6px_-1px_rgb(47_125_59/0.5)]">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      ) : state === 'in_progress' ? (
        <span className="size-[20px] rounded-full bg-gold shadow-[0_2px_6px_-1px_rgb(152_130_73/0.6)]" />
      ) : (
        <>
          <span className="size-[16px] rounded-full bg-[#d6d3cc] transition group-hover/circle:opacity-0" />
          <Check className="absolute size-4 text-success opacity-0 transition group-hover/circle:opacity-100" strokeWidth={2.6} />
        </>
      )}
    </button>
  );
}

function StepRow({
  item,
  last,
  onToggle,
  onEdit,
  onSetState,
  onMove,
  onDelete,
  canMoveUp,
  canMoveDown,
}: {
  item: ChecklistItem;
  last: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSetState: (state: ChecklistState) => void;
  onMove: (delta: number) => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const Icon = stepIcon(item.icon);
  const sub =
    item.state === 'done' ? (
      <span className="text-muted">Completed{item.completed_at ? ` · ${formatStamp(item.completed_at)}` : ''}</span>
    ) : item.state === 'in_progress' ? (
      <span className="text-gold-strong">In progress · {item.progress}%</span>
    ) : (
      <span className="text-faint">Pending</span>
    );

  return (
    <div className={clsx('group relative flex items-center gap-4 rounded-2xl px-3 py-3 transition', item.state === 'in_progress' ? 'bg-gold-wash' : 'hover:bg-subtle/80')}>
      <GripVertical className="absolute top-1/2 -left-1.5 size-4 -translate-y-1/2 cursor-grab text-faint opacity-0 transition group-hover:opacity-100" />
      <StateCircle state={item.state} onClick={onToggle} />
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={clsx('block text-[15.5px] leading-snug font-medium', item.state === 'done' ? 'text-ink' : item.state === 'pending' ? 'text-ink-soft' : 'text-ink')}>
          {item.title}
        </span>
        <span className="mt-0.5 block text-[13px]">{sub}</span>
        {item.note && <span className="mt-0.5 block truncate text-[12.5px] text-faint">{item.note}</span>}
      </button>
      <div className="relative size-9 shrink-0">
        <Icon
          className="absolute inset-0 m-auto size-[22px] text-ink-soft transition group-focus-within:opacity-0 group-hover:opacity-0 [@media(hover:none)]:opacity-0"
          strokeWidth={1.5}
        />
        <div className="absolute inset-0 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <Menu
            label="Step options"
            trigger={
              <span className="grid size-9 place-items-center rounded-xl text-muted hover:bg-black/[0.05] hover:text-ink">
                <Ellipsis className="size-5" />
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
      {!last && item.state !== 'in_progress' && <span className="absolute right-3 bottom-0 left-[64px] h-px bg-line" />}
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
    <form onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && onCancel()} className="animate-pop-in my-1 space-y-3 rounded-2xl border border-line bg-subtle p-3.5">
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
            className="flex-1 accent-[#b39c66]"
            aria-label="Progress"
          />
          <span className="w-10 text-right text-sm font-medium tabular-nums">{progress}%</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <Button size="sm" variant="ghost" icon={Trash2} onClick={onDelete} className="text-danger hover:bg-danger-soft">
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
        className="field h-10"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        onBlur={() => !title.trim() && onClose()}
        placeholder="New step — press Enter to add"
        autoFocus
        maxLength={200}
      />
      <Button size="sm" variant="primary" type="submit" loading={busy} disabled={!title.trim()} className="h-10">
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
