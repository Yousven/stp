import { prisma } from "../prisma.js";

/**
 * Tokenite tühistamise kontroll.
 *
 * Iga autenditud päringu kohta andmebaasipäringu tegemine oleks liiga
 * kallis, seega hoiame tühistamised mälus lühikese TTL-iga. Tühistamised on
 * haruldased, seega vahemälu tabamus on peaaegu alati; hind on see, et
 * tühistamine jõustub kuni CACHE_TTL_MS hilinemisega. Vallandamise ja
 * varastatud telefoni puhul on minut vastuvõetav.
 */
const CACHE_TTL_MS = 60_000;

let cache = new Map<number, number | null>(); // userId -> revokedAt (ms) | null
let cacheLoadedAt = 0;

async function loadCache(): Promise<void> {
  const rows = await prisma.tokenRevocation.findMany({ select: { userId: true, revokedAt: true } });
  cache = new Map(rows.map((r) => [r.userId, r.revokedAt.getTime()]));
  cacheLoadedAt = Date.now();
}

/**
 * Kas token on tühistatud? `issuedAt` on JWT `iat` väli (sekundites).
 *
 * Esimesel kutsel ja pärast TTL-i möödumist laetakse kõik tühistamised
 * korraga — neid on vähe, seega üks päring katab kõik kasutajad.
 */
export async function isTokenRevoked(userId: number, issuedAt: number | undefined): Promise<boolean> {
  if (issuedAt === undefined) return false;

  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    try {
      await loadCache();
    } catch (err) {
      // Kui andmebaas ei vasta, ära blokeeri kõiki kasutajaid — logi ja lase
      // läbi. Vastupidine käitumine tähendaks, et DB tõrge lukustab kogu
      // rakenduse välja.
      console.error("[revocation] Vahemälu laadimine ebaõnnestus:", err);
      return false;
    }
  }

  const revokedAt = cache.get(userId);
  if (!revokedAt) return false;
  // iat on sekundites, revokedAt millisekundites.
  return issuedAt * 1000 < revokedAt;
}

/** Tühistab kõik kasutaja senised tokenid (väljalogimine kõikjalt). */
export async function revokeUserTokens(userId: number, reason?: string): Promise<void> {
  const revokedAt = new Date();
  await prisma.tokenRevocation.upsert({
    where: { userId },
    update: { revokedAt, reason },
    create: { userId, revokedAt, reason },
  });
  // Uuenda vahemälu kohe, et tühistamine jõustuks samal hetkel sellel
  // instantsil (teised instantsid saavad selle TTL-i jooksul).
  cache.set(userId, revokedAt.getTime());
}

/** Ainult testide jaoks: sunnib vahemälu järgmisel kutsel uuesti laadima. */
export function __resetRevocationCache(): void {
  cache = new Map();
  cacheLoadedAt = 0;
}
