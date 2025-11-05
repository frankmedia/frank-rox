import { useNavigate, useLocation } from "react-router-dom";
import { Home, BookOpen, User, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkoutSession } from "@/contexts/WorkoutSessionContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isWorkoutActive } = useWorkoutSession();

  const tabs = [
    {
      id: "plan",
      label: "Plan",
      icon: Home,
      path: "/overview",
    },
    {
      id: "history",
      label: "Logbook",
      icon: BookOpen,
      path: "/history",
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      path: "/profile",
    },
    {
      id: "pt-checkin",
      label: "PT Check-In",
      icon: CalendarDays,
      path: "/pt-checkin",
    },
  ];

  const isActive = (path: string) => {
    // Plan button is active on /overview, /today and /exercise pages
    if (path === "/overview") {
      return location.pathname === "/overview" || location.pathname === "/today" || location.pathname.startsWith("/exercise");
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border bottom-nav-safe">
      {/* Global workout session indicator */}
      {isWorkoutActive && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg" />
        </div>
      )}
      
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
                  "w-5 h-5 transition-all",
                  active ? "fill-primary group-hover:opacity-80" : "group-hover:stroke-foreground"
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

