import clsx from 'clsx';
import { CalendarClock, Clock, FileStack, Hourglass, MapPin, type LucideIcon } from 'lucide-react';
import { dueInfo, formatDate, formatDateSmart } from '../../lib/format';
import { computeProgress, currentStep } from '../../lib/progress';
import type { ChecklistItem, Project } from '../../lib/types';
import { PlaceholderArt } from '../art';
import { Card } from '../ui';

export function OverviewPanel({ project, items, className }: { project: Project; items: ChecklistItem[]; className?: string }) {
  const progress = computeProgress(items);
  const step = currentStep(items);
  const allDone = items.length > 0 && !step;
  const lastDone = allDone
    ? items.reduce<string | null>((latest, i) => (i.completed_at && (!latest || i.completed_at > latest) ? i.completed_at : latest), null)
    : null;

  const headline = !items.length ? 'No checklist yet' : allDone ? 'All steps complete' : step!.title;
  const subline = !items.length
    ? 'Add steps to the checklist to start tracking this project’s progress.'
    : allDone
      ? `Every step is done${lastDone ? ` — last one finished ${formatDateSmart(lastDone)}` : ''}.`
      : step!.note || project.description || 'Work through the checklist to move this project forward.';

  const due = dueInfo(project.due_date, project.status === 'completed');
  const tags = [project.category, project.levels, project.area].filter(Boolean);

  return (
    <Card className={clsx('p-5 sm:p-7', className)}>
      <h2 className="text-[26px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[32px]">{headline}</h2>
      <p className="mt-2 text-[15.5px] leading-relaxed text-muted sm:text-[17px]">{subline}</p>

      <div className="mt-6 flex items-center gap-5">
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[#eeece7]">
          <div
            className={clsx('h-full rounded-full transition-[width] duration-700 ease-out', allDone ? 'bg-success' : 'bg-gold')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[26px] font-semibold tracking-tight tabular-nums sm:text-[30px]">{progress}%</span>
      </div>
      <p className="mt-2.5 text-[15px] text-muted">
        {items.length ? (
          <>
            {allDone ? 'Checklist:' : 'Current step:'}{' '}
            <strong className="font-semibold text-ink">{allDone ? `${items.length} of ${items.length} done` : step!.title}</strong>
            {!allDone && <span className="text-faint"> · {items.filter((i) => i.state === 'done').length} of {items.length} done</span>}
          </>
        ) : (
          'Progress is calculated from the checklist.'
        )}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <InfoTile icon={Clock} label="Created" value={formatDateSmart(project.created_at)} />
        {project.due_date ? (
          <InfoTile
            icon={Hourglass}
            label={`Due ${formatDate(project.due_date)}`}
            value={due.label}
            tone={due.tone === 'late' ? 'text-danger' : due.tone === 'warn' ? 'text-[#b86e1f]' : undefined}
          />
        ) : (
          <InfoTile icon={CalendarClock} label="Due date" value="Not set" muted />
        )}
        <InfoTile icon={FileStack} label="Output types" value={project.output_types || 'Not set'} muted={!project.output_types} />
      </div>

      <div className="my-6 h-px bg-line" />

      <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] border border-line bg-[#f2f1ed]">
        <PlaceholderArt seed={project.id} />
        {tags.length > 0 && (
          <div className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] gap-1 overflow-x-auto rounded-2xl bg-white/90 p-1 shadow-sm backdrop-blur scrollbar-none">
            {tags.map((tag) => (
              <span key={tag} className="shrink-0 rounded-xl px-3 py-1.5 text-[13px] whitespace-nowrap text-ink-soft first:bg-sand first:font-medium first:text-ink">
                {tag}
              </span>
            ))}
          </div>
        )}
        {project.location && (
          <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[13px] text-ink-soft shadow-sm backdrop-blur">
            <MapPin className="size-3.5 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{project.location}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  tone,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[18px] border border-line bg-subtle/60 px-4 py-4">
      <Icon className="size-7 shrink-0 text-ink-soft" strokeWidth={1.4} />
      <div className="min-w-0">
        <div className="truncate text-[13px] text-muted">{label}</div>
        <div className={clsx('truncate text-[15.5px] font-medium', tone ?? (muted ? 'text-faint' : 'text-ink'))}>{value}</div>
      </div>
    </div>
  );
}
