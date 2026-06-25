// ---------------------------------------------------------------------------
// Grow UP import (read-only)
// ---------------------------------------------------------------------------
// SafeSpend shares Grow UP's Supabase project, so a signed-in user can read
// their own Grow UP cloud snapshot (table `growup_snapshots`, RLS-scoped to
// auth.uid()). We pull their income + recurring expenses to PREFILL the first
// pay cycle. This is a one-time convenience: we never write back to Grow UP and
// never keep syncing — the user owns and edits everything after import.
// ---------------------------------------------------------------------------

import { supabase } from "./supabaseClient.js";
import { makeExpense } from "./demoData.js";
import { addByFrequency, startOfDay, toISODate } from "./format.js";

// Normalise Grow UP's frequency vocabulary (mirrors its normalizeFrequency()).
function normalizeFreq(frequency, recurring) {
  if (!frequency || frequency === "once") return recurring ? "monthly" : "oneOff";
  return frequency;
}

// Next due date for a Grow UP transaction, from `from` onward. Mirrors Grow UP's
// getNextOccurrence(): walks the anchor date forward by frequency until it's
// today or later. Returns an ISO date string, or null for a passed one-off.
function nextDueISO(txn, from = new Date()) {
  if (!txn?.date) return null;
  let d = new Date(txn.date);
  if (Number.isNaN(d.getTime())) return null;
  const freq = normalizeFreq(txn.frequency, txn.recurring);
  const start = startOfDay(from);
  if (freq === "oneOff" || !txn.recurring) {
    return d >= start ? toISODate(d) : null;
  }
  let guard = 0;
  while (startOfDay(d) < start && guard < 600) {
    d = addByFrequency(d, freq);
    guard += 1;
  }
  return toISODate(d);
}

// Mirror of Grow UP's monthlyEquivalent() so figures line up across both apps.
export function monthlyFromFrequency(amount, frequency, recurring = true) {
  const a = Number(amount || 0);
  const f = !frequency || frequency === "once"
    ? (recurring ? "monthly" : "oneOff")
    : frequency;
  switch (f) {
    case "weekly":      return (a * 52) / 12;
    case "fortnightly": return (a * 26) / 12;
    case "monthly":     return a;
    case "quarterly":   return a / 3;
    case "yearly":      return a / 12;
    case "oneOff":
    default:            return 0;
  }
}

// Fraction of a monthly amount that falls in one SafeSpend pay cycle.
export function cycleFraction(payFrequency) {
  switch (payFrequency) {
    case "weekly":      return 12 / 52;
    case "fortnightly": return 12 / 26;
    case "monthly":
    default:            return 1;
  }
}

// Light name/category → SafeSpend expense type mapping.
const RE_DEBT = /loan|debt|credit|repay|afterpay|klarna|bnpl|mortgage/i;
const RE_SAVE = /sav|invest|emergency|super|fund|nest\s?egg/i;
const RE_BILL = /rent|mortgage|electric|power|gas|water|internet|phone|mobile|insur|subscri|utilit|rate|levy|stream|netflix|spotify|disney|rego|registration/i;
function mapType(name = "", category = "") {
  const s = `${name} ${category}`.toLowerCase();
  if (RE_DEBT.test(s)) return "debt";
  if (RE_SAVE.test(s)) return "saving";
  if (RE_BILL.test(s)) return "bill";
  return "spending";
}

// Fetch the newest Grow UP snapshot for a user. Returns the state payload or null.
export async function fetchGrowUpSnapshot(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("growup_snapshots")
    .select("app_state, state")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.app_state || data?.[0]?.state || null;
}

// Pull monthly income (for pro-rata) + recurring expenses (with REAL amounts,
// their frequency, and their next due date — never pro-rated) from a Grow UP
// payload. Returns { monthlyIncome, expenses:[{name, amount, type, frequency,
// dueDate}], currency } or null.
export function extractCashflow(payload) {
  if (!payload || typeof payload !== "object") return null;

  const txns = Array.isArray(payload.transactions) ? payload.transactions : [];
  const recurring = txns.filter(
    (t) => t && t.recurring && (t.frequency ? t.frequency !== "once" : true)
  );

  // Income: summed as a monthly-equivalent so it can be pro-rated to the cycle.
  let monthlyIncome = recurring
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + monthlyFromFrequency(t.amount, t.frequency, true), 0);

  // Expenses: keep the REAL amount, the frequency, and the next due date.
  let expenses = recurring
    .filter((t) => t.type === "expense")
    .map((t) => ({
      name: t.name || "Expense",
      amount: Number(t.amount || 0),
      type: mapType(t.name, t.category),
      frequency: normalizeFreq(t.frequency, true),
      dueDate: nextDueISO(t),
    }))
    .filter((e) => e.amount > 0 && e.dueDate);

  // Fallbacks: profile-level figures when there are no transactions yet.
  // Profile expenses are monthly amounts with no anchor date → treat as monthly,
  // due now, at their real (monthly) amount.
  const profile = payload.profile || {};
  if (monthlyIncome <= 0 && Number(profile.income) > 0) {
    monthlyIncome = Number(profile.income);
  }
  if (expenses.length === 0 && Array.isArray(profile.expenses) && profile.expenses.length) {
    expenses = profile.expenses
      .map((e) => ({
        name: e.name || "Expense",
        amount: Number(e.amount || 0),
        type: mapType(e.name, ""),
        frequency: "monthly",
        dueDate: toISODate(new Date()),
      }))
      .filter((e) => e.amount > 0);
  }

  const currency = payload.currency || profile.currency || null;
  const hasData = monthlyIncome > 0 || expenses.length > 0;
  return hasData ? { monthlyIncome, expenses, currency } : null;
}

// A lumpy expense worth a sinking fund: infrequent (less often than the pay
// cycle) AND bigger than one period's pay, so it can't be absorbed in one cycle.
export function suggestsFund(expense, typicalIncome) {
  const infrequent = ["quarterly", "yearly"].includes(expense.frequency);
  const big = Number(typicalIncome) > 0 && Number(expense.amount) > Number(typicalIncome);
  return infrequent && big;
}

// Build SafeSpend's onboarding pieces. Income pro-rates to the cycle; expenses
// keep their real amounts, frequency, and due dates (only what's due before a
// given payday counts toward that cycle). Lumpy expenses get an auto-suggested
// sinking fund (enabled by default; the user confirms in the import preview).
export function toPayCycle(cashflow, payFrequency) {
  const typicalIncome = Math.round((cashflow.monthlyIncome || 0) * cycleFraction(payFrequency));
  const expenses = (cashflow.expenses || []).map((e) => {
    const exp = makeExpense({
      name: e.name,
      amount: Math.round(e.amount),
      type: e.type,
      frequency: e.frequency,
      recurring: e.frequency !== "oneOff",
      dueDate: e.dueDate,
    });
    if (suggestsFund(exp, typicalIncome)) {
      exp.fund = { enabled: true, accrued: 0 };
    }
    return exp;
  });
  return { typicalIncome, expenses };
}
