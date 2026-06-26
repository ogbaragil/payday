import { useMemo, useState } from "react";
import { Plus, Pencil, Target, PiggyBank, ChevronDown } from "lucide-react";
import ExpenseSheet from "../components/ExpenseSheet.jsx";
import { Card } from "../components/ui/Card.jsx";
import ProgressRing from "../components/ui/ProgressRing.jsx";
import { useApp } from "../context/AppContext.jsx";
import { cycleSummary, isDueInCycle, fundContribution, fundCoverage } from "../lib/calculations.js";
import { TYPE_META } from "../lib/typeMeta.js";
import { formatMoney, currencySymbol, relativeDay, formatDate } from "../lib/format.js";

const GROUPS = [
  { type: "bill", title: "Bills" },
  { type: "spending", title: "Spending" },
  { type: "saving", title: "Savings" },
  { type: "debt", title: "Debt" },
  { type: "income", title: "Extra income" },
];

function Stat({ label, value, sub, accent }) {
  return (
    <div className="flex-1 px-3 py-1 text-center">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className={`mt-0.5 font-display text-[19px] font-extrabold tnum ${accent || ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-faint">{sub}</p>}
    </div>
  );
}

export default function Plan() {
  const { cycle, currency, profile, setIncome } = useApp();
  const [editing, setEditing] = useState(null);
  const [addType, setAddType] = useState(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState("");
  // Sections collapse by default; an empty Set means everything is collapsed.
  const [openSections, setOpenSections] = useState(() => new Set());
  const isOpen = (key) => openSections.has(key);
  const toggleSection = (key) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const summary = useMemo(() => cycleSummary(cycle, profile), [cycle, profile]);
  const byType = useMemo(() => {
    const m = {};
    for (const g of GROUPS) m[g.type] = [];
    (cycle?.expenses || []).forEach((e) => (m[e.type] ||= []).push(e));
    return m;
  }, [cycle]);
  const funded = useMemo(
    () =>
      (cycle?.expenses || []).filter(
        (e) =>
          e.fund?.enabled &&
          ((Number(e.fund.accrued) || 0) > 0 || fundContribution(e, cycle, profile) > 0)
      ),
    [cycle, profile]
  );

  if (!cycle) return null;

  const planned = summary.committed + summary.setAside;
  const plannedPct = summary.income > 0 ? planned / summary.income : 0;

  // One-line summary for the collapsed Set-aside card.
  const fundedTotals = funded.reduce(
    (acc, e) => {
      const amount = Number(e.amount) || 0;
      const reserved = Math.min(amount, (Number(e.fund.accrued) || 0) + fundContribution(e, cycle, profile));
      return { reserved: acc.reserved + reserved, goal: acc.goal + amount };
    },
    { reserved: 0, goal: 0 }
  );
  const fundedNames =
    funded.length === 1
      ? funded[0].name
      : funded.length === 2
      ? `${funded[0].name} & ${funded[1].name}`
      : `${funded.length} future bills`;
  const setAsideSummary = `${formatMoney(fundedTotals.reserved, currency, { cents: false })} of ${formatMoney(fundedTotals.goal, currency, { cents: false })} reserved for ${fundedNames}`;

  // Extra income now sits beside Payday income; its list expands below the row.
  const incomeItems = byType.income || [];
  const extraSubtotal = incomeItems
    .filter((e) => isDueInCycle(e, cycle))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const saveIncome = async () => {
    await setIncome(Number(incomeDraft) || 0);
    setEditingIncome(false);
  };

  return (
    <div className="space-y-5">
      <header className="px-1 pt-1">
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-tight">My payday plan</h1>
        <p className="text-[14px] text-muted">Where this pay cycle is going</p>
      </header>

      {/* Hero — planned ring */}
      <div className="relative overflow-hidden chalk-card p-6 text-ink">
        <div
          className="pointer-events-none absolute -left-16 -bottom-20 h-56 w-56 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgb(88 68 244 / 0.55) 0%, transparent 70%)" }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink/65">Planned to spend</p>
            <p className="mt-1 font-display text-[40px] font-extrabold leading-none tracking-tight tnum">
              {formatMoney(planned, currency, { cents: false })}
            </p>
            <p className="mt-1.5 text-[13px] text-ink/55">
              of {formatMoney(summary.income, currency, { cents: false })} income
            </p>
          </div>
          <ProgressRing value={plannedPct} size={92} stroke={9} color="rgb(var(--iris))">
            <span className="font-display text-[20px] font-extrabold text-ink tnum">{Math.round(plannedPct * 100)}%</span>
            <span className="text-[10px] font-medium text-ink/55">planned</span>
          </ProgressRing>
        </div>
        <div className="relative mt-5 flex items-center justify-between border-t border-ink/10 pt-4 text-[13px]">
          <span className="text-ink/60">
            <span className={`font-bold tnum ${summary.safe < 0 ? "text-clay" : "text-mint"}`}>
              {formatMoney(summary.safe, currency, { cents: false })}
            </span>{" "}
            available today
          </span>
          <span className="text-ink/60 tnum">
            <span className="font-bold text-ink/90">{formatMoney(summary.income, currency, { cents: false })}</span> income
          </span>
        </div>
      </div>

      {/* Summary strip */}
      <Card className="flex items-stretch divide-x divide-line py-3">
        <Stat label="Income" value={formatMoney(summary.income, currency, { cents: false })} />
        <Stat label="Committed" value={formatMoney(summary.committed, currency, { cents: false })} />
        <Stat label="Reserved" value={formatMoney(summary.setAside, currency, { cents: false })} accent="text-amber" />
        <Stat label="Available" value={formatMoney(summary.safe, currency, { cents: false })} accent={summary.safe < 0 ? "text-clay" : "text-jade"} />
      </Card>

      {/* Income — payday and extra side by side to save vertical space */}
      <div className="grid grid-cols-2 gap-3 items-stretch">
        {/* Payday income */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted">Payday income</p>
            {!editingIncome && (
              <button
                onClick={() => { setIncomeDraft(String(cycle.income || "")); setEditingIncome(true); }}
                className="flex items-center gap-1 text-[13px] font-semibold text-iris"
              >
                <Pencil size={13} /> Edit
              </button>
            )}
          </div>
          {editingIncome ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-1 rounded-2xl border border-line px-3 py-2">
                <span className="font-display text-2xl font-semibold text-muted">{currencySymbol(currency)}</span>
                <input
                  autoFocus inputMode="decimal" value={incomeDraft}
                  onChange={(e) => setIncomeDraft(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full bg-transparent font-display text-2xl font-bold outline-none tnum"
                />
              </div>
              <button onClick={saveIncome} className="w-full rounded-2xl bg-iris py-2 text-[14px] font-semibold text-white shadow-iris">Save</button>
            </div>
          ) : (
            <>
              <p className="mt-1 font-display text-[32px] font-extrabold tracking-tight tnum">
                {formatMoney(cycle.income, currency, { cents: false })}
              </p>
              <p className="text-[12px] text-faint">each payday</p>
            </>
          )}
        </Card>

        {/* Extra income */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted">Extra income</p>
            <button onClick={() => setAddType("income")} className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-muted transition hover:text-iris">
              <Plus size={15} />
            </button>
          </div>
          {incomeItems.length > 0 ? (
            <button onClick={() => toggleSection("income")} className="mt-1 flex w-full items-baseline justify-between text-left">
              <span className="font-display text-[32px] font-extrabold tracking-tight tnum text-jade">
                {formatMoney(extraSubtotal, currency, { cents: false })}
              </span>
              <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${isOpen("income") ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <p className="mt-1 font-display text-[32px] font-extrabold tracking-tight tnum text-muted">
              {formatMoney(0, currency, { cents: false })}
            </p>
          )}
          <p className="text-[12px] text-faint">this cycle</p>
        </Card>
      </div>

      {/* Extra income items — expand below the row */}
      {isOpen("income") && incomeItems.length > 0 && (
        <Card className="divide-y divide-line/60 p-1">
          {incomeItems.map((e) => {
            const due = isDueInCycle(e, cycle);
            const muted = !due;
            const sub = e.dueDate
              ? due
                ? `Due ${relativeDay(e.dueDate)}`
                : `Due ${formatDate(e.dueDate)} · later cycle`
              : e.recurring
              ? "Repeats each cycle"
              : "";
            return (
              <button key={e.id} onClick={() => setEditing(e)} className={`flex w-full items-center justify-between px-3 py-3 text-left transition active:bg-elevated ${muted ? "opacity-55" : ""}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{e.name}</span>
                  <span className="block text-[12px] text-muted">{sub}</span>
                </span>
                <span className={`text-[15px] font-semibold tnum ${muted ? "text-muted" : "text-jade"}`}>
                  +{formatMoney(e.amount, currency, { cents: false })}
                </span>
              </button>
            );
          })}
        </Card>
      )}

      {/* Set-aside goals — collapsed by default with a one-line summary */}
      {funded.length > 0 && (
        <Card className="overflow-hidden">
          <button onClick={() => toggleSection("setaside")} className="flex w-full items-center gap-3 p-4 text-left transition active:bg-elevated">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber"><Target size={17} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[18px] font-bold leading-tight">Set-aside progress</span>
              <span className="block text-[13px] text-muted tnum">{setAsideSummary}</span>
            </span>
            <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${isOpen("setaside") ? "rotate-180" : ""}`} />
          </button>
          {isOpen("setaside") && (
            <div className="space-y-4 border-t border-line/60 p-4">
              {funded.map((e) => {
                const accrued = Number(e.fund.accrued) || 0;
                const amount = Number(e.amount) || 0;
                const per = fundContribution(e, cycle, profile);
                const reserved = Math.min(amount, accrued + per);
                const pct = amount > 0 ? Math.min(1, reserved / amount) : 0;
                const justReserved = per > 0 && accrued <= 0;
                return (
                  <div key={e.id}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[15px]">{e.name}</span>
                      <span className="text-[14px] text-muted tnum">
                        {formatMoney(reserved, currency, { cents: false })} / {formatMoney(amount, currency, { cents: false })}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                      <div className="h-full rounded-full bg-amber chalk-edge transition-[width] duration-500" style={{ width: `${Math.max(3, pct * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[13px] text-faint tnum">
                      {Math.round(pct * 100)}%{justReserved ? " reserved" : ""} · setting aside {formatMoney(per, currency, { cents: false })}/cycle
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Grouped editable lists */}
      {GROUPS.filter((g) => g.type !== "income").map((g) => {
        const items = byType[g.type] || [];
        const dueItems = items.filter((e) => isDueInCycle(e, cycle));
        const subtotal = dueItems.reduce(
          (s, e) => s + (e.fund?.enabled ? fundCoverage(e).shortfall : Number(e.amount) || 0), 0
        );
        const categoryTotal = items.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        // Fill = what's due this cycle vs the category's own total (matches the
        // "$X of $Y due this cycle" tagline), not a share of the whole plan.
        const share = categoryTotal > 0 ? Math.min(1, subtotal / categoryTotal) : 0;
        const meta = TYPE_META[g.type];
        const open = isOpen(g.type);
        const tagline =
          g.type === "income"
            ? `${formatMoney(subtotal, currency, { cents: false })} this cycle`
            : `${formatMoney(subtotal, currency, { cents: false })} of ${formatMoney(categoryTotal, currency, { cents: false })} due this cycle`;
        return (
          <section key={g.type}>
            <div className="mb-2 px-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => items.length > 0 && toggleSection(g.type)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}>
                    <meta.Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[20px] font-bold leading-tight">{g.title}</span>
                    {items.length > 0 && (
                      <span className="block text-[12px] text-muted tnum">{tagline}</span>
                    )}
                  </span>
                  {items.length > 0 && (
                    <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
                  )}
                </button>
                <button onClick={() => setAddType(g.type)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-muted transition hover:text-iris">
                  <Plus size={16} />
                </button>
              </div>
              {items.length > 0 && g.type !== "income" && subtotal > 0 && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
                  <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${Math.max(3, share * 100)}%` }} />
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <button onClick={() => setAddType(g.type)} className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-left text-[14px] font-medium text-muted transition hover:border-iris hover:text-iris">
                Add {g.title.toLowerCase()}
              </button>
            ) : open ? (
              <Card className="divide-y divide-line/60 p-1">
                {items.map((e) => {
                  const due = isDueInCycle(e, cycle);
                  const isFunded =
                    Boolean(e.fund?.enabled) &&
                    ((Number(e.fund.accrued) || 0) > 0 || fundContribution(e, cycle, profile) > 0);
                  // Anything landing in a later cycle is greyed — including funded
                  // (set-aside) items — so "this cycle" reads at a glance.
                  const muted = !due;
                  // Due-date is the primary info. The per-cycle set-aside amount
                  // lives in the Set-aside progress card above, so rows just show
                  // a small "set aside" marker rather than repeating the figure.
                  let sub = e.dueDate
                    ? due
                      ? `Due ${relativeDay(e.dueDate)}`
                      : `Due ${formatDate(e.dueDate)} · later cycle`
                    : e.recurring
                    ? "Repeats each cycle"
                    : "";
                  if (isFunded && due) {
                    const { shortfall } = fundCoverage(e);
                    sub = shortfall > 0
                      ? `${sub} · fund covers the rest`
                      : `${sub} · covered by fund`;
                  }
                  return (
                    <button key={e.id} onClick={() => setEditing(e)} className={`flex w-full items-center justify-between px-3 py-3 text-left transition active:bg-elevated ${muted ? "opacity-55" : ""}`}>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-semibold">{e.name}</span>
                          {isFunded && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-bold text-amber">
                              <PiggyBank size={10} /> Set aside
                            </span>
                          )}
                        </span>
                        <span className="block text-[12px] text-muted">{sub}</span>
                      </span>
                      <span className={`text-[15px] font-semibold tnum ${muted ? "text-muted" : ""}`}>
                        {formatMoney(e.amount, currency, { cents: false })}
                      </span>
                    </button>
                  );
                })}
              </Card>
            ) : null}
          </section>
        );
      })}

      <ExpenseSheet open={Boolean(editing)} onClose={() => setEditing(null)} editing={editing} />
      <ExpenseSheet open={Boolean(addType)} onClose={() => setAddType(null)} defaultType={addType || "spending"} />
    </div>
  );
}
