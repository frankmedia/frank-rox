import AdminLayout from "./AdminLayout";

const Workouts = () => {
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Workouts</h1>
        <button className="bg-yellow-500 text-black px-3 py-2 rounded-md font-medium">
          + New Session
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-400">
        Session builder coming soon — black/white/yellow UI, drag & drop day planner.
      </div>
    </AdminLayout>
  );
};

export default Workouts;


