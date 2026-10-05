import { forwardRef, useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Plus, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useRefreshProject } from '../../lib/hooks';
import type { CustomField, Project, ProjectInput } from '../../lib/types';
import { useToast } from '../feedback';
import { Button, Card, Field, IconButton } from '../ui';

type TextKey =
  | 'name'
  | 'code'
  | 'client'
  | 'location'
  | 'category'
  | 'lead'
  | 'start_date'
  | 'due_date'
  | 'area'
  | 'levels'
  | 'software'
  | 'output_types'
  | 'description';

const FIELDS: { key: TextKey; label: string; placeholder?: string; type?: 'date' | 'textarea'; wide?: boolean }[] = [
  { key: 'name', label: 'Project name', wide: true },
  { key: 'code', label: 'Reference / code', placeholder: 'BIM-004' },
  { key: 'client', label: 'Client', placeholder: 'Client name' },
  { key: 'location', label: 'Location', placeholder: 'Address or site' },
  { key: 'category', label: 'Building type', placeholder: 'Residential, office…' },
  { key: 'lead', label: 'Project lead', placeholder: 'Who owns it' },
  { key: 'start_date', label: 'Start date', type: 'date' },
  { key: 'due_date', label: 'Due date', type: 'date' },
  { key: 'area', label: 'Area', placeholder: 'e.g. 4,200 m²' },
  { key: 'levels', label: 'Levels', placeholder: 'e.g. B1, GF, L1, L2' },
  { key: 'software', label: 'Software', placeholder: 'Revit, Blender…' },
  { key: 'output_types', label: 'Output types', placeholder: 'RVT, IFC, PDF' },
  { key: 'description', label: 'Description', type: 'textarea', wide: true, placeholder: 'Scope, notes, anything worth knowing' },
];

type Draft = Record<TextKey, string> & { custom_fields: CustomField[] };

function toDraft(project: Project): Draft {
  const draft = { custom_fields: project.custom_fields.map((f) => ({ ...f })) } as Draft;
  for (const field of FIELDS) draft[field.key] = (project[field.key] as string | null) ?? '';
  return draft;
}

export const DetailsCard = forwardRef<HTMLDivElement, { project: Project; editing: boolean; onEditingChange: (editing: boolean) => void }>(
  function DetailsCard({ project, editing, onEditingChange }, ref) {
    const [draft, setDraft] = useState(() => toDraft(project));
    const refresh = useRefreshProject();
    const toast = useToast();

    useEffect(() => {
      if (editing) setDraft(toDraft(project));
      // Only reset when entering edit mode, not on every background refresh.
    }, [editing]);

    const save = useMutation({
      mutationFn: () => {
        const input: ProjectInput = { custom_fields: draft.custom_fields.filter((f) => f.label.trim() || f.value.trim()) };
        for (const field of FIELDS) (input as Record<string, unknown>)[field.key] = draft[field.key];
        return api.updateProject(project.id, input);
      },
      onSuccess: () => {
        toast.success('Project details saved');
        onEditingChange(false);
        return refresh(project.id);
      },
      onError: toast.error,
    });

    const submit = (event: FormEvent) => {
      event.preventDefault();
      if (!draft.name.trim()) return toast.error('Project name is required');
      save.mutate();
    };

    const setField = (key: TextKey, value: string) => setDraft((d) => ({ ...d, [key]: value }));
    const setCustom = (index: number, patch: Partial<CustomField>) =>
      setDraft((d) => ({ ...d, custom_fields: d.custom_fields.map((f, i) => (i === index ? { ...f, ...patch } : f)) }));

    return (
      <div ref={ref} className="scroll-mt-5">
        <Card className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[21px] font-semibold tracking-[-0.02em]">Project details</h2>
            {!editing ? (
              <Button size="sm" icon={Pencil} onClick={() => onEditingChange(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onEditingChange(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" form="details-form" loading={save.isPending}>
                  Save
                </Button>
              </div>
            )}
          </div>

          {editing ? (
            <form id="details-form" onSubmit={submit} className="mt-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {FIELDS.map((field) => (
                  <Field key={field.key} label={field.label} className={field.wide ? 'sm:col-span-2 xl:col-span-3' : undefined}>
                    {field.type === 'textarea' ? (
                      <textarea className="field" rows={3} value={draft[field.key]} placeholder={field.placeholder} onChange={(e) => setField(field.key, e.target.value)} />
                    ) : (
                      <input
                        className="field"
                        type={field.type ?? 'text'}
                        value={draft[field.key]}
                        placeholder={field.placeholder}
                        onChange={(e) => setField(field.key, e.target.value)}
                        autoFocus={field.key === 'name'}
                      />
                    )}
                  </Field>
                ))}
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink-soft">Custom fields</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Plus}
                    onClick={() => setDraft((d) => ({ ...d, custom_fields: [...d.custom_fields, { label: '', value: '' }] }))}
                  >
                    Add field
                  </Button>
                </div>
                {draft.custom_fields.length === 0 ? (
                  <p className="rounded-xl bg-subtle px-3.5 py-3 text-[13.5px] text-muted">
                    Add anything else you track — LOD, coordinate system, survey date, contract number…
                  </p>
                ) : (
                  <div className="space-y-2">
                    {draft.custom_fields.map((field, index) => (
                      <div key={index} className="flex gap-2">
                        <input className="field w-2/5" value={field.label} placeholder="Label (e.g. LOD)" onChange={(e) => setCustom(index, { label: e.target.value })} maxLength={100} />
                        <input className="field flex-1" value={field.value} placeholder="Value (e.g. 300)" onChange={(e) => setCustom(index, { value: e.target.value })} maxLength={2000} />
                        <IconButton
                          icon={X}
                          label="Remove field"
                          size="md"
                          className="h-11"
                          onClick={() => setDraft((d) => ({ ...d, custom_fields: d.custom_fields.filter((_, i) => i !== index) }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          ) : (
            <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
              {FIELDS.filter((f) => f.key !== 'name').map((field) => {
                const raw = project[field.key] as string | null;
                const value = raw && field.type === 'date' ? formatDate(raw) : raw;
                return (
                  <div key={field.key} className={field.wide ? 'sm:col-span-2 xl:col-span-3' : undefined}>
                    <dt className="text-[13px] text-muted">{field.label}</dt>
                    <dd className={value ? 'mt-0.5 text-[15px] whitespace-pre-line text-ink' : 'mt-0.5 text-[15px] text-faint'}>{value || '—'}</dd>
                  </div>
                );
              })}
              {project.custom_fields.map((field, index) => (
                <div key={`custom-${index}`}>
                  <dt className="text-[13px] text-muted">{field.label || 'Untitled'}</dt>
                  <dd className="mt-0.5 text-[15px] whitespace-pre-line text-ink">{field.value || '—'}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>
    );
  },
);
