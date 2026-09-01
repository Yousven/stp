import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { presenceLimiter } from "../middleware/rateLimit.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../middleware/errorHandler.js";
import { computeWorkedHours, presenceState } from "../utils/timeStats.js";
import { checkGeofence } from "../utils/geofence.js";
import { decidePresenceEvent } from "../utils/presenceEvents.js";
import { recordAudit } from "../utils/audit.js";

export const timeLogsRouter = Router();
timeLogsRouter.use(requireAuth);

const startSchema = z.object({
  objectId: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  /** Mis tööd tehakse — vajalik kliendiarvelduseks. Valikuline. */
  workTypeId: z.number().int().positive().optional(),
  /** Seade teatas võltsitud asukohast (mock location). */
  mocked: z.boolean().optional().default(false),
  /**
   * Offline-režiimis salvestatud aeg (ISO). Kui antud, kasutatakse seda
   * tööpäeva alguseks serveri aja asemel — töötaja alustas siis, kui
   * levi polnud.
   */
  occurredAt: z.string().datetime().optional(),
});

/** Kui kaugele minevikku tohib offline-kirje ulatuda. */
const MAX_OFFLINE_AGE_MS = 7 * 24 * 3600 * 1000;
/** Kellanihe, millest alates märgime kirje kahtlaseks. */
const SUSPICIOUS_DRIFT_SECONDS = 300;

