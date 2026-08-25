import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Puuduv keskkonnamuutuja: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
  corsOrigins: (process.env.CORS_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean),

  // Ajavöönd, mille järgi arvutatakse meeldetuletuste tähtajad ja "täna".
  // Originaal (cron/send_reminders.php) kasutas Europe/Tallinn.
  timezone: process.env.TZ_NAME ?? "Europe/Tallinn",

  // Firebase Cloud Messaging (Android + iOS push). Kui puuduvad, logib
  // teenus teavitused konsooli ja jätab saatmata — rakendus töötab edasi.
  fcm: {
    projectId: process.env.FCM_PROJECT_ID ?? "",
    clientEmail: process.env.FCM_CLIENT_EMAIL ?? "",
    // Service account JSON-is on reavahetused \n-idena escapitud.
    privateKey: (process.env.FCM_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  },

  // SMTP meeldetuletuste e-kirjade jaoks. Sama loogika: puudumisel logitakse.
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "SmartTimePlanning <no-reply@example.com>",
  },

  // Meeldetuletuste taustatöö saab välja lülitada (nt arenduses).
  remindersEnabled: (process.env.REMINDERS_ENABLED ?? "true") !== "false",

  // Avalik aadress, mille peale ehitatakse parooli taastamise lingid.
  appUrl: process.env.APP_URL ?? "http://localhost:5173",

  // Tellimused (Stripe). Ilma võtmeteta töötab rakendus prooviperioodi
  // loogikaga, aga makset vastu võtta ei saa.
  pricePerSeatEur: Number(process.env.PRICE_PER_SEAT_EUR ?? 5),
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    priceId: process.env.STRIPE_PRICE_ID ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  },

  // Vigade jälgimine. Ilma DSN-ita on Sentry välja lülitatud.
  nodeEnv: process.env.NODE_ENV ?? "development",
  sentryDsn: process.env.SENTRY_DSN ?? "",
  sentryTracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
};

export const isPushConfigured = () =>
  Boolean(env.fcm.projectId && env.fcm.clientEmail && env.fcm.privateKey);

export const isEmailConfigured = () => Boolean(env.smtp.host && env.smtp.user);

export const isStripeConfigured = () => Boolean(env.stripe.secretKey && env.stripe.priceId);
