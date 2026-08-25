// Sentry peab initsialiseeruma ENNE ülejäänud rakenduse importi, et jõuaks
// instrumentatsiooni paigaldada.
import { initObservability, isObservabilityEnabled } from "./observability.js";
initObservability();

import { createApp } from "./app.js";
import { env, isEmailConfigured, isPushConfigured } from "./env.js";
import { startReminderJob } from "./jobs/reminders.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`SmartTimePlanning API kuulab pordil ${env.port}`);
  // Ütle käivitamisel selgelt välja, kas teavitused päriselt lähevad välja —
  // muidu paistab seadistamata push täpselt samamoodi nagu töötav.
  console.log(`  push-teavitused: ${isPushConfigured() ? "seadistatud" : "SEADISTAMATA (ainult logitakse)"}`);
  console.log(`  e-post: ${isEmailConfigured() ? "seadistatud" : "SEADISTAMATA (ainult logitakse)"}`);
  console.log(`  vigade jälgimine: ${isObservabilityEnabled() ? "Sentry aktiivne" : "SEADISTAMATA (ainult konsool)"}`);
  // Vale hüppearv annab vaikselt vale kliendi-IP, seega ütleme selle välja.
  console.log(
    `  proksi-hüppeid: ${env.trustProxyHops} ` +
      `(${env.trustProxyHops >= 2 ? "Cloudflare + Caddy" : "ainult Caddy / otseühendus"})`
  );
  startReminderJob();
});

// Ilma nendeta lõpetaks protsess vaikselt töö ja keegi ei teaks põhjust.
process.on("unhandledRejection", (reason) => {
  console.error("[fatal] Käsitlemata promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[fatal] Käsitlemata erind:", err);
});
