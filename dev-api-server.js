/**
 * Local Development API Server
 * Emulates Vercel API routes for local testing
 * Run with: node dev-api-server.js
 */

import http from 'http';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = 3001;
const apiKey = process.env.GOOGLE_AI_API_KEY || "";
const modelName = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash-exp";
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Use service role key for API server (bypasses RLS for admin operations)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

console.log('🔧 Starting local API server...');
console.log('📦 Gemini Model:', modelName);
console.log('🔑 API Key:', apiKey ? '✓ Found' : '✗ Missing');
console.log('🗄️  Supabase:', supabaseUrl ? '✓ Connected' : '✗ Missing');

if (!apiKey) {
  console.error('❌ ERROR: GOOGLE_AI_API_KEY not found in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const supabase = createClient(supabaseUrl, supabaseKey);

const server = http.createServer(async (req, res) => {
  // Enable CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/workout-assistant' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { action, data } = JSON.parse(body);
        console.log(`📨 Request: ${action}`);

        console.log(`\n📥 Action: ${action}`);
        const actionStartTime = Date.now();
        
        let result;
        
        if (action === 'parse_workout') {
          result = await handleParseWorkout(data);
        } else if (action === 'create_workout') {
          console.log('🏗️  Calling handleCreateWorkout...');
          result = await handleCreateWorkout(data);
        } else if (action === 'match_exercise') {
          result = await handleMatchExercise(data);
        } else if (action === 'process_command') {
          result = await handleProcessCommand(data);
        } else if (action === 'generate_program') {
          result = await handleGenerateProgram(data);
        } else {
          throw new Error('Invalid action');
        }

        const actionTime = Date.now() - actionStartTime;
        console.log(`⏱️  Action '${action}' completed in ${actionTime}ms`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        console.log(`✅ Response sent for ${action}`);
      } catch (error) {
        console.error(`❌ Error in action:`, error.message);
        console.error('Stack:', error.stack);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false,
          error: error.message 
        }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Validate parsed workout format
function validateWorkoutFormat(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Response is not an object' };
  }

  if (!parsed.days || !Array.isArray(parsed.days)) {
    return { valid: false, error: 'Missing or invalid "days" array' };
  }

  if (!parsed.metadata || typeof parsed.metadata !== 'object') {
    return { valid: false, error: 'Missing or invalid "metadata" object' };
  }

  // Questions array is optional but must be an array if present
  if (parsed.questions !== undefined && !Array.isArray(parsed.questions)) {
    return { valid: false, error: '"questions" must be an array if present' };
  }
  
  // Check each day
  for (let i = 0; i < parsed.days.length; i++) {
    const day = parsed.days[i];
    if (!day.name) {
      return { valid: false, error: `Day ${i + 1} missing "name" field` };
    }
    if (!day.exercises || !Array.isArray(day.exercises)) {
      return { valid: false, error: `Day ${i + 1} missing or invalid "exercises" array` };
    }
    
    // Check each exercise
    for (let j = 0; j < day.exercises.length; j++) {
      const ex = day.exercises[j];
      const required = ['name', 'sets', 'reps', 'weight', 'rest', 'duration', 'distance', 'notes', 'modality'];
      for (const field of required) {
        if (!(field in ex)) {
          return { valid: false, error: `Day ${i + 1}, Exercise ${j + 1} (${ex.name || 'unnamed'}) missing "${field}" field` };
        }
      }
      
      // Check modality is valid
      const validModalities = ['strength', 'bodyweight', 'cardio', 'running', 'erg', 'carry', 'core', 'mobility'];
      if (!validModalities.includes(ex.modality)) {
        return { valid: false, error: `Day ${i + 1}, Exercise ${j + 1} (${ex.name}) has invalid modality "${ex.modality}". Must be one of: ${validModalities.join(', ')}` };
      }
    }
  }
  
  return { valid: true };
}

async function handleParseWorkout(data) {
  const { workoutText, exerciseList } = data;
  
  console.log('\n🚀 ===== PARSE WORKOUT REQUEST =====');
  console.log('📝 Workout text length:', workoutText?.length || 0, 'characters');
  console.log('📚 Exercise list length:', exerciseList?.length || 0, 'characters');
  console.log('⏱️  Start time:', new Date().toISOString());
  
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 10,
    }
  });

  // Build exercise reference list if provided
  let exerciseReference = '';
  if (exerciseList) {
    const exerciseCount = exerciseList.split(',').length;
    console.log(`📋 Including ${exerciseCount} exercises in prompt for matching`);
    exerciseReference = `\n\n📚 AVAILABLE EXERCISES IN DATABASE:\n${exerciseList}\n\n⚠️ CRITICAL: When you see an exercise name, match it to the closest name from the list above. Use the EXACT name from the database list.`;
  }

  const basePrompt = `You are a strict JSON workout parser. Your ONLY job is to output valid JSON. No explanations, no markdown, no code blocks - ONLY RAW JSON.
${exerciseReference}

INPUT WORKOUT PROGRAM:
${workoutText}

REQUIRED OUTPUT FORMAT (copy this structure exactly):
{
  "metadata": {
    "clientName": null,
    "email": null,
    "dob": null,
    "level": null,
    "experience": null,
    "goal": null,
    "weeklyPlan": {}
  },
  "days": [],
  "questions": []
}

⚠️ QUESTIONS ARRAY: If you find any ambiguities, add them to the questions array:
{
  "id": 1,
  "text": "Question for the user?",
  "type": "choice",
  "options": ["Option 1", "Option 2"],
  "affectedExercise": "Exercise name",
  "field": "name" or "sets" or "weight"
}

🚨 MANDATORY: You MUST add questions for these ambiguities:
1. "or" alternatives (e.g., "Pull Ups or Lat Pulldown"):
   - Add question: "I see 'Pull Ups or Lat Pulldown' - which exercise should I use?"
   - Options: ["Pull Ups", "Lat Pulldown"]
   - affectedExercise: "Pull Ups or Lat Pulldown"
   - field: "name"

2. Progressive sets (e.g., "1x20, 1x10, 5x5"):
   - Add question: "Progressive Bench Press (1x20, 1x10, 5x5) - how should I create this?"
   - Options: ["3 separate exercises", "1 exercise with 5 sets (working set)", "1 exercise with 7 sets (all sets)"]
   - affectedExercise: "Bench Press"
   - field: "sets"

3. Equipment options (e.g., "machine or dumbbells"):
   - Add question: "I see 'machine or dumbbells' - which equipment should I use?"
   - Options: ["Machine", "Dumbbells"]
   - affectedExercise: [exercise name]
   - field: "notes"

Example questions array:
[
  {
    "id": 1,
    "text": "I see 'Pull Ups or Lat Pulldown' - which exercise should I use?",
    "type": "choice",
    "options": ["Pull Ups", "Lat Pulldown"],
    "affectedExercise": "Pull Ups or Lat Pulldown",
    "field": "name"
  },
  {
    "id": 2,
    "text": "Progressive Bench Press (1x20, 1x10, 5x5) - how should I create this?",
    "type": "choice",
    "options": ["3 separate exercises", "1 exercise with 5 sets (working set)", "1 exercise with 7 sets (all sets)"],
    "affectedExercise": "Bench Press",
    "field": "sets"
  }
]

STRICT PARSING RULES:

1. METADATA EXTRACTION:
   - clientName: Extract from "Name:", "Client:", or similar (string or null)
   - email: Extract email addresses (string or null)
   - dob: Extract date of birth in format "DD/MM/YYYY" (string or null)
   - level: Extract from "Level:" - use exact text: "Beginner", "Intermediate", "Advanced" (string or null)
   - experience: Extract from "Experience:" or "Hyrox Experience:" (string or null)
   - goal: Extract from "Goal:" (string or null)
   - weeklyPlan: Extract weekly schedule as {"Monday": "activity", "Tuesday": "activity"} (object)

2. DAY STRUCTURE:
   Each day MUST have:
   {
     "name": "Day 1" or "Day 1 - Upper Body" (string, required),
     "exercises": [array of exercise objects]
   }

3. EXERCISE OBJECT (every exercise MUST have ALL these fields):
   {
     "name": "Exercise Name" (string, required - MATCH TO DATABASE LIST ABOVE),
     "sets": 3 (number, default 0 if not specified),
     "reps": 10 (number, default 0 if not specified),
     "weight": "60kg" (string, use "0kg" if not specified),
     "rest": 60 (number in seconds, default 0 if not specified),
     "duration": 0 (number in minutes, default 0 if not specified),
     "distance": 0 (number in meters, default 0 if not specified),
     "notes": "" (string, include superset/circuit info, default ""),
     "modality": "strength" (string, required - see list below)
   }

⚠️ CRITICAL: Exercise Name Matching Rules:
   - ALWAYS match to the EXACT name from the "AVAILABLE EXERCISES IN DATABASE" list above
   - If input says "Pull Ups", find "Pull-Ups" in the database list and use that
   - If input says "Bench Press", find the closest match in the database list
   - DO NOT invent new names, ONLY use names from the database list
   - Examples:
     * Input: "Pull Ups" → Use: "Pull-Ups" (from database)
     * Input: "Bench" → Use: "Bench Press" (from database)
     * Input: "Shoulder Press" → Use: "Shoulder Press (Machine)" (from database)

4. MODALITY CLASSIFICATION (MUST be one of these EXACT values):
   - "strength" - barbell/dumbbell exercises with weights (Bench Press, Squats, Deadlifts)
   - "bodyweight" - no equipment bodyweight exercises (Push-ups, Pull-ups, Dips)
   - "cardio" - general cardio without distance (Bike, Assault Bike, Jump Rope)
   - "running" - running exercises (1km Run, Sprints)
   - "erg" - rowing/skiing machines (RowErg, SkiErg, Concept2)
   - "carry" - loaded carries (Farmer Carry, Sled Push, Sled Pull)
   - "core" - core/ab exercises (Plank, Side Plank, Sit-ups, Crunches, Double Crunch, Russian Twists, Oblique Twists, Ab Wheel)
   - "mobility" - ONLY stretching/foam rolling (Static Stretches, Foam Rolling, Dynamic Stretching)
   
   ⚠️ CRITICAL: ALL core/ab exercises (plank, crunches, sit-ups, twists) MUST use modality: "core" NOT "mobility"!

5. SETS/REPS PARSING:
   - "3 x 10" = 3 sets, 10 reps
   - "5x5" = 5 sets, 5 reps
   - "4 rounds" = 4 sets (reps from exercise)
   - "AMRAP 10 min" = sets: 1, duration: 10, notes: "AMRAP"
   
   ⚠️ ROUNDS WITH EXERCISE LIST:
   "3 rounds:
    15 oblique twists
    15 double crunch  
    1 min plank"
   
   → Create 3 SEPARATE exercises, each with 3 sets:
   * Exercise 1: name: "Oblique Twists", sets: 3, reps: 15
   * Exercise 2: name: "Double Crunch", sets: 3, reps: 15
   * Exercise 3: name: "Plank", sets: 3, duration: 1
   
   ⚠️ PROGRESSIVE SETS - CRITICAL RULE:
   If you see MULTIPLE SEPARATE LINES with the SAME exercise name (e.g., Bench Press appears 3 times):
   "1 x 20 Bench Press with the bar only"
   "1 x 10 Bench Press 10kg a side"
   "5 x 5 Bench Press working towards 5 rep max"
   
   → Create 3 SEPARATE exercises:
   * Exercise 1: name: "Bench Press", sets: 1, reps: 20, weight: "20kg", notes: "Warm-up: bar only"
   * Exercise 2: name: "Bench Press", sets: 1, reps: 10, weight: "40kg", notes: "Warm-up: 10kg a side"
   * Exercise 3: name: "Bench Press", sets: 5, reps: 5, weight: "0kg", notes: "Working towards 5RM, use Smith machine"
   
   DO NOT collapse these into one exercise!
   
   - "or" alternatives: CREATE A QUESTION asking user to choose

6. WEIGHT PARSING:
   - "60kg" = "60kg"
   - "10-14kg" = "12kg" (use middle value)
   - "8-16kg" = "12kg" (use middle value)
   - "30-45kg" = "37.5kg" (use middle value)
   - "bar only" = "20kg"
   - "10kg a side" = "20kg" (bar + both sides)
   - "bodyweight" or "BW" = "0kg"
   - "2x24kg" = "2x24kg" (for carries)
   - If range like "60-80kg", use middle value

7. DISTANCE PARSING:
   - "1000m" or "1km" = 1000 (meters)
   - "5km" = 5000 (meters)
   - "100m" = 100 (meters)

8. DURATION PARSING:
   - "10 min" or "10 minutes" = 10 (minutes)
   - "30 sec" or "30 seconds" = 0.5 (minutes)
   - "1:30" = 1.5 (minutes)

9. REST PARSING:
   - "90s" or "90 sec" = 90 (seconds)
   - "1 min" = 60 (seconds)
   - "2 minutes" = 120 (seconds)
   - Default to 60 if not specified

10. SUPERSETS/CIRCUITS:
    - If text says "Superset:" combine exercises with notes: "Superset with [other exercise]"
    - If "Circuit:" or "3 rounds:" group exercises with notes: "Circuit - 3 rounds"
    - Example: "Superset: 3 x 10 Bench + 3 x 10 Rows" = 2 exercises, both with notes "Superset"
    - Example: "Superset: 3 x 10 Chest Flys + 3 x 10 Rows" = Create 2 separate exercises:
      * Exercise 1: name: "Incline Chest Flys", sets: 3, reps: 10, notes: "Superset with Single Arm Row"
      * Exercise 2: name: "Single Arm Row", sets: 3, reps: 10, notes: "Superset with Incline Chest Flys"

11. SWIMMING/CARDIO WORKOUTS:
    - Extract each set as separate exercise
    - "200m Easy Swim" = name: "Easy Swim", distance: 200, modality: "cardio"
    - "4 x 100m Freestyle" = name: "Freestyle", sets: 4, distance: 100, modality: "cardio"

CRITICAL VALIDATION:
- Output MUST be valid JSON (test with JSON.parse())
- NO markdown code blocks (no \`\`\`json)
- NO explanatory text before or after JSON
- ALL exercise objects MUST have ALL 9 fields
- modality MUST be one of the 8 exact values listed
- numbers must be numbers (not strings): sets, reps, rest, duration, distance
- strings must be strings: name, weight, notes, modality

NOW PARSE THE INPUT ABOVE. OUTPUT ONLY THE JSON, NOTHING ELSE.`;

  // Try up to 2 times with validation
  let attempt = 0;
  const maxAttempts = 2;
  
  while (attempt < maxAttempts) {
    attempt++;
    const attemptStartTime = Date.now();
    console.log(`\n🤖 Gemini attempt ${attempt}/${maxAttempts}`);
    
    try {
      const prompt = attempt === 1 ? basePrompt : basePrompt + `\n\n⚠️ CRITICAL: Your previous response had errors. Make sure to include ALL 9 required fields for EVERY exercise: name, sets, reps, weight, rest, duration, distance, notes, modality.`;
      
      console.log(`📤 Sending prompt to Gemini (${prompt.length} characters)...`);
      console.log(`⏳ Waiting for Gemini response...`);
      
      const result = await model.generateContent(prompt);
      const geminiResponseTime = Date.now() - attemptStartTime;
      
      console.log(`✅ Gemini responded in ${geminiResponseTime}ms (${(geminiResponseTime / 1000).toFixed(2)}s)`);
      
      let text = result.response.text().trim();
      console.log(`📏 Response length: ${text.length} characters`);
      
      // Clean up markdown code blocks
      console.log(`🧹 Cleaning response...`);
      if (text.startsWith('```json')) {
        text = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
        console.log(`   Removed JSON code blocks`);
      } else if (text.startsWith('```')) {
        text = text.replace(/```\n?/g, '').trim();
        console.log(`   Removed generic code blocks`);
      }

      console.log(`🔍 Parsing JSON response...`);
      const parseStartTime = Date.now();
      const parsed = JSON.parse(text);
      const parseTime = Date.now() - parseStartTime;
      console.log(`✅ JSON parsed in ${parseTime}ms`);
      console.log(`   Days: ${parsed.days?.length || 0}`);
      console.log(`   Questions: ${parsed.questions?.length || 0}`);
      
      // Validate format
      console.log(`🔍 Validating workout format...`);
      const validationStartTime = Date.now();
      const validation = validateWorkoutFormat(parsed);
      const validationTime = Date.now() - validationStartTime;
      console.log(`   Validation completed in ${validationTime}ms`);
      
      if (!validation.valid) {
        console.warn(`❌ Validation failed (attempt ${attempt}):`, validation.error);
        if (attempt < maxAttempts) {
          console.log('🔄 Retrying with stricter instructions...');
          continue;
        } else {
          throw new Error(`Format validation failed after ${maxAttempts} attempts: ${validation.error}`);
        }
      }
      
      const totalTime = Date.now() - attemptStartTime;
      console.log(`\n✅ ===== PARSE COMPLETE (attempt ${attempt}) =====`);
      console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`📊 Breakdown:`);
      console.log(`   - Gemini API: ${geminiResponseTime}ms (${((geminiResponseTime/totalTime)*100).toFixed(1)}%)`);
      console.log(`   - JSON parse: ${parseTime}ms`);
      console.log(`   - Validation: ${validationTime}ms`);
      
      return {
        success: true,
        data: parsed,
        attempts: attempt
      };
      
    } catch (parseError) {
      console.error(`❌ Parse error (attempt ${attempt}):`, parseError.message);
      if (attempt >= maxAttempts) {
        throw new Error(`Failed to parse workout after ${maxAttempts} attempts: ${parseError.message}`);
      }
    }
  }
  
  throw new Error('Failed to parse workout');
}

async function handleMatchExercise(data) {
  // Placeholder - implement if needed
  return { success: true, data: { exerciseId: null, confidence: 0 } };
}

async function handleProcessCommand(data) {
  // Placeholder - implement if needed
  return { success: true, data: { action: 'info', changes: [], summary: 'Not implemented yet' } };
}

async function handleGenerateProgram(data) {
  // Placeholder - implement if needed
  return { success: true, data: { weeklyPlan: {}, days: [] } };
}

// Apply user answers to workout data
function applyUserAnswers(workout, answers) {
  if (!workout.questions || !answers || Object.keys(answers).length === 0) {
    console.log('   ℹ️  No answers to apply');
    return workout;
  }

  console.log('   🔧 Applying user answers:', answers);

  // Create a copy of the workout
  const updatedWorkout = JSON.parse(JSON.stringify(workout));

  // Apply each answer
  for (const question of workout.questions) {
    const answer = answers[question.id];
    if (!answer) continue;

    console.log(`   📝 Applying answer for Q${question.id}: "${answer}"`);

    // Find and update the affected exercise in all days
    for (const day of updatedWorkout.days) {
      for (const exercise of day.exercises) {
        if (exercise.name === question.affectedExercise || 
            exercise.name.includes(question.affectedExercise.split(' or ')[0])) {
          
          // Apply the answer based on the field
          if (question.field === 'name') {
            console.log(`      ✏️  Changing exercise name from "${exercise.name}" to "${answer}"`);
            exercise.name = answer;
          } else if (question.field === 'weight') {
            console.log(`      ⚖️  Changing weight from "${exercise.weight}" to "${answer}"`);
            exercise.weight = answer;
          } else if (question.field === 'sets') {
            console.log(`      🔢 Changing sets from ${exercise.sets} to ${answer}`);
            exercise.sets = parseInt(answer) || exercise.sets;
          }
          // Add more fields as needed
        }
      }
    }
  }

  console.log('   ✅ User answers applied');
  return updatedWorkout;
}

async function handleCreateWorkout(data) {
  const { dayId, planId, clientId, workout, answers } = data;
  
  console.log('📦 Received create_workout request:', JSON.stringify({ dayId, planId, clientId, hasDays: !!workout?.days, dayCount: workout?.days?.length }, null, 2));
  
  if (!dayId || !workout || !workout.days) {
    throw new Error('dayId and workout.days are required');
  }

  // Apply user answers if provided
  const finalWorkout = applyUserAnswers(workout, answers);

  console.log('📝 Creating workout for day:', dayId);
  console.log('📅 Workouts to create:', finalWorkout.days.length);
  console.log('📊 Full workout data:', JSON.stringify(finalWorkout, null, 2));

  // Get the current max order_index for this day to append new sessions
  const { data: existingSessions } = await supabase
    .from('sessions')
    .select('order_index')
    .eq('plan_day_id', dayId)
    .order('order_index', { ascending: false })
    .limit(1);
  
  let startOrderIndex = 0;
  if (existingSessions && existingSessions.length > 0) {
    startOrderIndex = (existingSessions[0].order_index || 0) + 1;
  }
  
  console.log(`📊 Existing sessions: ${existingSessions?.length || 0}, starting at order_index: ${startOrderIndex}`);

  let sessionsCreated = 0;
  let blocksCreated = 0;
  const errors = [];

  try {
    for (const day of finalWorkout.days) {
      const { name, exercises } = day;
      
      console.log(`\n📌 Processing day: ${name} with ${exercises?.length || 0} exercises`);
      
      if (!exercises || exercises.length === 0) {
        console.log(`⏭️  Skipping empty day: ${name}`);
        continue;
      }

      console.log(`\n📌 Creating session: ${name}`);

      // Create session (use plan_day_id like Hyrox does) with order_index at the end
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          plan_day_id: dayId,
          name: name || `Session ${sessionsCreated + 1}`,
          order_index: startOrderIndex + sessionsCreated,
        })
        .select()
        .single();

      if (sessionError || !sessionData) {
        console.error('❌ Failed to create session:', sessionError);
        errors.push(`Failed to create session for ${name}: ${sessionError?.message}`);
        continue;
      }

      console.log(`   ✅ Session created: ${sessionData.id}`);

      // Create blocks for each exercise
      let blockOrderIndex = 0; // Track order for successfully created blocks
      
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        
        console.log(`   📋 Exercise ${i + 1}/${exercises.length}: ${exercise.name}`);
        
        // Try multiple matching strategies
        let dbExercise = null;
        
        // Normalize: remove hyphens, spaces for flexible matching
        const normalized = exercise.name.toLowerCase().replace(/[-\s]/g, '');
        
        // Strategy 1: Exact match (case-insensitive)
        const exactMatch = await supabase
          .from('exercises')
          .select('id, name, modality')
          .ilike('name', exercise.name)
          .limit(1)
          .single();
        
        if (exactMatch.data) {
          dbExercise = exactMatch.data;
          console.log(`   ✅ Exact match: ${dbExercise.name}`);
        } else {
          // Strategy 2: Partial match (contains)
          const partialMatch = await supabase
            .from('exercises')
            .select('id, name, modality')
            .ilike('name', `%${exercise.name}%`)
            .limit(1)
            .single();
          
          if (partialMatch.data) {
            dbExercise = partialMatch.data;
            console.log(`   ✅ Partial match: ${dbExercise.name}`);
          } else {
            // Strategy 3: Normalized match (remove hyphens/spaces)
            // Try common variations
            const variations = [
              normalized,                          // "pullups"
              normalized.slice(0, -1),            // "pullup" (remove trailing 's')
              normalized + 's',                   // add 's'
              exercise.name.replace(/\s+/g, '-'), // "Pull Ups" -> "Pull-Ups"
              exercise.name.replace(/-/g, ' '),   // "Pull-Ups" -> "Pull Ups"
              exercise.name.replace(/\s+/g, ''),  // "Lat Pull down" -> "LatPulldown"
              exercise.name.replace(/down/gi, 'down'),  // ensure lowercase "down"
              exercise.name.replace(/\s+(up|down|in|out|over)\s*/gi, '$1'), // "Pull down" -> "Pulldown"
            ];
            
            for (const variant of variations) {
              const variantMatch = await supabase
                .from('exercises')
                .select('id, name, modality')
                .ilike('name', `%${variant}%`)
                .limit(1)
                .single();
              
              if (variantMatch.data) {
                dbExercise = variantMatch.data;
                console.log(`   ✅ Variant match (${variant}): ${dbExercise.name}`);
                break;
              }
            }
          }
        }

        if (!dbExercise) {
          console.warn(`   ⚠️  Exercise not found: "${exercise.name}"`);
          console.warn(`   💡 Tried: exact, partial, core words`);
          errors.push(`Exercise not found: ${exercise.name}`);
          continue;
        }

        // Create session_block with correct order
        const { data: blockData, error: blockError } = await supabase
          .from('session_blocks')
          .insert({
            session_id: sessionData.id,
            title: exercise.name,
            block_type: 'strength', // Default to strength
            order_index: blockOrderIndex, // Use sequential order for created blocks
            rounds: 1,
            parameters: {},
          })
          .select()
          .single();

        if (blockError || !blockData) {
          console.error(`   ❌ Failed to create block:`, blockError);
          errors.push(`Failed to create block for ${exercise.name}: ${blockError?.message}`);
          continue;
        }
        
        console.log(`   ✅ Block created at order_index: ${blockOrderIndex}`);

        // Create session_block_item with extra data
        const extra = {};
        if (exercise.sets) extra.sets = exercise.sets;
        if (exercise.reps) extra.reps = exercise.reps;
        if (exercise.weight) extra.weight = exercise.weight;
        if (exercise.duration) extra.duration = exercise.duration;
        if (exercise.distance) extra.distance = exercise.distance;
        if (exercise.rest) extra.rest = exercise.rest;
        if (exercise.notes) extra.notes = exercise.notes;

        console.log(`   💾 Extra data:`, extra);

        const { error: itemError } = await supabase
          .from('session_block_items')
          .insert({
            block_id: blockData.id,
            exercise_id: dbExercise.id,
            item_order: 0,
            status: 'draft',
            extra,
          });

        if (itemError) {
          console.error(`   ❌ Failed to create item:`, itemError);
          errors.push(`Failed to create item for ${exercise.name}: ${itemError.message}`);
        } else {
          console.log(`   ✅ Item created with extra data`);
          blockOrderIndex++; // Increment order only after successful creation
          blocksCreated++; // Count successful block creation
        }
      }

      sessionsCreated++;
    }

    console.log(`\n✅ Workout creation complete!`);
    console.log(`   📊 Sessions created: ${sessionsCreated}`);
    console.log(`   📊 Exercises created: ${blocksCreated}`);
    if (errors.length > 0) {
      console.log(`   ⚠️  Errors: ${errors.length}`);
      errors.forEach(err => console.log(`      - ${err}`));
    }

    return {
      success: true,
      data: {
        sessionsCreated,
        blocksCreated,
        errors: errors.length > 0 ? errors : undefined,
      }
    };

  } catch (error) {
    console.error('❌ Create workout error:', error);
    throw error;
  }
}

server.listen(PORT, () => {
  console.log(`\n🚀 Local API server running at http://localhost:${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/api/workout-assistant`);
  console.log(`\n💡 Make sure to update AIAssistant.tsx to use this URL in development`);
  console.log(`   Or set up a proxy in vite.config.ts\n`);
});

