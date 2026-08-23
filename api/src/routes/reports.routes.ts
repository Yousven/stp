import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { Router } from "express";
import pdfmake from "pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces.js";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hoursBetween } from "../utils/timeStats.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireAdmin);

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
    include: { user: true, object: true },
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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
      { header: "Netotunnid", key: "net", width: 14 },
      { header: "Tulu (€)", key: "earnings", width: 14 },
      { header: "Kommentaar", key: "comment", width: 30 },
    ];

    for (const log of logs) {
      const lunch = Number(log.lunch ?? 0);
      const gross = log.endTime ? hoursBetween(log.startTime, log.endTime) : null;
      const net = gross !== null ? gross - lunch : null;
      sheet.addRow({
        username: log.user.username,
        object: log.object.name,
        start: log.startTime.toISOString().slice(0, 19).replace("T", " "),
        end: log.endTime ? log.endTime.toISOString().slice(0, 19).replace("T", " ") : "Aktiivne",
        gross: gross !== null ? round2(gross) : "",
        lunch: gross !== null ? lunch : "",
        net: net !== null ? round2(net) : "",
        earnings: net !== null ? round2(net * Number(log.user.hourlyRate)) : "",
        comment: log.comment ?? "",
      });
    }

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
      const lunch = Number(log.lunch ?? 0);
      const duration = log.endTime ? hoursBetween(log.startTime, log.endTime) - lunch : null;
      const earnings = duration !== null ? round2(duration * Number(log.user.hourlyRate)) : null;
      return [
        log.user.username,
        log.object.name,
        log.startTime.toISOString().slice(0, 19).replace("T", " "),
        log.endTime ? log.endTime.toISOString().slice(0, 19).replace("T", " ") : "Aktiivne",
        duration !== null ? String(round2(duration)) : "Aktiivne",
        earnings !== null ? String(earnings) : "-",
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
            widths: ["auto", "auto", "auto", "auto", "auto", "auto", "*"],
            body: [
              ["Töötaja", "Objekt", "Alustas", "Lõppes", "Töötunnid", "Tulu (€)", "Kommentaar"].map((text) => ({
                text,
                bold: true,
              })),
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
