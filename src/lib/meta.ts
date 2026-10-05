import {
  Box,
  Building2,
  Camera,
  ChartNoAxesColumn,
  CircleCheck,
  CircleDashed,
  CirclePause,
  ClipboardCheck,
  Clock,
  Cpu,
  Database,
  DoorOpen,
  DraftingCompass,
  Eye,
  File,
  FileCheck,
  Flag,
  Image,
  Layers,
  LayoutGrid,
  LoaderCircle,
  Package,
  PenTool,
  Play,
  Ruler,
  Scan,
  Search,
  Send,
  ShieldCheck,
  StickyNote,
  TriangleAlert,
  Upload,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ProjectStatus } from './types';

export type StatusMeta = {
  label: string;
  icon: LucideIcon;
  /** text colour */
  fg: string;
  /** tinted background */
  bg: string;
  /** solid accent for dots / bars */
  accent: string;
};

export const STATUS_ORDER: ProjectStatus[] = ['not_started', 'processing', 'in_review', 'on_hold', 'completed'];

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  not_started: { label: 'Not started', icon: CircleDashed, fg: '#6f6b63', bg: '#f1efeb', accent: '#b9b4ab' },
  processing: { label: 'Processing', icon: LoaderCircle, fg: '#c26a22', bg: '#fdf1e5', accent: '#d98a3d' },
  in_review: { label: 'In review', icon: Clock, fg: '#8d6a17', bg: '#f8f0d9', accent: '#c4a03c' },
  on_hold: { label: 'On hold', icon: CirclePause, fg: '#5f6b78', bg: '#edf0f3', accent: '#8995a3' },
  completed: { label: 'Completed', icon: CircleCheck, fg: '#2f7d3b', bg: '#e9f3e9', accent: '#3f8f4b' },
};

/** Icons offered for checklist steps and templates. Keys are stored in the database. */
export const STEP_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  'file-check': { icon: FileCheck, label: 'Files' },
  layers: { icon: Layers, label: 'Layers' },
  chart: { icon: ChartNoAxesColumn, label: 'Levels' },
  box: { icon: Box, label: 'Model' },
  door: { icon: DoorOpen, label: 'Doors' },
  grid: { icon: LayoutGrid, label: 'Windows / grid' },
  shield: { icon: ShieldCheck, label: 'QA' },
  upload: { icon: Upload, label: 'Export' },
  camera: { icon: Camera, label: 'Capture' },
  scan: { icon: Scan, label: 'Scan' },
  cpu: { icon: Cpu, label: 'Processing' },
  database: { icon: Database, label: 'Data' },
  wrench: { icon: Wrench, label: 'Clean-up' },
  pen: { icon: PenTool, label: 'Drafting' },
  compass: { icon: DraftingCompass, label: 'CAD' },
  ruler: { icon: Ruler, label: 'Measure' },
  search: { icon: Search, label: 'Analyse' },
  eye: { icon: Eye, label: 'Review' },
  clipboard: { icon: ClipboardCheck, label: 'Checks' },
  image: { icon: Image, label: 'Render' },
  building: { icon: Building2, label: 'Building' },
  package: { icon: Package, label: 'Package' },
  send: { icon: Send, label: 'Deliver' },
  flag: { icon: Flag, label: 'Milestone' },
  file: { icon: File, label: 'Document' },
};

export function stepIcon(key: string | null | undefined): LucideIcon {
  return (key && STEP_ICONS[key]?.icon) || File;
}

export const ACTIVITY_TYPES: Record<string, { icon: LucideIcon; label: string }> = {
  note: { icon: StickyNote, label: 'Note' },
  start: { icon: Play, label: 'Started' },
  data: { icon: Database, label: 'Data gathered' },
  upload: { icon: Upload, label: 'Files received' },
  processing: { icon: Cpu, label: 'Processing' },
  modeling: { icon: Box, label: 'Modelling' },
  render: { icon: Image, label: 'Rendering' },
  review: { icon: Eye, label: 'Review' },
  meeting: { icon: Users, label: 'Meeting / feedback' },
  issue: { icon: TriangleAlert, label: 'Issue' },
  milestone: { icon: Flag, label: 'Milestone' },
  delivery: { icon: Send, label: 'Delivered' },
};

export function activityIcon(type: string): LucideIcon {
  return ACTIVITY_TYPES[type]?.icon ?? StickyNote;
}

/** One-click starting points for common log entries. */
export const ACTIVITY_PRESETS: { type: string; title: string }[] = [
  { type: 'data', title: 'Data gathered' },
  { type: 'upload', title: 'Files received from client' },
  { type: 'processing', title: 'Processed in Blender' },
  { type: 'modeling', title: 'Modelled in Revit' },
  { type: 'review', title: 'Sent for review' },
  { type: 'meeting', title: 'Client feedback received' },
  { type: 'delivery', title: 'Delivered to client' },
];

