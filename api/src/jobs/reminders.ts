import cron from "node-cron";
import { env } from "../env.js";
import { prisma } from "../prisma.js";
import { sendCheckInReminder, sendCheckOutReminder, type ReminderRecipients } from "../notifications/notify.js";

/**
 * Meeldetuletuste taustatöö — port `cron/send_reminders.php`-st.
 *
 * Erinevused originaalist:
 * - Ettevõtte kaupa (originaal käis üle ühe globaalse kasutajate tabeli).
 * - Tähtajad tulevad iga ettevõtte enda seadetest, mitte koodi sisse
 *   kirjutatud 09:00/18:00 väärtustest.
 * - Töötaja saab ka ise teavituse (originaal teavitas ainult adminit).
 *
 * Job käib iga 15 min tagant, kuna tähtajad on ettevõtete kaupa erinevad;
 * ReminderLog tagab, et sama päeva teavitus läheb välja täpselt üks kord.
 */

const DEFAULTS = { check_in_deadline: "09:00:00", check_out_deadline: "18:00:00", admin_email: "" };

/** Kuupäev ja kellaaeg ettevõtte ajavööndis (mitte serveri omas). */
function nowInTimezone(): { date: string; minutes: number } {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: env.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // sv-SE annab ISO-laadse "YYYY-MM-DD HH:mm"
  const [date, time] = formatter.format(new Date()).split(" ");
  const [hour, minute] = time.split(":").map(Number);
  return { date, minutes: hour * 60 + minute };
}

function deadlineMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

/** Ajavööndit arvestav päeva algus/lõpp UTC Date'idena andmebaasi päringuks. */
function dayBounds(date: string): { start: Date; end: Date } {
  // Kasutame ettevõtte ajavööndi nihet, et "täna" tähendaks kohalikku päeva.
  const offsetMs = timezoneOffsetMs(date);
  const start = new Date(new Date(`${date}T00:00:00.000Z`).getTime() - offsetMs);
  const end = new Date(new Date(`${date}T23:59:59.999Z`).getTime() - offsetMs);
  return { start, end };
}

function timezoneOffsetMs(date: string): number {
  const reference = new Date(`${date}T12:00:00.000Z`);
  const local = new Date(reference.toLocaleString("en-US", { timeZone: env.timezone }));
  const utc = new Date(reference.toLocaleString("en-US", { timeZone: "UTC" }));
  return local.getTime() - utc.getTime();
}

async function alreadySent(organizationId: number, type: string, forDate: string): Promise<boolean> {
  const existing = await prisma.reminderLog.findUnique({
    where: { organizationId_type_forDate: { organizationId, type, forDate } },
  });
  return existing !== null;
}

async function markSent(organizationId: number, type: string, forDate: string) {
  await prisma.reminderLog.create({ data: { organizationId, type, forDate } });
}

async function recipientsFor(organizationId: number, adminEmail: string): Promise<ReminderRecipients> {
  const admins = await prisma.user.findMany({
    where: { organizationId, role: "admin", status: "active" },
    select: { id: true, email: true },
  });
  return {
    userIds: [],
    // Kui seadetes pole admini e-posti määratud, kasuta esimese admini oma.
    adminEmail: adminEmail || admins[0]?.email || "",
    adminUserIds: admins.map((a) => a.id),
  };
}

export async function runRemindersOnce(): Promise<void> {
  const { date, minutes } = nowInTimezone();
  const { start, end } = dayBounds(date);

  const organizations = await prisma.organization.findMany({ select: { id: true, name: true } });

  for (const org of organizations) {
    try {
      const settingRows = await prisma.setting.findMany({ where: { organizationId: org.id } });
      const settings = { ...DEFAULTS, ...Object.fromEntries(settingRows.map((s) => [s.key, s.value])) };
      const recipients = await recipientsFor(org.id, settings.admin_email);

      // --- Sisseregistreerimata töötajad ---
      if (minutes >= deadlineMinutes(settings.check_in_deadline) && !(await alreadySent(org.id, "check_in", date))) {
        const missing = await prisma.user.findMany({
          where: {
            organizationId: org.id,
            role: "employee",
            status: "active",
            timeLogs: { none: { startTime: { gte: start, lte: end } } },
            // Puhkusel/haiguslehel olija ei tohi saada "registreerimata"
            // meeldetuletust — see oli originaali käitumine ja tekitaks
            // põhjendamatuid teateid nii töötajale kui adminile.
            //
            // AINULT KINNITATUD puudumine vaigistab meeldetuletuse. Ootel
            // taotlus ei tohi seda teha: siis saaks igaüks meeldetuletused
            // vaikima panna, esitades taotluse, mida keegi ei kinnita.
            // Tagasi lükatud taotlus ammugi mitte.
            absences: {
              none: { status: "approved", startDate: { lte: date }, endDate: { gte: date } },
            },
          },
          select: { id: true, username: true },
        });

        // Märgi saadetuks ka siis, kui kedagi polnud — muidu käiks päring
        // iga 15 min tagant terve päeva.
        await markSent(org.id, "check_in", date);
        if (missing.length > 0) await sendCheckInReminder(recipients, missing);
      }

      // --- Lõpetamata tööpäevad ---
      if (minutes >= deadlineMinutes(settings.check_out_deadline) && !(await alreadySent(org.id, "check_out", date))) {
        const openLogs = await prisma.timeLog.findMany({
          where: { endTime: null, startTime: { gte: start, lte: end }, user: { organizationId: org.id } },
          select: { startTime: true, user: { select: { id: true, username: true } } },
        });

        await markSent(org.id, "check_out", date);
        if (openLogs.length > 0) {
          await sendCheckOutReminder(
            recipients,
            openLogs.map((l) => ({ id: l.user.id, username: l.user.username, startTime: l.startTime }))
          );
        }
      }
    } catch (err) {
      // Üks katkine ettevõte ei tohi teiste meeldetuletusi blokeerida.
      console.error(`[reminders] Ettevõtte ${org.name} (${org.id}) töötlemine ebaõnnestus:`, err);
    }
  }
}

/** Ainult testide jaoks — ajavööndi- ja tähtajaloogika on kergesti vaikselt vale. */
export const __testing = { deadlineMinutes, dayBounds, nowInTimezone };

export function startReminderJob() {
  if (!env.remindersEnabled) {
    console.info("[reminders] Taustatöö on välja lülitatud (REMINDERS_ENABLED=false)");
    return;
  }
  cron.schedule("*/15 * * * *", () => {
    runRemindersOnce().catch((err) => console.error("[reminders] Töö ebaõnnestus:", err));
  });
  console.info(`[reminders] Taustatöö käivitatud (iga 15 min, ajavöönd ${env.timezone})`);
}
