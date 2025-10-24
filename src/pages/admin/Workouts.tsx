import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

interface Plan { id: string; name: string; cycle_days?: number; created_at?: string }

const Workouts = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from("plans").select("id,name,cycle_days,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      setPlans((data || []).map((p: any) => ({ id: String(p.id), name: p.name, cycle_days: p.cycle_days, created_at: p.created_at })));
    } catch (e: any) {
      setError(e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const createPlan14 = async () => {
    try {
      const name = prompt("Plan name", "14‑Day Starter");
      if (!name) return;
      setError(null);
      setLoading(true);
      // 1) Create plan
      const { data: plan, error: planErr } = await supabase.from("plans").insert({ name, cycle_days: 14 }).select("id").single();
      if (planErr) throw planErr;
      const planId = (plan as any).id;
      // 2) Seed 14 days
      const days = Array.from({ length: 14 }, (_, i) => ({ plan_id: planId, day_index: i, label: `Day ${i + 1}` }));
      const { error: daysErr } = await supabase.from("plan_days").insert(days);
      if (daysErr) throw daysErr;
      await loadPlans();
    } catch (e: any) {
      setError(e?.message || "Failed to create plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Workouts</h1>
        <div className="flex items-center gap-2">
          <button onClick={createPlan14} className="bg-yellow-500 text-black px-3 py-2 rounded-md font-medium">
            + New 14‑Day Plan
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-md px-3 py-2 mb-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        {loading && <div className="text-zinc-400">Loading…</div>}
        {!loading && plans.length === 0 && (
          <div className="text-zinc-400">
            No plans yet. Create a 14‑day plan to get started.
          </div>
        )}
        {!loading && plans.length > 0 && (
          <div className="divide-y divide-zinc-800">
            {plans.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-zinc-400">{p.cycle_days || 14} days</div>
                </div>
                <button className="text-yellow-500 hover:underline">Open</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Workouts;


