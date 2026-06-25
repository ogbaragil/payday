import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import ExpenseSheet from "../components/ExpenseSheet.jsx";
import { Card } from "../components/ui/Card.jsx";
import { useApp } from "../context/AppContext.jsx";
import { cycleSummary, isDueInCycle, fundContribution, fundCoverage } from "../lib/calculations.js";
import { typeMeta, TYPE_META } from "../lib/typeMeta.js";
import { formatMoney, currencySymbol, relativeDay, formatDate } from "../lib/format.js";

const GROUPS = [
  { type: "bill", title: "Bills" },
  { type: "spending", title: "Spending" },
  { type: "saving", title: "Savings" },
  { type: "debt", title: "Debt" },
  { type: "income", title: "Extra income" },
];

export default function Plan() {
  const { cycle, currency, profile, setIncome } = useApp();
  const [editing, setEditing] = useState(null);
  const [addType, setAddType] = useState(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState("");

  const summary = useMemo(() => cycleSummary(cycle, profile), [cycle, profile]);
  const byType = useMemo(() => {
    const m = {};
    for (const g of GROUPS) m[g.type] = [];
    (cycle?.expenses || []).forEach((e) => (m[e.type] ||= []).push(e));
    return m;
  }, [cycle]);

  if (!cycle) return null;

  const saveIncome = async () => {
    await setIncome(Number(incomeDraft) || 0);
    setEditingIncome(false);
  };

  return (
    <div className="space-y-5">
      <header className="px-1 pt-1">
        <h1 className="font-display text-[22px] font-bold tracking-tight">Plan this cycle</h1>
        <p className="text-[14px] text-muted">Give every part of your pay a job</p>
      </header>

      {/* Income */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted">Payday income</p>
          {!editingIncome && (
            <button
              onClick={() => {
                setIncomeDraft(String(cycle.income || ""));
                setEditingIncome(true);
              }}
              className="flex items-center gap-1 text-[13px] font-semibold text-jade"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>
        {editingIncome ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1 rounded-2xl border border-line px-4 py-2.5">
              <span className="font-display text-2xl font-semibold text-muted">
                {currencySymbol(currency)}
              </span>
              <input
                autoFocus
                inputMode="decimal"
                value={incomeDraft}
                onChange={(e) => setIncomeDraft(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-transparent font-display text-2xl font-bold outline-none tnum"
              />
            </div>
            <button
              onClick={saveIncome}
              className="rounded-2xl bg-jade px-4 py-3 text-[14px] font-semibold text-white"
            >
              Save
            </button>
          </div>
        ) : (
          <p className="mt-1 font-display text-4xl font-extrabold tracking-tight tnum">
            {formatMoney(cycle.income, currency, { cents: false })}
          </p>
        )}
      </Card>

      {/* Safe to spend summary bar */}
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-[13px] font-medium text-muted">Safe to spend</p>
          <p
            className={`mt-0.5 font-display text-3xl font-extrabold tnum ${
              summary.safe < 0 ? "text-clay" : "text-jade"
            }`}
          >
            {formatMoney(summary.safe, currency, { cents: false })}
          </p>
        </div>
        <div className="text-right text-[13px] text-muted">
          <p>In {formatMoney(summary.income, currency, { cents: false })}</p>
          <p>Committed {formatMoney(summary.committed, currency, { cents: false })}</p>
          {summary.setAside > 0 && (
            <p className="text-amber">Set aside {formatMoney(summary.setAside, currency, { cents: false })}</p>
          )}
        </div>
      </Card>

      {/* Grouped items */}
      {GROUPS.map((g) => {
        const items = byType[g.type] || [];
        const dueItems = items.filter((e) => isDueInCycle(e, cycle));
        const subtotal = dueItems.reduce(
          (s, e) => s + (e.fund?.enabled ? fundCoverage(e).shortfall : Number(e.amount) || 0),
          0
        );
        const meta = TYPE_META[g.type];
        return (
          <section key={g.type}>
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.tint}`}>
                  <meta.Icon size={15} />
                </span>
                <h2 className="font-display text-[15px] font-bold">{g.title}</h2>
                {items.length > 0 && (
                  <span className="text-[13px] font-medium text-muted tnum">
                    {formatMoney(subtotal, currency, { cents: false })}
                  </span>
                )}
              </div>
              <button
                onClick={() => setAddType(g.type)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-muted transition hover:text-jade"
              >
                <Plus size={16} />
              </button>
            </div>

            {items.length > 0 ? (
              <Card className="divide-y divide-line/60 p-1">
                {items.map((e) => {
                  const due = isDueInCycle(e, cycle);
                  const funded = Boolean(e.fund?.enabled);
                  const muted = !due && !funded;
                  let sub;
                  if (funded && due) {
                    const { shortfall } = fundCoverage(e);
                    sub = shortfall > 0
                      ? `Covered by fund · ${formatMoney(shortfall, currency, { cents: false })} top-up`
                      : "Covered by fund";
                  } else if (funded) {
                    const per = fundContribution(e, cycle, profile);
                    const accrued = Number(e.fund.accrued) || 0;
                    sub = `Setting aside ${formatMoney(per, currency, { cents: false })}/cycle · ${formatMoney(accrued, currency, { cents: false })} of ${formatMoney(e.amount, currency, { cents: false })}`;
                  } else if (e.dueDate) {
                    sub = due ? `Due ${relativeDay(e.dueDate)}` : `Due ${formatDate(e.dueDate)} · later cycle`;
                  } else {
                    sub = e.recurring ? "Repeats each cycle" : "";
                  }
                  return (
                    <button
                      key={e.id}
                      onClick={() => setEditing(e)}
                      className={`flex w-full items-center justify-between px-3 py-3 text-left transition active:bg-elevated ${muted ? "opacity-55" : ""}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{e.name}</span>
                        <span className={`text-[12px] ${funded ? "text-amber" : "text-muted"}`}>{sub}</span>
                      </span>
                      <span className={`text-[15px] font-semibold tnum ${muted ? "text-muted" : ""}`}>
                        {formatMoney(e.amount, currency, { cents: false })}
                      </span>
                    </button>
                  );
                })}
              </Card>
            ) : (
              <button
                onClick={() => setAddType(g.type)}
                className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-left text-[14px] font-medium text-muted transition hover:border-jade hover:text-jade"
              >
                Add {g.title.toLowerCase()}
              </button>
            )}
          </section>
        );
      })}

      <ExpenseSheet open={Boolean(editing)} onClose={() => setEditing(null)} editing={editing} />
      <ExpenseSheet
        open={Boolean(addType)}
        onClose={() => setAddType(null)}
        defaultType={addType || "spending"}
      />
    </div>
  );
}
