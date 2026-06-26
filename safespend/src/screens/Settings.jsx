import { useRef, useState, useEffect } from "react";
import {
  ChevronRight,
  Download,
  Upload,
  Trash2,
  CloudOff,
  Cloud,
  UploadCloud,
  DownloadCloud,
  LogOut,
  Check,
  Coins,
  CalendarClock,
  CalendarDays,
  Telescope,
} from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import Sheet from "../components/ui/Sheet.jsx";
import Button from "../components/ui/Button.jsx";
import AuthSheet from "../components/AuthSheet.jsx";
import { useApp } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { pushBackup, pullBackup, getBackupMeta } from "../lib/cloud.js";
import { CURRENCIES, FREQUENCY_LABELS, formatDateLong, toISODate, today, relativeTime } from "../lib/format.js";

function Row({ icon: Icon, label, value, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-elevated"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          danger ? "bg-clay-soft text-clay" : "bg-elevated text-muted"
        }`}
      >
        <Icon size={17} />
      </span>
      <span className={`flex-1 text-[15px] font-semibold ${danger ? "text-clay" : "text-ink"}`}>
        {label}
      </span>
      {value && <span className="text-[14px] text-muted">{value}</span>}
      <ChevronRight size={17} className="text-faint" />
    </button>
  );
}

export default function Settings() {
  const { profile, updateProfile, exportData, importData, resetData } = useApp();
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  if (!profile) return null;

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safespend-backup-${toISODate(today())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Backup downloaded");
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importData(JSON.parse(text));
      flash("Data imported");
    } catch {
      flash("Couldn't read that file");
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-5">
      <header className="px-1 pt-1">
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-tight">Settings</h1>
        <p className="text-[14px] text-muted">Tune SafeSpend to your pay</p>
      </header>

      <div>
        <p className="mb-2 px-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
          Your pay
        </p>
        <Card className="divide-y divide-line/60">
          <Row
            icon={Coins}
            label="Currency"
            value={profile.currency}
            onClick={() => setSheet("currency")}
          />
          <Row
            icon={CalendarClock}
            label="Pay frequency"
            value={FREQUENCY_LABELS[profile.payFrequency]}
            onClick={() => setSheet("frequency")}
          />
          <Row
            icon={CalendarDays}
            label="Next payday"
            value={formatDateLong(profile.nextPayday)}
            onClick={() => setSheet("payday")}
          />
        </Card>
      </div>

      <div>
        <p className="mb-2 px-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
          Planning
        </p>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-iris-soft text-iris">
                <Telescope size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">Auto set-aside</p>
                <p className="text-[13px] text-muted">
                  Look ahead and reserve for big bills so future cycles stay covered.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateProfile({ autoSetAside: profile.autoSetAside === false })}
              aria-label="Toggle auto set-aside"
              className={`relative h-6 w-10 shrink-0 rounded-full transition ${
                profile.autoSetAside === false ? "bg-line" : "bg-iris"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  profile.autoSetAside === false ? "left-0.5" : "left-[18px]"
                }`}
              />
            </button>
          </div>
        </Card>
      </div>

      <div>
        <p className="mb-2 px-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
          Data
        </p>
        <Card className="divide-y divide-line/60">
          <Row icon={Download} label="Export data" value="JSON" onClick={handleExport} />
          <Row
            icon={Upload}
            label="Import data"
            value="JSON"
            onClick={() => fileRef.current?.click()}
          />
          <Row icon={Trash2} label="Reset all data" danger onClick={() => setSheet("reset")} />
        </Card>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {/* Account + cloud sync */}
      <AccountCard onToast={flash} />

      <footer className="px-2 pt-1 text-center">
        <p className="font-display text-[18px] tracking-tight text-muted">
          SafeSpend by{" "}
          <a
            href="https://ogbara.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="text-iris underline underline-offset-4"
          >
            Ogbara
          </a>
        </p>
        <p className="mt-0.5 text-[13px] text-faint">Saved on this device</p>
      </footer>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
          <div className="flex items-center gap-2 rounded-full border border-line/70 bg-elevated px-4 py-2.5 text-[15px] text-ink animate-fade-up">
            <Check size={16} className="text-mint" /> {toast}
          </div>
        </div>
      )}

      {/* Edit sheets */}
      <CurrencySheet
        open={sheet === "currency"}
        onClose={() => setSheet(null)}
        value={profile.currency}
        onSelect={(currency) => {
          updateProfile({ currency });
          setSheet(null);
        }}
      />
      <FrequencySheet
        open={sheet === "frequency"}
        onClose={() => setSheet(null)}
        value={profile.payFrequency}
        onSelect={(payFrequency) => {
          updateProfile({ payFrequency });
          setSheet(null);
        }}
      />
      <PaydaySheet
        open={sheet === "payday"}
        onClose={() => setSheet(null)}
        value={profile.nextPayday}
        onSave={(nextPayday) => {
          updateProfile({ nextPayday });
          setSheet(null);
        }}
      />
      <ResetSheet
        open={sheet === "reset"}
        onClose={() => setSheet(null)}
        onConfirm={async () => {
          await resetData();
          setSheet(null);
        }}
      />
    </div>
  );
}

function OptionRow({ active, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-left transition ${
        active ? "border-iris bg-iris-soft" : "border-line bg-surface"
      }`}
    >
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      {active && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-iris">
          <Check size={14} className="text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function CurrencySheet({ open, onClose, value, onSelect }) {
  return (
    <Sheet open={open} onClose={onClose} title="Currency">
      <div className="space-y-2 pb-4">
        {CURRENCIES.map((c) => (
          <OptionRow
            key={c.code}
            active={value === c.code}
            label={`${c.code} · ${c.symbol}`}
            sub={c.label}
            onClick={() => onSelect(c.code)}
          />
        ))}
      </div>
    </Sheet>
  );
}

