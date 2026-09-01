// @ts-check
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import astro from "eslint-plugin-astro";

/**
 * Turunduslehe lint.
 *
 * `eslint-plugin-jsx-a11y` on siit teadlikult VÄLJAS: see toetab ESLint 9,
 * `eslint-plugin-astro@3` nõuab ESLint 10, ja need kaks ei mahu korraga
 * sõltuvuspuusse. Astro plugin toob ligipääsetavuse reeglid `.astro`
 * failidele ise kaasa. Kui jsx-a11y kunagi ESLint 10 toetab, tasub ta
 * React-saarte jaoks tagasi lisada.
 */
export default defineConfig([
  { ignores: ["dist/**", ".astro/**", "node_modules/**", ".review/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
  {
    // Astro konfiguratsioon jookseb Node'is.
    files: ["astro.config.mjs"],
    languageOptions: { globals: { URL: "readonly" } },
  },
  {
    // Tõmmiseskriptid jooksevad Node'is, aga `page.evaluate()` sisu
    // käivitatakse brauseris — seetõttu on siin mõlema keskkonna globaalid.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        window: "readonly",
        document: "readonly",
        innerHeight: "readonly",
        innerWidth: "readonly",
        scrollY: "readonly",
        scrollTo: "readonly",
        setTimeout: "readonly",
        getComputedStyle: "readonly",
        createImageBitmap: "readonly",
        OffscreenCanvas: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        location: "readonly",
        CSS: "readonly",
        URL: "readonly",
        Buffer: "readonly",
      },
    },
  },
]);
