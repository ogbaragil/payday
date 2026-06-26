import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, ArrowDownLeft, RefreshCw, ChevronRight, ArrowUpRight,
  CalendarCheck, TrendingUp, Receipt, PiggyBank, Telescope, Star, Trash2,
} from "lucide-react";
import SafeSpendCard from "../components/SafeSpendCard.jsx";
import ExpenseSheet from "../components/ExpenseSheet.jsx";
import NewCycleSheet from "../components/NewCycleSheet.jsx";
import SpendSheet from "../components/SpendSheet.jsx";
import { Card } from "../components/ui/Card.jsx";
import { typeMeta } from "../lib/typeMeta.js";
import { useApp } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { cycleSummary, upcomingExpenses } from "../lib/calculations.js";
import { forwardLookSummary } from "../lib/planner.js";
import { formatMoney, formatDate, today, daysBetween, relativeTime } from "../lib/format.js";
import { firstNameFrom } from "../lib/user.js";

function StatCard({ icon: Icon, tint, label, value, caption }) {
  return (
    <Card className="p-3.5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <p className="mt-2.5 text-[12px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 font-display text-[20px] font-extrabold tnum">{value}</p>
      {caption && <p className="text-[11px] text-faint">{caption}</p>}
    </Card>
  );
}

export default function Home() {
  const { cycle, currency, profile, removeSpend } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [newCycle, setNewCycle] = useState(false);
  const [spendSheet, setSpendSheet] = useState(false);

  const summary = useMemo(() => cycleSummary(cycle, profile), [cycle, profile]);
  const forward = useMemo(() => {
    try { return forwardLookSummary(cycle, profile, 12); } catch { return null; }
  }, [cycle, profile]);
  const upcoming = useMemo(
    () => upcomingExpenses(cycle).filter((e) => daysBetween(today(), e.dueDate) >= 0),
    [cycle]
  );

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = firstNameFrom(profile, user);
  const greeting = name ? `${timeGreeting}, ${name}` : timeGreeting;

  if (!cycle) return null;

  const daysLeft = summary.daysLeft;
  const daysSince = Math.max(0, daysBetween(cycle.startDate, today()));
  const todayBills = upcoming.filter((e) => daysBetween(today(), e.dueDate) === 0 && e.type !== "income");
  const nextBill = upcoming.find((e) => e.type !== "income" && daysBetween(today(), e.dueDate) > 0);
  const spends = [...(cycle.spends || [])].reverse();

  return (
    <div className="space-y-5">
      <header className="px-1 pt-1">
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-tight">
          {greeting} <span className="inline-block">👋</span>
        </h1>
        <p className="text-[14px] text-muted">Here's your payday snapshot</p>
      </header>

      {summary.complete ? (
        <Card className="overflow-hidden p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-soft">
            <RefreshCw size={22} className="text-jade" />
          </div>
          <h2 className="font-display text-xl font-bold">Payday's here</h2>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">
            Nice work getting through the cycle. Start a fresh one to plan your new pay.
          </p>
          <button
            onClick={() => setNewCycle(true)}
            className="mt-4 rounded-2xl bg-iris px-5 py-3 text-[15px] font-semibold text-white shadow-iris"
          >
            Start new pay cycle
          </button>
        </Card>
      ) : (
        <SafeSpendCard
          summary={summary}
          currency={currency}
          daysSince={daysSince}
          daysLeft={daysLeft}
          onDetails={() => navigate("/plan")}
        />
      )}

      {/* Today's focus */}
      {!summary.complete && (
        <Card className="flex items-stretch gap-4 p-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${todayBills.length ? "bg-iris-soft text-iris" : "bg-mint-soft text-jade"}`}>
              <CalendarCheck size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Today's focus</p>
              {todayBills.length ? (
                <>
                  <p className="font-display text-[20px] font-bold">{todayBills.length} due today</p>
                  <p className="truncate text-[13px] text-muted">
                    {todayBills.map((b) => b.name).join(", ")}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-[20px] font-bold">You're all good today</p>
                  <p className="text-[13px] text-muted">No bills due. Enjoy your day.</p>
                </>
              )}
            </div>
          </div>
          {nextBill && (
            <div className="shrink-0 border-l border-line pl-4 text-right">
              <p className="text-[12px] font-medium text-muted">Next bill</p>
              <p className="font-display text-[15px] font-bold leading-tight">{nextBill.name}</p>
              <p className="text-[12px] text-muted">{formatDate(nextBill.dueDate, { day: "numeric", month: "short" })}</p>
              <p className="mt-0.5 text-[14px] font-bold text-iris tnum">
                {formatMoney(nextBill.amount, currency, { cents: false })}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={TrendingUp} tint="bg-iris-soft text-iris"
          label="Per day" value={formatMoney(Math.max(0, summary.perDay), currency, { cents: false })}
          caption="until payday"
        />
        <StatCard
          icon={Receipt} tint="bg-blue-soft text-blue"
          label="Spent" value={formatMoney(summary.spent, currency, { cents: false })}
          caption="this cycle"
        />
        <StatCard
          icon={PiggyBank} tint="bg-amber-soft text-amber"
          label="Reserved" value={formatMoney(summary.setAside, currency, { cents: false })}
          caption="for big bills"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setSheet("expense")} className="chalk-hairline flex flex-col items-center gap-1.5 rounded-2xl py-3.5 text-iris transition active:scale-[0.97]">
          <Plus size={19} /><span className="font-display text-[16px]">Add expense</span>
        </button>
        <button onClick={() => setSheet("income")} className="chalk-hairline flex flex-col items-center gap-1.5 rounded-2xl py-3.5 text-ink transition active:scale-[0.97]">
          <ArrowDownLeft size={19} /><span className="font-display text-[16px]">Add income</span>
        </button>
        <button onClick={() => setNewCycle(true)} className="chalk-hairline flex flex-col items-center gap-1.5 rounded-2xl py-3.5 text-ink transition active:scale-[0.97]">
          <RefreshCw size={19} /><span className="font-display text-[16px]">New cycle</span>
        </button>
      </div>

      {/* Spending money — where this cycle's leftover goes */}
      {!summary.complete && (
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="font-display text-[20px] font-bold tracking-tight">Spending money</h2>
            <button onClick={() => setSpendSheet(true)} className="flex items-center gap-0.5 text-[13px] font-semibold text-iris">
              <Plus size={15} /> Log a spend
            </button>
          </div>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-[12px] font-medium text-muted">Spent this cycle</p>
                <p className="font-display text-[20px] font-extrabold tnum">{formatMoney(summary.spent, currency, { cents: false })}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-medium text-muted">Safe to spend</p>
                <p className={`font-display text-[20px] font-extrabold tnum ${summary.safe < 0 ? "text-clay" : "text-jade"}`}>
                  {formatMoney(summary.safe, currency, { cents: false })}
                </p>
              </div>
            </div>
            {spends.length > 0 ? (
              <div className="divide-y divide-line/60 border-t border-line/60">
                {spends.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-blue">
                      <Receipt size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{s.name}</span>
                      <span className="block text-[11px] text-muted">{relativeTime(s.date)}</span>
                    </span>
                    <span className="shrink-0 text-[14px] font-bold tnum">−{formatMoney(s.amount, currency, { cents: false })}</span>
                    <button onClick={() => removeSpend(s.id)} aria-label="Remove spend" className="shrink-0 text-faint transition hover:text-clay">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t border-line/60 px-4 py-5 text-center text-[13px] text-muted">
                Nothing logged yet. Record a purchase to see where your leftover goes.
              </p>
            )}
            <button
              onClick={() => setSpendSheet(true)}
              className="flex w-full items-center justify-center gap-1.5 border-t border-line/60 bg-iris-soft/40 py-3 text-[14px] font-semibold text-iris transition active:bg-iris-soft"
            >
              <Plus size={16} /> Log a spend
            </button>
          </Card>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-[20px] font-bold tracking-tight">Upcoming</h2>
          <button onClick={() => navigate("/timeline")} className="flex items-center gap-0.5 text-[13px] font-semibold text-iris">
            View timeline <ArrowUpRight size={15} />
          </button>
        </div>
        <Card className="overflow-hidden">
          {upcoming.length ? (
            <div className="divide-y divide-line/60">
              {upcoming.slice(0, 3).map((e) => {
                const { Icon, tint } = typeMeta(e.type);
                const isIncome = e.type === "income";
                return (
                  <button key={e.id} onClick={() => navigate("/timeline")} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-elevated">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{e.name}</span>
                      <span className="block text-[12px] text-muted">{formatDate(e.dueDate, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </span>
                    <span className={`text-[14px] font-bold tnum ${isIncome ? "text-jade" : "text-ink"}`}>
                      {isIncome ? "+" : "−"}{formatMoney(e.amount, currency, { cents: false })}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-[14px] font-semibold">Nothing scheduled</p>
              <p className="mt-0.5 text-[13px] text-muted">Add a bill and it'll show up here.</p>
            </div>
          )}
          <button
            onClick={() => navigate("/timeline")}
            className="flex w-full items-center justify-between bg-iris-soft/50 px-4 py-3 text-left transition active:bg-iris-soft"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-iris text-white">
                <Star size={16} />
              </span>
              <span>
                <span className="block text-[14px] font-bold text-iris">Payday {formatDate(cycle.nextPayday, { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="block text-[12px] text-iris/70 tnum">{formatMoney(cycle.income, currency, { cents: false })} estimated</span>
              </span>
            </span>
            <ChevronRight size={18} className="text-iris/60" />
          </button>
        </Card>
      </section>

      {/* Looking ahead */}
      {!summary.complete && forward && (forward.reservedTotal > 0 || forward.firstRed) && (
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-iris-soft text-iris">
              <Telescope size={15} />
            </span>
            <span className="text-[14px] font-semibold">Looking ahead</span>
          </div>
          {forward.reservedTotal > 0 && (
            <p className="text-[13px] text-muted">
              Auto set-aside is reserving{" "}
              <span className="font-semibold text-ink tnum">{formatMoney(forward.reservedTotal, currency, { cents: false })}</span>
              /cycle for upcoming bills
              {forward.reservedItems.length ? ` like ${forward.reservedItems.slice(0, 2).join(", ")}` : ""}.
            </p>
          )}
          {forward.firstRed ? (
            <p className="mt-1.5 text-[13px] font-medium text-clay">
              Heads up: the cycle starting {formatDate(forward.firstRed.start, { day: "numeric", month: "short" })} still falls
              short by {formatMoney(Math.abs(forward.firstRed.safe), currency, { cents: false })}. Consider easing a bill or moving a goal.
            </p>
          ) : (
            forward.reservedTotal > 0 && (
              <p className="mt-1.5 text-[13px] font-medium text-jade">
                On track — your bills are covered for the next {forward.horizonMonths} months.
              </p>
            )
          )}
        </Card>
      )}

      <ExpenseSheet open={sheet === "expense"} onClose={() => setSheet(null)} defaultType="spending" />
      <ExpenseSheet open={sheet === "income"} onClose={() => setSheet(null)} defaultType="income" />
      <NewCycleSheet open={newCycle} onClose={() => setNewCycle(false)} />
      <SpendSheet open={spendSheet} onClose={() => setSpendSheet(false)} />
    </div>
  );
}