// Port: public/start_work_action.php (+ serveripoolne asukoha kontroll,
// mida originaalis EI olnud — seal sai sisse registreerida kust tahes).
timeLogsRouter.post(
  "/start",
  asyncHandler(async (req, res) => {
    const { objectId, latitude, longitude, accuracy, workTypeId, mocked, occurredAt } = startSchema.parse(req.body);
    const userId = req.user!.sub;

    // Erinevalt originaalist kontrollime ka, et objekt poleks deaktiveeritud
    // (objects.deleted) ega kuuluks mõnele teisele ettevõttele — mõlemad on
    // täiendused, mida originaal (üksiku ettevõtte rakendus) ei vajanud.
    const object = await prisma.workObject.findFirst({
      where: { id: objectId, organizationId: req.user!.organizationId, deleted: false },
    });
    if (!object) {
      throw new HttpError(404, req.m.objects.selectedNotFound);
    }

    // Asukoha kontroll serveri poolel: klient ei saa seda vahele jätta ega
    // võltsida lihtsalt kontrolli välja kommenteerides.
    const fence = checkGeofence(
      { latitude: Number(object.latitude), longitude: Number(object.longitude), radius: object.radius },
      { latitude, longitude, accuracy }
    );
    if (!fence.inside) {
      throw new HttpError(403, req.m.timeLogs.tooFar(Math.round(fence.distance), object.radius));
    }

    /**
     * Offline: telefon salvestas alustamise ilma ühenduseta ja saadab
     * nüüd. Usaldame seadme aega, aga piiratult — tulevikku suunatud või
     * väga vana aeg lükatakse tagasi, ja kellanihe salvestatakse, et
     * admin näeks, kui keegi on kella nihutanud.
     *
     * NB: see arvutus peab olema ENNE objektivahetust, sest eelmine
     * tööpäev tuleb lõpetada täpselt uue algushetkel.
     */
    const now = new Date();
    let startTime = now;
    let createdOffline = false;
    let clockDriftSeconds: number | null = null;

    if (occurredAt) {
      const reported = new Date(occurredAt);
      const driftMs = now.getTime() - reported.getTime();

      if (driftMs < -SUSPICIOUS_DRIFT_SECONDS * 1000) {
        throw new HttpError(400, req.m.timeLogs.clockInFuture);
      }
      if (driftMs > MAX_OFFLINE_AGE_MS) {
        throw new HttpError(400, req.m.timeLogs.tooOldOffline);
      }

      startTime = reported;
      createdOffline = true;
      clockDriftSeconds = Math.round(driftMs / 1000);
    }

    /**
     * Objektilt objektile liikumine on ehituses igapäevane, seega avatud
     * tööpäev EI blokeeri enam uue alustamist — kui uus objekt on teine,
     * lõpetame eelmise automaatselt ja alustame uue. Nii ei pea töötaja
     * kaks korda nuppu vajutama ega jää eelmine päev lahtiseks.
     *
     * Sama objektiga on tegu ilmselt eksitusega (topeltvajutus), seega
     * seal jääb varasem käitumine alles.
     */
    const activeLog = await prisma.timeLog.findFirst({ where: { userId, endTime: null } });
    if (activeLog) {
      if (activeLog.objectId === objectId) {
        throw new HttpError(409, req.m.timeLogs.alreadyStarted);
      }

      /**
       * Eelmine päev lõpeb TÄPSELT uue algushetkel, mitte "praegu".
       *
       * Serveri kellaaja kasutamine tegi offline-kirje puhul kattuva
       * vahemiku: vana päev jooksis praeguse hetkeni, uus algas minevikus,
       * ja kattuv aeg läks kaks korda arvesse. Nüüd on kaks kirjet alati
       * järjestikused.
       */
      if (startTime.getTime() < activeLog.startTime.getTime()) {
        // Offline-kirje on vanem kui juba avatud tööpäev — sellest ei saa
        // järjestikuseid kirjeid teha ja vaikiv sobitamine rikuks andmed.
        throw new HttpError(409, req.m.timeLogs.switchBeforeActiveStart);
      }

      await prisma.timeLog.update({
        where: { id: activeLog.id },
        data: {
          endTime: startTime,
          comment: "Automaatselt lõpetatud: töötaja alustas tööd teisel objektil.",
          presenceEvents: { create: { type: "EXIT", occurredAt: startTime, source: "manual" } },
        },
      });
    }

    // Vale tööliigi vaikiv ignoreerimine annaks arvele valed read, seega
    // kontrollime enne salvestamist.
    if (workTypeId) {
      // Tööliik peab olema sellel objektil kasutusel, mitte ainult
      // ettevõttes olemas — muidu saaks koristaja tunnid lammutuse hinnaga
      // arvele minna.
      const code = await prisma.objectWorkType.findFirst({
        where: {
          objectId,
          workTypeId,
          workType: { organizationId: req.user!.organizationId, deleted: false },
        },
        select: { objectId: true },
      });
      if (!code) throw new HttpError(404, req.m.workTypes.notOnObject);
    }

    const log = await prisma.timeLog.create({
      data: {
        userId,
        objectId,
        workTypeId,
        startTime,
        createdOffline,
        clockDriftSeconds,
        startLatitude: latitude,
        startLongitude: longitude,
        // Võltsitud asukohta EI blokeerita: see võib olla ka seadme või
        // arendajarežiimi kõrvalmõju ja tööpäeva kaotamine oleks ausa
        // töötaja jaoks liiga karm. Märgime ja näitame adminile.
        locationMocked: mocked,
        // Sisseregistreerimine ise on esimene kohaloleku tõend.
        presenceEvents: {
          create: { type: "ENTER", occurredAt: startTime, latitude, longitude, accuracy, source: "manual", mocked },
        },
      },
      include: { object: true, presenceEvents: true },
    });
    res.status(201).json(log);
  })
);

const presenceEventsSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.enum(["ENTER", "EXIT"]),
        occurredAt: z.string().datetime(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        accuracy: z.number().nonnegative().optional(),
        source: z.enum(["manual", "foreground", "native"]).optional().default("foreground"),
        mocked: z.boolean().optional().default(false),
      })
    )
    .min(1)
    .max(200),
});

