import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Users, Calendar, Target, Dumbbell, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Template {
  id: string;
  name: string;
  days_per_week: number;
  notes: string | null;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  description: string | null;
  target_age_min: number | null;
  target_age_max: number | null;
  target_gender: string | null;
  fitness_level: string | null;
  goals: string[] | null;
  program_type: string | null;
  equipment_needed: string[] | null;
  tags: string[] | null;
}

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading templates",
        description: error.message,
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    toast({
      title: "Template Creation",
      description: "Visual template builder coming soon! For now, create templates using SQL files (see supabase_seed_interval_template.sql as an example).",
      variant: "default" as any,
    });
  };

  const getFitnessLevelColor = (level: string | null) => {
    if (!level) return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'advanced': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'elite': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('program_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Template deleted",
        description: "Template has been removed",
      });
      
      loadTemplates();
    } catch (error: any) {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive" as any,
      });
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Plan Templates</h1>
          <p className="text-zinc-400 mt-2">Create and manage workout plan templates for quick client setup</p>
        </div>
        <Button 
          onClick={handleCreateTemplate}
          className="bg-yellow-500 hover:bg-yellow-600 text-black"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
          <Target className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h2 className="text-2xl font-bold mb-2">No templates yet</h2>
          <p className="text-zinc-400 mb-6">Create your first template using SQL files (visual builder coming soon)</p>
          <Button 
            onClick={handleCreateTemplate}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <Plus className="w-5 h-5 mr-2" />
            Learn How to Create Templates
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="p-6 bg-zinc-900 border-zinc-800 hover:border-yellow-500/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-zinc-400 line-clamp-2">{template.description}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded ${template.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'}`}>
                  v{template.version}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                {/* Demographics */}
                {(template.target_age_min || template.target_gender || template.fitness_level) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-300">
                      {template.target_age_min && template.target_age_max && 
                        `${template.target_age_min}-${template.target_age_max} yrs`
                      }
                      {template.target_age_min && template.target_age_max && template.target_gender && ' • '}
                      {template.target_gender || 'any'}
                      {template.fitness_level && (
                        <>
                          {' • '}
                          <span className={`px-2 py-0.5 rounded text-xs border ${getFitnessLevelColor(template.fitness_level)}`}>
                            {template.fitness_level}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Schedule & Program Type */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-300">
                    {template.days_per_week}x/week
                    {template.program_type && ` • ${template.program_type}`}
                  </span>
                </div>

                {/* Goals */}
                {template.goals && template.goals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.goals.map((goal, idx) => (
                      <span key={idx} className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded border border-yellow-500/30">
                        {goal}
                      </span>
                    ))}
                  </div>
                )}

                {/* Equipment */}
                {template.equipment_needed && template.equipment_needed.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Dumbbell className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-300 text-xs">
                      {template.equipment_needed.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/templates/${template.id}`)}
                  className="flex-1"
                >
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/templates/${template.id}/clone`)}
                  className="flex-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Clone
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteTemplate(template.id)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;

