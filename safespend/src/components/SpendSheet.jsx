import { useState, useEffect } from "react";
import Sheet from "./ui/Sheet.jsx";
import Button from "./ui/Button.jsx";
import { useApp } from "../context/AppContext.jsx";
import { cycleSummary } from "../lib/calculations.js";
import { currencySymbol, formatMoney } from "../lib/format.js";

// Quick log of where this cycle's leftover actually went.
export default function SpendSheet({ open, onClose }) {
  const { cycle, profile, currency, logSpend } = useApp();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("");
      setName("");
    }
  }, [open]);

  if (!cycle) return null;
  const summary = cycleSummary(cycle, profile);
  const spend = Number(amount) || 0;
  const after = summary.safe - spend;

  const save = async () => {
    if (spend <= 0) return;
    await logSpend({ name, amount: spend });
    onClose?.();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log a spend"
      footer={
        <Button variant="primary" size="block" onClick={save} disabled={spend <= 0}>
          {spend > 0 ? `Log ${formatMoney(spend, currency, { cents: false })} spend` : "Log spend"}
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-muted">Amount spent</p>
          <div className="flex items-center gap-1 rounded-2xl bg-elevated px-4 py-3.5">
            <span className="font-display text-2xl font-semibold text-muted">{currencySymbol(currency)}</span>
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full bg-transparent font-display text-3xl font-extrabold tracking-tight outline-none placeholder:text-faint tnum"
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[13px] font-medium text-muted">What was it? (optional)</p>
          <input
            placeholder="Coffee, groceries, night out…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] font-medium outline-none transition focus:border-iris"
          />
        </div>

        {spend > 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-elevated px-4 py-3 text-[14px]">
            <span className="text-muted">Safe to spend after</span>
            <span className={`font-display text-[17px] font-extrabold tnum ${after < 0 ? "text-clay" : "text-jade"}`}>
              {formatMoney(after, currency, { cents: false })}
            </span>
          </div>
        )}
        {after < 0 && spend > 0 && (
          <p className="text-[12px] text-clay">
            This goes past what's safe this cycle — you'll be {formatMoney(Math.abs(after), currency, { cents: false })} over.
          </p>
        )}
      </div>
    </Sheet>
  );
}
