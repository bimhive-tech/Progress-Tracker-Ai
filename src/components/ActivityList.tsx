import { Fragment } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dayLabel, formatTime } from '../lib/format';
import { queryKeys, useRefreshProject } from '../lib/hooks';
import { activityIcon, ACTIVITY_TYPES } from '../lib/meta';
import { useSelection } from '../lib/selection';
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

/** Activity entries grouped by day. `showProject` adds the project name/thumbnail (for the all-projects feed). */
export function ActivityList({
  entries,
  onEdit,
  showProject,
}: {
  entries: ActivityEntry[];
  onEdit: (entry: ActivityEntry) => void;
  showProject?: boolean;
}) {
  const remove = useDeleteActivity();
  const { canEdit } = useAuth();
  const { select } = useSelection();
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
            {showDay && <li className="eyebrow pt-5 pb-1.5 first:pt-1">{day}</li>}
            <li className="group relative -mx-2 flex gap-3 px-2 py-2.5 transition hover:bg-white/[0.025]">
              {showProject ? (
                <button
                  onClick={() => select(entry.project_id)}
                  className="relative size-9 shrink-0 overflow-hidden border border-line bg-sidebar"
                  title={`Open ${entry.project_name}`}
                >
                  <PlaceholderArt seed={entry.project_id} />
                  <span className="absolute -right-px -bottom-px grid size-[18px] place-items-center bg-raised text-ink-soft">
                    <Icon className="size-3" strokeWidth={2} />
                  </span>
                </button>
              ) : (
                <span
                  className="grid size-9 shrink-0 place-items-center border border-line bg-sidebar text-ink-soft"
                  title={ACTIVITY_TYPES[entry.type]?.label}
                >
                  <Icon className="size-[17px]" strokeWidth={1.6} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 pt-px text-[14px] leading-snug font-medium text-ink">{entry.title}</p>
                  <span className="shrink-0 pt-0.5 text-[12px] whitespace-nowrap text-faint tabular-nums">{formatTime(entry.occurred_at)}</span>
                </div>
                {showProject && (
                  <button onClick={() => select(entry.project_id)} className="block max-w-full truncate text-left text-[12.5px] text-accent-text hover:underline">
                    {entry.project_name}
                  </button>
                )}
                {entry.details && <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-line text-muted">{entry.details}</p>}
                {entry.author && <p className="mt-0.5 text-[12px] text-faint">by {entry.author}</p>}
              </div>
              {canEdit && (
                <div
                  className={clsx(
                    'absolute top-1.5 right-1 flex gap-0.5 border border-line bg-raised opacity-0 shadow-pop transition',
                    'group-focus-within:opacity-100 group-hover:opacity-100',
                    '[@media(hover:none)]:static [@media(hover:none)]:self-start [@media(hover:none)]:border-0 [@media(hover:none)]:bg-transparent [@media(hover:none)]:opacity-100 [@media(hover:none)]:shadow-none',
                  )}
                >
                  <IconButton icon={Pencil} label="Edit entry" onClick={() => onEdit(entry)} className="size-7" />
                  <IconButton icon={Trash2} label="Delete entry" tone="danger" onClick={() => remove(entry)} className="size-7" />
                </div>
              )}
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}
