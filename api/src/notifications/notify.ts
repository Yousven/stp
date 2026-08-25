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
