/**
 * Käsitsi käivitatav meeldetuletuste test.
 *
 * Meeldetuletused sõltuvad kellaajast (tähtaeg peab olema möödas), seega
 * siin seatakse tähtajad ajutiselt 00:00 peale, käivitatakse job ja
 * taastatakse algsed väärtused.
 *
 * Kasutus: npx tsx scripts/test-reminders.ts <orgSlug>
 */
import { PrismaClient } from "@prisma/client";
import { runRemindersOnce } from "../src/jobs/reminders.js";

const prisma = new PrismaClient();
const slug = process.argv[2] ?? "demo";

async function setSetting(organizationId: number, key: string, value: string) {
  await prisma.setting.upsert({
    where: { organizationId_key: { organizationId, key } },
    update: { value },
    create: { organizationId, key, value },
  });
}

async function main() {
  const org = await prisma.organization.findUniqueOrThrow({ where: { slug } });
  console.log(`Ettevõte: ${org.name} (id ${org.id})`);

  const before = await prisma.setting.findMany({ where: { organizationId: org.id } });
  const original = Object.fromEntries(before.map((s) => [s.key, s.value]));

  // Tähtajad möödas, et job kindlasti käivituks.
  await setSetting(org.id, "check_in_deadline", "00:00:00");
  await setSetting(org.id, "check_out_deadline", "00:00:00");

  // Eemalda tänased ReminderLog kirjed, et saaks korduvalt testida.
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Tallinn" }).format(new Date());
  await prisma.reminderLog.deleteMany({ where: { organizationId: org.id, forDate: today } });

  console.log(`\n--- runRemindersOnce (kuupäev ${today}) ---`);
  await runRemindersOnce();

  const logs = await prisma.reminderLog.findMany({ where: { organizationId: org.id, forDate: today } });
  console.log(`\nReminderLog kirjed: ${logs.map((l) => l.type).join(", ") || "(puuduvad)"}`);

  console.log("\n--- teine käivitus (peab olema idempotentne, mitte uuesti saata) ---");
  await runRemindersOnce();
  const logsAfter = await prisma.reminderLog.findMany({ where: { organizationId: org.id, forDate: today } });
  console.log(`ReminderLog kirjeid kokku: ${logsAfter.length} (peab olema sama mis enne: ${logs.length})`);

  // Taasta algsed seaded.
  for (const [key, value] of Object.entries(original)) {
    await setSetting(org.id, key, value);
  }
  await prisma.reminderLog.deleteMany({ where: { organizationId: org.id, forDate: today } });
  console.log("\nSeaded taastatud, test-kirjed koristatud.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
