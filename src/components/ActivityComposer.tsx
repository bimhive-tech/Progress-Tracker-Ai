import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../lib/api';
import { toLocalInput } from '../lib/format';
import { queryKeys, useAuthorName, useRefreshProject } from '../lib/hooks';
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
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  entry?: ActivityEntry | null;
}) {
  const [authorName, setAuthorName] = useAuthorName();
  const [type, setType] = useState('note');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [when, setWhen] = useState('');
  const [author, setAuthor] = useState('');
  const refresh = useRefreshProject();
  const toast = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setType(entry?.type ?? 'note');
    setTitle(entry?.title ?? '');
    setDetails(entry?.details ?? '');
    setWhen(toLocalInput(entry ? new Date(entry.occurred_at) : new Date()));
    setAuthor(entry ? (entry.author ?? '') : authorName);
  }, [open, entry, authorName]);

  const save = useMutation({
    mutationFn: () => {
      const input = {
        type,
        title: title.trim(),
        details: details.trim() || null,
        author: author.trim() || null,
        occurred_at: when ? new Date(when).toISOString() : undefined,
      };
      return entry ? api.updateActivity(entry.id, input) : api.addActivity(projectId, input);
    },
    onSuccess: (saved) => {
      qc.setQueryData<ProjectDetail>(queryKeys.project(projectId), (detail) =>
        detail && {
          ...detail,
          activity: [...detail.activity.filter((a) => a.id !== saved.id), saved].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
        },
      );
      if (author.trim() && !authorName) setAuthorName(author.trim());
      toast.success(entry ? 'Entry updated' : 'Added to the activity log');
      onClose();
      return refresh(projectId);
    },
    onError: toast.error,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim()) save.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit activity' : 'Log activity'}
      description={entry ? undefined : 'Record what happened on this project — e.g. data gathered, processed in Blender, sent for review.'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="activity-form" loading={save.isPending} disabled={!title.trim()}>
            {entry ? 'Save changes' : 'Add entry'}
          </Button>
        </>
      }
    >
      <form id="activity-form" onSubmit={submit} className="space-y-5">
        {!entry && (
          <div>
            <span className="mb-2 block text-[13px] font-medium text-ink-soft">Quick pick</span>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_PRESETS.map((preset) => {
                const Icon = ACTIVITY_TYPES[preset.type]!.icon;
                return (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => {
                      setType(preset.type);
                      setTitle(preset.title);
                    }}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13.5px] transition',
                      title === preset.title ? 'border-gold bg-gold-wash text-ink' : 'border-line text-ink-soft hover:border-line-strong',
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
          <span className="mb-2 block text-[13px] font-medium text-ink-soft">Type</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {Object.entries(ACTIVITY_TYPES).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[13px] transition',
                    type === key ? 'border-gold bg-gold-wash font-medium text-ink' : 'border-line text-ink-soft hover:border-line-strong',
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
