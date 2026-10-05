import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export const queryKeys = {
  config: ['config'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['project', id] as const,
  activity: (params: { limit: number; project_id?: string }) => ['activity', params] as const,
  templates: ['templates'] as const,
};

export function useConfig() {
  return useQuery({ queryKey: queryKeys.config, queryFn: api.config, staleTime: Infinity });
}

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: api.listProjects });
}

export function useProject(id: string) {
  return useQuery({ queryKey: queryKeys.project(id), queryFn: () => api.getProject(id) });
}

export function useTemplates() {
  return useQuery({ queryKey: queryKeys.templates, queryFn: api.listTemplates });
}

export function useActivity(limit: number, projectId?: string) {
  return useQuery({
    queryKey: queryKeys.activity({ limit, project_id: projectId }),
    queryFn: () => api.listActivity({ limit, project_id: projectId }),
  });
}

/** Refreshes everything that can change when a project (or anything inside it) changes. */
export function useRefreshProject() {
  const qc = useQueryClient();
  return useCallback(
    (projectId?: string) =>
      Promise.all([
        projectId ? qc.invalidateQueries({ queryKey: queryKeys.project(projectId) }) : null,
        qc.invalidateQueries({ queryKey: queryKeys.projects }),
        qc.invalidateQueries({ queryKey: ['activity'] }),
      ]),
    [qc],
  );
}

function readStorage(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Small per-browser preference stored in localStorage (falls back gracefully). */
export function useLocalSetting(key: string, fallback: string) {
  const [value, setValue] = useState(() => readStorage(key, fallback));
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) setValue(event.newValue ?? fallback);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, fallback]);
  const update = useCallback(
    (next: string) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* storage unavailable — keep in memory only */
      }
    },
    [key],
  );
  return [value, update] as const;
}

export function useAuthorName() {
  return useLocalSetting('tracker.author', '');
}
