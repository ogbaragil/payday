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
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/90 backdrop-blur-xl">
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
                    isActive ? "bg-iris text-white shadow-iris" : "text-faint group-hover:text-muted"
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span
                  className={`text-[10px] font-semibold tracking-tight transition-colors ${
                    isActive ? "text-iris" : "text-faint"
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
