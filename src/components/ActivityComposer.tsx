import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../lib/api';
import { toLocalInput } from '../lib/format';
import { queryKeys, useAuthorName, useProjects, useRefreshProject } from '../lib/hooks';
import { ACTIVITY_PRESETS, ACTIVITY_TYPES } from '../lib/meta';
import type { ActivityEntry, ProjectDetail } from '../lib/types';
import { useToast } from './feedback';
import { Button, Field, Modal } from './ui';

/** Create or edit a manual activity log entry. */
export function ActivityComposer({
  open,
  onClose,
  projectId,
  entry,
  chooseProject,
}: {
  open: boolean;
  onClose: () => void;
  /** Project the new entry is logged against (or the default choice when `chooseProject` is set). */
  projectId: string;
  entry?: ActivityEntry | null;
  /** Show a project picker when creating an entry. */
  chooseProject?: boolean;
}) {
  const [authorName, setAuthorName] = useAuthorName();
  const [targetId, setTargetId] = useState(projectId);
  const [type, setType] = useState('note');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [when, setWhen] = useState('');
  const [author, setAuthor] = useState('');
  const { data: projects } = useProjects();
  const refresh = useRefreshProject();
  const toast = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setTargetId(entry?.project_id ?? projectId);
    setType(entry?.type ?? 'note');
    setTitle(entry?.title ?? '');
    setDetails(entry?.details ?? '');
    setWhen(toLocalInput(entry ? new Date(entry.occurred_at) : new Date()));
    setAuthor(entry ? (entry.author ?? '') : authorName);
  }, [open, entry, authorName, projectId]);

  const save = useMutation({
    mutationFn: () => {
      const input = {
        type,
        title: title.trim(),
        details: details.trim() || null,
        author: author.trim() || null,
        occurred_at: when ? new Date(when).toISOString() : undefined,
      };
      return entry ? api.updateActivity(entry.id, input) : api.addActivity(targetId, input);
    },
    onSuccess: (saved) => {
      qc.setQueryData<ProjectDetail>(queryKeys.project(saved.project_id), (detail) =>
        detail && {
          ...detail,
          activity: [...detail.activity.filter((a) => a.id !== saved.id), saved].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
        },
      );
      if (author.trim() && !authorName) setAuthorName(author.trim());
      toast.success(entry ? 'Entry updated' : 'Added to the activity log');
      onClose();
      return refresh(saved.project_id);
    },
    onError: toast.error,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() && targetId) save.mutate();
  };

  const pickable = (projects ?? []).filter((p) => !p.archived || p.id === targetId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit activity' : 'Log activity'}
      description={entry ? undefined : 'Record what happened — e.g. data gathered, processed in Blender, sent for review.'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="activity-form" loading={save.isPending} disabled={!title.trim() || !targetId}>
            {entry ? 'Save changes' : 'Add entry'}
          </Button>
        </>
      }
    >
      <form id="activity-form" onSubmit={submit} className="space-y-5">
        {chooseProject && !entry && (
          <Field label="Project *">
            <select className="field" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {!targetId && <option value="">Choose a project…</option>}
              {pickable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.code ? ` · ${p.code}` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        {!entry && (
          <div>
            <span className="mb-2 block text-[12.5px] font-medium text-muted">Quick pick</span>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_PRESETS.map((preset) => {
                const Icon = ACTIVITY_TYPES[preset.type]!.icon;
                const picked = title === preset.title;
                return (
                  <button
                    key={preset.title}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => {
                      setType(preset.type);
                      setTitle(preset.title);
                    }}
                    className={clsx(
                      'flex items-center gap-1.5 border px-3 py-1.5 text-[13px] transition',
                      picked ? 'border-accent/70 bg-accent-wash text-ink' : 'border-line text-ink-soft hover:border-line-strong hover:bg-white/[0.03]',
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={1.8} />
                    {preset.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Field label="What happened? *">
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Point cloud processed in Blender" maxLength={300} autoFocus />
        </Field>

        <div>
          <span className="mb-2 block text-[12.5px] font-medium text-muted">Type</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {Object.entries(ACTIVITY_TYPES).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={type === key}
                  onClick={() => setType(key)}
                  className={clsx(
                    'flex items-center gap-2 border px-2.5 py-2 text-left text-[13px] transition',
                    type === key ? 'border-accent/70 bg-accent-wash font-medium text-ink' : 'border-line text-ink-soft hover:border-line-strong hover:bg-white/[0.03]',
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.7} />
                  <span className="truncate">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Details">
          <textarea className="field" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Optional notes — numbers, findings, links…" maxLength={5000} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="When">
            <input className="field" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="By">
            <input className="field" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" maxLength={120} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
