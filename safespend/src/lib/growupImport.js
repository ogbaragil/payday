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

// Pull monthly income + recurring monthly expenses out of a Grow UP state payload.
// Returns { monthlyIncome, expenses:[{name, monthlyAmount, type}], currency } or null.
export function extractCashflow(payload) {
  if (!payload || typeof payload !== "object") return null;

  const txns = Array.isArray(payload.transactions) ? payload.transactions : [];
  const recurring = txns.filter(
    (t) => t && t.recurring && (t.frequency ? t.frequency !== "once" : true)
  );

  let monthlyIncome = recurring
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + monthlyFromFrequency(t.amount, t.frequency, true), 0);

  let expenses = recurring
    .filter((t) => t.type === "expense")
    .map((t) => ({
      name: t.name || "Expense",
      monthlyAmount: monthlyFromFrequency(t.amount, t.frequency, true),
      type: mapType(t.name, t.category),
    }))
    .filter((e) => e.monthlyAmount > 0);

  // Fallbacks: profile-level figures when there are no transactions yet.
  const profile = payload.profile || {};
  if (monthlyIncome <= 0 && Number(profile.income) > 0) {
    monthlyIncome = Number(profile.income);
  }
  if (expenses.length === 0 && Array.isArray(profile.expenses) && profile.expenses.length) {
    expenses = profile.expenses
      .map((e) => ({
        name: e.name || "Expense",
        monthlyAmount: Number(e.amount || 0),
        type: mapType(e.name, ""),
      }))
      .filter((e) => e.monthlyAmount > 0);
  }

  const currency = payload.currency || profile.currency || null;
  const hasData = monthlyIncome > 0 || expenses.length > 0;
  return hasData ? { monthlyIncome, expenses, currency } : null;
}

// Convert monthly cashflow into SafeSpend's per-cycle onboarding pieces.
// Returns { typicalIncome, expenses:[<makeExpense items>] }.
export function toPayCycle(cashflow, payFrequency) {
  const frac = cycleFraction(payFrequency);
  const typicalIncome = Math.round((cashflow.monthlyIncome || 0) * frac);
  const expenses = (cashflow.expenses || []).map((e) =>
    makeExpense({
      name: e.name,
      amount: Math.round(e.monthlyAmount * frac),
      type: e.type,
      recurring: true,
    })
  );
  return { typicalIncome, expenses };
}
