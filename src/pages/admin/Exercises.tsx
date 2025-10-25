import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

interface ExerciseRow { id: string; name: string; modality?: string | null; primary_area?: string | null; pattern?: string | null; tags?: string | null; equipment?: string[] | null; notes?: string | null; media?: any | null; youtube?: string | null }

const Exercises = () => {
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [dirty, setDirty] = useState<Record<string, Partial<ExerciseRow>>>({});
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState<keyof ExerciseRow>("name");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("exercises")
          .select("id,name,modality,primary_area,pattern,tags,equipment,notes,media")
          .order("name");
        if (error) throw error;
        setRows((data || []).map((d: any) => {
          let mediaObj: any = null;
          if (d.media) {
            try { mediaObj = typeof d.media === 'string' ? JSON.parse(d.media) : d.media; } catch { mediaObj = d.media; }
          }
          const youtube = mediaObj?.youtube ?? null;
          return { id: String(d.id), name: d.name, modality: d.modality, primary_area: d.primary_area, pattern: d.pattern, tags: d.tags, equipment: d.equipment || null, notes: d.notes || null, media: mediaObj, youtube } as ExerciseRow;
        }));
      } catch (e: any) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const base = !q ? rows : rows.filter(r => [r.name, r.modality, r.primary_area, r.pattern, r.tags || "", (r.equipment||[]).join(","), r.notes || "", r.youtube || ""].join(" ").toLowerCase().includes(q));
    const dir = sortDir === 'asc' ? 1 : -1;
    const val = (r: ExerciseRow, k: keyof ExerciseRow) => {
      const v: any = (r as any)[k];
      if (Array.isArray(v)) return v.join(',').toLowerCase();
      if (v == null) return '';
      return String(v).toLowerCase();
    };
    return [...base].sort((a,b) => val(a,sortKey) > val(b,sortKey) ? dir : val(a,sortKey) < val(b,sortKey) ? -dir : 0);
  }, [rows, filter, sortKey, sortDir]);

  function onSort(k: keyof ExerciseRow) {
    if (sortKey === k) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  function onEdit(id: string, key: keyof ExerciseRow, value: any) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: value } as ExerciseRow : r));
    setDirty(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  }

  async function saveRow(id: string) {
    try {
      const changes = dirty[id];
      if (!changes || Object.keys(changes).length === 0) return;
      // Normalize blanks to nulls where appropriate
      const payload: any = { ...changes };
      if (payload.tags === "") payload.tags = null;
      // Don't null out modality (DB not-null). If blank, omit the update
      if (payload.modality === "") delete payload.modality;
      if (payload.primary_area === "") payload.primary_area = null;
      if (payload.pattern === "") payload.pattern = null;
      if (Array.isArray(payload.equipment) && payload.equipment.length === 0) payload.equipment = null;

      // Handle youtube -> media JSON
      if (Object.prototype.hasOwnProperty.call(payload, 'youtube')) {
        const current = rows.find(r => r.id === id)?.media || {};
        const nextMedia = { ...current, youtube: payload.youtube || null };
        payload.media = nextMedia;
        delete payload.youtube;
      }

      const { data, error } = await supabase
        .from("exercises")
        .update(payload)
        .eq("id", id)
        .select("id,name,modality,primary_area,pattern,tags,equipment,notes,media")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        let mediaObj: any = null;
        if ((data as any).media) {
          try { mediaObj = typeof (data as any).media === 'string' ? JSON.parse((data as any).media) : (data as any).media; } catch { mediaObj = (data as any).media; }
        }
        const youtube = mediaObj?.youtube ?? null;
        setRows(prev => prev.map(r => r.id === id ? {
          id: String((data as any).id),
          name: (data as any).name,
          modality: (data as any).modality,
          primary_area: (data as any).primary_area,
          pattern: (data as any).pattern,
          tags: (data as any).tags,
          equipment: (data as any).equipment,
          notes: (data as any).notes,
          media: mediaObj,
          youtube,
        } as ExerciseRow : r));
        setDirty(prev => { const cp = { ...prev }; delete cp[id]; return cp; });
        toast({ description: "Row updated" });
      }
    } catch (e: any) {
      toast({ description: e?.message || "Update failed", variant: "destructive" as any });
    }
  }

  async function addExercise() {
    const { data, error } = await supabase
      .from("exercises")
      .insert({ name: "New Exercise", modality: 'mobility' })
      .select("id,name,modality,primary_area,pattern,tags,equipment,notes,media")
      .single();
    if (!error && data) {
      let mediaObj: any = null;
      if ((data as any).media) {
        try { mediaObj = typeof (data as any).media === 'string' ? JSON.parse((data as any).media) : (data as any).media; } catch { mediaObj = (data as any).media; }
      }
      const youtube = mediaObj?.youtube ?? null;
      setRows(prev => [...prev, { id: String((data as any).id), name: (data as any).name, modality: (data as any).modality, primary_area: (data as any).primary_area, pattern: (data as any).pattern, tags: (data as any).tags, equipment: (data as any).equipment, notes: (data as any).notes, media: mediaObj, youtube }]);
      toast({ description: "Exercise added" });
    } else if (error) {
      toast({ description: error.message || "Add failed", variant: "destructive" as any });
    }
  }

  async function copyRow(row: ExerciseRow) {
    const { data, error } = await supabase
      .from("exercises")
      .insert({
        name: `${row.name} (Copy)`,
        modality: row.modality || 'mobility',
        primary_area: row.primary_area || null,
        pattern: row.pattern || null,
        tags: row.tags || null,
        equipment: row.equipment || null,
        notes: row.notes || null,
        media: row.youtube ? { youtube: row.youtube } : (row.media || null),
      })
      .select("id,name,modality,primary_area,pattern,tags,equipment,notes,media")
      .single();
    if (!error && data) {
      let mediaObj: any = null;
      if ((data as any).media) {
        try { mediaObj = typeof (data as any).media === 'string' ? JSON.parse((data as any).media) : (data as any).media; } catch { mediaObj = (data as any).media; }
      }
      const youtube = mediaObj?.youtube ?? null;
      setRows(prev => [...prev, { id: String((data as any).id), name: (data as any).name, modality: (data as any).modality, primary_area: (data as any).primary_area, pattern: (data as any).pattern, tags: (data as any).tags, equipment: (data as any).equipment, notes: (data as any).notes, media: mediaObj, youtube }]);
      toast({ description: "Exercise copied" });
    } else if (error) {
      toast({ description: error.message || "Copy failed", variant: "destructive" as any });
    }
  }

  async function saveAll() {
    const ids = Object.keys(dirty);
    for (const id of ids) await saveRow(id);
  }

  async function deleteRow(id: string) {
    try {
      if (!confirm('Delete this exercise? This cannot be undone.')) return;
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
      setRows(prev => prev.filter(r => r.id !== id));
      setDirty(prev => { const cp = { ...prev }; delete cp[id]; return cp; });
      toast({ description: 'Exercise deleted' });
    } catch(e:any) {
      toast({ description: e?.message || 'Delete failed', variant: 'destructive' as any });
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Exercises</h1>
        <div className="flex items-center gap-2">
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search…" className="bg-black border border-zinc-800 rounded-md px-2 py-1 text-sm" />
          <button onClick={saveAll} className="px-3 py-1 rounded-md border border-yellow-500 text-yellow-400">Save All</button>
          <button onClick={addExercise} className="px-3 py-1 rounded-md border border-zinc-700">+ Add Exercise</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-md px-3 py-2 mb-3 text-sm">{error}</div>}

      <div className="overflow-auto border border-zinc-800 rounded-md">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[220px_140px_160px_140px_200px_220px_220px_1fr_200px] text-xs bg-zinc-900 border-b border-zinc-800">
            <button onClick={()=>onSort('name')} className="px-2 py-2 text-left hover:bg-zinc-800 sticky left-0 z-20 bg-zinc-900 border-r border-zinc-800">Name {sortKey==='name' ? (sortDir==='asc'?'▲':'▼') : ''}</button>
            <button onClick={()=>onSort('modality')} className="px-2 py-2 text-left hover:bg-zinc-800">Modality {sortKey==='modality' ? (sortDir==='asc'?'▲':'▼') : ''}</button>
            <button onClick={()=>onSort('primary_area')} className="px-2 py-2 text-left hover:bg-zinc-800">Primary Area {sortKey==='primary_area' ? (sortDir==='asc'?'▲':'▼') : ''}</button>
            <button onClick={()=>onSort('pattern')} className="px-2 py-2 text-left hover:bg-zinc-800">Pattern {sortKey==='pattern' ? (sortDir==='asc'?'▲':'▼') : ''}</button>
            <button onClick={()=>onSort('tags')} className="px-2 py-2 text-left hover:bg-zinc-800">Tags {sortKey==='tags' ? (sortDir==='asc'?'▲':'▼') : ''}</button>
            <button onClick={()=>onSort('equipment')} className="px-2 py-2 text-left hover:bg-zinc-800">Equipment (CSV) {sortKey==='equipment' ? (sortDir==='asc'?'▲':'▼') : ''}</button>
            <button onClick={()=>onSort('youtube')} className="px-2 py-2 text-left hover:bg-zinc-800">YouTube {sortKey==='youtube' ? (sortDir==='asc'?'▲':'▼') : ''}</button>
            <button onClick={()=>onSort('notes')} className="px-2 py-2 text-left hover:bg-zinc-800">Notes {sortKey==='notes' ? (sortDir==='asc'?'▲':'▼') : ''}</button>
            <div className="px-2 py-2 text-center">Actions</div>
          </div>
          {loading && <div className="p-3 text-sm text-zinc-400">Loading…</div>}
          {!loading && filtered.map(r => (
            <div key={r.id} className="grid grid-cols-[220px_140px_160px_140px_200px_220px_220px_1fr_200px] items-center text-sm border-b border-zinc-800">
              <input className="bg-black border-none px-2 py-2 outline-none sticky left-0 z-10 border-r border-zinc-800" value={r.name} onChange={e=>onEdit(r.id,'name',e.target.value)} />
              <input className="bg-black border-none px-2 py-2 outline-none" value={r.modality || ''} onChange={e=>onEdit(r.id,'modality',e.target.value)} />
              <input className="bg-black border-none px-2 py-2 outline-none" value={r.primary_area || ''} onChange={e=>onEdit(r.id,'primary_area',e.target.value)} />
              <input className="bg-black border-none px-2 py-2 outline-none" value={r.pattern || ''} onChange={e=>onEdit(r.id,'pattern',e.target.value)} />
              <input className="bg-black border-none px-2 py-2 outline-none" value={r.tags || ''} onChange={e=>onEdit(r.id,'tags',e.target.value)} />
              <input className="bg-black border-none px-2 py-2 outline-none" value={(r.equipment||[]).join(',')} onChange={e=>onEdit(r.id,'equipment',e.target.value.split(',').map(s=>s.trim()).filter(Boolean) as any)} />
              <input className="bg-black border-none px-2 py-2 outline-none" value={r.youtube || ''} onChange={e=>onEdit(r.id,'youtube',e.target.value)} placeholder="https://youtu.be/..." />
              <input className="bg-black border-none px-2 py-2 outline-none" value={r.notes || ''} onChange={e=>onEdit(r.id,'notes',e.target.value)} />
              <div className="px-2 py-2 text-right flex items-center justify-end gap-2">
                <button onClick={()=>deleteRow(r.id)} className="px-2 py-1 rounded border border-red-500 text-red-400">Delete</button>
                <button onClick={()=>copyRow(r)} className="px-2 py-1 rounded border border-zinc-700">Copy</button>
                <button onClick={()=>saveRow(r.id)} className={`px-2 py-1 rounded border ${dirty[r.id] ? 'border-yellow-500 text-yellow-400' : 'border-zinc-700 text-zinc-400'}`}>Update</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Exercises;


