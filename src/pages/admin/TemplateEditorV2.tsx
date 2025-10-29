import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BlockExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number | null;
  reps: number | null;
  time_seconds: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  intensity: any;
  exercise_name?: string; // For display
}

interface Block {
  id: string;
  order_index: number;
  block_type: string;
  title: string | null;
  use_day_type_defaults: boolean;
  intensity_rpe: number | null;
  rest_seconds_default: number | null;
  notes: string | null;
  exercises: BlockExercise[];
}

interface DayTemplate {
  id: string;
  day_index: number;
  day_type: string;
  mobility_category: string | null;
  title: string;
  notes: string | null;
  blocks: Block[];
}

interface ProgramTemplate {
  id: string;
  name: string;
  days_per_week: number;
  notes: string | null;
  version: number;
  is_active: boolean;
  created_by: string | null;
  description: string | null;
  target_age_min: number | null;
  target_age_max: number | null;
  target_gender: string | null;
  fitness_level: string | null;
  goals: string[] | null;
  program_type: string | null;
  equipment_needed: string[] | null;
  tags: string[] | null;
  days: DayTemplate[];
}

const TemplateEditorV2 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ProgramTemplate | null>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      loadTemplate();
    } else {
      // Creating new template - redirect to old editor for now
      if (id === 'new') {
        toast({
          title: "Feature not ready",
          description: "Template creation UI is coming soon. For now, create templates via SQL.",
          variant: "destructive" as any,
        });
        navigate('/admin/templates');
      }
      setLoading(false);
    }
  }, [id]);

  const loadTemplate = async () => {
    if (!id || id === 'new') return;
    
    setLoading(true);
    try {
      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from('program_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (templateError) throw templateError;

      // Load days
      const { data: daysData, error: daysError } = await supabase
        .from('day_templates')
        .select('*')
        .eq('program_template_id', id)
        .order('day_index');
      
      if (daysError) throw daysError;

      // Load blocks for all days
      const dayIds = daysData?.map(d => d.id) || [];
      const { data: blocksData, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .in('day_template_id', dayIds)
        .order('order_index');
      
      if (blocksError) throw blocksError;

      // Load exercises for all blocks
      const blockIds = blocksData?.map(b => b.id) || [];
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('block_exercises')
        .select(`
          *,
          exercise:exercises(name)
        `)
        .in('block_id', blockIds)
        .order('order_index');
      
      if (exercisesError) throw exercisesError;

      // Nest the data
      const daysWithBlocks = daysData?.map(day => ({
        ...day,
        blocks: blocksData
          ?.filter(b => b.day_template_id === day.id)
          .map(block => ({
            ...block,
            exercises: exercisesData
              ?.filter(e => e.block_id === block.id)
              .map(e => ({
                ...e,
                exercise_name: (e.exercise as any)?.name,
              })) || [],
          })) || [],
      })) || [];

      setTemplate({
        ...templateData,
        days: daysWithBlocks,
      });
    } catch (error: any) {
      toast({
        title: "Error loading template",
        description: error.message,
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
          <h2 className="text-2xl font-bold mb-2">Template not found</h2>
          <p className="text-zinc-400 mb-6">The template you're looking for doesn't exist</p>
          <Button onClick={() => navigate('/admin/templates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/templates')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{template.name}</h1>
            <p className="text-zinc-400 mt-1">
              Version {template.version} • {template.days_per_week} days/week • {template.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/templates/${id}/generate`)}
          >
            Generate Program
          </Button>
        </div>
      </div>

      {/* Template Metadata */}
      <Card className="p-6 bg-zinc-900 border-zinc-800 mb-6">
        <h2 className="text-lg font-bold mb-4">Template Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Description */}
          {template.description && (
            <div className="md:col-span-2">
              <div className="text-zinc-400 mb-1">Description</div>
              <div className="text-zinc-200">{template.description}</div>
            </div>
          )}

          {/* Demographics */}
          {(template.target_age_min || template.target_gender || template.fitness_level) && (
            <div>
              <div className="text-zinc-400 mb-1">Target Demographics</div>
              <div className="flex items-center gap-2 flex-wrap">
                {template.target_age_min && template.target_age_max && (
                  <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-200">
                    {template.target_age_min}-{template.target_age_max} years
                  </span>
                )}
                {template.target_gender && (
                  <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-200 capitalize">
                    {template.target_gender}
                  </span>
                )}
                {template.fitness_level && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 capitalize">
                    {template.fitness_level}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Program Type */}
          {template.program_type && (
            <div>
              <div className="text-zinc-400 mb-1">Program Type</div>
              <div className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/30 inline-block">
                {template.program_type}
              </div>
            </div>
          )}

          {/* Goals */}
          {template.goals && template.goals.length > 0 && (
            <div className="md:col-span-2">
              <div className="text-zinc-400 mb-1">Training Goals</div>
              <div className="flex flex-wrap gap-2">
                {template.goals.map((goal, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-500/10 text-green-400 rounded border border-green-500/30 text-xs">
                    {goal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {template.equipment_needed && template.equipment_needed.length > 0 && (
            <div className="md:col-span-2">
              <div className="text-zinc-400 mb-1">Equipment Needed</div>
              <div className="flex flex-wrap gap-2">
                {template.equipment_needed.map((eq, idx) => (
                  <span key={idx} className="px-2 py-1 bg-zinc-800 rounded text-zinc-200 text-xs">
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="md:col-span-2">
              <div className="text-zinc-400 mb-1">Tags</div>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-zinc-800 rounded text-zinc-400 text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Days */}
      <div className="space-y-6">
        {template.days.map((day, dayIdx) => (
          <Card key={day.id} className="p-6 bg-zinc-900 border-zinc-800">
            {/* Day Header */}
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-xl font-bold">Day {day.day_index}: {day.title}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/30">
                    {day.day_type}
                  </span>
                  {day.mobility_category && (
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded border border-purple-500/30">
                      Mobility: {day.mobility_category}
                    </span>
                  )}
                </div>
                {day.notes && (
                  <p className="text-sm text-zinc-400 mt-2">{day.notes}</p>
                )}
              </div>
            </div>

            {/* Blocks */}
            <div className="space-y-4">
              {day.blocks.map((block, blockIdx) => (
                <div key={block.id} className="pl-4 border-l-2 border-yellow-500/30">
                  {/* Block Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">
                        {block.title || block.block_type}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-400">
                          {block.block_type}
                        </span>
                        {block.use_day_type_defaults && (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                            Using Defaults
                          </span>
                        )}
                        {block.intensity_rpe && (
                          <span className="text-xs text-zinc-400">
                            RPE: {block.intensity_rpe}
                          </span>
                        )}
                        {block.rest_seconds_default && (
                          <span className="text-xs text-zinc-400">
                            Rest: {block.rest_seconds_default}s
                          </span>
                        )}
                      </div>
                      {block.notes && (
                        <p className="text-xs text-zinc-500 mt-1">{block.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Exercises */}
                  <div className="space-y-2">
                    {block.exercises.map((exercise, exIdx) => (
                      <div
                        key={exercise.id}
                        className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
                      >
                        <span className="text-xs text-zinc-500 font-mono">
                          {exercise.order_index}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium">{exercise.exercise_name}</div>
                          <div className="text-xs text-zinc-400 flex items-center gap-3 mt-1">
                            {exercise.sets && <span>{exercise.sets} sets</span>}
                            {exercise.reps && <span>× {exercise.reps} reps</span>}
                            {exercise.time_seconds && (
                              <span>{exercise.time_seconds}s</span>
                            )}
                            {exercise.rest_seconds !== null && (
                              <span>• {exercise.rest_seconds}s rest</span>
                            )}
                            {exercise.tempo && (
                              <span>• Tempo: {exercise.tempo}</span>
                            )}
                            {exercise.intensity && (
                              <span>• {JSON.stringify(exercise.intensity)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="p-6 bg-zinc-900 border-zinc-800 mt-6">
        <h3 className="text-lg font-bold mb-4">Template Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-zinc-400">Total Days</div>
            <div className="text-2xl font-bold">{template.days.length}</div>
          </div>
          <div>
            <div className="text-zinc-400">Total Blocks</div>
            <div className="text-2xl font-bold">
              {template.days.reduce((sum, d) => sum + d.blocks.length, 0)}
            </div>
          </div>
          <div>
            <div className="text-zinc-400">Total Exercises</div>
            <div className="text-2xl font-bold">
              {template.days.reduce(
                (sum, d) =>
                  sum + d.blocks.reduce((bSum, b) => bSum + b.exercises.length, 0),
                0
              )}
            </div>
          </div>
          <div>
            <div className="text-zinc-400">Status</div>
            <div className={`text-2xl font-bold ${template.is_active ? 'text-green-400' : 'text-gray-400'}`}>
              {template.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TemplateEditorV2;

