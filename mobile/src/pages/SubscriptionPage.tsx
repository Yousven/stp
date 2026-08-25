import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import { ApiError, apiRequest } from "../api/client";
import type { SubscriptionState } from "../api/types";
import { useLocale, useT } from "../i18n";

export function SubscriptionPage() {
  const d = useT();
  const locale = useLocale();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Tundmatu Stripe'i olek näidatakse toorena, mitte tõlkimata tühjusena —
  // parem on näha "incomplete_expired" kui mitte midagi.
  const statusLabel = (status: string): string =>
    (d.subscription.statuses as Record<string, string | undefined>)[status] ?? status;

  const formatDate = (value: string | null): string =>
    value ? new Date(value).toLocaleDateString(locale) : "—";

  const load = useCallback(async () => {
    try {
      setState(await apiRequest<SubscriptionState>("/subscription"));
    } catch {
      setError(d.subscription.loadFailed);
    }
  }, [d]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Stripe'i lehed avatakse süsteemi brauseris, mitte WebView'is: makse- ja
   * 3D Secure voog eeldab päris brauserit ja kasutaja peab nägema, et
   * aadressiribal on Stripe.
   */
  async function openStripe(path: "checkout" | "portal") {
    setError("");
    setBusy(true);
    try {
      const { url } = await apiRequest<{ url: string }>(`/subscription/${path}`, { method: "POST" });
      await Browser.open({ url });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.subscription.openFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!state && !error) return <div className="page-loading">{d.common.loading}</div>;

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.subscription.title}</h1>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {state && (
        <>
          {state.trialDaysLeft !== null && (
            <div className="alert alert-info">
              {d.subscription.trialEnds(formatDate(state.trialEndsAt), state.trialDaysLeft)}
            </div>
          )}

          {state.status === "past_due" && (
            <div className="alert alert-error">
              {d.subscription.pastDue}
            </div>
          )}

          {!state.active && (
            <div className="alert alert-error">
              {d.subscription.inactive}
            </div>
          )}

          <section className="card">
            <h2>{statusLabel(state.status)}</h2>
            <dl className="stat-list">
              <div>
                <dt>{d.subscription.seats}</dt>
                <dd>{state.seats}</dd>
              </div>
              <div>
                <dt>{d.subscription.pricePerSeat}</dt>
                <dd>€{state.pricePerSeat.toFixed(2)}</dd>
              </div>
              <div>
                <dt>{d.subscription.monthlyTotal}</dt>
                <dd>€{state.monthlyTotal.toFixed(2)}</dd>
              </div>
              <div>
                <dt>{d.subscription.periodEnds}</dt>
                <dd>{formatDate(state.currentPeriodEnd)}</dd>
              </div>
            </dl>
            <p className="subtitle">
              {d.subscription.seatsExplanation}
            </p>
          </section>

          {state.stripeAvailable ? (
            <nav className="button-stack">
              {state.status === "trialing" || state.status === "canceled" ? (
                <button className="btn btn-primary" onClick={() => openStripe("checkout")} disabled={busy}>
                  {busy ? d.subscription.opening : d.subscription.checkout}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => openStripe("portal")} disabled={busy}>
                  {busy ? d.subscription.opening : d.subscription.portal}
                </button>
              )}
            </nav>
          ) : (
            <div className="alert alert-info">
              {d.subscription.notConfigured}
            </div>
          )}
        </>
      )}

      <Link className="btn btn-link" to="/dashboard">
        {d.common.backToDashboard}
      </Link>
    </div>
  );
}
