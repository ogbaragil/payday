import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, ArrowUpRight, Receipt, Telescope, Star, Trash2, Sun, Moon, RefreshCw,
} from "lucide-react";
import SafeSpendCard from "../components/SafeSpendCard.jsx";
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
import { getTheme, toggleTheme } from "../lib/theme.js";

export default function Home() {
  const { cycle, currency, profile, removeSpend } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [newCycle, setNewCycle] = useState(false);
  const [spendSheet, setSpendSheet] = useState(false);
  const [theme, setTheme] = useState(getTheme());

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
  const nextItems = upcoming.filter((e) => daysBetween(today(), e.dueDate) > 0).slice(0, 2);
  const spends = [...(cycle.spends || [])].reverse();

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between px-1 pt-1">
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-tight">
          {greeting} <span className="inline-block">👋</span>
        </h1>
        <button
          onClick={() => setTheme(toggleTheme())}
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          className="chalk-hairline mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {summary.complete ? (
        <Card className="overflow-hidden p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-soft">
            <RefreshCw size={22} className="text-jade" />
          </div>
          <h2 className="font-display text-[24px] font-bold">Payday's here</h2>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">
            Nice work getting through the cycle. Start a fresh one to plan your new pay.
          </p>
          <button
            onClick={() => setNewCycle(true)}
            className="mt-4 rounded-2xl border-[1.6px] border-iris/70 bg-iris-soft/70 px-5 py-3 font-display text-[16px] text-iris transition active:scale-[0.98]"
          >
            Start new pay cycle
          </button>
        </Card>
      ) : (
        <>
          {/* Hero — the one number that matters */}
          <SafeSpendCard
            summary={summary}
            currency={currency}
            daysSince={daysSince}
            daysLeft={daysLeft}
            onDetails={() => navigate("/plan")}
          />
          {summary.safe > 0 && daysLeft > 0 && (
            <p className="-mt-2 text-center font-display text-[15px] text-muted tnum">
              about {formatMoney(Math.max(0, summary.perDay), currency, { cents: false })} a day until payday
            </p>
          )}

          {/* Up next — today's status, the next couple of items, and payday, in one place */}
          <Card as="button" onClick={() => navigate("/timeline")} className="block w-full p-4 text-left transition active:scale-[0.99]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Up next</span>
              <span className="flex items-center gap-0.5 text-[13px] text-iris">Timeline <ArrowUpRight size={14} /></span>
            </div>

            {todayBills.length > 0 && (
              <p className="mt-2 font-display text-[19px] leading-tight">
                {todayBills.length} due today
                <span className="block font-sans text-[13px] text-muted">{todayBills.map((b) => b.name).join(", ")}</span>
              </p>
            )}

            <div className="mt-2 space-y-0.5">
              {nextItems.map((e) => {
                const { Icon, tint } = typeMeta(e.type);
                const isIncome = e.type === "income";
                return (
                  <div key={e.id} className="flex items-center gap-3 py-1">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{e.name}</span>
                      <span className="block text-[12px] text-muted">{formatDate(e.dueDate, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </span>
                    <span className={`text-[15px] tnum ${isIncome ? "text-jade" : "text-ink"}`}>
                      {isIncome ? "+" : "−"}{formatMoney(e.amount, currency, { cents: false })}
                    </span>
                  </div>
                );
              })}

              <div className="flex items-center gap-3 py-1">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-jade">
                  <Star size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-jade">Payday</span>
                  <span className="block text-[12px] text-muted">{formatDate(cycle.nextPayday, { weekday: "short", day: "numeric", month: "short" })}</span>
                </span>
                <span className="text-[15px] tnum text-jade">+{formatMoney(cycle.income, currency, { cents: false })}</span>
              </div>
            </div>

            {todayBills.length === 0 && nextItems.length === 0 && (
              <p className="mt-2 text-[13px] text-muted">Nothing due before payday — you're all clear.</p>
            )}
          </Card>

          {/* Spending — one clear action, plus the log */}
          <section>
            <div className="mb-2 flex items-end justify-between px-1">
              <div>
                <h2 className="font-display text-[20px] font-bold tracking-tight">Spending</h2>
                <p className="text-[13px] text-faint tnum">{formatMoney(summary.spent, currency, { cents: false })} spent this cycle</p>
              </div>
              <button onClick={() => setSpendSheet(true)} className="flex items-center gap-1 font-display text-[15px] text-iris">
                <Plus size={15} /> Log a spend
              </button>
            </div>
            <Card className="overflow-hidden">
              {spends.length > 0 ? (
                <div className="divide-y divide-line/60">
                  {spends.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-blue">
                        <Receipt size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{s.name}</span>
                        <span className="block text-[12px] text-muted">{relativeTime(s.date)}</span>
                      </span>
                      <span className="shrink-0 text-[15px] tnum">−{formatMoney(s.amount, currency, { cents: false })}</span>
                      <button onClick={() => removeSpend(s.id)} aria-label="Remove spend" className="shrink-0 text-faint transition hover:text-clay">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={() => setSpendSheet(true)} className="block w-full px-4 py-6 text-center transition active:bg-elevated">
                  <p className="font-display text-[16px]">Nothing logged yet</p>
                  <p className="mt-0.5 text-[13px] text-muted">Tap to record where your safe-to-spend goes.</p>
                </button>
              )}
            </Card>
          </section>

          {/* Looking ahead — a slim banner, only when there's something to flag */}
          {forward && (forward.reservedTotal > 0 || forward.firstRed) && (
            <div className="chalk-hairline flex items-start gap-2.5 rounded-2xl px-4 py-3">
              <Telescope size={16} className={`mt-0.5 shrink-0 ${forward.firstRed ? "text-clay" : "text-iris"}`} />
              <p className="text-[13px] text-muted">
                {forward.firstRed ? (
                  <>
                    Heads up — the cycle from {formatDate(forward.firstRed.start, { day: "numeric", month: "short" })} falls short by{" "}
                    <span className="font-semibold text-clay tnum">{formatMoney(Math.abs(forward.firstRed.safe), currency, { cents: false })}</span>. Ease a bill or move a goal.
                  </>
                ) : (
                  <>
                    Reserving{" "}
                    <span className="font-semibold text-ink tnum">{formatMoney(forward.reservedTotal, currency, { cents: false })}</span>/cycle for upcoming bills —{" "}
                    <span className="text-jade">on track for {forward.horizonMonths} months</span>.
                  </>
                )}
              </p>
            </div>
          )}
        </>
      )}

      <NewCycleSheet open={newCycle} onClose={() => setNewCycle(false)} />
      <SpendSheet open={spendSheet} onClose={() => setSpendSheet(false)} />
    </div>
  );
}
