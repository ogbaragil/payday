import { useEffect, useMemo, useState } from "react";
import { X, ArrowRight, Check, Loader2, Sparkles, AlertCircle, PiggyBank } from "lucide-react";
import Button from "./ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApp } from "../context/AppContext.jsx";
import {
  fetchGrowUpSnapshot,
  extractCashflow,
  toPayCycle,
  cycleFraction,
} from "../lib/growupImport.js";
import { fundContribution } from "../lib/calculations.js";
import {
  FREQUENCY_LABELS,
  currencySymbol,
  formatMoneyRound,
  formatMoney,
  toISODate,
  today,
  addDays,
} from "../lib/format.js";

const FREQS = ["weekly", "fortnightly", "monthly"];

export default function GrowUpImport({ onClose }) {
  const { configured, user, signIn, signInWithGoogle } = useAuth();
  const { completeOnboarding } = useApp();

  const [phase, setPhase] = useState(
    !configured ? "unavailable" : user ? "loading" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cashflow, setCashflow] = useState(null);

  const [payFrequency, setPayFrequency] = useState("fortnightly");
  const [nextPayday, setNextPayday] = useState(toISODate(addDays(today(), 14)));
  const [fundOff, setFundOff] = useState({}); // expense name -> true if user opted out

  // Recompute the full plan (income + expenses + suggested funds) for the chosen
  // pay frequency.
  const plan = useMemo(
    () => (cashflow ? toPayCycle(cashflow, payFrequency) : null),
    [cashflow, payFrequency]
  );
  const fundedExpenses = useMemo(
    () => (plan?.expenses || []).filter((e) => e.fund?.enabled),
    [plan]
  );
  const provisionalCycle = useMemo(
    () => ({ startDate: toISODate(today()), nextPayday }),
    [nextPayday]
  );
  const setAsidePreview = (e) =>
    fundContribution({ ...e, fund: { enabled: true, accrued: 0 } }, provisionalCycle, {
      payFrequency,
    });
  const toggleFund = (name) => setFundOff((m) => ({ ...m, [name]: !m[name] }));

  // Pull the snapshot once we have a session.
  async function loadFor(userId) {
    setPhase("loading");
    setError("");
    try {
      const payload = await fetchGrowUpSnapshot(userId);
      const cf = extractCashflow(payload);
      if (!cf) {
        setPhase("empty");
        return;
      }
      setCashflow(cf);
      setPhase("preview");
    } catch (e) {
      setError(e?.message || "Couldn't reach Grow UP. Please try again.");
      setPhase(user ? "loading-error" : "signin");
    }
  }

  useEffect(() => {
    if (configured && user) loadFor(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSignIn = async (e) => {
    e?.preventDefault?.();
    if (!email || !password) return;
    setBusy(true);
    setError("");
    try {
      const data = await signIn(email.trim(), password);
      const uid = data?.user?.id || data?.session?.user?.id;
      if (!uid) throw new Error("Sign-in didn't return a session.");
      await loadFor(uid);
    } catch (e) {
      setError(e?.message || "Sign-in failed. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  };

  const doGoogle = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle(); // redirects to Google, returns to our origin
    } catch (e) {
      setError(e?.message || "Couldn't start Google sign-in. Try again.");
      setBusy(false);
    }
  };

  const perCycleIncome = cashflow
    ? Math.round(cashflow.monthlyIncome * cycleFraction(payFrequency))
    : 0;
  const currency = cashflow?.currency || "AUD";

  const apply = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      const expenses = plan.expenses.map((e) => {
        if (e.fund?.enabled && fundOff[e.name]) {
          const { fund, ...rest } = e; // user opted this fund out
          return rest;
        }
        return e;
      });
      await completeOnboarding({
        currency,
        payFrequency,
        nextPayday,
        typicalIncome: plan.typicalIncome,
        expenses,
        name:
          cashflow.firstName ||
          user?.user_metadata?.first_name ||
          user?.user_metadata?.given_name ||
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          "",
      });
      // onboarded flips true → App swaps to Home; this overlay unmounts with it.
    } catch (e) {
      setError(e?.message || "Couldn't import. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center">
      <div className="animate-fade-up w-full max-w-md rounded-t-[28px] bg-bg p-6 shadow-soft sm:rounded-[28px]">
        {/* header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-jade-soft">
              <Sparkles size={18} className="text-jade" />
            </div>
            <div>
              <h2 className="font-display text-[18px] font-extrabold leading-tight">
                Load from Grow UP
              </h2>
              <p className="text-[13px] text-muted">Uses your Grow UP account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted transition hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl bg-clay-soft px-4 py-3 text-[13px] text-clay">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* unavailable */}
        {phase === "unavailable" && (
          <div className="py-4">
            <p className="text-[15px] text-muted">
              Cloud sync isn't configured in this build, so there's nothing to import.
              You can set things up manually instead.
            </p>
            <div className="mt-5">
              <Button size="block" variant="soft" onClick={onClose}>
                Back to setup
              </Button>
            </div>
          </div>
        )}

        {/* sign in */}
        {phase === "signin" && (
          <form onSubmit={doSignIn} className="space-y-3">
            <p className="text-[14px] text-muted">
              Sign in with your Grow UP account — it's the same login.
            </p>

            <button
              type="button"
              onClick={doGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-[15px] font-semibold text-ink transition hover:border-faint active:scale-[0.99] disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 py-0.5">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[12px] font-medium uppercase tracking-wide text-faint">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-[16px] outline-none transition focus:border-jade"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3.5 text-[16px] outline-none transition focus:border-jade"
            />
            <Button size="block" type="submit" disabled={busy || !email || !password}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <>Continue <ArrowRight size={18} /></>}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-1.5 text-center text-[13px] font-medium text-muted transition hover:text-ink"
            >
              I'll set it up manually
            </button>
          </form>
        )}

        {/* loading */}
        {(phase === "loading" || phase === "loading-error") && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 size={26} className="animate-spin text-jade" />
            <p className="text-[14px] text-muted">Looking for your Grow UP data…</p>
            {phase === "loading-error" && (
              <Button size="block" variant="soft" onClick={() => user && loadFor(user.id)}>
                Try again
              </Button>
            )}
          </div>
        )}

        {/* nothing found */}
        {phase === "empty" && (
          <div className="py-4">
            <p className="text-[15px] text-muted">
              We couldn't find saved income or expenses on this Grow UP account yet.
              Add some in Grow UP and cloud-save, or set up SafeSpend manually.
            </p>
            <div className="mt-5">
              <Button size="block" variant="soft" onClick={onClose}>
                Set up manually
              </Button>
            </div>
          </div>
        )}

        {/* preview + options */}
        {phase === "preview" && cashflow && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted">Found in Grow UP</span>
                <span className="flex items-center gap-1 text-[13px] font-semibold text-jade">
                  <Check size={14} strokeWidth={3} /> Ready
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[14px] text-ink">Monthly income</span>
                <span className="font-display text-[18px] font-extrabold tnum">
                  {formatMoneyRound(cashflow.monthlyIncome, currency)}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[14px] text-ink">Recurring expenses</span>
                <span className="font-display text-[16px] font-bold tnum">
                  {cashflow.expenses.length}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-muted">
                How often are you paid?
              </label>
              <div className="flex gap-2">
                {FREQS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setPayFrequency(f)}
                    className={`flex-1 rounded-2xl border-2 px-2 py-2.5 text-[13px] font-semibold transition ${
                      payFrequency === f
                        ? "border-jade bg-jade-soft text-jade"
                        : "border-line bg-surface text-muted"
                    }`}
                  >
                    {FREQUENCY_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-muted">
                Next payday
              </label>
              <input
                type="date"
                value={nextPayday}
                min={toISODate(today())}
                onChange={(e) => setNextPayday(e.target.value)}
                className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-[15px] font-semibold outline-none transition focus:border-jade"
              />
            </div>

            <div className="rounded-2xl border-2 border-jade/30 bg-jade-soft/40 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-ink">
                  Your {FREQUENCY_LABELS[payFrequency].toLowerCase()} income
                </span>
                <span className="font-display text-[22px] font-extrabold text-jade tnum">
                  {formatMoneyRound(perCycleIncome, currency)}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-muted">
                Bills keep their real amounts and due dates — only what's due before each payday counts. Fine-tune anytime.
              </p>
            </div>

            {fundedExpenses.length > 0 && (
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-soft text-amber">
                    <PiggyBank size={15} />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold">Smart set-asides</p>
                    <p className="text-[12px] text-muted">
                      Big, irregular bills — we'll set aside a little each cycle so they're covered when due.
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {fundedExpenses.map((e) => {
                    const on = !fundOff[e.name];
                    const perCycle = setAsidePreview(e);
                    return (
                      <div key={e.name} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold">{e.name}</p>
                          <p className="text-[12px] text-muted">
                            {formatMoney(e.amount, currency, { cents: false })} ·{" "}
                            {on ? `${formatMoney(perCycle, currency, { cents: false })}/cycle` : "not set aside"}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFund(e.name)}
                          aria-label={`Toggle set-aside for ${e.name}`}
                          className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? "bg-jade" : "bg-line"}`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button size="block" onClick={apply} disabled={busy}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <>Use these <ArrowRight size={18} /></>}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-1.5 text-center text-[13px] font-medium text-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
