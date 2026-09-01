import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import type { OnboardingState } from "../api/types";
import { useT } from "../i18n";
import { Icon } from "./Icon";

/**
 * Ettevõtte kood, mille admin annab töötajatele liitumiseks.
 *
 * Varem oli kood näha ainult seadistusjuhise lehel, mis kaob ära niipea kui
 * ettevõte on töövalmis (`complete`) või kui admin selle peidab. Pärast seda
 * ei olnud koodi kusagilt vaadata, kuigi just siis hakatakse uusi töötajaid
 * juurde võtma. Seetõttu on see nüüd omaette komponent, mis käib kaasas
 * töötajate haldamise lehega.
 */
export function OrgCodeCard() {
  const d = useT();
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiRequest<OnboardingState>("/me/onboarding")
      .then((state) => setSlug(state.organization.slug))
      .catch(() => setSlug(null));
  }, []);

  async function copy() {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard'i luba võib puududa — kood on niikuinii ekraanil näha.
      setCopied(false);
    }
  }

  if (!slug) return null;

  return (
    <section className="card">
      <h2>
        <Icon name="users" size={22} /> {d.onboarding.orgCode}
      </h2>
      <p>
        <strong style={{ fontSize: "1.5rem", letterSpacing: "0.05em" }}>{slug}</strong>
      </p>
      <p className="subtitle">{d.onboarding.orgCodeExplanation}</p>
      <button className="btn btn-secondary" onClick={copy}>
        {copied ? d.onboarding.copied : d.onboarding.copyCode}
      </button>
    </section>
  );
}
