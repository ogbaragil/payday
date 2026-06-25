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
import { addDays, addMonths, addByFrequency, startOfDay, toISODate, today } from "./format.js";

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

export function buildNextCycle(profile, previousCycle, overrides = {}) {
  const start = previousCycle?.nextPayday
    ? new Date(previousCycle.nextPayday)
    : today();
  const payday = nextPaydayFrom(start, profile.payFrequency);

  // Carry forward recurring expenses, each advancing on its OWN frequency.
  // A null frequency means "every cycle", so it tracks the pay frequency.
  // Past-due items roll to their next occurrence; future-dated items (e.g. a
  // quarterly rego) carry forward unchanged until the cycle they're due in.
  const carried = (previousCycle?.expenses || [])
    .filter((e) => e.recurring)
    .map((e) => {
      const freq = e.frequency || profile.payFrequency;
      let due = e.dueDate ? new Date(e.dueDate) : new Date(start);
      let guard = 0;
      while (startOfDay(due) < startOfDay(start) && guard < 600) {
        due = addByFrequency(due, freq);
        guard += 1;
      }
      return makeExpense({
        ...e,
        id: uid(),
        frequency: freq,
        dueDate: toISODate(due),
      });
    });

  return {
    id: uid(),
    startDate: toISODate(start),
    nextPayday: toISODate(payday),
    income: overrides.income ?? profile.typicalIncome ?? previousCycle?.income ?? 0,
    expenses: overrides.expenses ?? carried,
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
