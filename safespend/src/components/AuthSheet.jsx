import { useEffect, useState } from "react";
import { Mail, Lock, AlertCircle } from "lucide-react";
import Sheet from "./ui/Sheet.jsx";
import Button from "./ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthSheet({ open, onClose, mode: initialMode = "signin" }) {
  const { signIn, signUp } = useAuth();
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
