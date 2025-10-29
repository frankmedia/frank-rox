/**
 * TEMPLATE SYSTEM V2 - TypeScript Interfaces
 * Based on PT Web App Technical Spec
 * Generated from Supabase schema
 */

// =====================================================
// ENUMS
// =====================================================

export enum DayType {
  Strength = 'Strength',
  Mobility = 'Mobility',
  Consolidation = 'Consolidation',
  Heat = 'Heat',
  Recovery = 'Recovery',
  Technique = 'Technique',
  Custom = 'Custom',
}

export enum BlockType {
  WarmUp = 'WarmUp',
  Mobility = 'Mobility',
  Stretch = 'Stretch',
  UpperBody = 'UpperBody',
  LowerBody = 'LowerBody',
  Squat = 'Squat',
  Hinge = 'Hinge',
  Push = 'Push',
  Pull = 'Pull',
  Core = 'Core',
  Conditioning = 'Conditioning',
  Accessory = 'Accessory',
  Finisher = 'Finisher',
  Cooldown = 'Cooldown',
  Technique = 'Technique',
  Custom = 'Custom',
}

export enum MobilityCategory {
  Push = 'Push',
  Pull = 'Pull',
  Legs = 'Legs',
}

export enum PrescriptionSource {
  Explicit = 'Explicit',
  FromDayTypeDefaults = 'FromDayTypeDefaults',
}

export enum ProgramStatus {
  Draft = 'Draft',
  Active = 'Active',
  Archived = 'Archived',
}

// =====================================================
// TEMPLATE ENTITIES
// =====================================================

export interface ProgramTemplate {
  id: string;
  name: string;
  days_per_week: number; // 1-7
  notes: string | null;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayTemplate {
  id: string;
  program_template_id: string;
  day_index: number; // 1..days_per_week
  weekday_hint: string | null; // 'Mon', 'Tue', etc.
  day_type: DayType;
  mobility_category: MobilityCategory | null;
  title: string;
  notes: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  day_template_id: string;
  order_index: number;
  block_type: BlockType;
  title: string | null;
  use_day_type_defaults: boolean;
  intensity_rpe: number | null; // decimal
  rest_seconds_default: number | null;
  notes: string | null;
  created_at: string;
}

export interface BlockExercise {
  id: string;
  block_id: string;
  exercise_id: string;
  order_index: number;
  sets: number | null;
  reps: number | null;
  time_seconds: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  intensity: IntensitySpec | null; // JSONB
  prescription_source: PrescriptionSource;
  created_at: string;
}

// =====================================================
// DEFAULTS & RULES
// =====================================================

export interface DayTypeDefault {
  id: string;
  day_type: DayType;
  block_type: BlockType;
  default_sets: number;
  default_reps: number | null;
  default_time_seconds: number | null;
  default_rest_seconds: number;
  default_intensity: IntensitySpec | null; // JSONB
  notes: string | null;
  created_at: string;
}

export interface IntensitySpec {
  rpe?: number;
  percent1RM?: number;
  [key: string]: any; // Allow other intensity metrics
}

// =====================================================
// EXERCISE POOLS
// =====================================================

export interface ExercisePool {
  id: string;
  label: string;
  filters: ExercisePoolFilters; // JSONB
  notes: string | null;
  created_at: string;
}

export interface ExercisePoolFilters {
  include_tags?: string[];
  exclude_tags?: string[];
  include_equipment?: string[];
  exclude_equipment?: string[];
  include_patterns?: string[];
  exclude_patterns?: string[];
  [key: string]: any; // Allow custom filters
}

export interface DayTemplateExercisePoolLink {
  id: string;
  day_template_id: string;
  block_id: string | null; // nullable: pool applies to entire day
  exercise_pool_id: string;
  priority: number;
  created_at: string;
}

// =====================================================
// GENERATED PROGRAM INSTANCES (immutable)
// =====================================================

export interface ProgramInstance {
  id: string;
  program_template_id: string;
  athlete_id: number;
  start_date: string; // date
  weeks: number;
  status: ProgramStatus;
  snapshot_version: number; // template version at generation
  created_at: string;
}

export interface ProgramDay {
  id: string;
  program_instance_id: string;
  calendar_date: string; // date
  day_index: number;
  day_type: DayType;
  mobility_category: MobilityCategory | null;
  title: string;
  notes: string | null;
  created_at: string;
}

export interface ProgramBlock {
  id: string;
  program_day_id: string;
  order_index: number;
  block_type: BlockType;
  title: string;
  intensity_rpe: number | null;
  rest_seconds_default: number | null;
  notes: string | null;
  created_at: string;
}

export interface ProgramExercise {
  id: string;
  program_block_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: number | null;
  time_seconds: number | null;
  tempo: string | null;
  rest_seconds: number;
  intensity: IntensitySpec | null;
  source_info: SourceInfo | null; // JSONB
  created_at: string;
}

export interface SourceInfo {
  from_block_exercise_id?: string;
  from_defaults?: boolean;
  rules?: string[];
  [key: string]: any;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateTemplateRequest {
  name: string;
  days_per_week: number;
  notes?: string;
}

export interface CreateDayTemplateRequest {
  day_index: number;
  weekday_hint?: string;
  day_type: DayType;
  mobility_category?: MobilityCategory;
  title: string;
  notes?: string;
}

export interface CreateBlockRequest {
  order_index: number;
  block_type: BlockType;
  title?: string;
  use_day_type_defaults?: boolean;
  intensity_rpe?: number;
  rest_seconds_default?: number;
  notes?: string;
}

export interface CreateBlockExerciseRequest {
  exercise_id: string;
  order_index: number;
  sets?: number;
  reps?: number;
  time_seconds?: number;
  tempo?: string;
  rest_seconds?: number;
  intensity?: IntensitySpec;
  prescription_source?: PrescriptionSource;
}

export interface GenerateProgramRequest {
  athlete_id: number;
  start_date: string; // date string
  weeks: number;
  weekday_map?: Record<number, string>; // e.g., {1: 'Mon', 2: 'Wed'}
}

// =====================================================
// UI/VIEW MODELS
// =====================================================

export interface TemplateWithDays extends ProgramTemplate {
  days: DayTemplateWithBlocks[];
}

export interface DayTemplateWithBlocks extends DayTemplate {
  blocks: BlockWithExercises[];
}

export interface BlockWithExercises extends Block {
  exercises: BlockExerciseWithDetails[];
}

export interface BlockExerciseWithDetails extends BlockExercise {
  exercise_name?: string;
  exercise_tags?: string[];
  resolved_prescription?: ResolvedPrescription;
}

export interface ResolvedPrescription {
  sets: number;
  reps: number | null;
  time_seconds: number | null;
  rest_seconds: number;
  intensity: IntensitySpec | null;
  source: 'explicit' | 'defaults' | 'missing';
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type DayTypeBlockTypePair = {
  day_type: DayType;
  block_type: BlockType;
};

export interface DefaultsMatrixEntry extends DayTypeDefault {
  label?: string; // For UI display
}

