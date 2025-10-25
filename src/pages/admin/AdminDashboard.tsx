import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/utils/supabaseClient";

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <div className="text-zinc-400 text-sm">{label}</div>
    <div className="text-2xl font-semibold mt-1 text-yellow-500">{value}</div>
  </div>
);

const AdminDashboard = () => {
  const [activeClients, setActiveClients] = useState<string>("—");
  const [recentClients, setRecentClients] = useState<Array<{ id: string; name: string; created_at?: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Count clients (if table exists)
        const countRes = await supabase
          .from("clients")
          .select("id", { count: "exact", head: true });
        if (!countRes.error && typeof countRes.count === "number") {
          setActiveClients(String(countRes.count));
        }

        // Recent clients (show as recent activity for now)
        const recentRes = await supabase
          .from("clients")
          .select("id,name,created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        if (!recentRes.error && recentRes.data) {
          setRecentClients(recentRes.data.map((r: any) => ({ id: String(r.id), name: r.name, created_at: r.created_at })));
        }
      } catch (e) {
        // noop – dashboard stays with placeholders
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      {/* PT Profile Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-black text-2xl font-bold">
            NS
          </div>
          <div>
            <h2 className="text-xl font-semibold">Natalie Shanahan</h2>
            <p className="text-zinc-400 text-sm">nat_shanahan@hotmail.com</p>
            <p className="text-yellow-500 text-xs mt-1">HYROX Coach • Strength & Conditioning</p>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-semibold mb-4">Coach Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Active Clients" value={activeClients} />
        <Stat label="New Logs (7d)" value="—" />
        <Stat label="PRs (7d)" value="—" />
        <Stat label="Strava Syncs" value="—" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="font-medium mb-2">Recent Activity</h2>
          {loading && <p className="text-zinc-400 text-sm">Loading…</p>}
          {!loading && recentClients.length === 0 && (
            <p className="text-zinc-400 text-sm">No data yet.</p>
          )}
          {!loading && recentClients.length > 0 && (
            <ul className="space-y-2">
              {recentClients.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-200">New client</span>
                  <Link 
                    to={`/admin/clients`}
                    className="font-medium text-yellow-500 hover:text-yellow-400 transition-colors"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="font-medium mb-2">Upcoming Sessions</h2>
          <p className="text-zinc-400 text-sm">No data yet.</p>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;


