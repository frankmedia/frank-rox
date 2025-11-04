/**
 * Local Development API Server
 * Emulates Vercel API routes for local testing
 * Run with: node dev-api-server.js
 */

const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
require('dotenv').config();

const PORT = 3001;
const apiKey = process.env.GOOGLE_AI_API_KEY || "";
const modelName = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash-exp";

console.log('🔧 Starting local API server...');
console.log('📦 Gemini Model:', modelName);
console.log('🔑 API Key:', apiKey ? '✓ Found' : '✗ Missing');

if (!apiKey) {
  console.error('❌ ERROR: GOOGLE_AI_API_KEY not found in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

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

        let result;
        
        if (action === 'parse_workout') {
          result = await handleParseWorkout(data);
        } else if (action === 'match_exercise') {
          result = await handleMatchExercise(data);
        } else if (action === 'process_command') {
          result = await handleProcessCommand(data);
        } else if (action === 'generate_program') {
          result = await handleGenerateProgram(data);
        } else {
          throw new Error('Invalid action');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        console.log(`✅ Response sent for ${action}`);
      } catch (error) {
        console.error('❌ Error:', error.message);
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

async function handleParseWorkout(data) {
  const { workoutText } = data;
  
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.1,
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

NOW PARSE THE INPUT ABOVE. OUTPUT ONLY THE JSON, NOTHING ELSE.`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  
  // Clean up markdown code blocks
  if (text.startsWith('```json')) {
    text = text.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
  } else if (text.startsWith('```')) {
    text = text.replace(/```\n?/g, '').trim();
  }

  const parsed = JSON.parse(text);
  return {
    success: true,
    data: parsed
  };
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

server.listen(PORT, () => {
  console.log(`\n🚀 Local API server running at http://localhost:${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/api/workout-assistant`);
  console.log(`\n💡 Make sure to update AIAssistant.tsx to use this URL in development`);
  console.log(`   Or set up a proxy in vite.config.ts\n`);
});

