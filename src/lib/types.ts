export type ProjectStatus = 'not_started' | 'processing' | 'in_review' | 'on_hold' | 'completed';
export type ChecklistState = 'pending' | 'in_progress' | 'done';

export interface CustomField {
  label: string;
  value: string;
}

export interface Project {
  id: string;
  name: string;
  code: string | null;
  client: string | null;
  location: string | null;
  category: string | null;
  description: string | null;
  lead: string | null;
  start_date: string | null;
  due_date: string | null;
  area: string | null;
  levels: string | null;
  output_types: string | null;
  software: string | null;
  custom_fields: CustomField[];
  status: ProjectStatus;
  status_mode: 'auto' | 'manual';
  archived: boolean;
  status_changed_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  items_total: number;
  items_done: number;
  progress: number;
  current_stage: string | null;
  last_activity_at: string | null;
}

export type ProjectInput = Partial<
  Pick<
    Project,
    | 'name'
    | 'code'
    | 'client'
    | 'location'
    | 'category'
    | 'description'
    | 'lead'
    | 'start_date'
    | 'due_date'
    | 'area'
    | 'levels'
    | 'output_types'
    | 'software'
    | 'custom_fields'
    | 'archived'
    | 'status'
    | 'status_mode'
  >
> & { template_id?: string | null };

export interface ChecklistItem {
  id: string;
  project_id: string;
  title: string;
  note: string | null;
  icon: string | null;
  state: ChecklistState;
  progress: number;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityEntry {
  id: string;
  project_id: string;
  type: string;
  title: string;
  details: string | null;
  author: string | null;
  occurred_at: string;
  created_at: string;
  project_name?: string;
  project_archived?: boolean;
}

export interface TemplateItem {
  title: string;
  note?: string | null;
  icon?: string | null;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  items: TemplateItem[];
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail {
  project: Project;
  items: ChecklistItem[];
  activity: ActivityEntry[];
}

export interface AppConfig {
  appName: string;
}