function FrequencySheet({ open, onClose, value, onSelect }) {
  return (
    <Sheet open={open} onClose={onClose} title="Pay frequency">
      <div className="space-y-2 pb-4">
        {Object.entries(FREQUENCY_LABELS).map(([id, label]) => (
          <OptionRow key={id} active={value === id} label={label} onClick={() => onSelect(id)} />
        ))}
      </div>
    </Sheet>
  );
}

function PaydaySheet({ open, onClose, value, onSave }) {
  const [date, setDate] = useState(value);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Next payday"
      footer={
        <Button className="w-full" onClick={() => onSave(date)}>
          Save payday
        </Button>
      }
    >
      <div className="pb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-2xl border-2 border-line bg-surface px-5 py-4 text-[17px] font-semibold outline-none focus:border-iris"
        />
        <p className="mt-3 px-1 text-[13px] text-muted">
          Changing this updates how your current cycle and daily allowance are calculated.
        </p>
      </div>
    </Sheet>
  );
}

function ResetSheet({ open, onClose, onConfirm }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Reset all data"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Keep my data
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>
            Reset everything
          </Button>
        </div>
      }
    >
      <div className="pb-4">
        <p className="text-[15px] text-ink">
          This clears your profile, pay cycles, and all items from this device. Export a backup
          first if you'd like to keep it.
        </p>
      </div>
    </Sheet>
  );
}

// --- Account + cloud sync ---------------------------------------------------
function AccountCard({ onToast }) {
  const { configured, user, email, signOut } = useAuth();
  const { exportData, importData } = useApp();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [busy, setBusy] = useState(null); // 'backup' | 'restore' | null
  const [lastBackup, setLastBackup] = useState(null);

  useEffect(() => {
    let active = true;
    if (user) {
      getBackupMeta()
        .then((t) => active && setLastBackup(t))
        .catch(() => {});
    } else {
      setLastBackup(null);
    }
    return () => {
      active = false;
    };
  }, [user]);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const backup = async () => {
    setBusy("backup");
    try {
      const data = await exportData();
      await pushBackup(data);
      setLastBackup(new Date().toISOString());
      onToast("Backed up to cloud");
    } catch (e) {
      onToast(e?.message || "Backup failed");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setConfirmRestore(false);
    setBusy("restore");
    try {
      const row = await pullBackup();
      if (!row?.payload) {
        onToast("No cloud backup yet");
        return;
      }
      await importData(row.payload);
      onToast("Restored from cloud");
    } catch (e) {
      onToast(e?.message || "Restore failed");
    } finally {
      setBusy(null);
    }
  };

  // Supabase not configured — keep the gentle placeholder.
  if (!configured) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated text-muted">
          <CloudOff size={18} />
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold">Account sync</p>
          <p className="text-[13px] text-muted">
            Add your Supabase keys to enable cloud backup.
          </p>
        </div>
      </Card>
    );
  }

  // Signed out — invite to create an account / sign in.
  if (!user) {
    return (
      <>
        <p className="mb-2 px-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
          Cloud sync
        </p>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-iris-soft text-iris">
              <Cloud size={18} />
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-semibold">Back up to the cloud</p>
              <p className="text-[13px] text-muted">
                Sign in to save your plan and sync it across devices.
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button className="flex-1" onClick={() => openAuth("signup")}>
              Create account
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => openAuth("signin")}>
              Sign in
            </Button>
          </div>
        </Card>
        <AuthSheet open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  // Signed in — backup / restore / sign out.
  return (
    <>
      <p className="mb-2 px-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
        Cloud sync
      </p>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-iris text-white">
            <Cloud size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{email}</p>
            <p className="text-[13px] text-muted">
              {lastBackup ? `Last backed up ${relativeTime(lastBackup)}` : "Not backed up yet"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button className="flex-1" onClick={backup} disabled={busy !== null}>
            <UploadCloud size={17} />
            {busy === "backup" ? "Backing up…" : "Back up now"}
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => setConfirmRestore(true)}
            disabled={busy !== null}
          >
            <DownloadCloud size={17} />
            {busy === "restore" ? "Restoring…" : "Restore"}
          </Button>
        </div>

        <button
          onClick={signOut}
          className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[14px] font-semibold text-muted transition hover:text-clay"
        >
          <LogOut size={16} /> Sign out
        </button>
      </Card>

      <Sheet
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        title="Restore from cloud"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmRestore(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={restore}>
              Restore
            </Button>
          </div>
        }
      >
        <div className="pb-4">
          <p className="text-[15px] text-ink">
            This replaces what's on this device with your latest cloud backup. Anything you've
            changed here since then will be overwritten.
          </p>
        </div>
      </Sheet>
    </>
  );
}
