import { prisma } from "../prisma.js";
import { notifySecurityAlert } from "../notifications/notify.js";

/**
 * Kahtlase tegevuse märked.
 *
 * MIDAGI EI BLOKEERITA. Tööpäev jääb kehtima ja tunnid arvutatakse edasi —
 * eesmärk on nähtavus, mitte karistus. Ehitusobjektil on katkine GPS,
 * laenatud telefon ja nihkes kell igapäevased, ja ausa töötaja tööpäeva
 * kaotamine oleks palju suurem kahju kui üks üle vaatamata märge.
 *
 * Teade läheb KAHTE suunda:
 *   - töötajale, sest tema konto on see, millega midagi ootamatut tehti;
 *   - haldurile, sest tema otsustab, kas tunnid vajavad parandust.
 */
export type SecurityAlertType =
  /** Sündmused tulevad teisest seadmest kui see, kus tööpäev algas. */
  | "device_mismatch"
  /** Seade teatas, et asukoht on võltsitud. */
  | "mock_location";

export interface RaiseAlertInput {
  organizationId: number;
  userId: number;
  timeLogId?: number | null;
  type: SecurityAlertType;
  details: Record<string, unknown>;
  /**
   * Sama juhtumi kordumine ei tekita uut märget. Kohaloleku sündmusi
   * saadetakse partiidena ja iga partii tekitaks muidu uue teate.
   */
  dedupeKey: string;
}

/**
 * Salvestab märke ja saadab teavituse.
 *
 * Ei viska kunagi erindit: märke tegemise ebaõnnestumine ei tohi
 * katkestada tööpäeva alustamist ega sündmuste vastuvõttu. Vaikiv
 * ebaõnnestumine on siin väiksem halb kui kaotatud tööaeg.
 */
export async function raiseSecurityAlert(input: RaiseAlertInput): Promise<void> {
  try {
    const created = await prisma.securityAlert.createMany({
      data: [
        {
          organizationId: input.organizationId,
          userId: input.userId,
          timeLogId: input.timeLogId ?? null,
          type: input.type,
          details: JSON.stringify(input.details),
          dedupeKey: input.dedupeKey,
        },
      ],
      // Unikaalne (organizationId, dedupeKey) — kordus jäetakse vahele.
      skipDuplicates: true,
    });

    // Teavitame ainult päris uuest juhtumist, mitte kordusest.
    if (created.count > 0) {
      notifySecurityAlert({
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
      });
    }
  } catch (err) {
    console.error("[security] märke salvestamine ebaõnnestus:", err);
  }
}


/**
 * Kas tegevus tuleb teisest seadmest kui see, kus tööpäev algas?
 *
 * TEADMATUS EI OLE KAHTLUS. Kui kumbki id puudub — vana äpiversioon, mis
 * päist veel ei saada, või arvutiliides — ei väida me midagi. Vale märge
 * ausa töötaja kohta on halvem kui üks vahele jäänud juhtum, sest see
 * õpetab haldurit märkeid ignoreerima.
 */
export function isDeviceMismatch(
  startDeviceId: string | null | undefined,
  currentDeviceId: string | null | undefined
): boolean {
  if (!startDeviceId || !currentDeviceId) return false;
  return startDeviceId !== currentDeviceId;
}
