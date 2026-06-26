// ---------------------------------------------------------------------------
// Data repository
// ---------------------------------------------------------------------------
// The ONLY module that touches persistence. Every function is async so that
// swapping localStorage for Supabase (see ./supabaseClient.js) is a drop-in
// change — the rest of the app already awaits these calls.
//
// When wiring Supabase: keep these signatures, replace the localStorage body
// of each function with a supabase query, and the UI won't need to change.
// ---------------------------------------------------------------------------

import { uid, makeExpense } from "./demoData.js";
import { addDays, addMonths, addByFrequency, subByFrequency, startOfDay, toISODate, today } from "./format.js";
import { fundContribution } from "./calculations.js";

const KEYS = {
  profile: "safespend.profile",
  cycles: "safespend.cycles",
  currentCycleId: "safespend.currentCycleId",
  schema: "safespend.schemaVersion",
};

const SCHEMA_VERSION = 1;

// --- low-level localStorage helpers -----------------------------------
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Storage full / private mode — fail soft. Optimistic UI keeps working in memory.
    console.warn("SafeSpend: could not persist", key, err);
  }
}

// --- profile -----------------------------------------------------------
export async function getProfile() {
  return read(KEYS.profile, null);
}

export async function saveProfile(profile) {
  write(KEYS.schema, SCHEMA_VERSION);
  write(KEYS.profile, profile);
  // Supabase later:
  //   await supabase.from("profiles").upsert(toRow(profile));
  return profile;
}

// --- cycles ------------------------------------------------------------
export async function getCycles() {
  return read(KEYS.cycles, []);
}

export async function getCurrentCycleId() {
  return read(KEYS.currentCycleId, null);
}

export async function setCurrentCycleId(id) {
  write(KEYS.currentCycleId, id);
  return id;
}

export async function saveCycle(cycle) {
  const cycles = await getCycles();
  const idx = cycles.findIndex((c) => c.id === cycle.id);
  if (idx >= 0) cycles[idx] = cycle;
  else cycles.unshift(cycle);
  write(KEYS.cycles, cycles);
  // Supabase later: upsert cycle row + diff its expenses.
  return cycle;
}

export async function getCurrentCycle() {
  const id = await getCurrentCycleId();
  const cycles = await getCycles();
  return cycles.find((c) => c.id === id) || cycles[0] || null;
}

// --- expenses (operate within a cycle) --------------------------------
export async function upsertExpense(cycle, expense) {
  const next = { ...cycle, expenses: [...cycle.expenses] };
  const idx = next.expenses.findIndex((e) => e.id === expense.id);
  if (idx >= 0) next.expenses[idx] = expense;
  else next.expenses.push(expense);
  await saveCycle(next);
  return next;
}

export async function deleteExpense(cycle, expenseId) {
  const next = {
    ...cycle,
    expenses: cycle.expenses.filter((e) => e.id !== expenseId),
  };
  await saveCycle(next);
  return next;
}

// --- starting a new pay cycle -----------------------------------------
// Carries forward recurring items, re-dating them into the new window, and
// resets income to the profile's typical amount (editable in the flow).
export function nextPaydayFrom(date, frequency) {
  if (frequency === "weekly") return addDays(date, 7);
  if (frequency === "fortnightly") return addDays(date, 14);
  return addMonths(date, 1);
}

// The payday that STARTED the cycle ending on `date` — one pay interval back.
// Used to anchor the very first cycle to the real fortnight, not the day the
// user happened to onboard.
export function previousPaydayFrom(date, frequency) {
  if (frequency === "weekly") return addDays(date, -7);
  if (frequency === "fortnightly") return addDays(date, -14);
  return addMonths(date, -1);
}

// Advance any recurring expense whose due date has slipped into a PAST cycle to
// its next occurrence on/after the current cycle's start. A monthly bill dated
// 19 Jun, viewed in a late-June cycle, becomes 19 Jul — so it's counted in the
// cycle it actually lands in (and reserved for), instead of being skipped.
// One-offs are left alone: a passed one-off is genuinely overdue, not recurring.
export function normalizeCycle(cycle, profile) {
  if (!cycle?.expenses || !profile?.payFrequency) return cycle;
  // Snap the cycle's start to the real previous payday (one interval before the
  // next one). For cycles built by buildNextCycle this is already true, so it's
  // a no-op; it only heals a first cycle that was anchored to the onboarding day.
  const anchored = cycle.nextPayday
    ? toISODate(previousPaydayFrom(new Date(cycle.nextPayday), profile.payFrequency))
    : cycle.startDate;
  const startChanged = anchored !== cycle.startDate;
  const start = startOfDay(anchored);
  const end = cycle.nextPayday ? startOfDay(cycle.nextPayday) : null;
  let changed = startChanged;
  const expenses = cycle.expenses.map((e) => {
    if (!e.recurring || !e.dueDate) return e;
    const freq = e.frequency || profile.payFrequency;
    let due = startOfDay(e.dueDate);

    // (a) Slipped into a PAST cycle → advance forward to the current window so
    // the occurrence is counted in the cycle it now lands in.
    if (due < start) {
      let guard = 0;
      while (startOfDay(due) < start && guard < 600) {
        due = addByFrequency(due, freq);
        guard += 1;
      }
      changed = true;
      return { ...e, dueDate: toISODate(due) };
    }

    // (b) Anchored to a FUTURE cycle, but a prior occurrence falls inside THIS
    // cycle (e.g. a monthly bill entered as 25 Jul that also fell due 25 Jun
    // this cycle). Pull it back so it's shown and counted where it belongs.
    if (end && due >= end) {
      let d = due;
      let guard = 0;
      while (startOfDay(d) >= end && guard < 600) {
        d = subByFrequency(d, freq);
        guard += 1;
      }
      if (startOfDay(d) >= start) {
        changed = true;
        return { ...e, dueDate: toISODate(d) };
      }
    }

    return e;
  });
  return changed ? { ...cycle, startDate: anchored, expenses } : cycle;
}

