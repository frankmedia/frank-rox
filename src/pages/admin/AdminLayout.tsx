import { NavLink, Outlet } from "react-router-dom";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 transition-colors relative ${
    isActive
      ? "text-yellow-400 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-yellow-500"
      : "text-zinc-400 hover:text-yellow-500"
  }`;

const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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
            <NavLink to="/admin/exercises" className={navLinkClass}>
              Exercises
            </NavLink>
            <NavLink to="/admin/settings" className={navLinkClass}>
              Settings
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children ? children : <Outlet />}
      </main>
    </div>
  );
};

export default AdminLayout;


