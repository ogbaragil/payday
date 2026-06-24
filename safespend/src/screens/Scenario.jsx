import { useMemo, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import { useApp } from "../context/AppContext.jsx";
import { evaluateScenario, SCENARIO_COPY } from "../lib/calculations.js";
import { formatMoney, currencySymbol } from "../lib/format.js";

const STATUS_STYLES = {
  green: { bar: "bg-jade", soft: "bg-jade-soft", text: "text-jade", ring: "ring-jade/20" },
  amber: { bar: "bg-amber", soft: "bg-amber-soft", text: "text-amber", ring: "ring-amber/20" },
  red: { bar: "bg-clay", soft: "bg-clay-soft", text: "text-clay", ring: "ring-clay/20" },
};

const SUGGESTIONS = [
  { name: "Weekend away", amount: 300 },
  { name: "New shoes", amount: 120 },
  { name: "Dinner out", amount: 80 },
  { name: "Concert ticket", amount: 150 },
];

export default function Scenario() {
  const { cycle, currency } = useApp();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const result = useMemo(() => {
    if (!cycle || !(Number(amount) > 0)) return null;
    return evaluateScenario(cycle, Number(amount));
  }, [cycle, amount]);

  if (!cycle) return null;
  const s = result ? STATUS_STYLES[result.status] : null;
  const copy = result ? SCENARIO_COPY[result.status] : null;

  return (
    <div className="space-y-5">
      <header className="px-1 pt-1">
        <h1 className="font-display text-[22px] font-bold tracking-tight">Can I afford it?</h1>
        <p className="text-[14px] text-muted">Test a purchase before you make it</p>
      </header>

      {/* Input card */}
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-1 rounded-2xl bg-elevated px-5 py-5">
          <span className="font-display text-3xl font-semibold text-muted">
            {currencySymbol(currency)}
          </span>
          <input
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent font-display text-5xl font-extrabold tracking-tight outline-none placeholder:text-faint tnum"
          />
        </div>
        <input
          placeholder="What are you eyeing?"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] font-medium outline-none transition focus:border-jade"
        />
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {SUGGESTIONS.map((sug) => (
            <button
              key={sug.name}
              onClick={() => {
                setName(sug.name);
                setAmount(String(sug.amount));
              }}
              className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-muted transition hover:border-jade hover:text-jade"
            >
              {sug.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Result */}
      {result ? (
        <div className={`rounded-4xl ${s.soft} p-6 ring-1 ${s.ring} animate-scale-in`}>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${s.bar}`} />
            <span className={`text-[13px] font-bold uppercase tracking-wide ${s.text}`}>
              {result.status === "green" ? "On track" : result.status === "amber" ? "Tight" : "Risky"}
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-1 text-[14px] text-muted">{copy.detail}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface/70 p-4">
              <p className="text-[12px] font-medium text-muted">Safe to spend now</p>
              <p className="mt-1 font-display text-xl font-bold tnum">
                {formatMoney(result.safeBefore, currency, { cents: false })}
              </p>
            </div>
            <div className="rounded-2xl bg-surface/70 p-4">
              <p className="text-[12px] font-medium text-muted">After this</p>
              <p className={`mt-1 font-display text-xl font-bold tnum ${s.text}`}>
                {formatMoney(result.safeAfter, currency, { cents: false })}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface/70 px-4 py-3.5">
            <span className="text-[13px] font-medium text-muted">Daily allowance after</span>
            <div className="flex items-center gap-2 text-[15px] font-bold tnum">
              <span className="text-muted">
                {formatMoney(Math.max(0, result.perDayBefore), currency, { cents: false })}
              </span>
              <ArrowRight size={15} className="text-faint" />
              <span className={s.text}>
                {formatMoney(result.perDayAfter, currency, { cents: false })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <Card className="px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-jade-soft">
            <Sparkles size={22} className="text-jade" />
          </div>
          <p className="font-display text-lg font-bold">Try a what-if</p>
          <p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">
            Enter an amount to see how a purchase changes your safe-to-spend before payday.
          </p>
        </Card>
      )}
    </div>
  );
}
