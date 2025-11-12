import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Info, X } from "lucide-react";

interface ExerciseRow { id: string; name: string; modality?: string | null; primary_area?: string | null; pattern?: string | null; tags?: string | null; equipment?: string[] | null; notes?: string | null; media?: any | null; youtube?: string | null }

const Exercises = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [dirty, setDirty] = useState<Record<string, Partial<ExerciseRow>>>({});
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState<keyof ExerciseRow>("name");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Core movement patterns for templates
  const validPatterns = ['squat', 'hinge', 'push', 'pull', 'carry', 'thrust', 'abduction', 'rotation', 'isolation'];
  
  const isValidPattern = (pattern: string | null | undefined) => {
    if (!pattern) return false;
    return validPatterns.includes(pattern.toLowerCase());
  };

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    // Redirect if not authenticated
    if (!isAuthenticated) {
      console.warn('⚠️ Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Only allow admins to access exercises page
    const storedUser = localStorage.getItem("frank_rock_user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role !== 'admin') {
          console.warn('⚠️ Access denied: Admin role required');
          toast({ description: "Access denied: Admin only", variant: "destructive" as any });
          navigate('/admin');
          return;
        }
      } catch (e) {
        console.error('Error parsing user:', e);
        navigate('/login');
        return;
      }
    }
    
    // Load exercises
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
  }, [authLoading, isAuthenticated, navigate]);

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
      console.log('💾 Saving row:', { id, changes, dirty });
      
      if (!changes || Object.keys(changes).length === 0) {
        console.log('⚠️ No changes to save');
        toast({ description: "No changes to save", variant: "destructive" as any });
        return;
      }
      
      const hasYoutubeChange = Object.prototype.hasOwnProperty.call(changes, 'youtube');
      const youtubeValue = hasYoutubeChange ? changes.youtube : undefined;

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
        // Ensure media is properly formatted for JSONB - remove null youtube if empty
        if (nextMedia.youtube === null || nextMedia.youtube === '') {
          delete nextMedia.youtube;
        }
        // Only set media if it has content, otherwise set to null
        payload.media = Object.keys(nextMedia).length > 0 ? nextMedia : null;
        delete payload.youtube;
      }

      // Remove any undefined values from payload
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log('📤 Sending payload:', payload);
      console.log('📤 Payload keys:', Object.keys(payload));
      console.log('📤 Payload JSON:', JSON.stringify(payload, null, 2));

      const { data: updateData, error, count } = await supabase
        .from("exercises")
        .update(payload)
        .eq("id", id)
        .select();

      console.log('📥 Response:', { error, count, affectedRows: updateData?.length });

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        
        if (error.code === 'PGRST116' || error.message?.includes('406') || error.message?.includes('permission') || error.message?.includes('row-level security')) {
          throw new Error(`Update failed: ${error.message || 'Permission denied. Please check RLS policies allow UPDATE for authenticated users.'}`);
        }
        
        throw error;
      }

      // Check if update actually affected any rows
      if (!updateData || updateData.length === 0) {
        console.error('❌ Update affected 0 rows - likely missing database permissions');
        throw new Error('Update failed: 0 rows affected. Run this SQL in Supabase:\n\nGRANT UPDATE ON TABLE public.exercises TO authenticated;');
      }

      const { data: refreshedRow, error: refreshError } = await supabase
        .from("exercises")
        .select("id,name,modality,primary_area,pattern,tags,equipment,notes,media")
        .eq("id", id)
        .single();

      if (refreshError) {
        console.error("❌ Failed to refresh row after update:", refreshError);
        throw new Error(
          `Update succeeded but failed to fetch latest data: ${
            refreshError.message || "Unknown error"
          }`
        );
      }

      let mediaObj: any = null;
      if ((refreshedRow as any).media) {
        try {
          mediaObj =
            typeof (refreshedRow as any).media === "string"
              ? JSON.parse((refreshedRow as any).media)
              : (refreshedRow as any).media;
        } catch (parseErr) {
          console.warn("⚠️ Failed to parse media JSON", parseErr);
          mediaObj = (refreshedRow as any).media;
        }
      }
      const youtube = mediaObj?.youtube ?? null;

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? ({
                id: String((refreshedRow as any).id),
                name: (refreshedRow as any).name,
                modality: (refreshedRow as any).modality,
                primary_area: (refreshedRow as any).primary_area,
                pattern: (refreshedRow as any).pattern,
                tags: (refreshedRow as any).tags,
                equipment: (refreshedRow as any).equipment,
                notes: (refreshedRow as any).notes,
                media: mediaObj,
                youtube,
              } as ExerciseRow)
            : r
        )
      );

      setDirty(prev => {
        const cp = { ...prev };
        delete cp[id];
        return cp;
      });

      console.log('✅ Row updated successfully');
      toast({ description: "Row updated", title: "Success" });
    } catch (e: any) {
      console.error('❌ Error in saveRow:', e);
      toast({ 
        description: e?.message || "Update failed", 
        title: "Error",
        variant: "destructive" as any 
      });
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
          <button 
            onClick={() => setShowGuideModal(true)} 
            className="px-3 py-1 rounded-md border border-blue-500 text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-1.5"
          >
            <Info className="w-4 h-4" />
            Editing Guide
          </button>
          <button onClick={saveAll} className="px-3 py-1 rounded-md border border-yellow-500 text-yellow-400">Save All</button>
          <button onClick={addExercise} className="px-3 py-1 rounded-md border border-zinc-700">+ Add Exercise</button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-md px-3 py-2 mb-3 text-sm">{error}</div>}

      {/* Valid Patterns Guide */}
      <div className="bg-zinc-900 border border-yellow-500/30 rounded-lg px-4 py-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-yellow-400">Valid Movement Patterns:</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {validPatterns.map(pattern => (
            <span key={pattern} className="px-3 py-1 bg-zinc-800 text-zinc-200 rounded-md text-sm font-mono border border-zinc-700">
              {pattern}
            </span>
          ))}
        </div>
        <div className="text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded font-mono">invalid</span>
            <span>← Invalid patterns will appear with a red background</span>
          </span>
        </div>
      </div>

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
          {!loading && filtered.map(r => {
            const invalidPattern = !isValidPattern(r.pattern);
            return (
              <div 
                key={r.id} 
                className="grid grid-cols-[220px_140px_160px_140px_200px_220px_220px_1fr_200px] items-center text-sm border-b border-zinc-800"
              >
                <input className="bg-black border-none px-2 py-2 outline-none sticky left-0 z-10 border-r border-zinc-800" value={r.name} onChange={e=>onEdit(r.id,'name',e.target.value)} />
                <input className="bg-black border-none px-2 py-2 outline-none" value={r.modality || ''} onChange={e=>onEdit(r.id,'modality',e.target.value)} />
                <input className="bg-black border-none px-2 py-2 outline-none" value={r.primary_area || ''} onChange={e=>onEdit(r.id,'primary_area',e.target.value)} />
                <input 
                  className={`border-none px-2 py-2 outline-none ${
                    invalidPattern ? 'bg-red-900/30 text-red-400 font-bold placeholder:text-red-600' : 'bg-black'
                  }`}
                  value={r.pattern || ''} 
                  onChange={e=>onEdit(r.id,'pattern',e.target.value)}
                  placeholder="squat, hinge, push, pull..."
                  title={invalidPattern ? `Invalid pattern. Use: ${validPatterns.join(', ')}` : ''}
                />
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
            );
          })}
        </div>
      </div>

      {/* Editing Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGuideModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-white">Exercise Editing Options by Type</h2>
              <button onClick={() => setShowGuideModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <p className="text-zinc-300 text-sm">
                This table shows what editing options are available for each exercise type/modality in the PlanDetail admin panel.
              </p>

              {/* Summary Table */}
              <div className="overflow-x-auto border border-zinc-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-800 border-b border-zinc-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-yellow-400">Type</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Sets</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Reps</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Weight</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Distance</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Duration</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Rest</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Tempo</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Intensity</th>
                      <th className="px-4 py-3 text-center font-semibold text-zinc-300">Work/Rest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {/* Strength */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">strength</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(kg)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Bodyweight */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">bodyweight</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(text)</span></td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(m)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Core */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">core</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(min)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Mobility */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">mobility</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(min)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Rehab */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">rehab</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(kg)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(min)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Cardio */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">cardio</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(min)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(Z2-Z4)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Running */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">running</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(km)</span></td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(min)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(Z2-Z4)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Erg */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">erg</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(km)</span></td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(min)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(Z2-Z4)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Carry */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">carry</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(text)</span></td>
                      <td className="px-4 py-3 text-center text-green-400">✓<span className="text-xs text-zinc-500 ml-1">(m)</span></td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Skill */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">skill</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Circuit */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">circuit</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                    </tr>
                    {/* Intervals/HIIT */}
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono text-blue-400">intervals/hiit</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-zinc-600">—</td>
                      <td className="px-4 py-3 text-center text-green-400">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Legend:</h3>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 font-bold">✓</span>
                    <span>Field is available for this exercise type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-600 font-bold">—</span>
                    <span>Field is not available for this exercise type</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xs text-zinc-500">(kg)</span>
                    <span>Weight as a number in kilograms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xs text-zinc-500">(text)</span>
                    <span>Weight as text (e.g., "6kg", "2x24kg")</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xs text-zinc-500">(m)</span>
                    <span>Distance in meters (stored as km in DB)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xs text-zinc-500">(km)</span>
                    <span>Distance in kilometers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xs text-zinc-500">(min)</span>
                    <span>Duration in minutes (decimals allowed, e.g., 0.5 = 30 seconds)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-xs text-zinc-500">(Z2-Z4)</span>
                    <span>Intensity zones (Z2, Z3, Z4)</span>
                  </li>
                </ul>
              </div>

              {/* Note */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">📝 Note:</h3>
                <p className="text-sm text-zinc-300">
                  <strong>Core</strong> and <strong>Mobility</strong> exercises currently do not have a weight field. 
                  Some exercises (like Wood Chop or weighted planks) may require weight tracking.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-700 px-6 py-4 flex justify-end">
              <button 
                onClick={() => setShowGuideModal(false)} 
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Exercises;


