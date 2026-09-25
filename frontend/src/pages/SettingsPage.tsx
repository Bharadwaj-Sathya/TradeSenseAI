import { useEffect, useState } from "react";
import { Check, KeyRound, Save, Settings2 } from "lucide-react";
import { fetchBreezeSessionStatus, updateBreezeSession } from "../api/settings";

export default function SettingsPage() {
  const [session, setSession] = useState("");
  const [configured, setConfigured] = useState(false);
  const [lastFour, setLastFour] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBreezeSessionStatus().then((result) => {
      setConfigured(result.configured);
      setLastFour(result.last_four);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Unable to load settings");
      setStatus("error");
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.trim()) {
      setError("Enter a Breeze session value before saving.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const result = await updateBreezeSession(session.trim());
      setConfigured(result.configured);
      setLastFour(result.last_four);
      setSession("");
      setStatus("saved");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to save settings");
      setStatus("error");
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-heading">
        <div>
          <span className="settings-kicker">SYSTEM / CONFIGURATION</span>
          <h1>Settings</h1>
          <p>Manage the connection details used by your trading services.</p>
        </div>
        <div className="settings-heading-icon" aria-hidden="true"><Settings2 size={22} /></div>
      </div>
      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div className="settings-panel-icon"><KeyRound size={18} /></div>
          <div>
            <h2>ICICI Direct Breeze</h2>
            <p>Update the session token used for market data authentication.</p>
          </div>
          <span className={`settings-status ${configured ? "is-ready" : ""}`}>
            <i /> {configured ? `Connected ••••${lastFour}` : "Not configured"}
          </span>
        </div>
        <form className="settings-form" onSubmit={handleSubmit}>
          <label htmlFor="breeze-session">Breeze session</label>
          <div className="settings-input-row">
            <input id="breeze-session" type="password" value={session} onChange={(event) => {
              setSession(event.target.value);
              setStatus("idle");
            }} placeholder={configured ? "Enter a new session token" : "Enter your session token"} autoComplete="off" />
            <button type="submit" disabled={status === "saving"}>
              {status === "saved" ? <Check size={16} /> : <Save size={16} />}
              {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save session"}
            </button>
          </div>
          <p className="settings-help">The value is written to the backend environment file and is never displayed in full.</p>
          {status === "error" && <p className="settings-feedback is-error">{error}</p>}
          {status === "saved" && <p className="settings-feedback">Session saved successfully.</p>}
        </form>
      </section>
    </div>
  );
}