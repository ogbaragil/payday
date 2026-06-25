import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import GrowUpImport from "../components/GrowUpImport.jsx";
import { useApp } from "../context/AppContext.jsx";
import { CURRENCIES, FREQUENCY_LABELS, currencySymbol, toISODate, today, addDays } from "../lib/format.js";

const FREQUENCIES = [
  { id: "weekly", sub: "Paid every week" },
  { id: "fortnightly", sub: "Paid every two weeks" },
  { id: "monthly", sub: "Paid once a month" },
];

export default function Onboarding() {
  const { completeOnboarding, loadDemo } = useApp();
  const [step, setStep] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({
    payFrequency: "fortnightly",
    nextPayday: toISODate(addDays(today(), 14)),
    typicalIncome: "",
    currency: "AUD",
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const steps = [
    { key: "freq", valid: true },
    { key: "payday", valid: Boolean(form.nextPayday) },
    { key: "income", valid: Number(form.typicalIncome) > 0 },
  ];
  const last = step === steps.length - 1;

  const next = async () => {
    if (last) {
      await completeOnboarding(form);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 safe-top">
      {/* brand + progress */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink">
            <Check size={18} className="text-[#7fe3c2]" strokeWidth={3} />
          </div>
          <span className="font-display text-[17px] font-bold tracking-tight">SafeSpend</span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-jade" : i < step ? "w-1.5 bg-jade" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      <div key={step} className="flex flex-1 flex-col justify-center py-8 animate-fade-up">
        {step === 0 && (
          <>
            <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">
              How often do you get paid?
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              We'll plan each cycle around your real payday.
            </p>
            <div className="mt-7 space-y-3">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => set({ payFrequency: f.id })}
                  className={`flex w-full items-center justify-between rounded-3xl border-2 bg-surface px-5 py-4 text-left transition ${
                    form.payFrequency === f.id ? "border-jade" : "border-transparent shadow-soft"
                  }`}
                >
                  <span>
                    <span className="block text-[16px] font-semibold">{FREQUENCY_LABELS[f.id]}</span>
                    <span className="block text-[13px] text-muted">{f.sub}</span>
                  </span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                      form.payFrequency === f.id ? "border-jade bg-jade" : "border-line"
                    }`}
                  >
                    {form.payFrequency === f.id && <Check size={14} className="text-white" strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">
              When's your next payday?
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              This sets the finish line for your current cycle.
            </p>
            <div className="mt-7">
              <input
                type="date"
                value={form.nextPayday}
                min={toISODate(today())}
                onChange={(e) => set({ nextPayday: e.target.value })}
                className="w-full rounded-3xl border-2 border-line bg-surface px-5 py-5 text-[18px] font-semibold outline-none transition focus:border-jade"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">
              How much do you usually get?
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              Your typical take-home pay each cycle. You can fine-tune it any time.
            </p>
            <div className="mt-7 rounded-3xl border-2 border-line bg-surface px-5 py-6 transition focus-within:border-jade">
              <div className="flex items-center justify-center gap-1">
                <span className="font-display text-3xl font-semibold text-muted">
                  {currencySymbol(form.currency)}
                </span>
                <input
                  autoFocus
                  inputMode="decimal"
                  placeholder="0"
                  value={form.typicalIncome}
                  onChange={(e) => set({ typicalIncome: e.target.value.replace(/[^0-9.]/g, "") })}
                  className="w-44 bg-transparent text-center font-display text-5xl font-extrabold tracking-tight outline-none placeholder:text-faint tnum"
                />
              </div>
            </div>
            <div className="no-scrollbar mt-5 flex justify-center gap-2 overflow-x-auto">
              {CURRENCIES.slice(0, 5).map((c) => (
                <button
                  key={c.code}
                  onClick={() => set({ currency: c.code })}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                    form.currency === c.code
                      ? "border-jade bg-jade-soft text-jade"
                      : "border-line bg-surface text-muted"
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-3 pb-8">
        <Button size="block" onClick={next} disabled={!steps[step].valid}>
          {last ? "Start planning" : "Continue"}
          <ArrowRight size={18} />
        </Button>
        {step === 0 && (
          <>
            <button
              onClick={() => setShowImport(true)}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-center text-[14px] font-semibold text-jade transition hover:brightness-110"
            >
              <Sparkles size={15} /> Already use Grow UP? Load your numbers
            </button>
            <button
              onClick={loadDemo}
              className="w-full py-1 text-center text-[14px] font-medium text-muted transition hover:text-ink"
            >
              Explore with demo data instead
            </button>
          </>
        )}
      </div>

      {showImport && <GrowUpImport onClose={() => setShowImport(false)} />}
    </div>
  );
}
