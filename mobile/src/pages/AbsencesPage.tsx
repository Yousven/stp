import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "../api/client";
import type { Absence, AbsenceType, AbsencesResponse, AdminUser } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useT } from "../i18n";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Kaasa arvatud päevade arv, et pikkus oleks kohe näha. */
function dayCount(startDate: string, endDate: string): number {
  const ms = new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime();
  return Math.round(ms / (24 * 3600 * 1000)) + 1;
}

/**
 * Puudumised ja puudumistaotlused.
 *
 * KAKS ERI VAADET sama nimekirja peal:
 *
 *   TÖÖTAJA esitab taotluse ja näeb, mis sellest sai. Varem oli see leht
 *           talle ainult nimekiri — nupp oli olemas, aga midagi teha ei
 *           saanud ja haldur ei saanud midagi kinnitada.
 *   HALDUR  sisestab juba otsustatud puudumise või otsustab taotluse.
 *
 * Ootel taotlus EI vähenda kuu normi — alles kinnitamine teeb seda.
 */
export function AbsencesPage() {
  const { user } = useAuth();
  const d = useT();
  const isAdmin = user?.role === "admin";

  const [data, setData] = useState<AbsencesResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [userId, setUserId] = useState<number | "">("");
  const [type, setType] = useState<AbsenceType>("vacation");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await apiRequest<AbsencesResponse>("/absences"));
    } catch {
      setError(d.absences.loadFailed);
    }
  }, [d]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<AdminUser[]>("/users")
      .then((list) => {
        // Ootel ja tagasi lükatud kasutajatele ei saa puudumist sisestada.
        const active = list.filter((u) => (u.status ?? "active") === "active");
        setUsers(active);
        if (active.length > 0) setUserId(active[0].id);
      })
      .catch(() => setError(d.absences.usersLoadFailed));
  }, [isAdmin, d]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Töötaja taotleb alati iseendale — serveri pool sunnib seda samuti.
    if (isAdmin && userId === "") return;
    setFormError("");
    setSubmitting(true);
    try {
      await apiRequest("/absences", {
        method: "POST",
        body: {
          userId: isAdmin ? userId : user?.id,
          type,
          startDate,
          endDate,
          comment: comment || undefined,
        },
      });
      setShowForm(false);
      setComment("");
      await load();
    } catch (err) {
      // Serveri teade on siin sisukam kui üldine tekst: kattuva puudumise
      // korral ütleb ta, millise perioodiga see kattub.
      setFormError(err instanceof ApiError ? err.message : d.absences.addFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(absence: Absence, approved: boolean) {
    let reason: string | undefined;
    if (!approved) {
      // Tagasilükkamise põhjus läheb töötajale ja audit-logisse.
      reason = prompt(d.absences.rejectReason) ?? undefined;
    }
    setBusyId(absence.id);
    try {
      await apiRequest(`/absences/${absence.id}/${approved ? "approve" : "reject"}`, {
        method: "POST",
        body: { comment: reason || undefined },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.absences.decisionFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(absence: Absence) {
    const isOwnPending = absence.userId === user?.id && absence.status === "pending";
    const question = isOwnPending
      ? d.absences.confirmWithdraw
      : d.absences.confirmDelete(absence.user.username, absence.startDate, absence.endDate);
    if (!confirm(question)) return;
    try {
      await apiRequest(`/absences/${absence.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : d.common.deleteFailed);
    }
  }

  function statusLabel(status: Absence["status"]): string {
    if (status === "pending") return d.absences.statusPending;
    if (status === "rejected") return d.absences.statusRejected;
    return d.absences.statusApproved;
  }

  const absences = data?.absences ?? null;

  return (
    <div className="page">
      <header className="topbar">
        <h1>{d.absences.title}</h1>
        <button className="btn btn-link" onClick={() => setShowForm((v) => !v)}>
          {showForm ? d.common.cancel : isAdmin ? d.common.add : d.absences.request}
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {!isAdmin && <p className="subtitle">{d.absences.employeeIntro}</p>}

      {isAdmin && data && data.pending > 0 && (
        <div className="alert alert-warning">{d.absences.pendingCount(data.pending)}</div>
      )}

      {showForm && (
        <form className="card" onSubmit={handleSubmit}>
          {formError && <div className="alert alert-error">{formError}</div>}
          {isAdmin && (
            <label>
              {d.absences.employee}
              <select value={userId} onChange={(e) => setUserId(Number(e.target.value))}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {d.absences.type}
            <select value={type} onChange={(e) => setType(e.target.value as AbsenceType)}>
              {(Object.keys(d.absences.types) as AbsenceType[]).map((t) => (
                <option key={t} value={t}>
                  {d.absences.types[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {d.absences.start}
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </label>
          <label>
            {d.absences.end}
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </label>
          <label>
            {d.common.comment}
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} />
          </label>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || (isAdmin && users.length === 0)}
          >
            {submitting ? d.common.saving : isAdmin ? d.absences.submit : d.absences.requestSubmit}
          </button>
        </form>
      )}

      {!absences && !error && <div className="page-loading">{d.common.loading}</div>}

      {absences && absences.length === 0 && (
        <div className="card">
          <p>{d.absences.none}</p>
        </div>
      )}

      {absences && absences.length > 0 && (
        <ul className="log-list">
          {absences.map((a) => (
            <li key={a.id} className="card log-item">
              <strong>
                {d.absences.types[a.type]}{" "}
                <span className="subtitle">
                  ({dayCount(a.startDate, a.endDate)} {d.common.days})
                </span>
              </strong>
              {isAdmin && <div>{a.user.username}</div>}
              <div>
                {a.startDate} – {a.endDate}
              </div>

              {/* Olek on kõige tähtsam asi, mida siit vaadatakse: kas
                  puudumine on kinnitatud või ainult taotletud. */}
              <div
                className={
                  a.status === "pending"
                    ? "text-warning"
                    : a.status === "rejected"
                      ? "text-error"
                      : "subtitle"
                }
              >
                {statusLabel(a.status)}
              </div>

              {a.comment && <div className="subtitle">{a.comment}</div>}
              {a.decisionComment && (
                <div className="subtitle">
                  {d.absences.decidedBy}: {a.decisionComment}
                </div>
              )}

              <div className="button-row" style={{ marginTop: "0.5rem" }}>
                {isAdmin && a.status === "pending" && (
                  <>
                    <button
                      className="btn btn-primary"
                      disabled={busyId === a.id}
                      onClick={() => decide(a, true)}
                    >
                      {d.absences.approve}
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={busyId === a.id}
                      onClick={() => decide(a, false)}
                    >
                      {d.absences.reject}
                    </button>
                  </>
                )}

                {/* Töötaja saab tagasi võtta ainult oma OOTEL taotluse —
                    kinnitatud puudumise kustutamine muudaks kuu normi ja
                    peab jääma halduri otsuseks. */}
                {!isAdmin && a.status === "pending" && a.userId === user?.id && (
                  <button className="btn btn-secondary" onClick={() => handleDelete(a)}>
                    {d.absences.withdraw}
                  </button>
                )}

                {isAdmin && (
                  <button className="btn btn-secondary" onClick={() => handleDelete(a)}>
                    {d.common.delete}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link className="btn btn-link" to="/dashboard">
        {d.common.backToDashboard}
      </Link>
    </div>
  );
}
