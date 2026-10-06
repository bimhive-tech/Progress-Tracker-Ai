import { forwardRef, useEffect, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { ClipboardList, Pencil, Plus, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate } from '../lib/format';
import { useRefreshProject } from '../lib/hooks';
import type { CustomField, Project, ProjectInput } from '../lib/types';
import { useToast } from '../components/feedback';
import { Button, Card, Field, IconButton, PanelHeader } from '../components/ui';

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

export const DetailsPanel = forwardRef<
  HTMLDivElement,
  { project: Project; editing: boolean; onEditingChange: (editing: boolean) => void; className?: string }
>(function DetailsPanel({ project, editing, onEditingChange, className }, ref) {
  const [draft, setDraft] = useState(() => toDraft(project));
  const { canEdit } = useAuth();
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

  const filled = FIELDS.filter((f) => f.key !== 'name' && project[f.key]).length + project.custom_fields.length;

  return (
    <div ref={ref} className={clsx('scroll-mt-4', className)}>
      <Card className={clsx('@container p-4 sm:p-5', editing && 'border-accent/40')}>
        <PanelHeader
          title="Project details"
          icon={ClipboardList}
          meta={!editing ? `${filled} of ${FIELDS.length - 1 + project.custom_fields.length} filled` : undefined}
          actions={
            !canEdit ? null : !editing ? (
              <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEditingChange(true)}>
                Edit
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={() => onEditingChange(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" form="details-form" loading={save.isPending}>
                  Save
                </Button>
              </>
            )
          }
        />

        {editing && canEdit ? (
          <form id="details-form" onSubmit={submit} className="mt-4" onKeyDown={(e) => e.key === 'Escape' && onEditingChange(false)}>
            <div className="grid grid-cols-1 gap-3.5 @md:grid-cols-2">
              {FIELDS.map((field) => (
                <Field key={field.key} label={field.label} className={field.wide ? '@md:col-span-2' : undefined}>
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

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-muted">Custom fields</span>
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
                <p className="bg-sidebar px-3.5 py-3 text-[13px] text-muted">Add anything else you track — LOD, coordinate system, survey date, contract number…</p>
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
                        className="h-10"
                        onClick={() => setDraft((d) => ({ ...d, custom_fields: d.custom_fields.filter((_, i) => i !== index) }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        ) : (
          <dl className="mt-3 grid grid-cols-1 gap-x-6 @md:grid-cols-2">
            {FIELDS.filter((f) => f.key !== 'name').map((field) => {
              const raw = project[field.key] as string | null;
              const value = raw && field.type === 'date' ? formatDate(raw) : raw;
              return (
                <DetailRow
                  key={field.key}
                  label={field.label}
                  value={value}
                  wide={field.wide}
                  onEmptyClick={canEdit ? () => onEditingChange(true) : undefined}
                />
              );
            })}
            {project.custom_fields.map((field, index) => (
              <DetailRow key={`custom-${index}`} label={field.label || 'Untitled'} value={field.value} />
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
});

function DetailRow({ label, value, wide, onEmptyClick }: { label: string; value: string | null | undefined; wide?: boolean; onEmptyClick?: () => void }) {
  return (
    <div className={clsx('border-b border-line/70 py-2.5', wide && '@md:col-span-2')}>
      <dt className="text-[12px] text-muted">{label}</dt>
      {value ? (
        <dd className="mt-0.5 text-[14px] whitespace-pre-line text-ink">{value}</dd>
      ) : onEmptyClick ? (
        <dd className="mt-0.5">
          <button onClick={onEmptyClick} className="text-[14px] text-faint transition hover:text-accent-text">
            Add…
          </button>
        </dd>
      ) : (
        <dd className="mt-0.5 text-[14px] text-faint">—</dd>
      )}
    </div>
  );
}
