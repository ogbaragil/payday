import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowDownLeft, Sparkles, RefreshCw, ArrowUpRight, PiggyBank } from "lucide-react";
import SafeSpendCard from "../components/SafeSpendCard.jsx";
import ExpenseRow from "../components/ExpenseRow.jsx";
import ExpenseSheet from "../components/ExpenseSheet.jsx";
import NewCycleSheet from "../components/NewCycleSheet.jsx";
import { Card, SectionTitle } from "../components/ui/Card.jsx";
import { useApp } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { cycleSummary, upcomingExpenses } from "../lib/calculations.js";
import { formatMoney, formatDate, today, daysBetween } from "../lib/format.js";
import { firstNameFrom } from "../lib/user.js";

function QuickAction({ icon: Icon, label, onClick, tone = "default" }) {
  const tones = {
    default: "bg-surface text-ink",
    jade: "bg-jade text-white",
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-2 rounded-3xl px-2 py-4 shadow-soft transition active:scale-[0.97] ${tones[tone]}`}
    >
      <Icon size={20} strokeWidth={2.2} />
      <span className="text-[12px] font-semibold leading-tight">{label}</span>
    </button>
  );
}

export default function Home() {
  const { cycle, currency, profile } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null); // 'expense' | 'income' | null
  const [newCycle, setNewCycle] = useState(false);

  const summary = useMemo(() => cycleSummary(cycle, profile), [cycle, profile]);
  const upcoming = useMemo(
    () => upcomingExpenses(cycle).filter((e) => daysBetween(today(), e.dueDate) >= 0).slice(0, 4),
    [cycle]
  );

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = firstNameFrom(profile, user);
  const greeting = name ? `${timeGreeting}, ${name}` : timeGreeting;

  if (!cycle) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between px-1 pt-1">
        <div>
          <p className="text-[13px] font-medium text-muted">{greeting}</p>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Here's your plan</h1>
        </div>
      </header>

      {summary.complete ? (
        <Card className="overflow-hidden p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-jade-soft">
            <RefreshCw size={22} className="text-jade" />
          </div>
          <h2 className="font-display text-xl font-bold">Payday's here</h2>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">
            Nice work getting through the cycle. Start a fresh one to plan your new pay.
          </p>
          <button
            onClick={() => setNewCycle(true)}
            className="mt-4 rounded-2xl bg-jade px-5 py-3 text-[15px] font-semibold text-white"
          >
            Start new pay cycle
          </button>
        </Card>
      ) : (
        <SafeSpendCard summary={summary} currency={currency} payday={formatDate(cycle.nextPayday, { day: "numeric", month: "short" })} />
      )}

      {!summary.complete && summary.setAside > 0 && (
        <div className="-mt-2 flex items-center gap-2 rounded-2xl bg-amber-soft/50 px-4 py-2.5">
          <PiggyBank size={16} className="shrink-0 text-amber" />
          <p className="text-[13px] text-ink">
            <span className="font-semibold tnum">{formatMoney(summary.setAside, currency, { cents: false })}</span>{" "}
            set aside this cycle for upcoming bills.
          </p>
        </div>
      )}

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-[13px] font-medium text-muted">Daily allowance</p>
          <p className="mt-1 font-display text-2xl font-bold tnum">
            {formatMoney(Math.max(0, summary.perDay), currency, { cents: false })}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[13px] font-medium text-muted">Committed</p>
          <p className="mt-1 font-display text-2xl font-bold tnum">
            {formatMoney(summary.committed, currency, { cents: false })}
          </p>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <QuickAction icon={Plus} label="Add expense" tone="jade" onClick={() => setSheet("expense")} />
        <QuickAction icon={ArrowDownLeft} label="Add income" onClick={() => setSheet("income")} />
        <QuickAction icon={Sparkles} label="Scenario" onClick={() => navigate("/scenario")} />
        <QuickAction icon={RefreshCw} label="New cycle" onClick={() => setNewCycle(true)} />
      </div>

      {/* Upcoming */}
      <section>
        <SectionTitle
          action={
            <button
              onClick={() => navigate("/timeline")}
              className="flex items-center gap-0.5 text-[13px] font-semibold text-jade"
            >
              Timeline <ArrowUpRight size={15} />
            </button>
          }
        >
          Coming up
        </SectionTitle>
        {upcoming.length ? (
          <Card className="p-2">
            {upcoming.map((e) => (
              <ExpenseRow key={e.id} expense={e} currency={currency} onClick={() => navigate("/timeline")} />
            ))}
          </Card>
        ) : (
          <Card className="px-5 py-8 text-center">
            <p className="text-[15px] font-semibold">Nothing scheduled</p>
            <p className="mt-1 text-[14px] text-muted">
              Add a bill or expense and it'll show up here.
            </p>
            <button
              onClick={() => setSheet("expense")}
              className="mt-4 rounded-2xl bg-jade-soft px-4 py-2.5 text-[14px] font-semibold text-jade"
            >
              Add your first item
            </button>
          </Card>
        )}
      </section>

      <ExpenseSheet
        open={sheet === "expense"}
        onClose={() => setSheet(null)}
        defaultType="spending"
      />
      <ExpenseSheet
        open={sheet === "income"}
        onClose={() => setSheet(null)}
        defaultType="income"
      />
      <NewCycleSheet open={newCycle} onClose={() => setNewCycle(false)} />
    </div>
  );
}