/**
 * Kohaloleku sündmuste üleslaadimine.
 *
 * Natiivne taustajälgimine kogub sündmused seadmes järjekorda ja saadab
 * need partiidena, kui äpp järgmine kord avatakse — seetõttu peab see
 * olema idempotentne.
 *
 * ASÜMMEETRILINE KONTROLL. EXIT ja ENTER ei ole võrdsed:
 *
 *   EXIT  peatab kella ehk saab tunde ainult VÄHENDADA. Seda võtame
 *         vastu ilma asukohakontrollita — vale EXIT teeb töötajale liiga,
 *         mitte ettevõttele, ja kella peatumine peab töötama ka siis, kui
 *         GPS on halb.
 *
 *   ENTER paneb peatatud kella uuesti käima ehk LISAB tunde. Seda tuleb
 *         tõendada täpselt samamoodi nagu tööpäeva alustamist.
 *
 * Varem võeti mõlemad vastu kontrollimata. See tähendas, et serveripoolne
 * asukohakontroll kehtis ainult tööpäeva ALUSTAMISEL: objektilt lahkunud
 * töötaja sai kella uuesti käima panna ükskõik kust, saates ühe ENTER
 * sündmuse. Sama auk lubas lisada ENTER-i juba lõpetatud tööpäeva sisse
 * ja nii tagantjärele tunde juurde saada.
 */
timeLogsRouter.post(
  "/:id/presence-events",
  presenceLimiter,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { events } = presenceEventsSchema.parse(req.body);
    const userId = req.user!.sub;

    const log = await prisma.timeLog.findFirst({ where: { id, userId }, include: { object: true } });
    if (!log) throw new HttpError(404, req.m.timeLogs.notFound);

    // Reegel ise on `utils/presenceEvents.ts`-s ja ühikutestidega kaetud —
    // siin on ainult partii läbikäimine.
    const context = {
      logStart: log.startTime,
      logEnd: log.endTime,
      object: {
        latitude: Number(log.object.latitude),
        longitude: Number(log.object.longitude),
        radius: log.object.radius,
      },
      now: new Date(),
      futureToleranceMs: SUSPICIOUS_DRIFT_SECONDS * 1000,
    };

    const accepted: typeof events = [];
    const rejected: { type: string; occurredAt: string; reason: string }[] = [];

    for (const event of events) {
      const decision = decidePresenceEvent(
        {
          type: event.type,
          occurredAt: new Date(event.occurredAt),
          latitude: event.latitude,
          longitude: event.longitude,
          accuracy: event.accuracy,
        },
        context
      );

      if (decision.accept) accepted.push(event);
      else rejected.push({ type: event.type, occurredAt: event.occurredAt, reason: decision.reason });
    }

    // skipDuplicates + @@unique([timeLogId, type, occurredAt]) teeb korduva
    // partii saatmise ohutuks: juba salvestatud sündmused jäetakse vahele.
    const result = accepted.length
      ? await prisma.presenceEvent.createMany({
          data: accepted.map((e) => ({
            timeLogId: id,
            type: e.type,
            occurredAt: new Date(e.occurredAt),
            latitude: e.latitude,
            longitude: e.longitude,
            accuracy: e.accuracy,
            source: e.source,
            mocked: e.mocked,
          })),
          skipDuplicates: true,
        })
      : { count: 0 };

    const updated = await prisma.timeLog.findUniqueOrThrow({
      where: { id },
      include: { object: true, presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });

    res.json({
      accepted: result.count,
      // Juba olemas olnud sündmused (idempotentsus).
      skipped: accepted.length - result.count,
      // Kontrollist läbi kukkunud sündmused koos põhjusega.
      rejected,
      /*
       * Kohaloleku olek PÄRAST partii salvestamist.
       *
       * Klient ei tohi eeldada, et tema saadetud ENTER läks arvesse —
       * server võib selle asukohakontrolli tõttu tagasi lükata. Ilma selle
       * väljata usuks äpp end objektile ja lõpetaks uuesti proovimise.
       */
      presence: presenceState(updated),
      log: withHours(updated),
    });
  })
);

