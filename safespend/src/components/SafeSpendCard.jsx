import { formatMoneyRound, formatMoney } from "../lib/format.js";
import { useCountUp } from "../hooks/useCountUp.js";

// The signature: a dark, dimensional "money card" that anchors the home screen.
export default function SafeSpendCard({ summary, currency, payday }) {
  const animated = useCountUp(summary.safe);
  const negative = summary.safe < 0;
  const pct = Math.round(summary.progress * 100);

  return (
    <div className="relative overflow-hidden rounded-4xl p-6 text-white shadow-hero">
      {/* layered gradient + sheen for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, #1c3a30 0%, #14241f 42%, #0c1714 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full opacity-40 blur-2xl"
        style={{ background: "radial-gradient(circle, #2f6b56 0%, transparent 70%)" }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-white/65">Safe to spend</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/80 tnum">
            {summary.daysLeft} {summary.daysLeft === 1 ? "day" : "days"} left
          </span>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-[56px] font-extrabold leading-none tracking-tight tnum">
            {formatMoneyRound(animated, currency)}
          </span>
        </div>

        <p className="mt-2 text-[14px] text-white/65">
          {negative ? (
            <>You're over by {formatMoney(Math.abs(summary.safe), currency)} this cycle.</>
          ) : (
            <>
              About{" "}
              <span className="font-semibold text-white/90 tnum">
                {formatMoney(summary.perDay, currency)}
              </span>{" "}
              a day until payday.
            </>
          )}
        </p>

        {/* cycle progress */}
        <div className="mt-6">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7fe3c2] to-[#34b491] transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-white/55">
            <span>{pct}% through cycle</span>
            <span className="tnum">Payday {payday}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
