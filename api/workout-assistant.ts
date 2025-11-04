import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini (server-side with actual API key)
const apiKey = process.env.GOOGLE_AI_API_KEY || "";
const modelName = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash-exp";

const genAI = new GoogleGenerativeAI(apiKey);

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

  const prompt = `
You are a workout parser. Extract exercises and metadata from this workout program.

Workout Text:
${workoutText}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "metadata": {
    "clientName": "string or null",
    "email": "string or null",
    "dob": "string or null",
    "level": "string or null",
    "experience": "string or null",
    "goal": "string or null",
    "weeklyPlan": {}
  },
  "days": [
    {
      "name": "Day 1",
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": 3,
          "reps": 10,
          "weight": "20kg",
          "rest": 60,
          "duration": 0,
          "distance": 0,
          "notes": "",
          "modality": "strength"
        }
      ]
    }
  ]
}

Rules:
- Parse ALL days and exercises
- Extract sets/reps like "3 x 10", "5x5", "3 rounds"
- Extract weights: "20kg", "10-14kg" (use middle), "bar only" (use 20kg)
- Identify supersets, circuits (note in exercise notes)
- Modality: strength, cardio, bodyweight, mobility, core, erg, carry
- For weekly plan, extract Mon/Tue/etc activities
`;

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

