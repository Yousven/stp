import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Browser } from "@capacitor/browser";
import { ApiError, apiRequest } from "../api/client";
import type { SubscriptionState } from "../api/types";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Prooviperiood",
  active: "Aktiivne",
  past_due: "Makse hilineb",
  canceled: "Tühistatud",
  unpaid: "Maksmata",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("et-EE");
}

export function SubscriptionPage() {
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await apiRequest<SubscriptionState>("/subscription"));
    } catch {
      setError("Tellimuse andmete laadimine ebaõnnestus.");
    }
  }, []);

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
      setError(err instanceof ApiError ? err.message : "Stripe'i avamine ebaõnnestus.");
    } finally {
      setBusy(false);
    }
  }

  if (!state && !error) return <div className="page-loading">Laadin...</div>;

  return (
    <div className="page">
      <header className="topbar">
        <h1>Tellimus</h1>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {state && (
        <>
          {state.trialDaysLeft !== null && (
            <div className="alert alert-info">
              Prooviperiood lõpeb {formatDate(state.trialEndsAt)} — {state.trialDaysLeft} päeva jäänud.
            </div>
          )}

          {state.status === "past_due" && (
            <div className="alert alert-error">
              Viimane makse ebaõnnestus. Rakendus töötab edasi — töötajate tunnid ei tohi makse pärast
              kaduma minna — aga uuenda palun makseviisi.
            </div>
          )}

          {!state.active && (
            <div className="alert alert-error">
              Tellimus ei ole aktiivne. Tööaja registreerimine on peatatud, kuni tellimus taastatakse.
            </div>
          )}

          <section className="card">
            <h2>{statusLabel(state.status)}</h2>
            <dl className="stat-list">
              <div>
                <dt>Istekohti</dt>
                <dd>{state.seats}</dd>
              </div>
              <div>
                <dt>Hind / istekoht</dt>
                <dd>€{state.pricePerSeat.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Kuutasu</dt>
                <dd>€{state.monthlyTotal.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Periood lõpeb</dt>
                <dd>{formatDate(state.currentPeriodEnd)}</dd>
              </div>
            </dl>
            <p className="subtitle">
              Istekoht on iga aktiivne kasutaja, ka admin. Ootel ja tagasi lükatud liitumistaotlused ei
              lähe arvesse. Kasutaja lisamisel või eemaldamisel muutub kuutasu automaatselt.
            </p>
          </section>

          {state.stripeAvailable ? (
            <nav className="button-stack">
              {state.status === "trialing" || state.status === "canceled" ? (
                <button className="btn btn-primary" onClick={() => openStripe("checkout")} disabled={busy}>
                  {busy ? "Avan..." : "Vormista tellimus"}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => openStripe("portal")} disabled={busy}>
                  {busy ? "Avan..." : "Halda tellimust ja arveid"}
                </button>
              )}
            </nav>
          ) : (
            <div className="alert alert-info">
              Maksete vastuvõtt pole veel seadistatud. Võta ühendust Nutisemud'iga.
            </div>
          )}
        </>
      )}

      <Link className="btn btn-link" to="/dashboard">
        Tagasi Dashboardile
      </Link>
    </div>
  );
}
