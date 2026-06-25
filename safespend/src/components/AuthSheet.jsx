import { useEffect, useState } from "react";
import { Mail, Lock, AlertCircle } from "lucide-react";
import Sheet from "./ui/Sheet.jsx";
import Button from "./ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function AuthSheet({ open, onClose, mode: initialMode = "signin" }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError("");
      setNotice("");
    }
  }, [open, initialMode]);

  const isSignup = mode === "signup";
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  const handleGoogle = async () => {
    if (busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await signInWithGoogle(); // browser redirects to Google from here
    } catch (e) {
      setError(e?.message || "Couldn't start Google sign-in. Try again.");
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!valid || busy) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (isSignup) {
        const data = await signUp(email.trim(), password);
        if (data.session) {
          onClose();
        } else {
          // Email confirmation is on — prompt them to confirm, then sign in.
          setNotice("Almost there — check your email to confirm, then sign in.");
          setMode("signin");
          setPassword("");
        }
      } else {
        await signIn(email.trim(), password);
        onClose();
      }
    } catch (e) {
      setError(e?.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isSignup ? "Create account" : "Sign in"}
      footer={
        <div className="space-y-3">
          <Button className="w-full" onClick={submit} disabled={!valid || busy}>
            {busy ? "One sec…" : isSignup ? "Create account" : "Sign in"}
          </Button>
          <button
            onClick={() => {
              setMode(isSignup ? "signin" : "signup");
              setError("");
              setNotice("");
            }}
            className="w-full text-center text-[14px] font-medium text-muted transition hover:text-ink"
          >
            {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 pb-2">
        <p className="px-1 text-[14px] text-muted">
          {isSignup
            ? "Create an account to back up your plan and sync it across devices."
            : "Sign in to back up and restore your plan."}
        </p>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] font-semibold text-ink transition hover:border-faint active:scale-[0.99] disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 py-0.5">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[12px] font-medium uppercase tracking-wide text-faint">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 focus-within:border-jade">
          <Mail size={18} className="text-faint" />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-[15px] font-medium outline-none"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 focus-within:border-jade">
          <Lock size={18} className="text-faint" />
          <input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full bg-transparent text-[15px] font-medium outline-none"
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl bg-clay-soft px-4 py-3 text-[14px] font-medium text-clay">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="rounded-2xl bg-jade-soft px-4 py-3 text-[14px] font-medium text-jade">
            {notice}
          </div>
        )}
      </div>
    </Sheet>
  );
}
