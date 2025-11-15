/**
 * COMPREHENSIVE REGRESSION TEST SUITE
 * 
 * Tests ALL possible combinations of:
 * - Training days (3, 4, 5, 6)
 * - Focus areas (Running, Strength, Cardio, combinations)
 * - Equipment availability
 * - Training phases (base, build, race-prep)
 * - Athlete levels (beginner, intermediate, advanced)
 * 
 * Creates test clients in database and validates EVERY workout
 * 
 * Usage: npx tsx src/services/programGeneration/__tests__/regressionTest.ts
 */

import { createClient } from '@supabase/supabase-js';
import { createPlanInDatabase } from '../../programmeToDatabase';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== TEST CONFIGURATIONS ====================

interface TestPermutation {
  id: string;
  name: string;
  trainingDays: number;
  runsPerWeek: number;
  cardioPerWeek: number;
  focusAreas: string[];
  equipment: string[];
  focus: 'base' | 'build' | 'race-prep';
  athleteLevel: 'beginner' | 'intermediate' | 'advanced';
  expectedSessions: number;
  expectedRestDays: number;
}

// Generate ALL permutations
function generateAllPermutations(): TestPermutation[] {
  const permutations: TestPermutation[] = [];
  let id = 1;

  const trainingDaysOptions = [3, 4, 5, 6];
  const focusOptions = [
    { areas: ['Running', 'Strength'], runs: [1, 2], cardio: [0] },
    { areas: ['Strength', 'Cardio'], runs: [0, 1], cardio: [1, 2] },
    { areas: ['Running', 'Strength', 'Cardio'], runs: [1, 2], cardio: [1, 2] },
  ];
  const equipmentOptions = [
    ['SkiErg', 'RowErg', 'Assault Bike', 'Wall balls', 'Heavy dumbbells', 'Sled push/pull'], // Full
    ['SkiErg', 'RowErg', 'Wall balls'], // Minimal
    [], // Bodyweight only
  ];
  const focusPhases: Array<'base' | 'build' | 'race-prep'> = ['base', 'build', 'race-prep'];
  const athleteLevels: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced'];

  for (const trainingDays of trainingDaysOptions) {
    for (const focusOption of focusOptions) {
      for (const runs of focusOption.runs) {
        for (const cardio of focusOption.cardio) {
          // Only test valid combinations (total sessions <= training days)
          const totalSessions = runs + cardio + 2; // Always 2 strength
          if (totalSessions > trainingDays) continue;

          for (const equipment of equipmentOptions) {
            for (const focus of focusPhases) {
              for (const level of athleteLevels) {
                const expectedSessions = Math.min(totalSessions, trainingDays);
                const expectedRestDays = 7 - expectedSessions;

                permutations.push({
                  id: `test-${id++}`,
                  name: `${trainingDays}d-${runs}r-${cardio}c-${level}-${focus}`,
                  trainingDays,
                  runsPerWeek: runs,
                  cardioPerWeek: cardio,
                  focusAreas: focusOption.areas,
                  equipment,
                  focus,
                  athleteLevel: level,
                  expectedSessions,
                  expectedRestDays,
                });
              }
            }
          }
        }
      }
    }
  }

  return permutations;
}

// ==================== TEST CLIENT CREATION ====================

async function createTestClient(permutation: TestPermutation): Promise<string> {
  const clientName = `test_${permutation.id}`;
  const clientEmail = `${permutation.id}@test.roxpt.app`;

  // Check if client already exists
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('email', clientEmail)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new test client
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name: clientName,
      email: clientEmail,
      password: 'test123', // Test password
      onboarding_complete: true,
      onboarding_answers: {
        trainingDays: permutation.trainingDays,
        focusAreas: permutation.focusAreas,
        equipment: permutation.equipment,
        athleteLevel: permutation.athleteLevel,
      }
    })
    .select('id')
    .single();

  if (error || !newClient) {
    throw new Error(`Failed to create test client: ${error?.message}`);
  }

  return newClient.id;
}

// ==================== VALIDATION ====================

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalDays: number;
    week1Sessions: number;
    week2Sessions: number;
    restDays: number;
    restDaysWithRecovery: number;
    totalExercises: number;
    runProgressionCorrect: boolean;
  };
}