const endSchema = z.object({
  comment: z.string().optional().default(""),
  travelDuration: z.number().nonnegative().optional().default(0),
  lunch: z.number().nonnegative().optional().default(0),
  /** Offline-režiimis salvestatud lõpetamise aeg. */
  occurredAt: z.string().datetime().optional(),
});

// Port: public/end_work_action.php (katab nii käsitsi kui geofence-põhise auto-lõpetamise,
// mis originaalis eristati ainult kommentaari teksti kaudu).
timeLogsRouter.post(
  "/:id/end",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { comment, travelDuration, lunch, occurredAt } = endSchema.parse(req.body);
    const userId = req.user!.sub;

    // Turvatäiendus originaali suhtes: kontrollime, et töölogi kuulub
    // sisselogitud kasutajale (originaal kontrollis ainult, et log on aktiivne).
    const log = await prisma.timeLog.findFirst({ where: { id, userId } });
    if (!log || log.endTime) {
      throw new HttpError(409, req.m.timeLogs.noActiveLog);
    }

    // Offline-lõpetamine: sama loogika mis alustamisel, aga lisaks ei tohi
    // lõpp olla enne algust — muidu tuleks negatiivne tööaeg.
    let endTime = new Date();
    if (occurredAt) {
      const reported = new Date(occurredAt);
      if (reported.getTime() > Date.now() + SUSPICIOUS_DRIFT_SECONDS * 1000) {
        throw new HttpError(400, req.m.timeLogs.clockInFutureShort);
      }
      if (reported.getTime() < log.startTime.getTime()) {
        throw new HttpError(400, req.m.timeLogs.endBeforeStart);
      }
      endTime = reported;
    }

    const updated = await prisma.timeLog.update({
      where: { id },
      data: {
        endTime,
        comment,
        travelDuration,
        lunch,
        // Väljaregistreerimine lõpetab kohaloleku — ilma selleta jääks
        // viimane ENTER lahtiseks ja tunnid loeksid lõpuni kohalolekuks.
        presenceEvents: { create: { type: "EXIT", occurredAt: endTime, source: "manual" } },
      },
      include: { object: true, presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });
    res.json(withHours(updated));
  })
);

const historyQuerySchema = z.object({
  objectId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Port: public/work_history.php
timeLogsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { objectId, dateFrom, dateTo } = historyQuerySchema.parse(req.query);
    const userId = req.user!.sub;

    const logs = await prisma.timeLog.findMany({
      where: {
        userId,
        ...(objectId ? { objectId } : {}),
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
      include: { object: true, presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });

    let totalHours = 0;
    const result = logs.map((log) => {
      const withComputed = withHours(log);
      if (log.endTime) totalHours += withComputed.durationHours ?? 0;
      return withComputed;
    });

    res.json({ logs: result, totalHours: round2(totalHours) });
  })
);

const adminUpdateSchema = z.object({
  workDuration: z.number().optional(),
  lunch: z.number().optional(),
  travelDuration: z.number().optional(),
  /** Põhjendus on kohustuslik, kui tunde käsitsi üle kirjutatakse. */
  reason: z.string().max(500).optional(),
});

/**
 * Port: public/update_work_log.php (admin muudab käsitsi päeva tunde).
 *
 * Iga muudatus kirjutatakse audit-logisse koos vana ja uue väärtusega.
 * Tundide ülekirjutamine nõuab lisaks põhjendust: kohaloleku-tõendi
 * tühistamine peab olema selgitatud, muidu poleks tõendist palgavaidluses
 * mingit kasu.
 */
timeLogsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { workDuration, lunch, travelDuration, reason } = adminUpdateSchema.parse(req.body);

    const log = await prisma.timeLog.findFirst({
      where: { id, user: { organizationId: req.user!.organizationId } },
      include: { presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });
    if (!log) throw new HttpError(404, req.m.timeLogs.notFound);

    const overridingHours = workDuration !== undefined && Number(log.manualWorkDuration ?? NaN) !== workDuration;
    if (overridingHours && !reason?.trim()) {
      const computed = computeWorkedHours(log).net;
      throw new HttpError(400, req.m.timeLogs.reasonRequired(computed));
    }

    const updated = await prisma.timeLog.update({
      where: { id },
      data: { manualWorkDuration: workDuration, lunch, travelDuration },
      include: { object: true, presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });

    // Logi AINULT need väljad, mis päringus tegelikult kaasas olid. Prisma
    // jätab `undefined` väljad puutumata, seega nende logimine "muutunuks"
    // tähendaks, et audit-jälg valetab.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (workDuration !== undefined) {
      changes.manualWorkDuration = { from: log.manualWorkDuration, to: workDuration };
      // Mille peale käsitsi väärtus kirjutati — ilma selleta ei näe hiljem,
      // kui palju see kohaloleku-tõendist erines.
      changes.computedHoursAtEdit = { from: computeWorkedHours(log).net, to: workDuration };
    }
    if (lunch !== undefined) changes.lunch = { from: log.lunch, to: lunch };
    if (travelDuration !== undefined) changes.travelDuration = { from: log.travelDuration, to: travelDuration };

    await recordAudit({
      organizationId: req.user!.organizationId,
      actorUserId: req.user!.sub,
      entityType: "time_log",
      entityId: id,
      action: "update",
      changes,
      reason,
    });

    res.json(withHours(updated));
  })
);

