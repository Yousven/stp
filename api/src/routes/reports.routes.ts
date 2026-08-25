import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { Router } from "express";
import pdfmake from "pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces.js";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { reportLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeWorkedHours, splitOvertime, type OvertimeRules } from "../utils/timeStats.js";
import { overtimeRulesFor } from "../utils/orgSettings.js";
import { env } from "../env.js";

export const reportsRouter = Router();
// Raportid on kallid (käivad läbi kõik töölogid) — kitsam limiit.
reportsRouter.use(requireAuth, requireAdmin, reportLimiter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "..", "..", "assets", "fonts");

const reportQuerySchema = z.object({
  objectId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Ühine päring mõlema ekspordi jaoks. Port: export_report_excel.php / export_report_pdf.php
// (kaasab ka aktiivsed, lõpetamata töölogid — originaal ei filtreerinud
// end_time'i järgi, erinevalt admin_report.php eelvaatelehest).
async function fetchReportLogs(organizationId: number, filters: z.infer<typeof reportQuerySchema>) {
  const { objectId, userId, dateFrom, dateTo } = filters;
  return prisma.timeLog.findMany({
    where: {
      user: { organizationId },
      ...(objectId ? { objectId } : {}),
      ...(userId ? { userId } : {}),
      ...(dateFrom || dateTo
        ? {
            startTime: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    orderBy: { startTime: "desc" },
    include: { user: true, object: true, presenceEvents: { orderBy: { occurredAt: "asc" } } },
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type ReportLog = Awaited<ReturnType<typeof fetchReportLogs>>[number];

// Ühine tundide arvutus mõlemale ekspordile: kohaloleku põhjal, admini
// käsitsi määratud väärtus (manualWorkDuration) võidab automaatika.
function reportHours(log: ReportLog) {
  if (!log.endTime) return { gross: null, net: null, away: null, earnings: null };
  const { net, gross, awayHours } = computeWorkedHours(log);
  const manual = log.manualWorkDuration != null ? Number(log.manualWorkDuration) : null;
  const effectiveNet = manual ?? net;
  return {
    gross: round2(gross),
    net: round2(effectiveNet),
    away: round2(awayHours),
    earnings: round2(effectiveNet * Number(log.user.hourlyRate)),
  };
}

/** Kohalik kuupäev YYYY-MM-DD kujul ületundide päeva-/nädalarühmituseks. */
function localDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: env.timezone }).format(date);
}

/**
 * Ületunnid töötaja kaupa.
 *
 * Ületund tekib päeva või nädala normi ületamisest, seega seda EI saa
 * arvutada üksiku töölogi pealt — tuleb koguda kõik selle töötaja päevad
 * kokku. Sama päeva mitu logi (eri objektid) liidetakse.
 */
function overtimeByUser(logs: ReportLog[], rules: OvertimeRules) {
  const perUser = new Map<number, Map<string, number>>();

  for (const log of logs) {
    if (!log.endTime) continue;
    const hours = reportHours(log).net ?? 0;
    const day = localDate(log.startTime);
    const days = perUser.get(log.user.id) ?? new Map<string, number>();
    days.set(day, (days.get(day) ?? 0) + hours);
    perUser.set(log.user.id, days);
  }

  const result = new Map<number, ReturnType<typeof splitOvertime>>();
  for (const [userId, days] of perUser) {
    result.set(
      userId,
      splitOvertime(
        [...days.entries()].map(([date, hours]) => ({ date, hours })),
        rules
      )
    );
  }
  return result;
}

// Port: public/export_report_excel.php
reportsRouter.get(
  "/excel",
  asyncHandler(async (req, res) => {
    const filters = reportQuerySchema.parse(req.query);
    const logs = await fetchReportLogs(req.user!.organizationId, filters);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Tööajaaruanne");
    sheet.columns = [
      { header: "Töötaja", key: "username", width: 20 },
      { header: "Objekt", key: "object", width: 20 },
      { header: "Alustas", key: "start", width: 20 },
      { header: "Lõppes", key: "end", width: 20 },
      { header: "Brutotunnid", key: "gross", width: 14 },
      { header: "Lõuna (tunnid)", key: "lunch", width: 14 },
      { header: "Objektilt eemal (t)", key: "away", width: 18 },
      { header: "Asukoht kahtlane", key: "mocked", width: 18 },
      { header: "Netotunnid", key: "net", width: 14 },
      { header: "Tulu (€)", key: "earnings", width: 14 },
      { header: "Kommentaar", key: "comment", width: 30 },
    ];

    for (const log of logs) {
      const hours = reportHours(log);
      sheet.addRow({
        username: log.user.username,
        object: log.object.name,
        start: log.startTime.toISOString().slice(0, 19).replace("T", " "),
        end: log.endTime ? log.endTime.toISOString().slice(0, 19).replace("T", " ") : "Aktiivne",
        gross: hours.gross ?? "",
        lunch: log.endTime ? Number(log.lunch ?? 0) : "",
        away: hours.away ?? "",
        // Võltsitud GPS ei blokeeri tööpäeva, aga peab raportis silma paistma.
        mocked: log.locationMocked ? "JAH" : "",
        net: hours.net ?? "",
        earnings: hours.earnings ?? "",
        comment: log.comment ?? "",
      });
    }

    // Ületunnid eraldi lehel: neid ei saa reakaupa näidata, kuna ületund
    // tekib päeva/nädala kogusummast, mitte üksikust töölogist.
    const rules = await overtimeRulesFor(req.user!.organizationId);
    const overtime = overtimeByUser(logs, rules);

    if (overtime.size > 0) {
      const summary = workbook.addWorksheet("Ületunnid");
      summary.columns = [
        { header: "Töötaja", key: "username", width: 20 },
        { header: "Tavatunnid", key: "regular", width: 14 },
        { header: "Ületunnid", key: "overtime", width: 14 },
        { header: `Tasustatavad tunnid (×${rules.multiplier})`, key: "payable", width: 26 },
        { header: "Tunnihind (€)", key: "rate", width: 14 },
        { header: "Tasu kokku (€)", key: "total", width: 16 },
      ];

      const usersById = new Map(logs.map((l) => [l.user.id, l.user]));
      for (const [userId, breakdown] of overtime) {
        const user = usersById.get(userId);
        if (!user) continue;
        const rate = Number(user.hourlyRate);
        summary.addRow({
          username: user.username,
          regular: breakdown.regularHours,
          overtime: breakdown.overtimeHours,
          payable: breakdown.payableHours,
          rate,
          total: round2(breakdown.payableHours * rate),
        });
      }

      summary.getRow(1).font = { bold: true };
      summary.addRow({});
      summary.addRow({
        username: "Reeglid:",
        regular: rules.dailyThreshold > 0 ? `üle ${rules.dailyThreshold}h/päevas` : "päevareegel väljas",
        overtime: rules.weeklyThreshold > 0 ? `üle ${rules.weeklyThreshold}h/nädalas` : "nädalareegel väljas",
      });
    }

    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `tooajaaruanne_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  })
);

pdfmake.setFonts({
  Roboto: {
    normal: path.join(FONTS_DIR, "Roboto-Regular.ttf"),
    bold: path.join(FONTS_DIR, "Roboto-Bold.ttf"),
    italics: path.join(FONTS_DIR, "Roboto-Regular.ttf"),
    bolditalics: path.join(FONTS_DIR, "Roboto-Bold.ttf"),
  },
});

// Port: public/export_report_pdf.php
reportsRouter.get(
  "/pdf",
  asyncHandler(async (req, res) => {
    const filters = reportQuerySchema.parse(req.query);
    const logs = await fetchReportLogs(req.user!.organizationId, filters);

    const rows = logs.map((log) => {
      const hours = reportHours(log);
      return [
        log.user.username,
        log.object.name,
        log.startTime.toISOString().slice(0, 19).replace("T", " "),
        log.endTime ? log.endTime.toISOString().slice(0, 19).replace("T", " ") : "Aktiivne",
        hours.net !== null ? String(hours.net) : "Aktiivne",
        hours.away !== null ? String(hours.away) : "-",
        hours.earnings !== null ? String(hours.earnings) : "-",
        log.comment ?? "",
      ];
    });

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: "Roboto", fontSize: 9 },
      content: [
        { text: "Tööajaaruanne", style: "title" },
        {
          table: {
            headerRows: 1,
            widths: ["auto", "auto", "auto", "auto", "auto", "auto", "auto", "*"],
            body: [
              ["Töötaja", "Objekt", "Alustas", "Lõppes", "Töötunnid", "Eemal (t)", "Tulu (€)", "Kommentaar"].map(
                (text) => ({ text, bold: true })
              ),
              ...rows,
            ],
          },
        },
      ],
      styles: { title: { fontSize: 16, bold: true, alignment: "center", margin: [0, 0, 0, 12] } },
    };

    const filename = `tooajaaruanne_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const buffer = await pdfmake.createPdf(docDefinition).getBuffer();
    res.send(buffer);
  })
);
