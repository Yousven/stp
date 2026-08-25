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
  startReminderJob();
});
