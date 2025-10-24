const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
    <div className="text-zinc-400 text-sm">{label}</div>
    <div className="text-2xl font-semibold mt-1 text-yellow-500">{value}</div>
  </div>
);

const AdminDashboard = () => {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Coach Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Active Clients" value="—" />
        <Stat label="New Logs (7d)" value="—" />
        <Stat label="PRs (7d)" value="—" />
        <Stat label="Strava Syncs" value="—" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="font-medium mb-2">Recent Activity</h2>
          <p className="text-zinc-400 text-sm">No data yet.</p>
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


