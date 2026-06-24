import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Sheet from "./ui/Sheet.jsx";
import Button from "./ui/Button.jsx";
import { EXPENSE_TYPES } from "../lib/calculations.js";
import { EXAMPLE_CHIPS } from "../lib/demoData.js";
import { currencySymbol, toISODate, today } from "../lib/format.js";
import { useApp } from "../context/AppContext.jsx";

const empty = () => ({
  name: "",
  amount: "",
  dueDate: toISODate(today()),
  type: "spending",
  recurring: false,
  notes: "",
});

export default function ExpenseSheet({ open, onClose, editing = null, defaultType }) {
  const { currency, addExpense, editExpense, removeExpense } = useApp();
  const [form, setForm] = useState(empty());

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { ...editing, amount: String(editing.amount ?? "") }
          : { ...empty(), type: defaultType || "spending" }
      );
    }
  }, [open, editing, defaultType]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const valid = form.name.trim() && Number(form.amount) > 0;

  const save = async () => {
    if (!valid) return;
    const payload = {
      name: form.name.trim(),
      amount: Number(form.amount),
      dueDate: form.dueDate,
      type: form.type,
      recurring: form.recurring,
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
              onClick={() => set({ recurring: !form.recurring })}
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
      </div>
    </Sheet>
  );
}
