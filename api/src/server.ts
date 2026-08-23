import { createApp } from "./app.js";
import { env } from "./env.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`SmartTimePlanning API kuulab pordil ${env.port}`);
});
