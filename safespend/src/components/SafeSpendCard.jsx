import { Info, ChevronRight } from "lucide-react";
import { formatMoneyRound, formatMoney } from "../lib/format.js";
import { useCountUp } from "../hooks/useCountUp.js";

// The signature: a near-black "money card" anchoring the Overview. Big available
// number, a green pay-cycle progress bar, and day counters either side.
export default function SafeSpendCard({ summary, currency, daysSince, daysLeft, onDetails }) {
  const animated = useCountUp(summary.safe);
  const negative = summary.safe < 0;
  const pct = Math.round((summary.progress || 0) * 100);

  return (
    <div className="relative overflow-hidden chalk-card p-6 text-ink">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(88 68 244 / 0.5) 0%, transparent 70%)" }}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink/65">
            Available today <Info size={13} className="text-ink/40" />
          </span>
          {onDetails && (
            <button
              onClick={onDetails}
              className="flex items-center gap-0.5 rounded-full bg-ink/10 px-3 py-1.5 text-[12px] font-semibold text-ink/85 transition active:scale-95"
            >
              View details <ChevronRight size={14} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-end gap-3">
          <span className={`font-display text-[52px] font-extrabold leading-none tracking-tight tnum ${negative ? "text-clay" : "text-mint"}`}>
            {formatMoneyRound(animated, currency)}
          </span>
          {!negative && (
            <span className="mb-1.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-mint">
              <span className="h-2 w-2 rounded-full bg-mint" /> Safe to spend
            </span>
          )}
        </div>
        <p className="mt-2 text-[13px] text-ink/55">
          {negative ? (
            <>You're over by {formatMoney(Math.abs(summary.safe), currency)} this cycle.</>
          ) : (
            <>of {formatMoney(summary.income, currency, { cents: false })} this pay cycle</>
          )}
        </p>

        <div className="mt-5">
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink/12">
            <div
              className="h-full rounded-full bg-mint chalk-edge transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(5, pct)}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[12px]">
            <span className="text-ink/55">
              <span className="font-semibold text-ink/80 tnum">{daysSince}</span> days since payday
            </span>
            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold text-ink/80 tnum">{pct}%</span>
            <span className="text-ink/55 tnum">
              <span className="font-semibold text-ink/80">{daysLeft}</span> days until payday
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
