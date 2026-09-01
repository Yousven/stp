/**
 * Kleepuva riba peitmine alla kerides.
 *
 * Miks eraldi moodul, mitte komponendi sees olev skript: ilma impordita
 * paneb Astro lühikese skripti HTML-i sisse ja siis vajaks range CSP
 * `unsafe-inline`-i või iga buildi järel muutuvat räsi. Impordiga tuleb
 * temast tavaline väline moodul ja `script-src 'self'` on piisav.
 */
export function initNavAutoHide(): void {
  const nav = document.querySelector<HTMLElement>(".nav");
  if (!nav) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let last = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      // Ülemises servas on riba alati näha; allpool otsustab suund.
      if (y < 80 || y < last) nav.removeAttribute("data-hidden");
      else if (y > last + 4) nav.setAttribute("data-hidden", "");
      last = y;
    },
    { passive: true },
  );
}
