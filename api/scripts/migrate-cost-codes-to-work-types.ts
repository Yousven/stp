/**
 * Kulukoodide üleviimine tööliikide struktuuri.
 *
 * `cost_codes` tabel nimetati ümber `work_types`-iks ja objektipõhine hind
 * kolis eraldi `object_work_types` tabelisse. `prisma db push` ei oska
 * ümbernimetamist ära tunda — ta kustutab vana tabeli ja loob uue tühja,
 * seega tuleb read enne kõrvale panna ja pärast tagasi tuua.
 *
 * Kasutus (töökataloogist api/):
 *   npx tsx scripts/migrate-cost-codes-to-work-types.ts backup
 *   npx prisma db push
 *   npx tsx scripts/migrate-cost-codes-to-work-types.ts restore
 *
 * Mõlemad sammud on idempotentsed: kui vana tabelit enam ei ole või kui
 * tööliik on juba loodud, siis lihtsalt ei tehta midagi.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FILE = "scripts/.cost-codes-backup.json";

interface LegacyCostCode {
  id: number;
  organization_id: number;
  object_id: number | null;
  code: string;
  name: string;
  billable_rate: string | null;
  deleted: number;
}

interface Backup {
  codes: LegacyCostCode[];
  links: { id: number; cost_code_id: number }[];
}

async function backup() {
  const tables = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'cost_codes'"
  );
  if (Number(tables[0].n) === 0) {
    console.log("Vana tabelit cost_codes ei ole — varundada pole midagi.");
    return;
  }

  const codes = await prisma.$queryRawUnsafe<LegacyCostCode[]>("SELECT * FROM cost_codes");
  const links = await prisma.$queryRawUnsafe<{ id: number; cost_code_id: number }[]>(
    "SELECT id, cost_code_id FROM time_logs WHERE cost_code_id IS NOT NULL"
  );

  const data: Backup = { codes, links };
  writeFileSync(FILE, JSON.stringify(data, null, 2));
  console.log(`Varundatud ${codes.length} kulukoodi ja ${links.length} töölogi seost → ${FILE}`);
}

async function restore() {
  if (!existsSync(FILE)) {
    console.log(`${FILE} puudub — taastada pole midagi.`);
    return;
  }
  const data: Backup = JSON.parse(readFileSync(FILE, "utf8"));

  // Vana id → uus id, et töölogide seosed saaks tagasi panna.
  const idMap = new Map<number, number>();

  for (const legacy of data.codes) {
    const rate = legacy.billable_rate === null ? null : Number(legacy.billable_rate);

    // Nime ja koodi EI vahetata ära, isegi kui need tunduvad segamini olevat:
    // andmete vaikne ümbertõlgendamine on halvem kui üks käsitsi parandus.
    const existing = await prisma.workType.findFirst({
      where: { organizationId: legacy.organization_id, name: legacy.name },
    });

    const workType =
      existing ??
      (await prisma.workType.create({
        data: {
          organizationId: legacy.organization_id,
          name: legacy.name,
          code: legacy.code || null,
          // Objektiga seotud koodi hind kolib objekti reale, üldise oma jääb
          // tööliigi vaikehinnaks.
          defaultRate: legacy.object_id === null ? rate : null,
          deleted: legacy.deleted === 1,
        },
      }));

    idMap.set(legacy.id, workType.id);

    if (legacy.object_id !== null) {
      await prisma.objectWorkType.upsert({
        where: { objectId_workTypeId: { objectId: legacy.object_id, workTypeId: workType.id } },
        update: { rate },
        create: { objectId: legacy.object_id, workTypeId: workType.id, rate },
      });
    }
  }

  let relinked = 0;
  for (const link of data.links) {
    const workTypeId = idMap.get(link.cost_code_id);
    if (workTypeId === undefined) continue;
    await prisma.timeLog.update({ where: { id: link.id }, data: { workTypeId } });
    relinked++;
  }

  console.log(`Taastatud ${idMap.size} tööliiki ja ${relinked} töölogi seost.`);
}

async function main() {
  const mode = process.argv[2];
  if (mode === "backup") await backup();
  else if (mode === "restore") await restore();
  else {
    console.error("Kasutus: migrate-cost-codes-to-work-types.ts <backup|restore>");
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
