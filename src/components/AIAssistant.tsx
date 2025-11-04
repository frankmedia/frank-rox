import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { supabase } from "@/utils/supabaseClient";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: string;
}

interface Question {
  id: number;
  text: string;
  type: 'choice';
  options: string[];
  affectedExercise: string;
  field: string;
}

interface ParsedWorkout {
  days: any[];
  metadata?: any;
  questions?: Question[];
}

interface AIAssistantProps {
  planId: string;
  dayId: string; // The training day to add workouts to
  clientId?: string;
  onClose: () => void;
  onWorkoutCreated?: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  planId,
  dayId,
  clientId,
  onClose,
  onWorkoutCreated
}) => {
  const storageKey = `ai-chat-${planId}`;
  
  console.log('🤖 AI Assistant initialized with dayId:', dayId);
  
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    }
    return [
      {
        role: 'assistant',
        content: "👋 Hi! I'm your AI workout builder. Paste a workout program or tell me what to create, and I'll build it into the selected training day. You can then refine it with follow-up instructions!",
        timestamp: new Date(),
      }
    ];
  });
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedWorkout, setParsedWorkout] = useState<ParsedWorkout | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const [targetDayLabel, setTargetDayLabel] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Fetch target day label
  useEffect(() => {
    const fetchDayLabel = async () => {
      if (!dayId) return;
      const { data } = await supabase
        .from('plan_days')
        .select('day_index, label')
        .eq('id', dayId)
        .single();
      
      if (data) {
        const label = data.label || `Day ${data.day_index + 1}`;
        setTargetDayLabel(label);
        console.log('📅 Target day:', label, '(ID:', dayId, ')');
      }
    };
    fetchDayLabel();
  }, [dayId]);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }, [messages, storageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const startTime = Date.now();
      
      // Fetch all exercise names from Supabase to help Gemini match correctly
      console.log('📚 Fetching exercises from database...');
      const exerciseFetchStart = Date.now();
      const { data: exercises } = await supabase
        .from('exercises')
        .select('name, modality')
        .order('name');
      const exerciseFetchTime = Date.now() - exerciseFetchStart;
      
      const exerciseList = exercises?.map(e => `${e.name} (${e.modality})`).join(', ') || '';
      
      console.log(`📚 Fetched ${exercises?.length || 0} exercises in ${exerciseFetchTime}ms`);
      console.log(`📤 Sending workout to AI (text: ${input.length} chars, exercises: ${exerciseList.length} chars)...`);
      
      // Call the API endpoint
      const apiCallStart = Date.now();
      const response = await fetch('/api/workout-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse_workout',
          data: {
            workoutText: input,
            planId,
            clientId,
            exerciseList, // Send exercise names to help with matching
          }
        })
      });

      const apiCallTime = Date.now() - apiCallStart;
      console.log(`✅ API response received in ${apiCallTime}ms (${(apiCallTime / 1000).toFixed(2)}s)`);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText || 'Failed to parse workout'}`);
      }

      // Check if response has content
      console.log('📖 Reading response text...');
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('API returned empty response. Please check your GOOGLE_AI_API_KEY is set in environment variables.');
      }
      console.log(`📏 Response size: ${responseText.length} characters`);

      // Parse JSON
      console.log('🔍 Parsing JSON...');
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error('API returned invalid JSON. Please check server logs.');
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`\n✅ ===== FRONTEND COMPLETE =====`);
      console.log(`⏱️  Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`📊 Breakdown:`);
      console.log(`   - Exercise fetch: ${exerciseFetchTime}ms`);
      console.log(`   - API call: ${apiCallTime}ms (${((apiCallTime/totalTime)*100).toFixed(1)}%)`);
      console.log(`   - Other: ${totalTime - exerciseFetchTime - apiCallTime}ms`);

      if (result.success) {
        console.log('📊 Parsed workout data:', JSON.stringify(result.data, null, 2));
        
        const hasQuestions = result.data.questions && result.data.questions.length > 0;
        const totalExercises = result.data.days?.reduce((acc: number, day: any) => acc + day.exercises.length, 0) || 0;
        
        // Build detailed summary
        let summaryContent = `✅ **Workout Parsed Successfully!**\n\n`;
        summaryContent += `📊 **Summary:**\n`;
        summaryContent += `- ${result.data.days?.length || 0} training day(s)\n`;
        summaryContent += `- ${totalExercises} exercise(s) total\n\n`;
        
        // List all exercises by day (single column for readability)
        summaryContent += `📋 **What will be created:**\n\n`;
        result.data.days?.forEach((day: any, dayIndex: number) => {
          summaryContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          summaryContent += `**${day.name.toUpperCase()}**\n`;
          summaryContent += `${day.exercises.length} exercise(s)\n`;
          summaryContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          
          day.exercises.forEach((ex: any, exIndex: number) => {
            // Build details string
            const parts = [];
            if (ex.sets > 0) parts.push(`${ex.sets} sets`);
            if (ex.reps > 0) parts.push(`${ex.reps} reps`);
            if (ex.weight && ex.weight !== '0kg') parts.push(`${ex.weight}`);
            if (ex.distance > 0) parts.push(`${ex.distance}m`);
            if (ex.duration > 0) parts.push(`${ex.duration} min`);
            
            const details = parts.join(' × ');
            
            summaryContent += `${exIndex + 1}. **${ex.name}**\n`;
            if (details) {
              summaryContent += `   📊 ${details}\n`;
            }
            if (ex.notes) {
              summaryContent += `   💬 ${ex.notes}\n`;
            }
            summaryContent += `\n`;
          });
        });
        
        if (hasQuestions) {
          summaryContent += `\n🤔 **I have ${result.data.questions.length} question(s) before creating:**\nPlease answer the questions below!`;
        } else {
          summaryContent += `\n✅ **Ready to create!**\nReview the exercises above, then click "Create Workout" to add them to the plan.`;
        }
        
        const aiMessage: Message = {
          role: 'assistant',
          content: summaryContent,
          timestamp: new Date(),
          action: 'parse_success'
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // Store parsed data in state
        setParsedWorkout(result.data);
        setUserAnswers({}); // Reset answers for new questions

        toast({
          title: "Workout Parsed!",
          description: hasQuestions 
            ? `Please answer ${result.data.questions.length} question(s)` 
            : `Found ${result.data.days?.length || 0} days to create`,
        });
      } else {
        throw new Error(result.error || 'Failed to parse workout');
      }
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      
      let errorMsg = error.message || 'Unknown error occurred';
      
      // Provide helpful hints
      if (errorMsg.includes('empty response')) {
        errorMsg += '\n\n💡 Check that GOOGLE_AI_API_KEY is set in your .env file';
      } else if (errorMsg.includes('404')) {
        errorMsg = 'API endpoint not found. The /api/workout-assistant endpoint may not be deployed.';
      }
      
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Sorry, I encountered an error:\n\n${errorMsg}\n\nPlease check the console for more details.`,
        timestamp: new Date(),
        action: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Error",
        description: errorMsg.split('\n')[0], // First line only for toast
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkout = async () => {
    if (!parsedWorkout || creatingWorkout) return;

    // Check if all questions are answered
    const hasQuestions = parsedWorkout.questions && parsedWorkout.questions.length > 0;
    if (hasQuestions) {
      const unansweredQuestions = parsedWorkout.questions!.filter(q => !userAnswers[q.id]);
      if (unansweredQuestions.length > 0) {
        toast({
          title: "Please answer all questions",
          description: `${unansweredQuestions.length} question(s) remaining`,
          variant: "destructive" as any,
        });
        return;
      }
    }

    setCreatingWorkout(true);

    try {
      console.log('🚀 Creating workout with data:', {
        planId,
        dayId,
        clientId,
        workout: parsedWorkout,
        answers: userAnswers
      });
      
      // Call API to create workout in database
      const response = await fetch('/api/workout-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_workout',
          data: {
            dayId,
            planId,
            clientId,
            workout: parsedWorkout,
            answers: userAnswers, // Send user answers
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create workout: ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Build detailed success message
        let successContent = `✅ **Workout Created Successfully!**\n\n`;
        successContent += `📊 **Summary:**\n`;
        successContent += `- ${result.data.sessionsCreated || 0} session(s) added\n`;
        successContent += `- ${result.data.blocksCreated || 0} exercise(s) created\n`;
        
        if (result.data.errors && result.data.errors.length > 0) {
          successContent += `\n⚠️ **Issues:**\n`;
          result.data.errors.forEach((error: string) => {
            successContent += `- ${error}\n`;
          });
        }
        
        successContent += `\n✅ **Done!**\nYou can close this window or create more workouts.`;
        
        const successMessage: Message = {
          role: 'assistant',
          content: successContent,
          timestamp: new Date(),
          action: 'create_success'
        };

        setMessages(prev => [...prev, successMessage]);
        setParsedWorkout(null); // Clear parsed workout

        toast({
          title: "Workout Created!",
          description: `${result.data.sessionsCreated || 0} sessions added`,
        });

        // Notify parent to refresh
        onWorkoutCreated?.();
      } else {
        throw new Error(result.error || 'Failed to create workout');
      }
    } catch (error: any) {
      console.error('Create workout error:', error);

      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Failed to create workout:\n\n${error.message}\n\nPlease check the console for details.`,
        timestamp: new Date(),
        action: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Error",
        description: error.message,
        variant: "destructive" as any,
      });
    } finally {
      setCreatingWorkout(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed right-4 bottom-4 w-96 h-[600px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-black" />
            <h3 className="font-bold text-black">AI Workout Builder</h3>
          </div>
          {targetDayLabel && (
            <div className="text-xs text-black/70 font-medium mt-0.5">
              📅 Target: {targetDayLabel}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/10 rounded transition-colors"
        >
          <X className="w-5 h-5 text-black" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-zinc-800 text-white'
              }`}
            >
              {msg.role === 'assistant' && (
                <Bot className="w-4 h-4 inline mr-2" />
              )}
              <span className="text-sm whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
              <span className="text-sm text-zinc-400">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Questions Section */}
      {parsedWorkout && parsedWorkout.questions && parsedWorkout.questions.length > 0 && (
        <div className="border-t border-zinc-700 px-4 py-3 bg-zinc-800/30 space-y-3 max-h-48 overflow-y-auto">
          <div className="text-sm font-semibold text-yellow-500 flex items-center gap-2">
            🤖 I have {parsedWorkout.questions.length} question(s) before creating:
          </div>
          
          {parsedWorkout.questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <div className="text-xs text-zinc-400">
                <span className="font-semibold text-white">Q{question.id}:</span> {question.text}
              </div>
              <div className="flex flex-wrap gap-2">
                {question.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => setUserAnswers(prev => ({ ...prev, [question.id]: option }))}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      userAnswers[question.id] === option
                        ? 'bg-yellow-500 text-black'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workout Button */}
      {parsedWorkout && (
        <div className="border-t border-zinc-700 px-3 py-2 bg-zinc-800/50">
          <Button
            onClick={createWorkout}
            disabled={creatingWorkout}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500 font-semibold"
          >
            {creatingWorkout ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Workout...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Workout
              </>
            )}
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-zinc-700 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Paste workout program or give instructions..."
            className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm resize-none h-20"
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-yellow-500 text-black hover:bg-yellow-400"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          💡 Tip: Paste a full program or say "remove sled push" to modify
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;

