import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { useActivity, useProjects } from '../lib/hooks';
import type { ActivityEntry } from '../lib/types';
import { ActivityComposer } from '../components/ActivityComposer';
import { ActivityList } from '../components/ActivityList';
import { Button, Card, EmptyState, PageLoader } from '../components/ui';

const PAGE = 50;

export function ActivityPage() {
  const [projectId, setProjectId] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<ActivityEntry | null>(null);
  const { data: entries, isLoading, isFetching } = useActivity(limit, projectId || undefined);
  const { data: projects } = useProjects();

  useEffect(() => {
    document.title = 'Activity';
  }, []);

  return (
    <Card className="mx-auto max-w-4xl p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] sm:text-[44px]">Activity</h1>
          <p className="mt-1 text-[16px] text-muted sm:text-lg">Everything logged across your projects, newest first.</p>
        </div>
        <select
          className="field w-full sm:w-64"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setLimit(PAGE);
          }}
          aria-label="Filter by project"
        >
          <option value="">All projects</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <PageLoader />
        ) : !entries?.length ? (
          <EmptyState icon={History} title="No activity yet">
            Open a project and use “Log” in its Activity Log to record what’s been done.
          </EmptyState>
        ) : (
          <>
            <ActivityList entries={entries} onEdit={setEditing} showProject={!projectId} />
            {entries.length >= limit && (
              <div className="mt-4 flex justify-center">
                <Button onClick={() => setLimit((l) => l + PAGE)} loading={isFetching}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ActivityComposer open={!!editing} entry={editing} projectId={editing?.project_id ?? ''} onClose={() => setEditing(null)} />
    </Card>
  );
}
