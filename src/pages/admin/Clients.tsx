import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

interface Client { id: string; name: string; email: string }

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const { data, error } = await supabase.from("clients").select("id,name,email").order("name");
        if (error) throw error;
        setClients((data as any[])?.map((r: any) => ({ id: String(r.id), name: r.name, email: r.email })) || []);
      } catch (e: any) {
        // Graceful if table not found yet
        setError(e?.message || null);
      }
    };
    load();
  }, []);

  const addClient = async () => {
    try {
      setError(null);
      if (!name.trim() || !email.trim()) return;
      const { data, error } = await supabase.from("clients").insert({ name, email }).select("id,name,email").single();
      if (error) throw error;
      if (data) setClients((prev) => [...prev, { id: String((data as any).id), name: (data as any).name, email: (data as any).email }]);
      setName("");
      setEmail("");
      setShowForm(false);
    } catch (e: any) {
      setError(e?.message || "Failed to add client");
    }
  };

  return (
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <button onClick={() => setShowForm(true)} className="bg-yellow-500 text-black px-3 py-2 rounded-md font-medium">
          + Add Client
        </button>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-md px-3 py-2 mb-3 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="bg-black border border-zinc-800 rounded-md px-3 py-2 flex-1" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-black border border-zinc-800 rounded-md px-3 py-2 flex-1" />
            <button onClick={addClient} className="bg-yellow-500 text-black px-3 py-2 rounded-md font-medium">Save</button>
            <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-md border border-zinc-700">Cancel</button>
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-400">
          No clients yet. Use “Add Client” to invite an athlete.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 divide-y divide-zinc-800">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-zinc-400">{c.email}</div>
              </div>
              <button className="text-yellow-500 hover:underline">View</button>
            </div>
          ))}
        </div>
      )}
    
  );
};

export default Clients;


