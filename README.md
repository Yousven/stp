# SmartTimePlanning

Tööajaarvestuse rakendus ehitusettevõtetele. Arendaja: **Nutisemud**.

Lahendatav probleem: **töötaja oleks õigel ajal õigel objektil ja tunnid
oleksid õiged** — keegi ei saa kirja panna 10 tundi, kui ta oli objektil
viis. Tööpäeva saab alustada ainult objekti raadiuses (server kontrollib,
mitte äpp), kohalolekut jälgitakse ENTER/EXIT sündmustena ja tunnid
arvutatakse objektil viibitud intervallide summana.

## Osad

| Kaust | Mis see on |
|---|---|
| [`api/`](api/README.md) | Node.js + TypeScript + Express + Prisma REST API, MySQL |
| [`mobile/`](mobile/README.md) | React + TypeScript + Vite SPA, Capacitoriga Android/iOS äpp |
| [`website/`](website/README.md) | Avalik turundusveeb — Astro, TypeScript, GSAP |

Igas kaustas on oma README seadistuse, arenduse ja deploy juhistega.

Turundusveeb (`stp.nutisemud.ee`) on ülejäänust **sõltumatu** — ei impordi
`api/`-st ega `mobile/`-ist, ei lähe API Docker-image'i sisse ja tal on oma
deploy. Kasutajate loomine ja sisselogimine jäävad olemasolevasse
lahendusse; veeb ainult suunab sinna.

## Keeled

Eesti, inglise, vene ja ukraina keel — nii äpi liides kui serveri
veateated. Vt keelte peatükke mõlemas README-s.

## Ajalugu

Rakendus algas PHP/MySQL veebilahendusena ühele kliendile. See vana kood
(`public/*.php`, `config/`, `cron/`, `vendor/`) **eemaldati repost
25.08.2026** — uus API ja mobiiliäpp on selle täielikult asendanud. Vana
kood on vajadusel git-ajaloos alles, commitist `b71e625` tagasi vaadates.

Vana `config/config.php` sisaldas andmebaasi parooli avatekstis. Faili
eemaldamine **ei kustuta seda git-ajaloost** — vt [SECURITY.md](SECURITY.md)
parooli vahetamise plaani kohta.
