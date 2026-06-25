import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import Sheet from "./ui/Sheet.jsx";
import Button from "./ui/Button.jsx";
import { useApp } from "../context/AppContext.jsx";
import { typeMeta } from "../lib/typeMeta.js";
import {
  currencySymbol,
  formatMoney,
  formatDate,
  FREQUENCY_LABELS,
} from "../lib/format.js";
import { buildNextCycle } from "../lib/db.js";

// Preview the next cycle, let the user confirm income + which recurring
// items carry over. Real life changes each pay, so everything is editable.
export default function NewCycleSheet({ open, onClose }) {
  const { profile, cycle, currency, startNewCycle } = useApp();
  const preview = useMemo(
    () => (profile ? buildNextCycle(profile, cycle) : null),
    [profile, cycle]
  );

  const [income, setIncome] = useState("");
  const [keep, setKeep] = useState({}); // id -> bool

  useEffect(() => {
    if (open && preview) {
      setIncome(String(preview.income || ""));
      setKeep(Object.fromEntries(preview.expenses.map((e) => [e.id, true])));
    }
  }, [open, preview]);

  if (!preview) return null;

  const carried = preview.expenses;
  const confirm = async () => {
    const expenses = carried.filter((e) => keep[e.id]);
    await startNewCycle({ income: Number(income) || 0, expenses });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Start new pay cycle"
      footer={
        <Button size="md" className="w-full" onClick={confirm}>
          <RefreshCw size={17} /> Start this cycle
        </Button>
      }
    >
      <div className="space-y-5 pb-2">
        <div className="rounded-3xl bg-elevated p-4">
          <p className="text-[13px] text-muted">
            {FREQUENCY_LABELS[profile.payFrequency]} · next payday{" "}
            <span className="font-semibold text-ink">
              {formatDate(preview.nextPayday, { day: "numeric", month: "long" })}
            </span>
          </p>
        </div>

        {/* Income */}
        <div>
          <label className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Income this cycle
          </label>
          <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="font-display text-xl font-semibold text-muted">
              {currencySymbol(currency)}
            </span>
            <input
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full bg-transparent font-display text-xl font-bold outline-none tnum"
            />
          </div>
        </div>

        {/* Carry-forward list */}
        {carried.length > 0 && (
          <div>
            <label className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Carry forward ({carried.filter((e) => keep[e.id]).length})
            </label>
            <div className="space-y-1.5">
              {carried.map((e) => {
                const { Icon, tint } = typeMeta(e.type);
                const on = keep[e.id];
                return (
                  <button
                    key={e.id}
                    onClick={() => setKeep((k) => ({ ...k, [e.id]: !k[e.id] }))}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                      on ? "border-line bg-surface" : "border-transparent bg-elevated opacity-50"
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
                      <Icon size={16} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[14px] font-semibold">{e.name}</span>
                    </span>
                    <span className="text-[14px] font-semibold tnum">
                      {formatMoney(e.amount, currency, { cents: false })}
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                        on ? "border-iris bg-iris" : "border-line"
                      }`}
                    >
                      {on && <Check size={13} className="text-white" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="px-1 text-[13px] text-muted">
          Your current cycle stays saved. You can edit anything after starting.
        </p>
      </div>
    </Sheet>
  );
}
