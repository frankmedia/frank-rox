import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { Pause, Check, Dumbbell, Activity, Gauge, Timer, Repeat, AlarmClock, Package, Move, Lightbulb, CircleDot, Trash2, StretchHorizontal, Loader2, RefreshCcw, Save, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { useSortable, SortableContext, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateHyroxWeek, clearDay as clearHyroxDay } from "@/services/generators/hyroxGenerator";

interface Plan { id: string; name: string; cycle_days?: number }
interface PlanDay { id: string; day_index: number; label?: string; is_rest?: boolean; description?: string }
interface Exercise { id: string; name: string; modality?: string; primary_area?: string; pattern?: string; tags?: string | null; equipment?: string[] | null }
interface RenderedItem { id: string; name: string; modality?: string; item_order?: number }
interface GroupItem { id: string; name: string; modality?: string }
interface Group { blockId: string; sessionId: string; title: string; blockType: string; collapsed?: boolean; parameters?: any; items: GroupItem[] }

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
  const [modalityFilter, setModalityFilter] = useState<string | null>(null);
  const { toast } = useToast();
  const [itemsByDay, setItemsByDay] = useState<Record<string, RenderedItem[]>>({});
  const [readyDays, setReadyDays] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ id: string; dayId: string; sets?: number; reps?: number; weight?: number; rest?: number; tempo?: string } | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [openMetcon, setOpenMetcon] = useState<boolean>(() => localStorage.getItem('ui.metconOpen') === '1');
  const [openIntervals, setOpenIntervals] = useState<boolean>(() => localStorage.getItem('ui.intervalsOpen') === '1');
  const [groupsByDay, setGroupsByDay] = useState<Record<string, Group[]>>({});
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [savingPlanName, setSavingPlanName] = useState<boolean>(false);
  const [planNameSaved, setPlanNameSaved] = useState<boolean>(false);

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
      if (mod === 'core' || mod === 'mobility' || mod === 'skill' || mod === 'carry' || mod === 'circuit') {
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
        rest: typeof extra.duration_min === 'number' ? extra.duration_min : undefined,
        weight: typeof extra.distance_m === 'number' ? extra.distance_m : undefined,
        tempo: typeof extra.intensity === 'string' ? extra.intensity : undefined,
      });
    } catch {
      setEditing({ id: itemId, dayId });
    }
  }

  function EditorStrength(itId: string, dayId: string) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={() => setEditing({ ...editing!, sets: 3, reps: 10 })} className="h-8 px-2 rounded border border-zinc-700">3×10</button>
          <button onClick={() => setEditing({ ...editing!, sets: 4, reps: 8 })} className="h-8 px-2 rounded border border-zinc-700">4×8</button>
          <button onClick={() => setEditing({ ...editing!, sets: 5, reps: 5 })} className="h-8 px-2 rounded border border-zinc-700">5×5</button>
          <button onClick={() => setEditing({ ...editing!, sets: 4, reps: 12 })} className="h-8 px-2 rounded border border-zinc-700">4×12</button>
          <button onClick={() => setEditing({ ...editing!, sets: 3, reps: 15 })} className="h-8 px-2 rounded border border-zinc-700">3×15</button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2"><span>Sets</span>
            <input type="number" className="w-20 h-10 bg-black border border-zinc-700 rounded px-2" value={editing?.sets ?? ''} onChange={(e)=>setEditing({ ...editing!, sets: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2"><span>Reps</span>
            <input type="number" className="w-20 h-10 bg-black border border-zinc-700 rounded px-2" value={editing?.reps ?? ''} onChange={(e)=>setEditing({ ...editing!, reps: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2"><span>Kg</span>
            <button onClick={()=>setEditing({ ...editing!, weight: Math.max(0,(editing?.weight??0)-2.5) })} className="w-20 h-10 border border-zinc-700 rounded">-2.5</button>
            <input type="number" className="w-20 h-10 bg-black border border-zinc-700 rounded px-2" value={editing?.weight ?? ''} onChange={(e)=>setEditing({ ...editing!, weight: Number(e.target.value) })} />
            <button onClick={()=>setEditing({ ...editing!, weight: (editing?.weight??0)+2.5 })} className="w-20 h-10 border border-zinc-700 rounded">+2.5</button>
          </div>
          <div className="flex items-center gap-2"><span>Rest</span>
            <select className="w-20 h-10 bg-black border border-zinc-700 rounded px-2" value={editing?.rest ?? 60} onChange={(e)=>setEditing({ ...editing!, rest: Number(e.target.value) })}>
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
              <option value={120}>120</option>
            </select>
          </div>
          <div className="flex items-center gap-2"><span>Tempo</span>
            <input className="w-20 h-10 bg-black border border-zinc-700 rounded px-2" placeholder="e.g. 3-1-1" value={editing?.tempo ?? ''} onChange={(e)=>setEditing({ ...editing!, tempo: e.target.value })} />
          </div>
          <div className="ml-auto">
            <button
              onClick={async ()=>{
                try {
                  const extra:any = { sets: editing?.sets, reps: editing?.reps, weight_kg: editing?.weight, rest_sec: editing?.rest, tempo: editing?.tempo };
                  await supabase.from('session_block_items').update({ extra }).eq('id', itId);
                  setEditing(null);
                  toast({ description: 'Saved' });
                } catch(e:any){ toast({ description: e?.message || 'Save failed', variant: 'destructive' as any}); }
              }}
              className="px-3 py-1 rounded border border-yellow-500 text-yellow-400 text-xs"
            >Save</button>
          </div>
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
          <div className="flex flex-wrap items-center gap-2 max-w-full"><span>Distance (m)</span>
            <input type="number" className="w-14 h-8 bg-black border border-zinc-700 rounded px-1" value={editing?.weight ?? ''} onChange={(e)=>setEditing({ ...editing!, weight: Number(e.target.value) })} />
            {[1000,5000,10000].map(d=> {
              const active = editing?.weight === d;
              return (
                <button key={d} onClick={()=>setEditing({ ...editing!, weight: d })} className={`w-14 h-8 inline-flex items-center justify-center rounded border ${active ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700'}`}>{d/1000}k</button>
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
                  const extra:any = { duration_min: editing?.rest, distance_m: editing?.weight, intensity: editing?.tempo };
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

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = exercises;
    if (modalityFilter) {
      list = list.filter((e) => (e.modality || "").toLowerCase() === modalityFilter);
    }
    if (!q) return list;
    return list.filter((e) => {
      const haystack = [
        e.name,
        e.modality,
        e.primary_area,
        e.pattern,
        e.tags || "",
        (e.equipment || []).join(","),
      ]
        .filter(Boolean)
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
        return { chip: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/15', Icon: Activity };
      case 'core':
        return { chip: 'border-purple-500/40 text-purple-300 bg-purple-500/15', Icon: CircleDot };
      case 'mobility':
        return { chip: 'border-teal-500/40 text-teal-300 bg-teal-500/15', Icon: StretchHorizontal };
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

  const CompactItemRow = React.memo(({ sid, it, dayId, chip, Icon, editing, toggleEditorWithData, removeItem, EditorStrength, EditorEndurance, EditorIntervals, EditorAccessory }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sid });
    const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
    return (
      <div ref={setNodeRef} style={style} className={`w-full text-xs px-2 py-1 rounded border ${chip}`}>
        <div className="inline-flex items-center justify-between w-full">
          <div className="inline-flex items-center gap-2">
            <span title="Drag to reorder" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-yellow-500">
              <Move className="w-5 h-5" />
            </span>
            <Icon className="w-3 h-3" />
            <span>{it.name}</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <button onClick={() => toggleEditorWithData(it.id, dayId, it.modality)} className="text-[11px] underline opacity-80 hover:opacity-100">Edit</button>
            <button onClick={()=>removeItem(it.id, dayId)} className="opacity-70 hover:opacity-100" title="Delete exercise"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
        {editing?.id === it.id && editing.dayId === dayId && (
          <div className="mt-2 bg-black/30 rounded-md p-2 border border-zinc-800">
            {it.modality === 'strength' ? EditorStrength(it.id, dayId) : null}
            {it.modality === 'running' || it.modality === 'cardio' || it.modality === 'erg' ? EditorEndurance(it.id, dayId) : null}
            {it.modality === 'intervals' || it.modality === 'hiit' || it.modality === 'emom' ? EditorIntervals(it.id) : null}
            {it.modality === 'core' || it.modality === 'mobility' || it.modality === 'skill' || it.modality === 'carry' || it.modality === 'circuit' ? EditorAccessory(it.id) : null}
          </div>
        )}
      </div>
    );
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
      if (!dstG || dstIdx < 0) return;
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
        await supabase.from('session_block_items').insert({ block_id: blockId, exercise_id: ex.id, status: 'draft' });
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
        await supabase.from('session_block_items').insert({ block_id: blockId, exercise_id: ex.id, status: 'draft' });
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
    // derive format
    const fmt = (g.parameters?.format as string) || g.title.split(' ')[0].toLowerCase();
    const isTabata = fmt === 'tabata' || g.parameters?.tabata_fixed === true;
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
      const fmtLocal = (g.parameters?.format as string) || fmt;
      if (cap != null && (fmtLocal==='amrap' || fmtLocal==='emom')) setTimeCap(Math.round(Number(cap)/60));
      else setTimeCap(cap ?? '');
      setSlotsPerMin((g.parameters?.slots_per_min as number) ?? '');
      setRestBetween((g as any).rest_between_rounds_s ?? '');
      setIntensity((g as any).intensity ?? '');
      setExercisesPerRound((g.parameters?.exercises_per_round as number) ?? '');
    }, [g.blockId]);

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
        const fmtLocal = (g.parameters?.format as string) || fmt;
        payload.time_cap_sec = (fmtLocal==='amrap' || fmtLocal==='emom') ? Number(timeCap) * 60 : Number(timeCap);
      }
      if (restBetween !== '') payload.rest_between_rounds_s = Number(restBetween);
      if (intensity) payload.intensity = intensity;
      // parameters
      const params: any = { ...(g.parameters || {}), format: fmt, format_group: true };
      if (isTabata) params.tabata_fixed = true;
      if (slotsPerMin !== '') params.slots_per_min = Number(slotsPerMin);
      if (exercisesPerRound !== '') params.exercises_per_round = Number(exercisesPerRound);
      payload.parameters = params;
      await supabase.from('session_blocks').update(payload).eq('id', g.blockId);
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
        {!isTabata && (fmt==='hiit' || fmt==='sprint' || fmt==='intervals' || g.blockType==='intervals') && (
          <div className="grid grid-cols-2 gap-3">
            <div>{label('Work (seconds)')}{input(work,setWork,'30')}</div>
            <div>{label('Rest (seconds)')}{input(rest,setRest,'30')}</div>
            <div>{label('Rounds')}{input(rounds,setRounds,'8')}</div>
            <div>{label('Intensity')}
              <input className="w-full h-10 bg-black border border-zinc-700 rounded px-3 text-sm" value={intensity} placeholder="Z3 / hard" onChange={e=>setIntensity(e.target.value)} />
            </div>
          </div>
        )}
        {fmt==='emom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>{label('Minutes')}{input(timeCap,setTimeCap,'10')}</div>
            <div>{label('Slots per minute')}{input(slotsPerMin,setSlotsPerMin,'1')}</div>
          </div>
        )}
        {(fmt==='circuit' || fmt==='chipper') && (
          <div className="space-y-3">
            {fmt==='circuit' && (
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
            {fmt==='chipper' && (
              <div className="grid grid-cols-2 gap-3">
                <div>{label('Time cap (minutes)')}{input(timeCap,setTimeCap,'20')}</div>
              </div>
            )}
          </div>
        )}
        {fmt==='amrap' && (
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
    if (sess.error) { setGroupsByDay(prev=>({ ...prev, [dayId]: [] })); return; }

    const blocks = (sess.data || []).flatMap((s:any)=> {
      const arr = Array.isArray(s.session_blocks) ? s.session_blocks : (s.session_blocks ? [s.session_blocks] : []);
      return arr.map((b:any)=> ({
        sessionId: String(s.id),
        blockId: b?.id ? String(b.id) : `sess-${s.id}-blk-unknown`,
        title: (b?.title || s.name) as string,
        blockType: b?.block_type as string,
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

    const groups: Group[] = blocks.filter((b:any)=> !!(b.parameters && (b.parameters.format_group === true || b.parameters.format))).map((b:any)=> ({
      sessionId: b.sessionId,
      blockId: b.blockId,
      title: b.title,
      blockType: b.blockType,
      collapsed: b.collapsed,
      parameters: b.parameters,
      items: (b.itemRows||[]).sort((a:any,b:any)=>(a.item_order??0)-(b.item_order??0)).map((r:any)=> ({ id: String(r.id), name: exMap[String(r.exercise_id)]?.name || 'Exercise', modality: exMap[String(r.exercise_id)]?.modality }))
    }));

    setGroupsByDay(prev=> ({ ...prev, [dayId]: groups }));
    const nonGroupRows = blocks.filter((b:any)=> !(b.parameters && (b.parameters.format_group === true || b.parameters.format))).flatMap((b:any)=> (b.itemRows||[]));
    const allRows = blocks.flatMap((b:any)=> (b.itemRows||[]));
    const flatItems: RenderedItem[] = nonGroupRows.map((r:any)=> ({ id: String(r.id), name: exMap[String(r.exercise_id)]?.name || 'Exercise', modality: exMap[String(r.exercise_id)]?.modality }));
    setItemsByDay(prev=> ({ ...prev, [dayId]: flatItems }));
    const allReady = allRows.length>0 && allRows.every((r:any)=> (r.status || 'draft') === 'ready');
    setReadyDays(prev=> ({ ...prev, [dayId]: allReady }));
  }

  async function removeItem(itemId: string, dayId: string) {
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
  }

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
              toast({ description: "Send to client feature coming soon!" });
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 lg:col-span-2 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setWeek("all")} className={`px-2 py-1 rounded ${week === "all" ? "bg-yellow-500 text-black" : "bg-black border border-zinc-800"}`}>All</button>
              <button onClick={() => setWeek("w1")} className={`px-2 py-1 rounded ${week === "w1" ? "bg-yellow-500 text-black" : "bg-black border border-zinc-800"}`}>Week 1</button>
              <button onClick={() => setWeek("w2")} className={`px-2 py-1 rounded ${week === "w2" ? "bg-yellow-500 text-black" : "bg-black border border-zinc-800"}`}>Week 2</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Hyrox</span>
              {[3,4,5,6].map((n) => (
                <button
                  key={n}
                  disabled={generating}
                  onClick={async () => {
                    try {
                      setGenerating(true);
                      setTrainingDaysSel(n);
                      // Always generate across all days (both weeks)
                      const allDayIds = days.map((d) => d.id);
                      // Immediately clear all days in UI so old data disappears at once
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
                <div key={d.id} onClick={()=>setSelectedDayId(d.id)} className={`rounded-lg p-3 border ${d.is_rest ? "border-zinc-700 bg-black/40 opacity-40" : readyDays[d.id] ? "border-green-400 bg-black/60" : "border-zinc-800 bg-black"} ${savingDayId===d.id? 'animate-pulse': ''}`}>
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
                      <button onClick={() => markDayReady(d)} disabled={savingDayId===d.id || (!d.is_rest && !(itemsByDay[d.id]?.length > 0))} className={`inline-flex items-center justify-center text-xs w-9 h-9 rounded border ${(!d.is_rest && !(itemsByDay[d.id]?.length > 0)) ? 'opacity-40 cursor-not-allowed border-zinc-700' : 'border-zinc-600 hover:bg-zinc-800'} ${savingDayId===d.id? 'opacity-60 cursor-wait':''}`} title="Ready">
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {/* Day description editable below controls */}
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

                  {/* One drop zone + rendered items */}
                  <div className="mt-3 space-y-2">
                    {/* Render groups (format containers) */}
                    <div className="space-y-2">
                      <SortableContext items={(groupsByDay[d.id] || []).map(g => `group:${g.sessionId}:${d.id}`)}>
                        <InlineRootDrop id={`rootdrop:${d.id}:0`} />
                        {(groupsByDay[d.id] || []).map((g, gi) => {
                          const sidG = `group:${g.sessionId}:${d.id}`;
                          const RowGroup = () => {
                            const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sidG });
                            const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
                            return (
                              <div ref={setNodeRef} style={style} className="rounded-md border border-slate-600 bg-slate-800">
                                <div className="flex items-center justify-between px-3 py-2">
                                  <div className="inline-flex items-center gap-2">
                                    <span title="Drag group" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-yellow-500"><Move className="w-5 h-5" /></span>
                                    <Repeat className="w-4 h-4 text-yellow-400" />
                                    <div className="font-medium text-sm">{g.title}</div>
                                  </div>
                                  <div className="inline-flex items-center gap-2">
                                    <button className="text-xs underline opacity-80 hover:opacity-100" onClick={()=> setEditingGroup(g.blockId)}>Edit</button>
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
                                            return <CompactItemRow key={sid} sid={sid} it={it} dayId={d.id} chip={chip} Icon={Icon} editing={editing} toggleEditorWithData={toggleEditorWithData} removeItem={removeItem} EditorStrength={EditorStrength} EditorEndurance={EditorEndurance} EditorIntervals={EditorIntervals} EditorAccessory={EditorAccessory} />;
                                          })}
                                          {(g.items || []).length === 0 && (
                                            <div className="text-xs text-zinc-400">Drop exercises here</div>
                                          )}
                                        </div>
                                      </SortableContext>
                                    </GroupInnerDrop>
                                  </div>
                                )}
                                {editingGroup===g.blockId && (
                                  <GroupEditor g={g} dayId={d.id} />
                                )}
                              </div>
                            );
                          };
                          return (
                            <div key={`grpwrap:${g.sessionId}:${g.blockId}`}>
                              <RowGroup />
                              <InlineRootDrop id={`rootdrop:${d.id}:${gi+1}`} />
                            </div>
                          );
                        })}
                      </SortableContext>
                    </div>
                    {/* Backward compatibility list (non-group items if any) */}
                    <SortableContext items={(itemsByDay[d.id] || []).map(i => `item:${i.id}:${d.id}`)}>
                      <div className="space-y-1 mt-2">
                        {(itemsByDay[d.id] || []).map((it) => {
                          const { chip, Icon } = modalityStyle(it.modality);
                          const sid = `item:${it.id}:${d.id}`;
                          const Row = () => {
                            const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sid });
                            const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;
                            return (
                              <div ref={setNodeRef} style={style} className={`w-full text-sm px-2 py-1 rounded border ${chip}`}>
                                <div className="inline-flex items-center justify-between w-full">
                                  <div className="inline-flex items-center gap-1.5">
                                  <span title="Drag to reorder" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-yellow-500">
                                    <Move className="w-4 h-4" />
                                  </span>
                                  <Icon className="w-3.5 h-3.5" />
                                  <span>{it.name}</span>
                                  </div>
                                  <div className="inline-flex items-center gap-2">
                                    <button onClick={() => toggleEditorWithData(it.id, d.id, it.modality)} className="text-xs underline opacity-80 hover:opacity-100">{editing?.id === it.id && editing.dayId === d.id ? 'Close' : 'Edit'}</button>
                                    <button onClick={() => removeItem(it.id, d.id)} className="opacity-70 hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>
                                {editing?.id === it.id && editing.dayId === d.id && (
                                  <div className="mt-2 bg-black/30 rounded-md py-2 px-1 border border-zinc-800">
                                    {it.modality === 'strength' ? EditorStrength(it.id, d.id) : null}
                                    {it.modality === 'running' || it.modality === 'cardio' || it.modality === 'erg' ? EditorEndurance(it.id, d.id) : null}
                                    {it.modality === 'intervals' || it.modality === 'hiit' || it.modality === 'emom' ? EditorIntervals(it.id) : null}
                                    {it.modality === 'core' || it.modality === 'mobility' || it.modality === 'skill' || it.modality === 'carry' || it.modality === 'circuit' ? EditorAccessory(it.id) : null}
                                  </div>
                                )}
                              </div>
                            );
                          };
                          return <Row key={sid} />;
                        })}
                      </div>
                    </SortableContext>
                    <DroppableZone id={`drop:${d.id}`} label={savingDayId===d.id? 'Saving…' : 'Drop exercises here'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </DndContext>
    </>
  );
};

export default PlanDetail;


