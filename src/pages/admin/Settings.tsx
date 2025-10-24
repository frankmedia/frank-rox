const Settings = () => {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="font-medium mb-2">Admin Preferences</h2>
          <p className="text-zinc-400 text-sm">Theme, units, and default intensity labels coming soon.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h2 className="font-medium mb-2">Data Connections</h2>
          <ul className="text-sm text-zinc-300 list-disc pl-5 space-y-1">
            <li>Supabase project connected</li>
            <li>Strava OAuth configured in Profile tab</li>
          </ul>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:col-span-2">
          <h2 className="font-medium mb-2">Security</h2>
          <p className="text-zinc-400 text-sm">RLS policies will be tightened once coach auth is enabled. For testing, reads/inserts may be open.</p>
        </div>
      </div>
    </>
  );
};

export default Settings;


