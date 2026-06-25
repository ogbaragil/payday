// Realistic demo data so a first-time user sees a complete, populated app.
// Dates are generated relative to "today" so the demo is always fresh.

import { today, addDays, toISODate } from "./format.js";

export function uid() {
  // Short, collision-resistant enough for local data; Supabase will use uuids.
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

export function makeExpense(partial = {}) {
  return {
    id: uid(),
    name: "",
    amount: 0,
    dueDate: toISODate(today()),
    type: "spending",
    recurring: false,
    frequency: null, // null = "every cycle" (resolved to the pay frequency on rollover)
    notes: "",
    ...partial,
  };
}

// A fortnightly AUD cycle, mid-way through, with a believable mix of items.
export function buildDemoCycle() {
  const start = addDays(today(), -4); // started 4 days ago
  const payday = addDays(today(), 10); // 10 days until next pay

  const expenses = [
    makeExpense({ name: "Rent", amount: 720, type: "bill", recurring: true, dueDate: toISODate(addDays(today(), 2)) }),
    makeExpense({ name: "Electricity", amount: 95, type: "bill", recurring: true, dueDate: toISODate(addDays(today(), 6)) }),
    makeExpense({ name: "Phone", amount: 45, type: "bill", recurring: true, dueDate: toISODate(addDays(today(), 8)) }),
    makeExpense({ name: "Groceries", amount: 240, type: "spending", recurring: true, dueDate: toISODate(addDays(today(), 1)) }),
    makeExpense({ name: "Fuel", amount: 70, type: "spending", recurring: false, dueDate: toISODate(addDays(today(), 3)) }),
    makeExpense({ name: "Emergency fund", amount: 150, type: "saving", recurring: true, dueDate: toISODate(addDays(today(), 0)) }),
    makeExpense({ name: "Car loan", amount: 130, type: "debt", recurring: true, dueDate: toISODate(addDays(today(), 5)) }),
    makeExpense({ name: "Streaming", amount: 18, type: "bill", recurring: true, dueDate: toISODate(addDays(today(), 9)) }),
  ];

  return {
    id: uid(),
    startDate: toISODate(start),
    nextPayday: toISODate(payday),
    income: 2100,
    expenses,
    createdAt: new Date().toISOString(),
  };
}

export function buildDemoProfile() {
  return {
    id: uid(),
    currency: "AUD",
    payFrequency: "fortnightly",
    nextPayday: toISODate(addDays(today(), 10)),
    typicalIncome: 2100,
  };
}

// Quick-add chips for the Add Expense sheet.
export const EXAMPLE_CHIPS = [
  { name: "Rent", type: "bill" },
  { name: "Groceries", type: "spending" },
  { name: "Fuel", type: "spending" },
  { name: "Electricity", type: "bill" },
  { name: "Childcare", type: "bill" },
  { name: "Phone", type: "bill" },
  { name: "Subscriptions", type: "bill" },
  { name: "Savings", type: "saving" },
  { name: "Debt repayment", type: "debt" },
];
