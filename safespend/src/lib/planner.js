// ---------------------------------------------------------------------------
// Forward-look planner
// ---------------------------------------------------------------------------
// Looks ahead across upcoming pay cycles and proactively reserves for the big,
// must-pay bills that would otherwise sink a future cycle. It DECIDES what to
// reserve with a fund-blind "gross" projection (stable, doesn't chase its own
// tail), then leans on the existing sinking-fund engine to actually set aside
// the per-cycle slice, accrue it, and cover the bill when due.
//
// Auto-managed funds are tagged { auto: true }. A fund the user has explicitly
// set or dismissed is tagged { auto: false } and is never touched here.
// ---------------------------------------------------------------------------

import { addByFrequency, startOfDay } from "./format.js";
import { cyclesUntilDue, cycleSummary, recurrenceCycles } from "./calculations.js";
import { buildNextCycle } from "./db.js";

// Only must-pay items are auto-reserved. Discretionary savings goals and loose
// spending stay the user's call (they can fund those manually).
const AUTO_TYPES = ["bill", "debt"];
// A single bill counts as "big" once it passes half a cycle's pay.
const BIG_FRACTION = 0.5;
const PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12 };

export function horizonCycles(payFrequency, months = 12) {
  const perYear = PER_YEAR[payFrequency] || 26;
  return Math.max(3, Math.round((perYear * months) / 12));
}

// Cycle windows [start, end) from the current cycle out to the horizon.
function windowsFor(cycle, profile, horizon) {
  const wins = [{ start: startOfDay(cycle.startDate), end: startOfDay(cycle.nextPayday) }];
  for (let k = 1; k <= horizon; k++) {
    const start = wins[k - 1].end;
    const end = startOfDay(addByFrequency(start, profile.payFrequency));
    wins.push({ start, end });
  }
  return wins;
}

// Every occurrence date of an expense within [from, to). Recurring items step on
// their own frequency; one-offs yield their single date.
function* occurrences(e, payFrequency, from, to) {
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
  while (d < end && guard < 4000) {
    if (d >= start) yield d;
    d = startOfDay(addByFrequency(d, freq));
    guard += 1;
  }
}

// Fund-blind projection: gross must-pay total landing in each window, and
// whether that exceeds one cycle's income. Used to decide what to reserve.
export function projectGrossWindows(cycle, profile, horizon) {
  const windows = windowsFor(cycle, profile, horizon).map((w) => ({ ...w, bills: 0, red: false }));
  const income = Number(profile.typicalIncome) || 0;
  const from = windows[0].start;
  const to = windows[windows.length - 1].end;
  for (const e of cycle.expenses || []) {
    if (!AUTO_TYPES.includes(e.type)) continue;
    for (const d of occurrences(e, profile.payFrequency, from, to)) {
      const idx = windows.findIndex((w) => d >= w.start && d < w.end);
      if (idx >= 0) windows[idx].bills += Number(e.amount) || 0;
    }
  }
  for (const w of windows) w.red = income > 0 && w.bills > income;
  return { windows, income };
}

// Decide and apply auto set-asides. Returns the SAME cycle reference when
// nothing changed (so callers can guard against redundant saves/loops), or a
// new cycle with updated expense funds. Pure — no side effects.
export function reconcileAutoFunds(cycle, profile, months = 12) {
  if (!cycle) return cycle;
  const pay = profile?.payFrequency || "fortnightly";
  const autoOn = profile?.autoSetAside !== false; // default ON
  const expenses = (cycle.expenses || []).map((e) => ({ ...e }));

  // Auto disabled → strip auto funds, keep user-set ones.
  if (!autoOn) {
    let changed = false;
    for (const e of expenses) {
      if (e.fund?.auto) {
        e.fund = undefined;
        changed = true;
      }
    }
    return changed ? { ...cycle, expenses } : cycle;
  }

  const horizon = horizonCycles(pay, months);
  const typical = Number(profile?.typicalIncome) || 0;
  const big = typical * BIG_FRACTION;
  const gross = projectGrossWindows({ ...cycle, expenses }, profile, horizon);
  const redWindows = gross.windows.filter((w, i) => i > 0 && w.red);
  const from = gross.windows[0].start;
  const to = gross.windows[gross.windows.length - 1].end;

  const userControlled = (e) => e.fund && e.fund.auto === false;
  // Lumpy = a one-off, or a bill that recurs LESS often than the pay cycle.
  // A bill due every cycle can't be smoothed (you just pay it each time).
  const isLumpy = (e) => (e.recurring ? recurrenceCycles(e.frequency, pay) > 1.5 : true);
  const isFuture = (e) =>
    AUTO_TYPES.includes(e.type) &&
    e.dueDate &&
    !userControlled(e) &&
    cyclesUntilDue(e.dueDate, cycle, pay) > 1;
  const landsInRed = (e) => {
    if (!redWindows.length) return false;
    for (const d of occurrences(e, pay, from, to)) {
      if (redWindows.some((w) => d >= w.start && d < w.end)) return true;
    }
    return false;
  };

  let changed = false;
  for (const e of expenses) {
    const shouldFund =
      isFuture(e) && isLumpy(e) && ((Number(e.amount) || 0) >= big || landsInRed(e));
    if (shouldFund && !e.fund?.enabled) {
      e.fund = { enabled: true, accrued: Number(e.fund?.accrued) || 0, auto: true };
      changed = true;
    } else if (!shouldFund && e.fund?.auto) {
      // No longer warranted — but keep it if it's due THIS cycle, so the bill is
      // still covered by what we've already set aside. Rollover resets it after.
      const dueNow = cyclesUntilDue(e.dueDate, cycle, pay) <= 1;
      if (!dueNow) {
        e.fund = undefined;
        changed = true;
      }
    }
  }
  return changed ? { ...cycle, expenses } : cycle;
}

// Accurate forward projection (funds included) for display: per-cycle income,
// committed, set-aside, safe-to-spend, and whether the cycle goes negative.
export function planForwardCycles(cycle, profile, months = 12) {
  if (!cycle || !profile) return [];
  const horizon = horizonCycles(profile.payFrequency || "fortnightly", months);
  const out = [summarize(cycle, profile, 0)];
  let prev = cycle;
  for (let k = 1; k <= horizon; k++) {
    let next;
    try {
      next = buildNextCycle(profile, prev);
    } catch {
      break;
    }
    out.push(summarize(next, profile, k));
    prev = next;
  }
  return out;
}

function summarize(c, profile, index) {
  const s = cycleSummary(c, profile);
  return {
    index,
    start: c.startDate,
    payday: c.nextPayday,
    income: s.income,
    committed: s.committed,
    setAside: s.setAside,
    safe: s.safe,
    red: s.safe < 0,
  };
}

// Compact summary for the Home "Looking ahead" card.
export function forwardLookSummary(cycle, profile, months = 12) {
  const plan = planForwardCycles(cycle, profile, months);
  const reservedTotal = plan[0]?.setAside || 0;
  const firstRed = plan.find((p) => p.index > 0 && p.red) || null;
  const lastPayday = plan.length ? plan[plan.length - 1].payday : null;
  const reservedItems = (cycle?.expenses || [])
    .filter((e) => e.fund?.enabled && e.fund?.auto)
    .map((e) => e.name);
  return { plan, reservedTotal, firstRed, lastPayday, reservedItems, horizonMonths: months };
}
