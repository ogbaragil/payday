import { NavLink } from "react-router-dom";
import { LayoutGrid, ClipboardList, CalendarDays, ShoppingBag, Settings } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/plan", label: "Plan", icon: ClipboardList },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
  { to: "/scenario", label: "Can I Buy?", icon: ShoppingBag },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 bg-bg/85 backdrop-blur-xl">
      {/* chalk rule across the top of the dock */}
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-line/70 chalk-edge" />
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-1 pt-2">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="group flex flex-1 flex-col items-center gap-1 py-1 outline-none"
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={`transition-colors ${isActive ? "text-mint" : "text-faint group-hover:text-muted"}`}
                />
                <span
                  className={`font-display text-[14px] leading-none tracking-tight transition-colors ${
                    isActive ? "text-mint" : "text-faint"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`h-[2px] w-5 rounded-full chalk-edge transition-all ${
                    isActive ? "bg-mint" : "bg-transparent"
                  }`}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
