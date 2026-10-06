import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { api } from '../lib/api';
import { queryKeys } from '../lib/hooks';
import type { Template, TemplateItem } from '../lib/types';
import { useToast } from './feedback';
import { IconPicker } from './IconPicker';
import { Button, Field, IconButton, Modal } from './ui';

export function TemplateEditor({ template, open, onClose }: { template: Template | null; open: boolean; onClose: () => void }) {
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
      description="A reusable checklist you can start new projects from, or add to an existing one."
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
          <span className="mb-2 block text-[12.5px] font-medium text-muted">Steps</span>
          <ol className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-[12.5px] text-faint tabular-nums">{index + 1}</span>
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
                <input
                  className="field hidden min-w-0 flex-1 sm:block"
                  value={item.note ?? ''}
                  onChange={(e) => update(index, { note: e.target.value })}
                  placeholder="Note (optional)"
                  maxLength={1000}
                />
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
