import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, X, Plus, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Exercise {
  id: string;
  name: string;
  modality: string;
}

interface BlockExercise {
  exercise_id: string;
  order_index: number;
  sets: number | null;
  reps: number | null;
  time_seconds: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  intensity: any;
  exercise_name?: string;
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

interface FormData {
  name: string;
  description: string;
  target_age_min: number;
  target_age_max: number;
  target_gender: string;
  fitness_level: string;
  goals: string[];
  program_type: string;
  equipment_needed: string[];
  tags: string[];
  days: DayTemplate[];
}

const TemplateCloner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    target_age_min: 18,
    target_age_max: 65,
    target_gender: "any",
    fitness_level: "intermediate",
    goals: [],
    program_type: "",
    equipment_needed: [],
    tags: [],
    days: [],
  });
  
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedBlockPath, setSelectedBlockPath] = useState<{dayIdx: number, blockIdx: number, exIdx: number} | null>(null);

  useEffect(() => {
    loadTemplate();
    loadExercises();
  }, [id]);

  const loadExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('id, name, modality')
      .order('name');
    if (data) setAllExercises(data);
  };

  const loadTemplate = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Load template data (same as TemplateEditorV2)
      const { data: templateData, error: templateError } = await supabase
        .from('program_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (templateError) throw templateError;

      const { data: daysData, error: daysError } = await supabase
        .from('day_templates')
        .select('*')
        .eq('program_template_id', id)
        .order('day_index');
      
      if (daysError) throw daysError;

      const dayIds = daysData?.map(d => d.id) || [];
      const { data: blocksData, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .in('day_template_id', dayIds)
        .order('order_index');
      
      if (blocksError) throw blocksError;

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

      const daysWithBlocks = daysData?.map(day => ({
        ...day,
        blocks: blocksData
          ?.filter(b => b.day_template_id === day.id)
          .map(block => ({
            ...block,
            exercises: exercisesData
              ?.filter(e => e.block_id === block.id)
              .map(e => ({
                exercise_id: e.exercise_id,
                order_index: e.order_index,
                sets: e.sets,
                reps: e.reps,
                time_seconds: e.time_seconds,
                tempo: e.tempo,
                rest_seconds: e.rest_seconds,
                intensity: e.intensity,
                exercise_name: (e.exercise as any)?.name,
              })) || [],
          })) || [],
      })) || [];

      setFormData({
        name: `${templateData.name} (Copy)`,
        description: templateData.description || "",
        target_age_min: templateData.target_age_min || 18,
        target_age_max: templateData.target_age_max || 65,
        target_gender: templateData.target_gender || "any",
        fitness_level: templateData.fitness_level || "intermediate",
        goals: templateData.goals || [],
        program_type: templateData.program_type || "",
        equipment_needed: templateData.equipment_needed || [],
        tags: templateData.tags || [],
        days: daysWithBlocks,
      });
    } catch (error: any) {
      toast({
        title: "Error loading template",
        description: error.message,
        variant: "destructive" as any,
      });
      navigate('/admin/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a template name",
        variant: "destructive" as any,
      });
      return;
    }

    setSaving(true);
    try {
      // Create new template
      const { data: newTemplate, error: templateError } = await supabase
        .from('program_templates')
        .insert({
          name: formData.name,
          description: formData.description,
          days_per_week: formData.days.length,
          target_age_min: formData.target_age_min,
          target_age_max: formData.target_age_max,
          target_gender: formData.target_gender,
          fitness_level: formData.fitness_level,
          goals: formData.goals,
          program_type: formData.program_type,
          equipment_needed: formData.equipment_needed,
          tags: formData.tags,
          version: 1,
          is_active: true,
        })
        .select('id')
        .single();

      if (templateError) throw templateError;

      // Create days
      for (const day of formData.days) {
        const { data: newDay, error: dayError } = await supabase
          .from('day_templates')
          .insert({
            program_template_id: newTemplate.id,
            day_index: day.day_index,
            day_type: day.day_type,
            mobility_category: day.mobility_category,
            title: day.title,
            notes: day.notes,
          })
          .select('id')
          .single();

        if (dayError) throw dayError;

        // Create blocks for this day
        for (const block of day.blocks) {
          const { data: newBlock, error: blockError } = await supabase
            .from('blocks')
            .insert({
              day_template_id: newDay.id,
              order_index: block.order_index,
              block_type: block.block_type,
              title: block.title,
              use_day_type_defaults: block.use_day_type_defaults,
              intensity_rpe: block.intensity_rpe,
              rest_seconds_default: block.rest_seconds_default,
              notes: block.notes,
            })
            .select('id')
            .single();

          if (blockError) throw blockError;

          // Create exercises for this block
          const exercisesToInsert = block.exercises.map(ex => ({
            block_id: newBlock.id,
            exercise_id: ex.exercise_id,
            order_index: ex.order_index,
            sets: ex.sets,
            reps: ex.reps,
            time_seconds: ex.time_seconds,
            tempo: ex.tempo,
            rest_seconds: ex.rest_seconds,
            intensity: ex.intensity,
          }));

          if (exercisesToInsert.length > 0) {
            const { error: exError } = await supabase
              .from('block_exercises')
              .insert(exercisesToInsert);

            if (exError) throw exError;
          }
        }
      }

      toast({
        title: "Template cloned!",
        description: `${formData.name} has been created`,
      });

      navigate(`/admin/templates/${newTemplate.id}`);
    } catch (error: any) {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive" as any,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateExercise = (dayIdx: number, blockIdx: number, exIdx: number, field: string, value: any) => {
    const newDays = [...formData.days];
    (newDays[dayIdx].blocks[blockIdx].exercises[exIdx] as any)[field] = value;
    setFormData({ ...formData, days: newDays });
  };

  const removeExercise = (dayIdx: number, blockIdx: number, exIdx: number) => {
    const newDays = [...formData.days];
    newDays[dayIdx].blocks[blockIdx].exercises.splice(exIdx, 1);
    // Re-index
    newDays[dayIdx].blocks[blockIdx].exercises.forEach((ex, i) => {
      ex.order_index = i + 1;
    });
    setFormData({ ...formData, days: newDays });
  };

  const openExercisePicker = (dayIdx: number, blockIdx: number, exIdx: number) => {
    setSelectedBlockPath({ dayIdx, blockIdx, exIdx });
    setExercisePickerOpen(true);
    setExerciseSearch("");
  };

  const selectExercise = (exercise: Exercise) => {
    if (!selectedBlockPath) return;
    const { dayIdx, blockIdx, exIdx } = selectedBlockPath;
    const newDays = [...formData.days];
    newDays[dayIdx].blocks[blockIdx].exercises[exIdx].exercise_id = exercise.id;
    newDays[dayIdx].blocks[blockIdx].exercises[exIdx].exercise_name = exercise.name;
    setFormData({ ...formData, days: newDays });
    setExercisePickerOpen(false);
  };

  const addExercise = (dayIdx: number, blockIdx: number) => {
    const newDays = [...formData.days];
    const block = newDays[dayIdx].blocks[blockIdx];
    block.exercises.push({
      exercise_id: '',
      order_index: block.exercises.length + 1,
      sets: 3,
      reps: 10,
      time_seconds: null,
      tempo: null,
      rest_seconds: 60,
      intensity: null,
      exercise_name: 'Click to select exercise',
    });
    setFormData({ ...formData, days: newDays });
  };

  const filteredExercises = allExercises.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/templates')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Clone Template</h1>
            <p className="text-zinc-400 mt-1">Edit details and exercises</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </div>

      {/* Metadata Form */}
      <Card className="p-6 bg-zinc-900 border-zinc-800 mb-6">
        <h2 className="text-lg font-bold mb-4">Template Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Template Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              placeholder="e.g., HYROX Beginner Program"
            />
          </div>

          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              placeholder="What is this program for?"
              rows={3}
            />
          </div>

          <div>
            <Label>Age Range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={formData.target_age_min}
                onChange={(e) => setFormData({ ...formData, target_age_min: parseInt(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Min"
              />
              <Input
                type="number"
                value={formData.target_age_max}
                onChange={(e) => setFormData({ ...formData, target_age_max: parseInt(e.target.value) })}
                className="bg-zinc-800 border-zinc-700"
                placeholder="Max"
              />
            </div>
          </div>

          <div>
            <Label>Gender</Label>
            <Select
              value={formData.target_gender}
              onValueChange={(value) => setFormData({ ...formData, target_gender: value })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fitness Level</Label>
            <Select
              value={formData.fitness_level}
              onValueChange={(value) => setFormData({ ...formData, fitness_level: value })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Program Type</Label>
            <Input
              value={formData.program_type}
              onChange={(e) => setFormData({ ...formData, program_type: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              placeholder="e.g., Hybrid Race, Strength"
            />
          </div>
        </div>
      </Card>

      {/* Days & Exercises */}
      <div className="space-y-6">
        {formData.days.map((day, dayIdx) => (
          <Card key={dayIdx} className="p-6 bg-zinc-900 border-zinc-800">
            <h3 className="text-xl font-bold mb-4">
              Day {day.day_index}: {day.title}
            </h3>

            {day.blocks.map((block, blockIdx) => (
              <div key={blockIdx} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg">
                    {block.title || block.block_type}
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addExercise(dayIdx, blockIdx)}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Exercise
                  </Button>
                </div>

                <div className="space-y-2">
                  {block.exercises.map((exercise, exIdx) => (
                    <div
                      key={exIdx}
                      className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-lg"
                    >
                      {/* Exercise Name */}
                      <button
                        onClick={() => openExercisePicker(dayIdx, blockIdx, exIdx)}
                        className="flex-1 text-left hover:bg-zinc-700/50 px-3 py-2 rounded transition-colors"
                      >
                        <div className="font-medium">
                          {exercise.exercise_name || 'Click to select exercise'}
                        </div>
                      </button>

                      {/* Sets */}
                      <div className="w-20">
                        <Input
                          type="number"
                          value={exercise.sets || ''}
                          onChange={(e) => updateExercise(dayIdx, blockIdx, exIdx, 'sets', parseInt(e.target.value) || null)}
                          placeholder="Sets"
                          className="bg-zinc-800 border-zinc-700 text-center h-9"
                        />
                      </div>

                      {/* Reps or Time */}
                      {exercise.time_seconds !== null ? (
                        <div className="w-20">
                          <Input
                            type="number"
                            value={exercise.time_seconds || ''}
                            onChange={(e) => updateExercise(dayIdx, blockIdx, exIdx, 'time_seconds', parseInt(e.target.value) || null)}
                            placeholder="Sec"
                            className="bg-zinc-800 border-zinc-700 text-center h-9"
                          />
                        </div>
                      ) : (
                        <div className="w-20">
                          <Input
                            type="number"
                            value={exercise.reps || ''}
                            onChange={(e) => updateExercise(dayIdx, blockIdx, exIdx, 'reps', parseInt(e.target.value) || null)}
                            placeholder="Reps"
                            className="bg-zinc-800 border-zinc-700 text-center h-9"
                          />
                        </div>
                      )}

                      {/* Rest */}
                      <div className="w-20">
                        <Input
                          type="number"
                          value={exercise.rest_seconds || ''}
                          onChange={(e) => updateExercise(dayIdx, blockIdx, exIdx, 'rest_seconds', parseInt(e.target.value) || null)}
                          placeholder="Rest"
                          className="bg-zinc-800 border-zinc-700 text-center h-9"
                        />
                      </div>

                      {/* Remove */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeExercise(dayIdx, blockIdx, exIdx)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>

      {/* Exercise Picker Dialog */}
      <Dialog open={exercisePickerOpen} onOpenChange={setExercisePickerOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Exercise</DialogTitle>
          </DialogHeader>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <Input
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              placeholder="Search exercises..."
              className="bg-zinc-800 border-zinc-700 pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => selectExercise(exercise)}
                className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <div className="font-medium">{exercise.name}</div>
                <div className="text-xs text-zinc-400">{exercise.modality}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateCloner;













