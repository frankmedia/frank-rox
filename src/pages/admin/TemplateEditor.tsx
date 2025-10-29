import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface MovementRequirement {
  id: string;
  movement_pattern: string;
  frequency_per_week: number;
  warmup_sets: number;
  warmup_reps: number;
  working_sets: number;
  working_reps: number;
  intensity_guideline: string;
  rest_seconds: number;
  priority_order: number;
  notes: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  age_range: string;
  gender: string;
  fitness_level: string;
  goals: string[];
  days_per_week: number;
  weeks_duration: number;
  includes_cardio: boolean;
  includes_strength: boolean;
  includes_mobility: boolean;
  includes_warmup: boolean;
  includes_cooldown: boolean;
  equipment_needed: string[];
  split_type: string;
  program_type: string;
  movement_requirements: MovementRequirement[];
}

const TemplateEditor = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Check if we're in clone mode
  const isCloneMode = location.pathname.includes('/clone');
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    description: "",
    age_range: "30-35",
    gender: "any",
    fitness_level: "intermediate",
    goals: [],
    days_per_week: 4,
    weeks_duration: 2,
    includes_cardio: true,
    includes_strength: true,
    includes_mobility: false,
    includes_warmup: true,
    includes_cooldown: true,
    equipment_needed: [],
    split_type: "full_body",
    program_type: "general_fitness",
    movement_requirements: [],
  });

  const ageRanges = ["20-25", "25-30", "30-35", "35-40", "40-45", "45-50", "50-55", "55-60", "60-65", "65+"];
  const genders = ["any", "male", "female"];
  const fitnessLevels = ["beginner", "intermediate", "advanced", "elite"];
  const availableGoals = ["strength", "cardio", "weight-loss", "muscle-gain", "endurance", "hyrox", "general-fitness"];
  const availableEquipment = ["machines", "free-weights", "bodyweight", "kettlebells", "cardio-equipment", "minimal"];
  
  const movementPatterns = ["squat", "hinge", "push", "pull", "thrust", "abduction", "carry", "rotation", "isolation"];
  const splitTypes = [
    { value: "full_body", label: "Full Body" },
    { value: "upper_lower", label: "Upper/Lower Split" },
    { value: "push_pull_legs", label: "Push/Pull/Legs" },
    { value: "custom", label: "Custom Split" },
  ];
  const programTypes = [
    { value: "general_fitness", label: "General Fitness" },
    { value: "strength_focused", label: "Strength Focused" },
    { value: "hypertrophy", label: "Hypertrophy" },
    { value: "endurance", label: "Endurance" },
    { value: "hyrox", label: "Hyrox Training" },
    { value: "glute_specialization", label: "Glute Specialization" },
  ];
  const intensityGuidelines = ["light", "moderate", "near_fatigue", "to_failure", "RPE_7", "RPE_8", "RPE_9"];

  useEffect(() => {
    if (id && id !== 'new') {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    if (!id || id === 'new') return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Load movement requirements
        const { data: movementReqs } = await supabase
          .from('template_movement_requirements')
          .select('*')
          .eq('template_id', id);

        setFormData({
          name: isCloneMode ? `${data.name} (Copy)` : data.name || "",
          description: data.description || "",
          age_range: data.age_range || "30-35",
          gender: data.gender || "any",
          fitness_level: data.fitness_level || "intermediate",
          goals: data.goals || [],
          days_per_week: data.days_per_week || 4,
          weeks_duration: data.weeks_duration || 2,
          includes_cardio: data.includes_cardio || false,
          includes_strength: data.includes_strength || false,
          includes_mobility: data.includes_mobility || false,
          includes_warmup: data.includes_warmup || false,
          includes_cooldown: data.includes_cooldown || false,
          equipment_needed: data.equipment_needed || [],
          split_type: data.split_type || "full_body",
          program_type: data.program_type || "general_fitness",
          movement_requirements: (movementReqs || []).map(req => ({
            id: req.id,
            movement_pattern: req.movement_pattern,
            frequency_per_week: req.frequency_per_week,
            warmup_sets: req.warmup_sets,
            warmup_reps: req.warmup_reps,
            working_sets: req.working_sets,
            working_reps: req.working_reps,
            intensity_guideline: req.intensity_guideline,
            rest_seconds: req.rest_seconds,
            priority_order: req.priority_order,
            notes: req.notes || "",
          })),
        });
      }
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
      const { movement_requirements, ...baseTemplateData } = formData;
      const templateData = {
        ...baseTemplateData,
        created_by: "admin", // TODO: Get from auth context
        is_public: false,
        template_data: {}, // Will be populated when building actual exercises
      };

      let templateId = id;

      if (id && id !== 'new' && !isCloneMode) {
        // Update existing template
        const { error } = await supabase
          .from('program_templates')
          .update(templateData)
          .eq('id', id);
        
        if (error) throw error;

        // Delete existing movement requirements and re-insert
        await supabase
          .from('template_movement_requirements')
          .delete()
          .eq('template_id', id);
        
        toast({
          title: "Template updated",
          description: "Your changes have been saved",
        });
      } else {
        // Create new template (also for clone mode)
        const { data, error } = await supabase
          .from('program_templates')
          .insert([templateData])
          .select('id')
          .single();
        
        if (error) throw error;
        
        templateId = data.id;
        
        toast({
          title: isCloneMode ? "Template cloned" : "Template created",
          description: isCloneMode ? "Template has been cloned successfully" : "Template has been created successfully",
        });
      }

      // Insert movement requirements
      if (movement_requirements.length > 0 && templateId) {
        const movementReqsData = movement_requirements.map(req => ({
          template_id: templateId,
          movement_pattern: req.movement_pattern,
          frequency_per_week: req.frequency_per_week,
          warmup_sets: req.warmup_sets,
          warmup_reps: req.warmup_reps,
          working_sets: req.working_sets,
          working_reps: req.working_reps,
          intensity_guideline: req.intensity_guideline,
          rest_seconds: req.rest_seconds,
          priority_order: req.priority_order,
          notes: req.notes,
        }));

        const { error: reqError } = await supabase
          .from('template_movement_requirements')
          .insert(movementReqsData);

        if (reqError) throw reqError;
      }
      
      navigate('/admin/templates');
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

  const toggleArrayValue = (array: string[], value: string) => {
    if (array.includes(value)) {
      return array.filter(v => v !== value);
    } else {
      return [...array, value];
    }
  };

  const addMovementRequirement = () => {
    const newRequirement: MovementRequirement = {
      id: `temp-${Date.now()}`,
      movement_pattern: "squat",
      frequency_per_week: formData.days_per_week,
      warmup_sets: 2,
      warmup_reps: 12,
      working_sets: 4,
      working_reps: 12,
      intensity_guideline: "near_fatigue",
      rest_seconds: 90,
      priority_order: formData.movement_requirements.length + 1,
      notes: "",
    };
    setFormData({
      ...formData,
      movement_requirements: [...formData.movement_requirements, newRequirement],
    });
  };

  const removeMovementRequirement = (id: string) => {
    setFormData({
      ...formData,
      movement_requirements: formData.movement_requirements.filter(req => req.id !== id),
    });
  };

  const updateMovementRequirement = (id: string, updates: Partial<MovementRequirement>) => {
    setFormData({
      ...formData,
      movement_requirements: formData.movement_requirements.map(req =>
        req.id === id ? { ...req, ...updates } : req
      ),
    });
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/templates')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isCloneMode ? 'Clone Template' : id && id !== 'new' ? 'Edit Template' : 'Create Template'}
            </h1>
            <p className="text-zinc-400 mt-1">
              {isCloneMode ? 'Creating a copy of the template' : 'Configure the template metadata and preferences'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Advanced Strength + Cardio (30-35)"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Demographics */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Demographics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="age_range">Age Range</Label>
              <select
                id="age_range"
                value={formData.age_range}
                onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
                className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2"
              >
                {ageRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2"
              >
                {genders.map(g => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="fitness_level">Fitness Level</Label>
              <select
                id="fitness_level"
                value={formData.fitness_level}
                onChange={(e) => setFormData({ ...formData, fitness_level: e.target.value })}
                className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2"
              >
                {fitnessLevels.map(level => (
                  <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Schedule */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Training Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-3 block">Days Per Week</Label>
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 5, 6].map(day => (
                  <button
                    key={day}
                    onClick={() => setFormData({ ...formData, days_per_week: day })}
                    className={`w-12 h-12 rounded-lg border-2 transition-all font-semibold ${
                      formData.days_per_week === day
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="weeks_duration">Program Length (weeks)</Label>
              <select
                id="weeks_duration"
                value={formData.weeks_duration}
                onChange={(e) => setFormData({ ...formData, weeks_duration: parseInt(e.target.value) })}
                className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2"
              >
                {[2, 3, 4, 5, 6, 7, 8].map(weeks => (
                  <option key={weeks} value={weeks}>{weeks} weeks</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Training Includes */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Training Includes</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'includes_strength', label: 'Strength Training' },
              { key: 'includes_cardio', label: 'Cardio' },
              { key: 'includes_mobility', label: 'Mobility Work' },
              { key: 'includes_warmup', label: 'Warm-up' },
              { key: 'includes_cooldown', label: 'Cool-down / Stretching' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFormData({ ...formData, [key]: !formData[key as keyof TemplateFormData] })}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  formData[key as keyof TemplateFormData]
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* Goals */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Training Goals</h2>
          <div className="flex flex-wrap gap-2">
            {availableGoals.map(goal => (
              <button
                key={goal}
                onClick={() => setFormData({ ...formData, goals: toggleArrayValue(formData.goals, goal) })}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.goals.includes(goal)
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {goal.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </Card>

        {/* Equipment */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Equipment Needed</h2>
          <div className="flex flex-wrap gap-2">
            {availableEquipment.map(equipment => (
              <button
                key={equipment}
                onClick={() => setFormData({ ...formData, equipment_needed: toggleArrayValue(formData.equipment_needed, equipment) })}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.equipment_needed.includes(equipment)
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {equipment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </Card>

        {/* Program Type & Split Type */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Program Structure</h2>
          <div className="space-y-6">
            <div>
              <Label htmlFor="program_type">Program Type</Label>
              <select
                id="program_type"
                value={formData.program_type}
                onChange={(e) => setFormData({ ...formData, program_type: e.target.value })}
                className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2"
              >
                {programTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="split_type">Training Split</Label>
              <select
                id="split_type"
                value={formData.split_type}
                onChange={(e) => setFormData({ ...formData, split_type: e.target.value })}
                className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2"
              >
                {splitTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Movement Requirements */}
        <Card className="p-6 bg-zinc-900 border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Movement Pattern Requirements</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Define which movement patterns to include and their volume/intensity
              </p>
            </div>
            <Button
              onClick={addMovementRequirement}
              size="sm"
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Movement
            </Button>
          </div>

          {formData.movement_requirements.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No movement requirements added yet</p>
              <p className="text-sm mt-1">Click "Add Movement" to define your first movement pattern</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.movement_requirements.map((req, index) => (
                <div key={req.id} className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-zinc-400">Movement #{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMovementRequirement(req.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Movement Pattern */}
                    <div>
                      <Label className="text-xs">Movement Pattern *</Label>
                      <select
                        value={req.movement_pattern}
                        onChange={(e) => updateMovementRequirement(req.id, { movement_pattern: e.target.value })}
                        className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                      >
                        {movementPatterns.map(pattern => (
                          <option key={pattern} value={pattern}>
                            {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Frequency Per Week */}
                    <div>
                      <Label className="text-xs">Frequency (per week)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={7}
                        value={req.frequency_per_week}
                        onChange={(e) => updateMovementRequirement(req.id, { frequency_per_week: parseInt(e.target.value) || 1 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>

                    {/* Warmup Sets */}
                    <div>
                      <Label className="text-xs">Warmup Sets</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={req.warmup_sets}
                        onChange={(e) => updateMovementRequirement(req.id, { warmup_sets: parseInt(e.target.value) || 0 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>

                    {/* Warmup Reps */}
                    <div>
                      <Label className="text-xs">Warmup Reps</Label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={req.warmup_reps}
                        onChange={(e) => updateMovementRequirement(req.id, { warmup_reps: parseInt(e.target.value) || 0 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>

                    {/* Working Sets */}
                    <div>
                      <Label className="text-xs">Working Sets *</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={req.working_sets}
                        onChange={(e) => updateMovementRequirement(req.id, { working_sets: parseInt(e.target.value) || 1 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>

                    {/* Working Reps */}
                    <div>
                      <Label className="text-xs">Working Reps *</Label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={req.working_reps}
                        onChange={(e) => updateMovementRequirement(req.id, { working_reps: parseInt(e.target.value) || 1 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>

                    {/* Intensity */}
                    <div>
                      <Label className="text-xs">Intensity</Label>
                      <select
                        value={req.intensity_guideline}
                        onChange={(e) => updateMovementRequirement(req.id, { intensity_guideline: e.target.value })}
                        className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                      >
                        {intensityGuidelines.map(intensity => (
                          <option key={intensity} value={intensity}>
                            {intensity.replace('_', ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rest Seconds */}
                    <div>
                      <Label className="text-xs">Rest (seconds)</Label>
                      <Input
                        type="number"
                        min={30}
                        max={300}
                        step={15}
                        value={req.rest_seconds}
                        onChange={(e) => updateMovementRequirement(req.id, { rest_seconds: parseInt(e.target.value) || 60 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>

                    {/* Priority Order */}
                    <div>
                      <Label className="text-xs">Order in Workout</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={req.priority_order}
                        onChange={(e) => updateMovementRequirement(req.id, { priority_order: parseInt(e.target.value) || 1 })}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4">
                    <Label className="text-xs">Notes / Guidance</Label>
                    <Textarea
                      value={req.notes}
                      onChange={(e) => updateMovementRequirement(req.id, { notes: e.target.value })}
                      placeholder="e.g., Focus on depth and control, use squat variations that emphasize glutes..."
                      className="mt-1 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Save Button (bottom) */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/templates')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;

