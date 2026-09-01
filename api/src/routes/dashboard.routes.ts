import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeWorkedHours, monthRange, monthlyTargetHours, presenceState } from "../utils/timeStats.js";
import { absentWorkDaysInMonth, holidaysForMonth } from "../utils/workCalendar.js";

export const dashboardRouter = Router();

// Port: public/dashboard.php
dashboardRouter.get(
  "/dashboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;

    const activeLogRow = await prisma.timeLog.findFirst({
      where: { userId, endTime: null },
      orderBy: { startTime: "desc" },
      include: { object: true, presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });

    // Telefon peab teadma serveri arvates kehtivat kohaloleku olekut, muidu
    // ei saa ta esimesel esiplaani kontrollil aru, kas olek muutus, ja jätab
    // EXIT-i saatmata. Sündmuste nimekirja ennast telefonile ei saada.
    let activeLog = null;
    if (activeLogRow) {
      const { presenceEvents, ...rest } = activeLogRow;
      activeLog = { ...rest, presence: presenceState(activeLogRow) };
    }

    const lastFinished = activeLog
      ? null
      : await prisma.timeLog.findFirst({
          where: { userId, endTime: { not: null } },
          orderBy: { endTime: "desc" },
          include: { object: true },
        });

    /*
     * Tänase päeva kokkuvõte: kui kaua objektil ja kui kaua eemal.
     *
     * Miks server ja mitte telefon: päevas võib olla mitu tööpäeva (objekti
     * vahetus) ja lahtise päeva puhul peab arvestus jooksma praeguse
     * hetkeni. Telefon ei tea kohaloleku sündmusi — need jäävad tahtlikult
     * serverisse — seega peab summa tulema siit.
     *
     * Minutid, mitte tunnid: "0,3 h eemal" ei ütle töötajale midagi,
     * "18 min eemal" ütleb.
     */
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const todayLogs = await prisma.timeLog.findMany({
      where: { userId, startTime: { gte: dayStart, lt: dayEnd } },
      include: { presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });

    const todayTotals = todayLogs.reduce(
      (acc, log) => {
        const { net, awayHours } = computeWorkedHours(log);
        // Lõuna on juba `net`-ist maha arvatud; siin näitame kohalolekut,
        // seega liidame ta tagasi — muidu näeks töötaja kella ja selle
        // numbri vahel seletamatut vahet.
        const lunch = Number(log.lunch ?? 0);
        return {
          presentMinutes: acc.presentMinutes + Math.max(net + lunch, 0) * 60,
          awayMinutes: acc.awayMinutes + awayHours * 60,
          lunchMinutes: acc.lunchMinutes + lunch * 60,
        };
      },
      { presentMinutes: 0, awayMinutes: 0, lunchMinutes: 0 }
    );

    const today = {
      /** Objektil viibitud aeg, minutites (lõuna sees). */
      presentMinutes: Math.round(todayTotals.presentMinutes),
      /** Tööpäeva sees, aga objektist eemal viibitud aeg. */
      awayMinutes: Math.round(todayTotals.awayMinutes),
      lunchMinutes: Math.round(todayTotals.lunchMinutes),
      /** Mitu tööpäeva täna olnud on (objektivahetusel rohkem kui üks). */
      logCount: todayLogs.length,
    };

    const { start, end } = monthRange();
    // Kuu tunnid arvutatakse nüüd kohaloleku põhjal (computeWorkedHours),
    // sama helperiga mis tööajalugu ja raportid — varem oli siin oma valem,
    // mis erines ajaloost (ei lahutanud lõunat) ja andis suurema tulemuse.
    const finishedLogsThisMonth = await prisma.timeLog.findMany({
      where: { userId, endTime: { not: null }, startTime: { gte: start, lte: end } },
      include: { presenceEvents: { orderBy: { occurredAt: "asc" } } },
    });
    const totalHours = round2(
      finishedLogsThisMonth.reduce((sum, log) => {
        const manual = log.manualWorkDuration != null ? Number(log.manualWorkDuration) : null;
        return sum + (manual ?? computeWorkedHours(log).net);
      }, 0)
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const hourlyRate = Number(user.hourlyRate);
    const advance = Number(user.advance);
    const totalEarnings = round2(totalHours * hourlyRate);
    const netSalary = round2(totalEarnings - advance);

    // Norm arvestab riigipühi ja töötaja puhkust — muidu näeks puhkusel
    // olija välja alatäitjana ja püharohke kuu norm oleks liiga kõrge.
    const holidays = await holidaysForMonth(req.user!.organizationId, new Date());
    const absentDays = await absentWorkDaysInMonth(userId, new Date(), holidays);
    const monthlyTarget = monthlyTargetHours(new Date(), holidays, absentDays);
    const progress = monthlyTarget > 0 ? Math.min(Math.round((totalHours / monthlyTarget) * 100), 100) : 0;

    // Admin näeb dashboardil, kui keegi ootab liitumise kinnitust — muidu
    // jääks taotlus märkamatult seisma, kuna keegi ei tea seda otsida.
    const pendingRequests =
      req.user!.role === "admin"
        ? await prisma.user.count({ where: { organizationId: req.user!.organizationId, status: "pending" } })
        : 0;

    res.json({
      activeLog,
      lastFinished,
      pendingRequests,
      today,
      monthSummary: {
        totalHours,
        hourlyRate,
        advance,
        totalEarnings,
        netSalary,
        monthlyTarget,
        progress,
      },
    });
  })
);

const ONBOARDING_DISMISSED_KEY = "onboarding_dismissed";

/**
 * Kes on praegu tööl.
 *
 * Arvutiliidese avaleht: juhataja esimene küsimus hommikul on "kes on
 * objektil", mitte "mitu tundi ma ise sel kuul tegin". Telefonis seda vaadet
 * ei ole — seal on kasutaja ise see, kes tööd teeb.
 */
dashboardRouter.get(
  "/org-status",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const [active, pendingRequests] = await Promise.all([
      prisma.timeLog.findMany({
        where: { endTime: null, user: { organizationId } },
        include: {
          user: { select: { id: true, username: true } },
          object: { select: { id: true, name: true } },
          workType: { select: { id: true, name: true } },
          presenceEvents: { orderBy: { occurredAt: "asc" } },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.user.count({ where: { organizationId, status: "pending" } }),
    ]);

    res.json({
      pendingRequests,
      active: active.map((log) => {
        // "Kell käib" ja "on objektil" ei ole sama asi: lahkumine peatab
        // kella, aga ei lõpeta tööpäeva. Varem näitas see vaade kõiki
        // lõpetamata tööpäevi objektil olijatena, mistõttu juba ammu
        // lahkunud töötaja jäi ekraanile objektile seisma.
        const presence = presenceState(log);
        // Lahti ununenud tööpäev: tunnid on peatatud ja see vajab admini
        // sekkumist, muidu jääb päev igaveseks rippuma.
        const { openLimitReached } = computeWorkedHours(log);
        return {
          logId: log.id,
          userId: log.user.id,
          username: log.user.username,
          objectId: log.object.id,
          objectName: log.object.name,
          workTypeName: log.workType?.name ?? null,
          startTime: log.startTime,
          onSite: presence.onSite,
          // Millal praegune kohal/eemal olek algas.
          presenceSince: presence.since,
          // Objektil viibitud aeg enne praeguse oleku algust — arvutivaade
          // näitab selle põhjal kohal oldud aega, mitte aega tööpäeva
          // algusest, mis sisaldaks ka eemal käidud tunde.
          presentMsBefore: presence.presentMsBefore,
          // Viimane seadmelt saadud kohalolekusignaal; null = ainult algus.
          lastPresenceAt: presence.lastEventAt,
          // Offline järelsaadetud kirjed on adminile märgiline info: neid
          // ei kinnitanud server tegevuse hetkel.
          createdOffline: log.createdOffline,
          locationMocked: log.locationMocked,
          openLimitReached: openLimitReached ?? false,
        };
      }),
    });
  })
);

/**
 * Uue ettevõtte seadistamise seis.
 *
 * Värskelt registreerunud admin ei tea, mida esimesena teha — ilma
 * objektita ei saa keegi tööpäeva alustada ja ilma töötajateta pole
 * kellelgi midagi alustada. Sammud tuletatakse päris andmetest, mitte
 * eraldi lipust, et nimekiri ei saaks tegelikkusest lahku minna.
 */
dashboardRouter.get(
  "/onboarding",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const [organization, objectCount, employeeCount, workTypeCount, timeLogCount, dismissedRow] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true, slug: true } }),
      prisma.workObject.count({ where: { organizationId, deleted: false } }),
      // Admin ise ei ole "kutsutud töötaja" — muidu näiks samm tehtuna
      // kohe registreerumise järel.
      prisma.user.count({ where: { organizationId, status: "active", id: { not: req.user!.sub } } }),
      prisma.workType.count({ where: { organizationId, deleted: false } }),
      prisma.timeLog.count({ where: { user: { organizationId } } }),
      prisma.setting.findUnique({
        where: { organizationId_key: { organizationId, key: ONBOARDING_DISMISSED_KEY } },
      }),
    ]);

    const steps = {
      hasObject: objectCount > 0,
      hasEmployee: employeeCount > 0,
      hasWorkType: workTypeCount > 0,
      hasTimeLog: timeLogCount > 0,
    };

    res.json({
      organization,
      ...steps,
      // Kulukoodid on vajalikud ainult kliendiarvelduseks, seega need ei
      // takista alustamist ega loe "valmis" tingimusse.
      complete: steps.hasObject && steps.hasEmployee && steps.hasTimeLog,
      dismissed: dismissedRow?.value === "1",
    });
  })
);

/** Peidab seadistusjuhise, kui admin ei taha seda enam näha. */
dashboardRouter.post(
  "/onboarding/dismiss",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key: ONBOARDING_DISMISSED_KEY } },
      create: { organizationId, key: ONBOARDING_DISMISSED_KEY, value: "1" },
      update: { value: "1" },
    });
    res.status(204).end();
  })
);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
