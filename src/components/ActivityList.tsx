import { Fragment } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { dayLabel, formatTime } from '../lib/format';
import { queryKeys, useRefreshProject } from '../lib/hooks';
import { activityIcon, ACTIVITY_TYPES } from '../lib/meta';
import type { ActivityEntry, ProjectDetail } from '../lib/types';
import { PlaceholderArt } from './art';
import { useConfirm, useToast } from './feedback';
import { IconButton } from './ui';

export function useDeleteActivity() {
  const confirm = useConfirm();
  const toast = useToast();
  const refresh = useRefreshProject();
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (entry: ActivityEntry) => api.deleteActivity(entry.id),
    onSuccess: (_d, entry) => {
      qc.setQueryData<ProjectDetail>(queryKeys.project(entry.project_id), (detail) =>
        detail && { ...detail, activity: detail.activity.filter((a) => a.id !== entry.id) },
      );
      return refresh(entry.project_id);
    },
    onError: toast.error,
  });
  return async (entry: ActivityEntry) => {
    const ok = await confirm({ title: 'Delete this entry?', message: `“${entry.title}” will be removed from the activity log.`, confirmLabel: 'Delete', danger: true });
    if (ok) remove.mutate(entry);
  };
}

/** Activity entries grouped by day. `showProject` adds the project name/thumbnail (for the global feed). */
export function ActivityList({
  entries,
  onEdit,
  showProject,
  compact,
}: {
  entries: ActivityEntry[];
  onEdit: (entry: ActivityEntry) => void;
  showProject?: boolean;
  compact?: boolean;
}) {
  const remove = useDeleteActivity();
  let lastDay = '';

  return (
    <ul>
      {entries.map((entry) => {
        const day = dayLabel(entry.occurred_at);
        const showDay = day !== lastDay;
        lastDay = day;
        const Icon = activityIcon(entry.type);
        return (
          <Fragment key={entry.id}>
            {showDay && (
              <li className={clsx('pb-1 text-[11.5px] font-semibold tracking-wider text-faint uppercase', compact ? 'pt-4 first:pt-1' : 'pt-6 first:pt-1')}>
                {day}
              </li>
            )}
            <li className="group relative flex gap-3.5 border-b border-line py-3.5 last:border-b-0">
              {showProject ? (
                <Link to={`/projects/${entry.project_id}`} className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-line bg-subtle" title={entry.project_name}>
                  <PlaceholderArt seed={entry.project_id} />
                  <span className="absolute right-0.5 bottom-0.5 grid size-5 place-items-center rounded-md bg-white/95 text-ink-soft shadow-sm">
                    <Icon className="size-3" strokeWidth={2} />
                  </span>
                </Link>
              ) : (
                <span className="grid size-8 shrink-0 place-items-center text-ink-soft" title={ACTIVITY_TYPES[entry.type]?.label}>
                  <Icon className="size-[22px]" strokeWidth={1.5} />
                </span>
              )}
              <span className="w-[60px] shrink-0 pt-0.5 text-[12.5px] whitespace-nowrap text-faint tabular-nums">{formatTime(entry.occurred_at)}</span>
              <div className="min-w-0 flex-1 pr-1">
                <p className="text-[15px] leading-snug font-medium text-ink">{entry.title}</p>
                {showProject && (
                  <Link to={`/projects/${entry.project_id}`} className="text-[13px] text-gold-strong hover:underline">
                    {entry.project_name}
                  </Link>
                )}
                {entry.details && <p className="mt-0.5 text-[13.5px] leading-relaxed whitespace-pre-line text-muted">{entry.details}</p>}
                {entry.author && <p className="mt-1 text-[12px] text-faint">by {entry.author}</p>}
              </div>
              <div className="absolute top-2.5 right-0 flex gap-0.5 rounded-xl bg-white opacity-0 shadow-sm transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:self-start [@media(hover:none)]:opacity-100 [@media(hover:none)]:shadow-none">
                <IconButton icon={Pencil} label="Edit entry" onClick={() => onEdit(entry)} />
                <IconButton icon={Trash2} label="Delete entry" tone="danger" onClick={() => remove(entry)} />
              </div>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
