import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useRefreshProject } from '../lib/hooks';
import type { Project } from '../lib/types';
import { useConfirm, useToast } from '../components/feedback';

/** Archive / restore / delete, with confirmation and toasts. The dashboard re-selects a project if the current one disappears. */
export function useProjectActions() {
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefreshProject();

  const archive = useMutation({
    mutationFn: (project: Project) => api.updateProject(project.id, { archived: !project.archived }),
    onSuccess: (project) => {
      toast.success(project.archived ? `Archived “${project.name}”` : `Restored “${project.name}”`);
      return refresh(project.id);
    },
    onError: toast.error,
  });

  const remove = useMutation({
    mutationFn: (project: Project) => api.deleteProject(project.id),
    onSuccess: (_data, project) => {
      toast.success(`Deleted “${project.name}”`);
      return refresh();
    },
    onError: toast.error,
  });

  return {
    toggleArchive: (project: Project) => archive.mutateAsync(project).catch(() => {}),
    deleteProject: async (project: Project) => {
      const ok = await confirm({
        title: `Delete “${project.name}”?`,
        message: 'This permanently removes the project with its checklist and activity log. This can’t be undone.',
        confirmLabel: 'Delete project',
        danger: true,
      });
      if (ok) await remove.mutateAsync(project).catch(() => {});
    },
  };
}
