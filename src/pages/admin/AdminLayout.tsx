import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 transition-colors relative ${
    isActive
      ? "text-yellow-400 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-yellow-500"
      : "text-zinc-400 hover:text-yellow-500"
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-3 transition-colors border-l-4 ${
    isActive
      ? "text-yellow-400 border-yellow-500 bg-yellow-500/10"
      : "text-zinc-400 hover:text-yellow-500 border-transparent hover:bg-zinc-800/50"
  }`;

const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold">
              <span className="text-yellow-500">RoxPT</span> Admin
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2 text-sm">
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

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-yellow-500 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-zinc-800 pt-4">
              <NavLink to="/admin" end className={mobileNavLinkClass} onClick={closeMobileMenu}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/clients" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                Clients
              </NavLink>
              <NavLink to="/admin/exercises" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                Exercises
              </NavLink>
              <NavLink to="/admin/settings" className={mobileNavLinkClass} onClick={closeMobileMenu}>
                Settings
              </NavLink>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children ? children : <Outlet />}
      </main>
    </div>
  );
};

export default AdminLayout;


