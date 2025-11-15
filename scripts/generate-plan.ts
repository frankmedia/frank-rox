import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createPlanInDatabase } from '../src/services/programmeToDatabase';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const clientId = 4; // natalie
  console.log('Generating plan for client', clientId);
  const programme = {
    sessions: [
      { day: 'Monday', type: 'strength', title: 'Lower Body Power', effort: 'hard', detail: 'squat' },
      { day: 'Tuesday', type: 'cardio', title: 'Cardio Conditioning', effort: 'moderate', detail: 'hybrid-pyramid' },
      { day: 'Wednesday', type: 'strength', title: 'Upper Body Push/Pull', effort: 'hard', detail: 'push-pull' },
      { day: 'Thursday', type: 'recovery', title: 'Recovery Mobility', effort: 'easy', detail: 'mobility' },
      { day: 'Friday', type: 'cardio', title: 'Machine Endurance', effort: 'moderate', detail: 'machine-endurance' },
      { day: 'Saturday', type: 'run', title: 'Long Run', distance: '8km', pace: 'Zone 2', effort: 'easy', detail: 'aerobic' },
      { day: 'Sunday', type: 'recovery', title: 'Active Recovery', effort: 'easy', detail: 'active' }
    ],
    preferences: {
      trainingDaysPerWeek: 5,
      cardioSessionsPerWeek: 2,
      runSessionsPerWeek: 1,
      focusAreas: ['Strength', 'Cardio', 'Run'],
      equipment: ['Barbell', 'Dumbbells', 'RowErg', 'SkiErg']
    },
    generatedAt: new Date().toISOString(),
    blockNumber: 1,
    focus: 'base'
  };

  const result = await createPlanInDatabase(supabase, clientId, programme as any);
  console.log('Plan generated:', result);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
