import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import type { OnboardingState } from "../api/types";
import { useT } from "../i18n";

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
  const d = useT();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await apiRequest<OnboardingState>("/me/onboarding"));
    } catch {
      setError(d.onboarding.loadFailed);
    }
  }, [d]);

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
  if (!state) return <div className="page-loading">{d.common.loading}</div>;

  const steps: Step[] = [
    {
      done: state.hasObject,
      title: d.onboarding.stepObject.title,
      body: d.onboarding.stepObject.body,
      to: "/admin/objects/new",
      action: d.onboarding.stepObject.action,
    },
    {
      done: state.hasEmployee,
      title: d.onboarding.stepEmployee.title,
      body: d.onboarding.stepEmployee.body,
      to: "/admin/users/new",
      action: d.onboarding.stepEmployee.action,
    },
    {
      done: state.hasWorkType,
      title: d.onboarding.stepWorkType.title,
      body: d.onboarding.stepWorkType.body,
      to: "/admin/work-types",
      action: d.onboarding.stepWorkType.action,
      optional: true,
    },
    {
      done: state.hasTimeLog,
      title: d.onboarding.stepTimeLog.title,
      body: d.onboarding.stepTimeLog.body,
      to: "/start-work",
      action: d.onboarding.stepTimeLog.action,
    },
  ];

  const requiredLeft = steps.filter((s) => !s.optional && !s.done).length;

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.onboarding.title}</h1>
      </header>

      <p className="subtitle">
        {d.onboarding.welcome(state.organization.name)}
        {requiredLeft > 0 ? d.onboarding.stepsLeft(requiredLeft) : d.onboarding.allDone}
      </p>

      <section className="card">
        <h2>{d.onboarding.orgCode}</h2>
        <p>
          <strong style={{ fontSize: "1.25rem", letterSpacing: "0.05em" }}>{state.organization.slug}</strong>
        </p>
        <p className="subtitle">
          {d.onboarding.orgCodeExplanation}
        </p>
        <button className="btn btn-secondary" onClick={copySlug}>
          {copied ? d.onboarding.copied : d.onboarding.copyCode}
        </button>
      </section>

      <ol className="onboarding-steps">
        {steps.map((step) => (
          <li key={step.title} className={`card${step.done ? " onboarding-done" : ""}`}>
            <h2>
              <span aria-hidden="true">{step.done ? "✓" : "○"}</span> {step.title}
              {step.optional && <span className="subtitle"> ({d.common.optional})</span>}
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
          {d.onboarding.goToDashboard}
        </Link>
        <button className="btn btn-link" onClick={dismiss}>
          {d.onboarding.dismiss}
        </button>
      </nav>
    </div>
  );
}
