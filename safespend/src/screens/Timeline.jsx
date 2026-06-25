import { useMemo, useState } from "react";
import { Plus, CalendarClock } from "lucide-react";
import ExpenseSheet from "../components/ExpenseSheet.jsx";
import { Card } from "../components/ui/Card.jsx";
import { useApp } from "../context/AppContext.jsx";
import { upcomingExpenses, COMMITTED_TYPES, fundCoverage } from "../lib/calculations.js";
import { typeMeta } from "../lib/typeMeta.js";
import {
  formatMoney,
  formatDateLong,
  relativeDay,
  toISODate,
  today,
  daysBetween,
} from "../lib/format.js";

export default function Timeline() {
  const { cycle, currency } = useApp();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  // Walk items in date order, tracking the running safe-to-spend drawdown.
  const { groups, hasItems } = useMemo(() => {
    if (!cycle) return { groups: [], hasItems: false };
    const items = upcomingExpenses(cycle);
    let running = Number(cycle.income) || 0;
    const withRunning = items.map((e) => {
      if (e.type === "income") running += Number(e.amount) || 0;
      else if (COMMITTED_TYPES.includes(e.type)) {
        // A funded bill is paid from its sinking fund — only the shortfall draws
        // from this cycle's pay.
        const draw = e.fund?.enabled ? fundCoverage(e).shortfall : Number(e.amount) || 0;
        running -= draw;
      }
      return { ...e, running };
    });
    // group by date (ISO)
    const map = new Map();
    for (const e of withRunning) {
      const key = e.dueDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    const groups = [...map.entries()].map(([date, list]) => ({ date, list }));
    return { groups, hasItems: items.length > 0 };
  }, [cycle]);

  if (!cycle) return null;
  const todayISO = toISODate(today());

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between px-1 pt-1">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Timeline</h1>
          <p className="text-[14px] text-muted">Everything between now and payday</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-jade text-white shadow-soft active:scale-95"
        >
          <Plus size={20} />
        </button>
      </header>

      {!hasItems ? (
        <Card className="px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-jade-soft">
            <CalendarClock size={22} className="text-jade" />
          </div>
          <p className="font-display text-lg font-bold">Your timeline is clear</p>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">
            Add bills and expenses with due dates to see them laid out toward payday.
          </p>
        </Card>
      ) : (
        <div className="relative pl-2">
          {/* the spine */}
          <div className="absolute bottom-2 left-[14px] top-3 w-px bg-line" />
          <div className="space-y-6">
            {groups.map(({ date, list }) => {
              const isPast = daysBetween(today(), date) < 0;
              const isToday = date === todayISO;
              return (
                <div key={date} className="relative">
                  <div className="mb-2 flex items-center gap-3">
                    <span
                      className={`relative z-10 h-3 w-3 rounded-full ring-4 ring-bg ${
                        isToday ? "bg-jade" : isPast ? "bg-faint" : "bg-ink"
                      }`}
                    />
                    <div className="flex items-baseline gap-2">
                      <span className="text-[14px] font-bold">{relativeDay(date)}</span>
                      <span className="text-[12px] text-muted">{formatDateLong(date)}</span>
                    </div>
                  </div>

                  <Card className={`ml-6 divide-y divide-line/70 p-1 ${isPast ? "opacity-60" : ""}`}>
                    {list.map((e) => {
                      const { Icon, tint } = typeMeta(e.type);
                      const isIncome = e.type === "income";
                      return (
                        <button
                          key={e.id}
                          onClick={() => setEditing(e)}
                          className="flex w-full items-center gap-3 px-2.5 py-3 text-left transition active:bg-elevated"
                        >
                          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tint}`}>
                            <Icon size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold">{e.name}</span>
                            <span className="block text-[12px] text-muted tnum">
                              {formatMoney(e.running, currency, { cents: false })} left after this
                            </span>
                          </span>
                          <span
                            className={`text-[15px] font-semibold tnum ${isIncome ? "text-jade" : "text-ink"}`}
                          >
                            {isIncome ? "+" : "−"}
                            {formatMoney(e.amount, currency)}
                          </span>
                        </button>
                      );
                    })}
                  </Card>
                </div>
              );
            })}

            {/* payday marker */}
            <div className="relative">
              <div className="mb-2 flex items-center gap-3">
                <span className="relative z-10 h-3 w-3 rounded-full bg-jade ring-4 ring-bg" />
                <span className="text-[14px] font-bold text-jade">Payday</span>
              </div>
              <div className="ml-6 rounded-3xl border-2 border-dashed border-jade/30 bg-jade-soft/40 px-4 py-3 text-[13px] font-medium text-jade">
                Fresh pay lands {relativeDay(cycle.nextPayday).toLowerCase()}.
              </div>
            </div>
          </div>
        </div>
      )}

      <ExpenseSheet open={Boolean(editing)} onClose={() => setEditing(null)} editing={editing} />
      <ExpenseSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
