import type { ChecklistItem, ChecklistState, ProjectStatus } from './types';

/** Mirrors the server's rules so the UI can update instantly. */
export function computeAutoStatus(states: ChecklistState[]): ProjectStatus {
  if (states.length === 0) return 'not_started';
  if (states.every((s) => s === 'done')) return 'completed';
  if (states.some((s) => s !== 'pending')) return 'processing';
  return 'not_started';
}

export function computeProgress(items: Pick<ChecklistItem, 'state' | 'progress'>[]) {
  if (!items.length) return 0;
  const total = items.reduce((sum, i) => sum + (i.state === 'done' ? 100 : i.state === 'in_progress' ? i.progress : 0), 0);
  return Math.round(total / items.length);
}

export function currentStep<T extends Pick<ChecklistItem, 'state'>>(items: T[]): T | undefined {
  return items.find((i) => i.state === 'in_progress') ?? items.find((i) => i.state === 'pending');
}
