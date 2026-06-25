import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import * as db from "../lib/db.js";
import { buildDemoCycle, buildDemoProfile, makeExpense } from "../lib/demoData.js";
import { reconcileAutoFunds } from "../lib/planner.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial load from the repository (instant with localStorage).
  useEffect(() => {
    let active = true;
    (async () => {
      const [p, c] = await Promise.all([db.getProfile(), db.getCurrentCycle()]);
      if (!active) return;
      setProfile(p);
      setCycle(c);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Forward-look auto set-aside: whenever the plan changes (expenses, income, or
  // the setting itself), re-decide what to reserve. reconcileAutoFunds returns
  // the SAME cycle reference when nothing changed, so this can't loop.
  useEffect(() => {
    if (loading || !cycle || !profile) return;
    const next = reconcileAutoFunds(cycle, profile);
    if (next !== cycle) {
      setCycle(next);
      db.saveCycle(next).catch(() => {});
    }
  }, [loading, cycle, profile]);

  // --- onboarding / profile -------------------------------------------
  const completeOnboarding = useCallback(async (form) => {
    const newProfile = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: (form.name || "").trim() || null,
      currency: form.currency,
      payFrequency: form.payFrequency,
      nextPayday: form.nextPayday,
      typicalIncome: Number(form.typicalIncome) || 0,
      autoSetAside: form.autoSetAside !== false, // forward-look auto set-aside, on by default
    };
    // Spin up the user's first real cycle from their answers.
    const firstCycle = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + 1),
      startDate: new Date().toISOString().slice(0, 10),
      nextPayday: form.nextPayday,
      income: Number(form.typicalIncome) || 0,
      expenses: Array.isArray(form.expenses) ? form.expenses : [],
      createdAt: new Date().toISOString(),
    };
    setProfile(newProfile); // optimistic
    setCycle(firstCycle);
    await db.saveProfile(newProfile);
    await db.saveCycle(firstCycle);
    await db.setCurrentCycleId(firstCycle.id);
  }, []);

  const updateProfile = useCallback(
    async (patch) => {
      const next = { ...profile, ...patch };
      setProfile(next);
      await db.saveProfile(next);
    },
    [profile]
  );

  // --- expenses --------------------------------------------------------
  const addExpense = useCallback(
    async (data) => {
      if (!cycle) return;
      const expense = makeExpense(data);
      const next = { ...cycle, expenses: [...cycle.expenses, expense] };
      setCycle(next); // optimistic
      await db.saveCycle(next);
      return expense;
    },
    [cycle]
  );

  const editExpense = useCallback(
    async (expense) => {
      if (!cycle) return;
      const next = {
        ...cycle,
        expenses: cycle.expenses.map((e) => (e.id === expense.id ? expense : e)),
      };
      setCycle(next);
      await db.saveCycle(next);
    },
    [cycle]
  );

  const removeExpense = useCallback(
    async (expenseId) => {
      if (!cycle) return;
      const next = {
        ...cycle,
        expenses: cycle.expenses.filter((e) => e.id !== expenseId),
      };
      setCycle(next);
      await db.saveCycle(next);
    },
    [cycle]
  );

  const setIncome = useCallback(
    async (income) => {
      if (!cycle) return;
      const next = { ...cycle, income: Number(income) || 0 };
      setCycle(next);
      await db.saveCycle(next);
    },
    [cycle]
  );

  // --- new pay cycle ---------------------------------------------------
  const startNewCycle = useCallback(
    async (overrides) => {
      if (!profile) return;
      const created = await db.startNewCycle(profile, cycle, overrides);
      setCycle(created);
      setProfile((p) => ({ ...p, nextPayday: created.nextPayday }));
      return created;
    },
    [profile, cycle]
  );

  // --- data management -------------------------------------------------
  const loadDemo = useCallback(async () => {
    const p = buildDemoProfile();
    const c = buildDemoCycle();
    setProfile(p);
    setCycle(c);
    await db.seedDemo(p, c);
  }, []);

  const exportData = useCallback(() => db.exportAll(), []);

  const importData = useCallback(async (data) => {
    await db.importAll(data);
    const [p, c] = await Promise.all([db.getProfile(), db.getCurrentCycle()]);
    setProfile(p);
    setCycle(c);
  }, []);

  const resetData = useCallback(async () => {
    await db.resetAll();
    setProfile(null);
    setCycle(null);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      profile,
      cycle,
      currency: profile?.currency || "AUD",
      onboarded: Boolean(profile),
      completeOnboarding,
      updateProfile,
      addExpense,
      editExpense,
      removeExpense,
      setIncome,
      startNewCycle,
      loadDemo,
      exportData,
      importData,
      resetData,
    }),
    [
      loading, profile, cycle, completeOnboarding, updateProfile, addExpense,
      editExpense, removeExpense, setIncome, startNewCycle, loadDemo,
      exportData, importData, resetData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
