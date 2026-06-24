import { useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  Upload,
  Trash2,
  CloudOff,
  Check,
  Coins,
  CalendarClock,
  CalendarDays,
} from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import Sheet from "../components/ui/Sheet.jsx";
import Button from "../components/ui/Button.jsx";
import { useApp } from "../context/AppContext.jsx";
import { CURRENCIES, FREQUENCY_LABELS, formatDateLong, toISODate, today } from "../lib/format.js";

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
        <h1 className="font-display text-[22px] font-bold tracking-tight">Settings</h1>
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

      {/* Account sync placeholder */}
      <Card className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-elevated text-muted">
          <CloudOff size={18} />
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-semibold">Account sync</p>
          <p className="text-[13px] text-muted">Coming soon — back up and sync across devices.</p>
        </div>
        <span className="rounded-full bg-elevated px-3 py-1 text-[12px] font-semibold text-muted">
          Soon
        </span>
      </Card>

      <p className="px-2 text-center text-[12px] text-faint">
        SafeSpend · saved on this device
      </p>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
          <div className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-white shadow-hero animate-fade-up">
            <Check size={16} className="text-[#7fe3c2]" /> {toast}
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
        active ? "border-jade bg-jade-soft" : "border-line bg-surface"
      }`}
    >
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      {active && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-jade">
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
          className="w-full rounded-2xl border-2 border-line bg-surface px-5 py-4 text-[17px] font-semibold outline-none focus:border-jade"
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
