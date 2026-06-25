// The math behind SafeSpend. All pure functions so they're easy to test
// and reuse across screens (Home, Timeline, Scenario).

import { today, daysBetween, startOfDay } from "./format.js";

// Expense types that REDUCE safe-to-spend (money already committed).
export const COMMITTED_TYPES = ["bill", "saving", "debt", "spending"];

export const EXPENSE_TYPES = [
  { id: "bill", label: "Bill", hint: "Rent, power, phone" },
  { id: "spending", label: "Spending", hint: "Groceries, fuel, fun" },
  { id: "saving", label: "Saving", hint: "Set aside for a goal" },
  { id: "debt", label: "Debt", hint: "Loan or card repayment" },
  { id: "income", label: "Income", hint: "Extra money in" },
];

export function sumByTypes(expenses = [], types) {
  return expenses
    .filter((e) => types.includes(e.type))
    .reduce((total, e) => total + (Number(e.amount) || 0), 0);
}

// An expense counts toward THIS cycle only if its due date falls within the
// cycle window [startDate, nextPayday]. Undated items always count. This is the
// heart of "safe to spend before next payday": a bill due in 3 months must not
// reduce this period's number — it only lands in the cycle it's actually due.
export function isDueInCycle(expense, cycle) {
  if (!expense?.dueDate) return true;
  const due = startOfDay(expense.dueDate);
  const start = cycle?.startDate ? startOfDay(cycle.startDate) : null;
  const end = cycle?.nextPayday ? startOfDay(cycle.nextPayday) : null;
  if (start && due < start) return false;
  if (end && due > end) return false;
  return true;
}

// Expenses actually due within the current cycle window.
export function expensesInCycle(cycle) {
  return (cycle?.expenses || []).filter((e) => isDueInCycle(e, cycle));
}

// Total money committed away from free spending — only what's due this cycle.
export function committedTotal(cycle) {
  return sumByTypes(expensesInCycle(cycle), COMMITTED_TYPES);
}

// Any extra income added mid-cycle (on top of the base payday income).
export function extraIncome(cycle) {
  return sumByTypes(expensesInCycle(cycle), ["income"]);
}

export function totalIncome(cycle) {
  return (Number(cycle?.income) || 0) + extraIncome(cycle);
}

// Income received − bills − savings − debt − planned spending = Safe to Spend
export function safeToSpend(cycle) {
  if (!cycle) return 0;
  return totalIncome(cycle) - committedTotal(cycle);
}

// Days left until the next payday (never less than 1 for the daily maths).
export function daysRemaining(cycle, ref = today()) {
  if (!cycle?.nextPayday) return 1;
  const diff = daysBetween(ref, cycle.nextPayday);
  return Math.max(1, diff);
}

// True once the payday has arrived/passed.
export function isCycleComplete(cycle, ref = today()) {
  if (!cycle?.nextPayday) return false;
  return daysBetween(ref, cycle.nextPayday) <= 0;
}

export function dailyAllowance(cycle, ref = today()) {
  const safe = safeToSpend(cycle);
  return safe / daysRemaining(cycle, ref);
}

// How far through the pay cycle we are, 0..1.
export function cycleProgress(cycle, ref = today()) {
  if (!cycle?.startDate || !cycle?.nextPayday) return 0;
  const total = daysBetween(cycle.startDate, cycle.nextPayday);
  if (total <= 0) return 1;
  const elapsed = daysBetween(cycle.startDate, ref);
  return Math.min(1, Math.max(0, elapsed / total));
}

// Build a derived snapshot used across the UI.
export function cycleSummary(cycle, ref = today()) {
  return {
    income: totalIncome(cycle),
    committed: committedTotal(cycle),
    safe: safeToSpend(cycle),
    daysLeft: daysRemaining(cycle, ref),
    perDay: dailyAllowance(cycle, ref),
    progress: cycleProgress(cycle, ref),
    complete: isCycleComplete(cycle, ref),
  };
}

// --- Scenario mode -----------------------------------------------------
// "Can I spend $300 on a weekend away?" → status + the numbers behind it.
export function evaluateScenario(cycle, amount, ref = today()) {
  const spend = Number(amount) || 0;
  const safeBefore = safeToSpend(cycle);
  const safeAfter = safeBefore - spend;
  const days = daysRemaining(cycle, ref);
  const perDayBefore = safeBefore / days;
  const perDayAfter = safeAfter / days;

  // Status thresholds based on how much of the buffer the purchase eats.
  let status = "green";
  if (safeAfter < 0) {
    status = "red";
  } else if (safeBefore > 0 && safeAfter < safeBefore * 0.15) {
    status = "amber";
  } else if (perDayAfter < perDayBefore * 0.4) {
    status = "amber";
  }

  return { spend, safeBefore, safeAfter, perDayBefore, perDayAfter, days, status };
}

export const SCENARIO_COPY = {
  green: {
    title: "You have room for this",
    detail: "Go for it — you'll still be on track for payday.",
  },
  amber: {
    title: "Possible, but tight",
    detail: "This works, though the rest of the cycle gets snug.",
  },
  red: {
    title: "Risk of running short",
    detail: "This would take you past what's safe before payday.",
  },
};

// Items between today and the next payday, sorted, for the timeline.
export function upcomingExpenses(cycle, ref = today()) {
  if (!cycle?.expenses) return [];
  const from = startOfDay(ref);
  const end = cycle?.nextPayday ? startOfDay(cycle.nextPayday) : null;
  return [...cycle.expenses]
    .filter((e) => e.dueDate)
    .filter((e) => {
      const due = startOfDay(e.dueDate);
      if (due < from) return false;
      if (end && due > end) return false;
      return true;
    })
    .sort((a, b) => startOfDay(a.dueDate) - startOfDay(b.dueDate));
}