export function buildNextCycle(profile, previousCycle, overrides = {}) {
  const start = previousCycle?.nextPayday
    ? new Date(previousCycle.nextPayday)
    : today();
  const payday = nextPaydayFrom(start, profile.payFrequency);

  // Carry forward: all recurring items, plus any one-off that's still upcoming
  // (a future-dated goal/bill shouldn't vanish before the cycle it lands in).
  // Recurring items advance on their OWN frequency; one-offs keep their date.
  // Sinking funds accrue their set-aside each cycle; a funded item that just came
  // due is paid FROM its fund (recurring carries any surplus; a one-off that has
  // passed is simply dropped, its fund already spent on it).
  const carried = (previousCycle?.expenses || [])
    .filter((e) => e.recurring || (e.dueDate && startOfDay(e.dueDate) >= startOfDay(start)))
    .map((e) => {
      const funded = Boolean(e.fund?.enabled);
      const amount = Number(e.amount) || 0;
      let accrued = Number(e.fund?.accrued) || 0;
      let due = e.dueDate ? new Date(e.dueDate) : new Date(start);

      if (e.recurring) {
        const freq = e.frequency || profile.payFrequency;
        if (startOfDay(due) < startOfDay(start)) {
          // Due in the cycle that just ended → fund pays it, carry any surplus.
          // A skipped occurrence didn't happen, so the reserve stays put.
          if (funded && !e.skipped) accrued = Math.max(0, accrued - amount);
          let guard = 0;
          while (startOfDay(due) < startOfDay(start) && guard < 600) {
            due = addByFrequency(due, freq);
            guard += 1;
          }
        } else if (funded) {
          // Not yet due → bank the set-aside made during the cycle that just ended.
          accrued += fundContribution(e, previousCycle, profile);
        }
        // skipped is a one-cycle override — the next occurrence starts active.
        const next = makeExpense({ ...e, id: uid(), frequency: freq, dueDate: toISODate(due), skipped: false });
        if (e.fund) next.fund = { enabled: funded, accrued, auto: Boolean(e.fund.auto) };
        return next;
      }

      // One-off, still upcoming → carry forward; accrue toward it if funded.
      if (funded) accrued += fundContribution(e, previousCycle, profile);
      const next = makeExpense({ ...e, id: uid(), dueDate: toISODate(due), skipped: false });
      if (e.fund) next.fund = { enabled: funded, accrued, auto: Boolean(e.fund.auto) };
      return next;
    });

  return {
    id: uid(),
    startDate: toISODate(start),
    nextPayday: toISODate(payday),
    income: overrides.income ?? profile.typicalIncome ?? previousCycle?.income ?? 0,
    expenses: overrides.expenses ?? carried,
    spends: [],
    createdAt: new Date().toISOString(),
  };
}

export async function startNewCycle(profile, previousCycle, overrides = {}) {
  const cycle = buildNextCycle(profile, previousCycle, overrides);
  await saveCycle(cycle);
  await setCurrentCycleId(cycle.id);
  // Keep the profile's nextPayday aligned with the active cycle.
  await saveProfile({ ...profile, nextPayday: cycle.nextPayday });
  return cycle;
}

// --- import / export / reset ------------------------------------------
export async function exportAll() {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: await getProfile(),
    cycles: await getCycles(),
    currentCycleId: await getCurrentCycleId(),
  };
}

export async function importAll(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid file");
  if (data.profile) write(KEYS.profile, data.profile);
  if (Array.isArray(data.cycles)) write(KEYS.cycles, data.cycles);
  if (data.currentCycleId) write(KEYS.currentCycleId, data.currentCycleId);
  write(KEYS.schema, SCHEMA_VERSION);
  return true;
}

export async function resetAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  return true;
}

export async function seedDemo(profile, cycle) {
  await saveProfile(profile);
  await saveCycle(cycle);
  await setCurrentCycleId(cycle.id);
}
