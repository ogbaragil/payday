// The math behind SafeSpend. All pure functions so they're easy to test
// and reuse across screens (Home, Timeline, Scenario).

import { today, daysBetween, startOfDay, addByFrequency } from "./format.js";

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

// --- Sinking funds -------------------------------------------------------
// A funded expense sets aside a little each cycle so a big, infrequent bill
// (rego, insurance) is covered when it lands — without one period absorbing the
// whole hit. fund = { enabled: bool, accrued: number } lives on the expense.

// Cycles until an expense is due. 1 = due in the current cycle's window,
// 2 = next cycle, and so on.
export function cyclesUntilDue(dueDateISO, cycle, payFrequency) {
  if (!dueDateISO || !cycle?.nextPayday || !payFrequency) return 1;
  const due = startOfDay(dueDateISO);
  let winEnd = startOfDay(cycle.nextPayday);
  let n = 1;
  let guard = 0;
  while (due > winEnd && guard < 600) {
    winEnd = startOfDay(addByFrequency(winEnd, payFrequency));
    n += 1;
    guard += 1;
  }
  return n;
}

// Average days per occurrence, used to translate a bill's frequency into how
// many pay cycles it spans (for steady-state smoothing of recurring bills).
const FREQ_DAYS = { weekly: 7, fortnightly: 14, monthly: 30.44, quarterly: 91.31, yearly: 365.25 };
const CYCLE_DAYS = { weekly: 7, fortnightly: 14, monthly: 30.44 };

// How many pay cycles one recurrence of this bill spans (e.g. a yearly bill on
// fortnightly pay ≈ 26 cycles). Clamped to ≥ 1.
export function recurrenceCycles(frequency, payFrequency) {
  const f = FREQ_DAYS[frequency];
  const p = CYCLE_DAYS[payFrequency] || 14;
  if (!f) return 1;
  return Math.max(1, f / p);
}

// Per-cycle set-aside for a funded FUTURE expense.
// • Auto-managed recurring bills smooth across their recurrence interval
//   (steady-state) so no single cycle is front-loaded — a yearly rego spreads
//   over ~12 months, not just the lead time to its first due date.
// • Manual funds and one-offs save up the remainder fully by the due date.
// Self-correcting — recomputed each cycle from what's left and time remaining.
export function fundContribution(expense, cycle, profile) {
  if (!expense?.fund?.enabled || !profile?.payFrequency) return 0;
  const amount = Number(expense.amount) || 0;
  const accrued = Number(expense.fund.accrued) || 0;
  const remaining = Math.max(0, amount - accrued);
  if (remaining <= 0) return 0;
  const due = cyclesUntilDue(expense.dueDate, cycle, profile.payFrequency);
  if (due <= 1) return 0; // due this cycle → handled as a due bill, not a set-aside

  if (expense.fund.auto && expense.recurring && expense.frequency) {
    const rc = recurrenceCycles(expense.frequency, profile.payFrequency);
    if (rc > 1) return Math.min(remaining, amount / rc);
  }
  return remaining / Math.max(1, due - 1);
}

// For a funded expense due THIS cycle: how much the accrued fund covers, and the
// shortfall (top-up) that still reduces safe-to-spend.
export function fundCoverage(expense) {
  const amount = Number(expense?.amount) || 0;
  const accrued = Number(expense?.fund?.accrued) || 0;
  const covered = Math.min(amount, accrued);
  return { covered, shortfall: Math.max(0, amount - covered) };
}

// Total set aside this cycle toward upcoming funded expenses.
export function setAsideTotal(cycle, profile) {
  if (!cycle?.expenses || !profile) return 0;
  return cycle.expenses.reduce((sum, e) => {
    if (e?.fund?.enabled && !isDueInCycle(e, cycle)) {
      return sum + fundContribution(e, cycle, profile);
    }
    return sum;
  }, 0);
}

// Total money committed away from free spending — only what's due this cycle.
// A funded bill due now is covered by its fund; only any shortfall counts.
export function committedTotal(cycle, profile) {
  return expensesInCycle(cycle)
    .filter((e) => COMMITTED_TYPES.includes(e.type))
    .reduce((sum, e) => {
      if (e?.fund?.enabled) return sum + fundCoverage(e).shortfall;
      return sum + (Number(e.amount) || 0);
    }, 0);
}

// Any extra income added mid-cycle (on top of the base payday income).
export function extraIncome(cycle) {
  return sumByTypes(expensesInCycle(cycle), ["income"]);
}

export function totalIncome(cycle) {
  return (Number(cycle?.income) || 0) + extraIncome(cycle);
}

// Income − committed (due this cycle) − set-asides for upcoming funds = Safe to Spend
export function safeToSpend(cycle, profile) {
  if (!cycle) return 0;
  return totalIncome(cycle) - committedTotal(cycle, profile) - setAsideTotal(cycle, profile);
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

export function dailyAllowance(cycle, profile, ref = today()) {
  const safe = safeToSpend(cycle, profile);
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
export function cycleSummary(cycle, profile, ref = today()) {
  return {
    income: totalIncome(cycle),
    committed: committedTotal(cycle, profile),
    setAside: setAsideTotal(cycle, profile),
    safe: safeToSpend(cycle, profile),
    daysLeft: daysRemaining(cycle, ref),
    perDay: dailyAllowance(cycle, profile, ref),
    progress: cycleProgress(cycle, ref),
    complete: isCycleComplete(cycle, ref),
  };
}

// --- Scenario mode -----------------------------------------------------
// "Can I spend $300 on a weekend away?" → status + the numbers behind it.
export function evaluateScenario(cycle, amount, profile, ref = today()) {
  const spend = Number(amount) || 0;
  const safeBefore = safeToSpend(cycle, profile);
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
