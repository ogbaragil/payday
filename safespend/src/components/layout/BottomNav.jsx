import { NavLink } from "react-router-dom";
import { LayoutGrid, ClipboardList, CalendarDays, ShoppingBag, Settings } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/plan", label: "Plan", icon: ClipboardList },
  { to: "/timeline", label: "Timeline", icon: CalendarDays, feature: true },
  { to: "/scenario", label: "Can I Buy?", icon: ShoppingBag },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 bg-bg/85 backdrop-blur-xl">
      {/* chalk rule across the top of the dock */}
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-line/70 chalk-edge" />
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-1 pt-2">
        {ITEMS.map(({ to, label, icon: Icon, end, feature }) =>
          feature ? (
            // Timeline — the raised, highlighted action in the middle of the dock
            <NavLink
              key={to}
              to={to}
              end={end}
              className="group -mt-7 flex flex-1 flex-col items-center gap-1 outline-none"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`chalk-edge flex h-14 w-14 items-center justify-center rounded-full border-[1.8px] transition-all duration-200 ${
                      isActive
                        ? "border-iris bg-iris-soft text-iris"
                        : "border-line/70 bg-elevated/80 text-faint group-hover:text-muted group-active:border-iris/70 group-active:bg-iris-soft/60 group-active:text-iris"
                    }`}
                  >
                    <Icon size={24} strokeWidth={2.2} />
                  </span>
                  <span
                    className={`font-display text-[14px] leading-none tracking-tight transition-colors ${
                      isActive ? "text-iris" : "text-faint group-active:text-iris"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ) : (
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
          )
        )}
      </div>
    </nav>
  );
}
