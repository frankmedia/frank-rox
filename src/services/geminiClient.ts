import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client
const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY || "";
const modelName = import.meta.env.VITE_GOOGLE_AI_MODEL || "gemini-2.0-flash-exp";

if (!apiKey) {
  console.warn("⚠️ VITE_GOOGLE_AI_API_KEY not found in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface ExerciseMatch {
  name: string;
  sets?: number;
  reps?: number;
  weight?: string | number;
  rest?: number;
  duration?: number;
  distance?: number;
  notes?: string;
  modality?: string;
}

export interface WorkoutChange {
  type: 'add' | 'remove' | 'modify';
  target?: string; // day name or session id
  exercise?: string;
  sets?: number;
  reps?: number;
  weight?: string | number;
  rest?: number;
  duration?: number;
  distance?: number;
  notes?: string;
}

export interface AIWorkoutResponse {
  action: 'create' | 'update' | 'delete' | 'info';
  target?: string;
  changes: WorkoutChange[];
  summary: string;
  confidence?: number;
}

/**
 * Parse workout text into structured exercise data
 */
export async function parseWorkoutText(workoutText: string): Promise<{
  exercises: ExerciseMatch[];
  metadata: {
    clientName?: string;
    goal?: string;
    level?: string;
    weeklyPlan?: Record<string, string>;
  };
}> {
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
You are a workout parser. Extract exercises and metadata from this workout program.

Workout Text:
${workoutText}

Return a JSON response with this structure:
{
  "metadata": {
    "clientName": "string or null",
    "goal": "string or null",
    "level": "string or null",
    "weeklyPlan": {
      "Monday": "activity",
      "Tuesday": "activity"
    }
  },
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 3,
      "reps": 10,
      "weight": "20kg or 20",
      "rest": 60,
      "duration": 30,
      "distance": 1,
      "notes": "any special instructions",
      "modality": "strength|cardio|bodyweight|mobility|etc"
    }
  ]
}

Important:
- Extract ALL exercises, even from multi-day programs
- Parse sets like "3 x 10", "5x5", "3 rounds"
- Extract weights like "20kg", "10-14kg", "60-80kg"
- Identify supersets, circuits, rounds
- Include notes for special instructions (Smith machine, BOSU, etc.)
- Guess modality based on exercise type
- For ranges (10-14kg), use the middle value
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response:", text);
    throw new Error("Failed to parse workout text");
  }
}

/**
 * Match exercise name to database exercise
 */
export async function matchExerciseName(
  exerciseName: string,
  availableExercises: Array<{ id: string; name: string; modality?: string; }>
): Promise<{ exerciseId: string; confidence: number; suggestions?: string[] }> {
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
You are an exercise matching expert. Match the given exercise name to the best option from the database.

Exercise to match: "${exerciseName}"

Available exercises in database:
${availableExercises.map(e => `- ${e.name} (${e.modality || 'unknown'})`).join('\n')}

Return JSON:
{
  "exerciseId": "id of best match or null",
  "confidence": 0.0 to 1.0,
  "suggestions": ["alternative 1", "alternative 2"] // if confidence < 0.8
}

Rules:
- Exact match = 1.0 confidence
- Similar name/synonym = 0.8-0.9
- Same muscle group = 0.6-0.7
- No good match = confidence < 0.6, return null for exerciseId
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response:", text);
    return { exerciseId: "", confidence: 0, suggestions: [] };
  }
}

/**
 * Process conversational workout modification
 */
export async function processWorkoutCommand(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentWorkout: any
): Promise<AIWorkoutResponse> {
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
You are a workout builder assistant. The user wants to modify their workout.

Conversation history:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Current workout structure:
${JSON.stringify(currentWorkout, null, 2)}

User's new instruction: "${userMessage}"

Analyze the instruction and return JSON:
{
  "action": "create|update|delete|info",
  "target": "day_2 or session name",
  "changes": [
    {
      "type": "add|remove|modify",
      "exercise": "Exercise Name",
      "sets": 3,
      "reps": 10,
      "weight": "20kg",
      "notes": "any notes"
    }
  ],
  "summary": "Human-readable description of what was changed",
  "confidence": 0.0 to 1.0
}

Rules:
- Understand natural language: "remove sled", "make it lighter", "add core"
- Identify which day/session to modify
- For replacements, include both remove and add changes
- For weight adjustments, calculate the new values
- Be specific in summary
- If unclear, set confidence < 0.7 and ask for clarification in summary
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  try {
    const parsed = JSON.parse(text);
    return {
      action: parsed.action || 'info',
      target: parsed.target,
      changes: parsed.changes || [],
      summary: parsed.summary || 'Changes processed',
      confidence: parsed.confidence || 0.8
    };
  } catch (e) {
    console.error("Failed to parse AI response:", text);
    throw new Error("Failed to process command");
  }
}

/**
 * Generate a full workout program based on client profile and history
 */
export async function generateWorkoutProgram(
  clientProfile: {
    name: string;
    level: string;
    goal: string;
    experience: string;
    limitations?: string[];
  },
  workoutHistory?: any[]
): Promise<{
  weeklyPlan: Record<string, string>;
  days: Array<{
    name: string;
    exercises: ExerciseMatch[];
  }>;
}> {
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
You are an expert personal trainer. Create a workout program for this client.

Client Profile:
- Name: ${clientProfile.name}
- Level: ${clientProfile.level}
- Goal: ${clientProfile.goal}
- Experience: ${clientProfile.experience}
${clientProfile.limitations ? `- Limitations/Injuries: ${clientProfile.limitations.join(', ')}` : ''}

${workoutHistory ? `Recent workout history:\n${JSON.stringify(workoutHistory, null, 2)}` : ''}

Create a full week program with specific exercises, sets, reps, and weights.

Return JSON:
{
  "weeklyPlan": {
    "Monday": "Upper Body",
    "Tuesday": "Lower Body",
    ...
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
          "notes": "Use Smith machine for safety",
          "modality": "strength"
        }
      ]
    }
  ]
}

Rules:
- Be specific with exercise names
- Include progressive warm-up sets where appropriate
- Consider limitations and injuries
- Use progressive overload principles
- Include rest days
- Add variety to prevent boredom
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response:", text);
    throw new Error("Failed to generate program");
  }
}

export const geminiClient = {
  parseWorkoutText,
  matchExerciseName,
  processWorkoutCommand,
  generateWorkoutProgram,
};

