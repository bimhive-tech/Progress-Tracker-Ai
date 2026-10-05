import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ListChecks, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { queryKeys, useTemplates } from '../lib/hooks';
import { stepIcon } from '../lib/meta';
import type { Template, TemplateItem } from '../lib/types';
import { useConfirm, useToast } from '../components/feedback';
import { IconPicker } from '../components/IconPicker';
import { Button, Card, EmptyState, Field, IconButton, Modal, PageLoader } from '../components/ui';

export function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    document.title = 'Templates';
  }, []);

  const remove = useMutation({
    mutationFn: (template: Template) => api.deleteTemplate(template.id),
    onSuccess: (_d, template) => {
      toast.success(`Deleted “${template.name}”`);
      return qc.invalidateQueries({ queryKey: queryKeys.templates });
    },
    onError: toast.error,
  });

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] sm:text-[44px]">Templates</h1>
          <p className="mt-1 text-[16px] text-muted sm:text-lg">Reusable checklists you can apply to new or existing projects.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
          New template
        </Button>
      </div>

      <div className="mt-7">
        {isLoading ? (
          <PageLoader />
        ) : !templates?.length ? (
          <EmptyState
            icon={ListChecks}
            title="No templates yet"
            action={
              <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
                Create a template
              </Button>
            }
          >
            Save the steps you repeat on every project, then start new projects from them in one click.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4">
            {templates.map((template) => (
              <div key={template.id} className="flex flex-col rounded-[20px] border border-line bg-subtle/50 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-semibold text-ink">{template.name}</h3>
                    <p className="text-[13.5px] text-muted">{template.items.length} steps</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton icon={Pencil} label="Edit template" onClick={() => setEditing(template)} />
                    <IconButton
                      icon={Trash2}
                      label="Delete template"
                      tone="danger"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Delete “${template.name}”?`,
                          message: 'Projects that already used it keep their checklists.',
                          confirmLabel: 'Delete',
                          danger: true,
                        });
                        if (ok) remove.mutate(template);
                      }}
                    />
                  </div>
                </div>
                {template.description && <p className="mt-2 text-[14px] text-ink-soft">{template.description}</p>}
                <ol className="mt-4 space-y-2">
                  {template.items.slice(0, 8).map((item, index) => {
                    const Icon = stepIcon(item.icon);
                    return (
                      <li key={index} className="flex items-center gap-3 text-[14px] text-ink-soft">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white text-muted shadow-[0_0_0_1px_var(--color-line)]">
                          <Icon className="size-3.5" strokeWidth={1.8} />
                        </span>
                        <span className="truncate">{item.title}</span>
                      </li>
                    );
                  })}
                  {template.items.length > 8 && <li className="pl-10 text-[13px] text-faint">+{template.items.length - 8} more</li>}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateEditor template={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />
    </Card>
  );
}

function TemplateEditor({ template, open, onClose }: { template: Template | null; open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<TemplateItem[]>([]);
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? '');
    setDescription(template?.description ?? '');
    setItems(template?.items.map((i) => ({ ...i })) ?? [{ title: '', note: '', icon: null }]);
  }, [open, template]);

  const save = useMutation({
    mutationFn: () => {
      const input = { name: name.trim(), description: description.trim() || null, items: items.filter((i) => i.title.trim()) };
      return template ? api.updateTemplate(template.id, input) : api.createTemplate(input);
    },
    onSuccess: () => {
      toast.success(template ? 'Template updated' : 'Template created');
      onClose();
      return qc.invalidateQueries({ queryKey: queryKeys.templates });
    },
    onError: toast.error,
  });

  const update = (index: number, patch: Partial<TemplateItem>) => setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index: number, delta: number) =>
    setItems((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item!);
      return copy;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) save.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? 'Edit template' : 'New template'}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="template-form" loading={save.isPending} disabled={!name.trim()}>
            {template ? 'Save changes' : 'Create template'}
          </Button>
        </>
      }
    >
      <form id="template-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Scan to BIM" autoFocus maxLength={200} />
          </Field>
          <Field label="Description">
            <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When to use it" maxLength={2000} />
          </Field>
        </div>

        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink-soft">Steps</span>
          <ol className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-[13px] text-faint tabular-nums">{index + 1}</span>
                <IconPicker value={item.icon ?? null} onChange={(icon) => update(index, { icon })} />
                <input
                  className="field min-w-0 flex-[1.3]"
                  value={item.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                  placeholder="Step title"
                  maxLength={200}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setItems((list) => [...list.slice(0, index + 1), { title: '', note: '', icon: null }, ...list.slice(index + 1)]);
                      requestAnimationFrame(() => {
                        const inputs = document.querySelectorAll<HTMLInputElement>('#template-form ol input[placeholder="Step title"]');
                        inputs[index + 1]?.focus();
                      });
                    }
                  }}
                />
                <input className="field hidden min-w-0 flex-1 sm:block" value={item.note ?? ''} onChange={(e) => update(index, { note: e.target.value })} placeholder="Note (optional)" maxLength={1000} />
                <div className="flex shrink-0">
                  <IconButton icon={ArrowUp} label="Move up" onClick={() => move(index, -1)} disabled={index === 0} />
                  <IconButton icon={ArrowDown} label="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1} />
                  <IconButton icon={X} label="Remove step" tone="danger" onClick={() => setItems((list) => list.filter((_, i) => i !== index))} />
                </div>
              </li>
            ))}
          </ol>
          <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setItems((list) => [...list, { title: '', note: '', icon: null }])}>
            Add step
          </Button>
        </div>
      </form>
    </Modal>
  );
}
