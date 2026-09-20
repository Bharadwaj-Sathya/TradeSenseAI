import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, Plus, X, TrendingUp } from "lucide-react";
import {
  createStrategy,
  updateStrategy,
  type StrategyCreate,
  type StrategyResponse,
} from "../api/strategies";

// ─── constants ────────────────────────────────────────────────────────────────

const STRATEGY_TYPES = [
  "Trend", "Breakout", "Momentum", "Mean Reversion",
  "Scalping", "Swing", "Arbitrage", "Other",
];
const TIMEFRAMES = ["1m", "3m", "5m", "10m", "15m", "30m", "1h", "4h", "1d"];

// ─── types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  code: string;
  description: string;
  strategy_type: string;
  timeframe: string;
  enabled: boolean;
}

export interface StrategyDialogProps {
  strategy: StrategyResponse | null;
  open: boolean;
  onClose: () => void;
  onSaved: (saved: StrategyResponse) => void;
}

function toCode(name: string) {
  return name.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").slice(0, 50);
}

const EMPTY: FormState = { name: "", code: "", description: "", strategy_type: "Trend", timeframe: "1m", enabled: true };

// ─── field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="sdf">
      <label className="sdf-label">
        {label}
        {required && <span className="sdf-req"> *</span>}
        {hint && <span className="sdf-hint">{hint}</span>}
      </label>
      {children}
      {error && <p className="sdf-err"><AlertCircle size={10} />{error}</p>}
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function StrategyDialog({ strategy, open, onClose, onSaved }: StrategyDialogProps) {
  const isEdit = !!strategy;
  const firstRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [codeManual, setCodeManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fe, setFe] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    if (isEdit && strategy) {
      setForm({ name: strategy.name, code: strategy.code, description: strategy.description ?? "", strategy_type: strategy.strategy_type, timeframe: strategy.timeframe, enabled: strategy.enabled });
      setCodeManual(true);
    } else {
      setForm(EMPTY);
      setCodeManual(false);
    }
    setError(null);
    setFe({});
    setTimeout(() => firstRef.current?.focus(), 60);
  }, [open, isEdit, strategy]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((p) => { const n = { ...p, [key]: val }; if (key === "name" && !codeManual) n.code = toCode(val as string); return n; });
    if (fe[key]) setFe((p) => ({ ...p, [key]: undefined }));
  }

  function validate() {
    const e: typeof fe = {};
    if (!form.name.trim()) e.name = "Name is required";
    else if (form.name.trim().length < 2) e.name = "At least 2 characters";
    if (!isEdit && !form.code.trim()) e.code = "Code is required";
    if (!form.strategy_type) e.strategy_type = "Required";
    setFe(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true); setError(null);
    try {
      let saved: StrategyResponse;
      if (isEdit && strategy) {
        saved = await updateStrategy(strategy.id, { name: form.name.trim(), description: form.description.trim() || undefined, strategy_type: form.strategy_type, timeframe: form.timeframe, enabled: form.enabled });
      } else {
        const payload: StrategyCreate = { name: form.name.trim(), code: form.code.trim(), description: form.description.trim() || undefined, strategy_type: form.strategy_type, timeframe: form.timeframe, enabled: form.enabled, parameters: {} };
        saved = await createStrategy(payload);
      }
      onSaved(saved); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="sd-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="sd-modal" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit Strategy" : "Create Strategy"}>

        {/* ── Header ── */}
        <div className="sd-header">
          <div className="sd-header-left">
            <div className="sd-header-icon">
              <TrendingUp size={16} />
            </div>
            <div>
              <h2 className="sd-title">{isEdit ? "Edit Strategy" : "Create Strategy"}</h2>
              <p className="sd-subtitle">{isEdit ? "Update your strategy configuration" : "Configure a new trading strategy"}</p>
            </div>
          </div>
          <button className="sd-close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="sd-error">
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="sd-body">

            {/* Name */}
            <Field label="Strategy Name" required error={fe.name}>
              <input
                ref={firstRef}
                className={`sd-input ${fe.name ? "sd-input-err" : ""}`}
                placeholder="e.g. VWAP Trend Following"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={100}
                autoComplete="off"
              />
            </Field>

            {/* Code — create only */}
            {!isEdit && (
              <Field label="Strategy Code" required hint="auto-generated · UPPERCASE" error={fe.code}>
                <input
                  className={`sd-input sd-mono ${fe.code ? "sd-input-err" : ""}`}
                  placeholder="e.g. VWAP_TREND"
                  value={form.code}
                  onChange={(e) => { setCodeManual(true); set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")); }}
                  maxLength={50}
                  autoComplete="off"
                />
              </Field>
            )}

            {/* Type + Timeframe */}
            <div className="sd-row">
              <Field label="Strategy Type" required error={fe.strategy_type}>
                <select
                  className={`sd-select ${fe.strategy_type ? "sd-input-err" : ""}`}
                  value={form.strategy_type}
                  onChange={(e) => set("strategy_type", e.target.value)}
                >
                  {STRATEGY_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Timeframe">
                <select
                  className="sd-select"
                  value={form.timeframe}
                  onChange={(e) => set("timeframe", e.target.value)}
                >
                  {TIMEFRAMES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            {/* Description */}
            <Field label="Description">
              <textarea
                className="sd-textarea"
                placeholder="Briefly describe what this strategy does..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                maxLength={500}
              />
            </Field>

            {/* Enable toggle */}
            <div className="sd-toggle-row">
              <div>
                <p className="sd-toggle-label">Enable Strategy</p>
                <p className="sd-toggle-hint">Active strategies generate live signals</p>
              </div>
              <label className="sd-switch" aria-label="Enable strategy">
                <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
                <span className="sd-switch-track" />
              </label>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="sd-footer">
            <button type="button" className="sd-btn sd-btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="sd-btn sd-btn-submit" disabled={loading}>
              {loading
                ? <><Loader2 size={13} className="sd-spin" />{isEdit ? "Saving…" : "Creating…"}</>
                : <>{!isEdit && <Plus size={13} />}{isEdit ? "Save Changes" : "Create Strategy"}</>
              }
            </button>
          </div>
        </form>

      </div>
    </>,
    document.body,
  );
}
