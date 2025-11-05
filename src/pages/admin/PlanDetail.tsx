import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { Pause, Check, Dumbbell, Activity, Gauge, Timer, Repeat, AlarmClock, Package, Move, Lightbulb, CircleDot, Trash2, StretchHorizontal, Loader2, RefreshCcw, Save, Send, Footprints, Upload, CheckCircle2, Bot, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { useSortable, SortableContext, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateHyroxWeek, clearDay as clearHyroxDay } from "@/services/generators/hyroxGenerator";
import AIAssistant from "@/components/AIAssistant";

interface Plan { id: string; name: string; cycle_days?: number; client_id?: string; }
interface PlanDay { id: string; day_index: number; label?: string; is_rest?: boolean; description?: string }
interface Exercise { id: string; name: string; modality?: string; primary_area?: string; pattern?: string; tags?: string | null; equipment?: string[] | null }
interface RenderedItem { id: string; name: string; modality?: string; item_order?: number }
interface GroupItem { id: string; name: string; modality?: string }
interface Group { 
  blockId: string; 
  sessionId: string; 
  title: string; 
  blockType: string; 
  collapsed?: boolean; 
  parameters?: any; 
  items: GroupItem[];
  rounds?: number | null;
  rest_between_rounds_s?: number | null;
  time_cap_sec?: number | null;
  work_sec?: number | null;
  rest_sec?: number | null;
  intensity?: string | null;
}

// Helper function to get default extra values based on exercise modality
function getDefaultExtraForModality(modality?: string): any {
  const mod = modality?.toLowerCase();
  
  if (mod === 'strength') {
    return { sets: 3, reps: 10, weight: 0, rest: 60 };
  } else if (mod === 'bodyweight') {
    return { sets: 3, reps: 10, rest: 60 };
  } else if (mod === 'cardio' || mod === 'running') {
    return { distance: 1 };
  } else if (mod === 'mobility' || mod === 'core') {
    return { sets: 0, reps: 0, duration: 0 };
  } else if (mod === 'rehab') {
    return { sets: 3, reps: 10, weight: 0, rest: 60 };
  } else if (mod === 'erg') {
    return { distance: 1 };
  } else {
    // Default for unknown types
    return { sets: 3, reps: 10, rest: 60 };
  }
}

const PlanDetail = () => {
  const { id } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingDayId, setSavingDayId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [trainingDaysSel, setTrainingDaysSel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<"all" | "w1" | "w2">("all");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState<string>("");
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [modalityFilter, setModalityFilter] = useState<string | null>(null);
  const { toast } = useToast();
  const [itemsByDay, setItemsByDay] = useState<Record<string, RenderedItem[]>>({});
  const [readyDays, setReadyDays] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ id: string; dayId: string; sets?: number | string; reps?: number | string; weight?: number | string; rest?: number | string; tempo?: string; duration?: number | string } | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [openMetcon, setOpenMetcon] = useState<boolean>(() => localStorage.getItem('ui.metconOpen') === '1');
  const [openIntervals, setOpenIntervals] = useState<boolean>(() => localStorage.getItem('ui.intervalsOpen') === '1');
  const [groupsByDay, setGroupsByDay] = useState<Record<string, Group[]>>({});
  const [sequenceByDay, setSequenceByDay] = useState<Record<string, Array<{ kind: 'group', group: Group } | { kind: 'item', item: RenderedItem }>>>({});
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [savingPlanName, setSavingPlanName] = useState<boolean>(false);
  const [planNameSaved, setPlanNameSaved] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [showCSVModal, setShowCSVModal] = useState<boolean>(false);
  const [showAIAssistant, setShowAIAssistant] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{
    show: boolean;
    logs: string[];
    currentRow: number;
    totalRows: number;
    pausedForMapping: boolean;
    unmappedExercise: string | null;
    suggestions: any[];
    showCreateNew: boolean;
    newExerciseModality: string;
  }>({
    show: false,
    logs: [],
    currentRow: 0,
    totalRows: 0,
    pausedForMapping: false,
    unmappedExercise: null,
    suggestions: [],
    showCreateNew: false,
    newExerciseModality: 'strength'
  });

  // Helper to add log to import progress
  const addImportLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📝';
    setImportProgress(prev => ({
      ...prev,
      logs: [...prev.logs, `${icon} ${message}`]
    }));
  };

  // Resolver to continue import after user maps/creates/skips an exercise
  const mappingResolverRef = useRef<null | ((result: { selectedExercise: { id: string; name: string; modality: string } | null }) => void)>(null);

  // Await mapping from user for a CSV exercise name; returns selected exercise id or null (skip)
  const waitForMapping = useCallback(async (
    csvName: string,
    dbExercises: Array<{ id: string; name: string; modality: string }>,
    levenshteinFn: (a: string, b: string) => number
  ): Promise<{ id: string; name: string; modality: string } | null> => {
    // Build suggestions (top 5 by Levenshtein <= 5)
    const searchName = csvName.toLowerCase().trim();
    const suggestions = dbExercises
      .map((e) => ({ exercise: e, distance: levenshteinFn(searchName, e.name.toLowerCase().trim()) }))
      .filter((m) => m.distance <= 5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map((m) => m.exercise);

    // Show modal and return a promise that resolves when user picks
    return new Promise((resolve) => {
      mappingResolverRef.current = (result) => {
        mappingResolverRef.current = null;
        resolve(result.selectedExercise);
      };
      setImportProgress((prev) => ({
        ...prev,
        pausedForMapping: true,
        unmappedExercise: csvName,
        suggestions,
        showCreateNew: false,
      }));
      addImportLog(`Mapping required for "${csvName}"`, "warning");
    });
  }, [addImportLog]);

  // Open/close editor and prefill values from DB 'extra' when available
  async function toggleEditorWithData(itemId: string, dayId: string, modality?: string) {
    // Close when already open
    if (editing?.id === itemId && editing.dayId === dayId) {
      setEditing(null);
      return;
    }
    try {
      const res = await supabase.from('session_block_items').select('extra').eq('id', itemId).single();
      const extra: any = (!res.error && res.data && (res.data as any).extra) ? (res.data as any).extra : {};
      const mod = (modality || '').toLowerCase();
      if (mod === 'strength') {
        setEditing({
          id: itemId,
          dayId,
          sets: typeof extra.sets === 'number' ? extra.sets : undefined,
          reps: typeof extra.reps === 'number' ? extra.reps : undefined,
          weight: typeof extra.weight_kg === 'number' ? extra.weight_kg : undefined,
          rest: typeof extra.rest_sec === 'number' ? extra.rest_sec : undefined,
          tempo: typeof extra.tempo === 'string' ? extra.tempo : undefined,
        });
        return;
      }
  if (mod === 'rehab') {
        setEditing({
          id: itemId,
          dayId,
          sets: typeof extra.sets === 'number' ? String(extra.sets) : '',
          reps: typeof extra.reps === 'number' ? String(extra.reps) : '',
          weight: typeof extra.weight === 'number' ? String(extra.weight) : '',
          duration: typeof extra.duration === 'number' ? String(extra.duration) : '',
          rest: typeof extra.rest === 'number' ? String(extra.rest) : '',
        });
        return;
      }
      if (mod === 'intervals' || mod === 'hiit' || mod === 'emom') {
        setEditing({
          id: itemId,
          dayId,
          sets: typeof extra.work_sec === 'number' ? extra.work_sec : undefined,
          reps: typeof extra.rest_sec === 'number' ? extra.rest_sec : undefined,
          weight: typeof extra.rounds === 'number' ? extra.rounds : undefined,
        });
        return;
      }
  if (mod === 'core') {
        setEditing({
          id: itemId,
          dayId,
          sets: typeof extra.sets === 'number' ? extra.sets : undefined,
          reps: typeof extra.reps === 'number' ? extra.reps : undefined,
          rest: typeof extra.duration === 'number' ? extra.duration : undefined,
        });
        return;
      }
      if (mod === 'carry') {
        // Carry shows weight (as a string like "102kg") and distance
        setEditing({
          id: itemId,
          dayId,
          sets: typeof extra.weight === 'string' ? extra.weight : (typeof extra.weight === 'number' ? String(extra.weight) : undefined), // weight as string or number
          weight: typeof extra.distance === 'number' ? extra.distance : undefined, // distance in km
        });
        return;
      }
      if (mod === 'mobility' || mod === 'skill' || mod === 'circuit') {
        setEditing({
          id: itemId,
          dayId,
          sets: typeof extra.sets === 'number' ? extra.sets : undefined,
          reps: typeof extra.reps === 'number' ? extra.reps : undefined,
        });
        return;
      }
      // Endurance/cardio-like
      setEditing({
        id: itemId,
        dayId,
        rest: typeof extra.duration === 'number' ? extra.duration : undefined,
        weight: typeof extra.distance === 'number' ? extra.distance : undefined,
        tempo: typeof extra.intensity === 'string' ? extra.intensity : undefined,
      });
    } catch {
      setEditing({ id: itemId, dayId });
    }
  }

  function EditorStrength(itId: string, dayId: string) {
    return (
      <div className="space-y-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
        {/* Quick Select Presets */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Quick Select</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditing({ ...editing!, sets: 3, reps: 10 })} className="px-4 py-2 rounded border border-zinc-700 hover:border-yellow-500 hover:bg-yellow-500/10 transition-colors text-sm">3×10</button>
            <button onClick={() => setEditing({ ...editing!, sets: 4, reps: 8 })} className="px-4 py-2 rounded border border-zinc-700 hover:border-yellow-500 hover:bg-yellow-500/10 transition-colors text-sm">4×8</button>
            <button onClick={() => setEditing({ ...editing!, sets: 5, reps: 5 })} className="px-4 py-2 rounded border border-zinc-700 hover:border-yellow-500 hover:bg-yellow-500/10 transition-colors text-sm">5×5</button>
            <button onClick={() => setEditing({ ...editing!, sets: 4, reps: 12 })} className="px-4 py-2 rounded border border-zinc-700 hover:border-yellow-500 hover:bg-yellow-500/10 transition-colors text-sm">4×12</button>
            <button onClick={() => setEditing({ ...editing!, sets: 3, reps: 15 })} className="px-4 py-2 rounded border border-zinc-700 hover:border-yellow-500 hover:bg-yellow-500/10 transition-colors text-sm">3×15</button>
          </div>
        </div>

        {/* Sets & Reps */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Sets</label>
            <input type="number" className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm focus:border-yellow-500 focus:outline-none" value={editing?.sets ?? ''} onChange={(e)=>setEditing({ ...editing!, sets: Number(e.target.value) })} placeholder="3" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Reps</label>
            <input type="number" className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm focus:border-yellow-500 focus:outline-none" value={editing?.reps ?? ''} onChange={(e)=>setEditing({ ...editing!, reps: Number(e.target.value) })} placeholder="10" />
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Weight (kg)</label>
          <div className="flex items-center gap-2">
            <button onClick={()=>setEditing({ ...editing!, weight: Math.max(0,Number(editing?.weight??0)-2.5) })} className="w-16 h-10 border border-zinc-700 rounded hover:border-yellow-500 hover:bg-yellow-500/10 transition-colors">-2.5</button>
            <input type="number" step="0.5" className="flex-1 h-10 bg-black border border-zinc-700 rounded px-3 text-sm text-center focus:border-yellow-500 focus:outline-none" value={editing?.weight ?? ''} onChange={(e)=>setEditing({ ...editing!, weight: Number(e.target.value) })} placeholder="7.5" />
            <button onClick={()=>setEditing({ ...editing!, weight: Number(editing?.weight??0)+2.5 })} className="w-16 h-10 border border-zinc-700 rounded hover:border-yellow-500 hover:bg-yellow-500/10 transition-colors">+2.5</button>
          </div>
        </div>

        {/* Rest & Tempo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Rest (seconds)</label>
            <select className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm focus:border-yellow-500 focus:outline-none" value={editing?.rest ?? 60} onChange={(e)=>setEditing({ ...editing!, rest: Number(e.target.value) })}>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
              <option value={120}>120s</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Tempo</label>
            <input className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm focus:border-yellow-500 focus:outline-none" placeholder="e.g. 3-1-1" value={editing?.tempo ?? ''} onChange={(e)=>setEditing({ ...editing!, tempo: e.target.value })} />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={async ()=>{
              try {
                const extra:any = { sets: editing?.sets, reps: editing?.reps, weight: editing?.weight, rest: editing?.rest, tempo: editing?.tempo };
                await supabase.from('session_block_items').update({ extra }).eq('id', itId);
                setEditing(null);
                await loadDayGroups(dayId);
                toast({ description: '✓ Saved' });
              } catch(e:any){ toast({ description: e?.message || 'Save failed', variant: 'destructive' as any}); }
            }}
            className="px-6 py-2 rounded border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors font-medium"
          >Save</button>
        </div>
      </div>
    );
  }

  function EditorEndurance(itId: string, dayId: string) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 max-w-full"><span>Duration (min)</span>
            <input type="number" className="w-14 h-8 bg-black border border-zinc-700 rounded px-1" value={editing?.rest ?? ''} onChange={(e)=>setEditing({ ...editing!, rest: Number(e.target.value) })} />
            {[10,20,30,45,60].map(m=> {
              const active = editing?.rest === m;
              return (
                <button key={m} onClick={()=>setEditing({ ...editing!, rest: m })} className={`w-14 h-8 inline-flex items-center justify-center rounded border ${active ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700'}`}>{m}</button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 max-w-full"><span>Distance (km)</span>
            <input type="number" step="0.1" className="w-14 h-8 bg-black border border-zinc-700 rounded px-1" value={editing?.weight ?? ''} onChange={(e)=>setEditing({ ...editing!, weight: Number(e.target.value) })} />
            {[1, 5, 10].map(d=> {
              const active = editing?.weight === d;
              return (
                <button key={d} onClick={()=>setEditing({ ...editing!, weight: d })} className={`w-14 h-8 inline-flex items-center justify-center rounded border ${active ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700'}`}>{d}</button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 max-w-full"><span>Intensity</span>
            {['Z2','Z3','Z4'].map(z => {
              const active = editing?.tempo === z;
              return (
                <button
                  key={z}
                  onClick={()=>setEditing({ ...editing!, tempo: z })}
                  className={`w-14 h-8 inline-flex items-center justify-center rounded border ${active ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700'}`}
                >{z}</button>
              );
            })}
          </div>
          <div className="ml-auto">
            <button
              onClick={async ()=>{
                try {
                  const extra:any = { duration: editing?.rest, distance: editing?.weight, intensity: editing?.tempo };
                  const { error } = await supabase.from('session_block_items').update({ extra }).eq('id', itId);
                  if (error) throw error;
                  setEditing(null); toast({ description: 'Saved' });
                } catch(e:any) {
                  toast({ description: e?.message || 'Save failed', variant: 'destructive' as any });
                }
              }}
              className="px-3 py-1 rounded border border-yellow-500 text-yellow-400"
            >Save</button>
          </div>
        </div>
      </div>
    );
  }

  function EditorIntervals(itId: string) {
    return (
      <div className="grid grid-cols-5 gap-2 items-center text-xs">
        <div className="flex items-center gap-2"><span>Work</span><input type="number" className="w-20 h-10 bg-black border border-zinc-700 rounded px-2" placeholder="sec" value={editing?.sets ?? ''} onChange={(e)=>setEditing({ ...editing!, sets: Number(e.target.value) })} /></div>
        <div className="flex items-center gap-2"><span>Rest</span><input type="number" className="w-20 h-10 bg-black border border-zinc-700 rounded px-2" placeholder="sec" value={editing?.reps ?? ''} onChange={(e)=>setEditing({ ...editing!, reps: Number(e.target.value) })} /></div>
        <div className="flex items-center gap-2"><span>Rounds</span><input type="number" className="w-20 h-10 bg-black border border-zinc-700 rounded px-2" value={editing?.weight ?? ''} onChange={(e)=>setEditing({ ...editing!, weight: Number(e.target.value) })} /></div>
        <div className="col-span-2 text-right">
          <button onClick={async ()=>{
            try {
              const extra:any={ work_sec: editing?.sets, rest_sec: editing?.reps, rounds: editing?.weight };
              const { error } = await supabase.from('session_block_items').update({ extra }).eq('id', itId);
              if (error) throw error;
              setEditing(null); toast({ description:'Saved'});
            } catch(e:any) {
              toast({ description: e?.message || 'Save failed', variant: 'destructive' as any });
            }
          }} className="px-3 py-1 rounded border border-yellow-500 text-yellow-400">Save</button>
        </div>
      </div>
    );
  }

  function EditorCarry(itId: string) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2"><span>Weight</span>
            <input type="text" className="w-24 h-8 bg-black border border-zinc-700 rounded px-2" placeholder="e.g. 102kg" value={editing?.sets ?? ''} onChange={(e)=>setEditing({ ...editing!, sets: e.target.value as any })} />
          </div>
          <div className="flex items-center gap-2"><span>Distance (km)</span>
            <input type="number" step="0.001" className="w-20 h-8 bg-black border border-zinc-700 rounded px-2" value={editing?.weight ?? ''} onChange={(e)=>setEditing({ ...editing!, weight: Number(e.target.value) })} />
          </div>
          <div className="ml-auto">
            <button
              onClick={async ()=>{
                try {
                  const extra:any = { weight: editing?.sets, distance: editing?.weight }; // weight as string, distance as number
                  const { error } = await supabase.from('session_block_items').update({ extra }).eq('id', itId);
                  if (error) throw error;
                  setEditing(null); toast({ description: 'Saved' });
                } catch(e:any) {
                  toast({ description: e?.message || 'Save failed', variant: 'destructive' as any });
                }
              }}
              className="px-3 py-1 rounded border border-yellow-500 text-yellow-400"
            >Save</button>
          </div>
        </div>
      </div>
    );
  }

  function EditorAccessory(itId: string) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2"><span>Sets</span>
            <input type="number" className="w-14 h-8 bg-black border border-zinc-700 rounded px-1" value={editing?.sets ?? ''} onChange={(e)=>setEditing({ ...editing!, sets: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2"><span>Reps</span>
            <input type="number" className="w-14 h-8 bg-black border border-zinc-700 rounded px-1" value={editing?.reps ?? ''} onChange={(e)=>setEditing({ ...editing!, reps: Number(e.target.value) })} />
          </div>
          <div className="ml-auto">
            <button
              onClick={async ()=>{
                try {
                  const extra:any = { sets: editing?.sets, reps: editing?.reps };
                  const { error } = await supabase.from('session_block_items').update({ extra }).eq('id', itId);
                  if (error) throw error;
                  setEditing(null); toast({ description: 'Saved' });
                } catch(e:any) {
                  toast({ description: e?.message || 'Save failed', variant: 'destructive' as any });
                }
              }}
              className="px-3 py-1 rounded border border-yellow-500 text-yellow-400"
            >Save</button>
          </div>
        </div>
      </div>
    );
  }

  function EditorCore(itId: string) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2"><span>Sets</span>
            <input type="number" className="w-14 h-8 bg-black border border-zinc-700 rounded px-1" value={editing?.sets ?? ''} onChange={(e)=>setEditing({ ...editing!, sets: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2"><span>Reps</span>
            <input type="number" className="w-14 h-8 bg-black border border-zinc-700 rounded px-1" value={editing?.reps ?? ''} onChange={(e)=>setEditing({ ...editing!, reps: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2"><span>Duration (min)</span>
            <input type="number" className="w-14 h-8 bg-black border border-zinc-700 rounded px-1" value={editing?.rest ?? ''} onChange={(e)=>setEditing({ ...editing!, rest: Number(e.target.value) })} />
          </div>
          <div className="ml-auto">
            <button
              onClick={async ()=>{
                try {
                  const extra:any = { sets: editing?.sets, reps: editing?.reps, duration: editing?.rest };
                  const { error } = await supabase.from('session_block_items').update({ extra }).eq('id', itId);
                  if (error) throw error;
                  setEditing(null); toast({ description: 'Saved' });
                } catch(e:any) {
                  toast({ description: e?.message || 'Save failed', variant: 'destructive' as any });
                }
              }}
              className="px-3 py-1 rounded border border-yellow-500 text-yellow-400"
            >Save</button>
          </div>
        </div>
      </div>
    );
  }

  function EditorRehab(itId: string, dayId: string) {
    // Use local refs to avoid re-renders on every keystroke
    const setsRef = React.useRef<HTMLInputElement>(null);
    const repsRef = React.useRef<HTMLInputElement>(null);
    const weightRef = React.useRef<HTMLInputElement>(null);
    const durationRef = React.useRef<HTMLInputElement>(null);
    
    return (
      <div className="space-y-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Sets</label>
            <input 
              ref={setsRef}
              type="number" 
              className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm" 
              defaultValue={editing?.sets ?? ''} 
              placeholder="3" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Reps</label>
            <input 
              ref={repsRef}
              type="number" 
              className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm" 
              defaultValue={editing?.reps ?? ''} 
              placeholder="10" 
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Weight (kg)</label>
            <input 
              ref={weightRef}
              type="number" 
              step="0.5" 
              className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm" 
              defaultValue={editing?.weight ?? ''} 
              placeholder="0" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Duration (min)</label>
            <input 
              ref={durationRef}
              type="number" 
              className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm" 
              defaultValue={editing?.duration ?? ''} 
              placeholder="5" 
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={async ()=>{
              try {
                const extra:any = { 
                  sets: setsRef.current?.value ? Number(setsRef.current.value) : undefined, 
                  reps: repsRef.current?.value ? Number(repsRef.current.value) : undefined, 
                  weight: weightRef.current?.value ? Number(weightRef.current.value) : undefined, 
                  duration: durationRef.current?.value ? Number(durationRef.current.value) : undefined, 
                  rest: editing?.rest ? Number(editing.rest) : undefined 
                };
                await supabase.from('session_block_items').update({ extra }).eq('id', itId);
                setEditing(null);
                await loadDayGroups(dayId);
                toast({ description: '✓ Saved' });
              } catch(e:any){ toast({ description: e?.message || 'Save failed', variant: 'destructive' as any}); }
            }}
            className="px-6 py-2 rounded border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black transition-colors font-medium"
          >Save</button>
        </div>
      </div>
    );
  }


  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const planRes = await supabase.from("plans").select("id,name,cycle_days").eq("id", id).single();
        if (planRes.error) throw planRes.error;
        setPlan({ id: String(planRes.data.id), name: planRes.data.name, cycle_days: planRes.data.cycle_days });

        const daysRes = await supabase
          .from("plan_days")
          .select("id,day_index,label,is_rest,description")
          .eq("plan_id", id)
          .order("day_index", { ascending: true });
        if (daysRes.error) throw daysRes.error;
        setDays((daysRes.data || []).map((d: any) => ({ id: String(d.id), day_index: d.day_index, label: d.label, is_rest: d.is_rest, description: d.description })));

        // Try to load a small exercise list for the library (ignore error if table missing)
        const exRes = await supabase
          .from("exercises")
          .select("id,name,modality,primary_area,pattern,tags,equipment")
          .order("name")
          .limit(1000);
        if (!exRes.error && exRes.data) {
          setExercises(
            exRes.data.map((e: any) => ({
              id: String(e.id),
              name: e.name,
              modality: e.modality,
              primary_area: e.primary_area,
              pattern: e.pattern,
              tags: e.tags,
              equipment: e.equipment || null,
            }))
          );
        }

        // Optionally load existing items per day (best effort)
        await Promise.all(
          (daysRes.data || []).map(async (d: any) => {
            const dayId = String(d.id);
            try {
              await loadDayGroups(dayId);
            } catch {}
          })
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load plan");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const filteredDays = useMemo(() => {
    if (week === "all") return days;
    if (week === "w1") return days.filter((d) => d.day_index < 7);
    return days.filter((d) => d.day_index >= 7);
  }, [days, week]);
  
  // Auto-select first day when days load
  useEffect(() => {
    if (!selectedDayId && filteredDays.length > 0) {
      setSelectedDayId(filteredDays[0].id);
      console.log('🎯 Auto-selected first day:', filteredDays[0].label || `Day ${filteredDays[0].day_index + 1}`);
    }
  }, [filteredDays, selectedDayId]);

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...exercises];
    
    // Apply modality filter first
    if (modalityFilter) {
      list = list.filter((e) => (e.modality || "").toLowerCase() === modalityFilter);
    }
    
    // If no search query, return the filtered list
    if (!q) return list;
    
    // Apply search filter
    return list.filter((e) => {
      const haystack = [
        e.name || "",
        e.modality || "",
        e.primary_area || "",
        e.pattern || "",
        e.tags || "",
        (e.equipment || []).join(","),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [exercises, search, modalityFilter]);

  const modalityChips = useMemo(() => {
    const present = new Set<string>();
    exercises.forEach((e) => e.modality && present.add((e.modality as string).toLowerCase()));
    const baseOrder = [
      "running",
      "cardio",
      "carry",
      "core",
      "erg",
      "mobility",
      "rehab",
      "strength",
      "circuit",
      "intervals",
      "hiit",
      "emom",
    ];
    // Always show 'running'; show others only if present
    return baseOrder.filter((m) => m === "running" || present.has(m));
  }, [exercises]);


  function modalityStyle(mod?: string) {
    const m = (mod || '').toLowerCase();
    switch (m) {
      case 'strength':
        return { chip: 'border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-500/15', Icon: Dumbbell };
      case 'cardio':
        return { chip: 'border-rose-500/40 text-rose-300 bg-rose-500/15', Icon: Activity };
      case 'erg':
        return { chip: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/15', Icon: Gauge };
      case 'running':
        return { chip: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/15', Icon: Footprints };
      case 'core':
        return { chip: 'border-purple-500/40 text-purple-300 bg-purple-500/15', Icon: CircleDot };
      case 'mobility':
        return { chip: 'border-teal-500/40 text-teal-300 bg-teal-500/15', Icon: StretchHorizontal };
      case 'rehab':
        return { chip: 'border-blue-500/40 text-blue-300 bg-blue-500/15', Icon: Activity };
      case 'skill':
        return { chip: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/15', Icon: Lightbulb };
      case 'carry':
        return { chip: 'border-amber-500/40 text-amber-300 bg-amber-500/15', Icon: Package };
      case 'circuit':
        return { chip: 'border-yellow-500/40 text-yellow-300 bg-yellow-500/15', Icon: Repeat };
      case 'intervals':
      case 'hiit':
        return { chip: 'border-orange-500/40 text-orange-300 bg-orange-500/15', Icon: Timer };
      case 'emom':
        return { chip: 'border-violet-500/40 text-violet-300 bg-violet-500/15', Icon: AlarmClock };
      default:
        return { chip: 'border-zinc-700 text-zinc-300 bg-zinc-800/50', Icon: CircleDot };
    }
  }

  // DnD helpers
  const DraggableLibItem = ({ ex }: { ex: Exercise }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: `lib:${ex.id}`, data: ex });
    const { chip, Icon } = modalityStyle(ex.modality);
    return (
      <div ref={setNodeRef} {...listeners} {...attributes} className="py-2 cursor-grab active:cursor-grabbing select-none">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">{ex.name}</div>
            <div className="text-xs text-zinc-400">{ex.modality} · {ex.primary_area} · {ex.pattern}</div>
          </div>
          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border ${chip}`}>
            <Icon className="w-3 h-3" /> {ex.modality || 'na'}
          </span>
        </div>
      </div>
    );
  };

  const DroppableZone = ({ id, label, children }: { id: string; label: string; children?: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
      <div ref={setNodeRef} className={`border rounded-md p-3 min-h-[80px] ${isOver ? 'border-yellow-500' : 'border-zinc-800'}`}>
        <div className="text-xs text-zinc-400 mb-1">{label}</div>
        {children}
      </div>
    );
  };
  const GroupInnerDrop = ({ id, children }: { id: string; children?: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
      <div ref={setNodeRef} className={`border border-dashed rounded p-2 ${isOver ? 'border-yellow-500 bg-slate-700/40' : 'border-slate-500/70'}`}>
        {children}
      </div>
    );
  };

  const InlineRootDrop = ({ id }: { id: string }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
      <div ref={setNodeRef} className={`my-1 h-3 rounded ${isOver ? 'bg-yellow-500/30' : 'bg-transparent'}`}></div>
    );
  };

  const CompactItemRow = React.memo(({ sid, it, dayId, chip, Icon, editing, toggleEditorWithData, removeItem, EditorStrength, EditorEndurance, EditorIntervals, EditorAccessory, EditorRehab, EditorCarry }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sid });
    const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
    const [sets, setSets] = useState<number>(3);
    const [reps, setReps] = useState<number>(10);
    const [weight, setWeight] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [durationInput, setDurationInput] = useState<string>(''); // String for input display
    const [distance, setDistance] = useState<number>(1000);
    const [intensity, setIntensity] = useState<string>('Z2');
    const [loading, setLoading] = useState(false);
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const hasLoadedRef = React.useRef<string | null>(null);

    // Load existing values from DB on mount (only once per exercise ID)
    useEffect(() => {
      console.log('🔍 useEffect running for:', it.name, { 
        exerciseId: it.id, 
        alreadyLoaded: hasLoadedRef.current === it.id 
      });
      
      // Skip if we've already loaded this exercise
      if (hasLoadedRef.current === it.id) {
        console.log('⏭️ Skipping load (already loaded):', it.name);
        return;
      }
      
      const loadValues = async () => {
        console.log('📥 Loading data for:', it.name);
        setLoading(true);
        try {
          const res = await supabase.from('session_block_items').select('extra').eq('id', it.id).single();
          if (!res.error && res.data?.extra) {
            const extra = res.data.extra as any;
            console.log('✅ Loaded data:', it.name, extra);
            setSets(extra.sets ?? 3);
            setReps(extra.reps ?? 10);
            // For carry and bodyweight, weight is a string (e.g. "102kg", "6kg")
            if (it.modality === 'carry' || it.modality === 'bodyweight') {
              setWeight(extra.weight ?? '');
              setDistance((extra.distance ?? 0) * 1000); // convert km to meters for display
            } else {
              setWeight(extra.weight ?? 0);
              setDistance(extra.distance ?? 1);
            }
            const loadedDuration = extra.duration ?? 0;
            setDuration(loadedDuration);
            setDurationInput(loadedDuration === 0 ? '' : String(loadedDuration));
            setIntensity(extra.intensity ?? 'Z2');
          }
          hasLoadedRef.current = it.id;
        } catch (e) {
          console.error('Failed to load exercise data:', e);
        } finally {
          setLoading(false);
        }
      };
      loadValues();
    }, [it.id, it.name]);

    // Debounced save function - saves 500ms after user stops typing
    const debouncedSave = React.useCallback((newSets: number, newReps: number, newWeight: number, newDuration?: number, newDistance?: number, newIntensity?: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          let extra: any;
          
          // For cardio/running/erg exercises
          if (['cardio', 'running', 'erg'].includes(it.modality)) {
            extra = { 
              duration: newDuration ?? duration, 
              distance: newDistance ?? distance, 
              intensity: newIntensity ?? intensity 
            };
          }
          // For mobility/core/skill/carry/circuit, save sets, reps, and duration
          else if (['mobility', 'core', 'skill', 'carry', 'circuit'].includes(it.modality)) {
            extra = { 
              sets: newSets, 
              reps: newReps, 
              duration: newDuration ?? duration 
            };
          }
          // For strength exercises
          else {
            extra = { sets: newSets, reps: newReps, weight: newWeight };
          }
          
          console.log('💾 Saving to DB:', it.name, { itemId: it.id, extra });
          const result = await supabase.from('session_block_items').update({ extra }).eq('id', it.id);
          if (result.error) {
            console.error('❌ Save failed:', result.error);
          } else {
            console.log('✅ Saved successfully:', it.name);
          }
        } catch (e) {
          console.error('Failed to save:', e);
        }
      }, 500);
    }, [it.id, it.modality, duration, distance, intensity]);

    const handleSetsChange = (val: number) => {
      console.log('✏️ Sets changed:', it.name, val);
      setSets(val);
      debouncedSave(val, reps, weight);
    };

    const handleRepsChange = (val: number) => {
      console.log('✏️ Reps changed:', it.name, val);
      setReps(val);
      debouncedSave(sets, val, weight);
    };

    const handleWeightChange = (val: number) => {
      console.log('✏️ Weight changed:', it.name, val);
      setWeight(val);
      debouncedSave(sets, reps, val);
    };

    // Prevent auto-scroll when input gets focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.target.select();
    };

    const handleDurationChange = (val: number) => {
      console.log('✏️ Duration changed:', it.name, val);
      setDuration(val);
      debouncedSave(sets, reps, weight, val, distance, intensity);
    };

    // Prevent non-numeric input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      if ([8, 9, 27, 13, 37, 38, 39, 40, 46].includes(e.keyCode)) {
        return;
      }
      // Allow: Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
        return;
      }
      // Allow decimal point for weight field
      if (e.key === '.' || e.key === ',') {
        return;
      }
      // Block if not a number
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    };

    const handleDistanceChange = (val: number) => {
      console.log('✏️ Distance changed:', it.name, val);
      setDistance(val);
      debouncedSave(sets, reps, weight, duration, val, intensity);
    };

    const handleIntensityChange = (val: string) => {
      console.log('✏️ Intensity changed:', it.name, val);
      setIntensity(val);
      debouncedSave(sets, reps, weight, duration, distance, val);
    };

    return (
      <div ref={setNodeRef} style={style} className={`w-full text-xs px-2 py-2 rounded border ${chip}`}>
        {/* First line: Exercise name and controls */}
        <div className="flex items-start w-full pr-4">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span title="Drag to reorder" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-yellow-500 flex-shrink-0 mt-1">
              <Move className="w-5 h-5" />
            </span>
            <Icon className="w-4 h-4 flex-shrink-0 mt-1" />
            <span className="break-words leading-snug text-sm font-medium">{it.name}</span>
          </div>
          
          <div className="inline-flex items-start gap-1.5 flex-shrink-0 ml-2">
            {/* Only show Edit button for exercises that need advanced fields */}
            {!['strength', 'mobility', 'core', 'skill', 'carry', 'circuit', 'cardio', 'running', 'erg'].includes(it.modality) && (
              <button onClick={() => toggleEditorWithData(it.id, dayId, it.modality)} className="text-xs underline opacity-80 hover:opacity-100 whitespace-nowrap">Edit</button>
            )}
            <button onClick={()=>removeItem(it.id, dayId)} className="opacity-70 hover:opacity-100" title="Delete exercise"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        
        {/* Second line: Inline inputs for strength exercises (sets, reps, kg) */}
        {it.modality === 'strength' && !loading && (
          <div className="flex items-center justify-end gap-3 mt-2 pr-3">
              <div className="inline-flex items-center gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">Sets</label>
                <input 
                  type="number" 
                  value={sets === 0 ? '' : sets}
                  onChange={(e) => handleSetsChange(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={handleKeyDown}
                  className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                  min="1"
                  placeholder="0"
                />
              </div>
              <div className="inline-flex items-center gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">Reps</label>
                <input 
                  type="number" 
                  value={reps === 0 ? '' : reps}
                  onChange={(e) => handleRepsChange(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={handleKeyDown}
                  className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                  min="1"
                  placeholder="0"
                />
              </div>
              <div className="inline-flex items-center gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">kg</label>
                <input 
                  type="number" 
                  value={weight === 0 ? '' : weight}
                  onChange={(e) => handleWeightChange(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={handleKeyDown}
                  className="w-16 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                  min="0"
                  step="0.5"
                  placeholder="0"
                />
              </div>
          </div>
        )}
        
        {/* Second line: Inline inputs for bodyweight (sets, reps, distance, weight text) */}
        {it.modality === 'bodyweight' && !loading && (
          <div className="flex items-center justify-end gap-3 mt-2 pr-3 flex-wrap">
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Sets</label>
              <input 
                type="number" 
                value={sets === 0 ? '' : sets}
                onChange={(e) => handleSetsChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="1"
                placeholder="0"
              />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Reps</label>
              <input 
                type="number" 
                value={reps === 0 ? '' : reps}
                onChange={(e) => handleRepsChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="1"
                placeholder="0"
              />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Distance (m)</label>
              <input 
                type="number"
                step="1"
                value={distance || ''}
                onChange={(e) => {
                  const meters = Number(e.target.value) || 0;
                  setDistance(meters);
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = setTimeout(async () => {
                    try {
                      await supabase.from('session_block_items').update({ 
                        extra: { sets, reps, distance: meters / 1000, weight } 
                      }).eq('id', it.id);
                    } catch (e) {
                      console.error('Failed to save bodyweight data:', e);
                    }
                  }, 500);
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-20 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="0"
                placeholder="m"
              />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Weight</label>
              <input 
                type="text"
                value={weight || ''}
                onChange={(e) => setWeight(e.target.value as any)}
                onBlur={() => {
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = setTimeout(async () => {
                    try {
                      await supabase.from('session_block_items').update({ 
                        extra: { sets, reps, distance: distance / 1000, weight } 
                      }).eq('id', it.id);
                    } catch (e) {
                      console.error('Failed to save bodyweight data:', e);
                    }
                  }, 500);
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-24 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                placeholder="e.g. 6kg"
              />
            </div>
          </div>
        )}
        
        {/* Second line: Inline inputs for mobility and core (sets, reps, duration) */}
        {(it.modality === 'mobility' || it.modality === 'core') && !loading && (
          <div className="flex items-center justify-end gap-3 mt-2 pr-3">
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Sets</label>
              <input 
                type="number" 
                value={sets === 0 ? '' : sets}
                onChange={(e) => handleSetsChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="1"
                placeholder="0"
              />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Reps</label>
              <input 
                type="number" 
                value={reps === 0 ? '' : reps}
                onChange={(e) => handleRepsChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="1"
                placeholder="0"
              />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">min</label>
              <input 
                type="text"
                inputMode="decimal"
                value={durationInput}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow empty, numbers, and one decimal point while typing
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setDurationInput(val);
                    // Only update duration state if it's a complete valid number
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      handleDurationChange(num);
                    } else if (val === '') {
                      handleDurationChange(0);
                    }
                  }
                }}
                onBlur={(e) => {
                  // Clean up on blur - ensure valid number
                  const val = e.target.value;
                  const num = parseFloat(val);
                  if (!isNaN(num) && num >= 0) {
                    setDurationInput(num === 0 ? '' : String(num));
                    handleDurationChange(num);
                  } else {
                    setDurationInput('');
                    handleDurationChange(0);
                  }
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>
        )}
        
        {/* Second line: Inline inputs for skill/circuit (sets, reps only) */}
        {['skill', 'circuit'].includes(it.modality) && !loading && (
          <div className="flex items-center justify-end gap-3 mt-2 pr-3">
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Sets</label>
              <input 
                type="number" 
                value={sets === 0 ? '' : sets}
                onChange={(e) => handleSetsChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="1"
                placeholder="0"
              />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Reps</label>
              <input 
                type="number" 
                value={reps === 0 ? '' : reps}
                onChange={(e) => handleRepsChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="1"
                placeholder="0"
              />
            </div>
          </div>
        )}
        
        {/* Second line: Inline inputs for cardio (duration only - no distance) */}
        {it.modality === 'cardio' && !loading && (
          <div className="flex items-center justify-end gap-3 mt-2 pr-3 flex-wrap">
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">min</label>
              <input 
                type="text"
                inputMode="decimal"
                value={durationInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setDurationInput(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      handleDurationChange(num);
                    } else if (val === '') {
                      handleDurationChange(0);
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  const num = parseFloat(val);
                  if (!isNaN(num) && num >= 0) {
                    setDurationInput(num === 0 ? '' : String(num));
                    handleDurationChange(num);
                  } else {
                    setDurationInput('');
                    handleDurationChange(0);
                  }
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div className="inline-flex items-center gap-1">
              {['Z2', 'Z3', 'Z4'].map((zone) => (
                <button
                  key={zone}
                  onClick={() => handleIntensityChange(zone)}
                  className={`h-9 px-2 rounded text-sm font-medium transition-colors ${
                    intensity === zone 
                      ? 'bg-yellow-500 text-black border-2 border-yellow-500' 
                      : 'bg-black text-zinc-400 border-2 border-zinc-700 hover:border-yellow-500'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Second line: Inline inputs for carry (weight, distance) */}
        {it.modality === 'carry' && !loading && (
          <div className="flex items-center justify-end gap-3 mt-2 pr-3 flex-wrap">
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Weight</label>
              <input 
                type="text"
                value={weight || ''}
                onChange={(e) => setWeight(e.target.value as any)}
                onBlur={() => {
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = setTimeout(async () => {
                    try {
                      await supabase.from('session_block_items').update({ 
                        extra: { weight, distance } 
                      }).eq('id', it.id);
                    } catch (e) {
                      console.error('Failed to save carry data:', e);
                    }
                  }, 500);
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-24 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                placeholder="e.g. 102kg"
              />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Distance (m)</label>
              <input 
                type="number"
                step="1"
                value={distance || ''}
                onChange={(e) => {
                  const meters = Number(e.target.value) || 0;
                  setDistance(meters);
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = setTimeout(async () => {
                    try {
                      await supabase.from('session_block_items').update({ 
                        extra: { weight, distance: meters / 1000 } // store as km
                      }).eq('id', it.id);
                    } catch (e) {
                      console.error('Failed to save carry data:', e);
                    }
                  }, 500);
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-20 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="0"
                placeholder="m"
              />
            </div>
          </div>
        )}
        
        {/* Second line: Inline inputs for running/erg (duration, distance, zone buttons) */}
        {['running', 'erg'].includes(it.modality) && !loading && (
          <div className="flex items-center justify-end gap-3 mt-2 pr-3 flex-wrap">
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">min</label>
              <input 
                type="text"
                inputMode="decimal"
                value={durationInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setDurationInput(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      handleDurationChange(num);
                    } else if (val === '') {
                      handleDurationChange(0);
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  const num = parseFloat(val);
                  if (!isNaN(num) && num >= 0) {
                    setDurationInput(num === 0 ? '' : String(num));
                    handleDurationChange(num);
                  } else {
                    setDurationInput('');
                    handleDurationChange(0);
                  }
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-14 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">km</label>
              <input 
                type="number"
                step="0.1"
                value={distance === 0 ? '' : distance}
                onChange={(e) => handleDistanceChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleKeyDown}
                className="w-16 h-9 bg-black border border-zinc-700 rounded px-2 text-center text-sm focus:border-yellow-500 focus:outline-none"
                min="0"
                placeholder="0"
              />
            </div>
            <div className="inline-flex items-center gap-1">
              {['Z2', 'Z3', 'Z4'].map((zone) => (
                <button
                  key={zone}
                  onClick={() => handleIntensityChange(zone)}
                  className={`h-9 px-2 rounded text-sm font-medium transition-colors ${
                    intensity === zone 
                      ? 'bg-yellow-500 text-black border-2 border-yellow-500' 
                      : 'bg-black text-zinc-400 border-2 border-zinc-700 hover:border-yellow-500'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {editing?.id === it.id && editing.dayId === dayId && (
          <div className="mt-2 bg-black/30 rounded-md p-2 border border-zinc-800">
            {it.modality === 'strength' ? EditorStrength(it.id, dayId) : null}
            {it.modality === 'rehab' ? EditorRehab(it.id, dayId) : null}
            {it.modality === 'running' || it.modality === 'cardio' || it.modality === 'erg' ? EditorEndurance(it.id, dayId) : null}
            {it.modality === 'intervals' || it.modality === 'hiit' || it.modality === 'emom' ? EditorIntervals(it.id) : null}
            {it.modality === 'core' ? EditorCore(it.id) : null}
            {it.modality === 'carry' ? EditorCarry(it.id) : null}
            {it.modality === 'mobility' || it.modality === 'skill' || it.modality === 'circuit' ? EditorAccessory(it.id) : null}
          </div>
        )}
      </div>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison: IGNORE function props (they always change but we don't care)
    // Only check data props that actually matter
    const shouldSkipRender = (
      prevProps.sid === nextProps.sid &&
      prevProps.it.id === nextProps.it.id &&
      prevProps.it.name === nextProps.it.name &&
      prevProps.it.modality === nextProps.it.modality &&
      prevProps.dayId === nextProps.dayId &&
      prevProps.editing?.id === nextProps.editing?.id &&
      prevProps.editing?.dayId === nextProps.editing?.dayId &&
      prevProps.chip === nextProps.chip
    );
    
    if (!shouldSkipRender) {
      console.log('🔁 CompactItemRow MEMO: Re-rendering', nextProps.it.name, {
        sidChanged: prevProps.sid !== nextProps.sid,
        idChanged: prevProps.it.id !== nextProps.it.id,
        nameChanged: prevProps.it.name !== nextProps.it.name,
        modalityChanged: prevProps.it.modality !== nextProps.it.modality,
        dayIdChanged: prevProps.dayId !== nextProps.dayId,
        editingIdChanged: prevProps.editing?.id !== nextProps.editing?.id,
        editingDayIdChanged: prevProps.editing?.dayId !== nextProps.editing?.dayId,
        chipChanged: prevProps.chip !== nextProps.chip
      });
    }
    
    return shouldSkipRender;
  });

  async function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id as string | undefined;
    const activeId = event.active?.id as string | undefined;
    
    if (!overId || !activeId) return;
    // Find group and index containing a given item id
    const findGroupByItem = (dayId:string, itemId:string) => {
      const gs = groupsByDay[dayId] || [];
      for (const g of gs) {
        const idx = (g.items || []).findIndex(it => it.id === itemId);
        if (idx >= 0) return { group: g, index: idx };
      }
      return { group: undefined as any, index: -1 };
    };
    // Reorder/move when dragging existing item over another item
    if (activeId.startsWith('item:') && overId.startsWith('item:')) {
      const [, activeItemId, dayIdA] = activeId.split(':');
      const [, overItemId, dayIdB] = overId.split(':');
      if (dayIdA !== dayIdB) return;
      
      const { group: srcG, index: srcIdx } = findGroupByItem(dayIdA, activeItemId);
      const { group: dstG, index: dstIdx } = findGroupByItem(dayIdA, overItemId);
      
      // If both items are in groups, handle group reordering
      if (dstG && dstIdx >= 0) {
        try {
          if (srcG && srcG.blockId === dstG.blockId) {
            // Reorder within same block using item_order
            if (srcIdx === dstIdx) return;
            const items = [...(srcG.items || [])];
            const moved = items.splice(srcIdx, 1)[0];
            items.splice(dstIdx, 0, moved);
            await Promise.all(items.map((it, idx) => supabase.from('session_block_items').update({ item_order: idx }).eq('id', it.id)));
            await loadDayGroups(dayIdA);
          } else {
            // Move across blocks: change block_id and append to end
            const maxOrder = Math.max(0, ...(dstG.items || []).map((it:any) => it.item_order || 0));
            await supabase.from('session_block_items').update({ block_id: dstG.blockId, item_order: maxOrder + 1 }).eq('id', activeItemId);
            await loadDayGroups(dayIdA);
          }
        } catch(e) {
          console.error('Move failed:', e);
        }
        return;
      }
      
      // If both items are standalone (not in groups), reorder standalone items
      if (!srcG && !dstG) {
        try {
          console.log('🔧 Reordering standalone items:', { activeItemId, overItemId, dayIdA });
          
          const standaloneItems = itemsByDay[dayIdA] || [];
          const fromIdx = standaloneItems.findIndex(it => it.id === activeItemId);
          const toIdx = standaloneItems.findIndex(it => it.id === overItemId);
          
          console.log('🔧 Found indices:', { fromIdx, toIdx, totalItems: standaloneItems.length });
          
          if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) {
            console.log('🔧 Skipping reorder - invalid indices');
            return;
          }
          
          // Reorder in memory
          const reordered = arrayMove(standaloneItems, fromIdx, toIdx);
          setItemsByDay(prev => ({ ...prev, [dayIdA]: reordered }));
          
          console.log('🔧 New order:', reordered.map((it, idx) => ({ idx, id: it.id, name: it.name })));
          
          // All exercises are in ONE session with multiple blocks
          // We need to move each block to its own session with the correct order_index
          
          console.log('🔧 Moving each block to its own session with correct order...');
          
          const oldSessionIds = new Set<string>();
          
          // Track sessions with multiple blocks to delete later
          const { data: allSessions } = await supabase
            .from('sessions')
            .select('id, session_blocks(id)')
            .eq('plan_day_id', dayIdA);
          
          if (allSessions) {
            for (const session of allSessions) {
              const blocks = (session as any).session_blocks || [];
              if (blocks.length > 1) {
                console.log(`🔧 Found old session with ${blocks.length} blocks, marking for deletion`);
                oldSessionIds.add(session.id);
              }
            }
          }
          
          for (let idx = 0; idx < reordered.length; idx++) {
            const item = reordered[idx];
            
            // Get the block_id for this item
            const { data: itemData } = await supabase
              .from('session_block_items')
              .select('block_id')
              .eq('id', item.id)
              .single();
            
            if (!itemData?.block_id) continue;
            
            // Get the current session for this block
            const { data: blockData } = await supabase
              .from('session_blocks')
              .select('session_id, block_type, title')
              .eq('id', itemData.block_id)
              .single();
            
            if (!blockData?.session_id) continue;
            
            // Check if this block is already in its own session
            const { data: sessionBlocks } = await supabase
              .from('session_blocks')
              .select('id')
              .eq('session_id', blockData.session_id);
            
            // If the session has multiple blocks, we need to move this block to a new session
            if (sessionBlocks && sessionBlocks.length > 1) {
              oldSessionIds.add(blockData.session_id); // Track old session for cleanup
              
              // Create a new session for this block
              const { data: newSession } = await supabase
                .from('sessions')
                .insert({
                  plan_day_id: dayIdA,
                  name: blockData.title || 'Exercise',
                  order_index: idx
                })
                .select('id')
                .single();
              
              if (newSession) {
                // Move the block to the new session
                await supabase
                  .from('session_blocks')
                  .update({ session_id: newSession.id })
                  .eq('id', itemData.block_id);
                
                console.log(`🔧 Moved block to new session with order_index ${idx}`);
              }
            } else {
              // Block is already in its own session, just update the order_index
              await supabase
                .from('sessions')
                .update({ order_index: idx })
                .eq('id', blockData.session_id);
              
              console.log(`🔧 Updated existing session order_index to ${idx}`);
            }
          }
          
          // Clean up old sessions (even if they still have blocks, they're duplicates)
          for (const oldSessionId of oldSessionIds) {
            // Delete all blocks in the old session first
            await supabase.from('session_blocks').delete().eq('session_id', oldSessionId);
            // Then delete the session
            await supabase.from('sessions').delete().eq('id', oldSessionId);
            console.log(`🔧 Deleted old session and its blocks: ${oldSessionId}`);
          }
          
          console.log('🔧 All blocks moved to separate sessions!');
          
          toast({ description: 'Reordered exercises' });
          console.log('🔧 Reorder complete, reloading...');
          await loadDayGroups(dayIdA);
        } catch(e) {
          console.error('❌ Reorder failed:', e);
          toast({ description: 'Failed to reorder', variant: 'destructive' as any });
        }
        return;
      }
    }
    // Reorder groups within a day
    if (activeId.startsWith('group:') && overId.startsWith('group:')) {
      const [, activeSessionId, dayIdA] = activeId.split(':');
      const [, overSessionId, dayIdB] = overId.split(':');
      if (dayIdA !== dayIdB) return;
      const cur = groupsByDay[dayIdA] || [];
      const from = cur.findIndex(g => g.sessionId === activeSessionId);
      const to = cur.findIndex(g => g.sessionId === overSessionId);
      if (from < 0 || to < 0 || from === to) return;
      const next = arrayMove(cur, from, to);
      setGroupsByDay(prev => ({ ...prev, [dayIdA]: next }));
      // Persist new order_index on sessions
      await Promise.all(next.map((g, idx) => supabase.from('sessions').update({ order_index: idx }).eq('id', g.sessionId)));
      return;
    }
    // Reorder groups by dropping onto a root drop slot (between groups)
    if (activeId.startsWith('group:') && overId.startsWith('rootdrop:')) {
      const [, activeSessionId, dayIdA] = activeId.split(':');
      const [, dayIdB, insertIndexStr] = overId.split(':');
      if (dayIdA !== dayIdB) return;
      const insertIndex = Number(insertIndexStr || '0');
      const cur = groupsByDay[dayIdA] || [];
      const from = cur.findIndex(g => g.sessionId === activeSessionId);
      if (from < 0) return;
      // Compute target index after removing the source element
      const adjustedInsert = from < insertIndex ? insertIndex - 1 : insertIndex;
      const next = arrayMove(cur, from, Math.max(0, Math.min(adjustedInsert, cur.length - 1)));
      setGroupsByDay(prev => ({ ...prev, [dayIdA]: next }));
      await Promise.all(next.map((g, idx) => supabase.from('sessions').update({ order_index: idx }).eq('id', g.sessionId)));
      return;
    }
    // Move an existing item into a group's inner drop
    if (activeId.startsWith('item:') && overId.startsWith('groupdrop:')) {
      const [, itemId] = activeId.split(':');
      const [, blockId, dayId] = overId.split(':');
      try {
        await supabase.from('session_block_items').update({ block_id: blockId }).eq('id', itemId);
        await loadDayGroups(dayId);
      } catch(e:any){ toast({ description: e?.message || 'Move failed', variant: 'destructive' as any }); }
      return;
    }
    // Library → day root drop zone (between groups)
    if (activeId.startsWith('lib:') && overId.startsWith('rootdrop:')) {
      const ex = event.active.data.current as Exercise;
      const [, dayId, insertIndexStr] = overId.split(':');
      const insertIndex = Number(insertIndexStr || '0');
      const targetDay = days.find((d) => d.id === dayId);
      if (!targetDay || !ex) return;
      try {
        setSavingDayId(dayId);
        const name = ex.name;
        // create session at the right order_index
        const sIns = await supabase.from('sessions').insert({ plan_day_id: dayId, name, order_index: insertIndex }).select('id').single();
        if (sIns.error) throw sIns.error;
        const sessionId = String((sIns.data as any).id);
        // shift order_index for sessions after insertIndex
        const rest = (groupsByDay[dayId] || []);
        for (let i = insertIndex; i < rest.length; i++) {
          await supabase.from('sessions').update({ order_index: i+1 }).eq('id', rest[i].sessionId);
        }
        const blockType = ex.modality === 'strength' ? 'strength' : 'cardio';
        const bIns = await supabase.from('session_blocks').insert({ session_id: sessionId, block_type: blockType, title: name }).select('id').single();
        const blockId = String((bIns.data as any).id);
        
        // Add default extra values based on modality
        const defaultExtra = getDefaultExtraForModality(ex.modality);
        await supabase.from('session_block_items').insert({ block_id: blockId, exercise_id: ex.id, status: 'draft', extra: defaultExtra });
        await loadDayGroups(dayId);
      } finally {
        setSavingDayId(null);
      }
      return;
    }
    // Library → drop zone (legacy)
    if (activeId.startsWith('lib:') && overId.startsWith('drop:')) {
      const ex = event.active.data.current as Exercise;
      const [, dayId] = overId.split(':'); // drop:<dayId>
      const targetDay = days.find((d) => d.id === dayId);
      if (!targetDay || !ex) return;
      await addExerciseToDay(ex, targetDay, 'draft');
      return;
    }
    // Library → group inner drop
    if (activeId.startsWith('lib:') && overId.startsWith('groupdrop:')) {
      const ex = event.active.data.current as Exercise;
      const [, blockId, dayId] = overId.split(':');
      try {
        // Add default extra values based on modality
        const defaultExtra = getDefaultExtraForModality(ex.modality);
        await supabase.from('session_block_items').insert({ block_id: blockId, exercise_id: ex.id, status: 'draft', extra: defaultExtra });
        await loadDayGroups(dayId);
      } catch(e:any){ toast({ description: e?.message || 'Add failed', variant: 'destructive' as any }); }
      return;
    }
    // Existing item → root drop (make it standalone block between groups)
    if (activeId.startsWith('item:') && overId.startsWith('rootdrop:')) {
      const [, itemId, dayId] = activeId.split(':');
      const [, , insertIndexStr] = overId.split(':');
      const insertIndex = Number(insertIndexStr || '0');
      try {
        setSavingDayId(dayId);
        const name = 'Exercise';
        const sIns = await supabase.from('sessions').insert({ plan_day_id: dayId, name, order_index: insertIndex }).select('id').single();
        const sessionId = String((sIns.data as any).id);
        const bIns = await supabase.from('session_blocks').insert({ session_id: sessionId, block_type: 'cardio', title: name }).select('id').single();
        const blockId = String((bIns.data as any).id);
        await supabase.from('session_block_items').update({ block_id: blockId }).eq('id', itemId);
        await loadDayGroups(dayId);
      } finally { setSavingDayId(null); }
      return;
    }
    // Format chip → drop zone
    if (activeId.startsWith('format:') && overId.startsWith('drop:')) {
      const format = activeId.split(':')[1];
      const [, dayId] = overId.split(':');
      await createFormatGroupInDay(format, dayId);
      return;
    }
    // Hyrox Sim → drop zone
    if (activeId === 'hyrox:sim' && overId.startsWith('drop:')) {
      const [, dayId] = overId.split(':');
      await createHyroxSimInDay(dayId);
      return;
    }
  }

  async function toggleRest(day: PlanDay) {
    try {
      setSavingDayId(day.id);
      const next = !day.is_rest;
      setDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, is_rest: next } : d)));
      const { error } = await supabase.from("plan_days").update({ is_rest: next }).eq("id", day.id);
      if (error) throw error;
      if (next) {
        // If marking as Rest, delete all sessions/blocks/items for this day
        const sess = await supabase.from("sessions").select("id").eq("plan_day_id", day.id);
        if (!sess.error && sess.data && sess.data.length > 0) {
          const sessionIds = sess.data.map((s: any) => s.id);
          const blk = await supabase.from("session_blocks").select("id").in("session_id", sessionIds);
          if (!blk.error && blk.data && blk.data.length > 0) {
            const blockIds = blk.data.map((b: any) => b.id);
            await supabase.from("session_block_items").delete().in("block_id", blockIds);
            await supabase.from("session_blocks").delete().in("id", blockIds);
          }
          await supabase.from("sessions").delete().in("id", sessionIds);
        }
        setItemsByDay((prev) => ({ ...prev, [day.id]: [] }));
        setGroupsByDay((prev) => ({ ...prev, [day.id]: [] }));
      }
    } catch (e: any) {
      toast({ description: e?.message || "Failed to toggle rest", variant: "destructive" as any });
    } finally {
      setSavingDayId(null);
    }
  }

  async function createHyroxSimInDay(explicitDayId?: string) {
    try {
      const target = explicitDayId || selectedDayId || filteredDays[0]?.id;
      if (!target) { 
        toast({ description: 'Select a day first', variant: 'default' as any }); 
        return; 
      }

      // Hyrox stations in order with updated weights
      const hyroxStations = [
        { name: 'SkiErg', searchTerms: ['SkiErg'], distance: 1000, unit: 'm', tags: 'hyrox' },
        { name: 'Sled Push', searchTerms: ['Sled Push'], distance: 50, unit: 'm', weight: '152kg', tags: 'hyrox' },
        { name: 'Sled Pull', searchTerms: ['Sled Pull'], distance: 50, unit: 'm', weight: '103kg', tags: 'hyrox' },
        { name: 'Burpee Broad Jump', searchTerms: ['Burpee Broad Jump', 'Broad Jump', 'Burpees'], distance: 80, unit: 'm', tags: 'hyrox' },
        { name: 'RowErg', searchTerms: ['RowErg'], distance: 1000, unit: 'm', tags: 'hyrox' },
        { name: 'Farmer Carry', searchTerms: ['Farmer Carry'], distance: 200, unit: 'm', weight: '2x24kg', tags: 'hyrox' },
        { name: 'Walking Lunges', searchTerms: ['Walking Lunges', 'Lunges'], distance: 80, unit: 'm', weight: '20kg', tags: 'hyrox' },
        { name: 'Wall Balls', searchTerms: ['Wall Balls', 'wall ball'], reps: 100, weight: '6kg', tags: 'hyrox' }
      ];

      // Create session
      const sessionName = 'Hyrox Simulation (Open Men)';
      const sIns = await supabase.from('sessions').insert({ plan_day_id: target, name: sessionName }).select('id').single();
      if (sIns.error) throw sIns.error;
      const sessionId = String((sIns.data as any).id);

      // Create simulation block
      const blockTitle = 'Hyrox Sim - 8 Stations + Runs';
      const bIns = await supabase.from('session_blocks').insert({ 
        session_id: sessionId, 
        block_type: 'simulation', 
        title: blockTitle,
        rounds: 1,
        parameters: { 
          format: 'simulation',  // Must match the check in supabasePlans.ts
          race_type: 'hyrox',
          sequential: true, 
          track_splits: true
        }
      }).select('id').single();
      if (bIns.error) throw bIns.error;
      const blockId = String((bIns.data as any).id);

      // Get 1km run exercise - try multiple search patterns
      let runExerciseId = null;
      
      // Try to find a 1km run - exact match first, then fallbacks
      const runSearchTerms = ['1km Run Hyrox Pace', '1km', '400m Run', '600m Run'];
      for (const term of runSearchTerms) {
        const query = await supabase
          .from('exercises')
          .select('id,name')
          .ilike('name', `%${term}%`)
          .limit(1);
        
        if (query.data && query.data.length > 0) {
          runExerciseId = query.data[0].id;
          break;
        }
      }
      
      // Fallback: any running exercise
      if (!runExerciseId) {
        const fallbackQuery = await supabase
          .from('exercises')
          .select('id')
          .eq('modality', 'running')
          .limit(1);
        
        if (fallbackQuery.data && fallbackQuery.data.length > 0) {
          runExerciseId = fallbackQuery.data[0].id;
        }
      }
      
      if (!runExerciseId) {
        console.warn('⚠️ No running exercise found in database');
        toast({ description: 'Warning: No running exercise found - simulation may be incomplete', variant: 'default' as any });
      }

      let itemOrder = 0;
      let createdCount = 0;
      const failedStations: string[] = [];

      // Add each station with runs before them
      for (let i = 0; i < hyroxStations.length; i++) {
        const station = hyroxStations[i];
        
        // Add 1km run before station
        if (runExerciseId) {
          const extra: any = { distance: 1 }; // 1km
          const runInsert = await supabase.from('session_block_items').insert({ 
            block_id: blockId, 
            exercise_id: runExerciseId, 
            status: 'draft', 
            item_order: itemOrder++,
            extra
          });
          if (runInsert.error) {
            console.error(`❌ Failed to insert run #${i + 1}:`, runInsert.error);
            throw runInsert.error;
          }
          createdCount++;
          console.log(`✅ Added run #${i + 1} (order: ${itemOrder - 1})`);
        }

        // Find station exercise - try multiple search terms
        let stationExercise = null;
        for (const term of station.searchTerms) {
          const query = await supabase
            .from('exercises')
            .select('id,name,modality')
            .ilike('name', `%${term}%`)
            .limit(1);
          
          if (query.data && query.data.length > 0) {
            stationExercise = query.data[0];
            console.log(`✅ Found ${station.name} via search term "${term}":`, stationExercise.name);
            break;
          }
        }

        if (stationExercise?.id) {
          // Build extra data based on station
          const extra: any = {};
          
          // Distance-based stations (sleds, carries, ergs, etc)
          if (station.distance !== undefined) {
            // Convert meters to km for database storage
            extra.distance = station.distance / 1000;
          }
          
          // Reps-based stations (wall balls only)
          if (station.reps !== undefined) {
            extra.reps = station.reps;
            extra.sets = 1; // Hyrox is always 1 set
          }
          
          // Add weight if specified
          if (station.weight) {
            extra.weight = station.weight;
          }

          const stationInsert = await supabase.from('session_block_items').insert({ 
            block_id: blockId, 
            exercise_id: stationExercise.id, 
            status: 'draft', 
            item_order: itemOrder++,
            extra
          });
          if (stationInsert.error) {
            console.error(`❌ Failed to insert station ${station.name}:`, stationInsert.error);
            throw stationInsert.error;
          }
          createdCount++;
          console.log(`✅ Added station #${i + 1}: ${station.name} (order: ${itemOrder - 1})`);
        } else {
          console.error(`❌ Could not find exercise for station: ${station.name}`, station.searchTerms);
          failedStations.push(station.name);
          toast({ description: `Warning: Could not find "${station.name}" in exercise library`, variant: 'default' as any });
        }
      }

      // NO FINAL RUN - Hyrox ends with Wall Balls
      console.log(`📊 Summary: Created ${createdCount} items (should be 16: 8 runs + 8 stations)`);
      if (failedStations.length > 0) {
        console.error(`❌ Failed to find: ${failedStations.join(', ')}`);
      }

      // Update plan day description
      await supabase.from('plan_days').update({ 
        description: 'Hyrox Simulation: 8 stations with 1km runs between each (Open Men weights)' 
      }).eq('id', target);

      // Force reload
      await loadDayGroups(target);
      
      // Verify the block was created
      console.log('✅ Hyrox Sim created!', { sessionId, blockId, target });
      
      toast({ description: `Hyrox Sim created with ${hyroxStations.length} stations!` });
    } catch (err: any) {
      console.error('❌ Hyrox Sim creation failed:', err);
      toast({ description: err?.message || 'Failed to create Hyrox Sim', variant: 'destructive' as any });
    }
  }
  const DraggableFormatChip = ({ name }: { name: string }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: `format:${name}`, data: { name } });
    return (
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={async ()=>{ await createFormatGroupInDay(name); }}
        className="text-xs px-2 py-1 rounded border border-zinc-700 hover:bg-yellow-500/10"
        role="button"
        aria-label={`${name} chip`}
      >{name}</button>
    );
  };

  const DraggableHyroxSim = () => {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: 'hyrox:sim', data: { name: 'Hyrox Sim' } });
    return (
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={async ()=>{ await createHyroxSimInDay(); }}
        className="text-xs px-3 py-1.5 rounded border border-zinc-700 bg-white text-black font-semibold hover:bg-zinc-100 transition-colors"
        role="button"
        aria-label="Hyrox Sim"
      >Hyrox Sim</button>
    );
  };

  function mapFormatToBlockType(format: string): 'circuit' | 'intervals' {
    const f = format.toLowerCase();
    if (['circuit','amrap','chipper'].includes(f)) return 'circuit';
    return 'intervals';
  }

  async function applyFormatDefaults(blockId: string, format: string) {
    const f = format.toLowerCase();
    const baseParams:any = { format_group: true, format: f };
    if (f === 'circuit') await supabase.from('session_blocks').update({ rounds: 3, rest_between_rounds_s: 60, parameters: { ...baseParams, sequential: false } }).eq('id', blockId);
    if (f === 'chipper') await supabase.from('session_blocks').update({ rounds: null, parameters: { ...baseParams, sequential: true, for_time: true } }).eq('id', blockId);
    if (f === 'amrap') await supabase.from('session_blocks').update({ time_cap_sec: 600, parameters: { ...baseParams, score: 'rounds+reps' } }).eq('id', blockId);
    if (f === 'emom') await supabase.from('session_blocks').update({ time_cap_sec: 600, parameters: { ...baseParams, emom: true, slots_per_min: 1 } }).eq('id', blockId);
    if (f === 'hiit') await supabase.from('session_blocks').update({ work_sec: 40, rest_sec: 20, rounds: 8, parameters: baseParams }).eq('id', blockId);
    if (f === 'tabata') await supabase.from('session_blocks').update({ work_sec: 20, rest_sec: 10, rounds: 8, parameters: { ...baseParams, tabata_fixed: true } }).eq('id', blockId);
    if (f === 'sprint intervals') await supabase.from('session_blocks').update({ work_sec: 60, rest_sec: 120, rounds: 6, parameters: baseParams }).eq('id', blockId);
  }

  async function createFormatGroupInDay(format: string, explicitDayId?: string) {
    try {
      const target = explicitDayId || selectedDayId || filteredDays[0]?.id;
      if (!target) { toast({ description: 'Select a day first', variant: 'default' as any }); return; }
      // Direct create: session + block (avoids RPC type mismatches)
      const name = `${format} Block`;
      const sIns = await supabase.from('sessions').insert({ plan_day_id: target, name }).select('id').single();
      if (sIns.error) throw sIns.error;
      const sessionId = String((sIns.data as any).id);
      const blockType = mapFormatToBlockType(format);
      const bIns = await supabase.from('session_blocks').insert({ session_id: sessionId, block_type: blockType, title: name }).select('id').single();
      if (bIns.error) throw bIns.error;
      const blockId = String((bIns.data as any).id);
      await applyFormatDefaults(blockId, format);
      await loadDayGroups(target);
      toast({ description: `${format} group created` });
    } catch (err:any) {
      toast({ description: err?.message || 'Failed to create group', variant: 'destructive' as any });
    }
  }

  function GroupEditor({ g, dayId }: { g: Group; dayId: string }) {
    // derive format (normalize trailing colon and common variants)
    // If blockType is circuit/amrap/simulation, use that; otherwise parse from title or parameters
    const blockTypeFmt = (g.blockType === 'circuit' ? 'circuit' : g.blockType === 'amrap' ? 'amrap' : g.blockType === 'simulation' ? 'simulation' : null);
    const rawFmt = blockTypeFmt || (g.parameters?.format as string) || g.title.split(' ')[0].toLowerCase();
    const fmt = rawFmt.replace(/:$/,'');
    // Treat "superset" as circuit format
    const normalizedFmt = (fmt === 'superset' || fmt === 'supersetb' || fmt === 'superseta') ? 'circuit' : fmt;
    const isTabata = normalizedFmt === 'tabata' || g.parameters?.tabata_fixed === true;
    const [work, setWork] = useState<number | ''>('');
    const [rest, setRest] = useState<number | ''>('');
    const [rounds, setRounds] = useState<number | ''>('');
    const [timeCap, setTimeCap] = useState<number | ''>('');
    const [slotsPerMin, setSlotsPerMin] = useState<number | ''>('');
    const [restBetween, setRestBetween] = useState<number | ''>('');
    const [intensity, setIntensity] = useState<string>('');
    const [exercisesPerRound, setExercisesPerRound] = useState<number | ''>('');

    useEffect(()=>{
      setWork((g as any).work_sec ?? '');
      setRest((g as any).rest_sec ?? '');
      setRounds((g as any).rounds ?? '');
      const cap = (g as any).time_cap_sec ?? null;
      // Recalculate normalizedFmt inside useEffect for consistency
      const blockTypeFmt = (g.blockType === 'circuit' ? 'circuit' : g.blockType === 'amrap' ? 'amrap' : null);
      const rawFmt = blockTypeFmt || (g.parameters?.format as string) || g.title.split(' ')[0].toLowerCase();
      const fmt = rawFmt.replace(/:$/,'');
      const fmtNormalized = (fmt === 'superset' || fmt === 'supersetb' || fmt === 'superseta') ? 'circuit' : fmt;
      if (cap != null && (fmtNormalized==='amrap' || fmtNormalized==='emom')) setTimeCap(Math.round(Number(cap)/60));
      else setTimeCap(cap ?? '');
      setSlotsPerMin((g.parameters?.slots_per_min as number) ?? '');
      setRestBetween((g as any).rest_between_rounds_s ?? '');
      setIntensity((g as any).intensity ?? '');
      setExercisesPerRound((g.parameters?.exercises_per_round as number) ?? '');
    }, [g.blockId, g.blockType, g.parameters, g.title]);

    async function save() {
      const payload: any = {};
      // For Tabata, always enforce 20s work / 10s rest
      if (isTabata) {
        payload.work_sec = 20;
        payload.rest_sec = 10;
      } else {
        if (work !== '') payload.work_sec = Number(work);
        if (rest !== '') payload.rest_sec = Number(rest);
      }
      if (rounds !== '') payload.rounds = Number(rounds);
      if (timeCap !== '') {
        payload.time_cap_sec = (normalizedFmt==='amrap' || normalizedFmt==='emom') ? Number(timeCap) * 60 : Number(timeCap);
      }
      if (restBetween !== '') payload.rest_between_rounds_s = Number(restBetween);
      if (intensity) payload.intensity = intensity;
      // parameters
      const params: any = { ...(g.parameters || {}), format: normalizedFmt, format_group: true };
      if (isTabata) params.tabata_fixed = true;
      if (slotsPerMin !== '') params.slots_per_min = Number(slotsPerMin);
      if (exercisesPerRound !== '') params.exercises_per_round = Number(exercisesPerRound);
      payload.parameters = params;
      
      console.log('💾 Saving circuit block:', g.blockId, payload);
      const result = await supabase.from('session_blocks').update(payload).eq('id', g.blockId);
      if (result.error) {
        console.error('❌ Circuit save failed:', result.error);
        toast({ description: 'Failed to save circuit', variant: 'destructive' as any });
        return;
      }
      console.log('✅ Circuit saved successfully');
      
      await loadDayGroups(dayId);
      setEditingGroup(null);
      toast({ description: 'Group updated' });
    }

    const label = (t:string)=> <span className="block text-sm text-zinc-400 mb-1">{t}</span>;
    const input = (val:any,setter:any,placeholder?:string)=> (
      <input className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm" type="number" value={val} placeholder={placeholder||''} onChange={e=>setter(e.target.value?Number(e.target.value):'')} />
    );

    return (
      <div className="px-3 pb-3 text-sm space-y-3">
        {isTabata && (
          <div className="grid grid-cols-2 gap-3">
            <div>{label('Rounds')}{input(rounds,setRounds,'8')}</div>
            <div className="col-span-2 text-sm text-zinc-500">Note: 20s on + 10s rest</div>
          </div>
        )}
        {!isTabata && (normalizedFmt==='hiit' || normalizedFmt==='sprint' || normalizedFmt==='intervals' || g.blockType==='intervals') && (
          <div className="grid grid-cols-2 gap-3">
            <div>{label('Work (seconds)')}{input(work,setWork,'30')}</div>
            <div>{label('Rest (seconds)')}{input(rest,setRest,'30')}</div>
            <div>{label('Rounds')}{input(rounds,setRounds,'8')}</div>
            <div>{label('Intensity')}
              <input className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm" value={intensity} placeholder="Z3 / hard" onChange={e=>setIntensity(e.target.value)} />
            </div>
          </div>
        )}
        {normalizedFmt==='emom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>{label('Minutes')}{input(timeCap,setTimeCap,'10')}</div>
            <div>{label('Slots per minute')}{input(slotsPerMin,setSlotsPerMin,'1')}</div>
          </div>
        )}
        {(normalizedFmt==='circuit' || normalizedFmt==='chipper') && (
          <div className="space-y-3">
            {normalizedFmt==='circuit' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>{label('Work (seconds)')}{input(work,setWork,'40')}</div>
                  <div>{label('Rest (seconds)')}{input(rest,setRest,'20')}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>{label('Rounds')}{input(rounds,setRounds,'3')}</div>
                  <div>{label('Rest between rounds (s)')}{input(restBetween,setRestBetween,'60')}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-1">{label('Exercises per round')}{input(exercisesPerRound,setExercisesPerRound,'5')}</div>
                </div>
              </>
            )}
            {normalizedFmt==='chipper' && (
              <div className="grid grid-cols-2 gap-3">
                <div>{label('Time cap (minutes)')}{input(timeCap,setTimeCap,'20')}</div>
              </div>
            )}
          </div>
        )}
        {normalizedFmt==='amrap' && (
          <div className="grid grid-cols-2 gap-3">
            <div>{label('Time cap (minutes)')}{input(timeCap,setTimeCap,'10')}</div>
          </div>
        )}
        <div className="pt-1 text-right">
          <button onClick={save} className="px-3 py-1 rounded border border-yellow-500 text-yellow-400">Save</button>
        </div>
      </div>
    );
  }


  // Minimal add handler: attempts to create a cardio/strength block+item if schema exists, otherwise shows a toast
  async function addExerciseToDay(ex: Exercise, day: PlanDay, status: 'draft' | 'ready' = 'draft') {
    try {
      setSavingDayId(day.id);
      // Create or find a session for the day
      const sessionName = ex.modality === "strength" ? "Strength" : (ex.modality === "erg" || ex.modality === "cardio") ? "Cardio" : "Session";
      let sessionId: string | null = null;
      const sFind = await supabase.from("sessions").select("id").eq("plan_day_id", day.id).limit(1);
      if (!sFind.error && sFind.data && sFind.data.length > 0) {
        sessionId = String(sFind.data[0].id);
      } else {
        const sIns = await supabase.from("sessions").insert({ plan_day_id: day.id, name: sessionName }).select("id").single();
        if (sIns.error) throw sIns.error;
        sessionId = String((sIns.data as any).id);
      }

      // Create a block
      const blockType = ex.modality === "strength" ? "strength" : "cardio";
      const bIns = await supabase
        .from("session_blocks")
        .insert({ session_id: sessionId, block_type: blockType, title: ex.name, status })
        .select("id")
        .single();
      if (bIns.error) throw bIns.error;
      const blockId = String((bIns.data as any).id);

      // Create an item referencing the exercise
      await supabase
        .from("session_block_items")
        .insert({ block_id: blockId, exercise_id: ex.id, status });

      // Reload items for this day so the chip appears
      await reloadDayItems(day.id);
      toast({ description: `Added ${ex.name} to Day ${day.day_index + 1}` });
    } catch (e: any) {
      toast({ description: e?.message || "Schema not ready (sessions/blocks/items)", variant: "destructive" as any });
    } finally {
      setSavingDayId(null);
    }
  }

  async function reloadDayItems(dayId: string) {
    try { await loadDayGroups(dayId); } catch {}
  }

  async function loadDayGroups(dayId: string) {
    const sess = await supabase
      .from('sessions')
      .select('id,name,order_index,collapsed,session_blocks(id,block_type,title,parameters,rounds,rest_between_rounds_s,time_cap_sec,work_sec,rest_sec,intensity,session_block_items(id,exercise_id,item_order,status))')
      .eq('plan_day_id', dayId)
      .order('order_index', { ascending: true });
    
    console.log('📦 Raw session data from DB:', JSON.stringify(sess.data, null, 2));
    
    if (sess.error) { setGroupsByDay(prev=>({ ...prev, [dayId]: [] })); return; }

    // Build blocks list preserving session and block order
    const blocks = (sess.data || []).flatMap((s:any)=> {
      const arr = Array.isArray(s.session_blocks) ? s.session_blocks : (s.session_blocks ? [s.session_blocks] : []);
      // Sort blocks within a session by order_index to preserve import order
      arr.sort((a:any,b:any)=> (a?.order_index ?? 0) - (b?.order_index ?? 0));
      return arr.map((b:any)=> ({
        sessionId: String(s.id),
        blockId: b?.id ? String(b.id) : `sess-${s.id}-blk-unknown`,
        title: (b?.title || s.name) as string,
        blockType: b?.block_type as string,
        order_index: b?.order_index ?? 0,
        collapsed: s.collapsed,
        parameters: b?.parameters || null,
        rounds: b?.rounds ?? null,
        rest_between_rounds_s: b?.rest_between_rounds_s ?? null,
        time_cap_sec: b?.time_cap_sec ?? null,
        work_sec: b?.work_sec ?? null,
        rest_sec: b?.rest_sec ?? null,
        intensity: b?.intensity ?? null,
        itemRows: (b?.session_block_items || [])
      }));
    });

    const exIds = Array.from(new Set(blocks.flatMap((b:any)=> (b.itemRows||[]).map((r:any)=> r.exercise_id))));
    const exMap: Record<string,{name:string, modality?:string}> = {};
    if (exIds.length>0){
      const ex = await supabase.from('exercises').select('id,name,modality').in('id', exIds);
      if (!ex.error && ex.data) ex.data.forEach((e:any)=> exMap[String(e.id)] = { name: e.name, modality: e.modality });
    }

    // Treat 'circuit', 'amrap', and 'simulation' as group wrappers
    console.log('🔍 Checking blocks for groups:', blocks.map((b:any) => ({ blockType: b.blockType, title: b.title })));
    const groups: Group[] = blocks.filter((b:any)=> (b.blockType === 'circuit' || b.blockType === 'amrap' || b.blockType === 'simulation')).map((b:any)=> ({
      sessionId: b.sessionId,
      blockId: b.blockId,
      title: b.title,
      blockType: b.blockType,
      collapsed: b.collapsed,
      parameters: b.parameters,
      rounds: b.rounds ?? 0,
      rest_between_rounds_s: b.rest_between_rounds_s ?? 0,
      time_cap_sec: b.time_cap_sec ?? null,
      work_sec: b.work_sec ?? 0,
      rest_sec: b.rest_sec ?? 0,
      intensity: b.intensity,
      items: (b.itemRows||[]).sort((a:any,b:any)=>(a.item_order??0)-(b.item_order??0)).map((r:any)=> ({ id: String(r.id), name: exMap[String(r.exercise_id)]?.name || 'Exercise', modality: exMap[String(r.exercise_id)]?.modality }))
    }));

    setGroupsByDay(prev=> ({ ...prev, [dayId]: groups }));
    // Standalones are items from non-group blocks only (exclude circuit/amrap)
    // For standalone items, sort by parent block order_index first, then item_order
    const nonGroupEntries = blocks
      .filter((b:any)=> b.blockType !== 'circuit' && b.blockType !== 'amrap' && b.blockType !== 'simulation')
      .map((b:any)=> ({ order_index: b.order_index ?? 0, items: (b.itemRows||[]) }));

    const allRows = blocks.flatMap((b:any)=> (b.itemRows||[]));

    const flatItems: RenderedItem[] = nonGroupEntries
      .flatMap((entry:any)=> (entry.items||[]).map((r:any)=> ({ r, parentOrder: entry.order_index })))
      .sort((a:any,b:any)=> (a.parentOrder - b.parentOrder) || ((a.r.item_order??0) - (b.r.item_order??0)))
      .map((x:any)=> ({ id: String(x.r.id), name: exMap[String(x.r.exercise_id)]?.name || 'Exercise', modality: exMap[String(x.r.exercise_id)]?.modality, item_order: x.r.item_order }));
    setItemsByDay(prev=> ({ ...prev, [dayId]: flatItems }));

    // Build interleaved sequence list according to block order
    const groupsByBlockId: Record<string, Group> = {};
    groups.forEach((g:any)=> { groupsByBlockId[String(g.blockId)] = g; });
    const sequence: Array<{ kind: 'group', group: Group } | { kind: 'item', item: RenderedItem }> = [];
    for (const b of blocks) {
      if (b.blockType === 'circuit' || b.blockType === 'amrap' || b.blockType === 'simulation') {
        const g = groupsByBlockId[String(b.blockId)];
        if (g) sequence.push({ kind: 'group', group: g });
      } else {
        const rows = (b.itemRows||[]).sort((a:any,b:any)=>(a.item_order??0)-(b.item_order??0));
        const r = rows[0];
        if (r) sequence.push({ kind: 'item', item: { id: String(r.id), name: exMap[String(r.exercise_id)]?.name || 'Exercise', modality: exMap[String(r.exercise_id)]?.modality, item_order: r.item_order } });
      }
    }
    setSequenceByDay(prev => ({ ...prev, [dayId]: sequence }));
    const allReady = allRows.length>0 && allRows.every((r:any)=> (r.status || 'draft') === 'ready');
    setReadyDays(prev=> ({ ...prev, [dayId]: allReady }));
  }

  const removeItem = useCallback(async (itemId: string, dayId: string) => {
    try {
      const { error } = await supabase.from("session_block_items").delete().eq("id", itemId);
      if (error) throw error;
      setItemsByDay((prev) => ({
        ...prev,
        [dayId]: (prev[dayId] || []).filter((i) => i.id !== itemId),
      }));
      // Also refresh groups to reflect removal when item was inside a group
      await loadDayGroups(dayId);
      toast({ description: "Removed exercise" });
    } catch (e: any) {
      toast({ description: e?.message || "Failed to remove", variant: "destructive" as any });
    }
  }, [toast]);

  // Memoize the entire days grid to prevent re-renders when search changes
  const DaysGrid = useMemo(() => {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 lg:col-span-2 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => setWeek("all")} className={`px-2 py-1 rounded ${week === "all" ? "bg-yellow-500 text-black" : "bg-black border border-zinc-800"}`}>All</button>
            <button onClick={() => setWeek("w1")} className={`px-2 py-1 rounded ${week === "w1" ? "bg-yellow-500 text-black" : "bg-black border border-zinc-800"}`}>Week 1</button>
            <button onClick={() => setWeek("w2")} className={`px-2 py-1 rounded ${week === "w2" ? "bg-yellow-500 text-black" : "bg-black border border-zinc-800"}`}>Week 2</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCSVModal(true)}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1"
              title="Import CSV"
            >
              <Upload className="w-4 h-4" />
              CSV
            </button>
            <span className="text-sm">Hyrox</span>
            {[3,4,5,6].map((n) => (
              <button
                key={n}
                disabled={generating}
                onClick={async () => {
                  try {
                    setGenerating(true);
                    setTrainingDaysSel(n);
                    const allDayIds = days.map((d) => d.id);
                    for (const d of allDayIds) {
                      setItemsByDay((prev) => ({ ...prev, [d]: [] }));
                      setReadyDays((prev) => ({ ...prev, [d]: false }));
                      setDays((prev) => prev.map((x) => (x.id === d ? { ...x, is_rest: false, description: "" } : x)));
                    }
                    await generateHyroxWeek((supabase as any), plan?.id || "", allDayIds, { template: "balanced", trainingDays: n });
                    for (const d of allDayIds) await reloadDayItems(d);
                    toast({ description: `Hyrox • ${n} training days generated` });
                  } catch (e: any) {
                    toast({ description: e?.message || 'Failed to generate', variant: 'destructive' as any });
                  } finally {
                    setGenerating(false);
                  }
                }}
                className={`w-8 h-8 rounded-full border ${generating ? 'opacity-40 cursor-not-allowed' : 'hover:bg-yellow-500/10'} ${trainingDaysSel===n ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700'}`}
              >{n}</button>
            ))}
          </div>
        </div>

        {generating && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-3 text-yellow-400">
              <Loader2 className="w-10 h-10 animate-spin" />
              <div className="text-sm">Generating HYROX plan…</div>
            </div>
          </div>
        )}

        {loading && <div className="text-zinc-400">Loading…</div>}
        {!loading && filteredDays.length === 0 && (
          <div className="text-zinc-400">No days for this view.</div>
        )}
        {!loading && filteredDays.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDays.map((d) => (
              <div key={d.id} onClick={()=>setSelectedDayId(d.id)} className={`rounded-lg p-3 border cursor-pointer transition-all ${selectedDayId === d.id ? 'ring-2 ring-yellow-500 border-yellow-500' : ''} ${d.is_rest ? "border-zinc-700 bg-black/40 opacity-40" : readyDays[d.id] ? "border-green-400 bg-black/60" : "border-zinc-800 bg-black"} ${savingDayId===d.id? 'animate-pulse': ''} hover:border-zinc-600`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.label ? d.label : `Day ${d.day_index + 1}`}</div>
                    {d.label && d.label.trim().toLowerCase() !== `day ${d.day_index + 1}`.toLowerCase() && (
                      <div className="text-xs text-zinc-400">Day {d.day_index + 1}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      title="Clear day"
                      className="inline-flex items-center justify-center text-xs w-9 h-9 rounded border border-zinc-600 hover:bg-zinc-800"
                      onClick={async ()=>{
                        try { setSavingDayId(d.id); await clearHyroxDay(supabase as any, d.id); await reloadDayItems(d.id); toast({ description: `Day ${d.day_index+1} cleared`}); }
                        catch(e:any){ toast({ description: e?.message || 'Failed to clear', variant: 'destructive' as any }); }
                        finally { setSavingDayId(null); }
                      }}
                    >
                      <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button disabled={savingDayId===d.id} title={d.is_rest ? 'Rest' : 'Mark Rest'} onClick={() => toggleRest(d)} className={`inline-flex items-center justify-center text-xs w-9 h-9 rounded border ${d.is_rest ? "border-zinc-700 text-zinc-300 bg-transparent" : "border-yellow-500 text-yellow-400 bg-transparent hover:bg-yellow-500/10"} ${savingDayId===d.id? 'opacity-60 cursor-not-allowed':''}`}>
                      <Pause className="w-5 h-5" />
                    </button>
                    <button onClick={() => markDayReady(d)} disabled={savingDayId===d.id || (!d.is_rest && !((itemsByDay[d.id]?.length > 0) || (groupsByDay[d.id]?.length > 0)))} className={`inline-flex items-center justify-center text-xs w-9 h-9 rounded border ${(!d.is_rest && !((itemsByDay[d.id]?.length > 0) || (groupsByDay[d.id]?.length > 0))) ? 'opacity-40 cursor-not-allowed border-zinc-700' : 'border-zinc-600 hover:bg-zinc-800'} ${savingDayId===d.id? 'opacity-60 cursor-wait':''}`} title="Ready">
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <input
                    className="w-full bg-black border border-zinc-800 rounded-md px-2 py-1 text-xs"
                    placeholder="Add a short description…"
                    defaultValue={d.description || ''}
                    onBlur={async (e) => {
                      const val = e.currentTarget.value;
                      if (val === d.description) return;
                      await supabase.from('plan_days').update({ description: val }).eq('id', d.id);
                      setDays((prev) => prev.map((x) => x.id === d.id ? { ...x, description: val } : x));
                    }}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  <div className="space-y-2">
                    <SortableContext items={(sequenceByDay[d.id] || []).map(entry => entry.kind==='group' ? `group:${(entry as any).group.sessionId}:${d.id}` : `item:${(entry as any).item.id}:${d.id}`)}>
                      <InlineRootDrop id={`rootdrop:${d.id}:0`} />
                      {(sequenceByDay[d.id] || []).map((entry, gi) => {
                        if (entry.kind === 'group') {
                          const g = (entry as any).group as Group;
                          const sidG = `group:${g.sessionId}:${d.id}`;
                          const RowGroup = () => {
                            const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sidG });
                            const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
                            const isSimulation = g.blockType === 'simulation';
                            const wrapperClasses = isSimulation 
                              ? "rounded-md border-2 border-white/30 bg-white/10" 
                              : "rounded-md border border-slate-600 bg-slate-800";
                            return (
                              <div ref={setNodeRef} style={style} className={wrapperClasses}>
                                <div className="flex items-center justify-between px-3 py-2">
                                  <div className="inline-flex items-center gap-2">
                                    <span title="Drag group" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-yellow-500"><Move className="w-5 h-5" /></span>
                                    <Repeat className="w-4 h-4 text-yellow-400" />
                                    <div className="font-medium text-sm">{g.title}</div>
                                  </div>
                                  <div className="inline-flex items-center gap-2">
                                    <button 
                                      className="text-xs underline opacity-80 hover:opacity-100" 
                                      onClick={(e)=>{
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const blockIdStr = String(g.blockId);
                                        console.log('🔧 Edit button clicked for circuit:', g.title, 'blockId:', blockIdStr, 'current editingGroup:', editingGroup);
                                        setEditingGroup(blockIdStr);
                                        console.log('🔧 Set editingGroup to:', blockIdStr);
                                      }}
                                    >Edit</button>
                                    <button
                                      className="text-xs opacity-80 hover:opacity-100"
                                      onClick={async ()=>{
                                        try {
                                          setSavingDayId(d.id);
                                          await supabase.from('session_block_items').delete().eq('block_id', g.blockId);
                                          await supabase.from('session_blocks').delete().eq('id', g.blockId);
                                          const remain = await supabase.from('session_blocks').select('id').eq('session_id', g.sessionId).limit(1);
                                          if (!remain.error && (!remain.data || remain.data.length === 0)) {
                                            await supabase.from('sessions').delete().eq('id', g.sessionId);
                                          }
                                          await loadDayGroups(d.id);
                                          toast({ description: 'Group deleted' });
                                        } catch(e:any) {
                                          toast({ description: e?.message || 'Failed to delete group', variant: 'destructive' as any });
                                        } finally { setSavingDayId(null); }
                                      }}
                                    >Delete</button>
                                  </div>
                                </div>
                                {!g.collapsed && (
                                  <div className="px-3 pb-2">
                                    <GroupInnerDrop id={`groupdrop:${g.blockId}:${d.id}`}>
                                      <SortableContext items={(g.items || []).map(i => `item:${i.id}:${d.id}`)}>
                                        <div className="space-y-2">
                                          {(g.items || []).map((it) => {
                                            const { chip, Icon } = modalityStyle(it.modality);
                                            const sid = `item:${it.id}:${d.id}`;
                                            return <CompactItemRow key={sid} sid={sid} it={it} dayId={d.id} chip={chip} Icon={Icon} editing={editing} toggleEditorWithData={toggleEditorWithData} removeItem={removeItem} EditorStrength={EditorStrength} EditorEndurance={EditorEndurance} EditorIntervals={EditorIntervals} EditorAccessory={EditorAccessory} EditorRehab={EditorRehab} EditorCarry={EditorCarry} />;
                                          })}
                                          {(g.items || []).length === 0 && (
                                            <div className="text-xs text-zinc-400">Drop exercises here</div>
                                          )}
                                        </div>
                                      </SortableContext>
                                    </GroupInnerDrop>
                                  </div>
                                )}
                                {(() => {
                                  const blockIdStr = String(g.blockId);
                                  const isEditing = editingGroup === blockIdStr;
                                  if (isEditing) {
                                    console.log('✅ Rendering GroupEditor for:', g.title, 'blockId:', blockIdStr);
                                  }
                                  return isEditing ? <GroupEditor g={g} dayId={d.id} /> : null;
                                })()}
                              </div>
                            );
                          };
                          return (
                            <div key={`grpwrap:${g.sessionId}:${g.blockId}`}>
                              <RowGroup />
                              <InlineRootDrop id={`rootdrop:${d.id}:${gi+1}`} />
                            </div>
                          );
                        }
                        // Render standalone item entry
                        const it = (entry as any).item as RenderedItem;
                        const { chip, Icon } = modalityStyle(it.modality);
                        const sid = `item:${it.id}:${d.id}`;
                        return (
                          <div key={sid} className="space-y-1 mt-2">
                            <CompactItemRow 
                              sid={sid} 
                              it={it} 
                              dayId={d.id} 
                              chip={chip} 
                              Icon={Icon} 
                              editing={editing} 
                              toggleEditorWithData={toggleEditorWithData} 
                              removeItem={removeItem} 
                              EditorStrength={EditorStrength} 
                              EditorEndurance={EditorEndurance} 
                              EditorIntervals={EditorIntervals} 
                              EditorAccessory={EditorAccessory}
                              EditorRehab={EditorRehab}
                            />
                          </div>
                        );
                      })}
                    </SortableContext>
                  </div>
                  <DroppableZone id={`drop:${d.id}`} label={savingDayId===d.id? 'Saving…' : 'Drop exercises here'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [filteredDays, groupsByDay, itemsByDay, sequenceByDay, readyDays, editing, editingGroup, generating, loading, savingDayId, selectedDayId, trainingDaysSel, week, days, plan?.id]);

  async function markDayReady(day: PlanDay) {
    try {
      setSavingDayId(day.id);
      // Toggle: if already ready, set all to draft; else set all to ready
      const blocks = await supabase
        .from('session_blocks')
        .select('id, sessions!inner(plan_day_id)')
        .eq('sessions.plan_day_id', day.id);
      if (blocks.error) throw blocks.error;
      const blockIds = (blocks.data || []).map((b:any)=> b.id);
      if (blockIds.length > 0) {
        const current = readyDays[day.id] === true;
        const newStatus = current ? 'draft' : 'ready';
        await supabase.from('session_block_items').update({ status: newStatus }).in('block_id', blockIds);
        await supabase.from('session_blocks').update({ status: newStatus }).in('id', blockIds);
        setReadyDays(prev=> ({ ...prev, [day.id]: !current }));
        toast({ description: !current ? `Marked Day ${day.day_index + 1} ready` : `Day ${day.day_index + 1} unmarked` });
      }
    } catch (e: any) {
      toast({ description: e?.message || "No items to mark ready yet", variant: "default" as any });
    } finally {
      setSavingDayId(null);
    }
  }

  async function markAllDaysReady() {
    if (!plan?.id) return;
    
    try {
      setLoading(true);
      
      // Get all days that have exercises (not empty and not rest days)
      const daysWithExercises = days.filter(d => 
        !d.is_rest && ((itemsByDay[d.id]?.length > 0) || (groupsByDay[d.id]?.length > 0))
      );
      
      if (daysWithExercises.length === 0) {
        toast({ description: "No days with exercises to mark as ready", variant: "destructive" as any });
        return;
      }
      
      // Get all session blocks for all these days
      const dayIds = daysWithExercises.map(d => d.id);
      const { data: blocks, error: blocksError } = await supabase
        .from('session_blocks')
        .select('id, sessions!inner(plan_day_id)')
        .in('sessions.plan_day_id', dayIds);
      
      if (blocksError) throw blocksError;
      
      const blockIds = (blocks || []).map((b: any) => b.id);
      
      if (blockIds.length > 0) {
        // Mark all blocks and items as ready
        await supabase.from('session_block_items').update({ status: 'ready' }).in('block_id', blockIds);
        await supabase.from('session_blocks').update({ status: 'ready' }).in('id', blockIds);
        
        // Update readyDays state
        const newReadyDays: Record<string, boolean> = {};
        daysWithExercises.forEach(d => {
          newReadyDays[d.id] = true;
        });
        setReadyDays(prev => ({ ...prev, ...newReadyDays }));
        
        toast({ description: `✓ Marked ${daysWithExercises.length} days as ready!`, duration: 3000 });
      }
    } catch (e: any) {
      toast({ description: e?.message || "Failed to mark days ready", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <input
            className="text-2xl font-semibold bg-black border-b-2 border-zinc-700 hover:border-zinc-500 focus:border-yellow-500 focus:outline-none px-2 py-1 min-w-[300px] transition-colors"
            value={plan?.name || ""}
            placeholder="Untitled Plan"
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              setPlan(prev => prev ? { ...prev, name: e.target.value } : null);
              setPlanNameSaved(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            onBlur={async (e) => {
              const newName = e.target.value.trim() || "Untitled Plan";
              if (plan && newName !== plan.name) {
                setSavingPlanName(true);
                try {
                  await supabase.from("plans").update({ name: newName }).eq("id", plan.id);
                  setPlan(prev => prev ? { ...prev, name: newName } : null);
                  setPlanNameSaved(true);
                  setTimeout(() => setPlanNameSaved(false), 2000);
                } catch (e: any) {
                  toast({ description: e?.message || "Failed to save", variant: "destructive" as any });
                } finally {
                  setSavingPlanName(false);
                }
              }
            }}
          />
          <button
            onClick={async () => {
              const newName = plan?.name?.trim() || "Untitled Plan";
              if (plan) {
                setSavingPlanName(true);
                try {
                  await supabase.from("plans").update({ name: newName }).eq("id", plan.id);
                  setPlan(prev => prev ? { ...prev, name: newName } : null);
                  setPlanNameSaved(true);
                  setTimeout(() => setPlanNameSaved(false), 2000);
                } catch (e: any) {
                  toast({ description: e?.message || "Failed to save", variant: "destructive" as any });
                } finally {
                  setSavingPlanName(false);
                }
              }
            }}
            disabled={savingPlanName}
            className="inline-flex items-center justify-center w-9 h-9 rounded border border-yellow-500 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Save plan name"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              console.log('🤖 Opening AI Assistant with:', {
                selectedDayId,
                firstDayId: filteredDays[0]?.id,
                dayLabel: filteredDays.find(d => d.id === selectedDayId)?.label || 'Unknown'
              });
              setShowAIAssistant(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 transition-all font-semibold shadow-lg shadow-yellow-500/20"
            title="AI Workout Builder"
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </button>
          <button
            onClick={markAllDaysReady}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-zinc-600 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            title="Mark all workout days as ready"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark All Ready
          </button>
          <button
            onClick={async () => {
              if (!plan?.id) return;
              
              // Check if any days are marked as ready
              const readyCount = Object.values(readyDays).filter(Boolean).length;
              if (readyCount === 0) {
                toast({ 
                  description: "Please mark at least one day as ready before sending", 
                  variant: "destructive" as any 
                });
                return;
              }
              
              if (!confirm(`Send plan "${plan.name}" to client? This will make it active and visible to them.`)) {
                return;
              }
              
              try {
                // Update plan status to 'active' and set start_date
                const { error } = await supabase
                  .from('plans')
                  .update({ 
                    status: 'active',
                    start_date: new Date().toISOString()
                  })
                  .eq('id', plan.id);
                
                if (error) throw error;
                
                toast({ 
                  description: `✓ Plan sent to client! ${readyCount} days are now active.`,
                  duration: 5000
                });
                
                // Update local state
                setPlan(prev => prev ? { ...prev, status: 'active' as any } : prev);
              } catch (e: any) {
                toast({ 
                  description: e?.message || "Failed to send plan", 
                  variant: "destructive" as any 
                });
              }
            }}
            className="inline-flex items-center justify-center w-9 h-9 rounded border border-blue-500 text-blue-400 hover:bg-blue-500/10 transition-colors"
            title="Send plan to client"
          >
            <Send className="w-5 h-5" />
          </button>
          {savingPlanName && <span className="text-xs text-yellow-500">Saving...</span>}
          {planNameSaved && <span className="text-xs text-green-400">✓ Saved</span>}
        </div>
        <Link to="/admin/clients" className="text-sm text-yellow-500 hover:underline">← Back to clients</Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-md px-3 py-2 mb-3 text-sm">{error}</div>
      )}

      {/* Two-column layout with DnD context */}
      <DndContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" key="main-grid">
        {/* Left: Library */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 lg:col-span-1 lg:sticky lg:top-16 lg:self-start">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Exercise Library</h2>
          </div>
          {/* Format shortcuts */}
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={()=>{ const n=!openMetcon; setOpenMetcon(n); localStorage.setItem('ui.metconOpen', n?'1':'0'); }} className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">MetCon {openMetcon? '−' : '+'}</button>
              {openMetcon && (
                <>
                  {['Circuit','AMRAP','EMOM','Chipper'].map(n=> <DraggableFormatChip key={n} name={n} />)}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={()=>{ const n=!openIntervals; setOpenIntervals(n); localStorage.setItem('ui.intervalsOpen', n?'1':'0'); }} className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Interval Training {openIntervals? '−' : '+'}</button>
              {openIntervals && (
                <>
                  {['HIIT','Tabata','Sprint Intervals'].map(n=> <DraggableFormatChip key={n} name={n} />)}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-zinc-800">
              <span className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Simulations</span>
              <DraggableHyroxSim />
            </div>
          </div>
          {/* Modality filter chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setModalityFilter(null)} className={`text-xs px-2 py-1 rounded border ${modalityFilter === null ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-black border-zinc-800'}`}>All</button>
            {modalityChips.map((m) => {
              const { chip, Icon } = modalityStyle(m);
              const active = modalityFilter === m;
              return (
                <button key={m} onClick={() => setModalityFilter(active ? null : m)} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${active ? 'bg-yellow-500 text-black border-yellow-500' : chip}`}>
                  <Icon className="w-3 h-3" /> {m}
                </button>
              );
            })}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, modality, tags…"
            className="w-full bg-black border border-zinc-800 rounded-md px-3 py-2 text-sm mb-3"
          />
          <div className="max-h-[60vh] overflow-y-scroll divide-y divide-zinc-800 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#52525b #18181b' }}>
            {filteredExercises.length === 0 && (
              <div className="text-sm text-zinc-400">No exercises found (or library table missing).</div>
            )}
            {filteredExercises.map((ex) => (
              <DraggableLibItem key={ex.id} ex={ex} />
            ))}
          </div>
        </div>

        {/* Right: Days */}
        {DaysGrid}
      </div>
      </DndContext>
      
      {/* CSV Import Modal */}
      {showCSVModal && plan && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Import CSV to {plan.name}</h2>
              <button
                onClick={() => setShowCSVModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Upload CSV File</label>
                <p className="text-xs text-zinc-400 mb-2">
                  Tab-separated format with columns: day, Exercise, Type, Sets/Rounds, Rest between rounds (s), Work (seconds), Reps, Kg, Duration (min), Distance (KM)
                </p>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  disabled={importing}
                    onChange={async (e) => {
                      try {
                        console.log('🚀 FILE UPLOAD TRIGGERED');
                        const file = e.target.files?.[0];
                        console.log('📁 File selected:', file?.name, 'Size:', file?.size, 'bytes');
                        
                        if (!file) {
                          console.error('❌ No file selected');
                          toast({ description: "No file selected", variant: "destructive" as any });
                          return;
                        }
                        
                        if (!plan) {
                          console.error('❌ No plan loaded');
                          toast({ description: "No plan loaded", variant: "destructive" as any });
                          return;
                        }
                        
                        console.log('✅ Starting import for plan:', plan.name, 'Plan ID:', plan.id);
                        
                        setImporting(true);
                        console.log('📖 Reading file...');
                        const text = await file.text();
                        console.log('✅ File read successfully, length:', text.length, 'characters');
                        console.log('📄 First 200 chars:', text.substring(0, 200));
                        
                        // Parse CSV - detect delimiter (comma or tab)
                        const lines = text.trim().split("\n");
                      console.log('📄 Total lines in file:', lines.length);
                      console.log('📄 First line (raw):', lines[0]);
                      
                      // Auto-detect delimiter: comma or tab
                      const delimiter = lines[0].includes('\t') ? '\t' : ',';
                      console.log('🔍 Detected delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
                      
                      const headers = lines[0].split(delimiter);
                      console.log('📄 CSV Headers:', headers);
                      console.log('📄 Number of headers:', headers.length);
                      
                      const rows: any[] = [];
                      
                      for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];
                        if (!line.trim()) continue; // Skip empty lines
                        
                        console.log(`\n🔍 Line ${i} (raw):`, line);
                        
                        const values = line.split(delimiter);
                        console.log(`  Split into ${values.length} values:`, values);
                        
                        if (values.length < headers.length) {
                          console.log(`⚠️ Skipping line ${i}: has ${values.length} columns but expected ${headers.length}`);
                          continue;
                        }
                        
                        const row: any = {};
                        headers.forEach((header, idx) => {
                          const val = values[idx]?.trim();
                          if (header === "day" || header.includes("Rounds") || header.includes("seconds") || 
                              header.includes("min") || header.includes("KM") || header.includes("Kg")) {
                            row[header] = val && val !== "" ? parseFloat(val) : null;
                          } else {
                            row[header] = val || "";
                          }
                        });
                        
                        console.log(`  Parsed row:`, row);
                        console.log(`  Has day? ${!!row.day}, Has Exercise? ${!!row.Exercise}`);
                        
                        if (row.day && row.Exercise) {
                          rows.push(row);
                          console.log(`✅ Added row ${i} to import list`);
                        } else {
                          console.log(`⚠️ Skipping line ${i}: missing day (${row.day}) or Exercise (${row.Exercise})`);
                        }
                      }
                      
                      console.log(`📊 Total parsed rows: ${rows.length}`);
                      toast({ description: `Parsed ${rows.length} rows` });
                      
                      // Simple Levenshtein distance for fuzzy matching
                      const levenshtein = (a: string, b: string): number => {
                        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
                        for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
                        for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
                        for (let j = 1; j <= b.length; j++) {
                          for (let i = 1; i <= a.length; i++) {
                            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                            matrix[j][i] = Math.min(
                              matrix[j][i - 1] + 1,
                              matrix[j - 1][i] + 1,
                              matrix[j - 1][i - 1] + cost
                            );
                          }
                        }
                        return matrix[b.length][a.length];
                      };
                      
                      // Fetch all exercises for matching
                      const { data: dbExercises, error: exercisesError } = await supabase
                        .from("exercises")
                        .select("id, name, modality");
                      
                      if (exercisesError || !dbExercises) {
                        console.error('❌ Failed to fetch exercises:', exercisesError);
                        toast({ description: "Failed to fetch exercises", variant: "destructive" as any });
                        return;
                      }
                      
                      console.log(`💪 Loaded ${dbExercises.length} exercises from database`);
                      
                      // Group by day
                      const dayGroups = new Map<number, any[]>();
                      rows.forEach((row) => {
                        if (!dayGroups.has(row.day)) dayGroups.set(row.day, []);
                        dayGroups.get(row.day)!.push(row);
                      });
                      
                      console.log(`📅 Day groups:`, Array.from(dayGroups.entries()).map(([day, rows]) => ({ day, count: rows.length })));
                      
                      // Show live progress modal
                      setImportProgress({
                        show: true,
                        logs: ['🚀 Starting import...', `📊 Total rows to process: ${rows.length}`],
                        currentRow: 0,
                        totalRows: rows.length,
                        pausedForMapping: false,
                        unmappedExercise: null,
                        suggestions: [],
                        showCreateNew: false,
                        newExerciseModality: 'strength'
                      });
                      setShowCSVModal(false);
                      
                      // Wait for modal to render, then start import
                      await new Promise(resolve => setTimeout(resolve, 100));
                      
                      // Exercise mapping cache (user selections during import)
                      const exerciseCache = new Map<string, any>();
                      
                      // Import each day
                      for (const [dayNum, dayRows] of dayGroups.entries()) {
                        console.log(`\n🏃 Processing Day ${dayNum} with ${dayRows.length} rows`);
                        addImportLog(`Processing Day ${dayNum} (${dayRows.length} rows)...`);
                        
                        // Get or create plan_day
                        let { data: planDay, error: planDayError } = await supabase
                          .from("plan_days")
                          .select("id")
                          .eq("plan_id", plan.id)
                          .eq("day_index", dayNum - 1)
                          .single();
                        
                        if (!planDay) {
                          console.log(`  ➕ Creating plan_day for day_index ${dayNum - 1}`);
                          const { data: newDay, error: createError } = await supabase
                            .from("plan_days")
                            .insert({
                              plan_id: plan.id,
                              day_index: dayNum - 1,
                              name: `Day ${dayNum}`,
                              is_rest: false,
                            })
                            .select()
                            .single();
                          
                          if (createError) {
                            console.error(`  ❌ Failed to create plan_day:`, createError);
                          } else {
                            console.log(`  ✅ Created plan_day:`, newDay);
                          }
                          planDay = newDay;
                        } else {
                          console.log(`  ✅ Found existing plan_day:`, planDay.id);
                        }
                        
                        if (!planDay) {
                          console.error(`  ❌ No plan_day for day ${dayNum}, skipping`);
                          continue;
                        }
                        
                        // Get or create session
                        let { data: session, error: sessionError } = await supabase
                          .from("sessions")
                          .select("id")
                          .eq("plan_day_id", planDay.id)
                          .single();
                        
                        if (!session) {
                          console.log(`  ➕ Creating session for plan_day ${planDay.id}`);
                          const { data: newSession, error: createSessionError } = await supabase
                            .from("sessions")
                            .insert({
                              plan_day_id: planDay.id,
                              name: `Day ${dayNum} Session`,
                              order_index: 0,
                            })
                            .select()
                            .single();
                          
                          if (createSessionError) {
                            console.error(`  ❌ Failed to create session:`, createSessionError);
                          } else {
                            console.log(`  ✅ Created session:`, newSession);
                          }
                          session = newSession;
                        } else {
                          console.log(`  ✅ Found existing session:`, session.id);
                        }
                        
                        if (!session) {
                          console.error(`  ❌ No session for day ${dayNum}, skipping`);
                          continue;
                        }
                        
                        // Get max order_index
                        const { data: existingBlocks } = await supabase
                          .from("session_blocks")
                          .select("order_index")
                          .eq("session_id", session.id)
                          .order("order_index", { ascending: false })
                          .limit(1);
                        
                        let orderIndex = existingBlocks?.[0]?.order_index ?? -1;
                        
                        // NOTE: Removed pre-pass that created circuit wrappers up-front.
                        // We now create/update circuit blocks exactly at their CSV position.
                        
                        // Process rows
                        let i = 0;
                        while (i < dayRows.length) {
                          const row = dayRows[i];
                          const rowType = (row.Type || "").trim().toLowerCase();
                          console.log(`\n  📍 Row ${i}: Type="${row.Type}" → trimmed: "${rowType}", Exercise="${row.Exercise}"`);
                          
                          // Update progress
                          setImportProgress(prev => ({ ...prev, currentRow: prev.currentRow + 1 }));
                          
                          // Intro: write day description from legacy CSV format
                          if (rowType === "intro") {
                            try {
                              const desc = (row.Exercise || '').toString();
                              if (desc) {
                                await supabase.from('plan_days').update({ description: desc }).eq('id', planDay.id);
                                setDays(prev => prev.map((x:any) => x.id === planDay!.id ? { ...x, description: desc } : x));
                                addImportLog(`📝 Day ${dayNum}: set description to "${desc}"`, 'success');
                              }
                            } catch (e:any) {
                              addImportLog(`❌ Failed to set description for Day ${dayNum}: ${e?.message || e}`, 'error');
                            }
                            i++;
                            continue;
                          }

                          if (rowType === "circuit") {
                            try {
                              console.log(`    🔄 Circuit detected: ${row.Exercise}`, row);
                              // Create/Reuse block up front so wrapper exists even if mapping pauses
                              const beforeBlocks = await supabase
                                .from('session_blocks')
                                .select('id, block_type, title, rounds, work_sec, rest_sec, rest_between_rounds_s, order_index')
                                .eq('session_id', session.id)
                                .eq('title', row.Exercise);
                              console.log('🟡 BEFORE circuit blocks for title:', row.Exercise, beforeBlocks.data || [], beforeBlocks.error || null);
                              const roundsVal = row["Sets/Rounds"] || 1;
                              const headerDurationMin = row["Duration (min)"] || null;
                              const isTimedCircuit = headerDurationMin && Number(headerDurationMin) > 0;
                              const timeCapSec = isTimedCircuit ? Math.round(Number(headerDurationMin) * 60) : null;
                              
                              console.log(`    🔍 Circuit "${row.Exercise}" - Duration: ${headerDurationMin}, isTimedCircuit: ${isTimedCircuit}, timeCapSec: ${timeCapSec}`);
                              
                              // Reuse by title
                              let { data: preBlock } = await supabase
                                .from('session_blocks')
                                .select('id')
                                .eq('session_id', session.id)
                                .eq('title', row.Exercise)
                                .maybeSingle();
                              if (!preBlock) {
                                const inserted = await supabase
                                  .from('session_blocks')
                                  .insert({
                                    session_id: session.id,
                                    block_type: isTimedCircuit ? 'amrap' : 'circuit',
                                    title: row.Exercise,
                                    rounds: isTimedCircuit ? null : roundsVal,
                                    work_sec: null,  // Don't set to 0 - leave as null for rounds-based circuits
                                    rest_sec: null,  // Don't set to 0 - leave as null for rounds-based circuits
                                    rest_between_rounds_s: null,
                                    time_cap_sec: timeCapSec,
                                    order_index: orderIndex + 1,
                                  })
                                  .select()
                                  .single();
                                preBlock = inserted.data as any;
                                if (inserted.error) console.error('    ❌ Failed to pre-create circuit block:', inserted.error);
                                else console.log(`    ✅ Pre-created circuit block: ${preBlock?.id}`);
                              } else {
                                // Update existing block to ensure block_type and time_cap_sec are current
                                console.log(`    ↩︎ Updating existing circuit block: ${preBlock.id}`);
                                await supabase
                                  .from('session_blocks')
                                  .update({
                                    block_type: isTimedCircuit ? 'amrap' : 'circuit',
                                    rounds: isTimedCircuit ? null : roundsVal,
                                    time_cap_sec: timeCapSec,
                                    work_sec: null,  // Clear any old timing values
                                    rest_sec: null,
                                    rest_between_rounds_s: null,
                                  })
                                  .eq('id', preBlock.id);
                              }

                              const circuitBlockId = preBlock?.id;
                              // Now collect exercises to add as items
                              const circuitExercises: any[] = [];
                              let restBetweenRounds = null;
                              i++;
                              console.log(`      Starting to collect circuit exercises from row ${i}...`);
                              
                              while (i < dayRows.length) {
                              try {
                                const nextRow = dayRows[i];
                                if (!nextRow || !nextRow.Type) {
                                  console.warn(`      ⚠️  Row ${i} is invalid, breaking`);
                                  break;
                                }
                                
                                const nextType = String(nextRow.Type).trim().toLowerCase();
                                console.log(`      [${i}] Type="${nextRow.Type}" → "${nextType}", Ex="${nextRow.Exercise}"`);
                                
                                const isCircuitEx = (nextType === "circuit_exercise");
                                const isRest = (nextType === "circuit_exercise_rest");
                                const isOther = !isCircuitEx && !isRest;
                                
                                console.log(`      → circuit_ex?${isCircuitEx}, rest?${isRest}, other?${isOther}`);
                                
                                if (isCircuitEx) {
                                  circuitExercises.push(nextRow);
                                  console.log(`      ✅ ADDED: ${nextRow.Exercise}`);
                                  i++;
                                  continue;
                                }
                                
                                if (isRest) {
                                  restBetweenRounds = nextRow["Work (seconds)"] || null;
                                  console.log(`      ⏸️  REST: ${restBetweenRounds}s`);
                                  i++;
                                  break;
                                }
                                
                                // Other type - stop collecting
                                console.log(`      ⏹️  STOP (found ${nextType})`);
                                break;
                              } catch (loopErr: any) {
                                console.error(`❌ Loop error at row ${i}:`, loopErr);
                                break;
                              }
                            }
                            
                            console.log(`    🎯 Circuit "${row.Exercise}" has ${circuitExercises.length} exercises`);
                            
                            if (circuitExercises.length === 0) {
                              console.log(`    ⚠️ Circuit has no exercises yet — creating an EMPTY circuit block (will be safe to re-run importer to add items).`);
                            }
                            
                            orderIndex++;
                            // Reuse headerDurationMin, isTimedCircuit, and timeCapSec from above (already declared at lines 2568-2570)
                            const workSecRaw = circuitExercises[0]?.["Work (seconds)"] ?? null;
                            const restSecRaw = circuitExercises[0]?.["Rest between rounds (s)"] ?? null;
                            const workSec = (typeof workSecRaw === 'string' ? parseFloat(workSecRaw) : workSecRaw) || null;
                            const restSec = (typeof restSecRaw === 'string' ? parseFloat(restSecRaw) : restSecRaw) || null;
                            const restBetween = (typeof restBetweenRounds === 'string' ? parseFloat(restBetweenRounds) : restBetweenRounds) || null;
                            
                            console.log(`    📦 Creating/Updating ${isTimedCircuit ? 'timed AMRAP' : 'circuit'} block:`, {
                              title: row.Exercise,
                              work_sec: workSec,
                              rest_sec: restSec,
                              rounds: isTimedCircuit ? null : roundsVal,
                              time_cap_sec: timeCapSec,
                              rest_between_rounds_s: restBetween,
                              first_exercise: circuitExercises[0] || null
                            });
                            // Ensure timings/rounds are updated on the pre-created block
                            let block = { id: circuitBlockId } as any;
                            const upd = await supabase
                              .from('session_blocks')
                              .update({
                                work_sec: workSec,      // null if no timings specified
                                rest_sec: restSec,      // null if no timings specified
                                rest_between_rounds_s: restBetween,  // null if not specified
                                rounds: isTimedCircuit ? null : roundsVal,
                                order_index: orderIndex,
                                block_type: isTimedCircuit ? 'amrap' : 'circuit',
                                time_cap_sec: timeCapSec,
                              })
                              .eq('id', circuitBlockId!)
                              .select('id')
                              .single();
                            if (upd.error) console.error('    ❌ Failed to update circuit timings:', upd.error);
                            else block = upd.data as any;

                            // Debug AFTER state
                            const afterBlock = await supabase
                              .from('session_blocks')
                              .select('id, block_type, title, rounds, work_sec, rest_sec, rest_between_rounds_s, order_index')
                              .eq('id', block.id)
                              .single();
                            const afterItems = await supabase
                              .from('session_block_items')
                              .select('id, exercise_id, item_order')
                              .eq('block_id', block.id);
                            console.log('🟢 AFTER circuit block:', afterBlock.data || null, afterBlock.error || null);
                            console.log('🧩 AFTER items for block:', (afterItems.data || []).length, afterItems.data || [], afterItems.error || null);
                            
                            if (!block) {
                              console.error(`    ❌ No block returned`);
                              continue;
                            }
                            
                            console.log(`    ✅ Created block ID: ${block.id}`);

                            // Prepare existing items and compute append base order
                            const { data: existingItemsRaw } = await supabase
                              .from('session_block_items')
                              .select('id, exercise_id, item_order')
                              .eq('block_id', block.id);
                            const existingItems = existingItemsRaw || [];
                            let nextOrder = (existingItems.reduce((m: number, it: any) => Math.max(m, it.item_order ?? -1), -1) + 1);
                            const existingExerciseIds = new Set((existingItems as any[]).map(it => String(it.exercise_id)));

                            // Add circuit exercises (append-only)
                            for (let j = 0; j < circuitExercises.length; j++) {
                              const ex = circuitExercises[j];
                              let matchedEx = dbExercises.find(
                                (e) => e.name.toLowerCase().trim() === ex.Exercise.toLowerCase().trim()
                              );
                              
                              if (!matchedEx) {
                                // Ask the user to map/create/skip
                                const selected = await waitForMapping(ex.Exercise, dbExercises, levenshtein);
                                if (!selected) {
                                  console.warn(`      ⏭️ Skipping exercise: ${ex.Exercise}`);
                                  continue;
                                }
                                matchedEx = selected;
                                if (!dbExercises.find((e) => e.id === matchedEx.id)) {
                                  dbExercises.push(matchedEx);
                                }
                              }
                              
                              if (!matchedEx || !matchedEx.id) {
                                addImportLog(`❌ Mapping failed for "${ex.Exercise}" (no selection)`, 'error');
                                console.warn(`      ❌ Mapping returned invalid value for: ${ex.Exercise}`, matchedEx);
                                continue;
                              }
                              console.log(`      ✅ Matched: "${ex.Exercise}" → ${matchedEx.name} (${matchedEx.id})`);
                              
                              // Skip if exercise already exists in this block
                              if (existingExerciseIds.has(String(matchedEx.id))) {
                                console.log(`      ↩︎ Exercise already present in block: ${matchedEx.name}`);
                                continue;
                              }

                              const durationFromMin = ex["Duration (min)"];
                              const durationFromWorkSec = ex["Work (seconds)"] ? Number(ex["Work (seconds)"]) / 60 : null;
                              const computedDuration = durationFromMin ?? durationFromWorkSec ?? null;

                              const { data: item, error: itemError } = await supabase.from("session_block_items").insert({
                                block_id: block.id,
                                exercise_id: matchedEx.id,
                                item_order: nextOrder,
                                extra: {
                                  duration: computedDuration,
                                  sets: ex["Sets/Rounds"],
                                  reps: ex.Reps,
                                  weight: ex.Kg,
                                  distance: ex["Distance (KM)"],
                                },
                              }).select().single();
                              
                              if (itemError) {
                                console.error(`      ❌ Failed to insert item:`, itemError);
                              } else {
                                console.log(`      ✅ Inserted item: ${item.id}`);
                                existingExerciseIds.add(String(matchedEx.id));
                                nextOrder++;
                              }
                            }
                            } catch (circuitErr: any) {
                              console.error(`❌❌❌ CIRCUIT PROCESSING ERROR:`, circuitErr);
                              console.error(`Circuit: ${row.Exercise}`, circuitErr.message, circuitErr.stack);
                              alert(`Circuit error: ${circuitErr.message}`);
                              // Skip this circuit and continue
                              i++;
                            }
                          } else if (rowType !== "circuit_exercise" && rowType !== "circuit_exercise_rest") {
                            console.log(`    💪 Standalone exercise: ${row.Exercise} (${rowType})`, row);
                            // Standalone exercise
                            let matchedEx = dbExercises.find(
                              (e) => e.name.toLowerCase().trim() === row.Exercise.toLowerCase().trim()
                            );
                            
                            if (!matchedEx) {
                              const selected = await waitForMapping(row.Exercise, dbExercises, levenshtein);
                              if (!selected) {
                                console.warn(`    ⏭️ Skipping exercise: ${row.Exercise}`);
                                i++;
                                continue;
                              }
                              matchedEx = selected;
                              if (!dbExercises.find((e) => e.id === matchedEx.id)) {
                                dbExercises.push(matchedEx);
                              }
                            }
                            
                            if (!matchedEx || !matchedEx.id) {
                              addImportLog(`❌ Mapping failed for "${row.Exercise}" (no selection)`, 'error');
                              console.warn(`    ❌ Mapping returned invalid value for: ${row.Exercise}`, matchedEx);
                              i++;
                              continue;
                            }
                            console.log(`    ✅ Matched: "${row.Exercise}" → ${matchedEx.name} (${matchedEx.id})`);
                            
                            // Map CSV type to block_type
                            let blockType = "cardio"; // default
                            if (rowType === "running") blockType = "cardio";
                            else if (rowType === "strength" || rowType === "weights") blockType = "strength";
                            else if (rowType === "mobility") blockType = "mobility";
                            else if (rowType === "bodyweight") blockType = "mobility"; // bodyweight core-style moves behave like time-based
                            else if (rowType === "intervals") blockType = "intervals";
                            else if (rowType === "amrap") blockType = "amrap";
                            else if (rowType === "emom") blockType = "emom";
                            
                            console.log(`    🗂️  Using block_type: ${blockType} for CSV type: ${rowType}`);
                            
                            orderIndex++;
                            const { data: block, error: blockError } = await supabase
                              .from("session_blocks")
                              .insert({
                                session_id: session.id,
                                block_type: blockType,
                                title: row.Exercise,
                                order_index: orderIndex,
                              })
                              .select()
                              .single();
                            
                            if (blockError) {
                              console.error(`    ❌ Failed to create standalone block:`, blockError);
                              i++;
                              continue;
                            }
                            
                            if (!block) {
                              console.error(`    ❌ No block returned for standalone`);
                              i++;
                              continue;
                            }
                            
                            console.log(`    ✅ Created standalone block ID: ${block.id}`);
                            
                            // Prefer Duration (min); fallback to Work (seconds)/60 when provided
                            const durationFromMin = row["Duration (min)"];
                            const durationFromWorkSec = row["Work (seconds)"] ? Number(row["Work (seconds)"]) / 60 : null;
                            const computedDuration = durationFromMin ?? durationFromWorkSec ?? null;

                            const { data: item, error: itemError } = await supabase.from("session_block_items").insert({
                              block_id: block.id,
                              exercise_id: matchedEx.id,
                              item_order: 0,
                              extra: {
                                duration: computedDuration,
                                sets: row["Sets/Rounds"],
                                reps: row.Reps,
                                weight: row.Kg,
                                distance: row["Distance (KM)"],
                              },
                            }).select().single();
                            
                            if (itemError) {
                              console.error(`    ❌ Failed to insert standalone item:`, itemError);
                            } else {
                              console.log(`    ✅ Inserted standalone item: ${item.id}`);
                            }
                            
                            i++;
                          } else {
                            console.log(`    ⏭️  Skipping row type: ${row.Type}`);
                            i++;
                          }
                        }
                      }
                      
                      console.log(`\n🎉 Import complete! Processed ${rows.length} rows`);
                      toast({ description: `✅ Imported ${rows.length} rows. Logs retained.`, duration: 6000 as any });
                      
                      // Keep the progress modal OPEN so logs are visible until user closes it
                      setImportProgress(prev => ({ ...prev, pausedForMapping: false }));
                      } catch (err: any) {
                        console.error("❌❌❌ IMPORT ERROR:", err);
                        console.error("Error name:", err?.name);
                        console.error("Error message:", err?.message);
                        console.error("Error stack:", err?.stack);
                        alert(`Import failed: ${err?.message || err}`); // Alert so it doesn't disappear
                        toast({ 
                          description: `Import failed: ${err?.message || err}`, 
                          variant: "destructive" as any,
                          duration: 10000 // 10 seconds
                        });
                      } finally {
                        setImporting(false);
                      }
                  }}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>
              
              {importing && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Live Import Progress Modal */}
      {importProgress.show && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {importProgress.pausedForMapping ? '⏸️ Import Paused - Exercise Mapping Required' : '🔄 Importing CSV...'}
              </h2>
              {!importProgress.pausedForMapping && !importing && (
                <button
                  onClick={() => {
                    setImportProgress({ 
                      show: false, 
                      logs: [], 
                      currentRow: 0, 
                      totalRows: 0, 
                      pausedForMapping: false, 
                      unmappedExercise: null, 
                      suggestions: [],
                      showCreateNew: false,
                      newExerciseModality: 'strength'
                    });
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Row {importProgress.currentRow} / {importProgress.totalRows}</span>
                <span>{Math.round((importProgress.currentRow / importProgress.totalRows) * 100)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.currentRow / importProgress.totalRows) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Logs */}
            <div className="flex-1 bg-black rounded-lg p-4 overflow-y-auto font-mono text-xs mb-4" style={{ maxHeight: '300px' }}>
              {importProgress.logs.map((log, idx) => (
                <div key={idx} className="mb-1">{log}</div>
              ))}
            </div>
            
            {/* Exercise Mapping UI (shown when paused) */}
            {importProgress.pausedForMapping && importProgress.unmappedExercise && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4">
                <div className="font-semibold mb-2 text-yellow-400">
                  Exercise not found: "{importProgress.unmappedExercise}"
                </div>
                
                {!importProgress.showCreateNew ? (
                  <div className="space-y-2">
                    {importProgress.suggestions.length > 0 && (
                      <>
                        <div className="text-xs text-zinc-400 mb-2">Select a matching exercise:</div>
                        {importProgress.suggestions.map((suggestion, idx) => (
                      <button
                            key={idx}
                            onClick={() => {
                          // User selected a mapping - resolve and resume import
                          addImportLog(`Mapped "${importProgress.unmappedExercise}" → ${suggestion.name}`, 'success');
                          if (mappingResolverRef.current) {
                            mappingResolverRef.current({ selectedExercise: suggestion });
                          }
                          setImportProgress(prev => ({
                            ...prev,
                            pausedForMapping: false,
                            unmappedExercise: null,
                            suggestions: [],
                            showCreateNew: false
                          }));
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-left"
                          >
                            <span>{suggestion.name}</span>
                            <span className="text-xs text-zinc-500">({suggestion.modality})</span>
                          </button>
                        ))}
                        <div className="border-t border-zinc-700 my-2"></div>
                      </>
                    )}
                    
                    <button
                      onClick={() => {
                        setImportProgress(prev => ({ ...prev, showCreateNew: true }));
                      }}
                      className="w-full p-2 rounded bg-green-900/30 hover:bg-green-900/50 text-green-400"
                    >
                      ➕ Create New Exercise "{importProgress.unmappedExercise}"
                    </button>
                    
                    <button
                      onClick={() => {
                        // Skip this exercise
                        addImportLog(`Skipped "${importProgress.unmappedExercise}"`, 'warning');
                        if (mappingResolverRef.current) {
                          mappingResolverRef.current({ selectedExercise: null });
                        }
                        setImportProgress(prev => ({
                          ...prev,
                          pausedForMapping: false,
                          unmappedExercise: null,
                          suggestions: [],
                          showCreateNew: false
                        }));
                      }}
                      className="w-full p-2 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400"
                    >
                      Skip this exercise
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-green-400 mb-2">Create new exercise:</div>
                    
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Exercise Name:</label>
                      <input
                        type="text"
                        value={importProgress.unmappedExercise || ''}
                        disabled
                        className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 opacity-60"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Modality (Type):</label>
                      <select
                        value={importProgress.newExerciseModality}
                        onChange={(e) => setImportProgress(prev => ({ ...prev, newExerciseModality: e.target.value }))}
                        className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
                      >
                        <option value="strength">Strength</option>
                        <option value="cardio">Cardio</option>
                        <option value="mobility">Mobility</option>
                        <option value="bodyweight">Bodyweight</option>
                        <option value="running">Running</option>
                        <option value="erg">Erg (Rowing/Ski/Bike)</option>
                        <option value="core">Core</option>
                        <option value="skill">Skill</option>
                        <option value="carry">Carry</option>
                        <option value="rehab">Rehab</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setImportProgress(prev => ({ ...prev, showCreateNew: false }));
                        }}
                        className="flex-1 px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
                      >
                        Back
                      </button>
                      <button
                        onClick={async () => {
                          // Create the exercise in Supabase
                          const exerciseName = importProgress.unmappedExercise;
                          const modality = importProgress.newExerciseModality;
                          
                          addImportLog(`Creating new exercise: ${exerciseName} (${modality})...`, 'info');
                          
                          try {
                            const { data: newExercise, error } = await supabase
                              .from('exercises')
                              .insert({
                                name: exerciseName,
                                modality: modality,
                                notes: `Auto-created during CSV import`
                              })
                              .select()
                              .single();
                            
                            if (error) throw error;
                            
                            addImportLog(`✅ Created new exercise: ${newExercise.name} (ID: ${newExercise.id})`, 'success');
                            
                            // Resume import with this new exercise
                            if (mappingResolverRef.current) {
                              mappingResolverRef.current({ selectedExercise: newExercise });
                            }
                            setImportProgress(prev => ({
                              ...prev,
                              pausedForMapping: false,
                              unmappedExercise: null,
                              suggestions: [],
                              showCreateNew: false,
                              newExerciseModality: 'strength'
                            }));
                          } catch (err: any) {
                            addImportLog(`❌ Failed to create exercise: ${err.message}`, 'error');
                            toast({ description: `Failed to create exercise: ${err.message}`, variant: 'destructive' as any });
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded bg-green-600 hover:bg-green-700 font-semibold"
                      >
                        Create & Continue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Status */}
            {importing && !importProgress.pausedForMapping && (
              <div className="flex items-center gap-2 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
            
            {!importing && !importProgress.pausedForMapping && importProgress.currentRow === importProgress.totalRows && (
              <div className="text-green-400 font-semibold">
                ✅ Import complete!
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Assistant */}
      {showAIAssistant && plan && (
        <AIAssistant
          planId={plan.id}
          dayId={selectedDayId || filteredDays[0]?.id || ''}
          clientId={plan.client_id}
          availableDays={filteredDays.map(day => ({
            id: day.id,
            label: day.label || `Day ${day.day_index + 1}`,
            dayIndex: day.day_index
          }))}
          onClose={() => setShowAIAssistant(false)}
          onWorkoutCreated={async () => {
            // Refresh the plan data after AI creates workout
            console.log('🔄 Refreshing workout data...');
            
            // Simple refresh: just reload the page after a short delay
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            toast({ 
              title: "Workout created!", 
              description: "Refreshing page to show new workouts..." 
            });
          }}
        />
      )}
    </>
  );
};

export default PlanDetail;



