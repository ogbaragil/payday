import { useEffect, useState } from "react";
import { X, ArrowRight, Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import Button from "./ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApp } from "../context/AppContext.jsx";
import {
  fetchGrowUpSnapshot,
  extractCashflow,
  toPayCycle,
  cycleFraction,
} from "../lib/growupImport.js";
import {
  FREQUENCY_LABELS,
  currencySymbol,
  formatMoneyRound,
  toISODate,
  today,
  addDays,
} from "../lib/format.js";

const FREQS = ["weekly", "fortnightly", "monthly"];

export default function GrowUpImport({ onClose }) {
  const { configured, user, signIn } = useAuth();
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

  const perCycleIncome = cashflow
    ? Math.round(cashflow.monthlyIncome * cycleFraction(payFrequency))
    : 0;
  const currency = cashflow?.currency || "AUD";

  const apply = async () => {
    if (!cashflow) return;
    setBusy(true);
    try {
      const { typicalIncome, expenses } = toPayCycle(cashflow, payFrequency);
      await completeOnboarding({
        currency,
        payFrequency,
        nextPayday,
        typicalIncome,
        expenses,
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
              Sign in with your Grow UP email and password — it's the same account.
            </p>
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
                Expenses are scaled to each cycle. You can fine-tune everything after.
              </p>
            </div>

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
