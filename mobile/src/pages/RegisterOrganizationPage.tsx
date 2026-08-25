import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, apiRequest } from "../api/client";
import type { LoginResponse } from "../api/types";

// Eemaldab diakriitikud (nt "ä" -> "a") pärast Unicode NFD normaliseerimist.
const diacriticsPattern = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(diacriticsPattern, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function RegisterOrganizationPage() {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOrgNameChange(value: string) {
    setOrgName(value);
    if (!slugTouched) setOrgSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (adminPassword !== confirmPassword) {
      setError("Paroolid ei ühti.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiRequest<LoginResponse>("/auth/register-organization", {
        method: "POST",
        body: { orgName, orgSlug, adminUsername, adminEmail, adminPassword },
        auth: false,
      });
      await applySession(data);
      // Tühi "lisa objekt" vorm ei ütle uuele kasutajale midagi selle kohta,
      // mida süsteem temalt ootab ja mis järjekorras.
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registreerimine ebaõnnestus.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page page-center">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Registreeri ettevõte</h1>
        <p className="subtitle">Loob uue ettevõtte ja esimese admin-kasutaja.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Ettevõtte nimi
          <input value={orgName} onChange={(e) => handleOrgNameChange(e.target.value)} required autoFocus />
        </label>
        <label>
          Ettevõtte kood
          <input
            value={orgSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setOrgSlug(slugify(e.target.value));
            }}
            required
          />
        </label>
        <div className="form-hint">Kasutatakse sisselogimisel. Väiketähed, numbrid, sidekriipsud.</div>
        <label>
          Admin kasutajanimi
          <input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} required />
        </label>
        <label>
          Admin e-mail
          <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
        </label>
        <label>
          Parool
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
          />
        </label>
        <div className="form-hint">Vähemalt 12 tähemärki, sisaldab numbrit ja sümbolit.</div>
        <label>
          Kinnita parool
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Palun oota..." : "Registreeri"}
        </button>
      </form>
      <Link to="/login" className="btn btn-link" style={{ alignSelf: "center" }}>
        Tagasi sisselogimisse
      </Link>
    </div>
  );
}
