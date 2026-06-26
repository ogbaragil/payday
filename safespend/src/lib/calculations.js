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
  if (end && due >= end) return false; // payday belongs to the next cycle
  return true;
}

// Expenses actually due within the current cycle window.
export function expensesInCycle(cycle) {
  return (cycle?.expenses || []).filter((e) => !e.skipped && isDueInCycle(e, cycle));
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
  while (due >= winEnd && guard < 600) {
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

// Per-cycle set-aside for a funded FUTURE expense, BEFORE the cycle-wide cap.
// • Auto-managed recurring bills smooth across their recurrence interval
//   (steady-state) so no single cycle is front-loaded — a yearly rego spreads
//   over ~12 months, not just the lead time to its first due date.
// • Manual funds and one-offs save up the remainder fully by the due date.
// Self-correcting — recomputed each cycle from what's left and time remaining.
export function rawFundContribution(expense, cycle, profile) {
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

// --- Forward cash smoothing ------------------------------------------------
// How many cycles ahead the set-aside engine looks when pre-building a buffer
// for upcoming collisions (two big bills landing in one fortnight). ~4 months
// is enough lead to smooth realistic timing clashes without hoarding for things
// that are still far off.
const SMOOTH_CYCLES = 8;

function projWindows(cycle, payFrequency, n) {
  const wins = [{ start: startOfDay(cycle.startDate), end: startOfDay(cycle.nextPayday) }];
  for (let k = 1; k <= n; k++) {
    const start = wins[k - 1].end;
    wins.push({ start, end: startOfDay(addByFrequency(start, payFrequency)) });
  }
  return wins;
}

function* projOcc(e, payFrequency, from, to) {
  if (!e.dueDate) return;
  let d = startOfDay(e.dueDate);
  const end = startOfDay(to);
  const start = startOfDay(from);
  if (!e.recurring) {
    if (d >= start && d < end) yield d;
    return;
  }
  const freq = e.frequency || payFrequency;
  let guard = 0;
  while (d < end && guard < 2000) {
    if (d >= start) yield d;
    d = startOfDay(addByFrequency(d, freq));
    guard += 1;
  }
}

// How much of THIS cycle's surplus must be held back so that no upcoming cycle
// runs negative — i.e. carry forward today's spare cash to cover a future
// collision. Projects gross committed costs ahead (advanced occurrence dates),
// credits money already set aside, then asks: what's the deepest the running
// balance dips in a future cycle? Hold that much now (capped by today's spare).
export function smoothingHold(cycle, profile) {
  if (!cycle?.expenses || !profile?.payFrequency) return 0;
  const pay = profile.payFrequency;
  const wins = projWindows(cycle, pay, SMOOTH_CYCLES);
  const from = wins[0].start;
  const to = wins[wins.length - 1].end;
  const typical = Number(profile.typicalIncome) || Number(cycle.income) || 0;

  const bills = wins.map(() => 0);
  for (const e of cycle.expenses) {
    if (!COMMITTED_TYPES.includes(e.type)) continue;
    for (const d of projOcc(e, pay, from, to)) {
      const i = wins.findIndex((w) => d >= w.start && d < w.end);
      if (i >= 0) bills[i] += Number(e.amount) || 0;
    }
  }
  // Credit what's already saved against each funded item's earliest occurrence.
  for (const e of cycle.expenses) {
    if (!e.fund?.enabled) continue;
    let credit = Number(e.fund.accrued) || 0;
    if (credit <= 0) continue;
    for (const d of projOcc(e, pay, from, to)) {
      const i = wins.findIndex((w) => d >= w.start && d < w.end);
      if (i >= 0) {
        const cut = Math.min(bills[i], credit);
        bills[i] -= cut;
        credit -= cut;
        if (credit <= 0) break;
      }
    }
  }

  const net0 = Math.max(0, totalIncome(cycle) - bills[0]);
  let cum = 0;
  let minFuture = Infinity;
  for (let k = 1; k < wins.length; k++) {
    cum += typical - bills[k];
    minFuture = Math.min(minFuture, cum);
  }
  if (!isFinite(minFuture) || minFuture >= 0) return 0;
  return Math.min(net0, -minFuture);
}

// What a single funded FUTURE expense genuinely needs set aside. A bill only
// needs pre-funding to the extent the cycle it's DUE in can't cover it from
// that cycle's OWN income (after that cycle's other committed bills). Whatever
// its own payday covers is left alone — so an affordable bill reserves nothing.
// Any real gap is spread evenly over the cycles leading up to it.
export function fundNeed(expense, cycle, profile) {
  const zero = { due: 1, target: 0, remaining: 0, perCycle: 0 };
  if (!expense?.fund?.enabled || !profile?.payFrequency) return zero;
  const amount = Number(expense.amount) || 0;
  const accrued = Number(expense.fund.accrued) || 0;
  const due = cyclesUntilDue(expense.dueDate, cycle, profile.payFrequency);
  if (due <= 1) return { ...zero, due }; // due this cycle → a bill, not a set-aside

  const pay = profile.payFrequency;
  const typical = Number(profile.typicalIncome) || Number(cycle.income) || 0;
  const wins = projWindows(cycle, pay, due);
  const w = wins[due - 1]; // the future window this expense lands in
  // Other committed bills landing in that same window eat into what its own
  // payday can put toward this bill.
  let others = 0;
  for (const x of cycle.expenses || []) {
    if (x.id === expense.id || !COMMITTED_TYPES.includes(x.type)) continue;
    for (const _ of projOcc(x, pay, w.start, w.end)) others += Number(x.amount) || 0;
  }
  const capacity = Math.max(0, typical - others); // that payday's room for this bill
  const target = Math.max(0, amount - capacity);  // the part that must be pre-funded
  const remaining = Math.max(0, target - accrued);
  const perCycle = remaining / Math.max(1, due - 1); // spread over the lead-up cycles
  return { due, target, remaining, perCycle };
}

// The cycle-wide set-aside plan. Set-asides only kick in for a funded bill when
// the cycle it's due in can't cover it on its own — and only by that shortfall,
// spread over the lead-up cycles. Affordable bills reserve nothing. Capped at
// this cycle's free cash so it can never overdraw you.
const _planCache = new WeakMap();
export function fundPlan(cycle, profile) {
  if (!cycle?.expenses || !profile) return { alloc: new Map(), total: 0, leftover: 0, want: 0 };
  const cached = _planCache.get(cycle);
  if (cached && cached.profile === profile) return cached.plan;

  const items = cycle.expenses
    .filter((e) => e?.fund?.enabled && !e.skipped && !isDueInCycle(e, cycle))
    .map((e) => {
      const n = fundNeed(e, cycle, profile);
      return { id: e.id, perCycle: n.perCycle, remaining: n.remaining };
    })
    .filter((it) => it.perCycle > 0 && it.remaining > 0);

  const want = items.reduce((s, it) => s + it.perCycle, 0);
  const leftover = Math.max(0, totalIncome(cycle) - committedTotal(cycle, profile));
  const target = Math.min(leftover, want);
  const scale = want > 0 ? target / want : 0;

  const alloc = new Map();
  let total = 0;
  for (const it of items) {
    const v = Math.min(it.remaining, it.perCycle * scale);
    if (v > 0) {
      alloc.set(it.id, v);
      total += v;
    }
  }

  const plan = { alloc, total, leftover, want };
  _planCache.set(cycle, { profile, plan });
  return plan;
}

// Effective per-cycle set-aside for one funded expense (after the cap above).
// Only meaningful for expenses that belong to `cycle`; for a standalone estimate
// in the editor, use fundNeed instead.
export function fundContribution(expense, cycle, profile) {
  if (!expense?.fund?.enabled || expense.skipped || isDueInCycle(expense, cycle)) return 0;
  return fundPlan(cycle, profile).alloc.get(expense.id) || 0;
}

// For a funded expense due THIS cycle: how much the accrued fund covers, and the
// shortfall (top-up) that still reduces safe-to-spend.
export function fundCoverage(expense) {
  const amount = Number(expense?.amount) || 0;
  const accrued = Number(expense?.fund?.accrued) || 0;
  const covered = Math.min(amount, accrued);
  return { covered, shortfall: Math.max(0, amount - covered) };
}

// Total set aside this cycle toward upcoming funded expenses (after the cap).
export function setAsideTotal(cycle, profile) {
  if (!cycle?.expenses || !profile) return 0;
  return fundPlan(cycle, profile).total;
}

// Money actually spent from this cycle's leftover (the discretionary spend log).
// Recorded per cycle and reset each payday — it's "where the surplus went".
export function spentTotal(cycle) {
  return (cycle?.spends || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
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

// Income − committed (due this cycle) − set-asides − money already spent = Safe to Spend
export function safeToSpend(cycle, profile) {
  if (!cycle) return 0;
  return (
    totalIncome(cycle) -
    committedTotal(cycle, profile) -
    setAsideTotal(cycle, profile) -
    spentTotal(cycle)
  );
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
    spent: spentTotal(cycle),
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
      if (end && due >= end) return false;
      return true;
    })
    .sort((a, b) => startOfDay(a.dueDate) - startOfDay(b.dueDate));
}

// Items that already came due earlier in THIS cycle (start ≤ due < today). The
// counterpart to upcomingExpenses, so the Timeline can show the whole cycle.
export function pastExpenses(cycle, ref = today()) {
  if (!cycle?.expenses) return [];
  const start = cycle?.startDate ? startOfDay(cycle.startDate) : null;
  const to = startOfDay(ref);
  return [...cycle.expenses]
    .filter((e) => e.dueDate)
    .filter((e) => {
      const due = startOfDay(e.dueDate);
      if (start && due < start) return false;
      if (due >= to) return false;
      return true;
    })
    .sort((a, b) => startOfDay(a.dueDate) - startOfDay(b.dueDate));
}
