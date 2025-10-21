import { useNavigate, useLocation } from "react-router-dom";
import { Home, History, User, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: "today",
      label: "Today",
      icon: Home,
      path: "/today",
    },
    {
      id: "history",
      label: "History",
      icon: History,
      path: "/history",
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      path: "/profile",
    },
    {
      id: "book-pt",
      label: "Book PT",
      icon: CalendarDays,
      path: "/book-pt",
    },
  ];

  const isActive = (path: string) => {
    // Home button is active for both / (overview) and /today
    if (path === "/today") {
      return location.pathname === "/" || location.pathname === "/today";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-inset-bottom">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "group flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                  "hover:bg-accent/50 rounded-lg",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  active ? "fill-primary" : "group-hover:stroke-foreground"
                )} />
                <span className={cn("text-xs font-medium transition-colors", active && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;

