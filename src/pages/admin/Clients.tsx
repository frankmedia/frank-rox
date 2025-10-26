import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";
import { ChevronDown, ChevronRight, Plus, Trash2, Activity } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Client { id: string; name: string; email: string }
interface Plan { id: string; name: string; status: string; start_date: string | null; end_date: string | null; current_day: number; cycle_days: number }

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientPlans, setClientPlans] = useState<Record<string, Plan[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const loadClientPlans = async (clientId: string) => {
    try {
      setLoading(prev => ({ ...prev, [clientId]: true }));
      const { data, error } = await supabase
        .from("plans")
        .select("id,name,status,start_date,end_date,current_day,cycle_days")
        .eq("client_id", clientId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      const plans = (data || []).map((p: any) => ({
        id: String(p.id),
        name: p.name || "Untitled Plan",
        status: p.status || "active",
        start_date: p.start_date,
        end_date: p.end_date,
        current_day: p.current_day || 0,
        cycle_days: p.cycle_days || 14
      }));
      setClientPlans(prev => ({ ...prev, [clientId]: plans }));
    } catch (e: any) {
      toast({ description: e?.message || "Failed to load plans", variant: "destructive" as any });
    } finally {
      setLoading(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const toggleExpand = async (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
      if (!clientPlans[clientId]) {
        await loadClientPlans(clientId);
      }
    }
  };

  const addNewPlan = async (clientId: string) => {
    try {
      setLoading(prev => ({ ...prev, [clientId]: true }));
      // Mark any existing active plan as completed
      await supabase.from("plans").update({ status: "completed", end_date: new Date().toISOString() }).eq("client_id", clientId).eq("status", "active");
      // Create new plan as DRAFT (coach must click Send to activate)
      const { data, error } = await supabase
        .from("plans")
        .insert({
          name: "Untitled Plan",
          client_id: clientId,
          status: "draft",
          start_date: null, // Will be set when sent
          cycle_days: 14,
          current_day: 1
        })
        .select("id")
        .single();
      if (error) throw error;
      const newPlanId = String((data as any).id);
      
      // Create 14 plan_days for the new plan
      const days = Array.from({ length: 14 }, (_, i) => ({
        plan_id: newPlanId,
        day_index: i,
        label: `Day ${i + 1}`,
        is_rest: false
      }));
      const daysInsert = await supabase.from("plan_days").insert(days);
      if (daysInsert.error) throw daysInsert.error;
      
      toast({ description: "New draft plan created with 14 days" });
      navigate(`/admin/plans/${newPlanId}`);
    } catch (e: any) {
      toast({ description: e?.message || "Failed to create plan", variant: "destructive" as any });
    } finally {
      setLoading(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const deletePlan = async (planId: string, clientId: string) => {
    if (!confirm("Are you sure you want to delete this plan? This will delete all days, sessions, and exercises.")) return;
    try {
      setLoading(prev => ({ ...prev, [clientId]: true }));
      // Delete plan_days (cascade should handle sessions/blocks/items)
      await supabase.from("plan_days").delete().eq("plan_id", planId);
      // Delete the plan
      const { error } = await supabase.from("plans").delete().eq("id", planId);
      if (error) throw error;
      toast({ description: "Plan deleted" });
      await loadClientPlans(clientId);
    } catch (e: any) {
      toast({ description: e?.message || "Failed to delete plan", variant: "destructive" as any });
    } finally {
      setLoading(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const activePlan = (clientId: string) => (clientPlans[clientId] || []).find(p => p.status === "active");
  const pastPlans = (clientId: string) => (clientPlans[clientId] || []).filter(p => p.status !== "active");

  return (
    <>
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
          No clients yet. Use "Add Client" to invite an athlete.
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => {
            const isExpanded = expandedClient === c.id;
            const plans = clientPlans[c.id] || [];
            const active = activePlan(c.id);
            const past = pastPlans(c.id);
            const isLoading = loading[c.id];

            return (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                {/* Client Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-zinc-800/50 flex-1" onClick={() => toggleExpand(c.id)}>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-zinc-400" /> : <ChevronRight className="w-5 h-5 text-zinc-400" />}
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-400">{c.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/admin/clients/${c.id}/feedback`)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded border border-blue-500 text-blue-400 hover:bg-blue-500/10 text-sm"
                      title="View activity feed"
                    >
                      <Activity className="w-4 h-4" />
                      Activity
                    </button>
                    {active && <span className="text-xs text-green-400">● Active Plan</span>}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
                    {isLoading && <div className="text-sm text-zinc-400">Loading plans...</div>}
                    
                    {!isLoading && (
                      <>
                        {/* Add New Plan Button */}
                        <button
                          onClick={() => addNewPlan(c.id)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <Plus className="w-4 h-4" />
                          Add New Plan
                        </button>

                        {/* Active Plan */}
                        {active && (
                          <div 
                            onClick={() => navigate(`/admin/plans/${active.id}`)}
                            className="bg-green-500/10 border border-green-500/30 rounded-md p-3 cursor-pointer hover:bg-green-500/20 transition-colors"
                          >
                            <div className="text-xs text-green-400 font-semibold mb-1">ACTIVE PLAN</div>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{active.name}</div>
                                <div className="text-xs text-zinc-400">
                                  {active.start_date && `Started ${new Date(active.start_date).toLocaleDateString()}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-500 text-sm">View Plan →</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deletePlan(active.id, c.id); }}
                                  className="text-red-400 hover:text-red-300"
                                  title="Delete plan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Past Plans */}
                        {past.length > 0 && (
                          <div>
                            <div className="text-xs text-zinc-500 font-semibold mb-2">PAST PLANS</div>
                            <div className="space-y-2">
                              {past.map(p => (
                                <div key={p.id} className="bg-zinc-800/50 rounded-md p-2 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium">{p.name}</div>
                                    <div className="text-xs text-zinc-500">
                                      {p.start_date && new Date(p.start_date).toLocaleDateString()}
                                      {p.end_date && ` - ${new Date(p.end_date).toLocaleDateString()}`}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => navigate(`/admin/plans/${p.id}`)}
                                      className="text-zinc-400 hover:text-yellow-500 text-sm"
                                    >
                                      View →
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deletePlan(p.id, c.id); }}
                                      className="text-red-400 hover:text-red-300"
                                      title="Delete plan"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!active && past.length === 0 && (
                          <div className="text-sm text-zinc-500 text-center py-2">No plans yet. Click "Add New Plan" to create one.</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default Clients;
