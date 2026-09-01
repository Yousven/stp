import type { Messages } from "./et";

export const en: Messages = {
  meta: {
    title: "SmartTimePlanning — hours that match reality",
    description:
      "Time tracking for construction companies. The workday starts on site, presence is confirmed by the server. 14 days free.",
    langName: "English",
    ogAlt: "SmartTimePlanning — hours that match reality",
  },

  nav: {
    skipToContent: "Skip to content",
    language: "Language",
    cta: "Start free",
    sections: "Sections",
    menu: "Menu",
    links: {
      how: "How it works",
      admin: "Manager view",
      billing: "Invoicing",
      pricing: "Pricing",
    },
  },

  hero: {
    headline: ["Hours", "that match", "reality."],
    headlineAccentLine: 2,
    lede:
      "Time tracking for construction companies. The workday starts on site, not in a spreadsheet — " +
      "presence is confirmed by the server, not the app.",
    cta: "Start free",
    ctaNote: (days: number) => `${days} days free`,

    hud: {
      site: "Site",
      radius: "Radius",
      presenceConfirmed: "Presence confirmed",
      clockRunning: "Clock running",
      inside: "On site",
      coordinates: "Coordinates",
      serverChecked: "Verified server-side",
    },
  },

  proof: {
    claimed: "10h on paper.",
    actual: "5h on site.",
    verdict: "This is no longer possible.",

    labelClaimed: "Claimed",
    labelActual: "Proven by presence",
    labelGap: "Gap",

    summary:
      "It used to be possible to write down ten hours after five hours on site. " +
      "Now hours are computed from presence: the clock only runs on site.",
  },

  chain: {
    sectionLabel: "How it works",
    heading: "The presence chain",
    summary:
      "The worker arrives on site, the location is checked, the clock starts. " +
      "Leaving the site stops the time, and the workday stays open until the " +
      "worker closes it.",
    steps: [
      {
        index: "01",
        label: "Arrive",
        title: ["The worker reaches", "the site."],
        body: "The location is checked against the site before any time is confirmed.",
        status: "Checking location",
        hud: "Distance to site",
      },
      {
        index: "02",
        label: "Confirmed",
        title: ["Location", "verified."],
        body: "The location the phone sends is checked by the server, not the app.",
        status: "Presence confirmed",
        hud: "Within site radius",
      },
      {
        index: "03",
        label: "Work",
        title: ["The clock runs", "while the worker", "is on site."],
        body: "Hours accumulate only from time actually spent on site.",
        status: "Workday running",
        hud: "Presence",
      },
      {
        index: "04",
        label: "Leave",
        title: ["You leave the site.", "Time stops."],
        body: "Not three hours later. Immediately. The workday stays open until the worker closes it.",
        status: "Away from site",
        hud: "Clock paused",
      },
    ],
  },

  admin: {
    heading: ["Managers see", "real hours."],
    subheading: ["Month end", "without the", "spreadsheet forensics."],
    body:
      "One view shows who is working, on which site, for how long and in what state. " +
      "For someone who has left the site the clock stands still — that is not a judgement, " +
      "it is what the presence events say.",
    annotations: {
      who: "Who",
      where: "Where and what work",
      howLong: "Time actually on site",
      state: "State — away since",
    },
    caption: "Desktop interface, real data from a demo company",
  },

  capabilities: {
    sectionLabel: "Capabilities",
    heading: ["Not a clock.", "Evidence."],
    items: [
      {
        index: "01",
        title: "Presence",
        body: "Working time is based on being on site, not on pressing a button.",
      },
      {
        index: "02",
        title: "Automatic leave",
        body: "Leaving the site stops the time without anyone having to do anything.",
      },
      {
        index: "03",
        title: "Offline",
        body: "No signal does not mean a lost workday.",
      },
      {
        index: "04",
        title: "Manager overview",
        body: "See who is on which site right now, and who has left.",
      },
      {
        index: "05",
        title: "Work types",
        body: "Know not only how long, but what was done.",
      },
      {
        index: "06",
        title: "Invoicing",
        body: "Verified hours move into invoicing without doing the work twice.",
      },
    ],
  },

  trust: {
    sectionLabel: "Verification",
    heading: ["The phone", "does not decide.", "The server checks."],
    body:
      "The worker's phone sends the location. Whether the workday can start is decided by " +
      "the server — changing the app does not change that.",
    points: [
      {
        title: "Distance is checked on the server",
        body: "The phone sends coordinates, the server compares them against the site radius.",
      },
      {
        title: "Presence is a chain of events",
        body: "Arriving at and leaving the site are written as separate records that are not edited later.",
      },
      {
        title: "The clock on screen is not evidence",
        body: "Payable hours are computed by the server from presence, not read off the phone.",
      },
      {
        title: "A manual correction leaves a trace",
        body: "When a manager changes hours, the system requires a reason and stores both the old and the new value.",
      },
    ],
    chain: {
      label: "Evidence chain",
      items: ["Timestamp", "Location", "Server check", "Presence record"],
    },
    disclaimer:
      "No system is infallible. The goal is that hours have a verifiable trail behind them, " +
      "rather than a spreadsheet filled in from memory.",
  },

  offline: {
    sectionLabel: "The real site",
    heading: ["No signal?", "The workday survives."],
    body:
      "There is no coverage in a basement or inside a new shell. The time of the action is " +
      "stored on the phone and reaches the server once the network is back.",
    states: [
      { label: "Connection lost", note: "The action is stored on the device with the time it happened." },
      { label: "Queued", note: "Waiting for the network. The workday is safe on the phone." },
      { label: "Sent", note: "The server receives the record and re-checks the rules." },
      { label: "Confirmed", note: "Time is counted from the moment the action actually happened." },
    ],
    caveat:
      "The check does not get softer: if the server says the location does not match, sending it " +
      "later does not turn it into a valid record.",
  },

  billing: {
    sectionLabel: "Invoicing",
    heading: ["Verified hours", "become invoices."],
    flow: ["Verified hours", "Work type", "Rate", "Invoice"],
    body:
      "The same hours as payroll, seen from the other end: what the site cost and what can be " +
      "charged to the client.",
    rules: [
      {
        title: "Unpriced work is not free work",
        body: "Hours with no rate are left off the invoice and counted separately — not included at zero euros.",
      },
      {
        title: "The same hour is never billed twice",
        body: "An invoiced hour is marked as such and is not offered for the next invoice.",
      },
      {
        title: "An invoice is a snapshot",
        body: "Lines and totals stay as they were when the invoice was issued. A later rate change does not alter it.",
      },
    ],
    caption: "Invoicing view, real data from a demo company",
  },

  pricing: {
    sectionLabel: "Pricing",
    heading: ["One price.", "No tiers."],
    amount: (eur: number) => `€${eur}`,
    per: "per user / month",
    trial: (days: number) => `${days} days free`,
    body:
      "You pay for the users who record working time. The trial starts right away and ends by " +
      "itself — there is nothing to cancel.",
    includes: [
      "Every capability, no tiers",
      "iOS, Android and the desktop interface",
      "Four languages: Estonian, English, Russian, Ukrainian",
      "Unlimited sites",
    ],
    cta: "Start free",
  },

  faq: {
    sectionLabel: "Questions",
    heading: ["Before you", "ask."],
    items: [
      {
        q: "Are workers tracked all the time?",
        a:
          "No. The app does not track movement. The phone reports only when the site boundary is " +
          "crossed — on arrival and on leaving. The journey in between is not recorded.",
      },
      {
        q: "What happens when there is no internet?",
        a:
          "The workday can be started and ended without coverage. The time of the action is stored on " +
          "the phone and sent once the network returns. The location check still applies.",
      },
      {
        q: "What happens when a worker leaves the site?",
        a:
          "The clock stops. It does not end the workday — when the worker returns, time continues. " +
          "So nobody has to clock in again after every trip to the shop.",
      },
      {
        q: "Can a manager correct hours?",
        a:
          "Yes. A manual change requires a reason, and both the old and the new value are stored. " +
          "Corrections are possible, but not invisible.",
      },
      {
        q: "Does it work on iPhone and Android?",
        a: "Yes, on both. There is also a desktop interface in the browser for management and reporting.",
      },
      {
        q: "Can time be started from a computer?",
        a:
          "No. A computer has no location to prove presence with, so starting and ending a workday only " +
          "happens on the phone. Everything else is done on the computer.",
      },
      {
        q: "How does pricing work?",
        a: "One price per user per month, no tiers. The trial is free and ends by itself.",
      },
    ],
  },

  finalCta: {
    heading: ["Working time", "you can", "trust."],
    body: "Start the trial and see within the first week whether the hours add up.",
    cta: "Start free",
  },

  footer: {
    product: "Time tracking for construction companies",
    byline: (product: string, company: string) => `${product} is a product by ${company}.`,
    language: "Language",
    rights: (year: number, company: string) => `© ${year} ${company}`,
    legalNav: "Legal",
    privacy: "Privacy",
    terms: "Terms of service",
    contact: "Contact",
  },

  legal: {
    privacyTitle: "Privacy policy",
    termsTitle: "Terms of service",
    contactTitle: "Contact",
    pendingLabel: "Content not confirmed",
    pendingBody: (company: string) =>
      `The legal content of this page has not been confirmed yet. ${company} will add the final ` +
      `text before the service launches publicly. Nothing here is binding at this time.`,
    contactPending: (company: string) =>
      `The official contact details for ${company} will be added here before the public launch.`,
    company: "Company",
    registryCode: "Registry code",
    vatNumber: "VAT number",
    email: "Email",
    phone: "Phone",
    address: "Address",
    back: "Back to the home page",
  },

  notFound: {
    code: "404",
    heading: ["No site", "here."],
    body: "This page does not exist, or the address has changed.",
    cta: "Back to the home page",
    metaTitle: "404 — page not found",
  },
};