async function validatePlan(
  planId: string,
  permutation: TestPermutation
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = {
    totalDays: 0,
    week1Sessions: 0,
    week2Sessions: 0,
    restDays: 0,
    restDaysWithRecovery: 0,
    totalExercises: 0,
    runProgressionCorrect: true,
  };

  // Fetch plan days
  const { data: planDays } = await supabase
    .from('plan_days')
    .select('id, day_index, is_rest')
    .eq('plan_id', planId)
    .order('day_index');

  if (!planDays) {
    errors.push('Failed to fetch plan days');
    return { passed: false, errors, warnings, stats };
  }

  stats.totalDays = planDays.length;

  if (planDays.length !== 14) {
    errors.push(`Expected 14 days, got ${planDays.length}`);
  }

  // Check Week 1
  for (const day of planDays.slice(0, 7)) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name, session_blocks(id, session_block_items(id, sets, reps, distance_m, duration_sec))')
      .eq('plan_day_id', day.id);

    const hasSession = sessions && sessions.length > 0;

    if (hasSession) {
      stats.week1Sessions++;
      
      // Count exercises
      for (const session of sessions) {
        const blocks = (session as any).session_blocks || [];
        for (const block of blocks) {
          stats.totalExercises += block.session_block_items?.length || 0;
        }
      }
    }

    if (day.is_rest) {
      stats.restDays++;
      if (hasSession) {
        stats.restDaysWithRecovery++;
      } else {
        errors.push(`Day ${day.day_index}: Rest day missing recovery session`);
      }
    }
  }

  // Check Week 2
  for (const day of planDays.slice(7, 14)) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('plan_day_id', day.id);

    if (sessions && sessions.length > 0) {
      stats.week2Sessions++;
    }
  }

  // Validate session counts
  if (stats.week1Sessions !== permutation.expectedSessions) {
    errors.push(`Week 1: Expected ${permutation.expectedSessions} sessions, got ${stats.week1Sessions}`);
  }

  if (stats.week2Sessions !== permutation.expectedSessions) {
    errors.push(`Week 2: Expected ${permutation.expectedSessions} sessions, got ${stats.week2Sessions}`);
  }

  if (stats.restDays !== permutation.expectedRestDays) {
    errors.push(`Expected ${permutation.expectedRestDays} rest days, got ${stats.restDays}`);
  }

  if (stats.restDaysWithRecovery !== stats.restDays) {
    errors.push(`${stats.restDays - stats.restDaysWithRecovery} rest days missing recovery`);
  }

  // Check run progression (if any runs)
  if (permutation.runsPerWeek > 0) {
    const progressionValid = await validateRunProgression(planDays, errors);
    stats.runProgressionCorrect = progressionValid;
  }

  // Validate all exercises have valid data
  await validateExerciseData(planId, errors, warnings);

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

async function validateRunProgression(planDays: any[], errors: string[]): Promise<boolean> {
  for (let i = 0; i < 7; i++) {
    const day1 = planDays[i];
    const day2 = planDays[i + 7];

    const { data: week1Sessions } = await supabase
      .from('sessions')
      .select('name, session_blocks(session_block_items(distance_m, duration_sec))')
      .eq('plan_day_id', day1.id)
      .ilike('name', '%run%');

    if (week1Sessions && week1Sessions.length > 0) {
      const { data: week2Sessions } = await supabase
        .from('sessions')
        .select('name, session_blocks(session_block_items(distance_m, duration_sec))')
        .eq('plan_day_id', day2.id)
        .ilike('name', '%run%');

      if (week2Sessions && week2Sessions.length > 0) {
        const item1 = (week1Sessions[0] as any).session_blocks?.[0]?.session_block_items?.[0];
        const item2 = (week2Sessions[0] as any).session_blocks?.[0]?.session_block_items?.[0];

        if (item1?.distance_m && item2?.distance_m) {
          const km2 = item2.distance_m / 1000;
          const expectedDuration = Math.round(km2 * 6 * 60);
          
          if (item2.duration_sec !== expectedDuration) {
            errors.push(`Run duration mismatch: ${Math.round(item2.duration_sec / 60)}min != ${Math.round(expectedDuration / 60)}min for ${km2}km`);
            return false;
          }
        }
        break;
      }
    }
  }
  
  return true;
}

