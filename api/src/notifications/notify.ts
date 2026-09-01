import { prisma } from "../prisma.js";
import { sendEmail } from "./email.js";
import { sendPushToUsers, type PushMessage } from "./push.js";

/**
 * Teavituste päästikud. Kõik on "fire and forget": teavituse ebaõnnestumine
 * ei tohi kunagi katkestada kasutaja tegevust (liitumistaotluse esitamist,
 * kinnitamist jne), seega vead logitakse, aga ei visata edasi.
 */

function fireAndForget(promise: Promise<unknown>, label: string) {
  promise.catch((err) => console.error(`[notify] ${label} ebaõnnestus:`, err));
}

async function orgAdminIds(organizationId: number): Promise<number[]> {
  const admins = await prisma.user.findMany({
    where: { organizationId, role: "admin", status: "active" },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

/** Uus liitumistaotlus → ettevõtte adminid. */
export function notifyJoinRequest(organizationId: number, username: string) {
  fireAndForget(
    (async () => {
      const adminIds = await orgAdminIds(organizationId);
      await sendPushToUsers(adminIds, {
        title: "Uus liitumistaotlus",
        body: `${username} soovib liituda su ettevõttega.`,
        data: { route: "/admin/requests" },
      });
    })(),
    "liitumistaotluse teavitus"
  );
}

/** Taotlus kinnitatud või tagasi lükatud → taotlejale. */
export function notifyRequestDecision(userId: number, approved: boolean, organizationName: string) {
  fireAndForget(
    sendPushToUsers([userId], {
      title: approved ? "Liitumistaotlus kinnitatud" : "Liitumistaotlus tagasi lükatud",
      body: approved
        ? `Sinu ligipääs ettevõttele ${organizationName} on kinnitatud. Saad nüüd sisse logida.`
        : `Sinu taotlus ettevõttele ${organizationName} lükati tagasi.`,
      data: { route: "/login" },
    }),
    "taotluse otsuse teavitus"
  );
}

export interface ReminderRecipients {
  /** Töötajad, kellele saata isiklik meeldetuletus. */
  userIds: number[];
  /** Admini e-post koondteate jaoks (ettevõtte seadetest). */
  adminEmail: string;
  adminUserIds: number[];
}

/** Meeldetuletus: sisseregistreerimine tegemata. */
export async function sendCheckInReminder(
  recipients: ReminderRecipients,
  missing: Array<{ id: number; username: string }>
) {
  const personal: PushMessage = {
    title: "Tööpäev registreerimata",
    body: "Sa pole täna veel tööpäeva alustanud. Kui oled tööl, registreeri end objektil sisse.",
    data: { route: "/start-work" },
  };
  await sendPushToUsers(
    missing.map((m) => m.id),
    personal
  );

  const names = missing.map((m) => `- ${m.username}`).join("\n");
  await sendPushToUsers(recipients.adminUserIds, {
    title: "Registreerimata töötajad",
    body: `${missing.length} töötajat pole täna tööpäeva alustanud.`,
    data: { route: "/admin/team-performance" },
  });

  if (recipients.adminEmail) {
    await sendEmail(
      recipients.adminEmail,
      "Tööajaarvestus: registreerimata töötajad",
      `Tere,\n\nJärgnevad töötajad pole tänaseks tööaega registreerinud:\n\n${names}\n\n` +
        "Parimate soovidega,\nSmartTimePlanning"
    );
  }
}

/** Meeldetuletus: tööpäev lõpetamata. */
export async function sendCheckOutReminder(
  recipients: ReminderRecipients,
  open: Array<{ id: number; username: string; startTime: Date }>
) {
  await sendPushToUsers(
    open.map((o) => o.id),
    {
      title: "Tööpäev lõpetamata",
      body: "Su tööpäev on veel avatud. Kui oled töö lõpetanud, registreeri end välja.",
      data: { route: "/end-work" },
    }
  );

  await sendPushToUsers(recipients.adminUserIds, {
    title: "Lõpetamata tööpäevad",
    body: `${open.length} töötajal on tööpäev veel avatud.`,
    data: { route: "/admin/team-performance" },
  });

  if (recipients.adminEmail) {
    const lines = open
      .map((o) => `- ${o.username} (alustas: ${o.startTime.toISOString().slice(0, 16).replace("T", " ")})`)
      .join("\n");
    await sendEmail(
      recipients.adminEmail,
      "Tööajaarvestus: lõpetamata tööpäevad",
      `Tere,\n\nJärgnevatel töötajatel on tööpäev veel lõpetamata:\n\n${lines}\n\n` +
        "Parimate soovidega,\nSmartTimePlanning"
    );
  }
}

/**
 * Kahtlane tegevus → töötajale JA ettevõtte halduritele.
 *
 * Töötaja peab teadma, et tema kontoga tehti midagi ootamatut — kui see ei
 * olnud tema, on see ainus viis seda avastada. Haldur peab teadma, sest
 * tema otsustab, kas tunnid vajavad parandust.
 *
 * Push on praegu seadistamata ja `sendPushToUsers` logib sel juhul vaikselt.
 * Märge ise on alati andmebaasis ja nähtav äpis, seega teavituse puudumine
 * ei kaota infot.
 */
export function notifySecurityAlert(alert: {
  organizationId: number;
  userId: number;
  type: string;
}) {
  const text: Record<string, { title: string; body: string }> = {
    device_mismatch: {
      title: "Tööpäeva muudeti teisest seadmest",
      body: "Sinu tööpäeva kohta tuli kirje teisest seadmest kui see, kus päev algas. Kui see ei olnud sina, anna haldurile teada.",
    },
    mock_location: {
      title: "Asukoht märgiti võltsituks",
      body: "Seade teatas, et asukoht on võltsitud. Kontrolli, et telefonis ei oleks asukohta muutvat rakendust.",
    },
    clock_drift: {
      title: "Seadme kell on nihkes",
      body: "Telefoni kellaaeg erineb serveri omast oluliselt. Kontrolli telefoni kellaaega, muidu võivad tunnid valesti salvestuda.",
    },
  };

  const message = text[alert.type];
  if (!message) return;

  fireAndForget(
    (async () => {
      // Töötajale isiklikult.
      await sendPushToUsers([alert.userId], {
        ...message,
        data: { route: "/dashboard" },
      });

      // Halduritele koondteade — v.a kui haldur ise ongi see kasutaja.
      const adminIds = (await orgAdminIds(alert.organizationId)).filter((id) => id !== alert.userId);
      if (adminIds.length === 0) return;

      const user = await prisma.user.findUnique({
        where: { id: alert.userId },
        select: { username: true },
      });
      await sendPushToUsers(adminIds, {
        title: "Kontrollimist vajav tegevus",
        body: `${user?.username ?? "Töötaja"}: ${message.title.toLowerCase()}.`,
        data: { route: "/admin/alerts" },
      });
    })(),
    "kahtlase tegevuse teavitus"
  );
}

/** Uus puudumistaotlus → ettevõtte adminid. */
export function notifyAbsenceRequest(organizationId: number, username: string, absenceId: number) {
  fireAndForget(
    (async () => {
      const adminIds = await orgAdminIds(organizationId);
      await sendPushToUsers(adminIds, {
        title: "Uus puudumistaotlus",
        body: `${username} esitas puudumistaotluse.`,
        data: { route: "/absences", absenceId: String(absenceId) },
      });
    })(),
    "puudumistaotluse teavitus"
  );
}

/** Taotlus kinnitatud või tagasi lükatud → taotlejale. */
export function notifyAbsenceDecision(userId: number, approved: boolean, period: string) {
  fireAndForget(
    sendPushToUsers([userId], {
      title: approved ? "Puudumine kinnitatud" : "Puudumine tagasi lükatud",
      body: approved
        ? `Sinu puudumine ${period} on kinnitatud.`
        : `Sinu puudumistaotlus ${period} lükati tagasi.`,
      data: { route: "/absences" },
    }),
    "puudumise otsuse teavitus"
  );
}
