import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

// Initialize Gemini (server-side with actual API key)
const apiKey = process.env.GOOGLE_AI_API_KEY || "";
const modelName = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash-exp";

const genAI = new GoogleGenerativeAI(apiKey);

// Initialize Supabase with service role key (bypasses RLS for admin operations)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, data } = req.body;

    switch (action) {
      case 'parse_workout':
        return await handleParseWorkout(req, res, data);
      
      case 'create_workout':
        return await handleCreateWorkout(req, res, data);
      
      case 'match_exercise':
        return await handleMatchExercise(req, res, data);
      
      case 'process_command':
        return await handleProcessCommand(req, res, data);
      
      case 'generate_program':
        return await handleGenerateProgram(req, res, data);
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('Workout assistant error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    });
  }
}

async function handleParseWorkout(req: any, res: any, data: any) {
  const { workoutText } = data;
  
  if (!workoutText) {
    return res.status(400).json({ error: 'workoutText is required' });
  }

  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.1, // Lower temperature for more consistent parsing
      topP: 0.8,
      topK: 10,
    }
  });

  const prompt = `You are a strict JSON workout parser. Your ONLY job is to output valid JSON. No explanations, no markdown, no code blocks - ONLY RAW JSON.

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
  "days": []
}

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
     "name": "Exercise Name" (string, required),
     "sets": 3 (number, default 0 if not specified),
     "reps": 10 (number, default 0 if not specified),
     "weight": "60kg" (string, use "0kg" if not specified),
     "rest": 60 (number in seconds, default 0 if not specified),
     "duration": 0 (number in minutes, default 0 if not specified),
     "distance": 0 (number in meters, default 0 if not specified),
     "notes": "" (string, include superset/circuit info, default ""),
     "modality": "strength" (string, required - see list below)
   }

4. MODALITY CLASSIFICATION (MUST be one of these EXACT values):
   - "strength" - barbell/dumbbell exercises with weights (Bench Press, Squats, Deadlifts)
   - "bodyweight" - no equipment bodyweight exercises (Push-ups, Pull-ups, Dips)
   - "cardio" - general cardio without distance (Bike, Assault Bike, Jump Rope)
   - "running" - running exercises (1km Run, Sprints)
   - "erg" - rowing/skiing machines (RowErg, SkiErg, Concept2)
   - "carry" - loaded carries (Farmer Carry, Sled Push, Sled Pull)
   - "core" - core/ab exercises (Plank, Sit-ups, Russian Twists)
   - "mobility" - stretching/mobility (Stretches, Foam Rolling)

5. SETS/REPS PARSING:
   - "3 x 10" = 3 sets, 10 reps
   - "5x5" = 5 sets, 5 reps
   - "4 rounds" = 4 sets (reps from exercise)
   - "3 rounds:" with list = 3 sets for each exercise in list
   - "AMRAP 10 min" = sets: 1, duration: 10, notes: "AMRAP"

6. WEIGHT PARSING:
   - "60kg" = "60kg"
   - "10-14kg" = "12kg" (use middle value)
   - "bar only" = "20kg"
   - "bodyweight" or "BW" = "0kg"
   - "2x24kg" = "2x24kg" (for carries)
   - If range like "60-80kg", use middle: "70kg"

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

EXAMPLE OUTPUT:
{
  "metadata": {
    "clientName": "Tom Jenkins",
    "email": "thomas.s.jenkins@gmail.com",
    "dob": "03/07/1982",
    "level": "Intermediate",
    "experience": "Non",
    "goal": "Health",
    "weeklyPlan": {
      "Monday": "swim",
      "Tuesday": "Upper Body weights",
      "Wednesday": "rest",
      "Thursday": "swim",
      "Friday": "Lower Body weights",
      "Saturday": "rest",
      "Sunday": "rest or PT"
    }
  },
  "days": [
    {
      "name": "Day 1 - Swim",
      "exercises": [
        {
          "name": "Easy Swim",
          "sets": 1,
          "reps": 0,
          "weight": "0kg",
          "rest": 0,
          "duration": 0,
          "distance": 200,
          "notes": "Choice of stroke",
          "modality": "cardio"
        }
      ]
    },
    {
      "name": "Day 2 - Upper Body",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 5,
          "reps": 5,
          "weight": "60kg",
          "rest": 90,
          "duration": 0,
          "distance": 0,
          "notes": "Working towards 5 rep max, use Smith machine",
          "modality": "strength"
        }
      ]
    }
  ]
}

NOW PARSE THE INPUT ABOVE. OUTPUT ONLY THE JSON, NOTHING ELSE.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Clean up the response (remove markdown code blocks if present)
  let cleanedText = text;
  if (text.startsWith('```json')) {
    cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
  } else if (text.startsWith('```')) {
    cleanedText = text.replace(/```\n?/g, '').trim();
  }

  try {
    const parsed = JSON.parse(cleanedText);
    return res.status(200).json({
      success: true,
      data: parsed
    });
  } catch (e) {
    console.error('Failed to parse AI response:', cleanedText);
    return res.status(500).json({
      error: 'Failed to parse workout',
      rawResponse: cleanedText
    });
  }
}

async function handleMatchExercise(req: any, res: any, data: any) {
  const { exerciseName, availableExercises } = data;
  
  if (!exerciseName || !availableExercises) {
    return res.status(400).json({ error: 'exerciseName and availableExercises are required' });
  }

  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
Match this exercise to the database.

Exercise: "${exerciseName}"

Database exercises:
${availableExercises.slice(0, 50).map((e: any) => `- ${e.name} (${e.modality || 'unknown'})`).join('\n')}

Return ONLY valid JSON (no markdown):
{
  "exerciseId": "id or null",
  "exerciseName": "matched name",
  "confidence": 0.95,
  "reasoning": "why this match"
}

Rules:
- Exact match = 1.0
- Synonym/similar = 0.8-0.9
- Related exercise = 0.6-0.7
- No match = null, confidence 0
`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  
  if (text.startsWith('```')) {
    text = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
  }

  try {
    const parsed = JSON.parse(text);
    return res.status(200).json({
      success: true,
      data: parsed
    });
  } catch (e) {
    console.error('Failed to parse match response:', text);
    return res.status(500).json({
      error: 'Failed to match exercise',
      rawResponse: text
    });
  }
}

async function handleProcessCommand(req: any, res: any, data: any) {
  const { userMessage, conversationHistory, currentWorkout } = data;
  
  if (!userMessage || !currentWorkout) {
    return res.status(400).json({ error: 'userMessage and currentWorkout are required' });
  }

  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
You are a workout builder assistant. Process this modification request.

Conversation:
${(conversationHistory || []).map((m: any) => `${m.role}: ${m.content}`).join('\n')}

Current workout:
${JSON.stringify(currentWorkout, null, 2)}

User: "${userMessage}"

Return ONLY valid JSON:
{
  "action": "update",
  "target": "day name or session id",
  "changes": [
    {
      "type": "add|remove|modify",
      "exercise": "name",
      "sets": 3,
      "reps": 10,
      "weight": "20kg"
    }
  ],
  "summary": "What you did",
  "confidence": 0.9
}

Rules:
- Understand: "remove sled", "replace X with Y", "make lighter"
- Be specific about target day/session
- Include all changes needed
- If unclear, confidence < 0.7
`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  
  if (text.startsWith('```')) {
    text = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
  }

  try {
    const parsed = JSON.parse(text);
    return res.status(200).json({
      success: true,
      data: parsed
    });
  } catch (e) {
    console.error('Failed to parse command response:', text);
    return res.status(500).json({
      error: 'Failed to process command',
      rawResponse: text
    });
  }
}

