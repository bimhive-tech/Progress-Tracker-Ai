import { dueInfo } from '../lib/format';
import { STATUS_META, STATUS_ORDER } from '../lib/meta';
import type { Project, ProjectStatus } from '../lib/types';

export type Filter = 'all' | 'active' | ProjectStatus | 'overdue' | 'archived';
export type Sort = 'updated' | 'created' | 'name' | 'due' | 'progress';

export const SORTS: { value: Sort; label: string }[] = [
  { value: 'updated', label: 'Last updated' },
  { value: 'created', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'due', label: 'Due date' },
  { value: 'progress', label: 'Progress' },
];

export const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All projects' },
  { value: 'active', label: 'Active' },
  ...STATUS_ORDER.map((status) => ({ value: status as Filter, label: STATUS_META[status].label })),
  { value: 'overdue', label: 'Overdue' },
  { value: 'archived', label: 'Archived' },
];

export function filterLabel(filter: string) {
  return FILTERS.find((f) => f.value === filter)?.label ?? 'All projects';
}

export function isOverdue(project: Project) {
  return !project.archived && project.status !== 'completed' && dueInfo(project.due_date).tone === 'late';
}

export function matchesFilter(project: Project, filter: string) {
  if (filter === 'archived') return project.archived;
  if (project.archived) return false;
  if (filter === 'active') return project.status !== 'completed';
  if (filter === 'overdue') return isOverdue(project);
  if ((STATUS_ORDER as string[]).includes(filter)) return project.status === filter;
  return true;
}

export function matchesQuery(project: Project, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [project.name, project.code, project.client, project.location, project.category, project.description].some((v) =>
    v?.toLowerCase().includes(q),
  );
}

export function sortProjects(projects: Project[], sort: string) {
  const list = [...projects];
  switch (sort) {
    case 'created':
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
    case 'due':
      return list.sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
    case 'progress':
      return list.sort((a, b) => b.progress - a.progress);
    default:
      return list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const recent = (iso: string | null) => !!iso && Date.now() - new Date(iso).getTime() < THIRTY_DAYS;

export type Stat = { value: number; delta: number };

/** Headline numbers for the portfolio. Deltas count changes in the last 30 days. */
export function portfolioStats(projects: Project[]) {
  const live = projects.filter((p) => !p.archived);
  const byStatus = (status: ProjectStatus) => live.filter((p) => p.status === status);
  const active = live.filter((p) => p.status !== 'completed');
  return {
    active: { value: active.length, delta: active.filter((p) => recent(p.created_at)).length },
    processing: { value: byStatus('processing').length, delta: byStatus('processing').filter((p) => recent(p.status_changed_at)).length },
    in_review: { value: byStatus('in_review').length, delta: byStatus('in_review').filter((p) => recent(p.status_changed_at)).length },
    completed: { value: byStatus('completed').length, delta: byStatus('completed').filter((p) => recent(p.completed_at)).length },
    overdue: { value: live.filter(isOverdue).length, delta: 0 },
  } satisfies Record<string, Stat>;
}

export function filterCounts(projects: Project[]) {
  const counts: Record<string, number> = {};
  for (const { value } of FILTERS) counts[value] = projects.filter((p) => matchesFilter(p, value)).length;
  return counts;
}
