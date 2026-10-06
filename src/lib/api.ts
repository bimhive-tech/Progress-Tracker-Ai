import type {
  ActivityEntry,
  AppConfig,
  AuthUser,
  ChecklistItem,
  ChecklistState,
  Project,
  ProjectDetail,
  ProjectInput,
  Template,
  TemplateItem,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

/** Called when the session has expired mid-use, so the app can show the sign-in screen again. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/')) onUnauthorized?.();
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status);
  }
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

  me: () => request<AuthUser | null>('GET', '/auth/me'),
  login: (username: string, password: string) => request<AuthUser>('POST', '/auth/login', { username, password }),
  logout: () => request<void>('POST', '/auth/logout'),

  listProjects: () => request<Project[]>('GET', '/projects'),
  getProject: (id: string) => request<ProjectDetail>('GET', `/projects/${id}`),
  createProject: (input: ProjectInput) => request<Project>('POST', '/projects', input),
  updateProject: (id: string, input: ProjectInput) => request<Project>('PATCH', `/projects/${id}`, input),
  deleteProject: (id: string) => request<void>('DELETE', `/projects/${id}`),

  listChecklists: () => request<ChecklistItem[]>('GET', '/checklist'),
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

