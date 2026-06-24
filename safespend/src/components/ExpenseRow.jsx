import { formatMoney, relativeDay } from "../lib/format.js";
import { typeMeta } from "../lib/typeMeta.js";

export default function ExpenseRow({ expense, currency, onClick, showDate = true }) {
  const { Icon, tint } = typeMeta(expense.type);
  const isIncome = expense.type === "income";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition active:bg-elevated"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
        <Icon size={19} strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">
          {expense.name}
        </span>
        {showDate && (
          <span className="block text-[13px] text-muted">
            {relativeDay(expense.dueDate)}
            {expense.recurring && " · Repeats"}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 text-[15px] font-semibold tabular-nums tnum ${
          isIncome ? "text-jade" : "text-ink"
        }`}
      >
        {isIncome ? "+" : "−"}
        {formatMoney(expense.amount, currency)}
      </span>
    </button>
  );
}
