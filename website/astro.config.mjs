// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

/**
 * Turundusleht: staatiline väljund, mitte SPA.
 *
 * React on olemas ainult saarte jaoks (`client:visible`) — kogu sisu
 * renderdatakse ehitusel HTML-iks. Vt CLAUDE.md.
 */
export default defineConfig({
  site: "https://stp.nutisemud.ee",
  output: "static",
  /*
   * React-integratsiooni EI OLE.
   *
   * Kavand nägi ette React-saari, aga ükski valmis sektsioon ei vaja
   * Reacti võimalusi — kõik on Astro markup + GSAP, mis juhib DOM-i.
   * Kasutamata integratsioon oleks pannud buildi 58 kB (gzip) React-i
   * runtime'i, mille ükski leht sisse ei loe: surnud fail deploy's.
   *
   * Kui mõni tulevane sektsioon vajab päriselt olekut, tuleb ta tagasi
   * ühe käsuga: `npx astro add react`.
   */
  integrations: [
    // Sitemap teab i18n seadistust ja märgib keeled `hreflang`-iga ise.
    sitemap({
      i18n: { defaultLocale: "et", locales: { et: "et-EE", en: "en", ru: "ru", uk: "uk" } },
      /*
       * Juriidilised lehed ja 404 on `noindex` — kinnitamata sisu ja
       * veateade ei kuulu sitemap'i. Sitemap ja robots peavad ütlema sama
       * asja, muidu saadame otsingumootorile vastukäivad juhised.
       */
      filter: (page) => !/\/(privacy|terms|contact|404)\/?$/.test(new URL(page).pathname),
    }),
  ],

  // Eesti on lähtekeel ja elab juurpolgul; ülejäänud saavad prefiksi.
  i18n: {
    defaultLocale: "et",
    locales: ["et", "en", "ru", "uk"],
    routing: { prefixDefaultLocale: false },
  },

  /*
   * Stiilileht jääb VÄLISEKS failiks.
   *
   * `"always"` sai proovitud: Lighthouse lubas renderdust blokeeriva
   * päringu kaotamisest ~450 ms võitu, aga MÕÕDETUD tulemus oli vastupidi
   * — FCP 1,8 s → 2,0 s ja Performance 96 → 95. Inline'itud CSS teeb iga
   * HTML-i ~7,5 kB (gzip) suuremaks ja aeglase ühenduse simulatsioonis
   * maksab see rohkem kui üks vahemällu jääv päring.
   *
   * `"auto"` inline'ib ainult päris väikesed lehepõhised tükid.
   */
  build: { inlineStylesheets: "auto" },
  vite: { build: { cssCodeSplit: false } },
});
