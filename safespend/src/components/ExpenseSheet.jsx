import { useEffect, useState } from "react";
import { Trash2, PiggyBank } from "lucide-react";
import Sheet from "./ui/Sheet.jsx";
import Button from "./ui/Button.jsx";
import { EXPENSE_TYPES, fundContribution } from "../lib/calculations.js";
import { EXAMPLE_CHIPS } from "../lib/demoData.js";
import { currencySymbol, toISODate, today, startOfDay, formatMoney } from "../lib/format.js";
import { useApp } from "../context/AppContext.jsx";

const FREQ_OPTS = [
  { id: "weekly", label: "Weekly" },
  { id: "fortnightly", label: "Fortnightly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

const empty = () => ({
  name: "",
  amount: "",
  dueDate: toISODate(today()),
  type: "spending",
  recurring: false,
  frequency: null,
  fund: null,
  notes: "",
});

export default function ExpenseSheet({ open, onClose, editing = null, defaultType }) {
  const { currency, profile, cycle, addExpense, editExpense, removeExpense } = useApp();
  const [form, setForm] = useState(empty());

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { ...empty(), ...editing, amount: String(editing.amount ?? "") }
          : { ...empty(), type: defaultType || "spending" }
      );
    }
  }, [open, editing, defaultType]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const valid = form.name.trim() && Number(form.amount) > 0;

  const toggleRecurring = () => {
    if (form.recurring) {
      set({ recurring: false, frequency: null, fund: null });
    } else {
      set({ recurring: true, frequency: form.frequency || profile?.payFrequency || "monthly" });
    }
  };

  const fundEligible =
    form.recurring &&
    ["quarterly", "yearly"].includes(form.frequency) &&
    form.dueDate &&
    startOfDay(form.dueDate) > today();

  const setAsidePreview = fundEligible
    ? fundContribution(
        {
          amount: Number(form.amount) || 0,
          dueDate: form.dueDate,
          fund: { enabled: true, accrued: Number(form.fund?.accrued) || 0 },
        },
        cycle,
        profile
      )
    : 0;

  const save = async () => {
    if (!valid) return;
    const payload = {
      name: form.name.trim(),
      amount: Number(form.amount),
      dueDate: form.dueDate,
      type: form.type,
      recurring: form.recurring,
      frequency: form.recurring ? form.frequency || null : null,
      fund: form.fund?.enabled ? { enabled: true, accrued: Number(form.fund.accrued) || 0 } : null,
      notes: form.notes?.trim() || "",
    };
    if (editing) await editExpense({ ...editing, ...payload });
    else await addExpense(payload);
    onClose();
  };

  const del = async () => {
    if (editing) await removeExpense(editing.id);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit item" : "Add an item"}
      footer={
        <div className="flex gap-3">
          {editing && (
            <Button variant="danger" size="md" onClick={del} aria-label="Delete">
              <Trash2 size={18} />
            </Button>
          )}
          <Button size="md" className="flex-1" onClick={save} disabled={!valid}>
            {editing ? "Save changes" : "Add item"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        {/* Amount — the hero field, big and friendly */}
        <div className="rounded-3xl bg-elevated px-5 py-5 text-center">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Amount
          </label>
          <div className="flex items-center justify-center gap-1">
            <span className="font-display text-3xl font-semibold text-muted">
              {currencySymbol(currency)}
            </span>
            <input
              autoFocus={!editing}
              inputMode="decimal"
              placeholder="0"
              value={form.amount}
              onChange={(e) =>
                set({ amount: e.target.value.replace(/[^0-9.]/g, "") })
              }
              className="w-40 bg-transparent text-center font-display text-5xl font-bold tracking-tight text-ink outline-none placeholder:text-faint tnum"
            />
          </div>
        </div>

        {/* Name + example chips */}
        <div>
          <input
            placeholder="What's it for?"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] font-medium outline-none transition focus:border-jade"
          />
          {!editing && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip.name}
                  onClick={() => set({ name: chip.name, type: chip.type })}
                  className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-medium text-muted transition hover:border-jade hover:text-jade"
                >
                  {chip.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EXPENSE_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => set({ type: t.id })}
                className={`rounded-2xl border px-2 py-3 text-center transition ${
                  form.type === t.id
                    ? "border-jade bg-jade-soft text-jade"
                    : "border-line bg-surface text-muted hover:border-faint"
                }`}
              >
                <div className="text-[13px] font-semibold">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Due date + recurring */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Due date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set({ dueDate: e.target.value })}
              className="w-full rounded-2xl border border-line bg-surface px-3 py-3 text-[14px] font-medium outline-none focus:border-jade"
            />
          </div>
          <div>
            <label className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Repeats
            </label>
            <button
              onClick={toggleRecurring}
              className={`flex h-[46px] w-full items-center justify-between rounded-2xl border px-4 transition ${
                form.recurring ? "border-jade bg-jade-soft" : "border-line bg-surface"
              }`}
            >
              <span
                className={`text-[14px] font-semibold ${
                  form.recurring ? "text-jade" : "text-muted"
                }`}
              >
                {form.recurring ? "Each cycle" : "One-off"}
              </span>
              <span
                className={`relative h-6 w-10 rounded-full transition ${
                  form.recurring ? "bg-jade" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    form.recurring ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Frequency (recurring only) */}
        {form.recurring && (
          <div>
            <label className="mb-2 block px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              How often
            </label>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {FREQ_OPTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    set({
                      frequency: f.id,
                      // dropping out of quarterly/yearly clears any fund
                      ...(["quarterly", "yearly"].includes(f.id) ? {} : { fund: null }),
                    })
                  }
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
                    form.frequency === f.id
                      ? "border-jade bg-jade-soft text-jade"
                      : "border-line bg-surface text-muted hover:border-faint"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Smart set-aside (sinking fund) */}
        {fundEligible && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-soft text-amber">
                  <PiggyBank size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">Smart set-aside</p>
                  <p className="text-[12px] text-muted">
                    {form.fund?.enabled
                      ? `Saving ${formatMoney(setAsidePreview, currency, { cents: false })}/cycle so it's covered when due.`
                      : "Set aside a little each cycle so this big bill is covered."}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  set({
                    fund: form.fund?.enabled
                      ? null
                      : { enabled: true, accrued: Number(form.fund?.accrued) || 0 },
                  })
                }
                aria-label="Toggle smart set-aside"
                className={`relative h-6 w-10 shrink-0 rounded-full transition ${
                  form.fund?.enabled ? "bg-jade" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    form.fund?.enabled ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
