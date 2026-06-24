import { NavLink } from "react-router-dom";
import { Home, CalendarClock, Wallet, Sparkles, Settings } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
  { to: "/plan", label: "Plan", icon: Wallet },
  { to: "/scenario", label: "Scenario", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="group flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 outline-none"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive ? "bg-jade-soft text-jade" : "text-faint group-hover:text-muted"
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span
                  className={`text-[10px] font-semibold tracking-tight transition-colors ${
                    isActive ? "text-ink" : "text-faint"
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
