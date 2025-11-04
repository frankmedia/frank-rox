import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: string;
}

interface AIAssistantProps {
  planId: string;
  clientId?: string;
  onClose: () => void;
  onWorkoutCreated?: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  planId,
  clientId,
  onClose,
  onWorkoutCreated
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your AI workout builder. Paste a workout program or tell me what to create, and I'll build it into this plan. You can then refine it with follow-up instructions!",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
      // Call the API endpoint
      const response = await fetch('/api/workout-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse_workout',
          data: {
            workoutText: input,
            planId,
            clientId,
          }
        })
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText || 'Failed to parse workout'}`);
      }

      // Check if response has content
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('API returned empty response. Please check your GOOGLE_AI_API_KEY is set in environment variables.');
      }

      // Parse JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error('API returned invalid JSON. Please check server logs.');
      }

      if (result.success) {
        const aiMessage: Message = {
          role: 'assistant',
          content: `✅ I've parsed the workout! Found ${result.data.days?.length || 0} training days with ${result.data.days?.reduce((acc: number, day: any) => acc + day.exercises.length, 0) || 0} total exercises.\n\n**Next steps:**\n- Review the exercises below\n- Click "Create Workout" to add to the plan\n- Or tell me to make changes!`,
          timestamp: new Date(),
          action: 'parse_success'
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // Store parsed data for creation
        (window as any).__parsedWorkout = result.data;

        toast({
          title: "Workout Parsed!",
          description: `Found ${result.data.days?.length || 0} days to create`,
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
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-black" />
          <h3 className="font-bold text-black">AI Workout Builder</h3>
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

