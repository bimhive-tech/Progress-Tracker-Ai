import { createContext, useContext, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { Check, FilePlus2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useRefreshProject, useTemplates } from '../lib/hooks';
import { stepIcon } from '../lib/meta';
import { useSelection } from '../lib/selection';
import { useToast } from './feedback';
import { Button, Field, Modal } from './ui';

const NewProjectContext = createContext<() => void>(() => {});

export function useNewProject() {
  return useContext(NewProjectContext);
}

export function NewProjectProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { canEdit } = useAuth();
  return (
    <NewProjectContext.Provider value={() => canEdit && setOpen(true)}>
      {children}
      {open && canEdit && <NewProjectModal onClose={() => setOpen(false)} />}
    </NewProjectContext.Provider>
  );
}

const empty = { name: '', code: '', client: '', location: '', due_date: '', description: '' };

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState(empty);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const { data: templates } = useTemplates();
  const { openProject } = useSelection();
  const toast = useToast();
  const refresh = useRefreshProject();

  const create = useMutation({
    mutationFn: () => api.createProject({ ...form, template_id: templateId }),
    onSuccess: async (project) => {
      await refresh();
      toast.success(`Created “${project.name}”`);
      onClose();
      openProject(project.id);
    },
    onError: toast.error,
  });

  const set = (key: keyof typeof empty) => (event: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    create.mutate();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New project"
      description="Add the basics now — you can fill in the rest of the project data later."
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="new-project-form" loading={create.isPending} disabled={!form.name.trim()} icon={FilePlus2}>
            Create project
          </Button>
        </>
      }
    >
      <form id="new-project-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Project name *">
            <input className="field" value={form.name} onChange={set('name')} placeholder="e.g. Riverside Mixed Use" autoFocus maxLength={200} />
          </Field>
          <Field label="Reference / code">
            <input className="field" value={form.code} onChange={set('code')} placeholder="BIM-004" maxLength={60} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Client">
            <input className="field" value={form.client} onChange={set('client')} placeholder="Client name" />
          </Field>
          <Field label="Location">
            <input className="field" value={form.location} onChange={set('location')} placeholder="City, site…" />
          </Field>
          <Field label="Due date">
            <input className="field" type="date" value={form.due_date} onChange={set('due_date')} />
          </Field>
        </div>
        <Field label="Description">
          <textarea className="field" rows={2} value={form.description} onChange={set('description')} placeholder="What's the scope of this project?" />
        </Field>

        <div>
          <span className="mb-2 block text-[12.5px] font-medium text-muted">Checklist</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <TemplateOption selected={templateId === null} onSelect={() => setTemplateId(null)} title="Blank checklist" subtitle="Add your own steps later" />
            {templates?.map((template) => (
              <TemplateOption
                key={template.id}
                selected={templateId === template.id}
                onSelect={() => setTemplateId(template.id)}
                title={template.name}
                subtitle={`${template.items.length} steps`}
                icons={template.items.slice(0, 6).map((item) => item.icon ?? null)}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function TemplateOption({
  selected,
  onSelect,
  title,
  subtitle,
  icons,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  icons?: (string | null)[];
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        'flex items-start gap-3 border p-3 text-left transition',
        selected ? 'border-accent/70 bg-accent-wash ring-3 ring-accent/10' : 'border-line hover:border-line-strong hover:bg-white/[0.02]',
      )}
    >
      <span
        className={clsx(
          'mt-0.5 grid size-[18px] shrink-0 place-items-center border transition',
          selected ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong bg-sidebar',
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{title}</span>
        <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted">
          {subtitle}
          {icons && (
            <span className="flex gap-1 text-faint">
              {icons.map((key, i) => {
                const Icon = stepIcon(key);
                return <Icon key={i} className="size-3.5" strokeWidth={1.8} />;
              })}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
