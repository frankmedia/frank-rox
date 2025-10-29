/**
 * TEMPLATE RESOLUTION ENGINE
 * Converts ProgramTemplates into fully-resolved ProgramInstances
 * Based on PT Web App Technical Spec Section 8: Generation Algorithm
 */

import { supabase } from '@/utils/supabaseClient';
import {
  ProgramTemplate,
  DayTemplate,
  Block,
  BlockExercise,
  DayTypeDefault,
  ExercisePool,
  GenerateProgramRequest,
  ProgramInstance,
  DayType,
  BlockType,
  ProgramStatus,
  ResolvedPrescription,
  IntensitySpec,
} from '@/types/template-system-v2';

// =====================================================
// MAIN GENERATION FUNCTION
// =====================================================

export async function generateProgramFromTemplate(
  templateId: string,
  request: GenerateProgramRequest
): Promise<{ programInstanceId: string; error?: string }> {
  try {
    console.log('🎯 Starting program generation:', { templateId, request });

    // Step 1: Load template with all nested data
    const template = await loadTemplateWithNested(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    console.log('📋 Loaded template:', template.name, `v${template.version}`);

    // Step 2: Validate template structure
    const validation = validateTemplate(template);
    if (!validation.valid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    // Step 3: Load defaults matrix
    const defaults = await loadDefaults();
    console.log('📊 Loaded', defaults.length, 'default rules');

    // Step 4: Create ProgramInstance (snapshot)
    const instanceId = await createProgramInstance(template, request);
    console.log('✨ Created program instance:', instanceId);

    // Step 5: Generate calendar mapping (days → dates)
    const calendar = generateCalendar(
      request.start_date,
      request.weeks,
      template.days_per_week,
      request.weekday_map
    );
    console.log('📅 Generated calendar:', calendar.length, 'days');

    // Step 6: Generate days/blocks/exercises with resolved prescriptions
    await generateProgramDays(instanceId, template, calendar, defaults);
    console.log('✅ Program generation complete!');

    return { programInstanceId: instanceId };
  } catch (error: any) {
    console.error('❌ Program generation failed:', error);
    return { programInstanceId: '', error: error.message };
  }
}

// =====================================================
// STEP 1: LOAD TEMPLATE WITH NESTED DATA
// =====================================================

interface TemplateWithNested extends ProgramTemplate {
  days: (DayTemplate & {
    blocks: (Block & {
      exercises: BlockExercise[];
    })[];
  })[];
}

async function loadTemplateWithNested(
  templateId: string
): Promise<TemplateWithNested | null> {
  // Load template
  const { data: template, error: templateError } = await supabase
    .from('program_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError || !template) {
    console.error('Failed to load template:', templateError);
    return null;
  }

  // Load day templates
  const { data: days, error: daysError } = await supabase
    .from('day_templates')
    .select('*')
    .eq('program_template_id', templateId)
    .order('day_index');

  if (daysError) {
    console.error('Failed to load days:', daysError);
    return null;
  }

  // Load blocks for all days
  const dayIds = days.map((d) => d.id);
  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('*')
    .in('day_template_id', dayIds)
    .order('order_index');

  if (blocksError) {
    console.error('Failed to load blocks:', blocksError);
    return null;
  }

  // Load block exercises
  const blockIds = blocks.map((b) => b.id);
  const { data: exercises, error: exercisesError } = await supabase
    .from('block_exercises')
    .select('*')
    .in('block_id', blockIds)
    .order('order_index');

  if (exercisesError) {
    console.error('Failed to load exercises:', exercisesError);
    return null;
  }

  // Nest the data
  const daysWithBlocks = days.map((day) => ({
    ...day,
    blocks: blocks
      .filter((b) => b.day_template_id === day.id)
      .map((block) => ({
        ...block,
        exercises: exercises.filter((e) => e.block_id === block.id),
      })),
  }));

  return {
    ...template,
    days: daysWithBlocks,
  };
}

// =====================================================
// STEP 2: VALIDATE TEMPLATE
// =====================================================

function validateTemplate(template: TemplateWithNested): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check days count matches
  if (template.days.length !== template.days_per_week) {
    errors.push(
      `Expected ${template.days_per_week} days, found ${template.days.length}`
    );
  }

  // Check each day has at least 1 block
  template.days.forEach((day, i) => {
    if (day.blocks.length === 0) {
      errors.push(`Day ${day.day_index} has no blocks`);
    }
  });

  // Check no duplicate day_index
  const dayIndices = template.days.map((d) => d.day_index);
  const uniqueIndices = new Set(dayIndices);
  if (uniqueIndices.size !== dayIndices.length) {
    errors.push('Duplicate day_index found');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =====================================================
// STEP 3: LOAD DEFAULTS MATRIX
// =====================================================

async function loadDefaults(): Promise<DayTypeDefault[]> {
  const { data, error } = await supabase
    .from('day_type_defaults')
    .select('*');

  if (error) {
    console.error('Failed to load defaults:', error);
    return [];
  }

  return data || [];
}

// =====================================================
// STEP 4: CREATE PROGRAM INSTANCE
// =====================================================

async function createProgramInstance(
  template: TemplateWithNested,
  request: GenerateProgramRequest
): Promise<string> {
  const { data, error } = await supabase
    .from('program_instances')
    .insert({
      program_template_id: template.id,
      athlete_id: request.athlete_id,
      start_date: request.start_date,
      weeks: request.weeks,
      status: 'Draft' as ProgramStatus,
      snapshot_version: template.version,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create program instance: ${error.message}`);
  }

  return data.id;
}

// =====================================================
// STEP 5: GENERATE CALENDAR
// =====================================================

interface CalendarDay {
  date: string; // YYYY-MM-DD
  day_index: number; // 1..days_per_week
  week_number: number; // 1..weeks
}

function generateCalendar(
  startDate: string,
  weeks: number,
  daysPerWeek: number,
  weekdayMap?: Record<number, string>
): CalendarDay[] {
  const calendar: CalendarDay[] = [];
  const start = new Date(startDate);

  for (let week = 0; week < weeks; week++) {
    for (let dayIndex = 1; dayIndex <= daysPerWeek; dayIndex++) {
      // Calculate date (sequential by default)
      const daysOffset = week * daysPerWeek + (dayIndex - 1);
      const date = new Date(start);
      date.setDate(start.getDate() + daysOffset);

      calendar.push({
        date: date.toISOString().split('T')[0],
        day_index: dayIndex,
        week_number: week + 1,
      });
    }
  }

  return calendar;
}

// =====================================================
// STEP 6: GENERATE PROGRAM DAYS/BLOCKS/EXERCISES
// =====================================================

async function generateProgramDays(
  instanceId: string,
  template: TemplateWithNested,
  calendar: CalendarDay[],
  defaults: DayTypeDefault[]
): Promise<void> {
  for (const calendarDay of calendar) {
    // Find the corresponding day template
    const dayTemplate = template.days.find(
      (d) => d.day_index === calendarDay.day_index
    );

    if (!dayTemplate) {
      console.warn(`No template for day_index ${calendarDay.day_index}`);
      continue;
    }

    // Create ProgramDay
    const { data: programDay, error: dayError } = await supabase
      .from('program_days')
      .insert({
        program_instance_id: instanceId,
        calendar_date: calendarDay.date,
        day_index: dayTemplate.day_index,
        day_type: dayTemplate.day_type,
        mobility_category: dayTemplate.mobility_category,
        title: dayTemplate.title,
        notes: dayTemplate.notes,
      })
      .select('id')
      .single();

    if (dayError) {
      console.error('Failed to create program day:', dayError);
      continue;
    }

    // Create blocks for this day
    await generateProgramBlocks(
      programDay.id,
      dayTemplate,
      defaults
    );
  }
}

async function generateProgramBlocks(
  programDayId: string,
  dayTemplate: DayTemplate & { blocks: (Block & { exercises: BlockExercise[] })[] },
  defaults: DayTypeDefault[]
): Promise<void> {
  for (const blockTemplate of dayTemplate.blocks) {
    // Create ProgramBlock
    const { data: programBlock, error: blockError } = await supabase
      .from('program_blocks')
      .insert({
        program_day_id: programDayId,
        order_index: blockTemplate.order_index,
        block_type: blockTemplate.block_type,
        title: blockTemplate.title || blockTemplate.block_type,
        intensity_rpe: blockTemplate.intensity_rpe,
        rest_seconds_default: blockTemplate.rest_seconds_default,
        notes: blockTemplate.notes,
      })
      .select('id')
      .single();

    if (blockError) {
      console.error('Failed to create program block:', blockError);
      continue;
    }

    // Create exercises for this block
    await generateProgramExercises(
      programBlock.id,
      blockTemplate,
      dayTemplate.day_type,
      defaults
    );
  }
}

async function generateProgramExercises(
  programBlockId: string,
  blockTemplate: Block & { exercises: BlockExercise[] },
  dayType: DayType,
  defaults: DayTypeDefault[]
): Promise<void> {
  for (const exerciseTemplate of blockTemplate.exercises) {
    // Resolve prescription (explicit or from defaults)
    const resolved = resolvePrescription(
      exerciseTemplate,
      dayType,
      blockTemplate.block_type,
      blockTemplate.use_day_type_defaults,
      defaults
    );

    if (!resolved) {
      console.warn(
        `Cannot resolve prescription for exercise ${exerciseTemplate.exercise_id}`
      );
      continue;
    }

    // Create ProgramExercise
    const { error } = await supabase.from('program_exercises').insert({
      program_block_id: programBlockId,
      exercise_id: exerciseTemplate.exercise_id,
      order_index: exerciseTemplate.order_index,
      sets: resolved.sets,
      reps: resolved.reps,
      time_seconds: resolved.time_seconds,
      tempo: exerciseTemplate.tempo,
      rest_seconds: resolved.rest_seconds,
      intensity: resolved.intensity,
      source_info: {
        from_block_exercise_id: exerciseTemplate.id,
        source: resolved.source,
      },
    });

    if (error) {
      console.error('Failed to create program exercise:', error);
    }
  }
}

// =====================================================
// PRESCRIPTION RESOLUTION LOGIC
// =====================================================

function resolvePrescription(
  exercise: BlockExercise,
  dayType: DayType,
  blockType: BlockType,
  useDefaults: boolean,
  defaults: DayTypeDefault[]
): ResolvedPrescription | null {
  // Check if explicit prescription exists
  const hasExplicit =
    exercise.sets !== null &&
    (exercise.reps !== null || exercise.time_seconds !== null) &&
    exercise.rest_seconds !== null;

  if (hasExplicit) {
    return {
      sets: exercise.sets!,
      reps: exercise.reps,
      time_seconds: exercise.time_seconds,
      rest_seconds: exercise.rest_seconds!,
      intensity: exercise.intensity,
      source: 'explicit',
    };
  }

  // If no explicit and not using defaults → error
  if (!useDefaults) {
    console.error(
      `Exercise ${exercise.exercise_id} has no explicit prescription and use_defaults=false`
    );
    return null;
  }

  // Look up defaults
  const defaultRule = defaults.find(
    (d) => d.day_type === dayType && d.block_type === blockType
  );

  if (!defaultRule) {
    console.error(
      `No default found for (${dayType}, ${blockType})`
    );
    return null;
  }

  // Merge explicit values with defaults
  return {
    sets: exercise.sets ?? defaultRule.default_sets,
    reps: exercise.reps ?? defaultRule.default_reps,
    time_seconds: exercise.time_seconds ?? defaultRule.default_time_seconds,
    rest_seconds: exercise.rest_seconds ?? defaultRule.default_rest_seconds,
    intensity: exercise.intensity ?? defaultRule.default_intensity,
    source: 'defaults',
  };
}