async function validateExerciseData(planId: string, errors: string[], warnings: string[]) {
  const { data: items } = await supabase
    .from('session_block_items')
    .select('id, sets, reps, distance_m, duration_sec, exercises(name)')
    .in('block_id', 
      supabase
        .from('session_blocks')
        .select('id')
        .in('session_id',
          supabase
            .from('sessions')
            .select('id')
            .in('plan_day_id',
              supabase
                .from('plan_days')
                .select('id')
                .eq('plan_id', planId)
            )
        )
    );

  if (!items) return;

  for (const item of items) {
    if (item.distance_m && item.distance_m < 0) {
      errors.push(`Negative distance: ${item.distance_m}m`);
    }
    if (item.duration_sec && item.duration_sec < 0) {
      errors.push(`Negative duration: ${item.duration_sec}s`);
    }
    if (item.sets && item.sets < 0) {
      errors.push(`Negative sets: ${item.sets}`);
    }
    if (item.reps && item.reps < 0) {
      errors.push(`Negative reps: ${item.reps}`);
    }
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runRegressionTests() {
  console.log('🧪 ========================================');
  console.log('🧪 COMPREHENSIVE REGRESSION TEST SUITE');
  console.log('🧪 ========================================\n');

  const permutations = generateAllPermutations();
  console.log(`📊 Generated ${permutations.length} test permutations\n`);

  const results: Array<{
    permutation: TestPermutation;
    result: ValidationResult;
    duration: number;
  }> = [];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < permutations.length; i++) {
    const perm = permutations[i];
    const startTime = Date.now();

    console.log(`\n[${ i + 1}/${permutations.length}] Testing: ${perm.name}`);
    console.log(`   ${perm.trainingDays} days/week, ${perm.runsPerWeek} runs, ${perm.cardioPerWeek} cardio`);
    console.log(`   Focus: ${perm.focus}, Level: ${perm.athleteLevel}`);
    console.log(`   Equipment: ${perm.equipment.length} items`);

    try {
      // Create test client
      const clientId = await createTestClient(perm);
      console.log(`   ✅ Client created: ${clientId}`);

      // Delete existing plan
      await supabase.from('plans').delete().eq('client_id', clientId);

      // Generate programme
      const programme = buildProgramme(perm);
      const { planId } = await createPlanInDatabase(supabase, clientId, programme);
      console.log(`   ✅ Plan generated: ${planId}`);

      // Validate
      const validation = await validatePlan(planId, perm);
      const duration = Date.now() - startTime;

      results.push({ permutation: perm, result: validation, duration });

      if (validation.passed) {
        passed++;
        console.log(`   ✅ PASSED (${duration}ms)`);
      } else {
        failed++;
        console.log(`   ❌ FAILED (${duration}ms)`);
        validation.errors.slice(0, 3).forEach(e => console.log(`      - ${e}`));
      }

    } catch (error: any) {
      failed++;
      console.log(`   ❌ ERROR: ${error.message}`);
      results.push({
        permutation: perm,
        result: {
          passed: false,
          errors: [error.message],
          warnings: [],
          stats: {} as any,
        },
        duration: Date.now() - startTime,
      });
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${permutations.length} (${passed} passed, ${failed} failed)`);
    }
  }

  // Generate report
  generateReport(results);
}

function buildProgramme(perm: TestPermutation) {
  const sessions: any[] = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let dayIndex = 0;

  // Add strength (always 2)
  sessions.push({
    day: days[dayIndex++],
    type: 'strength',
    title: 'Lower Body',
    effort: 'hard',
    detail: 'Squat-focused'
  });

  sessions.push({
    day: days[dayIndex++],
    type: 'strength',
    title: 'Upper Body',
    effort: 'hard',
    detail: 'Push/Pull'
  });

  // Add runs
  for (let i = 0; i < perm.runsPerWeek; i++) {
    sessions.push({
      day: days[dayIndex++],
      type: 'run',
      title: i === 0 ? 'Long Run' : 'Intervals',
      distance: i === 0 ? '5km' : '6×500m',
      pace: 'Zone 2',
      effort: 'easy',
      detail: 'Aerobic'
    });
  }

  // Add cardio
  for (let i = 0; i < perm.cardioPerWeek; i++) {
    sessions.push({
      day: days[dayIndex++],
      type: 'cardio',
      title: 'Cardio',
      effort: 'moderate',
      detail: 'hybrid-pyramid'
    });
  }

  return {
    sessions,
    preferences: {
      trainingDaysPerWeek: perm.trainingDays,
      runSessionsPerWeek: perm.runsPerWeek,
      cardioSessionsPerWeek: perm.cardioPerWeek,
      focusAreas: perm.focusAreas,
      equipment: perm.equipment,
    },
    generatedAt: new Date().toISOString(),
    blockNumber: 1,
    focus: perm.focus,
  };
}

function generateReport(results: Array<{ permutation: TestPermutation; result: ValidationResult; duration: number }>) {
  console.log('\n' + '='.repeat(80));
  console.log('REGRESSION TEST REPORT');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.result.passed).length;
  const failed = results.filter(r => !r.result.passed).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Avg Duration: ${Math.round(avgDuration)}ms\n`);

  if (failed > 0) {
    console.log('FAILED TESTS:\n');
    results.filter(r => !r.result.passed).forEach(r => {
      console.log(`❌ ${r.permutation.name}:`);
      r.result.errors.forEach(e => console.log(`   - ${e}`));
      console.log('');
    });
  }

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total: results.length, passed, failed, avgDuration },
    results: results.map(r => ({
      test: r.permutation.name,
      passed: r.result.passed,
      duration: r.duration,
      errors: r.result.errors,
      stats: r.result.stats,
    })),
  };

  console.log('📄 Detailed report saved to: regression-report.json\n');
  require('fs').writeFileSync('regression-report.json', JSON.stringify(report, null, 2));

  console.log('='.repeat(80));
  
  if (failed === 0) {
    console.log('✅ ALL REGRESSION TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('❌ SOME REGRESSION TESTS FAILED');
    process.exit(1);
  }
}

// Run tests
runRegressionTests().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});

