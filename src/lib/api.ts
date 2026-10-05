import type {
  ActivityEntry,
  AppConfig,
  ChecklistItem,
  ChecklistState,
  Project,
  ProjectDetail,
  ProjectInput,
  Template,
  TemplateItem,
} from './types';

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}

export type ActivityInput = {
  type?: string;
  title?: string;
  details?: string | null;
  author?: string | null;
  occurred_at?: string;
};

export type ChecklistInput = {
  title?: string;
  note?: string | null;
  icon?: string | null;
  state?: ChecklistState;
  progress?: number;
};

export const api = {
  config: () => request<AppConfig>('GET', '/config'),

  listProjects: () => request<Project[]>('GET', '/projects'),
  getProject: (id: string) => request<ProjectDetail>('GET', `/projects/${id}`),
  createProject: (input: ProjectInput) => request<Project>('POST', '/projects', input),
  updateProject: (id: string, input: ProjectInput) => request<Project>('PATCH', `/projects/${id}`, input),
  deleteProject: (id: string) => request<void>('DELETE', `/projects/${id}`),

  addChecklistItem: (projectId: string, input: ChecklistInput) =>
    request<ChecklistItem>('POST', `/projects/${projectId}/checklist`, input),
  applyTemplate: (projectId: string, templateId: string) =>
    request<ChecklistItem[]>('POST', `/projects/${projectId}/checklist/from-template`, { template_id: templateId }),
  reorderChecklist: (projectId: string, ids: string[]) =>
    request<void>('PUT', `/projects/${projectId}/checklist/order`, { ids }),
  updateChecklistItem: (id: string, input: ChecklistInput) => request<ChecklistItem>('PATCH', `/checklist/${id}`, input),
  deleteChecklistItem: (id: string) => request<void>('DELETE', `/checklist/${id}`),

  listActivity: (params: { limit?: number; project_id?: string; before?: string } = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) search.set(key, String(value));
    return request<ActivityEntry[]>('GET', `/activity?${search}`);
  },
  addActivity: (projectId: string, input: ActivityInput) =>
    request<ActivityEntry>('POST', `/projects/${projectId}/activity`, input),
  updateActivity: (id: string, input: ActivityInput) => request<ActivityEntry>('PATCH', `/activity/${id}`, input),
  deleteActivity: (id: string) => request<void>('DELETE', `/activity/${id}`),

  listTemplates: () => request<Template[]>('GET', '/templates'),
  createTemplate: (input: { name: string; description?: string | null; items: TemplateItem[] }) =>
    request<Template>('POST', '/templates', input),
  updateTemplate: (id: string, input: { name?: string; description?: string | null; items?: TemplateItem[] }) =>
    request<Template>('PATCH', `/templates/${id}`, input),
  deleteTemplate: (id: string) => request<void>('DELETE', `/templates/${id}`),
};

