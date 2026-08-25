import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { OnboardingState } from "../api/types";

interface Step {
  done: boolean;
  title: string;
  body: string;
  to: string;
  action: string;
  /** Valikuline samm ei blokeeri alustamist. */
  optional?: boolean;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await apiRequest<OnboardingState>("/me/onboarding"));
    } catch {
      setError("Seadistuse seisu laadimine ebaõnnestus.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function dismiss() {
    try {
      await apiRequest("/me/onboarding/dismiss", { method: "POST" });
    } finally {
      navigate("/dashboard", { replace: true });
    }
  }

  async function copySlug() {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.organization.slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard'i luba võib puududa — kood on niikuinii ekraanil näha.
      setCopied(false);
    }
  }

  if (error) return <div className="page">{error}</div>;
  if (!state) return <div className="page-loading">Laadin...</div>;

  const steps: Step[] = [
    {
      done: state.hasObject,
      title: "Lisa esimene objekt",
      body:
        "Objekt on ehitusplats koos asukoha ja raadiusega. Tööpäeva saab alustada ainult objekti raadiuses — " +
        "see ongi kontroll, et tunnid oleksid tehtud õiges kohas.",
      to: "/admin/objects/new",
      action: "Lisa objekt",
    },
    {
      done: state.hasEmployee,
      title: "Too töötajad süsteemi",
      body:
        "Kaks võimalust: lisa kasutaja ise, või anna töötajale ettevõtte kood — ta loob konto ja sina kinnitad " +
        "taotluse. Kood üksi ligipääsu ei anna.",
      to: "/admin/users/new",
      action: "Lisa kasutaja",
    },
    {
      done: state.hasCostCode,
      title: "Kulukoodid kliendiarvelduseks",
      body:
        "Kui tahad hiljem kliendile arve esitada, määra tööliigid ja nende tunnihinnad. Ilma nendeta on tunnid " +
        "olemas, aga arveldusraportis ilma määrata.",
      to: "/admin/cost-codes",
      action: "Lisa kulukood",
      optional: true,
    },
    {
      done: state.hasTimeLog,
      title: "Proovi tööpäeva alustamist",
      body:
        "Mine objektile ja alusta tööpäeva. Nii näed ise, mida töötaja näeb, ja saad kontrollida, et raadius on " +
        "õige suurusega.",
      to: "/start-work",
      action: "Alusta tööpäeva",
    },
  ];

  const requiredLeft = steps.filter((s) => !s.optional && !s.done).length;

  return (
    <div className="page">
      <header className="topbar">
        <h1>Alustame</h1>
      </header>

      <p className="subtitle">
        Tere tulemast, {state.organization.name}! Neli sammu ja süsteem on töövalmis.
        {requiredLeft > 0 ? ` Veel ${requiredLeft} sammu.` : " Kõik olulised sammud on tehtud."}
      </p>

      <section className="card">
        <h2>Ettevõtte kood</h2>
        <p>
          <strong style={{ fontSize: "1.25rem", letterSpacing: "0.05em" }}>{state.organization.slug}</strong>
        </p>
        <p className="subtitle">
          Seda koodi vajab iga töötaja sisselogimisel ja liitumistaotluse tegemisel. Jaga see meeskonnaga.
        </p>
        <button className="btn btn-secondary" onClick={copySlug}>
          {copied ? "Kopeeritud" : "Kopeeri kood"}
        </button>
      </section>

      <ol className="onboarding-steps">
        {steps.map((step) => (
          <li key={step.title} className={`card${step.done ? " onboarding-done" : ""}`}>
            <h2>
              <span aria-hidden="true">{step.done ? "✓" : "○"}</span> {step.title}
              {step.optional && <span className="subtitle"> (valikuline)</span>}
            </h2>
            <p className="subtitle">{step.body}</p>
            {!step.done && (
              <Link className="btn btn-primary" to={step.to}>
                {step.action}
              </Link>
            )}
          </li>
        ))}
      </ol>

      <nav className="button-stack">
        <Link className="btn btn-secondary" to="/dashboard">
          Mine Dashboardile
        </Link>
        <button className="btn btn-link" onClick={dismiss}>
          Ära näita seda enam
        </button>
      </nav>
    </div>
  );
}
