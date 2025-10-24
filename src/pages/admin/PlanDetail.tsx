import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";

interface Plan { id: string; name: string; cycle_days?: number }
interface PlanDay { id: string; day_index: number; label?: string }

const PlanDetail = () => {
  const { id } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
          .select("id,day_index,label")
          .eq("plan_id", id)
          .order("day_index", { ascending: true });
        if (daysRes.error) throw daysRes.error;
        setDays((daysRes.data || []).map((d: any) => ({ id: String(d.id), day_index: d.day_index, label: d.label })));
      } catch (e: any) {
        setError(e?.message || "Failed to load plan");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{plan ? plan.name : "Plan"}</h1>
        <Link to="/admin/workouts" className="text-sm text-yellow-500 hover:underline">← Back to plans</Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-md px-3 py-2 mb-3 text-sm">{error}</div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        {loading && <div className="text-zinc-400">Loading…</div>}
        {!loading && days.length === 0 && (
          <div className="text-zinc-400">No days yet.</div>
        )}
        {!loading && days.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {days.map((d) => (
              <div key={d.id} className="bg-black border border-zinc-800 rounded-lg p-3">
                <div className="text-sm text-zinc-400">Day {d.day_index + 1}</div>
                <div className="font-medium">{d.label || `Day ${d.day_index + 1}`}</div>
                <div className="mt-2">
                  <button className="text-yellow-500 hover:underline text-sm">Open day</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default PlanDetail;


