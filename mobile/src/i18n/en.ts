import type { Dictionary } from "./et";

export const en: Dictionary = {
  common: {
    back: "Back",
    backToDashboard: "Back to dashboard",
    save: "Save",
    add: "Add",
    cancel: "Cancel",
    edit: "Edit",
    remove: "Remove",
    delete: "Delete",
    loading: "Loading...",
    pleaseWait: "Please wait...",
    saving: "Saving...",
    close: "Close",
    ok: "Got it",
    show: "Show",
    optional: "optional",
    undefinedValue: "Not set",
    allObjects: "All sites",
    object: "Site",
    from: "From",
    to: "To",
    comment: "Comment",
    hours: "hours",
    hoursShort: "h",
    days: "d",
    loadFailed: "Could not load data.",
    saveFailed: "Could not save.",
    deleteFailed: "Could not delete.",
  },

  language: {
    label: "Language",
    et: "Eesti",
    en: "English",
    ru: "Русский",
    uk: "Українська",
  },

  login: {
    appName: "SmartTimePlanning",
    title: "Sign in",
    orgCode: "Company code",
    username: "Username",
    password: "Password",
    submit: "Sign in",
    forgotPassword: "Forgot your password?",
    joinCompany: "Join a company",
    registerCompany: "Register your company",
    failed: "Sign-in failed.",
    logout: "Sign out",
  },

  dashboard: {
    greeting: (name: string) => `Hello, ${name}!`,
    awayFromSite: (meters: number) =>
      `You are ${meters} m away from the site — time tracking is paused. The clock resumes when you return.`,
    offlinePending: (count: number) =>
      `${count} saved action${count > 1 ? "s" : ""} waiting for a connection. They will be sent automatically once you are back online.`,
    offlineRejected: "Some saved actions could not be sent:",
    offlineNotice:
      "No connection. Showing data saved on this phone; your work will be sent once the connection returns.",
    pendingRequests: (count: number) => `${count} new join request${count > 1 ? "s" : ""}`,
    pendingRequestsTail: "waiting for approval — tap here.",
    tapHere: "Tap here.",
    notReadyTitle: "Your company is not ready yet.",
    notReadyObject: "Add your first site — without one, nobody can start a workday.",
    notReadyEmployee: "Bring your workers into the system.",
    notReadyTimeLog: "Try a workday yourself.",
    backgroundPrompt:
      "Allow location in the background and leaving or returning to the site is recorded even when the app is " +
      "closed. Your location is not tracked continuously — only when you cross the site boundary — so it uses " +
      "almost no battery.",
    enableBackground: "Allow in background",
    noActiveWorkday: "No workday in progress",
    since: "Since",
    lastFinished: "Last completed workday:",
    monthSummary: "This month",
    hoursWorked: "Hours",
    hourlyRate: "Hourly rate",
    earned: "Earned",
    netSalary: "Net pay",
    target: (hours: number, progress: number) => `Target: ${hours} hours (${progress}%)`,
    startWork: "Start workday",
    endWork: "End workday",
    history: "Work history",
    absences: "Absences",
    manageObjects: "Manage sites",
    manageUsers: "Manage users",
    joinRequests: "Join requests",
    teamOverview: "Team overview",
    settings: "Settings",
    workTypes: "Work types",
    clients: "Clients",
    reports: "Reports",
    billing: "Billing",
    invoices: "Invoices",
    subscription: "Subscription",
    workdayRunning: "Workday running",
    awayShort: "Away from site",
    elapsedLabel: "Today's working time",
    duration: (hours: number, minutes: number) => `${hours} h ${minutes} min`,
    adminSection: "Administration",
    everydaySection: "My things",
  },

  startWork: {
    title: "Start workday",
    workType: "Type of work",
    hint: "A workday can only be started on site — your location is verified.",
    checkingLocation: "Checking location...",
    registering: "Starting workday...",
    locationRequired:
      "Starting a workday requires location permission so we can confirm you are on site. Allow location access " +
      "in settings and try again.",
    locationUnavailable:
      "Could not determine your location. Indoors or without signal, GPS takes time — step outside if you can and " +
      "try again.",
    objectsLoadFailed: "Could not load sites.",
    failed: "Could not start the workday.",
    savedOffline: "Saved offline",
    savedOfflineBody:
      "There was no connection, but the start of your workday is saved on this phone with the current time and " +
      "location. It will be sent automatically once you are back online — you do not need to do anything.",
    queueLabel: (objectName: string) => `Start of workday (${objectName})`,
    locationReady: "Location found — you can start",
    locatingNow: "Finding your location...",
  },

  endWork: {
    title: "End workday",
    travelDuration: "Travel time (hours)",
    lunch: "Lunch break (hours)",
    submit: "End workday",
    noActiveLog: "No workday in progress. Nothing to end.",
    failed: "Could not end the workday.",
    savedOffline: "Saved offline",
    savedOfflineBody:
      "There was no connection, but the end of your workday is saved on this phone with the current time. It will " +
      "be sent automatically once you are back online.",
    queueLabel: "End of workday",
    hoursHint: "Enter in hours. For example 0.5 means half an hour.",
    commentHint: "Optional — a short note on what got done.",
  },

  absences: {
    title: "Absences",
    employeeIntro:
      "These are your absences. An absence lowers your monthly hours target, so a week of holiday no longer shows " +
      "as a shortfall.",
    employee: "Worker",
    type: "Type",
    start: "Start",
    end: "End (inclusive)",
    submit: "Add absence",
    none: "No absences recorded.",
    loadFailed: "Could not load absences.",
    addFailed: "Could not add the absence.",
    usersLoadFailed: "Could not load users.",
    confirmDelete: (name: string, from: string, to: string) => `Delete ${name}'s absence ${from} – ${to}?`,
    types: {
      vacation: "Holiday",
      sick: "Sick leave",
      unpaid: "Unpaid leave",
      other: "Other",
    },
  },

  workTypes: {
    title: "Work types",
    intro:
      "A work type says WHAT was done — demolition, painting, cleaning. The list is shared across the company; " +
      "which types apply on a given site, and at what rate, is set on the site itself.",
    name: "Name",
    namePlaceholder: "e.g. Demolition",
    code: "Code",
    codeHint: "Optional accounting code. Leave empty if you do not need one.",
    defaultRate: "Default client rate (€/h)",
    ratePlaceholder: "not set",
    rateUndefined: "No default rate",
    rateValue: (rate: string) => `Default rate: €${rate}/h`,
    submitNew: "Add work type",
    none: "No work types yet. Without them an invoice cannot say what the money is being charged for.",
    loadFailed: "Could not load work types.",
    removeFailed: "Could not remove.",
    confirmRemove: (name: string) => `Retire the work type "${name}"?`,
  },

  clients: {
    title: "Clients",
    intro:
      "A client is the company the site's hours are billed to. These details go onto the invoice, so fill in the " +
      "registry code and address right away.",
    name: "Name",
    registryCode: "Registry code",
    vatNumber: "VAT number",
    email: "Email",
    emailHint: "The invoice is sent to this address.",
    address: "Address",
    paymentTermDays: "Payment term (days)",
    vatRate: "VAT (%)",
    notes: "Notes",
    submitNew: "Add client",
    none: "No clients added yet.",
    objectCount: (count: number) => `${count} sites`,
    invoiceCount: (count: number) => `${count} invoices`,
    loadFailed: "Could not load clients.",
    removeFailed: "Could not remove.",
    confirmRemove: (name: string) => `Remove the client "${name}"?`,
  },

  objectWorkTypes: {
    title: "Site work types",
    intro:
      "Tick which work types happen on this site and the rate each is billed to the client at. Several types can " +
      "run at once on the same site — three people demolishing, one painting, one cleaning — and each goes onto " +
      "the invoice at its own rate.",
    enabled: "In use",
    rate: "Rate (€/h)",
    inherit: (rate: string) => `default €${rate}`,
    noDefault: "no default rate",
    none: "The company has no work types yet. Add them before setting site rates.",
    manageWorkTypes: "Manage work types",
    saved: "Saved.",
    loadFailed: "Could not load work types.",
    saveFailed: "Could not save.",
  },

  companyDetails: {
    title: "Company details",
    intro: "These are printed on every client invoice. Without a registry code an invoice cannot be issued.",
    name: "Name",
    registryCode: "Registry code",
    vatNumber: "VAT number",
    address: "Address",
    email: "Email",
    phone: "Phone",
    iban: "Bank account (IBAN)",
    defaultVatRate: "Default VAT (%)",
    saved: "Company details saved.",
    loadFailed: "Could not load company details.",
    saveFailed: "Could not save.",
  },

  billing: {
    title: "Billing",
    intro:
      "The same hours that drive payroll, seen from the other end: what the site cost and what can be charged to " +
      "the client. The difference is your margin. Only hours not yet invoiced are shown.",
    calculating: "Calculating...",
    total: "Total",
    hours: "Hours",
    cost: "Cost",
    billable: "Billable",
    margin: "Margin",
    noClient: "Sites without a client",
    budget: (hours: number) => `Budget: ${hours} h`,
    overBudget: (hours: number) => ` — ${hours} h over`,
    unbilledWarning: (hours: number) =>
      `${hours} hours have no rate, are NOT included above and will not go onto an invoice. Set a rate for the ` +
      `site's work type or that money stays unclaimed.`,
    unbilledShort: (hours: number) => `${hours} h without a rate`,
    noData: "No uninvoiced hours in the selected period.",
    showLines: "Show by work type",
    hideLines: "Hide work types",
    rateUndefined: "not set",
    createInvoice: "Create invoice",
    creating: "Creating invoice...",
    createFailed: "Could not create the invoice.",
    needsClient: "An invoice can only cover sites that have a client. Assign a client to the site first.",
    loadFailed: "Could not load billing data.",
  },

  invoices: {
    title: "Invoices",
    intro:
      "Issued invoices. Hours on an invoice are locked and cannot be billed twice — voiding an invoice releases " +
      "them again.",
    none: "No invoices issued yet. Create the first one from the billing view.",
    number: "Invoice",
    period: "Period",
    issued: "Date",
    due: "Due",
    total: "Total",
    subtotal: "Excluding VAT",
    vat: (rate: string) => `VAT ${rate}%`,
    totalDue: "Amount due",
    lines: "Lines",
    hoursColumn: "Hours",
    rateColumn: "Rate",
    amountColumn: "Amount",
    status: {
      draft: "Draft",
      sent: "Sent",
      paid: "Paid",
      void: "Voided",
    },
    open: "Open print view",
    markSent: "Mark as sent",
    markPaid: "Mark as paid",
    send: "Send by email",
    sending: "Sending...",
    sentToEmail: (email: string) => `Invoice sent to ${email}.`,
    sentNoEmail: "The client has no email address — the invoice was marked sent, but no mail went out.",
    sentNotConfigured: "The mail server is not configured — the invoice was marked sent, but no mail went out.",
    voidLabel: "Void invoice",
    confirmVoid: (number: string) =>
      `Void invoice ${number}? The number stays used and the hours become billable again.`,
    voidFailed: "Could not void the invoice.",
    statusFailed: "Could not change the status.",
    loadFailed: "Could not load invoices.",
  },

  subscription: {
    title: "Subscription",
    seats: "Seats",
    pricePerSeat: "Price / seat",
    monthlyTotal: "Monthly",
    periodEnds: "Period ends",
    seatsExplanation:
      "A seat is every active user, including admins. Pending and rejected join requests do not count. The monthly " +
      "total changes automatically when you add or remove a user.",
    trialEnds: (date: string, days: number) => `Trial ends ${date} — ${days} days left.`,
    pastDue:
      "The last payment failed. The app keeps working — nobody should lose their hours over a payment — but please " +
      "update your payment method.",
    inactive: "The subscription is not active. Time tracking is paused until it is restored.",
    checkout: "Start subscription",
    portal: "Manage subscription and invoices",
    opening: "Opening...",
    notConfigured: "Payments are not set up yet. Please contact Nutisemud.",
    openFailed: "Could not open Stripe.",
    loadFailed: "Could not load subscription details.",
    statuses: {
      trialing: "Trial",
      active: "Active",
      past_due: "Payment overdue",
      canceled: "Cancelled",
      unpaid: "Unpaid",
    },
  },

  onboarding: {
    title: "Let's get started",
    welcome: (org: string) => `Welcome, ${org}! Four steps and you are ready to go.`,
    stepsLeft: (count: number) => ` ${count} steps to go.`,
    allDone: " All the essential steps are done.",
    orgCode: "Company code",
    orgCodeExplanation:
      "Every worker needs this code to sign in and to request access. Share it with your team.",
    copyCode: "Copy code",
    copied: "Copied",
    goToDashboard: "Go to dashboard",
    dismiss: "Don't show this again",
    loadFailed: "Could not load setup status.",
    stepObject: {
      title: "Add your first site",
      body:
        "A site is a location with a radius. A workday can only be started inside that radius — that is the check " +
        "that the hours were worked in the right place.",
      action: "Add site",
    },
    stepEmployee: {
      title: "Bring your workers in",
      body:
        "Two ways: add the user yourself, or give the worker your company code — they create an account and you " +
        "approve the request. The code alone grants no access.",
      action: "Add user",
    },
    stepWorkType: {
      title: "Work types for client billing",
      body:
        "If you want to invoice clients, add your work types (demolition, painting, cleaning) and set their hourly " +
        "rates on each site. Without them the hours are still recorded, but an invoice cannot say what is charged for.",
      action: "Add work type",
    },
    stepTimeLog: {
      title: "Try starting a workday",
      body:
        "Go to the site and start a workday. You will see exactly what your workers see and can check that the " +
        "radius is the right size.",
      action: "Start workday",
    },
  },

  history: {
    title: "Work history",
    total: (hours: number) => `Total: ${hours} hours`,
    active: "In progress",
    awayFromSite: (hours: number) => `Away from site: ${hours} h`,
    none: "No work records found.",
    loadFailed: "Could not load work history.",
  },

  settings: {
    title: "Admin settings",
    saved: "Settings saved.",
    checkInDeadline: "Check-in deadline",
    checkOutDeadline: "Check-out deadline",
    tolerance: "Tolerance (metres)",
    adminEmail: "Admin email address",
    submit: "Save settings",
    loadFailed: "Could not load settings.",
  },

  reports: {
    title: "Reports",
    worker: "Worker",
    allWorkers: "All workers",
    dateFrom: "Date from",
    dateTo: "Date to",
    downloadExcel: "Download Excel",
    downloadPdf: "Download PDF",
    show: "Show report",
    loading: "Preparing report...",
    loadFailed: "Could not load the report.",
    none: "No workdays match the selected filters.",
    summary: "Summary",
    entries: "Entries",
    totalHours: "Total hours",
    totalEarnings: "Total pay",
    overtimeTitle: "Overtime",
    regularHours: "Regular hours",
    overtimeHours: "Overtime hours",
    payableHours: "Payable",
    truncated: (shown: number, total: number) =>
      `Showing ${shown} of ${total} entries. Totals are calculated over all of them; the full list is in the file.`,
    suspicious: "Location suspicious",
    offlineEntry: "Sent later",
    downloadTitle: "Download as a file",
  },

  teamPerformance: {
    title: "Team hours this month",
    totalHours: "Total hours:",
    ofHours: (actual: number, norm: number) => `${actual} / ${norm} hours`,
    none: "No users yet.",
  },

  roles: {
    admin: "admin",
    employee: "worker",
  },

  passwordPolicy: "At least 12 characters, including a number and a symbol.",
  passwordsDoNotMatch: "Passwords do not match.",
  confirmPassword: "Confirm password",

  adminUsers: {
    title: "Users",
    addUser: "Add user",
    hourlyRate: (rate: string) => `Hourly rate: €${rate}`,
    loadFailed: "Could not load users.",
  },

  adminObjects: {
    title: "Sites",
    addObject: "Add site",
    deactivated: "(deactivated)",
    activate: "Activate",
    deactivate: "Deactivate",
    none: "No sites added yet.",
    loadFailed: "Could not load sites.",
    toggleFailed: "Could not change the site.",
  },

  objectForm: {
    titleNew: "Add site",
    titleEdit: "Edit site",
    name: "Site name",
    address: "Address",
    addressPlaceholder: "Start typing an address...",
    addressHint: "Pick an address from the list or fine-tune the location on the map.",
    latitude: "Latitude",
    longitude: "Longitude",
    description: "Description",
    radius: "Allowed radius (m)",
    notFound: "Site not found.",
    loadFailed: "Could not load the site.",
    saveFailed: "Could not save the site.",
    billingSection: "Billing",
    client: "Client",
    clientNone: "Not set",
    clientHint: "The client is the company this site's hours are billed to. Without one, no invoice can be created.",
    billableRate: "Site default rate (€/h)",
    billableRateHint: "Applies when a work type has no rate of its own. Empty = not set.",
    budgetHours: "Budget (hours)",
    manageWorkTypes: "Work types and rates",
  },

  userForm: {
    titleNew: "Add user",
    titleEdit: "Edit user",
    email: "Email",
    hourlyRate: "Hourly rate",
    advance: "Advance",
    role: "Role",
    notFound: "User not found.",
    loadFailed: "Could not load the user.",
  },

  pendingRequests: {
    title: "Join requests",
    none: "No pending requests.",
    requestedAt: (when: string) => `Requested: ${when}`,
    hourlyRatePlaceholder: "e.g. 14.50",
    approve: "Approve",
    reject: "Reject",
    rateRequired: (name: string) => `Set an hourly rate for ${name} before approving.`,
    approveFailed: "Could not approve.",
    rejectFailed: "Could not reject.",
    loadFailed: "Could not load requests.",
  },

  requestAccess: {
    title: "Join a company",
    intro: "Create your account. The company administrator has to approve it.",
    orgCodeHint: "Ask your employer for this code.",
    submit: "Send join request",
    sending: "Sending...",
    backToLogin: "Back to sign-in",
    afterApproval: "Once the administrator approves your request, you can sign in with the same details.",
    usernameLabel: "Username:",
    sentTitle: "Request sent",
    company: "Company:",
    failed: "Could not send the request.",
  },

  registerOrg: {
    title: "Register a company",
    intro: "Creates a new company and its first admin user.",
    orgName: "Company name",
    orgSlugHint: "Used when signing in. Lower-case letters, numbers, hyphens.",
    adminUsername: "Admin username",
    adminEmail: "Admin email",
    submit: "Register",
    failed: "Registration failed.",
  },

  forgotPassword: {
    title: "Forgot your password?",
    intro: "We will email you a reset link.",
    submit: "Send reset link",
    sending: "Sending...",
    checkEmailTitle: "Check your email",
    checkEmailBody:
      "If such an account exists, we have emailed the reset instructions. The link is valid for one hour.",
    failed: "Could not send the request.",
  },

  resetPassword: {
    title: "Set a new password",
    newPassword: "New password",
    submit: "Save new password",
    invalidTitle: "Invalid link",
    invalidBody: "The link does not contain a reset code. Please request a new one.",
    requestNewLink: "Request a new link",
    doneTitle: "Password updated",
    doneBody: "Your password has been changed and all earlier sessions ended. Sign in with the new password.",
    failed: "Could not update the password.",
  },
};
