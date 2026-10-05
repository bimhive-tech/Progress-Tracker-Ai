import { useState } from 'react';
import clsx from 'clsx';
import { NotebookPen, Plus } from 'lucide-react';
import type { ActivityEntry } from '../../lib/types';
import { ActivityComposer } from '../ActivityComposer';
import { ActivityList } from '../ActivityList';
import { Button, Card } from '../ui';

const INITIAL = 8;

export function ActivityPanel({ projectId, entries, className }: { projectId: string; entries: ActivityEntry[]; className?: string }) {
  const [composer, setComposer] = useState<{ entry: ActivityEntry | null } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? entries : entries.slice(0, INITIAL);

  return (
    <Card className={clsx('p-5 sm:p-6', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[21px] font-semibold tracking-[-0.02em]">Activity Log</h2>
        <Button size="sm" variant="primary" icon={Plus} onClick={() => setComposer({ entry: null })}>
          Log
        </Button>
      </div>

      {entries.length === 0 ? (
        <button
          onClick={() => setComposer({ entry: null })}
          className="mt-4 flex w-full flex-col items-center rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center transition hover:bg-subtle"
        >
          <NotebookPen className="size-6 text-gold-strong" strokeWidth={1.6} />
          <span className="mt-2 font-medium text-ink">No activity yet</span>
          <span className="mt-1 text-[14px] text-muted">Log updates like “Data gathered” or “Processed in Blender”.</span>
        </button>
      ) : (
        <div className="mt-2">
          <ActivityList entries={shown} onEdit={(entry) => setComposer({ entry })} compact />
          {entries.length > INITIAL && (
            <button onClick={() => setShowAll((v) => !v)} className="mt-2 w-full rounded-xl py-2 text-[14px] font-medium text-muted transition hover:bg-subtle hover:text-ink">
              {showAll ? 'Show less' : `Show all ${entries.length} entries`}
            </button>
          )}
        </div>
      )}

      <ActivityComposer open={!!composer} entry={composer?.entry} onClose={() => setComposer(null)} projectId={projectId} />
    </Card>
  );
}
