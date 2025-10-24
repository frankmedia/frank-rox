import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/utils/supabaseClient";

interface Note { id: number; title: string }

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase.from("notes").select("id, title").order("id", { ascending: true });
        if (error) throw error;
        setNotes(data || []);
      } catch (e: any) {
        setError(e.message || "Failed to load notes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Notes</h1>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        {loading && <div className="text-zinc-400">Loading…</div>}
        {error && <div className="text-red-400">{error}</div>}
        {!loading && !error && (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-yellow-500 text-black inline-flex items-center justify-center font-medium">
                  {n.id}
                </span>
                <span>{n.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
};

export default Notes;


