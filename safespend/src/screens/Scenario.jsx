import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Check, CheckCircle2, Sparkles, X } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import { useApp } from "../context/AppContext.jsx";
import { cycleSummary } from "../lib/calculations.js";
import { planForwardCycles } from "../lib/planner.js";
import { formatMoney, currencySymbol } from "../lib/format.js";

const COST_CHIPS = [20, 50, 100, 200];
const TIMING = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "payday", label: "Next payday" },
];

const VERDICT = {
  green: { tone: "text-jade", soft: "bg-mint-soft", bar: "bg-mint", chip: "text-jade", title: "Yes, you can afford this!" },
  amber: { tone: "text-amber", soft: "bg-amber-soft", bar: "bg-amber", chip: "text-amber", title: "Possible, but tight" },
  red: { tone: "text-clay", soft: "bg-clay-soft", bar: "bg-clay", chip: "text-clay", title: "Risk of running short" },
};

export default function Scenario() {
  const { cycle, currency, profile, addExpense, logSpend } = useApp();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [timing, setTiming] = useState("today");
  const [added, setAdded] = useState(false);

  const summary = useMemo(() => cycleSummary(cycle, profile), [cycle, profile]);
  const nextSafe = useMemo(() => {
    try { return planForwardCycles(cycle, profile, 1)[1]?.safe ?? summary.safe; }
    catch { return summary.safe; }
  }, [cycle, profile, summary.safe]);

  if (!cycle) return null;

  const spend = Number(amount) || 0;
  const baseSafe = timing === "payday" ? nextSafe : summary.safe;
  const safeAfter = baseSafe - spend;
  const has = spend > 0;
  const status = !has ? null : safeAfter < 0 ? "red" : baseSafe > 0 && safeAfter < baseSafe * 0.15 ? "amber" : "green";
  const v = status ? VERDICT[status] : null;
  const fillPct = baseSafe > 0 ? Math.max(0, Math.min(1, safeAfter / baseSafe)) : 0;

  const buy = async () => {
    if (!has) return;
    if (timing === "payday") {
      // A purchase you'll make next cycle → plan it as a future spend.
      await addExpense({ name: name.trim() || "Purchase", amount: spend, type: "spending", dueDate: cycle.nextPayday, recurring: false });
    } else {
      // Buying it now → record it in this cycle's spend log.
      await logSpend({ name: name.trim() || "Purchase", amount: spend });
    }
    setAdded(true);
    setTimeout(() => { setAdded(false); setAmount(""); setName(""); }, 1400);
  };

  return (
    <div className="space-y-5">
      <header className="px-1 pt-1">
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-tight">Can I buy this?</h1>
        <p className="text-[14px] text-muted">Check if a purchase fits in your plan</p>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden chalk-card p-6 text-ink">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, rgb(88 68 244 / 0.5) 0%, transparent 70%)" }} />
        <div className="relative flex items-stretch justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink/60">{timing === "payday" ? "Available next cycle" : "Available today"}</p>
            <p className={`font-display text-[40px] font-extrabold leading-none tracking-tight tnum ${baseSafe < 0 ? "text-clay" : "text-mint"}`}>
              {formatMoney(baseSafe, currency, { cents: false })}
            </p>
            <p className="mt-1.5 text-[12px] text-ink/50">of {formatMoney(summary.income, currency, { cents: false })} this pay cycle</p>
          </div>
          <div className="shrink-0 border-l border-ink/10 pl-4 text-right">
            <p className="text-[13px] font-medium text-ink/60">Impact on cycle</p>
            <p className={`font-display text-[22px] font-extrabold tnum ${!has ? "text-ink/80" : safeAfter < 0 ? "text-clay" : "text-mint"}`}>
              {has ? formatMoney(safeAfter, currency, { cents: false }) : "—"}
            </p>
            <p className="text-[11px] text-ink/45">remaining</p>
            {has && (
              <span className={`mt-1 inline-flex items-center gap-1 text-[12px] font-semibold ${safeAfter < 0 ? "text-clay" : "text-mint"}`}>
                {safeAfter < 0 ? "Over budget" : "Still on track"} {safeAfter >= 0 && <CheckCircle2 size={13} />}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cost */}
      <Card className="p-5">
        <p className="text-[14px] font-bold">What's the total cost?</p>
        <p className="text-[13px] text-muted">Include tax, fees, shipping etc.</p>
        <div className="mt-3 flex items-center gap-1 rounded-2xl bg-elevated px-4 py-3.5">
          <span className="font-display text-2xl font-semibold text-muted">{currencySymbol(currency)}</span>
          <input
            inputMode="decimal" placeholder="0" value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent font-display text-3xl font-extrabold tracking-tight outline-none placeholder:text-faint tnum"
          />
          {amount && <button onClick={() => setAmount("")} className="text-faint"><X size={18} /></button>}
        </div>
        <input
          placeholder="What are you eyeing? (optional)" value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-3 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] font-medium outline-none transition focus:border-iris"
        />
        <div className="mt-3 grid grid-cols-5 gap-2">
          {COST_CHIPS.map((c) => (
            <button key={c} onClick={() => setAmount(String(c))}
              className={`rounded-xl border py-2.5 text-[14px] font-bold transition ${Number(amount) === c ? "border-iris bg-iris-soft text-iris" : "border-line bg-surface text-ink hover:border-faint"}`}>
              ${c}
            </button>
          ))}
          <button onClick={() => document.activeElement?.blur()}
            className="rounded-xl border border-line bg-surface py-2.5 text-[13px] font-semibold text-muted">Other</button>
        </div>
      </Card>

      {/* Timing */}
      <Card className="p-5">
        <p className="text-[14px] font-bold">When will you pay for it?</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {TIMING.map((t) => (
            <button key={t.id} onClick={() => setTiming(t.id)}
              className={`rounded-xl border px-1 py-2.5 text-[12px] font-semibold transition ${timing === t.id ? "border-iris bg-iris-soft text-iris" : "border-line bg-surface text-muted hover:border-faint"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {has ? (
        <>
          {/* Impact breakdown */}
          <Card className="p-5">
            <p className="text-[14px] font-bold">Here's the impact</p>
            <div className="mt-3 space-y-2 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-muted">{timing === "payday" ? "Available next cycle" : "Available today"}</span>
                <span className="font-semibold tnum">{formatMoney(baseSafe, currency, { cents: false })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-clay">This purchase</span>
                <span className="font-semibold text-clay tnum">−{formatMoney(spend, currency, { cents: false })}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="font-bold">Remaining after</span>
                <span className={`font-display text-[18px] font-extrabold tnum ${v.tone}`}>{formatMoney(safeAfter, currency, { cents: false })}</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                <div className={`h-full rounded-full ${v.bar} transition-[width] duration-500`} style={{ width: `${Math.max(2, fillPct * 100)}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-faint tnum">
                <span>{formatMoney(0, currency, { cents: false })}</span>
                <span>{formatMoney(Math.max(0, baseSafe), currency, { cents: false })}</span>
              </div>
            </div>
          </Card>

          {/* Verdict */}
          <div className={`flex items-start gap-3 rounded-2xl ${v.soft} p-4`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface ${v.tone}`}>
              <Sparkles size={18} />
            </span>
            <div>
              <p className="font-display text-[16px] font-extrabold">{v.title}</p>
              <p className="text-[13px] text-muted">
                {status === "red"
                  ? `This would put you ${formatMoney(Math.abs(safeAfter), currency, { cents: false })} over before payday.`
                  : `You'll still have ${formatMoney(safeAfter, currency, { cents: false })} safe to spend after this.`}
              </p>
            </div>
          </div>

          {/* Why */}
          <Card className="p-5">
            <p className="text-[14px] font-bold">{status === "red" ? "What to watch" : "Why it's safe"}</p>
            <ul className="mt-3 space-y-2.5">
              {[
                summary.committed >= 0 ? "All upcoming bills are covered" : null,
                status !== "red" ? "You'll still have buffer until payday" : "This eats into money meant for bills",
                status === "red"
                  ? `You'd finish this cycle ${formatMoney(Math.abs(safeAfter), currency, { cents: false })} short`
                  : `You're on track to finish with ${formatMoney(safeAfter, currency, { cents: false })} left`,
              ].filter(Boolean).map((line, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[14px]">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${status === "red" ? "bg-clay-soft text-clay" : "bg-mint-soft text-jade"}`}>
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </Card>

          {/* CTAs */}
          <div className="space-y-3">
            <button onClick={buy} disabled={added}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-iris text-[16px] font-bold text-white shadow-iris transition active:scale-[0.98] disabled:opacity-70">
              {added ? <><CheckCircle2 size={20} /> Added to your plan</> : "Yes, I'll buy it"}
            </button>
            <button onClick={() => { setAmount(""); setName(""); }}
              className="h-12 w-full rounded-2xl border border-iris/25 text-[15px] font-bold text-iris transition active:scale-[0.98]">
              Choose a different amount
            </button>
          </div>
        </>
      ) : (
        <Card className="px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-iris-soft">
            <ShoppingBag size={22} className="text-iris" />
          </div>
          <p className="font-display text-lg font-bold">Thinking of a purchase?</p>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">
            Enter a cost above and we'll show whether it fits before your next payday.
          </p>
        </Card>
      )}
    </div>
  );
}
