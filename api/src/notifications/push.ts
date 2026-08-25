import { JWT } from "google-auth-library";
import { env, isPushConfigured } from "../env.js";
import { prisma } from "../prisma.js";

export interface PushMessage {
  title: string;
  body: string;
  /** Vabad andmed, mille äpp saab teavitusele vajutamisel kätte (nt kuhu navigeerida). */
  data?: Record<string, string>;
}

let cachedClient: JWT | null = null;

function getClient(): JWT {
  if (!cachedClient) {
    cachedClient = new JWT({
      email: env.fcm.clientEmail,
      key: env.fcm.privateKey,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
  }
  return cachedClient;
}

/**
 * Saadab push-teavituse kõigile antud kasutajate seadmetele.
 *
 * Kui FCM-i mandaadid puuduvad, logitakse teavitus ja tagastatakse vaikselt —
 * nii saab kogu ülejäänud loogikat (päästikud, meeldetuletused) arendada ja
 * testida enne, kui Firebase'i projekt on olemas.
 */
export async function sendPushToUsers(userIds: number[], message: PushMessage): Promise<number> {
  if (userIds.length === 0) return 0;

  const tokens = await prisma.deviceToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });
  if (tokens.length === 0) return 0;

  if (!isPushConfigured()) {
    console.info(
      `[push] FCM seadistamata — jätaks saatmata ${tokens.length} seadmele: "${message.title}" / "${message.body}"`
    );
    return 0;
  }

  const client = getClient();
  const accessToken = await client.getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${env.fcm.projectId}/messages:send`;

  let sent = 0;
  const staleTokens: string[] = [];

  // FCM HTTP v1 võtab ühe sõnumi korraga (batch-endpoint on aegunud).
  await Promise.all(
    tokens.map(async ({ token }) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: message.title, body: message.body },
              data: message.data ?? {},
              android: { priority: "HIGH" },
              apns: { payload: { aps: { sound: "default" } } },
            },
          }),
        });

        if (res.ok) {
          sent++;
          return;
        }

        // 404/UNREGISTERED tähendab, et äpp on seadmest eemaldatud või token
        // aegunud — koristame sellised ära, et need ei koguneks igaveseks.
        const body = await res.text();
        if (res.status === 404 || body.includes("UNREGISTERED") || body.includes("INVALID_ARGUMENT")) {
          staleTokens.push(token);
        } else {
          console.error(`[push] FCM viga ${res.status}: ${body.slice(0, 200)}`);
        }
      } catch (err) {
        console.error("[push] FCM päring ebaõnnestus:", err);
      }
    })
  );

  if (staleTokens.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: staleTokens } } });
  }

  return sent;
}
