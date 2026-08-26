/**
 * Eesti keel — tõlgete lähtekeel.
 *
 * Kõik teised keeled on typitud selle järgi (`Dictionary`), seega puuduv
 * või valesti nimetatud võti on kompileerimisviga, mitte vaikselt puuduv
 * tekst ekraanil. Muutujad antakse funktsioonidena, et sõnajärg saaks
 * keeleti erineda.
 */
export const et = {
  common: {
    back: "Tagasi",
    backToDashboard: "Tagasi Dashboardile",
    save: "Salvesta",
    add: "Lisa",
    cancel: "Loobu",
    edit: "Muuda",
    remove: "Eemalda",
    delete: "Kustuta",
    loading: "Laadin...",
    pleaseWait: "Palun oota...",
    saving: "Salvestan...",
    close: "Sulge",
    ok: "Selge",
    show: "Näita",
    optional: "valikuline",
    undefinedValue: "Määramata",
    allObjects: "Kõik objektid",
    object: "Objekt",
    from: "Alates",
    to: "Kuni",
    comment: "Kommentaar",
    hours: "tundi",
    hoursShort: "h",
    days: "p",
    loadFailed: "Andmete laadimine ebaõnnestus.",
    saveFailed: "Salvestamine ebaõnnestus.",
    deleteFailed: "Kustutamine ebaõnnestus.",
  },

  language: {
    label: "Keel",
    et: "Eesti",
    en: "English",
    ru: "Русский",
    uk: "Українська",
  },

  login: {
    appName: "SmartTimePlanning",
    title: "Logi sisse",
    orgCode: "Ettevõtte kood",
    username: "Kasutajanimi",
    password: "Parool",
    submit: "Logi sisse",
    forgotPassword: "Unustasid parooli?",
    joinCompany: "Liitu ettevõttega",
    registerCompany: "Registreeri oma ettevõte",
    failed: "Sisselogimine ebaõnnestus.",
    logout: "Logi välja",
  },

  dashboard: {
    greeting: (name: string) => `Tere, ${name}!`,
    awayFromSite: (meters: number) =>
      `Oled objektist ${meters} m kaugusel — tööaja arvestus on peatatud. Kell jookseb edasi, kui naased objektile.`,
    offlinePending: (count: number) =>
      `${count} salvestatud tegevus${count > 1 ? "t" : ""} ootab ühendust. Need saadetakse automaatselt, kui võrk taastub.`,
    offlineRejected: "Osa salvestatud tegevusi ei õnnestunud saata:",
    offlineNotice: "Ühendust pole. Näidatakse telefoni salvestatud andmeid; tehtu saadetakse ära, kui võrk taastub.",
    pendingRequests: (count: number) => `${count} uus liitumistaotlus${count > 1 ? "t" : ""}`,
    pendingRequestsTail: "ootab kinnitamist — vajuta siia.",
    notReadyTitle: "Ettevõte pole veel töövalmis.",
    notReadyObject: "Lisa esimene objekt — ilma selleta ei saa keegi tööpäeva alustada.",
    notReadyEmployee: "Too töötajad süsteemi.",
    notReadyTimeLog: "Proovi ise üks tööpäev läbi.",
    tapHere: "Vajuta siia.",
    backgroundPrompt:
      "Luba asukoht ka taustal, siis märgitakse objektilt lahkumine ja naasmine automaatselt ka suletud rakenduse " +
      "korral. Asukohta ei jälgita pidevalt — ainult objekti piiri ületamisel, seega akut see praktiliselt ei kuluta.",
    enableBackground: "Luba taustal",
    workdayOpen: "Tööpäev avatud",
    workdayOpenAway: "Tööpäev avatud (objektilt eemal)",
    clockedIn: "Tööle registreeritud",
    noActiveWorkday: "Aktiivset tööpäeva pole registreeritud",
    since: "Alates",
    lastFinished: "Viimane lõpetatud tööpäev:",
    started: "Algas",
    ended: "Lõppes",
    monthSummary: "Kuu kokkuvõte",
    hoursWorked: "Töötunde",
    hourlyRate: "Tunnihind",
    earned: "Teenitud",
    netSalary: "Netopalk",
    target: (hours: number, progress: number) => `Eesmärk: ${hours} tundi (${progress}%)`,
    startWork: "Alusta tööpäeva",
    endWork: "Lõpeta tööpäev",
    history: "Tööajalugu",
    absences: "Puudumised",
    manageObjects: "Halda objekte",
    manageUsers: "Halda kasutajaid",
    joinRequests: "Liitumistaotlused",
    teamOverview: "Meeskonna ülevaade",
    settings: "Seaded",
    workTypes: "Tööliigid",
    clients: "Tellijad",
    reports: "Raportid",
    billing: "Arveldus",
    invoices: "Arved",
    subscription: "Tellimus",
  },

  startWork: {
    title: "Alusta tööpäeva",
    workType: "Töö liik",
    hint: "Tööpäeva saab alustada ainult objektil kohapeal — asukohta kontrollitakse.",
    checkingLocation: "Kontrollin asukohta...",
    registering: "Registreerin tööpäeva...",
    locationRequired:
      "Tööpäeva alustamiseks on vaja asukoha luba, et kinnitada, et oled objektil. Luba asukoha kasutamine " +
      "seadetes ja proovi uuesti.",
    locationUnavailable:
      "Asukohta ei õnnestunud määrata. Sisetingimustes või ilma levita võtab GPS aega — mine võimalusel lahtise " +
      "taeva alla ja proovi uuesti.",
    objectsLoadFailed: "Objektide laadimine ebaõnnestus.",
    failed: "Tööpäeva alustamine ebaõnnestus.",
    savedOffline: "Salvestatud offline",
    savedOfflineBody:
      "Ühendust ei olnud, aga tööpäeva algus on telefoni salvestatud koos praeguse kellaaja ja asukohaga. See " +
      "saadetakse automaatselt, kui võrk taastub — sa ei pea midagi tegema.",
    queueLabel: (objectName: string) => `Tööpäeva alustamine (${objectName})`,
  },

  endWork: {
    title: "Lõpeta tööpäev",
    travelDuration: "Sõidu kestus (tunnid)",
    lunch: "Lõuna kestus (tunnid)",
    submit: "Lõpeta tööpäev",
    noActiveLog: "Aktiivset töölogi ei leitud. Tööpäev pole alustatud.",
    failed: "Tööpäeva lõpetamine ebaõnnestus.",
    savedOffline: "Salvestatud offline",
    savedOfflineBody:
      "Ühendust ei olnud, aga tööpäeva lõpp on telefoni salvestatud praeguse kellaajaga. See saadetakse " +
      "automaatselt, kui võrk taastub.",
    queueLabel: "Tööpäeva lõpetamine",
  },

  absences: {
    title: "Puudumised",
    employeeIntro:
      "Siin on sinu puudumised. Puudumine vähendab kuu töötundide normi, seega puhkusenädal ei näita " +
      "kuuülevaates enam puudujääki.",
    employee: "Töötaja",
    type: "Liik",
    start: "Algus",
    end: "Lõpp (kaasa arvatud)",
    submit: "Lisa puudumine",
    none: "Puudumisi pole kirjas.",
    loadFailed: "Puudumiste laadimine ebaõnnestus.",
    addFailed: "Puudumise lisamine ebaõnnestus.",
    usersLoadFailed: "Kasutajate laadimine ebaõnnestus.",
    confirmDelete: (name: string, from: string, to: string) => `Kustutada ${name} puudumine ${from} – ${to}?`,
    types: {
      vacation: "Puhkus",
      sick: "Haigusleht",
      unpaid: "Palgata puhkus",
      other: "Muu",
    },
  },

  workTypes: {
    title: "Tööliigid",
    intro:
      "Tööliik ütleb, MIDA tehti — lammutus, maalritöö, koristus. Nimekiri on ettevõtte ühine; millised tööliigid " +
      "ühel objektil käivad ja mis hinnaga, määrad objekti juures.",
    name: "Nimetus",
    namePlaceholder: "nt Lammutus",
    code: "Kood",
    codeHint: "Valikuline raamatupidamise kood. Jäta tühjaks, kui seda vaja pole.",
    defaultRate: "Vaikimisi kliendihind (€/h)",
    ratePlaceholder: "määramata",
    rateUndefined: "Vaikehind määramata",
    rateValue: (rate: string) => `Vaikehind: €${rate}/h`,
    submitNew: "Lisa tööliik",
    none: "Tööliike pole veel lisatud. Ilma nendeta ei saa arvele kirjutada, mille eest raha küsitakse.",
    loadFailed: "Tööliikide laadimine ebaõnnestus.",
    removeFailed: "Eemaldamine ebaõnnestus.",
    confirmRemove: (name: string) => `Eemaldada tööliik "${name}" kasutusest?`,
  },

  clients: {
    title: "Tellijad",
    intro:
      "Tellija on ettevõte, kellele objekti tunnid arveldatakse. Rekvisiidid lähevad arvele, seega registrikood ja " +
      "aadress tasub kohe täita.",
    name: "Nimi",
    registryCode: "Registrikood",
    vatNumber: "KMKR number",
    email: "E-post",
    emailHint: "Sellele aadressile saadetakse arve.",
    address: "Aadress",
    paymentTermDays: "Maksetähtaeg (päeva)",
    vatRate: "Käibemaks (%)",
    notes: "Märkused",
    submitNew: "Lisa tellija",
    none: "Tellijaid pole veel lisatud.",
    objectCount: (count: number) => `${count} objekti`,
    invoiceCount: (count: number) => `${count} arvet`,
    loadFailed: "Tellijate laadimine ebaõnnestus.",
    removeFailed: "Eemaldamine ebaõnnestus.",
    confirmRemove: (name: string) => `Eemaldada tellija "${name}"?`,
  },

  objectWorkTypes: {
    title: "Objekti tööliigid",
    intro:
      "Märgi, millised tööliigid sellel objektil käivad ja mis hinnaga neid tellijale arveldatakse. Samal objektil " +
      "võib korraga käia mitu tööliiki — kolm meest lammutavad, üks maalib, üks koristab — ja igaüks läheb arvele " +
      "oma hinnaga.",
    enabled: "Kasutusel",
    rate: "Hind (€/h)",
    inherit: (rate: string) => `vaikehind €${rate}`,
    noDefault: "vaikehinda pole",
    none: "Ettevõttel pole veel ühtegi tööliiki. Lisa need enne, kui objektile hinnad määrad.",
    manageWorkTypes: "Halda tööliike",
    saved: "Salvestatud.",
    loadFailed: "Tööliikide laadimine ebaõnnestus.",
    saveFailed: "Salvestamine ebaõnnestus.",
  },

  companyDetails: {
    title: "Ettevõtte rekvisiidid",
    intro: "Need trükitakse igale kliendiarvele. Ilma registrikoodita ei saa arvet vormistada.",
    name: "Nimi",
    registryCode: "Registrikood",
    vatNumber: "KMKR number",
    address: "Aadress",
    email: "E-post",
    phone: "Telefon",
    iban: "Arveldusarve (IBAN)",
    defaultVatRate: "Vaikimisi käibemaks (%)",
    saved: "Rekvisiidid salvestatud.",
    loadFailed: "Rekvisiitide laadimine ebaõnnestus.",
    saveFailed: "Salvestamine ebaõnnestus.",
  },

  billing: {
    title: "Arveldus",
    intro:
      "Sama tunniandmestik, mis palgaarvestuses, aga teisest otsast: mida objektile kulus ja mida saab tellijalt " +
      "küsida. Vahe on kate. Siin näidatakse ainult veel arveldamata tunde.",
    calculating: "Arvutan...",
    total: "Kokku",
    hours: "Tunde",
    cost: "Kulu",
    billable: "Arveldatav",
    margin: "Kate",
    noClient: "Tellijata objektid",
    budget: (hours: number) => `Eelarve: ${hours} h`,
    overBudget: (hours: number) => ` — ületatud ${hours} h võrra`,
    unbilledWarning: (hours: number) =>
      `${hours} tundi on ilma tunnihinnata ja neid EI ole ülal arvestatud ega panda arvele. Määra hind objekti ` +
      `tööliigile, muidu jääb see raha küsimata.`,
    unbilledShort: (hours: number) => `${hours} h ilma hinnata`,
    noData: "Valitud perioodil pole arveldamata tunde.",
    showLines: "Näita tööliikide kaupa",
    hideLines: "Peida tööliigid",
    rateUndefined: "määramata",
    createInvoice: "Tee arve",
    creating: "Koostan arvet...",
    createFailed: "Arve koostamine ebaõnnestus.",
    needsClient: "Arve saab teha ainult tellijaga seotud objektide tundidest. Määra objektile tellija.",
    loadFailed: "Arveldusandmete laadimine ebaõnnestus.",
  },

  invoices: {
    title: "Arved",
    intro:
      "Vormistatud arved. Arvele läinud tunnid on lukus ja neid ei saa teist korda arveldada — tühistamine vabastab " +
      "need tagasi.",
    none: "Arveid pole veel vormistatud. Tee esimene arveldusvaates.",
    number: "Arve",
    period: "Periood",
    issued: "Kuupäev",
    due: "Maksetähtaeg",
    total: "Summa",
    subtotal: "Ilma käibemaksuta",
    vat: (rate: string) => `Käibemaks ${rate}%`,
    totalDue: "Tasumisele kuulub",
    lines: "Read",
    hoursColumn: "Tunnid",
    rateColumn: "Hind",
    amountColumn: "Summa",
    status: {
      draft: "Mustand",
      sent: "Saadetud",
      paid: "Makstud",
      void: "Tühistatud",
    },
    open: "Ava trükivaade",
    markSent: "Märgi saadetuks",
    markPaid: "Märgi makstuks",
    send: "Saada e-postiga",
    sending: "Saadan...",
    sentToEmail: (email: string) => `Arve saadeti aadressile ${email}.`,
    sentNoEmail: "Tellijal pole e-posti aadressi — arve märgiti saadetuks, aga kirja ei läinud.",
    sentNotConfigured: "E-posti server pole seadistatud — arve märgiti saadetuks, aga kirja ei läinud.",
    voidLabel: "Tühista arve",
    confirmVoid: (number: string) =>
      `Tühistada arve ${number}? Number jääb kasutusele ja tunnid vabanevad uuesti arveldamiseks.`,
    voidFailed: "Tühistamine ebaõnnestus.",
    statusFailed: "Oleku muutmine ebaõnnestus.",
    loadFailed: "Arvete laadimine ebaõnnestus.",
  },

  subscription: {
    title: "Tellimus",
    seats: "Istekohti",
    pricePerSeat: "Hind / istekoht",
    monthlyTotal: "Kuutasu",
    periodEnds: "Periood lõpeb",
    seatsExplanation:
      "Istekoht on iga aktiivne kasutaja, ka admin. Ootel ja tagasi lükatud liitumistaotlused ei lähe arvesse. " +
      "Kasutaja lisamisel või eemaldamisel muutub kuutasu automaatselt.",
    trialEnds: (date: string, days: number) => `Prooviperiood lõpeb ${date} — ${days} päeva jäänud.`,
    pastDue:
      "Viimane makse ebaõnnestus. Rakendus töötab edasi — töötajate tunnid ei tohi makse pärast kaduma minna — " +
      "aga uuenda palun makseviisi.",
    inactive: "Tellimus ei ole aktiivne. Tööaja registreerimine on peatatud, kuni tellimus taastatakse.",
    checkout: "Vormista tellimus",
    portal: "Halda tellimust ja arveid",
    opening: "Avan...",
    notConfigured: "Maksete vastuvõtt pole veel seadistatud. Võta ühendust Nutisemud'iga.",
    openFailed: "Stripe'i avamine ebaõnnestus.",
    loadFailed: "Tellimuse andmete laadimine ebaõnnestus.",
    statuses: {
      trialing: "Prooviperiood",
      active: "Aktiivne",
      past_due: "Makse hilineb",
      canceled: "Tühistatud",
      unpaid: "Maksmata",
    },
  },

  onboarding: {
    title: "Alustame",
    welcome: (org: string) => `Tere tulemast, ${org}! Neli sammu ja süsteem on töövalmis.`,
    stepsLeft: (count: number) => ` Veel ${count} sammu.`,
    allDone: " Kõik olulised sammud on tehtud.",
    orgCode: "Ettevõtte kood",
    orgCodeExplanation:
      "Seda koodi vajab iga töötaja sisselogimisel ja liitumistaotluse tegemisel. Jaga see meeskonnaga.",
    copyCode: "Kopeeri kood",
    copied: "Kopeeritud",
    goToDashboard: "Mine Dashboardile",
    dismiss: "Ära näita seda enam",
    loadFailed: "Seadistuse seisu laadimine ebaõnnestus.",
    stepObject: {
      title: "Lisa esimene objekt",
      body:
        "Objekt on ehitusplats koos asukoha ja raadiusega. Tööpäeva saab alustada ainult objekti raadiuses — " +
        "see ongi kontroll, et tunnid oleksid tehtud õiges kohas.",
      action: "Lisa objekt",
    },
    stepEmployee: {
      title: "Too töötajad süsteemi",
      body:
        "Kaks võimalust: lisa kasutaja ise, või anna töötajale ettevõtte kood — ta loob konto ja sina kinnitad " +
        "taotluse. Kood üksi ligipääsu ei anna.",
      action: "Lisa kasutaja",
    },
    stepWorkType: {
      title: "Tööliigid kliendiarvelduseks",
      body:
        "Kui tahad tellijale arve esitada, lisa tööliigid (lammutus, maalritöö, koristus) ja määra objekti juures " +
        "nende tunnihinnad. Ilma nendeta on tunnid olemas, aga arvele ei saa kirjutada, mille eest raha küsitakse.",
      action: "Lisa tööliik",
    },
    stepTimeLog: {
      title: "Proovi tööpäeva alustamist",
      body:
        "Mine objektile ja alusta tööpäeva. Nii näed ise, mida töötaja näeb, ja saad kontrollida, et raadius on " +
        "õige suurusega.",
      action: "Alusta tööpäeva",
    },
  },

  history: {
    title: "Tööajalugu",
    total: (hours: number) => `Kokku: ${hours} tundi`,
    active: "Aktiivne",
    awayFromSite: (hours: number) => `Objektilt eemal: ${hours} h`,
    none: "Ühtegi tööaja kirjet ei leitud.",
    loadFailed: "Tööajaloo laadimine ebaõnnestus.",
  },

  settings: {
    title: "Admin seadistused",
    saved: "Seaded salvestatud.",
    checkInDeadline: "Check-in tähtaeg",
    checkOutDeadline: "Check-out tähtaeg",
    tolerance: "Tolerants (meetrites)",
    adminEmail: "Admin e-posti aadress",
    submit: "Salvesta seaded",
    loadFailed: "Seadete laadimine ebaõnnestus.",
  },

  reports: {
    title: "Raportid",
    worker: "Töötaja",
    allWorkers: "Kõik töötajad",
    dateFrom: "Kuupäev alates",
    dateTo: "Kuupäev kuni",
    downloadExcel: "Laadi alla Excel",
    downloadPdf: "Laadi alla PDF",
  },

  teamPerformance: {
    title: "Meeskonna tööaja ülevaade (kuu)",
    totalHours: "Kokku töötunnid:",
    ofHours: (actual: number, norm: number) => `${actual} / ${norm} tundi`,
    none: "Ühtegi kasutajat pole veel.",
  },

  roles: {
    admin: "admin",
    employee: "töötaja",
  },

  passwordPolicy: "Vähemalt 12 tähemärki, sisaldab numbrit ja sümbolit.",
  passwordsDoNotMatch: "Paroolid ei ühti.",
  confirmPassword: "Kinnita parool",

  adminUsers: {
    title: "Kasutajad",
    addUser: "Lisa kasutaja",
    hourlyRate: (rate: string) => `Tunnihind: €${rate}`,
    loadFailed: "Kasutajate laadimine ebaõnnestus.",
  },

  adminObjects: {
    title: "Objektid",
    addObject: "Lisa objekt",
    deactivated: "(deaktiveeritud)",
    activate: "Aktiveeri",
    deactivate: "Deaktiveeri",
    none: "Ühtegi objekti pole veel lisatud.",
    loadFailed: "Objektide laadimine ebaõnnestus.",
    toggleFailed: "Muutmine ebaõnnestus.",
  },

  objectForm: {
    titleNew: "Lisa objekt",
    titleEdit: "Muuda objekti",
    name: "Objekti nimi",
    address: "Aadress",
    addressPlaceholder: "Hakka kirjutama aadressi...",
    addressHint: "Vali aadress loendist või täpsusta asukohta kaardil.",
    latitude: "Laiuskraad",
    longitude: "Pikkuskraad",
    description: "Kirjeldus",
    radius: "Lubatud raadius (m)",
    notFound: "Objekti ei leitud.",
    loadFailed: "Objekti laadimine ebaõnnestus.",
    saveFailed: "Objekti salvestamine ebaõnnestus.",
    billingSection: "Arveldus",
    client: "Tellija",
    clientNone: "Määramata",
    clientHint: "Tellija on ettevõte, kellele selle objekti tunnid arveldatakse. Ilma selleta ei saa arvet teha.",
    billableRate: "Objekti üldhind (€/h)",
    billableRateHint: "Kehtib siis, kui tööliigil ei ole oma hinda. Tühi = määramata.",
    budgetHours: "Eelarve (tundi)",
    manageWorkTypes: "Tööliigid ja hinnad",
  },

  userForm: {
    titleNew: "Lisa kasutaja",
    titleEdit: "Muuda kasutajat",
    email: "E-post",
    hourlyRate: "Tunnihind",
    advance: "Avanss",
    role: "Roll",
    notFound: "Kasutajat ei leitud.",
    loadFailed: "Kasutaja laadimine ebaõnnestus.",
  },

  pendingRequests: {
    title: "Liitumistaotlused",
    none: "Ootel taotlusi ei ole.",
    requestedAt: (when: string) => `Taotles: ${when}`,
    hourlyRatePlaceholder: "nt 14.50",
    approve: "Kinnita",
    reject: "Lükka tagasi",
    rateRequired: (name: string) => `Määra ${name} tunnihind enne kinnitamist.`,
    approveFailed: "Kinnitamine ebaõnnestus.",
    rejectFailed: "Tagasilükkamine ebaõnnestus.",
    loadFailed: "Taotluste laadimine ebaõnnestus.",
  },

  requestAccess: {
    title: "Liitu ettevõttega",
    intro: "Loo endale konto. Ettevõtte administraator peab selle kinnitama.",
    orgCodeHint: "Küsi see kood oma tööandjalt.",
    submit: "Saada liitumistaotlus",
    sending: "Saadan...",
    backToLogin: "Tagasi sisselogimisse",
    afterApproval: "Kui administraator on taotluse kinnitanud, saad samade andmetega sisse logida.",
    usernameLabel: "Kasutajanimi:",
    sentTitle: "Taotlus saadetud",
    company: "Ettevõte:",
    failed: "Taotluse saatmine ebaõnnestus.",
  },

  registerOrg: {
    title: "Registreeri ettevõte",
    intro: "Loob uue ettevõtte ja esimese admin-kasutaja.",
    orgName: "Ettevõtte nimi",
    orgSlugHint: "Kasutatakse sisselogimisel. Väiketähed, numbrid, sidekriipsud.",
    adminUsername: "Admin kasutajanimi",
    adminEmail: "Admin e-mail",
    submit: "Registreeri",
    failed: "Registreerimine ebaõnnestus.",
  },

  forgotPassword: {
    title: "Unustasid parooli?",
    intro: "Saadame taastamise lingi sinu e-postile.",
    submit: "Saada taastamise link",
    sending: "Saadan...",
    checkEmailTitle: "Kontrolli e-posti",
    checkEmailBody: "Kui selline konto on olemas, saatsime taastamise juhised e-postile. Link kehtib ühe tunni.",
    failed: "Päringu saatmine ebaõnnestus.",
  },

  resetPassword: {
    title: "Sea uus parool",
    newPassword: "Uus parool",
    submit: "Salvesta uus parool",
    invalidTitle: "Vigane link",
    invalidBody: "Link ei sisalda taastamise koodi. Palun küsi uus link.",
    requestNewLink: "Küsi uus link",
    doneTitle: "Parool uuendatud",
    doneBody: "Parool on muudetud ja kõik varasemad sessioonid lõpetatud. Logi uue parooliga sisse.",
    failed: "Parooli uuendamine ebaõnnestus.",
  },
};

/** Kõigi keelte kuju. Puuduv võti on kompileerimisviga. */
export type Dictionary = typeof et;
