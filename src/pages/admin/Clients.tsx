import AdminLayout from "./AdminLayout";
import { useState } from "react";

interface Client {
  id: string;
  name: string;
  email: string;
}

const Clients = () => {
  const [clients] = useState<Client[]>([]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <button className="bg-yellow-500 text-black px-3 py-2 rounded-md font-medium">
          + Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-400">
          No clients yet. Use “Add Client” to invite an athlete.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2">
          {/* placeholder list */}
        </div>
      )}
    </AdminLayout>
  );
};

export default Clients;


