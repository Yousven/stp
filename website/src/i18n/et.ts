/**
 * Eesti keel on LÄHTEKEEL. Teised keeled on typitud selle järgi
 * (`Messages = typeof et`), seega puuduv võti on kompileerimisviga —
 * sama reegel mis äpis.
 *
 * Turunduskoopiat EI kirjutata komponentidesse. Kui tekst on ekraanil, on
 * ta siin. Pealkirjad on massiivides, sest suur condensed tüpograafia
 * vajab käsitsi määratud reavahetusi — automaatne murdmine lõhub kuju ja
 * teeb seda igas keeles erinevas kohas.
 */
export const et = {
  meta: {
    title: "SmartTimePlanning — tunnid, mis vastavad tegelikkusele",
    description:
      "Tööajaarvestus ehitusettevõtetele. Tööpäev algab objektil, kohalolekut kinnitab server. 14 päeva tasuta.",
    langName: "Eesti",
    ogAlt: "SmartTimePlanning — tunnid, mis vastavad tegelikkusele",
  },

  nav: {
    skipToContent: "Otse sisu juurde",
    language: "Keel",
    cta: "Alusta tasuta",
    sections: "Sektsioonid",
    menu: "Menüü",
    links: {
      how: "Kuidas töötab",
      admin: "Halduri vaade",
      billing: "Arveldamine",
      pricing: "Hind",
    },
  },

  hero: {
    headline: ["Tunnid,", "mis vastavad", "tegelikkusele."],
    headlineAccentLine: 2,
    lede:
      "Tööajaarvestus ehitusettevõtetele. Tööpäev algab objektil, mitte tabelis — " +
      "kohalolekut kinnitab server, mitte äpp.",
    cta: "Alusta tasuta",
    ctaNote: (days: number) => `${days} päeva tasuta`,

    hud: {
      site: "Objekt",
      radius: "Raadius",
      presenceConfirmed: "Kohalolek kinnitatud",
      clockRunning: "Kell käib",
      inside: "Objektil",
      coordinates: "Koordinaadid",
      serverChecked: "Kontrollitud serveris",
    },
  },

  proof: {
    claimed: "10h kirjas.",
    actual: "5h objektil.",
    verdict: "See ei ole enam võimalik.",

    labelClaimed: "Esitatud",
    labelActual: "Kohalolekuga tõendatud",
    labelGap: "Vahe",

    summary:
      "Varem sai kirja panna kümme tundi, olles objektil viis. " +
      "Nüüd arvutatakse tunnid kohalolekust: aeg käib ainult objektil.",
  },

  /** S3 — kohaloleku ahel. Lehe peamine tootedemo. */
  chain: {
    sectionLabel: "Kuidas see töötab",
    heading: "Kohaloleku ahel",
    summary:
      "Töötaja jõuab objektile, asukoht kontrollitakse, kell hakkab käima. " +
      "Objektilt lahkudes aeg peatub ja tööpäev jääb lõpetamata seni, kuni " +
      "töötaja selle ise lõpetab.",
    steps: [
      {
        index: "01",
        label: "Saabu",
        title: ["Töötaja jõuab", "objektile."],
        body: "Asukoht kontrollitakse objekti järgi enne tööaja kinnitamist.",
        status: "Kontrollin asukohta",
        hud: "Kaugus objektist",
      },
      {
        index: "02",
        label: "Kinnitatud",
        title: ["Asukoht", "kontrollitud."],
        body: "Telefoni saadetud asukoha kontrollib server, mitte äpp.",
        status: "Kohalolek kinnitatud",
        hud: "Objekti raadiuses",
      },
      {
        index: "03",
        label: "Tööta",
        title: ["Kell käib,", "kui töötaja", "on kohal."],
        body: "Tunnid kogunevad ainult objektil viibitud aja pealt.",
        status: "Tööpäev käib",
        hud: "Kohalolek",
      },
      {
        index: "04",
        label: "Lahku",
        title: ["Lahkud objektilt.", "Aeg peatub."],
        body: "Mitte kolm tundi hiljem. Kohe. Tööpäev jääb lahti, kuni töötaja selle ise lõpetab.",
        status: "Objektilt eemal",
        hud: "Kell peatatud",
      },
    ],
  },

  /** S4 — mida haldur lõpuks näeb. */
  admin: {
    heading: ["Admin näeb", "reaalseid tunde."],
    subheading: ["Kuu lõpp", "ilma Exceli", "detektiivitööta."],
    body:
      "Üks vaade näitab, kes on tööl, millisel objektil, kui kaua ja mis olekus. " +
      "Objektilt lahkunu juures kell seisab — see ei ole hinnang, vaid see, mida " +
      "kohaloleku sündmused ütlevad.",
    annotations: {
      who: "Kes",
      where: "Kus ja mis tööd",
      howLong: "Kui kaua kohal oldud",
      state: "Olek — eemal alates",
    },
    caption: "Arvutiliides, päris andmed demoettevõttest",
  },

  /** S5 — mida toode teeb. */
  capabilities: {
    sectionLabel: "Võimalused",
    heading: ["Mitte kell,", "vaid tõend."],
    items: [
      {
        index: "01",
        title: "Kohalolek",
        body: "Tööaeg põhineb objektil viibimisel, mitte nupuvajutusel.",
      },
      {
        index: "02",
        title: "Automaatne lahkumine",
        body: "Objektilt lahkumine peatab tööaja ilma, et keegi peaks midagi tegema.",
      },
      {
        index: "03",
        title: "Offline",
        body: "Võrgu puudumine ei tähenda kadunud tööpäeva.",
      },
      {
        index: "04",
        title: "Halduri ülevaade",
        body: "Näed, kes on praegu millisel objektil ja kes on sealt lahkunud.",
      },
      {
        index: "05",
        title: "Tööliigid",
        body: "Tea mitte ainult kui kaua, vaid mida tehti.",
      },
      {
        index: "06",
        title: "Arveldamine",
        body: "Kontrollitud tunnid liiguvad arveldamisse ilma topelttööta.",
      },
    ],
  },

  /** S6 — miks seda usaldada saab. */
  trust: {
    sectionLabel: "Kontroll",
    heading: ["Telefon", "ei otsusta.", "Server kontrollib."],
    body:
      "Töötaja telefon saadab asukoha. Otsuse, kas tööpäeva saab alustada, teeb " +
      "server — äpi muutmine seda ei muuda.",
    points: [
      {
        title: "Kaugus kontrollitakse serveris",
        body: "Telefon saadab koordinaadid, server võrdleb neid objekti raadiusega.",
      },
      {
        title: "Kohalolek on sündmuste ahel",
        body: "Objektile saabumine ja sealt lahkumine kirjutatakse eraldi kirjetena, mida hiljem ei muudeta.",
      },
      {
        title: "Ekraanil olev kell ei ole tõend",
        body: "Palgale minevad tunnid arvutab server kohaloleku põhjal, mitte telefoni näidult.",
      },
      {
        title: "Käsitsi parandus jätab jälje",
        body: "Kui haldur tunde muudab, nõuab süsteem põhjendust ja salvestab vana ning uue väärtuse.",
      },
    ],
    chain: {
      label: "Tõendiahel",
      items: ["Ajatempel", "Asukoht", "Kontroll serveris", "Kohalolekukirje"],
    },
    disclaimer:
      "Ükski süsteem ei ole eksimatu. Eesmärk on, et tundide taga oleks kontrollitav " +
      "jälg, mitte mälu järgi täidetud tabel.",
  },

  /** S7 — päris töömaa: levi kaob. */
  offline: {
    sectionLabel: "Päris objekt",
    heading: ["Võrku pole?", "Tööpäev ei kao."],
    body:
      "Keldris ja uue maja karbis levi ei ole. Tegevuse aeg salvestub telefoni ja " +
      "läheb serverisse siis, kui võrk taastub.",
    states: [
      { label: "Ühendus kadunud", note: "Tegevus salvestub seadmesse koos toimumise ajaga." },
      { label: "Järjekorras", note: "Ootab võrgu taastumist. Tööpäev on telefonis alles." },
      { label: "Saadetud", note: "Server saab kirje kätte ja kontrollib reeglid üle." },
      { label: "Kinnitatud", note: "Aeg läheb arvestusse selle hetke järgi, mil tegevus toimus." },
    ],
    caveat:
      "Kontroll ei muutu leebemaks: kui server ütleb, et asukoht ei sobi, siis ei tee " +
      "hiljem saatmine sellest kehtivat kirjet.",
  },

  /** S8 — tunnist arveni. */
  billing: {
    sectionLabel: "Arveldamine",
    heading: ["Kontrollitud tunnid", "lähevad arvele."],
    flow: ["Kontrollitud tunnid", "Tööliik", "Hind", "Arve"],
    body:
      "Sama tunniandmestik, mis palgaarvestuses, aga teisest otsast: mida objektile " +
      "kulus ja mida saab tellijalt küsida.",
    rules: [
      {
        title: "Hinnata töö ei ole tasuta töö",
        body: "Tunnid, millel hinda ei ole, jäävad arvelt välja ja loetakse eraldi — mitte nulli euroga sisse.",
      },
      {
        title: "Sama tund ei lähe kaks korda",
        body: "Arvele läinud tund on märgitud ja järgmisse arvesse teda ei pakuta.",
      },
      {
        title: "Arve on hetktõmmis",
        body: "Read ja summad jäävad sellisteks, nagu nad arve koostamisel olid. Hilisem hinnamuutus ei muuda esitatud arvet.",
      },
    ],
    caption: "Arveldusvaade, päris andmed demoettevõttest",
  },

  /** S9 — hind. */
  pricing: {
    sectionLabel: "Hind",
    heading: ["Üks hind.", "Ilma astmeteta."],
    amount: (eur: number) => `${eur} €`,
    per: "kasutaja / kuu",
    trial: (days: number) => `${days} päeva tasuta`,
    body:
      "Maksad nende kasutajate eest, kes tööaega registreerivad. Prooviperiood algab " +
      "kohe ja lõpeb ise — midagi ei pea tühistama.",
    includes: [
      "Kõik võimalused, ilma astmeteta",
      "iOS, Android ja arvutiliides",
      "Neli keelt: eesti, inglise, vene, ukraina",
      "Piiramatu arv objekte",
    ],
    cta: "Alusta tasuta",
  },

  /** S10 — küsimused, lõpp-CTA, jalus. */
  faq: {
    sectionLabel: "Küsimused",
    heading: ["Enne kui", "küsid."],
    items: [
      {
        q: "Kas töötajat jälgitakse kogu aeg?",
        a:
          "Ei. Äpp ei jälgi liikumist. Telefon annab märku ainult siis, kui objekti piir " +
          "ületatakse — saabumisel ja lahkumisel. Vahepealset teekonda ei salvestata.",
      },
      {
        q: "Mis juhtub, kui internetti pole?",
        a:
          "Tööpäeva saab alustada ja lõpetada ka ilma levita. Tegevuse aeg salvestub telefoni " +
          "ja läheb serverisse siis, kui võrk taastub. Asukohakontroll kehtib ka siis.",
      },
      {
        q: "Mis juhtub, kui töötaja lahkub objektilt?",
        a:
          "Kell peatub. Tööpäeva see ei lõpeta — objektile naastes jookseb aeg edasi. Nii ei " +
          "pea töötaja iga poeskäigu järel uuesti sisse registreerima.",
      },
      {
        q: "Kas haldur saab tunde parandada?",
        a:
          "Saab. Käsitsi muudatus nõuab põhjendust ning vana ja uus väärtus salvestatakse. " +
          "Parandus on seega võimalik, aga mitte märkamatu.",
      },
      {
        q: "Kas töötab iPhone'is ja Androidis?",
        a: "Jah, mõlemas. Lisaks on arvutiliides brauseris haldamiseks ja aruandluseks.",
      },
      {
        q: "Kas tööaega saab arvutist alustada?",
        a:
          "Ei. Arvutis ei ole asukohta, millega kohalolekut tõendada, seega tööpäeva alustamine " +
          "ja lõpetamine käib ainult telefonis. Arvutis tehakse kõik ülejäänu.",
      },
      {
        q: "Kuidas hinnastus töötab?",
        a: "Üks hind kasutaja kohta kuus, ilma astmeteta. Prooviperiood on tasuta ja lõpeb ise.",
      },
    ],
  },

  finalCta: {
    heading: ["Tööaeg,", "mida saab", "usaldada."],
    body: "Alusta prooviperioodi ja vaata esimese nädalaga, kas tunnid klapivad.",
    cta: "Alusta tasuta",
  },

  footer: {
    product: "Tööajaarvestus ehitusettevõtetele",
    /* Toode ja ettevõte on eri asjad — see rida ütleb selle välja, et
       keegi ei arvaks, et lahenduse nimi on Nutisemud. */
    byline: (product: string, company: string) => `${product} on ${company} toode.`,
    language: "Keel",
    rights: (year: number, company: string) => `© ${year} ${company}`,
    legalNav: "Juriidiline teave",
    privacy: "Privaatsus",
    terms: "Kasutustingimused",
    contact: "Kontakt",
  },

  legal: {
    privacyTitle: "Privaatsuspoliitika",
    termsTitle: "Kasutustingimused",
    contactTitle: "Kontakt",
    pendingLabel: "Sisu kinnitamata",
    pendingBody: (company: string) =>
      `Selle lehe juriidiline sisu ei ole veel kinnitatud. ${company} lisab siia lõpliku teksti ` +
      `enne teenuse avalikku käivitamist. Praegu ei ole siin kehtivaid tingimusi ega lubadusi.`,
    contactPending: (company: string) =>
      `${company} ametlikud kontaktandmed lisatakse siia enne avalikku käivitamist.`,
    company: "Ettevõte",
    registryCode: "Registrikood",
    vatNumber: "KMKR number",
    email: "E-post",
    phone: "Telefon",
    address: "Aadress",
    back: "Tagasi avalehele",
  },

  notFound: {
    code: "404",
    heading: ["Siin ei ole", "objekti."],
    body: "Seda lehte ei ole olemas või on aadress muutunud.",
    cta: "Tagasi avalehele",
    metaTitle: "404 — lehte ei ole",
  },
};

/** Kõigi keelte kuju. Puuduv võti on kompileerimisviga. */
export type Messages = typeof et;