/** Töölogi muudatuste ajalugu (admin). */
timeLogsRouter.get(
  "/:id/audit",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const log = await prisma.timeLog.findFirst({
      where: { id, user: { organizationId: req.user!.organizationId } },
      select: { id: true },
    });
    if (!log) throw new HttpError(404, req.m.timeLogs.notFound);

    const entries = await prisma.auditLog.findMany({
      where: { organizationId: req.user!.organizationId, entityType: "time_log", entityId: id },
      orderBy: { createdAt: "desc" },
    });

    const actors = await prisma.user.findMany({
      where: { id: { in: entries.map((e) => e.actorUserId) } },
      select: { id: true, username: true },
    });
    const actorNames = new Map(actors.map((a) => [a.id, a.username]));

    res.json(
      entries.map((e) => ({
        id: e.id,
        action: e.action,
        actor: actorNames.get(e.actorUserId) ?? `#${e.actorUserId}`,
        changes: JSON.parse(e.changes),
        reason: e.reason,
        createdAt: e.createdAt,
      }))
    );
  })
);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type LogWithEvents = {
  startTime: Date;
  endTime: Date | null;
  lunch: unknown;
  manualWorkDuration?: unknown;
  presenceEvents?: Array<{ type: string; occurredAt: Date }>;
};

/**
 * Lisab töölogile arvutatud tunnid. `durationHours` on kohaloleku põhjal
 * arvutatud netotunnid; `awayHours` näitab, kui palju sellest tööpäevast
 * viibiti objektist väljas (admin näeb erinevust kestuse ja kohaloleku vahel).
 *
 * Admini käsitsi määratud `manualWorkDuration` võidab automaatika — see on
 * mõeldud just erandite parandamiseks (nt katkine GPS).
 */
export function withHours<T extends LogWithEvents>(log: T) {
  const { net, gross, awayHours, implausibleLength } = computeWorkedHours(log);
  const manual = log.manualWorkDuration != null ? Number(log.manualWorkDuration) : null;
  return {
    ...log,
    durationHours: log.endTime ? (manual ?? net) : null,
    grossHours: log.endTime ? gross : null,
    awayHours: log.endTime ? awayHours : null,
    // Ebausutavalt pikk päev vajab kontrolli. Käsitsi parandatud päev on
    // juba üle vaadatud, seega seal märget ei ole.
    implausibleLength: log.endTime && manual == null ? (implausibleLength ?? false) : false,
  };
}
