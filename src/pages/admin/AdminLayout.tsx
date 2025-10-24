import { NavLink, Outlet } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-md transition-colors ${
    isActive
      ? "bg-yellow-500 text-black"
      : "text-yellow-500 hover:bg-yellow-500/10"
  }`;

const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-semibold">
            <span className="text-yellow-500">RoxPT</span> Admin
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink to="/admin" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/clients" className={navLinkClass}>
              Clients
            </NavLink>
            <NavLink to="/admin/workouts" className={navLinkClass}>
              Workouts
            </NavLink>
            <NavLink to="/admin/notes" className={navLinkClass}>
              Notes
            </NavLink>
            <NavLink to="/admin/settings" className={navLinkClass}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {children ? children : <Outlet />}
      </main>
    </div>
  );
};

export default AdminLayout;