async function handleGenerateProgram(req: any, res: any, data: any) {
  const { clientProfile, workoutHistory } = data;
  
  if (!clientProfile) {
    return res.status(400).json({ error: 'clientProfile is required' });
  }

  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
Create a workout program for this client.

Client:
${JSON.stringify(clientProfile, null, 2)}

${workoutHistory ? `History:\n${JSON.stringify(workoutHistory, null, 2)}` : ''}

Return ONLY valid JSON:
{
  "weeklyPlan": {
    "Monday": "Upper Body",
    "Tuesday": "Rest"
  },
  "days": [
    {
      "name": "Day 1 - Upper Body",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 3,
          "reps": 10,
          "weight": "60kg",
          "rest": 90,
          "modality": "strength",
          "notes": ""
        }
      ]
    }
  ]
}

Rules:
- Specific exercise names
- Include warm-up sets
- Consider limitations
- Progressive overload
- Variety and periodization
`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  
  if (text.startsWith('```')) {
    text = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
  }

  try {
    const parsed = JSON.parse(text);
    return res.status(200).json({
      success: true,
      data: parsed
    });
  } catch (e) {
    console.error('Failed to parse program response:', text);
    return res.status(500).json({
      error: 'Failed to generate program',
      rawResponse: text
    });
  }
}

