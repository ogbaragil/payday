import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowDownLeft, SlidersHorizontal, CheckCircle2, Star, ShieldCheck, Ban } from "lucide-react";
import ExpenseSheet from "../components/ExpenseSheet.jsx";
import { Card } from "../components/ui/Card.jsx";
import ProgressRing from "../components/ui/ProgressRing.jsx";
import { useApp } from "../context/AppContext.jsx";
import { upcomingExpenses, pastExpenses, cycleSummary } from "../lib/calculations.js";
import { typeMeta } from "../lib/typeMeta.js";
import { formatMoney, formatDate, relativeDay, toISODate, today, daysBetween } from "../lib/format.js";

function QuickAction({ icon: Icon, label, tint, onClick }) {
  return (
    <button onClick={onClick} className="chalk-hairline flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 transition active:scale-[0.97]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}><Icon size={17} /></span>
      <span className="font-display text-[15px]">{label}</span>
    </button>
  );
}

export default function Timeline() {
  const { cycle, currency, profile, toggleSkip } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null); // 'bill' | 'income'

  const summary = useMemo(() => cycleSummary(cycle, profile), [cycle, profile]);
  const items = useMemo(() => (cycle ? upcomingExpenses(cycle) : []), [cycle]);
  const past = useMemo(() => (cycle ? pastExpenses(cycle) : []), [cycle]);
  // The whole cycle on one thread: what's already passed (done), then what's ahead.
  const timelineRows = useMemo(
    () => [...past.map((e) => ({ e, done: true })), ...items.map((e) => ({ e, done: false }))],
    [past, items]
  );

  if (!cycle) return null;
  const todayISO = toISODate(today());
  const daysLeft = summary.daysLeft;
  const pct = Math.round((summary.progress || 0) * 100);
  const dueToday = items.filter((e) => e.dueDate === todayISO && e.type !== "income");
  const allCovered = summary.safe >= 0;

  return (
    <div className="space-y-5">
      <header className="px-1 pt-1">
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-tight">Timeline</h1>
        <p className="text-[14px] text-muted">What's coming up this pay cycle</p>
      </header>

      {/* Hero — cycle countdown + where this cycle's money sits */}
      <div className="relative overflow-hidden chalk-card p-5 text-ink">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, rgb(38 201 126 / 0.4) 0%, transparent 70%)" }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-ink/60">Days until payday</p>
            <p className="font-display text-[44px] font-extrabold leading-none tracking-tight tnum">{daysLeft}</p>
            <p className="mt-1 text-[13px] text-ink/55">{formatDate(cycle.nextPayday, { weekday: "short", day: "numeric", month: "short" })}</p>
          </div>
          <ProgressRing value={summary.progress || 0} size={82} stroke={8} color="rgb(var(--mint))">
            <span className="font-display text-[18px] font-extrabold text-ink tnum">{pct}%</span>
            <span className="text-[9px] text-ink/55">of cycle</span>
          </ProgressRing>
        </div>
        <div className="relative mt-4 grid grid-cols-3 border-t border-ink/10 pt-4 text-center">
          <div>
            <p className="text-[12px] text-ink/55">Available</p>
            <p className={`font-display text-[19px] font-extrabold tnum ${summary.safe < 0 ? "text-clay" : "text-mint"}`}>
              {formatMoney(summary.safe, currency, { cents: false })}
            </p>
          </div>
          <div className="border-x border-ink/10">
            <p className="text-[12px] text-ink/55">Reserved</p>
            <p className="font-display text-[19px] font-extrabold tnum text-amber">
              {formatMoney(summary.setAside, currency, { cents: false })}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-ink/55">Committed</p>
            <p className="font-display text-[19px] font-extrabold tnum">
              {formatMoney(summary.committed, currency, { cents: false })}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-[20px] font-bold">This pay cycle</h2>
      </div>

      {/* Today status */}
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 ${dueToday.length ? "bg-iris-soft" : "bg-mint-soft"}`}>
        <CheckCircle2 size={20} className={dueToday.length ? "text-iris" : "text-jade"} />
        <div>
          <p className="text-[14px] font-bold">{dueToday.length ? `${dueToday.length} due today` : "Nothing due today"}</p>
          <p className="text-[12px] text-muted">{dueToday.length ? dueToday.map((d) => d.name).join(", ") : "You're all good!"}</p>
        </div>
      </div>

      {/* The connected timeline — the whole cycle on one chalk thread */}
      {(timelineRows.length > 0 || cycle) && (
        <div className="relative pl-1">
          {/* the vertical chalk thread */}
          <div className="pointer-events-none absolute bottom-3 left-[26px] top-3 w-px bg-line/60 chalk-edge" />
          <div className="space-y-1">
            {timelineRows.map(({ e, done }) => {
              const { Icon, label } = typeMeta(e.type);
              const skipped = Boolean(e.skipped);
              const accent = (done || skipped)
                ? "text-faint border-line/60"
                : e.type === "income" ? "text-jade border-jade/60"
                : e.type === "saving" ? "text-amber border-amber/60"
                : e.type === "spending" ? "text-blue border-blue/60"
                : e.type === "debt" ? "text-clay border-clay/60"
                : "text-iris border-iris/60";
              const isIncome = e.type === "income";
              const dd = daysBetween(today(), e.dueDate);
              const whenText =
                dd < -1 ? `${-dd} days ago`
                : dd === -1 ? "Yesterday"
                : dd === 0 ? "Today"
                : dd === 1 ? "Tomorrow"
                : `In ${dd} days`;
              return (
                <div key={e.id} className={`relative flex items-center gap-2 py-2.5 ${done && !skipped ? "opacity-55" : ""} ${skipped ? "opacity-50" : ""}`}>
                  <button onClick={() => setEditing(e)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={`relative z-10 flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border-[1.6px] bg-bg chalk-edge ${accent}`}>
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-display text-[19px] leading-tight ${skipped ? "line-through decoration-1" : ""}`}>{e.name}</span>
                      <span className="block text-[14px]">
                        {skipped ? <span className="text-amber">Skipped this cycle</span> : <span className="text-muted">{label}</span>}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className={`block font-display text-[19px] leading-tight tnum ${skipped ? "text-muted line-through decoration-1" : done ? "text-muted" : isIncome ? "text-jade" : "text-ink"}`}>
                        {isIncome ? "+" : "−"}{formatMoney(e.amount, currency, { cents: false })}
                      </span>
                      <span className="block text-[13px] text-muted">{whenText}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => toggleSkip(e.id)}
                    aria-label={skipped ? "Bring this back" : "Skip this occurrence"}
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.4px] transition-colors ${
                      skipped ? "border-amber/60 text-amber" : "border-line/70 text-faint hover:text-muted"
                    }`}
                  >
                    <Ban size={15} />
                  </button>
                </div>
              );
            })}

            {/* Payday — end of the thread */}
            <div className="relative flex items-center gap-3 py-2.5">
              <span className="relative z-10 flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border-[1.6px] border-jade/70 bg-bg text-jade chalk-edge"><Star size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[19px] leading-tight text-jade">Payday</span>
                <span className="block text-[14px] text-muted tnum">{formatMoney(cycle.income, currency, { cents: false })} estimated</span>
              </span>
              <span className="text-right">
                <span className="block font-display text-[19px] leading-tight text-jade tnum">+{formatMoney(cycle.income, currency, { cents: false })}</span>
                <span className="block text-[13px] text-muted">{formatDate(cycle.nextPayday, { day: "numeric", month: "short" })}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reassurance */}
      <div className="flex items-center gap-3 rounded-2xl bg-iris-soft/50 px-4 py-3.5">
        <ShieldCheck size={20} className="shrink-0 text-iris" />
        <p className="text-[13px] text-ink">
          <span className="font-bold">{allCovered ? "No surprises ahead!" : "This cycle runs tight."}</span>{" "}
          {allCovered ? "All bills are covered in this pay cycle." : "Your bills outweigh your pay this cycle."}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <QuickAction icon={Plus} label="Add bill" tint="bg-iris-soft text-iris" onClick={() => setAdding("bill")} />
        <QuickAction icon={ArrowDownLeft} label="Add income" tint="bg-mint-soft text-jade" onClick={() => setAdding("income")} />
        <QuickAction icon={SlidersHorizontal} label="Adjust plan" tint="bg-blue-soft text-blue" onClick={() => navigate("/plan")} />
      </div>

      <ExpenseSheet open={Boolean(editing)} onClose={() => setEditing(null)} editing={editing} />
      <ExpenseSheet open={adding === "bill"} onClose={() => setAdding(null)} defaultType="bill" />
      <ExpenseSheet open={adding === "income"} onClose={() => setAdding(null)} defaultType="income" />
    </div>
  );
}