async function handleCreateWorkout(req: any, res: any, data: any) {
  const { planId, clientId, workout } = data;
  
  if (!planId || !workout || !workout.days) {
    return res.status(400).json({ error: 'planId and workout.days are required' });
  }

  console.log('Creating workout for plan:', planId);
  console.log('Days to create:', workout.days.length);

  let sessionsCreated = 0;
  const errors = [];

  try {
    for (const day of workout.days) {
      const { name, exercises } = day;
      
      if (!exercises || exercises.length === 0) {
        continue;
      }

      // Create session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          plan_id: planId,
          name: name || `Day ${sessionsCreated + 1}`,
          order_index: sessionsCreated,
        })
        .select()
        .single();

      if (sessionError || !sessionData) {
        console.error('Failed to create session:', sessionError);
        errors.push(`Failed to create session for ${name}: ${sessionError?.message}`);
        continue;
      }

      console.log('Created session:', sessionData.id);

      // Create blocks for each exercise
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        
        // Match exercise to database
        const { data: dbExercise } = await supabase
          .from('exercises')
          .select('id, modality')
          .ilike('name', `%${exercise.name}%`)
          .limit(1)
          .single();

        if (!dbExercise) {
          console.warn(`Exercise not found: ${exercise.name}`);
          errors.push(`Exercise not found: ${exercise.name}`);
          continue;
        }

        // Create session_block
        const { data: blockData, error: blockError } = await supabase
          .from('session_blocks')
          .insert({
            session_id: sessionData.id,
            title: exercise.name,
            block_type: 'strength', // Default to strength
            order_index: i,
            rounds: 1,
            parameters: {},
          })
          .select()
          .single();

        if (blockError || !blockData) {
          console.error('Failed to create block:', blockError);
          errors.push(`Failed to create block for ${exercise.name}: ${blockError?.message}`);
          continue;
        }

        // Create session_block_item
        const extra: any = {};
        if (exercise.sets) extra.sets = exercise.sets;
        if (exercise.reps) extra.reps = exercise.reps;
        if (exercise.weight) extra.weight = exercise.weight;
        if (exercise.duration) extra.duration = exercise.duration;
        if (exercise.distance) extra.distance = exercise.distance;

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
          console.error('Failed to create item:', itemError);
          errors.push(`Failed to create item for ${exercise.name}: ${itemError.message}`);
        }
      }

      sessionsCreated++;
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionsCreated,
        errors: errors.length > 0 ? errors : undefined,
      }
    });

  } catch (error: any) {
    console.error('Create workout error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create workout',
      details: error.toString(),
    });
  }
}

